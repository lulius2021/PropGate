import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  type PlanFeature,
  type PlanName,
  PLAN_LIMITS,
  FEATURE_LABELS,
  getUpgradePlan,
} from "@/lib/plan-config";

/**
 * Create context for tRPC requests
 * Includes session, database, and tenant information
 */
export async function createTRPCContext() {
  const session = await auth();

  return {
    db,
    session,
    tenantId: (session?.user as { tenantId?: string } | undefined)?.tenantId || null,
    userId: (session?.user as { id?: string } | undefined)?.id || null,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async function isAuthed(opts) {
  const { ctx } = opts;

  if (!ctx.session || !ctx.tenantId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Lade Tenant-Plan für alle geschützten Procedures
  const tenant = await ctx.db.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { plan: true },
  });

  return opts.next({
    ctx: {
      ...ctx,
      session: ctx.session,
      tenantId: ctx.tenantId,
      userId: ctx.userId!,
      plan: (tenant?.plan || "starter") as PlanName,
    },
  });
});

/**
 * Erstellt eine Feature-gated Procedure.
 * Wirft FORBIDDEN wenn der Tenant-Plan das Feature nicht enthält.
 */
export function createPlanGatedProcedure(requiredFeature: PlanFeature) {
  return protectedProcedure.use(async function checkPlanFeature(opts) {
    const { ctx } = opts;
    const planLimits = PLAN_LIMITS[ctx.plan];

    if (!planLimits || !planLimits.features.includes(requiredFeature)) {
      const upgradePlan = getUpgradePlan(ctx.plan);
      const featureLabel = FEATURE_LABELS[requiredFeature];
      const upgradeLabel = upgradePlan ? PLAN_LIMITS[upgradePlan].label : "einem höheren Plan";

      throw new TRPCError({
        code: "FORBIDDEN",
        message: `${featureLabel} ist in Ihrem aktuellen Plan (${planLimits?.label || ctx.plan}) nicht verfügbar. Upgraden Sie auf ${upgradeLabel}, um diese Funktion zu nutzen.`,
      });
    }

    return opts.next({ ctx });
  });
}

/**
 * Prüft ob das Objekt-Limit des Plans erreicht ist.
 * Wirft FORBIDDEN wenn max erreicht.
 */
export async function checkObjektLimit(ctx: {
  db: typeof db;
  tenantId: string;
  plan: PlanName;
}) {
  const planLimits = PLAN_LIMITS[ctx.plan];
  if (!planLimits) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Ungültiger Plan." });
  }

  if (planLimits.maxObjekte === Infinity) return;

  const currentCount = await ctx.db.objekt.count({
    where: { tenantId: ctx.tenantId },
  });

  if (currentCount >= planLimits.maxObjekte) {
    const upgradePlan = getUpgradePlan(ctx.plan);
    const upgradeLabel = upgradePlan ? PLAN_LIMITS[upgradePlan].label : "einem höheren Plan";

    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Sie haben das Maximum von ${planLimits.maxObjekte} Objekten erreicht. Upgraden Sie auf ${upgradeLabel} für unbegrenzte Objekte.`,
    });
  }
}

/**
 * Admin-only procedure - requires ADMIN role
 */
export const adminProcedure = protectedProcedure.use(async function isAdmin(opts) {
  const { ctx } = opts;
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.userId },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Nur Administratoren können diese Aktion ausführen.",
    });
  }

  return opts.next({ ctx: { ...ctx, role: user.role } });
});

/**
 * Write procedure - requires ADMIN or SACHBEARBEITER role (not READONLY)
 */
export const writeProcedure = protectedProcedure.use(async function canWrite(opts) {
  const { ctx } = opts;
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.userId },
    select: { role: true },
  });

  if (!user || user.role === "READONLY") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sie haben keine Berechtigung für diese Aktion.",
    });
  }

  return opts.next({ ctx: { ...ctx, role: user.role } });
});

export const router = t.router;
export const middleware = t.middleware;
