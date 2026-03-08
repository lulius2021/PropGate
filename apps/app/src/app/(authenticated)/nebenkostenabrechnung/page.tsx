"use client";

import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  ENTWURF: "Entwurf",
  BERECHNET: "Berechnet",
  FREIGEGEBEN: "Freigegeben",
  VERSENDET: "Versendet",
  ABGESCHLOSSEN: "Abgeschlossen",
};

const STATUS_COLORS: Record<string, string> = {
  ENTWURF: "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]",
  BERECHNET: "bg-blue-500/15 text-blue-400",
  FREIGEGEBEN: "bg-green-500/15 text-green-400",
  VERSENDET: "bg-purple-500/15 text-purple-400",
  ABGESCHLOSSEN: "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]",
};

export default function NebenkostenabrechnungPage() {
  const { data: nkAs, isLoading } = trpc.nebenkostenabrechnung.list.useQuery();

  if (isLoading) return <div className="p-8">Laden...</div>;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Nebenkostenabrechnung</h1>
          <p className="mt-2 text-[var(--text-secondary)]">Jahresabrechnungen für Ihre Objekte</p>
        </div>
        <Link href="/nebenkostenabrechnung/neu"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Neue Abrechnung
        </Link>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
        {!nkAs?.length ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-[var(--text-primary)]">Keine Abrechnungen</h3>
            <p className="mt-2 text-[var(--text-secondary)]">Erstellen Sie Ihre erste Nebenkostenabrechnung.</p>
            <Link href="/nebenkostenabrechnung/neu" className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              Jetzt erstellen
            </Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-page)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Objekt</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Jahr</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Zeitraum</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Gesamtkosten</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Positionen</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              {nkAs.map((nka) => (
                <tr key={nka.id} className="hover:bg-[var(--bg-card-hover)]">
                  <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{nka.objekt?.bezeichnung}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-primary)] font-semibold">{nka.abrechnungsjahr}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {new Date(nka.vonDatum).toLocaleDateString("de-DE")} – {new Date(nka.bisDatum).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-[var(--text-primary)]">
                    {nka.gesamtkosten ? `${parseFloat(String(nka.gesamtkosten)).toFixed(2)} €` : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${STATUS_COLORS[nka.status] || "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"}`}>
                      {STATUS_LABELS[nka.status] || nka.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {nka._count?.positionen || 0} Positionen, {nka._count?.mieterpositionen || 0} Mieter
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/nebenkostenabrechnung/${nka.id}`} className="text-sm font-medium text-blue-400 hover:text-blue-300">
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
