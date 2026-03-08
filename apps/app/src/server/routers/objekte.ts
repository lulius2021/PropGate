import { z } from "zod";
import { Prisma } from "@prisma/client";
import { router, protectedProcedure, writeProcedure, checkObjektLimit } from "../trpc";
import { logAudit } from "../middleware/audit";

export const objekteRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.objekt.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        _count: {
          select: {
            einheiten: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.objekt.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
        include: {
          einheiten: {
            include: {
              mietverhaeltnisse: {
                where: {
                  auszugsdatum: null, // Nur aktive Mietverhältnisse
                },
                include: {
                  mieter: true,
                },
              },
            },
          },
          dokumente: true,
        },
      });
    }),

  create: writeProcedure
    .input(
      z.object({
        // Basis - nur Bezeichnung ist wirklich erforderlich
        bezeichnung: z.string().min(1, "Objektname ist erforderlich"),
        objektIdIntern: z.string().optional(),
        strasse: z.string().optional(),
        hausnummer: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        land: z.string().optional(),

        // Eigentum
        eigentuemer: z.string().optional(),
        eigentuemeranteile: z.string().optional(),
        vertretungsberechtigt: z.boolean().optional(),

        // Objekt-Typ
        objektart: z.enum(["MFH", "WEG", "SONDEREIGENTUM", "WOHNHAUS", "GEWERBE", "GEMISCHT", "ANLAGE"]).optional(),
        verwaltungsart: z.enum(["MIETVERWALTUNG", "WEG_VERWALTUNG", "SEV", "GEMISCHT"]).optional(),
        baujahr: z.number().optional(),
        kernsanierungJahr: z.number().optional(),

        // Grundstück
        flurstueck: z.string().optional(),
        gemarkung: z.string().optional(),
        grundstueckFlaeche: z.number().optional(),

        // Gebäude
        anzahlGebaeude: z.number().optional(),
        anzahlGeschosse: z.number().optional(),
        unterkellerung: z.boolean().optional(),
        aufzug: z.boolean().optional(),
        tiefgarage: z.boolean().optional(),

        // Flächen
        wohnflaeche: z.number().optional(),
        gewerbeflaeche: z.number().optional(),
        nutzflaeche: z.number().optional(),
        gesamtflaeche: z.number().optional(),
        anzahlWohnungen: z.number().optional(),
        anzahlGewerbe: z.number().optional(),
        anzahlStellplaetze: z.number().optional(),

        // Technik
        heizungsart: z.string().optional(),
        warmwasser: z.string().optional(),
        stromAllgemein: z.boolean().optional(),
        wasserUnterzaehler: z.boolean().optional(),
        internetVersorgung: z.string().optional(),
        pvAnlage: z.boolean().optional(),

        // Verwaltung
        verwalterVertragBeginn: z.date().optional(),
        verwalterVertragLaufzeit: z.string().optional(),
        verwalterVerguetung: z.string().optional(),
        objektkontoIban: z.string().optional(),
        ruecklagenkontoIban: z.string().optional(),
        hausgelkontoIban: z.string().optional(),
        nebenkostenUmlagefaehig: z.boolean().optional(),
        umlageschluessel: z.string().optional(),

        // Zugang
        schliessanlage: z.string().optional(),
        schluesselbestand: z.string().optional(),
        zugaenge: z.string().optional(),

        // Sonstiges
        bildUrl: z.string().optional().nullable(),
        energieausweis: z.string().optional(),
        notizen: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Plan-Limit prüfen
      await checkObjektLimit(ctx);

      const objekt = await ctx.db.objekt.create({
        data: {
          ...input,
          tenantId: ctx.tenantId,
        } as Prisma.ObjektUncheckedCreateInput,
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "OBJEKT_ERSTELLT",
        entitaet: "Objekt",
        entitaetId: objekt.id,
        neuWert: objekt,
      });

      return objekt;
    }),

  update: writeProcedure
    .input(
      z.object({
        id: z.string(),
        // Basis
        bezeichnung: z.string().min(1, "Objektname ist erforderlich").optional(),
        objektIdIntern: z.string().optional(),
        strasse: z.string().optional(),
        hausnummer: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        land: z.string().optional(),

        // Eigentum
        eigentuemer: z.string().optional(),
        eigentuemeranteile: z.string().optional(),
        vertretungsberechtigt: z.boolean().optional(),

        // Objekt-Typ
        objektart: z.enum(["MFH", "WEG", "SONDEREIGENTUM", "WOHNHAUS", "GEWERBE", "GEMISCHT", "ANLAGE"]).optional(),
        verwaltungsart: z.enum(["MIETVERWALTUNG", "WEG_VERWALTUNG", "SEV", "GEMISCHT"]).optional(),
        baujahr: z.number().optional(),
        kernsanierungJahr: z.number().optional(),

        // Grundstück
        flurstueck: z.string().optional(),
        gemarkung: z.string().optional(),
        grundstueckFlaeche: z.number().optional(),

        // Gebäude
        anzahlGebaeude: z.number().optional(),
        anzahlGeschosse: z.number().optional(),
        unterkellerung: z.boolean().optional(),
        aufzug: z.boolean().optional(),
        tiefgarage: z.boolean().optional(),

        // Flächen
        wohnflaeche: z.number().optional(),
        gewerbeflaeche: z.number().optional(),
        nutzflaeche: z.number().optional(),
        gesamtflaeche: z.number().optional(),
        anzahlWohnungen: z.number().optional(),
        anzahlGewerbe: z.number().optional(),
        anzahlStellplaetze: z.number().optional(),

        // Technik
        heizungsart: z.string().optional(),
        warmwasser: z.string().optional(),
        stromAllgemein: z.boolean().optional(),
        wasserUnterzaehler: z.boolean().optional(),
        internetVersorgung: z.string().optional(),
        pvAnlage: z.boolean().optional(),

        // Verwaltung
        verwalterVertragBeginn: z.date().optional(),
        verwalterVertragLaufzeit: z.string().optional(),
        verwalterVerguetung: z.string().optional(),
        objektkontoIban: z.string().optional(),
        ruecklagenkontoIban: z.string().optional(),
        hausgelkontoIban: z.string().optional(),
        nebenkostenUmlagefaehig: z.boolean().optional(),
        umlageschluessel: z.string().optional(),

        // Zugang
        schliessanlage: z.string().optional(),
        schluesselbestand: z.string().optional(),
        zugaenge: z.string().optional(),

        // Sonstiges
        bildUrl: z.string().optional().nullable(),
        energieausweis: z.string().optional(),
        notizen: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const old = await ctx.db.objekt.findFirst({
        where: { id, tenantId: ctx.tenantId },
      });

      const objekt = await ctx.db.objekt.update({
        where: { id },
        data,
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "OBJEKT_GEAENDERT",
        entitaet: "Objekt",
        entitaetId: objekt.id,
        altWert: old,
        neuWert: objekt,
      });

      return objekt;
    }),

  delete: writeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const objekt = await ctx.db.objekt.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
      });

      await ctx.db.objekt.delete({
        where: { id: input.id },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "OBJEKT_GELOESCHT",
        entitaet: "Objekt",
        entitaetId: input.id,
        altWert: objekt,
      });

      return { success: true };
    }),
});
