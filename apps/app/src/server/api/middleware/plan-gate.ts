/**
 * Plan feature gating middleware for REST API
 *
 * Reuses existing PLAN_LIMITS configuration.
 * REST API access is NOT plan-gated, but individual features still are.
 */

import {
  type PlanFeature,
  type PlanName,
  PLAN_LIMITS,
  FEATURE_LABELS,
  getUpgradePlan,
} from "@/lib/plan-config";
import { ApiError } from "../lib/response";

/**
 * Check if a tenant's plan includes the required feature
 */
export function checkPlanFeature(
  plan: string,
  requiredFeature: PlanFeature
): void {
  const planLimits = PLAN_LIMITS[plan as PlanName];

  if (!planLimits || !planLimits.features.includes(requiredFeature)) {
    const upgradePlan = getUpgradePlan(plan);
    const featureLabel = FEATURE_LABELS[requiredFeature];
    const upgradeLabel = upgradePlan
      ? PLAN_LIMITS[upgradePlan].label
      : "einem höheren Plan";

    throw new ApiError(
      403,
      "PLAN_LIMIT",
      `${featureLabel} ist in Ihrem aktuellen Plan nicht verfügbar. Upgraden Sie auf ${upgradeLabel}.`
    );
  }
}

/**
 * Get tenant plan from database
 */
export async function getTenantPlan(
  db: any,
  tenantId: string
): Promise<PlanName> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  return (tenant?.plan || "starter") as PlanName;
}
