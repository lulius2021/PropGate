"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type FilterZahlungsstatus =
  | "alle"
  | "OFFEN"
  | "TEILBEZAHLT"
  | "BEZAHLT"
  | "UEBERFAELLIG";

export default function KostenPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [jahr, setJahr] = useState(currentYear);
  const [filterTyp, setFilterTyp] = useState<"alle" | "bk" | "hk">("alle");
  const [filterZahlungsstatus, setFilterZahlungsstatus] =
    useState<FilterZahlungsstatus>("alle");

  const { data: kosten, isLoading } = trpc.kosten.listKosten.useQuery({
    jahr,
    bkRelevant: filterTyp === "bk" ? true : undefined,
    hkRelevant: filterTyp === "hk" ? true : undefined,
    zahlungsstatus:
      filterZahlungsstatus === "alle" ? undefined : filterZahlungsstatus,
  });

  const { data: stats } = trpc.kosten.statsKosten.useQuery({ jahr });

  if (isLoading) {
    return <div>Laden...</div>;
  }

  const getZahlungsstatusBadge = (kosten: { ueberfaellig?: boolean; zahlungsstatus: string }) => {
    if (kosten.ueberfaellig) {
      return (
        <Badge variant="destructive" className="text-xs">
          Überfällig
        </Badge>
      );
    }
    switch (kosten.zahlungsstatus) {
      case "BEZAHLT":
        return (
          <Badge className="bg-green-500/15 text-green-400 text-xs">Bezahlt</Badge>
        );
      case "TEILBEZAHLT":
        return (
          <Badge className="bg-yellow-500/15 text-yellow-400 text-xs">
            Teilbezahlt
          </Badge>
        );
      case "OFFEN":
        return (
          <Badge className="bg-orange-500/15 text-orange-400 text-xs">Offen</Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Kosten</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Erfassung und Verwaltung von Betriebskosten
          </p>
        </div>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          + Kosten erfassen
        </button>
      </div>

      {/* Statistiken */}
      {stats && (
        <div className="mb-6 grid grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-sm text-[var(--text-secondary)]">Gesamt ({jahr})</div>
            <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
              {stats.gesamt.summe.toFixed(2)} €
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {stats.gesamt.anzahl} Posten
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-[var(--text-secondary)]">Offen</div>
            <div className="mt-1 text-2xl font-bold text-orange-400">
              {stats.offen.summe.toFixed(2)} €
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {stats.offen.anzahl} Posten
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-[var(--text-secondary)]">Überfällig</div>
            <div className="mt-1 text-2xl font-bold text-red-400">
              {stats.ueberfaellig.summe.toFixed(2)} €
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {stats.ueberfaellig.anzahl} Posten
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-[var(--text-secondary)]">BK-relevant</div>
            <div className="mt-1 text-2xl font-bold text-blue-400">
              {stats.bk.toFixed(2)} €
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-[var(--text-secondary)]">HK-relevant</div>
            <div className="mt-1 text-2xl font-bold text-orange-400">
              {stats.hk.toFixed(2)} €
            </div>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex items-center gap-4">
        {/* Zahlungsstatus Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterZahlungsstatus("alle")}
            className={`rounded px-3 py-1 text-sm ${
              filterZahlungsstatus === "alle"
                ? "bg-blue-600 text-white"
                : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilterZahlungsstatus("OFFEN")}
            className={`rounded px-3 py-1 text-sm ${
              filterZahlungsstatus === "OFFEN"
                ? "bg-blue-600 text-white"
                : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            Offen
          </button>
          <button
            onClick={() => setFilterZahlungsstatus("UEBERFAELLIG")}
            className={`rounded px-3 py-1 text-sm ${
              filterZahlungsstatus === "UEBERFAELLIG"
                ? "bg-blue-600 text-white"
                : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            Überfällig
          </button>
          <button
            onClick={() => setFilterZahlungsstatus("BEZAHLT")}
            className={`rounded px-3 py-1 text-sm ${
              filterZahlungsstatus === "BEZAHLT"
                ? "bg-blue-600 text-white"
                : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            Bezahlt
          </button>
        </div>

        {/* Relevanz Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterTyp("alle")}
            className={`rounded px-3 py-1 text-sm ${
              filterTyp === "alle"
                ? "bg-blue-600 text-white"
                : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilterTyp("bk")}
            className={`rounded px-3 py-1 text-sm ${
              filterTyp === "bk"
                ? "bg-blue-600 text-white"
                : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            BK
          </button>
          <button
            onClick={() => setFilterTyp("hk")}
            className={`rounded px-3 py-1 text-sm ${
              filterTyp === "hk"
                ? "bg-blue-600 text-white"
                : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            HK
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--text-secondary)]">Jahr:</label>
          <select
            value={jahr}
            onChange={(e) => setJahr(Number(e.target.value))}
            className="rounded border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-sm text-[var(--text-primary)]"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabelle */}
      {kosten && kosten.length === 0 ? (
        <Card className="border-dashed border-[var(--border)] bg-[var(--bg-page)] p-12 text-center">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            Keine Kosten erfasst
          </h3>
          <p className="mt-2 text-[var(--text-secondary)]">
            Erfassen Sie die ersten Betriebskosten für {jahr}.
          </p>
          <button className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Kosten erfassen
          </button>
        </Card>
      ) : (
        <Card>
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-page)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Lieferant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Kategorie
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Betrag
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Offen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Fällig
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Relevanz
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              {kosten?.map((kost) => (
                <tr
                  key={kost.id}
                  className="cursor-pointer hover:bg-[var(--bg-card-hover)]"
                  onClick={() => router.push(`/kosten/${kost.id}`)}
                >
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {new Date(kost.datum).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-[var(--text-primary)]">
                      {kost.lieferant}
                    </div>
                    {kost.rechnungsnummer && (
                      <div className="text-xs text-[var(--text-secondary)]">
                        RE: {kost.rechnungsnummer}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {kost.kategorie}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-[var(--text-primary)]">
                    {parseFloat(kost.betragBrutto).toFixed(2)} €
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-orange-400">
                    {kost.restbetrag > 0 ? `${kost.restbetrag.toFixed(2)} €` : "-"}
                  </td>
                  <td className="px-6 py-4">{getZahlungsstatusBadge(kost)}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {kost.faelligkeitsdatum
                      ? new Date(kost.faelligkeitsdatum).toLocaleDateString(
                          "de-DE"
                        )
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {kost.bkRelevant && (
                        <Badge className="bg-blue-500/15 text-blue-400 text-xs">
                          BK
                        </Badge>
                      )}
                      {kost.hkRelevant && (
                        <Badge className="bg-orange-500/15 text-orange-400 text-xs">
                          HK
                        </Badge>
                      )}
                      {!kost.bkRelevant && !kost.hkRelevant && (
                        <span className="text-xs text-[var(--text-muted)]">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
