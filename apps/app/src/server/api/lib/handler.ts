/**
 * REST API route handler wrapper
 *
 * Wires auth, tenant isolation, RBAC, plan-gating, and error handling.
 * Each route file exports GET/POST/PATCH/DELETE = createApiHandler(fn, options)
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authenticateRequest, type ApiContext } from "../middleware/auth";
import { validateTenant } from "../middleware/tenant";
import {
  checkPermission,
  permissionFromMethod,
  type Permission,
} from "../middleware/rbac";
import { checkPlanFeature, getTenantPlan } from "../middleware/plan-gate";
import { errorResponse } from "./response";
import type { PlanFeature, PlanName } from "@/lib/plan-config";

export interface HandlerContext extends ApiContext {
  tenantId: string;
  plan: PlanName;
  db: typeof db;
  params: Record<string, string>;
}

export interface HandlerOptions {
  /** Skip authentication (for login, register, etc.) */
  public?: boolean;
  /** Required plan feature (skipped for public routes) */
  requiredFeature?: PlanFeature;
  /** Override permission check (default: derived from HTTP method) */
  permission?: Permission;
}

type HandlerFn = (
  req: NextRequest,
  ctx: HandlerContext
) => Promise<Response>;

/**
 * Create an API route handler with middleware pipeline
 */
export function createApiHandler(
  handler: HandlerFn,
  options: HandlerOptions = {}
) {
  return async (
    req: NextRequest,
    { params: routeParams }: { params: Promise<Record<string, string>> }
  ) => {
    try {
      const resolvedParams = await routeParams;

      if (options.public) {
        // Public route — no auth required
        const ctx: HandlerContext = {
          userId: "",
          tenantId: "",
          role: "",
          twoFaVerified: false,
          plan: "starter" as PlanName,
          db,
          params: resolvedParams || {},
        };
        return await handler(req, ctx);
      }

      // 1. Authenticate
      const authCtx = await authenticateRequest(req);

      // 2. Validate tenant
      const tenantId = validateTenant(req, authCtx);

      // 3. Check RBAC
      const permission = options.permission || permissionFromMethod(req.method);
      checkPermission(authCtx, permission);

      // 4. Get tenant plan
      const plan = await getTenantPlan(db, tenantId);

      // 5. Check plan feature
      if (options.requiredFeature) {
        checkPlanFeature(plan, options.requiredFeature);
      }

      // 6. Build context and call handler
      const ctx: HandlerContext = {
        ...authCtx,
        tenantId,
        plan,
        db,
        params: resolvedParams || {},
      };

      return await handler(req, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
