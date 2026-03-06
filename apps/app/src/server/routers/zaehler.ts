/**
 * Zähler tRPC Router
 * Handles meter management and readings
 */

import { router, protectedProcedure, writeProcedure } from "../trpc";
import { z } from "zod";
import { logAudit } from "../middleware/audit";

export const zaehlerRouter = router({
  /**
   * Liste aller Zähler
   */
  list: protectedProcedure
    .input(
      z
        .object({
          objektId: z.string().optional(),
          einheitId: z.string().optional(),
          typ: z
            .enum(["STROM", "GAS", "WASSER_KALT", "WASSER_WARM", "WAERME"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.zaehler.findMany({
        where: {
          tenantId: ctx.tenantId,
          objektId: input?.objektId,
          einheitId: input?.einheitId,
          typ: input?.typ,
        },
        include: {
          objekt: true,
          einheit: true,
          _count: {
            select: { ablesungen: true },
          },
        },
        orderBy: { zaehlernummer: "asc" },
      });
    }),

  /**
   * Einzelner Zähler mit Historie
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.zaehler.findUnique({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
        include: {
          objekt: true,
          einheit: true,
          ablesungen: {
            orderBy: { datum: "desc" },
            take: 50, // Letzte 50 Ablesungen
          },
        },
      });
    }),

  /**
   * Zähler erstellen
   */
  create: writeProcedure
    .input(
      z.object({
        zaehlernummer: z.string().min(1),
        typ: z.enum(["STROM", "GAS", "WASSER_KALT", "WASSER_WARM", "WAERME"]),
        objektId: z.string().optional(),
        einheitId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Entweder objektId ODER einheitId muss gesetzt sein
      if (!input.objektId && !input.einheitId) {
        throw new Error("Entweder objektId oder einheitId muss gesetzt sein");
      }

      if (input.objektId && input.einheitId) {
        throw new Error("Nur objektId ODER einheitId kann gesetzt sein");
      }

      const zaehler = await ctx.db.zaehler.create({
        data: {
          tenantId: ctx.tenantId,
          zaehlernummer: input.zaehlernummer,
          typ: input.typ,
          objektId: input.objektId,
          einheitId: input.einheitId,
        },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "ZAEHLER_ERSTELLT",
        entitaet: "Zaehler",
        entitaetId: zaehler.id,
        neuWert: zaehler,
      });

      return zaehler;
    }),

  /**
   * Zählerstand erfassen
   */
  erfasseStand: protectedProcedure
    .input(
      z.object({
        zaehlerId: z.string(),
        datum: z.date(),
        stand: z.number().nonnegative(),
        ablesesTyp: z.enum(["REGULAER", "EINZUG", "AUSZUG"]).default("REGULAER"),
        mietverhaeltnisId: z.string().optional(),
        notiz: z.string().optional(),
        fotoS3Key: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const zaehlerstand = await ctx.db.zaehlerstand.create({
        data: {
          tenantId: ctx.tenantId,
          zaehlerId: input.zaehlerId,
          datum: input.datum,
          stand: input.stand,
          ablesesTyp: input.ablesesTyp,
          mietverhaeltnisId: input.mietverhaeltnisId,
          notiz: input.notiz,
          fotoS3Key: input.fotoS3Key,
          erfasstVon: ctx.userId,
        },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "ZAEHLERSTAND_ERFASST",
        entitaet: "Zaehlerstand",
        entitaetId: zaehlerstand.id,
        neuWert: zaehlerstand,
      });

      return zaehlerstand;
    }),

  /**
   * Alle Zählerstände für ein Mietverhältnis (Ein-/Auszug)
   */
  zaehlerstaendeFuerMietverhaeltnis: protectedProcedure
    .input(
      z.object({
        mietverhaeltnisId: z.string(),
        typ: z.enum(["EINZUG", "AUSZUG"]),
      })
    )
    .query(async ({ ctx, input }) => {
      // Mietverhältnis mit Einheit laden
      const mietverhaeltnis = await ctx.db.mietverhaeltnis.findUnique({
        where: { id: input.mietverhaeltnisId },
        include: {
          einheit: {
            include: {
              zaehler: true,
            },
          },
        },
      });

      if (!mietverhaeltnis) {
        throw new Error("Mietverhältnis nicht gefunden");
      }

      // Zählerstände für diese Einheit abrufen
      const zaehlerstaende = await ctx.db.zaehlerstand.findMany({
        where: {
          tenantId: ctx.tenantId,
          mietverhaeltnisId: input.mietverhaeltnisId,
          ablesesTyp: input.typ,
        },
        include: {
          zaehler: true,
        },
      });

      return {
        mietverhaeltnis,
        zaehler: mietverhaeltnis.einheit.zaehler,
        zaehlerstaende,
      };
    }),

  /**
   * Zählerstand aktualisieren
   */
  updateStand: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        stand: z.number().nonnegative(),
        notiz: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const zaehlerstand = await ctx.db.zaehlerstand.update({
        where: { id, tenantId: ctx.tenantId },
        data: updateData,
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "ZAEHLERSTAND_GEAENDERT",
        entitaet: "Zaehlerstand",
        entitaetId: zaehlerstand.id,
        neuWert: zaehlerstand,
      });

      return zaehlerstand;
    }),

  /**
   * Verbrauch zwischen zwei Ablesungen berechnen
   */
  berechneVerbrauch: protectedProcedure
    .input(
      z.object({
        zaehlerId: z.string(),
        vonDatum: z.date(),
        bisDatum: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Nächste Ablesung vor vonDatum
      const startAblesung = await ctx.db.zaehlerstand.findFirst({
        where: {
          tenantId: ctx.tenantId,
          zaehlerId: input.zaehlerId,
          datum: { lte: input.vonDatum },
        },
        orderBy: { datum: "desc" },
      });

      // Nächste Ablesung nach bisDatum
      const endeAblesung = await ctx.db.zaehlerstand.findFirst({
        where: {
          tenantId: ctx.tenantId,
          zaehlerId: input.zaehlerId,
          datum: { gte: input.bisDatum },
        },
        orderBy: { datum: "asc" },
      });

      if (!startAblesung || !endeAblesung) {
        return {
          verbrauch: null,
          startAblesung,
          endeAblesung,
        };
      }

      const verbrauch = endeAblesung.stand.toNumber() - startAblesung.stand.toNumber();

      return {
        verbrauch,
        startAblesung,
        endeAblesung,
      };
    }),

  /**
   * Statistiken
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [gesamt, strom, gas, wasser] = await Promise.all([
      ctx.db.zaehler.count({
        where: { tenantId: ctx.tenantId },
      }),
      ctx.db.zaehler.count({
        where: { tenantId: ctx.tenantId, typ: "STROM" },
      }),
      ctx.db.zaehler.count({
        where: { tenantId: ctx.tenantId, typ: "GAS" },
      }),
      ctx.db.zaehler.count({
        where: {
          tenantId: ctx.tenantId,
          typ: { in: ["WASSER_KALT", "WASSER_WARM"] },
        },
      }),
    ]);

    return {
      gesamt,
      strom,
      gas,
      wasser,
    };
  }),
});
