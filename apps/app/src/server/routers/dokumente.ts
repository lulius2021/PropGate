import { z } from "zod";
import { router, protectedProcedure, writeProcedure } from "../trpc";
import { logAudit } from "../middleware/audit";

export const dokumenteRouter = router({
  upload: writeProcedure
    .input(
      z.object({
        dateiname: z.string().max(255),
        mimeType: z.enum([
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/webp",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/csv",
        ]),
        dateiinhalt: z.string().max(14_000_000), // ~10MB base64
        groesse: z.number().max(10 * 1024 * 1024),
        typ: z.enum([
          "MIETVERTRAG",
          "MAHNUNG",
          "RECHNUNG",
          "ZAEHLERABLESUNG",
          "DARLEHEN",
          "SONSTIGES",
        ]),
        objektId: z.string().optional(),
        einheitId: z.string().optional(),
        mieterId: z.string().optional(),
        mietverhaeltnisId: z.string().optional(),
        notiz: z.string().optional(),
        version: z.number().optional(),
        faelligkeitsdatum: z.date().optional(),
        fristTyp: z.string().optional(),
        schlagworte: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.dokument.create({
        data: {
          tenantId: ctx.tenantId,
          dateiname: input.dateiname,
          mimeType: input.mimeType,
          groesse: input.groesse,
          dateiinhalt: input.dateiinhalt,
          s3Key: `${ctx.tenantId}/${Date.now()}-${input.dateiname}`,
          typ: input.typ,
          objektId: input.objektId,
          einheitId: input.einheitId,
          mieterId: input.mieterId,
          mietverhaeltnisId: input.mietverhaeltnisId,
          notiz: input.notiz,
          version: input.version ?? 1,
          faelligkeitsdatum: input.faelligkeitsdatum,
          fristTyp: input.fristTyp,
          schlagworte: input.schlagworte,
        },
      });
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          objektId: z.string().optional(),
          einheitId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.dokument.findMany({
        where: {
          tenantId: ctx.tenantId,
          objektId: input?.objektId,
          einheitId: input?.einheitId,
        },
        orderBy: { hochgeladenAm: "desc" },
      });
    }),

  /**
   * Neue Version eines Dokuments hochladen
   */
  uploadNewVersion: writeProcedure
    .input(
      z.object({
        dateiname: z.string().max(255),
        mimeType: z.enum([
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/webp",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/csv",
        ]),
        dateiinhalt: z.string().max(14_000_000),
        groesse: z.number().max(10 * 1024 * 1024),
        typ: z.enum([
          "MIETVERTRAG",
          "MAHNUNG",
          "RECHNUNG",
          "ZAEHLERABLESUNG",
          "DARLEHEN",
          "SONSTIGES",
        ]),
        objektId: z.string().optional(),
        einheitId: z.string().optional(),
        mieterId: z.string().optional(),
        mietverhaeltnisId: z.string().optional(),
        notiz: z.string().optional(),
        faelligkeitsdatum: z.date().optional(),
        fristTyp: z.string().optional(),
        schlagworte: z.string().optional(),
        vorgaengerId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const vorgaenger = await ctx.db.dokument.findUnique({
        where: { id: input.vorgaengerId, tenantId: ctx.tenantId },
        select: { version: true },
      });

      if (!vorgaenger) {
        throw new Error("Vorgänger-Dokument nicht gefunden");
      }

      const dokument = await ctx.db.dokument.create({
        data: {
          tenantId: ctx.tenantId,
          dateiname: input.dateiname,
          mimeType: input.mimeType,
          groesse: input.groesse,
          dateiinhalt: input.dateiinhalt,
          s3Key: `${ctx.tenantId}/${Date.now()}-${input.dateiname}`,
          typ: input.typ,
          objektId: input.objektId,
          einheitId: input.einheitId,
          mieterId: input.mieterId,
          mietverhaeltnisId: input.mietverhaeltnisId,
          notiz: input.notiz,
          version: vorgaenger.version + 1,
          vorgaengerId: input.vorgaengerId,
          faelligkeitsdatum: input.faelligkeitsdatum,
          fristTyp: input.fristTyp,
          schlagworte: input.schlagworte,
        },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "DOKUMENT_VERSION_ERSTELLT",
        entitaet: "Dokument",
        entitaetId: dokument.id,
        neuWert: { version: dokument.version, vorgaengerId: input.vorgaengerId },
      });

      return dokument;
    }),

  /**
   * Versionshistorie eines Dokuments abrufen
   */
  getVersionHistory: protectedProcedure
    .input(z.object({ dokumentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const dokument = await ctx.db.dokument.findUnique({
        where: { id: input.dokumentId, tenantId: ctx.tenantId },
        include: {
          vorgaenger: true,
          nachfolger: true,
        },
      });

      if (!dokument) {
        throw new Error("Dokument nicht gefunden");
      }

      // Collect the full version chain by walking backwards then forwards
      const versions: typeof dokument[] = [];

      // Walk backwards to the root
      let current = dokument;
      while (current.vorgaenger) {
        current = await ctx.db.dokument.findUnique({
          where: { id: current.vorgaengerId!, tenantId: ctx.tenantId },
          include: { vorgaenger: true, nachfolger: true },
        }) as typeof dokument;
        if (!current) break;
      }

      // Now walk forward from root collecting all versions
      const rootId = current.id;
      const allVersions = await ctx.db.dokument.findMany({
        where: {
          tenantId: ctx.tenantId,
          OR: [
            { id: rootId },
            { vorgaengerId: rootId },
          ],
        },
        orderBy: { version: "asc" },
      });

      // For deeper chains, iteratively collect
      if (allVersions.length > 0) {
        const collected = new Map(allVersions.map((d) => [d.id, d]));
        let foundNew = true;
        while (foundNew) {
          foundNew = false;
          const ids = Array.from(collected.keys());
          const more = await ctx.db.dokument.findMany({
            where: {
              tenantId: ctx.tenantId,
              vorgaengerId: { in: ids },
              id: { notIn: ids },
            },
            orderBy: { version: "asc" },
          });
          for (const d of more) {
            if (!collected.has(d.id)) {
              collected.set(d.id, d);
              foundNew = true;
            }
          }
        }
        return Array.from(collected.values()).sort(
          (a, b) => a.version - b.version
        );
      }

      return allVersions;
    }),

  /**
   * Dokumente mit Fälligkeitsdatum innerhalb der nächsten N Tage
   */
  listByFrist: protectedProcedure
    .input(z.object({ tage: z.number() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const bis = new Date();
      bis.setDate(bis.getDate() + input.tage);

      return ctx.db.dokument.findMany({
        where: {
          tenantId: ctx.tenantId,
          faelligkeitsdatum: {
            gte: now,
            lte: bis,
          },
        },
        orderBy: { faelligkeitsdatum: "asc" },
      });
    }),
});
