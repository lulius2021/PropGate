import { db } from "@/lib/db";

/**
 * Audit Log Service
 * Logs all create/update/delete operations for auditing
 */
export async function logAudit({
  tenantId,
  userId,
  aktion,
  entitaet,
  entitaetId,
  altWert,
  neuWert,
}: {
  tenantId: string;
  userId?: string;
  aktion: string;
  entitaet: string;
  entitaetId: string;
  altWert?: unknown;
  neuWert?: unknown;
}) {
  try {
    await db.auditLog.create({
      data: {
        tenantId,
        userId,
        aktion,
        entitaet,
        entitaetId,
        altWert: altWert ? JSON.stringify(altWert) : null,
        neuWert: neuWert ? JSON.stringify(neuWert) : null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main operation
  }
}
