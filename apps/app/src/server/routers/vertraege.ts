import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { logAudit } from "../middleware/audit";
import { Decimal } from "@prisma/client/runtime/library";

export const vertraegeRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const vertraege = await ctx.db.mietverhaeltnis.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        mieter: true,
        einheit: {
          include: {
            objekt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return vertraege.map((v) => ({
      ...v,
      kaltmiete: v.kaltmiete.toString(),
      bkVorauszahlung: v.bkVorauszahlung.toString(),
      hkVorauszahlung: v.hkVorauszahlung.toString(),
      kaution: v.kaution?.toString() || null,
    }));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.mietverhaeltnis.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
        include: {
          mieter: true,
          einheit: {
            include: {
              objekt: true,
            },
          },
          dokumente: true,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        mieterId: z.string(),
        einheitId: z.string(),
        einzugsdatum: z.date(),
        kaltmiete: z.number().positive(),
        bkVorauszahlung: z.number().nonnegative(),
        hkVorauszahlung: z.number().nonnegative(),
        kaution: z.number().optional(),
        notizen: z.string().optional(),
        vertragsart: z.enum(["UNBEFRISTET", "BEFRISTET", "UNTERMIETE", "STAFFELMIETE", "INDEXMIETE", "GEWERBE"]).optional(),
        auszugsdatum: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mietverhaeltnis = await ctx.db.mietverhaeltnis.create({
        data: {
          ...input,
          tenantId: ctx.tenantId,
          vertragStatus: "ENTWURF",
        },
      });

      // Determine Einheit status based on move-in date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const einzug = new Date(input.einzugsdatum);
      einzug.setHours(0, 0, 0, 0);

      const einheitStatus = einzug <= today ? "VERMIETET" : "RESERVIERT";

      await ctx.db.einheit.update({
        where: { id: input.einheitId },
        data: { status: einheitStatus },
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "MIETVERHAELTNIS_ERSTELLT",
        entitaet: "Mietverhaeltnis",
        entitaetId: mietverhaeltnis.id,
        neuWert: mietverhaeltnis,
      });

      return mietverhaeltnis;
    }),

  kuendigung: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        auszugsdatum: z.date(),
        kuendigungsgrund: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Find the Mietverhaeltnis
      const mietverhaeltnis = await ctx.db.mietverhaeltnis.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
      });

      // 2. Validate it exists and belongs to tenant
      if (!mietverhaeltnis) {
        throw new Error("Mietverhältnis nicht gefunden");
      }

      // 3. Update Mietverhaeltnis: set auszugsdatum, vertragStatus = "GEKUENDIGT"
      const updated = await ctx.db.mietverhaeltnis.update({
        where: { id: input.id },
        data: {
          auszugsdatum: input.auszugsdatum,
          vertragStatus: "GEKUENDIGT" as any, // Added to VertragStatus enum in schema.prisma - run prisma generate
          notizen: input.kuendigungsgrund
            ? `${mietverhaeltnis.notizen ? mietverhaeltnis.notizen + "\n" : ""}Kündigungsgrund: ${input.kuendigungsgrund}`
            : mietverhaeltnis.notizen,
        },
      });

      // 4. Update Einheit status to "KUENDIGUNG"
      await ctx.db.einheit.update({
        where: { id: mietverhaeltnis.einheitId },
        data: { status: "KUENDIGUNG" },
      });

      // 5. Log audit
      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        aktion: "MIETVERHAELTNIS_GEKUENDIGT",
        entitaet: "Mietverhaeltnis",
        entitaetId: updated.id,
        altWert: mietverhaeltnis,
        neuWert: updated,
      });

      // 6. Return updated Mietverhaeltnis
      return updated;
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    const vertraege = await ctx.db.mietverhaeltnis.findMany({
      where: { tenantId },
    });

    const gesamt = vertraege.length;
    const aktiv = vertraege.filter(
      (v) => v.vertragStatus === "AKTIV" && !v.auszugsdatum
    ).length;

    const gesamtWarmmiete = vertraege
      .filter((v) => !v.auszugsdatum)
      .reduce(
        (sum, v) =>
          sum
            .plus(v.kaltmiete.toString())
            .plus(v.bkVorauszahlung.toString())
            .plus(v.hkVorauszahlung.toString()),
        new Decimal(0)
      )
      .toFixed(2);

    const durchschnittWarmmiete =
      vertraege.filter((v) => !v.auszugsdatum).length > 0
        ? new Decimal(gesamtWarmmiete)
            .div(vertraege.filter((v) => !v.auszugsdatum).length)
            .toFixed(2)
        : "0.00";

    return {
      gesamt,
      aktiv,
      gesamtWarmmiete,
      durchschnittWarmmiete,
    };
  }),
});
