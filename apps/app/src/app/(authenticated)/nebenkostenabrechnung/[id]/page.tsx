"use client";

import { trpc } from "@/lib/trpc/client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const STATUS_LABELS: Record<string, string> = {
  ENTWURF: "Entwurf", BERECHNET: "Berechnet", FREIGEGEBEN: "Freigegeben", VERSENDET: "Versendet", ABGESCHLOSSEN: "Abgeschlossen",
};

export default function NKADetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<"positionen" | "mieter">("positionen");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: nka, isLoading, refetch } = trpc.nebenkostenabrechnung.getById.useQuery({ id });
  const berechnenMutation = trpc.nebenkostenabrechnung.berechnen.useMutation({
    onSuccess: (r) => { refetch(); setSuccessMsg(`Berechnung abgeschlossen: ${r.positionen} Positionen, ${r.mieterpositionen} Mieterpositionen, Gesamt: ${parseFloat(r.gesamtkosten).toFixed(2)} €`); },
    onError: (err) => setErrorMsg(err.message),
  });
  const freigebenMutation = trpc.nebenkostenabrechnung.freigeben.useMutation({
    onSuccess: () => { refetch(); setSuccessMsg("Abrechnung freigegeben"); },
    onError: (err) => setErrorMsg(err.message),
  });
  const deleteMutation = trpc.nebenkostenabrechnung.delete.useMutation({
    onSuccess: () => router.push("/nebenkostenabrechnung"),
  });

  if (isLoading) return <div className="p-8">Laden...</div>;
  if (!nka) return <div className="p-8">Nicht gefunden</div>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            NK-Abrechnung {nka.abrechnungsjahr} — {nka.objekt?.bezeichnung}
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            {new Date(nka.vonDatum).toLocaleDateString("de-DE")} – {new Date(nka.bisDatum).toLocaleDateString("de-DE")}
          </p>
        </div>
        <div className="flex gap-2">
          {nka.status === "ENTWURF" || nka.status === "BERECHNET" ? (
            <button onClick={() => berechnenMutation.mutate({ id })} disabled={berechnenMutation.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {berechnenMutation.isPending ? "Berechne..." : "Berechnen"}
            </button>
          ) : null}
          {nka.status === "BERECHNET" && (
            <button onClick={() => freigebenMutation.mutate({ id })} disabled={freigebenMutation.isPending}
              className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50">
              Freigeben
            </button>
          )}
          {nka.status === "ENTWURF" && (
            <button onClick={() => confirm("Löschen?") && deleteMutation.mutate({ id })}
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-400 hover:bg-red-50">
              Löschen
            </button>
          )}
        </div>
      </div>

      {successMsg && <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{successMsg}</div>}
      {errorMsg && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMsg}</div>}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="text-sm text-[var(--text-secondary)]">Status</div>
          <div className="mt-1 font-semibold">{STATUS_LABELS[nka.status] || nka.status}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="text-sm text-[var(--text-secondary)]">Gesamtkosten</div>
          <div className="mt-1 font-semibold">{nka.gesamtkosten ? `${parseFloat(nka.gesamtkosten.toString()).toFixed(2)} €` : "—"}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="text-sm text-[var(--text-secondary)]">Kostenpositionen</div>
          <div className="mt-1 font-semibold">{nka.positionen?.length || 0}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="text-sm text-[var(--text-secondary)]">Mieterpositionen</div>
          <div className="mt-1 font-semibold">{nka.mieterpositionen?.length || 0}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button onClick={() => setActiveTab("positionen")} className={`rounded px-4 py-2 text-sm font-medium ${activeTab === "positionen" ? "bg-blue-600 text-white" : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"}`}>
          Kostenpositionen ({nka.positionen?.length || 0})
        </button>
        <button onClick={() => setActiveTab("mieter")} className={`rounded px-4 py-2 text-sm font-medium ${activeTab === "mieter" ? "bg-blue-600 text-white" : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"}`}>
          Mieterpositionen ({nka.mieterpositionen?.length || 0})
        </button>
      </div>

      {activeTab === "positionen" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          {!nka.positionen?.length ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">Noch keine Positionen. Klicken Sie auf &bdquo;Berechnen&ldquo;.</div>
          ) : (
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--bg-page)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Kostenart</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Umlageschlüssel</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Betrag gesamt</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">BK</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">HK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {nka.positionen.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--bg-card-hover)]">
                    <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{p.kostenartBezeichnung}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{p.umlageschluessel}</td>
                    <td className="px-6 py-4 text-right font-medium">{parseFloat(p.betragGesamt.toString()).toFixed(2)} €</td>
                    <td className="px-6 py-4 text-center">{p.bkRelevant ? "✓" : ""}</td>
                    <td className="px-6 py-4 text-center">{p.hkRelevant ? "✓" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "mieter" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          {!nka.mieterpositionen?.length ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">Noch keine Mieterpositionen. Klicken Sie auf &bdquo;Berechnen&ldquo;.</div>
          ) : (
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--bg-page)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Mieter</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Einheit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Vorauszahlung</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Ist-Kosten</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Differenz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {nka.mieterpositionen.map((mp) => {
                  const diff = parseFloat(mp.differenz.toString());
                  return (
                    <tr key={mp.id} className="hover:bg-[var(--bg-card-hover)]">
                      <td className="px-6 py-4 font-medium text-[var(--text-primary)]">
                        {mp.mietverhaeltnis?.mieter?.nachname}, {mp.mietverhaeltnis?.mieter?.vorname}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{mp.mietverhaeltnis?.einheit?.einheitNr}</td>
                      <td className="px-6 py-4 text-right text-sm">{parseFloat(mp.vorauszahlungGesamt.toString()).toFixed(2)} €</td>
                      <td className="px-6 py-4 text-right text-sm">{parseFloat(mp.istKostenGesamt.toString()).toFixed(2)} €</td>
                      <td className={`px-6 py-4 text-right font-semibold ${diff < 0 ? "text-green-400" : diff > 0 ? "text-red-400" : "text-[var(--text-primary)]"}`}>
                        {diff > 0 ? "+" : ""}{diff.toFixed(2)} €
                        <div className="text-xs font-normal text-[var(--text-secondary)]">{diff < 0 ? "Guthaben" : diff > 0 ? "Nachforderung" : "Ausgeglichen"}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
