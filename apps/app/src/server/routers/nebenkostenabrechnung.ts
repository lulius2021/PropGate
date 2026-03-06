import { router, protectedProcedure, writeProcedure } from "../trpc";
import { z } from "zod";
import { logAudit } from "../middleware/audit";
import { berechneNebenkostenabrechnung } from "../services/nebenkostenabrechnung.service";

export const nebenkostenabrechnungRouter = router({
  list: protectedProcedure
    .input(z.object({ objektId: z.string().optional(), jahr: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.nebenkostenabrechnung.findMany({
        where: { tenantId: ctx.tenantId, objektId: input?.objektId, abrechnungsjahr: input?.jahr },
        include: { objekt: true, _count: { select: { positionen: true, mieterpositionen: true } } },
        orderBy: [{ abrechnungsjahr: "desc" }, { erstelltAm: "desc" }],
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.nebenkostenabrechnung.findUnique({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: {
          objekt: { include: { einheiten: true } },
          positionen: { orderBy: { kostenartBezeichnung: "asc" } },
          mieterpositionen: {
            include: {
              mietverhaeltnis: { include: { mieter: true, einheit: true } },
            },
            orderBy: { einheitId: "asc" },
          },
        },
      });
    }),

  create: writeProcedure
    .input(z.object({
      objektId: z.string(),
      abrechnungsjahr: z.number().int().min(2000).max(2100),
      vonDatum: z.date(),
      bisDatum: z.date(),
      notiz: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const nka = await ctx.db.nebenkostenabrechnung.create({
        data: {
          tenantId: ctx.tenantId,
          objektId: input.objektId,
          abrechnungsjahr: input.abrechnungsjahr,
          vonDatum: input.vonDatum,
          bisDatum: input.bisDatum,
          status: "ENTWURF",
          notiz: input.notiz,
        },
      });
      await logAudit({ tenantId: ctx.tenantId, userId: ctx.userId, aktion: "NKA_ERSTELLT", entitaet: "Nebenkostenabrechnung", entitaetId: nka.id, neuWert: nka });
      return nka;
    }),

  berechnen: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await berechneNebenkostenabrechnung(input.id, ctx.tenantId);
      await logAudit({ tenantId: ctx.tenantId, userId: ctx.userId, aktion: "NKA_BERECHNET", entitaet: "Nebenkostenabrechnung", entitaetId: input.id, neuWert: result });
      return result;
    }),

  freigeben: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const nka = await ctx.db.nebenkostenabrechnung.update({
        where: { id: input.id, tenantId: ctx.tenantId },
        data: { status: "FREIGEGEBEN", freigegebenAm: new Date() },
      });
      await logAudit({ tenantId: ctx.tenantId, userId: ctx.userId, aktion: "NKA_FREIGEGEBEN", entitaet: "Nebenkostenabrechnung", entitaetId: input.id });
      return nka;
    }),

  delete: writeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.nebenkostenabrechnung.delete({ where: { id: input.id, tenantId: ctx.tenantId } });
      return true;
    }),
});
