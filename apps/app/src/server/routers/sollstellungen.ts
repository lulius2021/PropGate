/**
 * Sollstellungen tRPC Router
 * Handles payment requests (Sollstellungen)
 */

import { router, protectedProcedure, writeProcedure } from "../trpc";
import { z } from "zod";
import { logAudit } from "../middleware/audit";
import { erstelleMonatlicheWarmmiete } from "../services/warmmiete.service";

export const sollstellungenRouter = router({
  /**
   * Liste aller Sollstellungen (mit Filter)
   */
  list: protectedProcedure
    .input(
      z
        .object({
          mietverhaeltnisId: z.string().optional(),
          status: z
            .enum(["OFFEN", "TEILWEISE_BEZAHLT", "BEZAHLT", "STORNIERT"])
            .optional(),
          typ: z
            .enum([
              "WARMMIETE",
              "KAUTION",
              "NEBENKOSTEN",
              "MAHNGEBUEHR",
              "VERZUGSZINSEN",
              "SONSTIGE",
            ])
            .optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const sollstellungen = await ctx.db.sollstellung.findMany({
        where: {
          tenantId: ctx.tenantId,
          mietverhaeltnisId: input?.mietverhaeltnisId,
          status: input?.status,
          typ: input?.typ,
        },
        include: {
          mietverhaeltnis: {
            include: {
              mieter: true,
              einheit: {
                include: {
                  objekt: true,
                },
              },
            },
          },
          zahlungZuordnungen: {
            include: {
              zahlung: true,
            },
          },
        },
        orderBy: { faelligkeitsdatum: "desc" },
      });

      return sollstellungen.map((s) => ({
        ...s,
        betragGesamt: s.betragGesamt.toString(),
        kaltmiete: s.kaltmiete?.toString() || null,
        bkVorauszahlung: s.bkVorauszahlung?.toString() || null,
        hkVorauszahlung: s.hkVorauszahlung?.toString() || null,
        gedecktGesamt: s.gedecktGesamt.toString(),
        gedecktKalt: s.gedecktKalt?.toString() || null,
        gedecktBK: s.gedecktBK?.toString() || null,
        gedecktHK: s.gedecktHK?.toString() || null,
      }));
    }),

  /**
   * Einzelne Sollstellung abrufen
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.sollstellung.findUnique({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
        include: {
          mietverhaeltnis: {
            include: {
              mieter: true,
              einheit: {
                include: {
                  objekt: true,
                },
              },
            },
          },
          zahlungZuordnungen: {
            include: {
              zahlung: true,
            },
          },
        },
      });
    }),

  /**
   * Manuelle Sollstellung erstellen
   */
  create: writeProcedure
    .input(
      z.object({
        mietverhaeltnisId: z.string().optional(),
        typ: z.enum([
          "WARMMIETE",
          "KAUTION",
          "NEBENKOSTEN",
          "MAHNGEBUEHR",
          "VERZUGSZINSEN",
          "SONSTIGE",
        ]),
        titel: z.string().min(1),
        betragGesamt: z.number().positive(),
        faelligkeitsdatum: z.date(),
        kaltmiete: z.number().optional(),
        bkVorauszahlung: z.number().optional(),
        hkVorauszahlung: z.number().optional(),
        notiz: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sollstellung = await ctx.db.sollstellung.create({
        data: {
          tenantId: ctx.tenantId,
          mietverhaeltnisId: input.mietverhaeltnisId,
          typ: input.typ,
          titel: input.titel,
          betragGesamt: input.betragGesamt,
          kaltmiete: input.kaltmiete,
          bkVorauszahlung: input.bkVorauszahlung,
          hkVorauszahlung: input.hkVorauszahlung,
          faelligkeitsdatum: input.faelligkeitsdatum,
          notiz: input.notiz,
          status: "OFFEN",
        },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "SOLLSTELLUNG_ERSTELLT",
        entitaet: "Sollstellung",
        entitaetId: sollstellung.id,
        neuWert: sollstellung,
      });

      return sollstellung;
    }),

  /**
   * Warmmiete für einen Monat erstellen
   */
  erstelleWarmmiete: protectedProcedure
    .input(
      z.object({
        mietverhaeltnisId: z.string(),
        monat: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sollstellung = await erstelleMonatlicheWarmmiete({
        mietverhaeltnisId: input.mietverhaeltnisId,
        monat: input.monat,
        tenantId: ctx.tenantId,
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "WARMMIETE_ERSTELLT",
        entitaet: "Sollstellung",
        entitaetId: sollstellung.id,
        neuWert: sollstellung,
      });

      return sollstellung;
    }),

  /**
   * Sollstellung löschen/stornieren
   */
  delete: writeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sollstellung = await ctx.db.sollstellung.findUnique({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: { zahlungZuordnungen: true },
      });

      if (!sollstellung) {
        throw new Error("Sollstellung nicht gefunden");
      }

      if (sollstellung.zahlungZuordnungen.length > 0) {
        throw new Error(
          "Sollstellung kann nicht gelöscht werden, da bereits Zahlungen zugeordnet sind"
        );
      }

      await ctx.db.sollstellung.update({
        where: { id: input.id },
        data: { status: "STORNIERT" },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "SOLLSTELLUNG_STORNIERT",
        entitaet: "Sollstellung",
        entitaetId: input.id,
        altWert: sollstellung,
      });

      return true;
    }),

  /**
   * Sollstellung bearbeiten (nur wenn OFFEN)
   */
  update: writeProcedure
    .input(z.object({
      id: z.string(),
      titel: z.string().min(1).optional(),
      betragGesamt: z.number().positive().optional(),
      faelligkeitsdatum: z.date().optional(),
      notiz: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const soll = await ctx.db.sollstellung.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!soll) throw new Error("Nicht gefunden");
      if (soll.status !== "OFFEN") throw new Error("Nur offene Sollstellungen können bearbeitet werden");
      return ctx.db.sollstellung.update({ where: { id }, data });
    }),

  /**
   * Manuell als bezahlt markieren
   * Creates a Zahlung + ZahlungZuordnung for proper audit trail,
   * then updates the Sollstellung status.
   */
  manualBezahlt: protectedProcedure
    .input(z.object({
      id: z.string(),
      zahlungsart: z.enum(["UEBERWEISUNG", "BARGELD", "LASTSCHRIFT"]),
      zahlungsdatum: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const soll = await ctx.db.sollstellung.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
      });
      if (!soll) throw new Error("Nicht gefunden");
      if (soll.status === "BEZAHLT") throw new Error("Bereits bezahlt");
      if (soll.status === "STORNIERT") throw new Error("Stornierte Sollstellung kann nicht bezahlt werden");

      const restBetrag = soll.betragGesamt.minus(soll.gedecktGesamt);

      // 1. Create Zahlung record
      const zahlung = await ctx.db.zahlung.create({
        data: {
          tenantId: ctx.tenantId,
          datum: input.zahlungsdatum,
          betrag: restBetrag,
          verwendungszweck: `Manuelle Zahlung: ${soll.titel} (${input.zahlungsart})`,
          status: "ZUGEORDNET",
          zugeordnetAm: new Date(),
        },
      });

      // 2. Create ZahlungZuordnung linking Zahlung → Sollstellung
      await ctx.db.zahlungZuordnung.create({
        data: {
          tenantId: ctx.tenantId,
          zahlungId: zahlung.id,
          sollstellungId: soll.id,
          betrag: restBetrag,
          zugeordnetVon: ctx.userId,
        },
      });

      // 3. Update Sollstellung
      const updated = await ctx.db.sollstellung.update({
        where: { id: input.id },
        data: {
          status: "BEZAHLT",
          gedecktGesamt: soll.betragGesamt,
          notiz: `Manuell als bezahlt markiert (${input.zahlungsart}, ${input.zahlungsdatum.toLocaleDateString("de-DE")})`,
        },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "SOLLSTELLUNG_MANUELL_BEZAHLT",
        entitaet: "Sollstellung",
        entitaetId: input.id,
        neuWert: {
          status: "BEZAHLT",
          zahlungsart: input.zahlungsart,
          zahlungId: zahlung.id,
        },
      });
      return updated;
    }),

  /**
   * Statistiken für Dashboard
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [offen, teilweiseBezahlt, bezahlt] = await Promise.all([
      ctx.db.sollstellung.aggregate({
        where: {
          tenantId: ctx.tenantId,
          status: "OFFEN",
        },
        _sum: { betragGesamt: true },
        _count: true,
      }),
      ctx.db.sollstellung.aggregate({
        where: {
          tenantId: ctx.tenantId,
          status: "TEILWEISE_BEZAHLT",
        },
        _sum: { betragGesamt: true, gedecktGesamt: true },
        _count: true,
      }),
      ctx.db.sollstellung.aggregate({
        where: {
          tenantId: ctx.tenantId,
          status: "BEZAHLT",
        },
        _sum: { betragGesamt: true },
        _count: true,
      }),
    ]);

    return {
      offen: {
        anzahl: offen._count,
        summe: offen._sum.betragGesamt?.toNumber() || 0,
      },
      teilweiseBezahlt: {
        anzahl: teilweiseBezahlt._count,
        summe: teilweiseBezahlt._sum.betragGesamt?.toNumber() || 0,
        gedeckt: teilweiseBezahlt._sum.gedecktGesamt?.toNumber() || 0,
      },
      bezahlt: {
        anzahl: bezahlt._count,
        summe: bezahlt._sum.betragGesamt?.toNumber() || 0,
      },
    };
  }),
});
