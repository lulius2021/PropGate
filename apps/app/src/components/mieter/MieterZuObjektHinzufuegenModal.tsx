"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface MieterZuObjektHinzufuegenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  objektId: string;
}

export function MieterZuObjektHinzufuegenModal({
  isOpen,
  onClose,
  onSuccess,
  objektId,
}: MieterZuObjektHinzufuegenModalProps) {
  const [activeTab, setActiveTab] = useState<"mieter" | "vertrag">("mieter");
  const [kautionManuell, setKautionManuell] = useState(false);
  const [formData, setFormData] = useState({
    // Mieter-Daten
    typ: "PRIVAT" as "PRIVAT" | "GESCHAEFTLICH",
    anrede: "",
    titel: "",
    vorname: "",
    nachname: "",
    firma: "",
    geburtsdatum: "",
    staatsangehoerigkeit: "",
    strasse: "",
    hausnummer: "",
    plz: "",
    ort: "",
    land: "Deutschland",
    telefonMobil: "",
    telefonFestnetz: "",
    email: "",
    kommunikationskanal: "",
    notfallkontaktName: "",
    notfallkontaktBeziehung: "",
    notfallkontaktTelefon: "",
    ausweisart: "",
    ausweisnummer: "",
    bonitaetGeprueft: false,
    bonitaetDatum: "",
    datenschutzHinweisUebergeben: false,
    datenschutzDatum: "",
    notizen: "",
    // Vertragsdaten
    einheitId: "",
    einzugsdatum: new Date().toISOString().split("T")[0],
    kaltmiete: "",
    bkVorauszahlung: "",
    hkVorauszahlung: "",
    kaution: "",
    vertragsnotizen: "",
  });

  const { data: objekt } = trpc.objekte.getById.useQuery(
    { id: objektId },
    { enabled: isOpen }
  );

  const createMieterMutation = trpc.mieter.create.useMutation();
  const createVertragMutation = trpc.vertraege.create.useMutation();

  // Kautions-Vorschlag: 3x Kaltmiete (derived at render time)
  const effectiveKaution = !kautionManuell && formData.kaltmiete
    ? (parseFloat(formData.kaltmiete) * 3).toFixed(2)
    : formData.kaution;

  // Reset form when modal closes
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen && !isOpen) {
    setActiveTab("mieter");
    setKautionManuell(false);
    setFormData({
      typ: "PRIVAT",
      anrede: "",
      titel: "",
      vorname: "",
      nachname: "",
      firma: "",
      geburtsdatum: "",
      staatsangehoerigkeit: "",
      strasse: "",
      hausnummer: "",
      plz: "",
      ort: "",
      land: "Deutschland",
      telefonMobil: "",
      telefonFestnetz: "",
      email: "",
      kommunikationskanal: "",
      notfallkontaktName: "",
      notfallkontaktBeziehung: "",
      notfallkontaktTelefon: "",
      ausweisart: "",
      ausweisnummer: "",
      bonitaetGeprueft: false,
      bonitaetDatum: "",
      datenschutzHinweisUebergeben: false,
      datenschutzDatum: "",
      notizen: "",
      einheitId: "",
      einzugsdatum: new Date().toISOString().split("T")[0],
      kaltmiete: "",
      bkVorauszahlung: "",
      hkVorauszahlung: "",
      kaution: "",
      vertragsnotizen: "",
    });
  }
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 1. Erstelle den Mieter
      const mieter = await createMieterMutation.mutateAsync({
        typ: formData.typ,
        anrede: formData.anrede || undefined,
        titel: formData.titel || undefined,
        vorname: formData.vorname || undefined,
        nachname: formData.nachname,
        firma: formData.firma || undefined,
        geburtsdatum: formData.geburtsdatum ? new Date(formData.geburtsdatum) : undefined,
        staatsangehoerigkeit: formData.staatsangehoerigkeit || undefined,
        strasse: formData.strasse || undefined,
        hausnummer: formData.hausnummer || undefined,
        plz: formData.plz || undefined,
        ort: formData.ort || undefined,
        land: formData.land || undefined,
        telefonMobil: formData.telefonMobil || undefined,
        telefonFestnetz: formData.telefonFestnetz || undefined,
        email: formData.email || undefined,
        kommunikationskanal: formData.kommunikationskanal || undefined,
        notfallkontaktName: formData.notfallkontaktName || undefined,
        notfallkontaktBeziehung: formData.notfallkontaktBeziehung || undefined,
        notfallkontaktTelefon: formData.notfallkontaktTelefon || undefined,
        ausweisart: formData.ausweisart || undefined,
        ausweisnummer: formData.ausweisnummer || undefined,
        bonitaetGeprueft: formData.bonitaetGeprueft,
        bonitaetDatum: formData.bonitaetDatum ? new Date(formData.bonitaetDatum) : undefined,
        datenschutzHinweisUebergeben: formData.datenschutzHinweisUebergeben,
        datenschutzDatum: formData.datenschutzDatum ? new Date(formData.datenschutzDatum) : undefined,
        notizen: formData.notizen || undefined,
      });

      // 2. Erstelle das Mietverhaeltnis
      await createVertragMutation.mutateAsync({
        mieterId: mieter.id,
        einheitId: formData.einheitId,
        einzugsdatum: new Date(formData.einzugsdatum),
        kaltmiete: parseFloat(formData.kaltmiete) || 0,
        bkVorauszahlung: parseFloat(formData.bkVorauszahlung) || 0,
        hkVorauszahlung: parseFloat(formData.hkVorauszahlung) || 0,
        kaution: effectiveKaution ? parseFloat(effectiveKaution) : undefined,
        notizen: formData.vertragsnotizen || undefined,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Fehler beim Erstellen:", error);
      alert("Fehler beim Erstellen des Mieters. Bitte versuchen Sie es erneut.");
    }
  };

  if (!isOpen) return null;

  // Verfügbare Einheiten (nicht vermietet)
  const verfuegbareEinheiten = objekt?.einheiten.filter(
    (e) => e.status !== "VERMIETET"
  ) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-20 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-[var(--bg-card)] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="border-b border-[var(--border)] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Neuer Mieter für {objekt?.bezeichnung}
              </h2>
              <button
                onClick={onClose}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-[var(--border)] px-6">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab("mieter")}
                className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  activeTab === "mieter"
                    ? "border-blue-400 text-blue-400"
                    : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]"
                }`}
              >
                1. Mieterdaten
              </button>
              <button
                onClick={() => setActiveTab("vertrag")}
                className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  activeTab === "vertrag"
                    ? "border-blue-400 text-blue-400"
                    : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]"
                }`}
              >
                2. Mietvertrag
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
              {activeTab === "mieter" && (
                <div className="space-y-6">
                  {/* Typ */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Mietertyp *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="PRIVAT"
                          checked={formData.typ === "PRIVAT"}
                          onChange={(e) => setFormData({ ...formData, typ: e.target.value as "PRIVAT" | "GESCHAEFTLICH" })}
                          className="mr-2"
                        />
                        Privat
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="GESCHAEFTLICH"
                          checked={formData.typ === "GESCHAEFTLICH"}
                          onChange={(e) => setFormData({ ...formData, typ: e.target.value as "PRIVAT" | "GESCHAEFTLICH" })}
                          className="mr-2"
                        />
                        Geschäftlich
                      </label>
                    </div>
                  </div>

                  {/* Persönliche Daten */}
                  <div className="grid grid-cols-2 gap-4">
                    {formData.typ === "GESCHAEFTLICH" && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Firma *
                        </label>
                        <input
                          type="text"
                          value={formData.firma}
                          onChange={(e) => setFormData({ ...formData, firma: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                          required={formData.typ === "GESCHAEFTLICH"}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Anrede
                      </label>
                      <select
                        value={formData.anrede}
                        onChange={(e) => setFormData({ ...formData, anrede: e.target.value })}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                      >
                        <option value="">Bitte wählen</option>
                        <option value="Herr">Herr</option>
                        <option value="Frau">Frau</option>
                        <option value="Divers">Divers</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Titel
                      </label>
                      <input
                        type="text"
                        value={formData.titel}
                        onChange={(e) => setFormData({ ...formData, titel: e.target.value })}
                        placeholder="z.B. Dr., Prof."
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Vorname
                      </label>
                      <input
                        type="text"
                        value={formData.vorname}
                        onChange={(e) => setFormData({ ...formData, vorname: e.target.value })}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Nachname *
                      </label>
                      <input
                        type="text"
                        value={formData.nachname}
                        onChange={(e) => setFormData({ ...formData, nachname: e.target.value })}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                        required
                      />
                    </div>
                  </div>

                  {/* Kontaktdaten */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Kontaktdaten</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          E-Mail
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Telefon (Mobil)
                        </label>
                        <input
                          type="tel"
                          value={formData.telefonMobil}
                          onChange={(e) => setFormData({ ...formData, telefonMobil: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Telefon (Festnetz)
                        </label>
                        <input
                          type="tel"
                          value={formData.telefonFestnetz}
                          onChange={(e) => setFormData({ ...formData, telefonFestnetz: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Adresse */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Adresse</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Straße
                        </label>
                        <input
                          type="text"
                          value={formData.strasse}
                          onChange={(e) => setFormData({ ...formData, strasse: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Hausnummer
                        </label>
                        <input
                          type="text"
                          value={formData.hausnummer}
                          onChange={(e) => setFormData({ ...formData, hausnummer: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          PLZ
                        </label>
                        <input
                          type="text"
                          value={formData.plz}
                          onChange={(e) => setFormData({ ...formData, plz: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Ort
                        </label>
                        <input
                          type="text"
                          value={formData.ort}
                          onChange={(e) => setFormData({ ...formData, ort: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Land
                        </label>
                        <input
                          type="text"
                          value={formData.land}
                          onChange={(e) => setFormData({ ...formData, land: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                        />
                      </div>
                    </div>
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
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                    />
                  </div>
                </div>
              )}

              {activeTab === "vertrag" && (
                <div className="space-y-6">
                  {/* Einheit auswählen */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Einheit *
                    </label>
                    <select
                      value={formData.einheitId}
                      onChange={(e) => setFormData({ ...formData, einheitId: e.target.value })}
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                      required
                    >
                      <option value="">Bitte wählen Sie eine Einheit</option>
                      {verfuegbareEinheiten.map((einheit) => {
                        const ext = einheit as typeof einheit & { bezeichnung?: string; wohnflaeche?: number };
                        return (
                          <option key={einheit.id} value={einheit.id}>
                            Einheit {einheit.einheitNr} - {ext.bezeichnung || "Keine Bezeichnung"}
                            {ext.wohnflaeche ? ` (${ext.wohnflaeche} m²)` : ""}
                          </option>
                        );
                      })}
                    </select>
                    {verfuegbareEinheiten.length === 0 && (
                      <p className="mt-1 text-sm text-red-400">
                        Keine verfügbaren Einheiten in diesem Objekt
                      </p>
                    )}
                  </div>

                  {/* Einzugsdatum */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Einzugsdatum *
                    </label>
                    <input
                      type="date"
                      value={formData.einzugsdatum}
                      onChange={(e) => setFormData({ ...formData, einzugsdatum: e.target.value })}
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                      required
                    />
                  </div>

                  {/* Miete */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Miete</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Kaltmiete (€) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.kaltmiete}
                          onChange={(e) => setFormData({ ...formData, kaltmiete: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Nebenkosten (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.bkVorauszahlung}
                          onChange={(e) => setFormData({ ...formData, bkVorauszahlung: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Heizkosten (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.hkVorauszahlung}
                          onChange={(e) => setFormData({ ...formData, hkVorauszahlung: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Kaution (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={effectiveKaution}
                          onChange={(e) => {
                            setKautionManuell(true);
                            setFormData({ ...formData, kaution: e.target.value });
                          }}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                        />
                        <p className="mt-1 text-xs text-[var(--text-muted)]">Vorschlag: 3× Kaltmiete</p>
                      </div>
                    </div>

                    {/* Warmmiete Berechnung */}
                    {(formData.kaltmiete || formData.bkVorauszahlung || formData.hkVorauszahlung) && (
                      <div className="mt-4 rounded-lg bg-blue-50 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[var(--text-secondary)]">Warmmiete gesamt:</span>
                          <span className="text-lg font-bold text-blue-400">
                            {(
                              (parseFloat(formData.kaltmiete) || 0) +
                              (parseFloat(formData.bkVorauszahlung) || 0) +
                              (parseFloat(formData.hkVorauszahlung) || 0)
                            ).toFixed(2)} €
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vertragsnotizen */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Notizen zum Mietvertrag
                    </label>
                    <textarea
                      value={formData.vertragsnotizen}
                      onChange={(e) => setFormData({ ...formData, vertragsnotizen: e.target.value })}
                      rows={3}
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2"
                      placeholder="z.B. Besonderheiten, Vereinbarungen, etc."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border)] bg-[var(--bg-page)] px-6 py-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
                >
                  Abbrechen
                </button>

                <div className="flex items-center gap-3">
                  {activeTab === "vertrag" && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("mieter")}
                      className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
                    >
                      ← Zurück
                    </button>
                  )}

                  {activeTab === "mieter" ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("vertrag")}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Weiter →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={createMieterMutation.isPending || createVertragMutation.isPending}
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {createMieterMutation.isPending || createVertragMutation.isPending
                        ? "Wird erstellt..."
                        : "Mieter erstellen"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
    </div>
  );
}
