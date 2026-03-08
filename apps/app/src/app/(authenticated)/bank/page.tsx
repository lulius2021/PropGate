"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import Link from "next/link";
import { PlanLimitReached } from "@/components/ui/PlanLimitReached";

export default function BankPage() {
  const [statusFilter, setStatusFilter] = useState<
    | "UNKLAR"
    | "ZUGEORDNET"
    | "TEILWEISE_ZUGEORDNET"
    | "IGNORIERT"
    | "SPLITTET"
    | undefined
  >("UNKLAR");

  const { data: zahlungen, isLoading, refetch, error } =
    trpc.bank.listZahlungen.useQuery({ status: statusFilter });

  const autoMatchMutation = trpc.bank.autoMatchAlle.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const ignorierenMutation = trpc.bank.ignorieren.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Plan-Gate: Feature nicht verfügbar
  if (error?.data?.code === "FORBIDDEN") {
    return (
      <div className="mx-auto max-w-lg mt-12">
        <PlanLimitReached
          feature="bankImport"
          message={error.message}
        />
      </div>
    );
  }

  if (isLoading) {
    return <div>Laden...</div>;
  }

  const unklareZahlungen =
    zahlungen?.filter((z: { status: string }) => z.status === "UNKLAR") || [];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Bankimport</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Zahlungen importieren und zuordnen
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => autoMatchMutation.mutate()}
            disabled={autoMatchMutation.isPending}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {autoMatchMutation.isPending ? "Matching..." : "Auto-Match"}
          </button>
          <Link
            href="/bank/import"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            CSV importieren
          </Link>
        </div>
      </div>

      {/* Unklar Badge */}
      {unklareZahlungen.length > 0 && (
        <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-orange-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">
                {unklareZahlungen.length} unklare Zahlung(en)
              </h3>
              <div className="mt-1 text-sm text-orange-700">
                Bitte ordnen Sie die Zahlungen manuell zu oder verwenden Sie
                Auto-Match.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setStatusFilter("UNKLAR")}
          className={`rounded px-3 py-1 text-sm ${
            statusFilter === "UNKLAR"
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Unklar ({zahlungen?.filter((z: { status: string }) => z.status === "UNKLAR").length || 0})
        </button>
        <button
          onClick={() => setStatusFilter("ZUGEORDNET")}
          className={`rounded px-3 py-1 text-sm ${
            statusFilter === "ZUGEORDNET"
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Zugeordnet
        </button>
        <button
          onClick={() => setStatusFilter("TEILWEISE_ZUGEORDNET")}
          className={`rounded px-3 py-1 text-sm ${
            statusFilter === "TEILWEISE_ZUGEORDNET"
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Teilweise
        </button>
        <button
          onClick={() => setStatusFilter(undefined)}
          className={`rounded px-3 py-1 text-sm ${
            !statusFilter
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Alle
        </button>
      </div>

      {/* Tabelle */}
      {zahlungen && zahlungen.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-page)] p-12 text-center">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            Keine Zahlungen vorhanden
          </h3>
          <p className="mt-2 text-[var(--text-secondary)]">
            Importieren Sie Ihre erste CSV-Datei.
          </p>
          <Link
            href="/bank/import"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            CSV importieren
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-page)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Verwendungszweck
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Betrag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              {zahlungen?.map((zahlung) => (
                <tr key={zahlung.id} className="hover:bg-[var(--bg-card-hover)]">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {new Date(zahlung.datum).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                    <div className="max-w-md truncate">
                      {zahlung.verwendungszweck}
                    </div>
                    {zahlung.iban && (
                      <div className="text-xs text-[var(--text-secondary)]">{zahlung.iban}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-[var(--text-primary)]">
                    {zahlung.betrag} €
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        zahlung.status === "UNKLAR"
                          ? "bg-orange-500/15 text-orange-400"
                          : zahlung.status === "ZUGEORDNET"
                            ? "bg-green-500/15 text-green-400"
                            : zahlung.status === "TEILWEISE_ZUGEORDNET"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {zahlung.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    {zahlung.status === "UNKLAR" && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            ignorierenMutation.mutate({ zahlungId: zahlung.id })
                          }
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          Ignorieren
                        </button>
                        <button className="text-blue-400 hover:text-blue-300">
                          Zuordnen
                        </button>
                      </div>
                    )}
                    {zahlung.zuordnungen.length > 0 && (
                      <div className="text-xs text-[var(--text-secondary)]">
                        {zahlung.zuordnungen.length} Zuordnung(en)
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
