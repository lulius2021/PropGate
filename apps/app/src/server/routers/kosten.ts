/**
 * Kosten & Zeit tRPC Router
 * Handles cost and time tracking
 */

import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { logAudit } from "../middleware/audit";
import { berechneKostenStatus } from "../services/kosten-status.service";

export const kostenRouter = router({
  /**
   * Liste aller Kosten
   */
  listKosten: protectedProcedure
    .input(
      z
        .object({
          jahr: z.number().optional(),
          bkRelevant: z.boolean().optional(),
          hkRelevant: z.boolean().optional(),
          zahlungsstatus: z
            .enum(["OFFEN", "TEILBEZAHLT", "BEZAHLT", "UEBERFAELLIG"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const kosten = await ctx.db.kosten.findMany({
        where: {
          tenantId: ctx.tenantId,
          jahr: input?.jahr,
          bkRelevant: input?.bkRelevant,
          hkRelevant: input?.hkRelevant,
        },
        include: {
          dokumente: true,
          zahlungen: true,
        },
        orderBy: { datum: "desc" },
      });

      // Status berechnen und filtern
      const kostenMitStatus = kosten.map((k) => {
        const status = berechneKostenStatus(k);
        return {
          ...k,
          betragBrutto: k.betragBrutto.toString(),
          rechnungsdatum: k.rechnungsdatum,
          faelligkeitsdatum: k.faelligkeitsdatum,
          rechnungsnummer: k.rechnungsnummer,
          lieferantenRef: k.lieferantenRef,
          zahlungen: k.zahlungen.map((z) => ({
            ...z,
            betrag: z.betrag.toString(),
          })),
          ...status,
        };
      });

      // Filter nach Zahlungsstatus anwenden
      if (input?.zahlungsstatus) {
        if (input.zahlungsstatus === "UEBERFAELLIG") {
          return kostenMitStatus.filter((k) => k.ueberfaellig);
        } else {
          return kostenMitStatus.filter(
            (k) => k.zahlungsstatus === input.zahlungsstatus
          );
        }
      }

      return kostenMitStatus;
    }),

  /**
   * Kosten erstellen
   */
  createKosten: protectedProcedure
    .input(
      z.object({
        datum: z.date(),
        betragBrutto: z.number().positive(),
        lieferant: z.string().min(1),
        kategorie: z.string().min(1),
        beschreibung: z.string().optional(),
        bkRelevant: z.boolean().default(false),
        hkRelevant: z.boolean().default(false),
        rechnungsdatum: z.date().optional(),
        faelligkeitsdatum: z.date().optional(),
        rechnungsnummer: z.string().optional(),
        lieferantenRef: z.string().optional(),
        objektId: z.string().optional(),
        einheitId: z.string().optional(),
        ticketId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const jahr = input.datum.getFullYear();

      const kosten = await ctx.db.kosten.create({
        data: {
          tenantId: ctx.tenantId,
          datum: input.datum,
          betragBrutto: input.betragBrutto,
          lieferant: input.lieferant,
          kategorie: input.kategorie,
          beschreibung: input.beschreibung,
          bkRelevant: input.bkRelevant,
          hkRelevant: input.hkRelevant,
          rechnungsdatum: input.rechnungsdatum,
          faelligkeitsdatum: input.faelligkeitsdatum,
          rechnungsnummer: input.rechnungsnummer,
          lieferantenRef: input.lieferantenRef,
          jahr,
          objektId: input.objektId,
          einheitId: input.einheitId,
          ticketId: input.ticketId,
        },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "KOSTEN_ERFASST",
        entitaet: "Kosten",
        entitaetId: kosten.id,
        neuWert: kosten,
      });

      return kosten;
    }),

  /**
   * Kosten aktualisieren
   */
  updateKosten: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        betragBrutto: z.number().positive().optional(),
        lieferant: z.string().min(1).optional(),
        kategorie: z.string().min(1).optional(),
        beschreibung: z.string().optional(),
        bkRelevant: z.boolean().optional(),
        hkRelevant: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const kosten = await ctx.db.kosten.update({
        where: { id, tenantId: ctx.tenantId },
        data: updateData,
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "KOSTEN_GEAENDERT",
        entitaet: "Kosten",
        entitaetId: kosten.id,
        neuWert: kosten,
      });

      return kosten;
    }),

  /**
   * Kosten löschen
   */
  deleteKosten: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.kosten.delete({
        where: { id: input.id, tenantId: ctx.tenantId },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "KOSTEN_GELOESCHT",
        entitaet: "Kosten",
        entitaetId: input.id,
      });

      return true;
    }),

  /**
   * Statistiken (Summen pro Jahr, BK/HK, Offene Posten)
   */
  statsKosten: protectedProcedure
    .input(z.object({ jahr: z.number() }))
    .query(async ({ ctx, input }) => {
      const [gesamt, bk, hk, alleKosten] = await Promise.all([
        ctx.db.kosten.aggregate({
          where: {
            tenantId: ctx.tenantId,
            jahr: input.jahr,
          },
          _sum: { betragBrutto: true },
          _count: true,
        }),
        ctx.db.kosten.aggregate({
          where: {
            tenantId: ctx.tenantId,
            jahr: input.jahr,
            bkRelevant: true,
          },
          _sum: { betragBrutto: true },
        }),
        ctx.db.kosten.aggregate({
          where: {
            tenantId: ctx.tenantId,
            jahr: input.jahr,
            hkRelevant: true,
          },
          _sum: { betragBrutto: true },
        }),
        ctx.db.kosten.findMany({
          where: {
            tenantId: ctx.tenantId,
            jahr: input.jahr,
          },
          include: {
            zahlungen: true,
          },
        }),
      ]);

      // Offene Posten und Überfällige berechnen
      let summeOffen = 0;
      let anzahlOffen = 0;
      let summeUeberfaellig = 0;
      let anzahlUeberfaellig = 0;

      alleKosten.forEach((k) => {
        const status = berechneKostenStatus(k);
        if (status.zahlungsstatus !== "BEZAHLT") {
          summeOffen += status.restbetrag;
          anzahlOffen++;
          if (status.ueberfaellig) {
            summeUeberfaellig += status.restbetrag;
            anzahlUeberfaellig++;
          }
        }
      });

      return {
        gesamt: {
          anzahl: gesamt._count,
          summe: gesamt._sum.betragBrutto?.toNumber() || 0,
        },
        bk: bk._sum.betragBrutto?.toNumber() || 0,
        hk: hk._sum.betragBrutto?.toNumber() || 0,
        offen: {
          anzahl: anzahlOffen,
          summe: Math.round(summeOffen * 100) / 100,
        },
        ueberfaellig: {
          anzahl: anzahlUeberfaellig,
          summe: Math.round(summeUeberfaellig * 100) / 100,
        },
      };
    }),

  // ============================================
  // KOSTEN-ZAHLUNGEN (Offene Posten)
  // ============================================

  /**
   * Einzelne Kostenposition mit Zahlungen abrufen
   */
  getKostenById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const kosten = await ctx.db.kosten.findUnique({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
        include: {
          zahlungen: {
            orderBy: { datum: "desc" },
          },
          dokumente: true,
        },
      });

      if (!kosten) {
        throw new Error("Kosten nicht gefunden");
      }

      const status = berechneKostenStatus(kosten);

      return {
        ...kosten,
        betragBrutto: kosten.betragBrutto.toString(),
        zahlungen: kosten.zahlungen.map((z) => ({
          ...z,
          betrag: z.betrag.toString(),
        })),
        ...status,
      };
    }),

  /**
   * Zahlung für Kostenposition erstellen
   */
  createKostenZahlung: protectedProcedure
    .input(
      z.object({
        kostenId: z.string(),
        datum: z.date(),
        betrag: z.number().positive(),
        notiz: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify kosten exists and belongs to tenant
      const kosten = await ctx.db.kosten.findUnique({
        where: { id: input.kostenId, tenantId: ctx.tenantId },
      });

      if (!kosten) {
        throw new Error("Kosten nicht gefunden");
      }

      const zahlung = await ctx.db.kostenZahlung.create({
        data: {
          tenantId: ctx.tenantId,
          kostenId: input.kostenId,
          datum: input.datum,
          betrag: input.betrag,
          notiz: input.notiz,
        },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "KOSTEN_ZAHLUNG_ERFASST",
        entitaet: "KostenZahlung",
        entitaetId: zahlung.id,
        neuWert: zahlung,
      });

      return zahlung;
    }),

  /**
   * Zahlung löschen
   */
  deleteKostenZahlung: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.kostenZahlung.delete({
        where: { id: input.id, tenantId: ctx.tenantId },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "KOSTEN_ZAHLUNG_GELOESCHT",
        entitaet: "KostenZahlung",
        entitaetId: input.id,
      });

      return { success: true };
    }),

  // ============================================
  // ZEITERFASSUNG
  // ============================================

  /**
   * Liste aller Zeiterfassungen
   */
  listZeit: protectedProcedure
    .input(
      z
        .object({
          datumVon: z.date().optional(),
          datumBis: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.zeiterfassung.findMany({
        where: {
          tenantId: ctx.tenantId,
          datum: {
            gte: input?.datumVon,
            lte: input?.datumBis,
          },
        },
        orderBy: { datum: "desc" },
      });
    }),

  /**
   * Zeiterfassung erstellen
   */
  createZeit: protectedProcedure
    .input(
      z.object({
        datum: z.date(),
        start: z.date().optional(),
        ende: z.date().optional(),
        dauer: z.number().optional(),
        taetigkeit: z.string().min(1),
        rolleFunktion: z.string().optional(),
        objektId: z.string().optional(),
        einheitId: z.string().optional(),
        ticketId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const zeit = await ctx.db.zeiterfassung.create({
        data: {
          tenantId: ctx.tenantId,
          datum: input.datum,
          start: input.start,
          ende: input.ende,
          dauer: input.dauer,
          taetigkeit: input.taetigkeit,
          rolleFunktion: input.rolleFunktion,
          objektId: input.objektId,
          einheitId: input.einheitId,
          ticketId: input.ticketId,
          erfasstVon: ctx.userId,
        },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "ZEIT_ERFASST",
        entitaet: "Zeiterfassung",
        entitaetId: zeit.id,
        neuWert: zeit,
      });

      return zeit;
    }),

  /**
   * Statistiken (Summe Stunden)
   */
  statsZeit: protectedProcedure
    .input(
      z.object({
        datumVon: z.date(),
        datumBis: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.zeiterfassung.aggregate({
        where: {
          tenantId: ctx.tenantId,
          datum: {
            gte: input.datumVon,
            lte: input.datumBis,
          },
        },
        _sum: { dauer: true },
        _count: true,
      });

      return {
        anzahl: result._count,
        summeStunden: result._sum.dauer?.toNumber() || 0,
      };
    }),
});
