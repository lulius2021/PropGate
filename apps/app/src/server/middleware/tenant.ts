import { Prisma } from "@prisma/client";

/**
 * Tenant Isolation Middleware
 * Automatically filters all queries by tenantId for multi-tenancy
 */
export function createTenantMiddleware(tenantId: string) {
  return Prisma.defineExtension((client) => {
    return client.$extends({
      name: "tenantIsolation",
      query: {
        $allModels: {
          async findFirst({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async findMany({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async findUnique({ args, query, model }) {
            // Only add tenantId if the model has the field
            const modelName = model;
            if (hasTenantIdField(modelName)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async findUniqueOrThrow({ args, query, model }) {
            const modelName = model;
            if (hasTenantIdField(modelName)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async create({ args, query, model }) {
            const modelName = model;
            if (hasTenantIdField(modelName)) {
              (args.data as Record<string, unknown>).tenantId = tenantId;
            }
            return query(args);
          },
          async createMany({ args, query, model }) {
            const modelName = model;
            if (hasTenantIdField(modelName)) {
              if (Array.isArray(args.data)) {
                args.data = args.data.map((item) => ({ ...item, tenantId })) as typeof args.data;
              } else {
                (args.data as Record<string, unknown>).tenantId = tenantId;
              }
            }
            return query(args);
          },
          async update({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async updateMany({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async delete({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async deleteMany({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async count({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async aggregate({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
        },
      },
    });
  });
}

function hasTenantIdField(modelName: string): boolean {
  // List of models that have tenantId field
  const modelsWithTenantId = [
    "Tenant",
    "User",
    "Objekt",
    "Einheit",
    "Mieter",
    "Mietverhaeltnis",
    "Dokument",
    "AuditLog",
    "EinheitStatusHistorie",
    "Sollstellung",
    "BankImportProfile",
    "Zahlung",
    "ZahlungZuordnung",
    "Mahnung",
    "Ticket",
    "TicketKommentar",
    "Kosten",
    "Zeiterfassung",
    "Zaehler",
    "Zaehlerstand",
    "Kredit",
  ];
  return modelsWithTenantId.includes(modelName);
}
