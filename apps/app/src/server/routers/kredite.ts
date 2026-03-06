import { z } from "zod";
import { router, protectedProcedure, writeProcedure } from "../trpc";
import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import {
  berechneTilgungsplan,
  berechneGesamtkosten,
  berechneRestschuld,
} from "../services/tilgungsplan.service";

export const krediteRouter = router({
  /**
   * List all credits
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    const kredite = await db.kredit.findMany({
      where: { tenantId },
      include: {
        sondertilgungen: true,
      },
      orderBy: { startdatum: "desc" },
    });

    return kredite.map((k) => ({
      ...k,
      rate: k.rate.toString(),
      zinssatz: k.zinssatz.toString(),
      ursprungsbetrag: k.ursprungsbetrag.toString(),
      sondertilgungen: k.sondertilgungen.map((st) => ({
        ...st,
        betrag: st.betrag.toString(),
      })),
    }));
  }),

  /**
   * Get credit by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;

      const kredit = await db.kredit.findUnique({
        where: { id: input.id, tenantId },
        include: {
          sondertilgungen: true,
          dokumente: true,
        },
      });

      if (!kredit) {
        throw new Error("Kredit nicht gefunden");
      }

      // Berechne Tilgungsplan und aktuelle Restschuld
      const plan = berechneTilgungsplan({
        ursprungsbetrag: parseFloat(kredit.ursprungsbetrag.toString()),
        zinssatz: parseFloat(kredit.zinssatz.toString()),
        rate: parseFloat(kredit.rate.toString()),
        startdatum: kredit.startdatum,
        laufzeitMonate: kredit.laufzeitMonate,
        sondertilgungen: kredit.sondertilgungen.map((st) => ({
          datum: st.datum,
          betrag: parseFloat(st.betrag.toString()),
        })),
      });

      const aktuelleRestschuld = berechneRestschuld(plan, new Date());

      return {
        ...kredit,
        rate: kredit.rate.toString(),
        zinssatz: kredit.zinssatz.toString(),
        ursprungsbetrag: kredit.ursprungsbetrag.toString(),
        restschuld: aktuelleRestschuld.toFixed(2),
        sondertilgungen: kredit.sondertilgungen.map((st) => ({
          ...st,
          betrag: st.betrag.toString(),
        })),
      };
    }),

  /**
   * Create credit
   */
  create: writeProcedure
    .input(
      z.object({
        bezeichnung: z.string().min(1),
        bank: z.string().min(1),
        referenznummer: z.string().optional(),
        startdatum: z.date(),
        auszahlungsdatum: z.date().optional(),
        ursprungsbetrag: z.number().min(0),
        rate: z.number().min(0),
        zinssatz: z.number().min(0).max(1), // z.B. 0.0325 = 3.25%
        laufzeitMonate: z.number().min(1),
        zinsbindungBis: z.date().optional(),
        laufzeitEnde: z.date().optional(),
        zahlungsfrequenz: z.string().default("MONATLICH"),
        objektId: z.string().optional(),
        einheitId: z.string().optional(),
        notizen: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;

      const kredit = await db.kredit.create({
        data: {
          tenantId,
          bezeichnung: input.bezeichnung,
          bank: input.bank,
          referenznummer: input.referenznummer,
          startdatum: input.startdatum,
          auszahlungsdatum: input.auszahlungsdatum,
          ursprungsbetrag: new Decimal(input.ursprungsbetrag),
          rate: new Decimal(input.rate),
          zinssatz: new Decimal(input.zinssatz),
          laufzeitMonate: input.laufzeitMonate,
          zinsbindungBis: input.zinsbindungBis,
          laufzeitEnde: input.laufzeitEnde,
          zahlungsfrequenz: input.zahlungsfrequenz,
          objektId: input.objektId,
          einheitId: input.einheitId,
          notizen: input.notizen,
        },
      });

      return kredit;
    }),

  /**
   * Update credit
   */
  update: writeProcedure
    .input(
      z.object({
        id: z.string(),
        bank: z.string().min(1).optional(),
        rate: z.number().min(0).optional(),
        zinssatz: z.number().min(0).max(1).optional(),
        zinsbindungBis: z.date().optional().nullable(),
        notizen: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;

      const kredit = await db.kredit.update({
        where: { id: input.id, tenantId },
        data: {
          ...(input.bank && { bank: input.bank }),
          ...(input.rate !== undefined && { rate: new Decimal(input.rate) }),
          ...(input.zinssatz !== undefined && {
            zinssatz: new Decimal(input.zinssatz),
          }),
          ...(input.zinsbindungBis !== undefined && {
            zinsbindungBis: input.zinsbindungBis,
          }),
          ...(input.notizen !== undefined && { notizen: input.notizen }),
        },
      });

      return kredit;
    }),

  /**
   * Delete credit
   */
  delete: writeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;

      await db.kredit.delete({
        where: { id: input.id, tenantId },
      });

      return { success: true };
    }),

  /**
   * Statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    const kredite = await db.kredit.findMany({
      where: { tenantId },
      include: {
        sondertilgungen: true,
      },
    });

    const gesamt = kredite.length;
    const gesamtRate = kredite.reduce(
      (sum, k) => sum.plus(k.rate.toString()),
      new Decimal(0)
    );

    // Berechne Gesamtrestschuld über alle Kredite
    let gesamtRestschuld = new Decimal(0);
    for (const kredit of kredite) {
      const plan = berechneTilgungsplan({
        ursprungsbetrag: parseFloat(kredit.ursprungsbetrag.toString()),
        zinssatz: parseFloat(kredit.zinssatz.toString()),
        rate: parseFloat(kredit.rate.toString()),
        startdatum: kredit.startdatum,
        laufzeitMonate: kredit.laufzeitMonate,
        sondertilgungen: kredit.sondertilgungen.map((st) => ({
          datum: st.datum,
          betrag: parseFloat(st.betrag.toString()),
        })),
      });
      const restschuld = berechneRestschuld(plan, new Date());
      gesamtRestschuld = gesamtRestschuld.plus(restschuld);
    }

    // Anzahl Kredite mit auslaufender Zinsbindung in nächsten 12 Monaten
    const inEinemJahr = new Date();
    inEinemJahr.setFullYear(inEinemJahr.getFullYear() + 1);

    const zinsbindungAuslaufend = kredite.filter(
      (k) =>
        k.zinsbindungBis &&
        k.zinsbindungBis >= new Date() &&
        k.zinsbindungBis <= inEinemJahr
    ).length;

    return {
      gesamt,
      gesamtRate: gesamtRate.toFixed(2),
      gesamtRestschuld: gesamtRestschuld.toFixed(2),
      zinsbindungAuslaufend,
    };
  }),

  /**
   * Get Tilgungsplan for a Kredit
   */
  getTilgungsplan: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;

      const kredit = await db.kredit.findUnique({
        where: { id: input.id, tenantId },
        include: {
          sondertilgungen: true,
        },
      });

      if (!kredit) {
        throw new Error("Kredit nicht gefunden");
      }

      const plan = berechneTilgungsplan({
        ursprungsbetrag: parseFloat(kredit.ursprungsbetrag.toString()),
        zinssatz: parseFloat(kredit.zinssatz.toString()),
        rate: parseFloat(kredit.rate.toString()),
        startdatum: kredit.startdatum,
        laufzeitMonate: kredit.laufzeitMonate,
        sondertilgungen: kredit.sondertilgungen.map((st) => ({
          datum: st.datum,
          betrag: parseFloat(st.betrag.toString()),
        })),
      });

      const kosten = berechneGesamtkosten(plan);

      return {
        plan,
        gesamtkosten: kosten,
      };
    }),

  /**
   * Create Sondertilgung
   */
  createSondertilgung: protectedProcedure
    .input(
      z.object({
        kreditId: z.string(),
        datum: z.date(),
        betrag: z.number().min(0),
        notiz: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;

      // Verify kredit exists and belongs to tenant
      const kredit = await db.kredit.findUnique({
        where: { id: input.kreditId, tenantId },
      });

      if (!kredit) {
        throw new Error("Kredit nicht gefunden");
      }

      const sondertilgung = await db.sondertilgung.create({
        data: {
          tenantId,
          kreditId: input.kreditId,
          datum: input.datum,
          betrag: new Decimal(input.betrag),
          notiz: input.notiz,
        },
      });

      return sondertilgung;
    }),

  /**
   * Delete Sondertilgung
   */
  deleteSondertilgung: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;

      await db.sondertilgung.delete({
        where: { id: input.id, tenantId },
      });

      return { success: true };
    }),
});
