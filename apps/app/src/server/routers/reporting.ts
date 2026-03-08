import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export const reportingRouter = router({
  /**
   * Dashboard KPIs
   */
  dashboardKPIs: protectedProcedure
    .input(
      z
        .object({
          objektId: z.string().optional(),
          zeitraum: z.enum(["MONAT", "QUARTAL", "JAHR"]).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;

      // Calculate date range based on zeitraum
      let datumVon: Date | undefined;
      if (input?.zeitraum) {
        const now = new Date();
        if (input.zeitraum === "MONAT") {
          datumVon = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        } else if (input.zeitraum === "QUARTAL") {
          datumVon = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        } else if (input.zeitraum === "JAHR") {
          datumVon = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        }
      }

      // Objekte & Einheiten (filtered if objektId provided)
      const objekteCount = input?.objektId
        ? 1
        : await db.objekt.count({ where: { tenantId } });

      const einheitenWhere = input?.objektId
        ? { tenantId, objektId: input.objektId }
        : { tenantId };
      const einheitenCount = await db.einheit.count({ where: einheitenWhere });
      const vermieteteEinheiten = await db.einheit.count({
        where: { ...einheitenWhere, status: "VERMIETET" },
      });

      // Offene Rückstände
      const offeneSollstellungen = await db.sollstellung.findMany({
        where: {
          tenantId,
          status: { in: ["OFFEN", "TEILWEISE_BEZAHLT"] },
          faelligkeitsdatum: {
            lte: new Date(),
            ...(datumVon ? { gte: datumVon } : {}),
          },
          ...(input?.objektId
            ? {
                mietverhaeltnis: { einheit: { objektId: input.objektId } },
              }
            : {}),
        },
      });

      const rueckstaende = offeneSollstellungen.reduce((sum, s) => {
        const offen = new Decimal(s.betragGesamt.toString()).minus(
          s.gedecktGesamt.toString()
        );
        return sum.plus(offen);
      }, new Decimal(0));

      // Offene Tickets (filter by objektId if provided)
      const offeneTickets = await db.ticket.count({
        where: {
          tenantId,
          status: { in: ["ERFASST", "IN_BEARBEITUNG"] },
          ...(input?.objektId ? { objektId: input.objektId } : {}),
          ...(datumVon ? { createdAt: { gte: datumVon } } : {}),
        },
      });

      // Unklar-Zahlungen (no objektId filter — account level)
      const unklareZahlungen = await db.zahlung.count({
        where: {
          tenantId,
          status: "UNKLAR",
          ...(datumVon ? { buchungsdatum: { gte: datumVon } } : {}),
        },
      });

      // Offene Mahnungen
      const offeneMahnungenWhere: Record<string, unknown> = { tenantId, status: "OFFEN" };
      if (input?.objektId) {
        offeneMahnungenWhere.mietverhaeltnis = {
          einheit: { objektId: input.objektId },
        };
      }
      if (datumVon) offeneMahnungenWhere.createdAt = { gte: datumVon };
      const offeneMahnungen = await db.mahnung.count({
        where: offeneMahnungenWhere,
      });

      // Offene Sollstellungen (Anzahl)
      const offeneSollstellungenCount = await db.sollstellung.count({
        where: {
          tenantId,
          status: { in: ["OFFEN", "TEILWEISE_BEZAHLT"] },
          ...(input?.objektId
            ? {
                mietverhaeltnis: { einheit: { objektId: input.objektId } },
              }
            : {}),
          ...(datumVon ? { faelligkeitsdatum: { gte: datumVon } } : {}),
        },
      });

      return {
        objekte: objekteCount,
        einheiten: {
          gesamt: einheitenCount,
          vermietet: vermieteteEinheiten,
          frei: einheitenCount - vermieteteEinheiten,
        },
        rueckstaende: rueckstaende.toFixed(2),
        offeneTickets,
        unklareZahlungen,
        offeneMahnungen,
        offeneSollstellungen: offeneSollstellungenCount,
      };
    }),

  /**
   * Soll/Ist Übersicht für Zeitraum
   */
  sollIstUebersicht: protectedProcedure
    .input(
      z.object({
        vonDatum: z.date(),
        bisDatum: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;

      // Sollstellungen im Zeitraum
      const sollstellungen = await db.sollstellung.findMany({
        where: {
          tenantId,
          faelligkeitsdatum: {
            gte: input.vonDatum,
            lte: input.bisDatum,
          },
        },
      });

      const sollGesamt = sollstellungen.reduce(
        (sum, s) => sum.plus(s.betragGesamt.toString()),
        new Decimal(0)
      );
      const istGesamt = sollstellungen.reduce(
        (sum, s) => sum.plus(s.gedecktGesamt.toString()),
        new Decimal(0)
      );

      return {
        soll: sollGesamt.toFixed(2),
        ist: istGesamt.toFixed(2),
        differenz: sollGesamt.minus(istGesamt).toFixed(2),
        quote: sollGesamt.greaterThan(0)
          ? istGesamt.dividedBy(sollGesamt).times(100).toFixed(2)
          : "0.00",
      };
    }),

  /**
   * Monatsübersicht Soll/Ist (letzte 12 Monate)
   */
  monatsuebersicht: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    const results = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const monat = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const naechsterMonat = new Date(
        monat.getFullYear(),
        monat.getMonth() + 1,
        1
      );

      const sollstellungen = await db.sollstellung.findMany({
        where: {
          tenantId,
          faelligkeitsdatum: {
            gte: monat,
            lt: naechsterMonat,
          },
        },
      });

      const soll = sollstellungen.reduce(
        (sum, s) => sum.plus(s.betragGesamt.toString()),
        new Decimal(0)
      );
      const ist = sollstellungen.reduce(
        (sum, s) => sum.plus(s.gedecktGesamt.toString()),
        new Decimal(0)
      );

      results.push({
        monat: monat.toISOString().substring(0, 7), // YYYY-MM
        soll: parseFloat(soll.toFixed(2)),
        ist: parseFloat(ist.toFixed(2)),
      });
    }

    return results;
  }),

  /**
   * Statusquoten (nach Typ)
   */
  statusquoten: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    const einheitenByStatus = await db.einheit.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    });

    const ticketsByStatus = await db.ticket.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    });

    return {
      einheiten: einheitenByStatus.map((item) => ({
        status: item.status,
        anzahl: item._count,
      })),
      tickets: ticketsByStatus.map((item) => ({
        status: item.status,
        anzahl: item._count,
      })),
    };
  }),

  /**
   * Portfolio-Export (CSV/Excel vorbereitet)
   */
  portfolioExport: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    const objekte = await db.objekt.findMany({
      where: { tenantId },
      include: {
        einheiten: {
          include: {
            mietverhaeltnisse: {
              where: { auszugsdatum: null }, // Nur aktive Mietverhältnisse
              include: {
                mieter: true,
              },
            },
          },
        },
      },
    });

    const exportData = objekte.flatMap((obj) =>
      obj.einheiten.map((einheit) => ({
        objektBezeichnung: obj.bezeichnung,
        objektStrasse: obj.strasse,
        objektPlz: obj.plz,
        objektOrt: obj.ort,
        einheitNr: einheit.einheitNr,
        einheitTyp: einheit.typ,
        flaeche: einheit.flaeche.toString(),
        zimmer: einheit.zimmer || 0,
        status: einheit.status,
        kaltmiete:
          einheit.mietverhaeltnisse[0]?.kaltmiete.toString() || "0.00",
        mieterName:
          einheit.mietverhaeltnisse[0]?.mieter.nachname || "Frei",
      }))
    );

    return exportData;
  }),
});
