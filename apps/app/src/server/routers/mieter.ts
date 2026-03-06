import { z } from "zod";
import { router, protectedProcedure, writeProcedure } from "../trpc";
import { logAudit } from "../middleware/audit";

export const mieterRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.mieter.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        mietverhaeltnisse: {
          include: {
            einheit: {
              include: {
                objekt: true,
              },
            },
          },
        },
        _count: {
          select: {
            mietverhaeltnisse: true,
          },
        },
      },
      orderBy: { nachname: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.mieter.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
        include: {
          mietverhaeltnisse: {
            include: {
              einheit: {
                include: {
                  objekt: true,
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
        // Stammdaten
        mieterIdIntern: z.string().optional(),
        typ: z.enum(["PRIVAT", "GESCHAEFTLICH"]),
        anrede: z.string().optional(),
        titel: z.string().optional(),
        vorname: z.string().optional(),
        nachname: z.string().min(1),
        firma: z.string().optional(),
        geburtsdatum: z.date().optional(),
        staatsangehoerigkeit: z.string().optional(),

        // Adresse
        strasse: z.string().optional(),
        hausnummer: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        land: z.string().optional(),

        // Kontakt
        telefonMobil: z.string().optional(),
        telefonFestnetz: z.string().optional(),
        email: z.string().email().optional(),
        kommunikationskanal: z.string().optional(),

        // Notfallkontakt
        notfallkontaktName: z.string().optional(),
        notfallkontaktBeziehung: z.string().optional(),
        notfallkontaktTelefon: z.string().optional(),

        // Identität
        ausweisart: z.string().optional(),
        ausweisnummer: z.string().optional(),
        bonitaetGeprueft: z.boolean().optional(),
        bonitaetDatum: z.date().optional(),

        // DSGVO
        datenschutzHinweisUebergeben: z.boolean().optional(),
        datenschutzDatum: z.date().optional(),

        // Sonstiges
        telefon: z.string().optional(),
        notizen: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mieter = await ctx.db.mieter.create({
        data: {
          ...input,
          tenantId: ctx.tenantId,
        },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "MIETER_ERSTELLT",
        entitaet: "Mieter",
        entitaetId: mieter.id,
        neuWert: mieter,
      });

      return mieter;
    }),

  update: writeProcedure
    .input(
      z.object({
        id: z.string(),
        // Stammdaten
        mieterIdIntern: z.string().optional(),
        typ: z.enum(["PRIVAT", "GESCHAEFTLICH"]).optional(),
        anrede: z.string().optional(),
        titel: z.string().optional(),
        vorname: z.string().optional(),
        nachname: z.string().min(1).optional(),
        firma: z.string().optional(),
        geburtsdatum: z.date().optional(),
        staatsangehoerigkeit: z.string().optional(),

        // Adresse
        strasse: z.string().optional(),
        hausnummer: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        land: z.string().optional(),

        // Kontakt
        telefonMobil: z.string().optional(),
        telefonFestnetz: z.string().optional(),
        email: z.string().email().optional(),
        kommunikationskanal: z.string().optional(),

        // Notfallkontakt
        notfallkontaktName: z.string().optional(),
        notfallkontaktBeziehung: z.string().optional(),
        notfallkontaktTelefon: z.string().optional(),

        // Identität
        ausweisart: z.string().optional(),
        ausweisnummer: z.string().optional(),
        bonitaetGeprueft: z.boolean().optional(),
        bonitaetDatum: z.date().optional(),

        // DSGVO
        datenschutzHinweisUebergeben: z.boolean().optional(),
        datenschutzDatum: z.date().optional(),

        // Sonstiges
        telefon: z.string().optional(),
        notizen: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const old = await ctx.db.mieter.findFirst({
        where: { id, tenantId: ctx.tenantId },
      });

      const mieter = await ctx.db.mieter.update({
        where: { id },
        data,
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "MIETER_GEAENDERT",
        entitaet: "Mieter",
        entitaetId: mieter.id,
        altWert: old,
        neuWert: mieter,
      });

      return mieter;
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    const mieter = await ctx.db.mieter.findMany({
      where: { tenantId },
    });

    const gesamt = mieter.length;
    const privat = mieter.filter((m) => m.typ === "PRIVAT").length;
    const gewerbe = mieter.filter((m) => m.typ === "GESCHAEFTLICH").length;

    return {
      gesamt,
      privat,
      gewerbe,
    };
  }),

  addNotiz: protectedProcedure
    .input(z.object({
      mieterId: z.string(),
      inhalt: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mieterNotiz.create({
        data: {
          tenantId: ctx.tenantId,
          mieterId: input.mieterId,
          userId: ctx.userId,
          inhalt: input.inhalt,
        },
        include: { user: { select: { name: true, email: true } } },
      });
    }),

  listNotizen: protectedProcedure
    .input(z.object({ mieterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.mieterNotiz.findMany({
        where: { tenantId: ctx.tenantId, mieterId: input.mieterId },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),
});
