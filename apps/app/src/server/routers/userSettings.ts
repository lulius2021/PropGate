import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";

export const userSettingsRouter = router({
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    return ctx.db.userSettings.findUnique({
      where: { userId },
    });
  }),

  completeOnboarding: protectedProcedure
    .input(
      z.object({
        themeMode: z.string(),
        accentColor: z.string(),
        dashboardVorlage: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      return ctx.db.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          hasCompletedOnboarding: true,
          themeMode: input.themeMode,
          accentColor: input.accentColor,
          dashboardVorlage: input.dashboardVorlage,
        },
        update: {
          hasCompletedOnboarding: true,
          themeMode: input.themeMode,
          accentColor: input.accentColor,
          dashboardVorlage: input.dashboardVorlage,
        },
      });
    }),

  updateAutoMahnung: adminProcedure
    .input(
      z.object({
        autoMahnungAktiv: z.boolean(),
        autoMahnungTageNachFaelligkeit: z.number().int().min(1).max(60),
        autoMahnungEmailAktiv: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tenant.update({
        where: { id: ctx.tenantId },
        data: {
          autoMahnungAktiv: input.autoMahnungAktiv,
          autoMahnungTageNachFaelligkeit: input.autoMahnungTageNachFaelligkeit,
          autoMahnungEmailAktiv: input.autoMahnungEmailAktiv,
        },
      });
    }),

  getAutoMahnungSettings: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        autoMahnungAktiv: true,
        autoMahnungTageNachFaelligkeit: true,
        autoMahnungEmailAktiv: true,
      },
    });
  }),
});
