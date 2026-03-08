"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface ErweiterterMieterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mieterId?: string;
}

type Tab = "stammdaten" | "mietverhaeltnis" | "kaution" | "nebenkosten" | "uebergabe" | "sonstiges";

interface MieterFormData {
  mieterIdIntern: string;
  typ: "PRIVAT" | "GESCHAEFTLICH";
  anrede: string;
  titel: string;
  vorname: string;
  nachname: string;
  firma: string;
  geburtsdatum: string;
  staatsangehoerigkeit: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  land: string;
  telefonMobil: string;
  telefonFestnetz: string;
  email: string;
  kommunikationskanal: string;
  notfallkontaktName: string;
  notfallkontaktBeziehung: string;
  notfallkontaktTelefon: string;
  ausweisart: string;
  ausweisnummer: string;
  bonitaetGeprueft: boolean;
  bonitaetDatum: string;
  datenschutzHinweisUebergeben: boolean;
  datenschutzDatum: string;
  notizen: string;
}

interface MieterTabProps {
  formData: MieterFormData;
  setFormData: React.Dispatch<React.SetStateAction<MieterFormData>>;
}

export function ErweiterterMieterModal({ isOpen, onClose, onSuccess, mieterId }: ErweiterterMieterModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("stammdaten");
  const isEditMode = !!mieterId;

  const { data: mieterData } = trpc.mieter.getById.useQuery(
    { id: mieterId! },
    { enabled: isEditMode && isOpen }
  );

  const [formData, setFormData] = useState<MieterFormData>({
    // Stammdaten
    mieterIdIntern: "",
    typ: "PRIVAT",
    anrede: "",
    titel: "",
    vorname: "",
    nachname: "",
    firma: "",
    geburtsdatum: "",
    staatsangehoerigkeit: "",

    // Adresse
    strasse: "",
    hausnummer: "",
    plz: "",
    ort: "",
    land: "Deutschland",

    // Kontakt
    telefonMobil: "",
    telefonFestnetz: "",
    email: "",
    kommunikationskanal: "",

    // Notfallkontakt
    notfallkontaktName: "",
    notfallkontaktBeziehung: "",
    notfallkontaktTelefon: "",

    // Identität
    ausweisart: "",
    ausweisnummer: "",
    bonitaetGeprueft: false,
    bonitaetDatum: "",

    // DSGVO
    datenschutzHinweisUebergeben: false,
    datenschutzDatum: "",

    // Sonstiges
    notizen: "",
  });

  const createMutation = trpc.mieter.create.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const updateMutation = trpc.mieter.update.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const [prevMieterId, setPrevMieterId] = useState<string | undefined>(undefined);
  if (mieterData && isEditMode && mieterId !== prevMieterId) {
    setPrevMieterId(mieterId);
    setFormData({
      mieterIdIntern: mieterData.mieterIdIntern || "",
      typ: (mieterData.typ || "PRIVAT") as "PRIVAT" | "GESCHAEFTLICH",
      anrede: mieterData.anrede || "",
      titel: mieterData.titel || "",
      vorname: mieterData.vorname || "",
      nachname: mieterData.nachname || "",
      firma: mieterData.firma || "",
      geburtsdatum: mieterData.geburtsdatum ? new Date(mieterData.geburtsdatum).toISOString().split('T')[0] : "",
      staatsangehoerigkeit: mieterData.staatsangehoerigkeit || "",

      strasse: mieterData.strasse || "",
      hausnummer: mieterData.hausnummer || "",
      plz: mieterData.plz || "",
      ort: mieterData.ort || "",
      land: mieterData.land || "Deutschland",

      telefonMobil: mieterData.telefonMobil || "",
      telefonFestnetz: mieterData.telefonFestnetz || "",
      email: mieterData.email || "",
      kommunikationskanal: mieterData.kommunikationskanal || "",

      notfallkontaktName: mieterData.notfallkontaktName || "",
      notfallkontaktBeziehung: mieterData.notfallkontaktBeziehung || "",
      notfallkontaktTelefon: mieterData.notfallkontaktTelefon || "",

      ausweisart: mieterData.ausweisart || "",
      ausweisnummer: mieterData.ausweisnummer || "",
      bonitaetGeprueft: mieterData.bonitaetGeprueft || false,
      bonitaetDatum: mieterData.bonitaetDatum ? new Date(mieterData.bonitaetDatum).toISOString().split('T')[0] : "",

      datenschutzHinweisUebergeben: mieterData.datenschutzHinweisUebergeben || false,
      datenschutzDatum: mieterData.datenschutzDatum ? new Date(mieterData.datenschutzDatum).toISOString().split('T')[0] : "",

      notizen: mieterData.notizen || "",
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      mieterIdIntern: formData.mieterIdIntern || undefined,
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
      bonitaetGeprueft: formData.bonitaetGeprueft || undefined,
      bonitaetDatum: formData.bonitaetDatum ? new Date(formData.bonitaetDatum) : undefined,

      datenschutzHinweisUebergeben: formData.datenschutzHinweisUebergeben || undefined,
      datenschutzDatum: formData.datenschutzDatum ? new Date(formData.datenschutzDatum) : undefined,

      notizen: formData.notizen || undefined,
    };

    if (isEditMode && mieterId) {
      updateMutation.mutate({ id: mieterId, ...data } as Parameters<typeof updateMutation.mutate>[0]);
    } else {
      createMutation.mutate(data as Parameters<typeof createMutation.mutate>[0]);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "stammdaten" as Tab, label: "Stammdaten", icon: "👤", required: true },
    { id: "sonstiges" as Tab, label: "Notizen & DSGVO", icon: "📝" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-20 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-[var(--bg-card)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="border-b border-[var(--border)] bg-[var(--bg-card)] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {isEditMode ? "Mieter bearbeiten" : "Neuen Mieter erstellen"}
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

          {/* Tabs */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-700 ring-2 ring-blue-500"
                    : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.required && <span className="text-red-500">*</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {activeTab === "stammdaten" && <StammdatenTab formData={formData} setFormData={setFormData} />}
          {activeTab === "sonstiges" && <SonstigesTab formData={formData} setFormData={setFormData} />}
        </form>

        {/* Footer */}
        <div className="border-t border-[var(--border)] bg-[var(--bg-page)] px-6 py-4">
          {(createMutation.error || updateMutation.error) && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-800">
                Fehler: {createMutation.error?.message || updateMutation.error?.message}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="text-red-500">*</span> = Pflichtfelder
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                onClick={handleSubmit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 flex items-center gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending)
                  ? (isEditMode ? "Speichere..." : "Erstelle...")
                  : (isEditMode ? "Änderungen speichern" : "Mieter erstellen")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components
function StammdatenTab({ formData, setFormData }: MieterTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Mieter-Typ & ID</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Mieter-Typ</label>
            <select
              value={formData.typ}
              onChange={(e) => setFormData({ ...formData, typ: e.target.value as "PRIVAT" | "GESCHAEFTLICH" })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="PRIVAT">Privat</option>
              <option value="GESCHAEFTLICH">Geschäftlich</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Mieter-ID intern</label>
            <input
              type="text"
              value={formData.mieterIdIntern}
              onChange={(e) => setFormData({ ...formData, mieterIdIntern: e.target.value })}
              placeholder="z.B. M-001"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Persönliche Daten</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {formData.typ === "GESCHAEFTLICH" ? (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Firma <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.firma}
                onChange={(e) => setFormData({ ...formData, firma: e.target.value })}
                placeholder="z.B. Musterfirma GmbH"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Anrede</label>
            <select
              value={formData.anrede}
              onChange={(e) => setFormData({ ...formData, anrede: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Bitte wählen</option>
              <option value="Herr">Herr</option>
              <option value="Frau">Frau</option>
              <option value="Divers">Divers</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Titel</label>
            <input
              type="text"
              value={formData.titel}
              onChange={(e) => setFormData({ ...formData, titel: e.target.value })}
              placeholder="z.B. Dr., Prof."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Vorname</label>
            <input
              type="text"
              value={formData.vorname}
              onChange={(e) => setFormData({ ...formData, vorname: e.target.value })}
              placeholder="Max"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Nachname <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nachname}
              onChange={(e) => setFormData({ ...formData, nachname: e.target.value })}
              placeholder="Mustermann"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Geburtsdatum</label>
            <input
              type="date"
              value={formData.geburtsdatum}
              onChange={(e) => setFormData({ ...formData, geburtsdatum: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Staatsangehörigkeit</label>
            <input
              type="text"
              value={formData.staatsangehoerigkeit}
              onChange={(e) => setFormData({ ...formData, staatsangehoerigkeit: e.target.value })}
              placeholder="z.B. Deutsch"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Adresse (Meldeadresse)</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Straße & Hausnummer</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={formData.strasse}
                onChange={(e) => setFormData({ ...formData, strasse: e.target.value })}
                placeholder="Straße"
                className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                value={formData.hausnummer}
                onChange={(e) => setFormData({ ...formData, hausnummer: e.target.value })}
                placeholder="Nr."
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">PLZ</label>
            <input
              type="text"
              value={formData.plz}
              onChange={(e) => setFormData({ ...formData, plz: e.target.value })}
              placeholder="10115"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Ort</label>
            <input
              type="text"
              value={formData.ort}
              onChange={(e) => setFormData({ ...formData, ort: e.target.value })}
              placeholder="Berlin"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Land</label>
            <input
              type="text"
              value={formData.land}
              onChange={(e) => setFormData({ ...formData, land: e.target.value })}
              placeholder="Deutschland"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Kontaktdaten</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Telefon (Mobil)</label>
            <input
              type="tel"
              value={formData.telefonMobil}
              onChange={(e) => setFormData({ ...formData, telefonMobil: e.target.value })}
              placeholder="+49 170 1234567"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Telefon (Festnetz)</label>
            <input
              type="tel"
              value={formData.telefonFestnetz}
              onChange={(e) => setFormData({ ...formData, telefonFestnetz: e.target.value })}
              placeholder="+49 30 1234567"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">E-Mail</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="max@mustermann.de"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Bevorzugter Kanal</label>
            <select
              value={formData.kommunikationskanal}
              onChange={(e) => setFormData({ ...formData, kommunikationskanal: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Bitte wählen</option>
              <option value="E-Mail">E-Mail</option>
              <option value="Brief">Brief</option>
              <option value="Telefon">Telefon</option>
              <option value="Portal">Portal</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Notfallkontakt</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Name</label>
            <input
              type="text"
              value={formData.notfallkontaktName}
              onChange={(e) => setFormData({ ...formData, notfallkontaktName: e.target.value })}
              placeholder="Anna Muster"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Beziehung</label>
            <input
              type="text"
              value={formData.notfallkontaktBeziehung}
              onChange={(e) => setFormData({ ...formData, notfallkontaktBeziehung: e.target.value })}
              placeholder="Ehepartner/Kind/etc."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Telefon</label>
            <input
              type="tel"
              value={formData.notfallkontaktTelefon}
              onChange={(e) => setFormData({ ...formData, notfallkontaktTelefon: e.target.value })}
              placeholder="+49 170 7654321"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Identität / Legitimation (DSGVO-kritisch)</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Ausweisart</label>
            <select
              value={formData.ausweisart}
              onChange={(e) => setFormData({ ...formData, ausweisart: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Bitte wählen</option>
              <option value="Personalausweis">Personalausweis</option>
              <option value="Reisepass">Reisepass</option>
              <option value="Führerschein">Führerschein</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Ausweisnummer</label>
            <input
              type="text"
              value={formData.ausweisnummer}
              onChange={(e) => setFormData({ ...formData, ausweisnummer: e.target.value })}
              placeholder="T123456789"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="bonitaet"
              checked={formData.bonitaetGeprueft}
              onChange={(e) => setFormData({ ...formData, bonitaetGeprueft: e.target.checked })}
              className="h-4 w-4 rounded border-[var(--border)] text-blue-400 focus:ring-blue-500"
            />
            <label htmlFor="bonitaet" className="text-sm text-[var(--text-secondary)]">Bonität geprüft</label>
          </div>

          {formData.bonitaetGeprueft && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Prüfungsdatum</label>
              <input
                type="date"
                value={formData.bonitaetDatum}
                onChange={(e) => setFormData({ ...formData, bonitaetDatum: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SonstigesTab({ formData, setFormData }: MieterTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Datenschutz (DSGVO)</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="dsgvo"
              checked={formData.datenschutzHinweisUebergeben}
              onChange={(e) => setFormData({ ...formData, datenschutzHinweisUebergeben: e.target.checked })}
              className="h-4 w-4 rounded border-[var(--border)] text-blue-400 focus:ring-blue-500"
            />
            <label htmlFor="dsgvo" className="text-sm text-[var(--text-secondary)]">Datenschutzhinweis übergeben</label>
          </div>

          {formData.datenschutzHinweisUebergeben && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Datum</label>
              <input
                type="date"
                value={formData.datenschutzDatum}
                onChange={(e) => setFormData({ ...formData, datenschutzDatum: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Notizen</h3>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Allgemeine Notizen</label>
          <textarea
            value={formData.notizen}
            onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
            rows={8}
            placeholder="Zusätzliche Informationen zum Mieter..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
