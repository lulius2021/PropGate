import { router, protectedProcedure, writeProcedure } from "../trpc";
import { z } from "zod";
import { logAudit } from "../middleware/audit";

export const wartungRouter = router({
  list: protectedProcedure
    .input(z.object({ objektId: z.string().optional(), einheitId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const aufgaben = await ctx.db.wartungsaufgabe.findMany({
        where: { tenantId: ctx.tenantId, objektId: input?.objektId, einheitId: input?.einheitId },
        orderBy: { naechsteFaelligkeit: "asc" },
      });

      // Enrich with Objekt/Einheit names (no Prisma relation on Wartungsaufgabe)
      const objektIds = [...new Set(aufgaben.map((a) => a.objektId).filter(Boolean))] as string[];
      const einheitIds = [...new Set(aufgaben.map((a) => a.einheitId).filter(Boolean))] as string[];

      const [objekte, einheiten] = await Promise.all([
        objektIds.length > 0
          ? ctx.db.objekt.findMany({ where: { id: { in: objektIds } }, select: { id: true, bezeichnung: true } })
          : [],
        einheitIds.length > 0
          ? ctx.db.einheit.findMany({ where: { id: { in: einheitIds } }, select: { id: true, einheitNr: true, lage: true } })
          : [],
      ]);

      const objektMap = Object.fromEntries(objekte.map((o) => [o.id, o.bezeichnung]));
      const einheitMap = Object.fromEntries(einheiten.map((e) => [e.id, `${e.einheitNr}${e.lage ? ` (${e.lage})` : ""}`]));

      return aufgaben.map((a) => ({
        ...a,
        objektName: a.objektId ? objektMap[a.objektId] ?? null : null,
        einheitName: a.einheitId ? einheitMap[a.einheitId] ?? null : null,
      }));
    }),

  // Helper: list Objekte + Einheiten for dropdowns in the create form
  objekteUndEinheiten: protectedProcedure.query(async ({ ctx }) => {
    const objekte = await ctx.db.objekt.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, bezeichnung: true },
      orderBy: { bezeichnung: "asc" },
    });
    const einheiten = await ctx.db.einheit.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, objektId: true, einheitNr: true, lage: true },
      orderBy: { einheitNr: "asc" },
    });
    return { objekte, einheiten };
  }),

  listFaelligIn: protectedProcedure
    .input(z.object({ tage: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      const bis = new Date();
      bis.setDate(bis.getDate() + input.tage);
      return ctx.db.wartungsaufgabe.findMany({
        where: { tenantId: ctx.tenantId, naechsteFaelligkeit: { lte: bis } },
        orderBy: { naechsteFaelligkeit: "asc" },
      });
    }),

  create: writeProcedure
    .input(z.object({
      bezeichnung: z.string().min(1),
      kategorie: z.string().min(1),
      intervallMonate: z.number().int().min(1),
      naechsteFaelligkeit: z.date(),
      letzteAusfuehrung: z.date().optional(),
      objektId: z.string().optional(),
      einheitId: z.string().optional(),
      verantwortlicher: z.string().optional(),
      notiz: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const aufgabe = await ctx.db.wartungsaufgabe.create({
        data: { tenantId: ctx.tenantId, ...input },
      });
      await logAudit({ tenantId: ctx.tenantId, userId: ctx.userId, aktion: "WARTUNGSAUFGABE_ERSTELLT", entitaet: "Wartungsaufgabe", entitaetId: aufgabe.id, neuWert: aufgabe });
      return aufgabe;
    }),

  update: writeProcedure
    .input(z.object({
      id: z.string(),
      bezeichnung: z.string().min(1).optional(),
      kategorie: z.string().optional(),
      intervallMonate: z.number().int().min(1).optional(),
      naechsteFaelligkeit: z.date().optional(),
      letzteAusfuehrung: z.date().optional(),
      verantwortlicher: z.string().optional(),
      notiz: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const aufgabe = await ctx.db.wartungsaufgabe.update({ where: { id, tenantId: ctx.tenantId }, data });
      await logAudit({ tenantId: ctx.tenantId, userId: ctx.userId, aktion: "WARTUNGSAUFGABE_GEAENDERT", entitaet: "Wartungsaufgabe", entitaetId: id, neuWert: aufgabe });
      return aufgabe;
    }),

  erledigt: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Mark as done and calculate next due date
      const aufgabe = await ctx.db.wartungsaufgabe.findUnique({ where: { id: input.id, tenantId: ctx.tenantId } });
      if (!aufgabe) throw new Error("Nicht gefunden");

      const naechste = new Date(aufgabe.naechsteFaelligkeit);
      naechste.setMonth(naechste.getMonth() + aufgabe.intervallMonate);

      const updated = await ctx.db.wartungsaufgabe.update({
        where: { id: input.id, tenantId: ctx.tenantId },
        data: { letzteAusfuehrung: new Date(), naechsteFaelligkeit: naechste },
      });
      await logAudit({ tenantId: ctx.tenantId, userId: ctx.userId, aktion: "WARTUNGSAUFGABE_ERLEDIGT", entitaet: "Wartungsaufgabe", entitaetId: input.id });
      return updated;
    }),

  undoErledigt: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const a = await ctx.db.wartungsaufgabe.findUniqueOrThrow({ where: { id: input.id, tenantId: ctx.tenantId } });
      if (!a.letzteAusfuehrung) return a;
      // Fälligkeit zurücksetzen: naechsteFaelligkeit - intervallMonate
      const prev = new Date(a.naechsteFaelligkeit);
      prev.setMonth(prev.getMonth() - a.intervallMonate);
      const updated = await ctx.db.wartungsaufgabe.update({
        where: { id: input.id, tenantId: ctx.tenantId },
        data: { letzteAusfuehrung: null, naechsteFaelligkeit: prev },
      });
      await logAudit({ tenantId: ctx.tenantId, userId: ctx.userId, aktion: "WARTUNGSAUFGABE_UNDO", entitaet: "Wartungsaufgabe", entitaetId: input.id });
      return updated;
    }),

  delete: writeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.wartungsaufgabe.delete({ where: { id: input.id, tenantId: ctx.tenantId } });
      return true;
    }),
});
