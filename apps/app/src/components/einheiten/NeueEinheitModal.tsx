"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface NeueEinheitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Wenn von einer Objekt-Detailseite aufgerufen, kann objektId vorausgefüllt werden. */
  defaultObjektId?: string;
}

export function NeueEinheitModal({
  isOpen,
  onClose,
  onSuccess,
  defaultObjektId,
}: NeueEinheitModalProps) {
  const [formData, setFormData] = useState({
    objektId: defaultObjektId ?? "",
    einheitNr: "",
    typ: "WOHNUNG" as "WOHNUNG" | "GEWERBE" | "STELLPLATZ" | "LAGER",
    flaeche: "",
    zimmer: "",
    lage: "",
    ausstattung: "",
  });

  const { data: objekte } = trpc.objekte.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.einheiten.create.useMutation({
    onSuccess: () => {
      utils.einheiten.list.invalidate();
      utils.einheiten.stats.invalidate();
      setFormData({
        objektId: defaultObjektId ?? "",
        einheitNr: "",
        typ: "WOHNUNG",
        flaeche: "",
        zimmer: "",
        lage: "",
        ausstattung: "",
      });
      onSuccess();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      objektId: formData.objektId,
      einheitNr: formData.einheitNr,
      typ: formData.typ,
      flaeche: parseFloat(formData.flaeche),
      zimmer: formData.zimmer ? parseInt(formData.zimmer) : undefined,
      lage: formData.lage || undefined,
      ausstattung: formData.ausstattung || undefined,
    });
  };

  if (!isOpen) return null;

  const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-20 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-card)] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Neue Einheit erstellen</h2>
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
          {/* Objekt — nur anzeigen wenn kein defaultObjektId */}
          {defaultObjektId ? (
            <div className="rounded-lg bg-[var(--bg-page)] border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">
              Objekt: {objekte?.find((o) => o.id === defaultObjektId)?.bezeichnung ?? "Wird geladen..."}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Objekt <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.objektId}
                onChange={(e) => setFormData({ ...formData, objektId: e.target.value })}
                className={inputCls}
              >
                <option value="">Objekt wählen...</option>
                {objekte?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.bezeichnung}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                placeholder="z.B. W01 oder 1.OG links"
                className={inputCls}
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
                className={inputCls}
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
                onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setFormData((d) => ({ ...d, flaeche: v.toString() })); }}
                onFocus={(e) => e.target.select()}
                placeholder="z.B. 68.50"
                className={inputCls}
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
                onBlur={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) setFormData((d) => ({ ...d, zimmer: v.toString() })); }}
                onFocus={(e) => e.target.select()}
                placeholder="z.B. 3"
                className={inputCls}
              />
            </div>
          </div>

          {/* Lage */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Lage / Etage
            </label>
            <input
              type="text"
              value={formData.lage}
              onChange={(e) => setFormData({ ...formData, lage: e.target.value })}
              placeholder="z.B. 1. OG links, EG rechts"
              className={inputCls}
            />
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
              placeholder="z.B. Einbauküche, Balkon, Kellerabteil..."
              className={inputCls}
            />
          </div>

          {createMutation.error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-sm text-red-400">
                Fehler: {createMutation.error.message}
              </p>
            </div>
          )}

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
                "Einheit erstellen"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
