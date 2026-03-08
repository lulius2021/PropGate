"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface Einheit {
  id: string;
  einheitNr: string;
  typ: "WOHNUNG" | "GEWERBE" | "STELLPLATZ" | "LAGER";
  flaeche: string;
  zimmer?: number | null;
  lage?: string | null;
  eurProQm?: string | null;
  ausstattung?: string | null;
}

interface EinheitBearbeitenModalProps {
  isOpen: boolean;
  einheit: Einheit | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EinheitBearbeitenModal({
  isOpen,
  einheit,
  onClose,
  onSuccess,
}: EinheitBearbeitenModalProps) {
  const deriveFormData = (e: Einheit | null) => ({
    einheitNr: e?.einheitNr ?? "",
    typ: (e?.typ ?? "WOHNUNG") as "WOHNUNG" | "GEWERBE" | "STELLPLATZ" | "LAGER",
    flaeche: e?.flaeche ?? "",
    zimmer: e?.zimmer?.toString() ?? "",
    lage: e?.lage ?? "",
    eurProQm: e?.eurProQm ?? "",
    ausstattung: e?.ausstattung ?? "",
  });

  const [prevEinheitId, setPrevEinheitId] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => deriveFormData(einheit));

  if (einheit && einheit.id !== prevEinheitId) {
    setPrevEinheitId(einheit.id);
    setFormData(deriveFormData(einheit));
  }

  const utils = trpc.useUtils();

  const updateMutation = trpc.einheiten.update.useMutation({
    onSuccess: () => {
      utils.einheiten.list.invalidate();
      utils.einheiten.stats.invalidate();
      onSuccess();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!einheit) return;
    updateMutation.mutate({
      id: einheit.id,
      einheitNr: formData.einheitNr,
      typ: formData.typ,
      flaeche: parseFloat(formData.flaeche),
      zimmer: formData.zimmer ? parseInt(formData.zimmer) : null,
      lage: formData.lage || null,
      eurProQm: formData.eurProQm ? parseFloat(formData.eurProQm) : null,
      ausstattung: formData.ausstattung || null,
    });
  };

  if (!isOpen || !einheit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-20 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-card)] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Einheit bearbeiten
            </h2>
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
          <div className="grid grid-cols-2 gap-4">
            {/* Einheit-Nr */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Einheit-Nr. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.einheitNr}
                onChange={(e) => setFormData({ ...formData, einheitNr: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
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
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="WOHNUNG">Wohnung</option>
                <option value="GEWERBE">Gewerbe</option>
                <option value="STELLPLATZ">Stellplatz</option>
                <option value="LAGER">Lager</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Fläche */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Fläche (m²) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={formData.flaeche}
                onChange={(e) => setFormData({ ...formData, flaeche: e.target.value })}
                onFocus={(e) => e.target.select()}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Zimmer */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Zimmer
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={formData.zimmer}
                onChange={(e) => setFormData({ ...formData, zimmer: e.target.value })}
                onFocus={(e) => e.target.select()}
                placeholder="optional"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Lage */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Lage
              </label>
              <input
                type="text"
                value={formData.lage}
                onChange={(e) => setFormData({ ...formData, lage: e.target.value })}
                placeholder="z.B. 1. OG links, EG rechts"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* €/m² */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Kaltmiete €/m²
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.eurProQm}
                onChange={(e) => setFormData({ ...formData, eurProQm: e.target.value })}
                onFocus={(e) => e.target.select()}
                placeholder="optional"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Ausstattung */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Ausstattung / Notizen
            </label>
            <textarea
              value={formData.ausstattung}
              onChange={(e) => setFormData({ ...formData, ausstattung: e.target.value })}
              rows={3}
              placeholder="z.B. Einbauküche, Balkon..."
              className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {updateMutation.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-800">
                Fehler: {updateMutation.error.message}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-page)] disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {updateMutation.isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Speichere...
                </>
              ) : (
                "Änderungen speichern"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
