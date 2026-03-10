import { z } from "zod";
import { router, protectedProcedure, writeProcedure } from "../trpc";
import { logAudit } from "../middleware/audit";
import { uploadToR2, generateR2Key } from "@/lib/r2";

const mimeTypeEnum = z.enum([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

const typEnum = z.enum([
  "MIETVERTRAG",
  "MAHNUNG",
  "RECHNUNG",
  "ZAEHLERABLESUNG",
  "DARLEHEN",
  "SONSTIGES",
]);

const uploadBaseSchema = z.object({
  dateiname: z.string().max(255),
  mimeType: mimeTypeEnum,
  dateiinhalt: z.string().max(14_000_000), // base64, wird zu R2 hochgeladen
  groesse: z.number().max(10 * 1024 * 1024),
  typ: typEnum,
  objektId: z.string().optional(),
  einheitId: z.string().optional(),
  mieterId: z.string().optional(),
  mietverhaeltnisId: z.string().optional(),
  notiz: z.string().optional(),
  faelligkeitsdatum: z.date().optional(),
  fristTyp: z.string().optional(),
  schlagworte: z.string().optional(),
});

export const dokumenteRouter = router({
  upload: writeProcedure
    .input(uploadBaseSchema.extend({ version: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.dateiinhalt, "base64");
      const s3Key = generateR2Key(ctx.tenantId, "dokumente", input.dateiname);
      await uploadToR2(s3Key, buffer, input.mimeType);

      return ctx.db.dokument.create({
        data: {
          tenantId: ctx.tenantId,
          dateiname: input.dateiname,
          mimeType: input.mimeType,
          groesse: input.groesse,
          dateiinhalt: null, // nicht in DB speichern — liegt in R2
          s3Key,
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
        select: {
          id: true,
          dateiname: true,
          mimeType: true,
          groesse: true,
          s3Key: true,
          typ: true,
          objektId: true,
          einheitId: true,
          mieterId: true,
          mietverhaeltnisId: true,
          notiz: true,
          version: true,
          vorgaengerId: true,
          faelligkeitsdatum: true,
          fristTyp: true,
          schlagworte: true,
          hochgeladenAm: true,
        },
        orderBy: { hochgeladenAm: "desc" },
      });
    }),

  uploadNewVersion: writeProcedure
    .input(uploadBaseSchema.extend({ vorgaengerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const vorgaenger = await ctx.db.dokument.findUnique({
        where: { id: input.vorgaengerId, tenantId: ctx.tenantId },
        select: { version: true },
      });

      if (!vorgaenger) {
        throw new Error("Vorgänger-Dokument nicht gefunden");
      }

      const buffer = Buffer.from(input.dateiinhalt, "base64");
      const s3Key = generateR2Key(ctx.tenantId, "dokumente", input.dateiname);
      await uploadToR2(s3Key, buffer, input.mimeType);

      const dokument = await ctx.db.dokument.create({
        data: {
          tenantId: ctx.tenantId,
          dateiname: input.dateiname,
          mimeType: input.mimeType,
          groesse: input.groesse,
          dateiinhalt: null,
          s3Key,
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

  getVersionHistory: protectedProcedure
    .input(z.object({ dokumentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const dokument = await ctx.db.dokument.findUnique({
        where: { id: input.dokumentId, tenantId: ctx.tenantId },
        include: { vorgaenger: true, nachfolger: true },
      });

      if (!dokument) {
        throw new Error("Dokument nicht gefunden");
      }

      // Walk backwards to root
      let current = dokument;
      while (current.vorgaenger) {
        current = await ctx.db.dokument.findUnique({
          where: { id: current.vorgaengerId!, tenantId: ctx.tenantId },
          include: { vorgaenger: true, nachfolger: true },
        }) as typeof dokument;
        if (!current) break;
      }

      const rootId = current.id;
      const allVersions = await ctx.db.dokument.findMany({
        where: {
          tenantId: ctx.tenantId,
          OR: [{ id: rootId }, { vorgaengerId: rootId }],
        },
        orderBy: { version: "asc" },
      });

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
        return Array.from(collected.values()).sort((a, b) => a.version - b.version);
      }

      return allVersions;
    }),

  listByFrist: protectedProcedure
    .input(z.object({ tage: z.number() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const bis = new Date();
      bis.setDate(bis.getDate() + input.tage);

      return ctx.db.dokument.findMany({
        where: {
          tenantId: ctx.tenantId,
          faelligkeitsdatum: { gte: now, lte: bis },
        },
        orderBy: { faelligkeitsdatum: "asc" },
      });
    }),
});
