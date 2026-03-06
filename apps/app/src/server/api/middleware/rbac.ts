/**
 * Role-Based Access Control middleware for REST API
 *
 * ADMIN = all operations
 * SACHBEARBEITER = read + write + delete
 * READONLY = read only
 */

import { ApiError } from "../lib/response";
import type { ApiContext } from "./auth";

export type Permission = "read" | "write" | "delete" | "admin";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: ["read", "write", "delete", "admin"],
  SACHBEARBEITER: ["read", "write", "delete"],
  READONLY: ["read"],
};

/**
 * Check if user has required permission
 */
export function checkPermission(
  ctx: ApiContext,
  permission: Permission
): void {
  const userPermissions = ROLE_PERMISSIONS[ctx.role] || [];

  if (!userPermissions.includes(permission)) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      `Keine Berechtigung für diese Aktion (erfordert: ${permission})`
    );
  }
}

/**
 * Derive required permission from HTTP method
 */
export function permissionFromMethod(method: string): Permission {
  switch (method) {
    case "GET":
    case "HEAD":
      return "read";
    case "POST":
    case "PUT":
    case "PATCH":
      return "write";
    case "DELETE":
      return "delete";
    default:
      return "read";
  }
}
