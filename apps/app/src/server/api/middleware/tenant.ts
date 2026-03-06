/**
 * Tenant isolation middleware for REST API
 *
 * Validates that the X-Tenant-Id header matches
 * the user's tenant from the JWT token.
 */

import { ApiError } from "../lib/response";
import type { ApiContext } from "./auth";

/**
 * Validate tenant header against user's token tenantId
 */
export function validateTenant(
  request: Request,
  ctx: ApiContext
): string {
  const headerTenantId = request.headers.get("x-tenant-id");

  // If no header provided, use token's tenantId
  if (!headerTenantId) {
    return ctx.tenantId;
  }

  // If header provided, it must match token
  if (headerTenantId !== ctx.tenantId) {
    throw new ApiError(
      403,
      "TENANT_MISMATCH",
      "Tenant-ID stimmt nicht mit der Berechtigung überein"
    );
  }

  return ctx.tenantId;
}
