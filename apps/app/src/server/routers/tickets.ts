/**
 * Tickets tRPC Router
 * Handles ticket management system
 */

import { router, publicProcedure, createPlanGatedProcedure } from "../trpc";
import { Prisma, TicketStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logAudit } from "../middleware/audit";

const ticketsProcedure = createPlanGatedProcedure("tickets");

export const ticketsRouter = router({
  /**
   * Liste aller Tickets
   */
  list: ticketsProcedure
    .input(
      z
        .object({
          status: z
            .enum(["AKTUELL", "ERFASST", "IN_BEARBEITUNG", "ZUR_PRUEFUNG", "ABGESCHLOSSEN", "BEAUFTRAGT", "TERMIN_VEREINBART", "IN_ARBEIT", "RUECKFRAGE", "ABGERECHNET"])
            .optional(),
          kategorie: z
            .enum(["SCHADENSMELDUNG", "WARTUNG", "ANFRAGE", "BESCHWERDE", "SANIERUNG", "AUFGABE"])
            .optional(),
          prioritaet: z.enum(["NIEDRIG", "MITTEL", "HOCH", "KRITISCH"]).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      // "AKTUELL" is a virtual filter: all tickets not ABGESCHLOSSEN or ABGERECHNET
      const statusFilter: TicketStatus | Prisma.EnumTicketStatusFilter<"Ticket"> | undefined = input?.status === "AKTUELL"
        ? { notIn: [TicketStatus.ABGESCHLOSSEN, TicketStatus.ABGERECHNET] }
        : input?.status as TicketStatus | undefined;

      return ctx.db.ticket.findMany({
        where: {
          tenantId: ctx.tenantId,
          status: statusFilter,
          kategorie: input?.kategorie,
          prioritaet: input?.prioritaet,
        },
        include: {
          _count: {
            select: { kommentare: true, dokumente: true },
          },
        },
        orderBy: [
          { status: "asc" }, // ERFASST first
          { prioritaet: "desc" }, // KRITISCH first
          { createdAt: "desc" },
        ],
      });
    }),

  /**
   * Einzelnes Ticket abrufen
   */
  getById: ticketsProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ticket.findUnique({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
        include: {
          kommentare: {
            orderBy: { createdAt: "asc" },
            include: { dienstleister: true },
          },
          dokumente: {
            orderBy: { hochgeladenAm: "desc" },
          },
          dienstleister: true,
          statusHistorie: {
            orderBy: { datum: "desc" },
          },
        },
      });
    }),

  /**
   * Ticket erstellen
   */
  create: ticketsProcedure
    .input(
      z.object({
        titel: z.string().min(1),
        beschreibung: z.string().min(1),
        kategorie: z.enum([
          "SCHADENSMELDUNG",
          "WARTUNG",
          "ANFRAGE",
          "BESCHWERDE",
          "SANIERUNG",
          "AUFGABE",
        ]),
        prioritaet: z.enum(["NIEDRIG", "MITTEL", "HOCH", "KRITISCH"]).default("MITTEL"),
        objektId: z.string().optional(),
        einheitId: z.string().optional(),
        verantwortlicher: z.string().optional(),
        frist: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.ticket.create({
        data: {
          tenantId: ctx.tenantId,
          titel: input.titel,
          beschreibung: input.beschreibung,
          kategorie: input.kategorie,
          prioritaet: input.prioritaet,
          objektId: input.objektId,
          einheitId: input.einheitId,
          verantwortlicher: input.verantwortlicher,
          frist: input.frist,
          ersteller: ctx.userId,
          status: "ERFASST",
        },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "TICKET_ERSTELLT",
        entitaet: "Ticket",
        entitaetId: ticket.id,
        neuWert: ticket,
      });

      return ticket;
    }),

  /**
   * Ticket aktualisieren
   */
  update: ticketsProcedure
    .input(
      z.object({
        id: z.string(),
        titel: z.string().min(1).optional(),
        beschreibung: z.string().min(1).optional(),
        kategorie: z
          .enum(["SCHADENSMELDUNG", "WARTUNG", "ANFRAGE", "BESCHWERDE", "SANIERUNG"])
          .optional(),
        prioritaet: z.enum(["NIEDRIG", "MITTEL", "HOCH", "KRITISCH"]).optional(),
        status: z
          .enum(["ERFASST", "IN_BEARBEITUNG", "ZUR_PRUEFUNG", "ABGESCHLOSSEN", "BEAUFTRAGT", "TERMIN_VEREINBART", "IN_ARBEIT", "RUECKFRAGE", "ABGERECHNET"])
          .optional(),
        verantwortlicher: z.string().optional(),
        frist: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const altesTicket = await ctx.db.ticket.findUnique({
        where: { id, tenantId: ctx.tenantId },
      });

      const ticket = await ctx.db.ticket.update({
        where: { id, tenantId: ctx.tenantId },
        data: updateData,
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "TICKET_GEAENDERT",
        entitaet: "Ticket",
        entitaetId: ticket.id,
        altWert: altesTicket,
        neuWert: ticket,
      });

      return ticket;
    }),

  /**
   * Kommentar hinzufügen
   */
  addComment: ticketsProcedure
    .input(
      z.object({
        ticketId: z.string(),
        text: z.string().min(1),
        ereigniszeit: z.date().optional(),
        dienstleisterId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const kommentar = await ctx.db.ticketKommentar.create({
        data: {
          tenantId: ctx.tenantId,
          ticketId: input.ticketId,
          text: input.text,
          verfasser: ctx.userId,
          ereigniszeit: input.ereigniszeit,
          dienstleisterId: input.dienstleisterId,
        },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "TICKET_KOMMENTAR_HINZUGEFUEGT",
        entitaet: "TicketKommentar",
        entitaetId: kommentar.id,
        neuWert: kommentar,
      });

      return kommentar;
    }),

  /**
   * Status ändern (mit Kommentar)
   */
  changeStatus: ticketsProcedure
    .input(
      z.object({
        ticketId: z.string(),
        status: z.enum(["ERFASST", "IN_BEARBEITUNG", "ZUR_PRUEFUNG", "ABGESCHLOSSEN", "BEAUFTRAGT", "TERMIN_VEREINBART", "IN_ARBEIT", "RUECKFRAGE", "ABGERECHNET"]),
        kommentar: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Altes Ticket laden für StatusHistorie
      const altesTicket = await ctx.db.ticket.findUnique({
        where: { id: input.ticketId, tenantId: ctx.tenantId },
      });

      // Status aktualisieren
      const ticket = await ctx.db.ticket.update({
        where: { id: input.ticketId, tenantId: ctx.tenantId },
        data: { status: input.status },
      });

      // StatusHistorie-Eintrag erstellen
      if (altesTicket) {
        await ctx.db.ticketStatusHistorie.create({
          data: {
            ticketId: input.ticketId,
            vonStatus: altesTicket.status,
            zuStatus: input.status,
            bearbeiter: ctx.userId,
            notiz: input.kommentar,
          },
        });
      }

      // Optionaler Kommentar
      if (input.kommentar) {
        await ctx.db.ticketKommentar.create({
          data: {
            tenantId: ctx.tenantId,
            ticketId: input.ticketId,
            text: `Status geändert zu ${input.status}: ${input.kommentar}`,
            verfasser: ctx.userId,
          },
        });
      }

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "TICKET_STATUS_GEAENDERT",
        entitaet: "Ticket",
        entitaetId: ticket.id,
        neuWert: { status: input.status },
      });

      return ticket;
    }),

  /**
   * Dienstleister zuweisen
   */
  assignDienstleister: ticketsProcedure
    .input(
      z.object({
        ticketId: z.string(),
        dienstleisterId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data: { dienstleisterId: string | null; status?: TicketStatus } = { dienstleisterId: input.dienstleisterId };
      if (input.dienstleisterId) {
        data.status = TicketStatus.BEAUFTRAGT;
      }

      const ticket = await ctx.db.ticket.update({
        where: { id: input.ticketId, tenantId: ctx.tenantId },
        data,
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "TICKET_DIENSTLEISTER_ZUGEWIESEN",
        entitaet: "Ticket",
        entitaetId: ticket.id,
        neuWert: { dienstleisterId: input.dienstleisterId },
      });

      return ticket;
    }),

  /**
   * SLA-Fälligkeit setzen
   */
  setSLA: ticketsProcedure
    .input(
      z.object({
        ticketId: z.string(),
        slaFaelligkeitDatum: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.ticket.update({
        where: { id: input.ticketId, tenantId: ctx.tenantId },
        data: { slaFaelligkeitDatum: input.slaFaelligkeitDatum },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "TICKET_SLA_GESETZT",
        entitaet: "Ticket",
        entitaetId: ticket.id,
        neuWert: { slaFaelligkeitDatum: input.slaFaelligkeitDatum },
      });

      return ticket;
    }),

  /**
   * Statistiken für Dashboard
   */
  stats: ticketsProcedure.query(async ({ ctx }) => {
    const [erfasst, inBearbeitung, kritisch] = await Promise.all([
      ctx.db.ticket.count({
        where: {
          tenantId: ctx.tenantId,
          status: "ERFASST",
        },
      }),
      ctx.db.ticket.count({
        where: {
          tenantId: ctx.tenantId,
          status: "IN_BEARBEITUNG",
        },
      }),
      ctx.db.ticket.count({
        where: {
          tenantId: ctx.tenantId,
          prioritaet: "KRITISCH",
          status: { not: "ABGESCHLOSSEN" },
        },
      }),
    ]);

    return {
      erfasst,
      inBearbeitung,
      kritisch,
    };
  }),

  /**
   * Public intake: Mieter-Schadenmeldung via Token-Link
   */
  intakeSubmit: publicProcedure
    .input(
      z.object({
        einheitToken: z.string(),
        kategorie: z.enum(["SCHADENSMELDUNG", "WARTUNG", "ANFRAGE", "BESCHWERDE"]),
        beschreibung: z.string().min(1).max(2000),
        kontaktName: z.string().optional(),
        kontaktTelefon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const einheit = await ctx.db.einheit.findUnique({
        where: { intakeToken: input.einheitToken },
      });
      if (!einheit) throw new TRPCError({ code: "NOT_FOUND", message: "Ungültiger Link" });

      const beschreibungMitKontakt = input.kontaktName
        ? `${input.beschreibung}\n\nGemeldet von: ${input.kontaktName}${input.kontaktTelefon ? ` (${input.kontaktTelefon})` : ""}`
        : input.beschreibung;

      const ticket = await ctx.db.ticket.create({
        data: {
          tenantId: einheit.tenantId,
          titel: `${input.kategorie === "SCHADENSMELDUNG" ? "Schadensmeldung" : "Mieteranfrage"} — ${einheit.einheitNr}`,
          beschreibung: beschreibungMitKontakt,
          kategorie: input.kategorie,
          prioritaet: "MITTEL",
          status: "ERFASST",
          einheitId: einheit.id,
          objektId: einheit.objektId,
          herkunft: "MIETER_PORTAL",
        },
      });

      return { id: ticket.id };
    }),
});
