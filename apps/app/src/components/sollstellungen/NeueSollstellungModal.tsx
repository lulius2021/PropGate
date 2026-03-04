"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TYP_OPTIONS = [
  { value: "WARMMIETE", label: "Warmmiete" },
  { value: "KAUTION", label: "Kaution" },
  { value: "NEBENKOSTEN", label: "Nebenkosten" },
  { value: "SONSTIGE", label: "Sonstige" },
] as const;

export default function NeueSollstellungModal({ open, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    mietverhaeltnisId: "",
    typ: "WARMMIETE" as "WARMMIETE" | "KAUTION" | "NEBENKOSTEN" | "SONSTIGE",
    titel: "",
    betragGesamt: "",
    faelligkeitsdatum: "",
  });

  const { data: vertraege } = trpc.vertraege.list.useQuery(undefined, {
    enabled: open,
  });

  const createMutation = trpc.sollstellungen.create.useMutation({
    onSuccess: () => {
      setFormData({
        mietverhaeltnisId: "",
        typ: "WARMMIETE",
        titel: "",
        betragGesamt: "",
        faelligkeitsdatum: "",
      });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      mietverhaeltnisId: formData.mietverhaeltnisId || undefined,
      typ: formData.typ,
      titel: formData.titel,
      betragGesamt: parseFloat(formData.betragGesamt),
      faelligkeitsdatum: new Date(formData.faelligkeitsdatum),
    });
  };

  if (!open) return null;

  // Filter to active mietverhaeltnisse (no auszugsdatum)
  const aktiveMV = vertraege?.filter((v: any) => !v.auszugsdatum) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-20 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-card)] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Neue Sollstellung</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-secondary)]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Mietverhältnis */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Mietverhältnis
            </label>
            <select
              value={formData.mietverhaeltnisId}
              onChange={(e) => setFormData({ ...formData, mietverhaeltnisId: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Ohne Zuordnung</option>
              {aktiveMV.map((mv: any) => (
                <option key={mv.id} value={mv.id}>
                  {mv.vertragsnummer ?? mv.einheit.einheitNr} — {mv.mieter.nachname}{mv.mieter.vorname ? `, ${mv.mieter.vorname}` : ""}{mv.mieter.firma ? ` (${mv.mieter.firma})` : ""} — {mv.einheit.objekt?.bezeichnung}
                </option>
              ))}
            </select>
          </div>

          {/* Typ */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Typ <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.typ}
              onChange={(e) => setFormData({ ...formData, typ: e.target.value as typeof formData.typ })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TYP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Titel */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Titel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.titel}
              onChange={(e) => setFormData({ ...formData, titel: e.target.value })}
              placeholder="z.B. Warmmiete Februar 2026"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Betrag gesamt */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Betrag gesamt <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={formData.betragGesamt}
              onChange={(e) => setFormData({ ...formData, betragGesamt: e.target.value })}
              onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setFormData((d) => ({ ...d, betragGesamt: v.toString() })); }}
              placeholder="z.B. 850.00"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Fälligkeitsdatum */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Fälligkeitsdatum <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.faelligkeitsdatum}
              onChange={(e) => setFormData({ ...formData, faelligkeitsdatum: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Error */}
          {createMutation.error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-sm text-red-400">
                Fehler: {createMutation.error.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-page)] disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Erstelle...
                </>
              ) : (
                "Sollstellung erstellen"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
