"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import NeueSollstellungModal from "@/components/sollstellungen/NeueSollstellungModal";
import { DokumentUploadModal } from "@/components/dokumente/DokumentUploadModal";
import { toast } from "sonner";

export default function SollstellungenPage() {
  const [statusFilter, setStatusFilter] = useState<
    "OFFEN" | "TEILWEISE_BEZAHLT" | "BEZAHLT" | "STORNIERT" | undefined
  >();
  const [showModal, setShowModal] = useState(false);
  const [bezahltDialog, setBezahltDialog] = useState<{
    id: string;
    titel: string;
    zahlungsart: "UEBERWEISUNG" | "BARGELD" | "LASTSCHRIFT";
    zahlungsdatum: string;
  } | null>(null);
  const [editDialog, setEditDialog] = useState<{
    id: string;
    titel: string;
    betragGesamt: string;
    faelligkeitsdatum: string;
  } | null>(null);
  const [dokUploadSollId, setDokUploadSollId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: sollstellungen, isLoading } =
    trpc.sollstellungen.list.useQuery({ status: statusFilter });
  const { data: stats } = trpc.sollstellungen.stats.useQuery();

  const updateMutation = trpc.sollstellungen.update.useMutation({
    onSuccess: () => {
      setEditDialog(null);
      utils.sollstellungen.list.invalidate();
      utils.sollstellungen.stats.invalidate();
      toast.success("Sollstellung aktualisiert");
    },
    onError: (err) => toast.error("Fehler: " + err.message),
  });

  const manualBezahltMutation = trpc.sollstellungen.manualBezahlt.useMutation({
    onSuccess: () => {
      setBezahltDialog(null);
      utils.sollstellungen.list.invalidate();
      utils.sollstellungen.stats.invalidate();
      toast.success("Als bezahlt markiert");
    },
    onError: (err) => toast.error("Fehler: " + err.message),
  });

  if (isLoading) {
    return <div>Laden...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Sollstellungen</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Verwaltung aller Zahlungsforderungen
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + Neue Sollstellung
        </button>
      </div>

      {/* Statistiken */}
      {stats && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Offen</div>
            <div className="mt-1 text-2xl font-bold text-red-400">
              {stats.offen.summe.toFixed(2)} €
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {stats.offen.anzahl} Posten
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Teilweise bezahlt</div>
            <div className="mt-1 text-2xl font-bold text-orange-400">
              {(stats.teilweiseBezahlt.summe - stats.teilweiseBezahlt.gedeckt).toFixed(2)} €
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {stats.teilweiseBezahlt.anzahl} Posten
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Bezahlt (Monat)</div>
            <div className="mt-1 text-2xl font-bold text-green-400">
              {stats.bezahlt.summe.toFixed(2)} €
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {stats.bezahlt.anzahl} Posten
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex gap-2">
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
        <button
          onClick={() => setStatusFilter("OFFEN")}
          className={`rounded px-3 py-1 text-sm ${
            statusFilter === "OFFEN"
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Offen
        </button>
        <button
          onClick={() => setStatusFilter("TEILWEISE_BEZAHLT")}
          className={`rounded px-3 py-1 text-sm ${
            statusFilter === "TEILWEISE_BEZAHLT"
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Teilweise bezahlt
        </button>
        <button
          onClick={() => setStatusFilter("BEZAHLT")}
          className={`rounded px-3 py-1 text-sm ${
            statusFilter === "BEZAHLT"
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Bezahlt
        </button>
      </div>

      {/* Tabelle */}
      {sollstellungen && sollstellungen.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-page)] p-12 text-center">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            Keine Sollstellungen vorhanden
          </h3>
          <p className="mt-2 text-[var(--text-secondary)]">
            Erstellen Sie die erste Sollstellung oder generieren Sie Warmmieten
            automatisch.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-page)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Titel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Mieter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Typ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Fällig
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Betrag
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Gedeckt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Aktion
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              {sollstellungen?.map((soll) => (
                <tr key={soll.id} className="hover:bg-[var(--bg-card-hover)]">
                  <td className="px-6 py-4">
                    <div className="font-medium text-[var(--text-primary)]">{soll.titel}</div>
                    {soll.typ === "WARMMIETE" && (
                      <div className="text-xs text-[var(--text-secondary)]">
                        K: {soll.kaltmiete || '0.00'} € | BK:{" "}
                        {soll.bkVorauszahlung || '0.00'} € | HK:{" "}
                        {soll.hkVorauszahlung || '0.00'} €
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[var(--text-primary)]">
                      {soll.mietverhaeltnis?.einheit?.einheitNr || "–"} — {soll.mietverhaeltnis?.mieter.nachname || "-"}{soll.mietverhaeltnis?.mieter.vorname ? `, ${soll.mietverhaeltnis.mieter.vorname}` : ""}
                    </div>
                    {soll.mietverhaeltnis?.einheit && (
                      <div className="text-xs text-[var(--text-secondary)]">
                        {soll.mietverhaeltnis.einheit.objekt?.bezeichnung}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {soll.typ}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {new Date(soll.faelligkeitsdatum).toLocaleDateString(
                      "de-DE"
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-[var(--text-primary)]">
                    {soll.betragGesamt} €
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-green-400">
                    {soll.gedecktGesamt} €
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        soll.status === "OFFEN"
                          ? "bg-red-500/15 text-red-400"
                          : soll.status === "TEILWEISE_BEZAHLT"
                            ? "bg-orange-500/15 text-orange-400"
                            : soll.status === "BEZAHLT"
                              ? "bg-green-500/15 text-green-400"
                              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {soll.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDokUploadSollId(soll.id)}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-medium"
                        title="Dokument hochladen"
                      >
                        <svg className="h-3.5 w-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </button>
                      {soll.status === "OFFEN" && (
                        <button
                          onClick={() => setEditDialog({
                            id: soll.id,
                            titel: soll.titel,
                            betragGesamt: soll.betragGesamt,
                            faelligkeitsdatum: new Date(soll.faelligkeitsdatum).toISOString().split("T")[0],
                          })}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                        >
                          Bearbeiten
                        </button>
                      )}
                      {(soll.status === "OFFEN" || soll.status === "TEILWEISE_BEZAHLT") && (
                        <button
                          onClick={() => setBezahltDialog({
                            id: soll.id,
                            titel: soll.titel,
                            zahlungsart: "UEBERWEISUNG",
                            zahlungsdatum: new Date().toISOString().split("T")[0],
                          })}
                          className="text-xs text-green-400 hover:text-green-300 font-medium"
                        >
                          Als bezahlt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NeueSollstellungModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false);
          void utils.sollstellungen.list.invalidate();
          void utils.sollstellungen.stats.invalidate();
        }}
      />

      {/* Bearbeiten Dialog */}
      {editDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Sollstellung bearbeiten</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Titel</label>
                <input
                  type="text"
                  value={editDialog.titel}
                  onChange={(e) => setEditDialog({ ...editDialog, titel: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Betrag (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editDialog.betragGesamt}
                  onChange={(e) => setEditDialog({ ...editDialog, betragGesamt: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Fälligkeitsdatum</label>
                <input
                  type="date"
                  value={editDialog.faelligkeitsdatum}
                  onChange={(e) => setEditDialog({ ...editDialog, faelligkeitsdatum: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setEditDialog(null)}
                className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]"
              >
                Abbrechen
              </button>
              <button
                onClick={() => updateMutation.mutate({
                  id: editDialog.id,
                  titel: editDialog.titel,
                  betragGesamt: parseFloat(editDialog.betragGesamt),
                  faelligkeitsdatum: new Date(editDialog.faelligkeitsdatum),
                })}
                disabled={updateMutation.isPending}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? "..." : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dokument Upload */}
      <DokumentUploadModal
        open={dokUploadSollId !== null}
        onClose={() => setDokUploadSollId(null)}
        onSuccess={() => setDokUploadSollId(null)}
      />

      {/* Als bezahlt Dialog */}
      {bezahltDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Als bezahlt markieren</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">{bezahltDialog.titel}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Zahlungsart</label>
                <select
                  value={bezahltDialog.zahlungsart}
                  onChange={(e) => setBezahltDialog({ ...bezahltDialog, zahlungsart: e.target.value as "UEBERWEISUNG" | "BARGELD" | "LASTSCHRIFT" })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-3 py-2 text-sm"
                >
                  <option value="UEBERWEISUNG">Überweisung</option>
                  <option value="BARGELD">Bargeld</option>
                  <option value="LASTSCHRIFT">Lastschrift</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Zahlungsdatum</label>
                <input
                  type="date"
                  value={bezahltDialog.zahlungsdatum}
                  onChange={(e) => setBezahltDialog({ ...bezahltDialog, zahlungsdatum: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setBezahltDialog(null)}
                className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]"
              >
                Abbrechen
              </button>
              <button
                onClick={() => manualBezahltMutation.mutate({
                  id: bezahltDialog.id,
                  zahlungsart: bezahltDialog.zahlungsart,
                  zahlungsdatum: new Date(bezahltDialog.zahlungsdatum),
                })}
                disabled={manualBezahltMutation.isPending}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {manualBezahltMutation.isPending ? "..." : "Bestätigen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
