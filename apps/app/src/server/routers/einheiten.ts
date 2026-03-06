import { z } from "zod";
import { router, protectedProcedure, writeProcedure } from "../trpc";
import { logAudit } from "../middleware/audit";
import { Decimal } from "@prisma/client/runtime/library";

export const einheitenRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        objektId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const einheiten = await ctx.db.einheit.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(input.objektId && { objektId: input.objektId }),
        },
        include: {
          objekt: true,
          mietverhaeltnisse: {
            where: {
              auszugsdatum: null, // Nur aktive Mietverhältnisse
            },
            include: {
              mieter: true,
            },
          },
        },
        orderBy: { einheitNr: "asc" },
      });

      return einheiten.map((e) => ({
        ...e,
        flaeche: e.flaeche.toString(),
        eurProQm: e.eurProQm?.toString() || null,
      }));
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    const einheiten = await ctx.db.einheit.findMany({
      where: { tenantId },
    });

    const gesamt = einheiten.length;
    const verfuegbar = einheiten.filter((e) => e.status === "VERFUEGBAR").length;
    const vermietet = einheiten.filter((e) => e.status === "VERMIETET").length;

    const durchschnittEurProQm =
      einheiten.length > 0
        ? einheiten
            .filter((e) => e.eurProQm)
            .reduce((sum, e) => sum.plus(e.eurProQm!.toString()), new Decimal(0))
            .div(einheiten.filter((e) => e.eurProQm).length || 1)
            .toFixed(2)
        : "0.00";

    return {
      gesamt,
      verfuegbar,
      vermietet,
      durchschnittEurProQm,
    };
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.einheit.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
        include: {
          objekt: true,
          mietverhaeltnisse: {
            include: {
              mieter: true,
            },
          },
          statusHistorie: {
            orderBy: { gueltigVon: "desc" },
          },
          dokumente: true,
        },
      });
    }),

  create: writeProcedure
    .input(
      z.object({
        objektId: z.string(),
        einheitNr: z.string().min(1),
        typ: z.enum(["WOHNUNG", "GEWERBE", "STELLPLATZ", "LAGER"]),
        flaeche: z.number().positive(),
        zimmer: z.number().int().positive().optional(),
        lage: z.string().optional(),
        ausstattung: z.string().optional(),
        eurProQm: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const einheit = await ctx.db.einheit.create({
        data: {
          ...input,
          tenantId: ctx.tenantId,
          status: "VERFUEGBAR",
        },
      });

      // Create initial status history
      await ctx.db.einheitStatusHistorie.create({
        data: {
          tenantId: ctx.tenantId,
          einheitId: einheit.id,
          status: "VERFUEGBAR",
          gueltigVon: new Date(),
          createdBy: ctx.userId,
        },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "EINHEIT_ERSTELLT",
        entitaet: "Einheit",
        entitaetId: einheit.id,
        neuWert: einheit,
      });

      return einheit;
    }),

  update: writeProcedure
    .input(
      z.object({
        id: z.string(),
        einheitNr: z.string().min(1).optional(),
        typ: z.enum(["WOHNUNG", "GEWERBE", "STELLPLATZ", "LAGER"]).optional(),
        flaeche: z.number().positive().optional(),
        zimmer: z.number().int().positive().optional().nullable(),
        lage: z.string().optional().nullable(),
        ausstattung: z.string().optional().nullable(),
        eurProQm: z.number().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const old = await ctx.db.einheit.findFirst({
        where: { id, tenantId: ctx.tenantId },
      });
      if (!old) throw new Error("Einheit nicht gefunden");

      const einheit = await ctx.db.einheit.update({
        where: { id },
        data,
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "EINHEIT_GEAENDERT",
        entitaet: "Einheit",
        entitaetId: id,
        altWert: old,
        neuWert: einheit,
      });

      return einheit;
    }),

  updateStatus: writeProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["VERFUEGBAR", "VERMIETET", "KUENDIGUNG", "SANIERUNG", "RESERVIERT"]),
        notiz: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, status, notiz } = input;

      const old = await ctx.db.einheit.findFirst({
        where: { id, tenantId: ctx.tenantId },
      });

      // Close previous status history
      await ctx.db.einheitStatusHistorie.updateMany({
        where: {
          einheitId: id,
          gueltigBis: null,
        },
        data: {
          gueltigBis: new Date(),
        },
      });

      // Create new status history
      await ctx.db.einheitStatusHistorie.create({
        data: {
          tenantId: ctx.tenantId,
          einheitId: id,
          status,
          gueltigVon: new Date(),
          notiz,
          createdBy: ctx.userId,
        },
      });

      const einheit = await ctx.db.einheit.update({
        where: { id },
        data: { status },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "EINHEIT_STATUS_GEAENDERT",
        entitaet: "Einheit",
        entitaetId: id,
        altWert: { status: old?.status },
        neuWert: { status },
      });

      return einheit;
    }),
});
