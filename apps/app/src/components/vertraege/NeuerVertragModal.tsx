"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { ErweiterterMieterModal } from "@/components/mieter/ErweiterterMieterModal";
import { DokumentUploadModal } from "@/components/dokumente/DokumentUploadModal";

interface NeuerVertragModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultEinheitId?: string;
}

export function NeuerVertragModal({ isOpen, onClose, onSuccess, defaultEinheitId }: NeuerVertragModalProps) {
  const [formData, setFormData] = useState({
    mieterId: "",
    einheitId: defaultEinheitId ?? "",
    einzugsdatum: "",
    kaltmiete: "",
    bkVorauszahlung: "",
    hkVorauszahlung: "",
    kaution: "",
    notizen: "",
    vertragsart: "UNBEFRISTET" as "UNBEFRISTET" | "BEFRISTET" | "UNTERMIETE" | "GEWERBE" | "STAFFELMIETE" | "INDEXMIETE",
    auszugsdatum: "",
  });
  const [showMieterModal, setShowMieterModal] = useState(false);
  const [showDokUpload, setShowDokUpload] = useState(false);

  const { data: mieter } = trpc.mieter.list.useQuery();
  const { data: einheiten } = trpc.einheiten.list.useQuery({});
  const utils = trpc.useUtils();

  const createMutation = trpc.vertraege.create.useMutation({
    onSuccess: () => {
      utils.vertraege.list.invalidate();
      utils.vertraege.stats.invalidate();
      utils.einheiten.list.invalidate();
      utils.einheiten.stats.invalidate();
      setFormData({
        mieterId: "",
        einheitId: "",
        einzugsdatum: "",
        kaltmiete: "",
        bkVorauszahlung: "",
        hkVorauszahlung: "",
        kaution: "",
        notizen: "",
        vertragsart: "UNBEFRISTET",
        auszugsdatum: "",
      });
      onSuccess();
      onClose();
    },
  });

  const getMieterLabel = (m: { vorname?: string | null; nachname: string; firma?: string | null; typ: string }) => {
    if ((m.typ === "GEWERBE" || m.typ === "GESCHAEFTLICH") && m.firma) return m.firma;
    return `${m.vorname ?? ""} ${m.nachname}`.trim();
  };

  // Only show available units (VERFUEGBAR or RESERVIERT) for new contracts
  const verfuegbareEinheiten = einheiten?.filter(
    (e) => e.status === "VERFUEGBAR" || e.status === "RESERVIERT"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      mieterId: formData.mieterId,
      einheitId: formData.einheitId,
      einzugsdatum: new Date(formData.einzugsdatum),
      kaltmiete: parseFloat(formData.kaltmiete),
      bkVorauszahlung: parseFloat(formData.bkVorauszahlung) || 0,
      hkVorauszahlung: parseFloat(formData.hkVorauszahlung) || 0,
      kaution: formData.kaution ? parseFloat(formData.kaution) : undefined,
      notizen: formData.notizen || undefined,
      vertragsart: formData.vertragsart,
      auszugsdatum: formData.auszugsdatum ? new Date(formData.auszugsdatum) : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-20 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-card)] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Neues Mietverhältnis</h2>
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
          {/* Mieter */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Mieter <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.mieterId}
              onChange={(e) => setFormData({ ...formData, mieterId: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Mieter wählen...</option>
              {mieter?.map((m) => (
                <option key={m.id} value={m.id}>
                  {getMieterLabel(m)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowMieterModal(true)}
              className="mt-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Oder: Neuen Mieter anlegen
            </button>
            {mieter?.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Keine Mieter vorhanden. Bitte zuerst unter &bdquo;Mieter&ldquo; einen Mieter anlegen.
              </p>
            )}
          </div>

          {/* Einheit */}
          {defaultEinheitId ? (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Einheit
              </label>
              <div className="rounded-lg bg-[var(--bg-page)] border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">
                Einheit: {einheiten?.find((e) => e.id === defaultEinheitId)?.einheitNr ?? "Wird geladen..."}
                {einheiten?.find((e) => e.id === defaultEinheitId)?.objekt?.bezeichnung &&
                  ` (${einheiten.find((e) => e.id === defaultEinheitId)?.objekt?.bezeichnung})`}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Einheit <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.einheitId}
                onChange={(e) => setFormData({ ...formData, einheitId: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Einheit wählen...</option>
                {verfuegbareEinheiten?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.objekt?.bezeichnung} — Einheit {e.einheitNr} ({e.flaeche} m²)
                  </option>
                ))}
              </select>
              {verfuegbareEinheiten?.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  Keine verfügbaren Einheiten. Alle Einheiten sind belegt oder nicht vorhanden.
                </p>
              )}
            </div>
          )}

          {/* Vertragsart + Einzugsdatum */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Vertragsart
              </label>
              <select
                value={formData.vertragsart}
                onChange={(e) => setFormData({ ...formData, vertragsart: e.target.value as typeof formData.vertragsart })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <optgroup label="Wohnmietvertrag">
                  <option value="UNBEFRISTET">Unbefristet</option>
                  <option value="BEFRISTET">Befristet</option>
                  <option value="STAFFELMIETE">Staffelmiete</option>
                  <option value="INDEXMIETE">Indexmiete</option>
                </optgroup>
                <optgroup label="Sonstige">
                  <option value="GEWERBE">Gewerbemietvertrag</option>
                  <option value="UNTERMIETE">Untermiete</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Einzugsdatum <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.einzugsdatum}
                onChange={(e) => setFormData({ ...formData, einzugsdatum: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Auszugsdatum (bei Befristet oder Gewerbe) */}
          {(formData.vertragsart === "BEFRISTET" || formData.vertragsart === "GEWERBE") && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Auszugsdatum <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.auszugsdatum}
                onChange={(e) => setFormData({ ...formData, auszugsdatum: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Miete */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Mietzahlungen</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Kaltmiete (€) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={formData.kaltmiete}
                  onChange={(e) => setFormData({ ...formData, kaltmiete: e.target.value })}
                  onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setFormData((d) => ({ ...d, kaltmiete: v.toString() })); }}
                  onFocus={(e) => e.target.select()}
                  placeholder="800.00"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  BK-Vorauszahlung (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.bkVorauszahlung}
                  onChange={(e) => setFormData({ ...formData, bkVorauszahlung: e.target.value })}
                  onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setFormData((d) => ({ ...d, bkVorauszahlung: v.toString() })); }}
                  onFocus={(e) => e.target.select()}
                  placeholder="150.00"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  HK-Vorauszahlung (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hkVorauszahlung}
                  onChange={(e) => setFormData({ ...formData, hkVorauszahlung: e.target.value })}
                  onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setFormData((d) => ({ ...d, hkVorauszahlung: v.toString() })); }}
                  onFocus={(e) => e.target.select()}
                  placeholder="80.00"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            {(formData.kaltmiete || formData.bkVorauszahlung || formData.hkVorauszahlung) && (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Warmmiete:{" "}
                <span className="font-semibold text-[var(--text-secondary)]">
                  {(
                    (parseFloat(formData.kaltmiete) || 0) +
                    (parseFloat(formData.bkVorauszahlung) || 0) +
                    (parseFloat(formData.hkVorauszahlung) || 0)
                  ).toFixed(2)}{" "}
                  €/Monat
                </span>
              </p>
            )}
          </div>

          {/* Kaution */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Kaution (€)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.kaution}
              onChange={(e) => setFormData({ ...formData, kaution: e.target.value })}
              onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setFormData((d) => ({ ...d, kaution: v.toString() })); }}
              onFocus={(e) => e.target.select()}
              placeholder="z.B. 2400.00 (= 3 × Kaltmiete)"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {formData.kaltmiete && !formData.kaution && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, kaution: (parseFloat(formData.kaltmiete) * 3).toFixed(2) })}
                className="mt-1 text-xs text-blue-400 hover:text-blue-300"
              >
                Vorschlag übernehmen: {(parseFloat(formData.kaltmiete) * 3).toFixed(2)} € (3 × Kaltmiete)
              </button>
            )}
          </div>

          {/* Notizen */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Notizen
            </label>
            <textarea
              value={formData.notizen}
              onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
              rows={3}
              placeholder="Besondere Vereinbarungen, Hinweise..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Dokument-Upload */}
          <div>
            <button
              type="button"
              onClick={() => setShowDokUpload(true)}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Dokumente hochladen
            </button>
          </div>

          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-3">
            <p className="text-xs text-blue-400">
              Das Mietverhältnis wird angelegt. Liegt das Einzugsdatum in der Zukunft, wird die Einheit auf &bdquo;reserviert&ldquo; gesetzt. Ab dem Einzugsdatum gilt sie als &bdquo;vermietet&ldquo;.
            </p>
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
                "Mietverhältnis anlegen"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Neuen Mieter anlegen */}
      <ErweiterterMieterModal
        isOpen={showMieterModal}
        onClose={() => setShowMieterModal(false)}
        onSuccess={() => {
          utils.mieter.list.invalidate();
          setShowMieterModal(false);
        }}
      />

      {/* Dokument hochladen */}
      <DokumentUploadModal
        open={showDokUpload}
        onClose={() => setShowDokUpload(false)}
      />
    </div>
  );
}
