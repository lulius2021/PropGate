"use client";

import { trpc } from "@/lib/trpc/client";
import { FileText, Search, Calendar, Euro, Plus } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { NeuerVertragModal } from "@/components/vertraege/NeuerVertragModal";
import { toast } from "sonner";

export default function VertraegePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [laufendFilter, setLaufendFilter] = useState<string>("all");
  const [mieterTypFilter, setMieterTypFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("einzug");
  const [selectedObjekte, setSelectedObjekte] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [kuendigungDialog, setKuendigungDialog] = useState<{ id: string; auszugsdatum: string } | null>(null);

  const { data: vertraege, isLoading } = trpc.vertraege.list.useQuery();
  const { data: stats } = trpc.vertraege.stats.useQuery();
  const { data: objekte } = trpc.objekte.list.useQuery();

  const utils = trpc.useUtils();
  const kuendigungMutation = trpc.vertraege.kuendigung.useMutation({
    onSuccess: () => {
      utils.vertraege.list.invalidate();
      utils.vertraege.stats.invalidate();
      utils.einheiten.list.invalidate();
      utils.einheiten.stats.invalidate();
      setKuendigungDialog(null);
      toast.success("Kündigung erfolgreich gespeichert");
    },
    onError: (err) => {
      toast.error(err.message || "Fehler bei der Kündigung");
    },
  });

  const filteredVertraege = vertraege
    ?.filter((v) => {
      const matchesSearch =
        v.mieter?.nachname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.mieter?.vorname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.mieter?.firma?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.einheit?.einheitNr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.einheit?.objekt?.bezeichnung
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || v.vertragStatus === statusFilter;

      const matchesLaufend =
        laufendFilter === "all" ||
        (laufendFilter === "laufend" && !v.auszugsdatum) ||
        (laufendFilter === "beendet" && v.auszugsdatum);

      const matchesMieterTyp =
        mieterTypFilter === "all" ||
        (mieterTypFilter === "privat" && (v.mieter?.typ === "PRIVAT" || !v.mieter?.typ)) ||
        (mieterTypFilter === "geschaeftlich" && (v.mieter?.typ === "GESCHAEFTLICH" || v.mieter?.typ === "GEWERBE"));

      const matchesObjekt =
        selectedObjekte.length === 0 ||
        (v.einheit?.objektId && selectedObjekte.includes(v.einheit.objektId));

      return matchesSearch && matchesStatus && matchesLaufend && matchesMieterTyp && matchesObjekt;
    })
    .sort((a, b) => {
      if (sortBy === "einzug") {
        return new Date(b.einzugsdatum).getTime() - new Date(a.einzugsdatum).getTime();
      } else if (sortBy === "einzug-alt") {
        return new Date(a.einzugsdatum).getTime() - new Date(b.einzugsdatum).getTime();
      } else if (sortBy === "miete-hoch") {
        const warmmieteA = parseFloat(a.kaltmiete) + parseFloat(a.bkVorauszahlung) + parseFloat(a.hkVorauszahlung);
        const warmmieteB = parseFloat(b.kaltmiete) + parseFloat(b.bkVorauszahlung) + parseFloat(b.hkVorauszahlung);
        return warmmieteB - warmmieteA;
      } else if (sortBy === "miete-niedrig") {
        const warmmieteA = parseFloat(a.kaltmiete) + parseFloat(a.bkVorauszahlung) + parseFloat(a.hkVorauszahlung);
        const warmmieteB = parseFloat(b.kaltmiete) + parseFloat(b.bkVorauszahlung) + parseFloat(b.hkVorauszahlung);
        return warmmieteA - warmmieteB;
      }
      return 0;
    });

  const toggleObjekt = (objektId: string) => {
    setSelectedObjekte((prev) =>
      prev.includes(objektId)
        ? prev.filter((id) => id !== objektId)
        : [...prev, objektId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AKTIV": return "bg-green-500/15 text-green-400";
      case "UNTERSCHRIEBEN": return "bg-blue-500/15 text-blue-400";
      case "VERSANDT": return "bg-purple-500/15 text-purple-400";
      case "GENERIERT": return "bg-yellow-500/15 text-yellow-400";
      case "ENTWURF": return "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]";
      case "GEKUENDIGT": return "bg-orange-500/15 text-orange-400";
      case "BEENDET": return "bg-red-500/15 text-red-400";
      default: return "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "AKTIV": return "Aktiv";
      case "UNTERSCHRIEBEN": return "Unterschrieben";
      case "VERSANDT": return "Versandt";
      case "GENERIERT": return "Generiert";
      case "ENTWURF": return "Entwurf";
      case "GEKUENDIGT": return "Gekündigt";
      case "BEENDET": return "Beendet";
      default: return status;
    }
  };

  const getKautionStatusLabel = (status: string) => {
    switch (status) {
      case "AUSSTEHEND": return "Ausstehend";
      case "TEILZAHLUNG": return "Teilzahlung";
      case "VOLLSTAENDIG": return "Vollständig";
      case "HINTERLEGT_BANK": return "Bei Bank hinterlegt";
      case "ZURUECKGEZAHLT": return "Zurückgezahlt";
      default: return status;
    }
  };

  const getMieterName = (mieter: { typ?: string | null; firma?: string | null; vorname?: string | null; nachname: string }) => {
    if (mieter.typ === "GEWERBE" && mieter.firma) return mieter.firma;
    return `${mieter.vorname || ""} ${mieter.nachname}`.trim();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Lade Mietverträge...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mietverträge</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Mietverhältnisse und Verträge
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Neuer Vertrag
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--text-secondary)]">Gesamt Verträge</div>
              <FileText className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{stats.gesamt}</div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
            <div className="text-sm font-medium text-[var(--text-secondary)]">Aktiv</div>
            <div className="mt-2 text-2xl font-bold text-green-400">
              {stats.aktiv}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--text-secondary)]">Warmmiete Gesamt</div>
              <Euro className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{stats.gesamtWarmmiete} €</div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
            <div className="text-sm font-medium text-[var(--text-secondary)]">Ø Warmmiete</div>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
              {stats.durchschnittWarmmiete} €
            </div>
          </div>
        </div>
      )}

      {/* Objekt Filter */}
      {objekte && objekte.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          <div className="border-b border-[var(--border)] px-6 py-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Nach Objekt filtern</h3>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {objekte.map((objekt) => {
                const isSelected = selectedObjekte.includes(objekt.id);
                const vertraegeCount = vertraege?.filter((v) => v.einheit?.objektId === objekt.id).length || 0;

                return (
                  <button
                    key={objekt.id}
                    onClick={() => toggleObjekt(objekt.id)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:shadow-md ${
                      isSelected
                        ? "border-blue-500 bg-blue-500/15 text-blue-400 shadow-sm"
                        : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border)]"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>{objekt.bezeichnung}</span>
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {vertraegeCount}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedObjekte.length > 0 && (
              <button
                onClick={() => setSelectedObjekte([])}
                className="mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                Alle Filter zurücksetzen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Suche nach Mieter, Einheit oder Objekt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-[200px] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Alle Status</option>
              <option value="ENTWURF">Entwurf</option>
              <option value="GENERIERT">Generiert</option>
              <option value="VERSANDT">Versandt</option>
              <option value="UNTERSCHRIEBEN">Unterschrieben</option>
              <option value="AKTIV">Aktiv</option>
              <option value="GEKUENDIGT">Gekündigt</option>
              <option value="BEENDET">Beendet</option>
            </select>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <select
              value={laufendFilter}
              onChange={(e) => setLaufendFilter(e.target.value)}
              className="w-full md:w-[200px] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Alle Verträge</option>
              <option value="laufend">Laufend</option>
              <option value="beendet">Beendet</option>
            </select>

            <select
              value={mieterTypFilter}
              onChange={(e) => setMieterTypFilter(e.target.value)}
              className="w-full md:w-[200px] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Alle Mietertypen</option>
              <option value="privat">Privat</option>
              <option value="geschaeftlich">Geschäftlich</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-[200px] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="einzug">Neueste zuerst</option>
              <option value="einzug-alt">Älteste zuerst</option>
              <option value="miete-hoch">Höchste Miete</option>
              <option value="miete-niedrig">Niedrigste Miete</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vertraege List */}
      <div className="space-y-4">
        {filteredVertraege?.map((v) => {
          const warmmiete =
            parseFloat(v.kaltmiete) +
            parseFloat(v.bkVorauszahlung) +
            parseFloat(v.hkVorauszahlung);

          return (
            <div key={v.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        {getMieterName(v.mieter)}
                      </h3>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(v.vertragStatus)}`}>
                        {getStatusLabel(v.vertragStatus)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {v.einheit?.objekt?.bezeichnung} • Einheit{" "}
                      {v.einheit?.einheitNr}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[var(--text-primary)]">
                      {warmmiete.toFixed(2)} €
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Warmmiete
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-[var(--text-secondary)] mb-1">Kaltmiete</div>
                    <div className="font-medium text-[var(--text-primary)]">{v.kaltmiete} €</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)] mb-1">BK-Vorauszahlung</div>
                    <div className="font-medium text-[var(--text-primary)]">{v.bkVorauszahlung} €</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)] mb-1">HK-Vorauszahlung</div>
                    <div className="font-medium text-[var(--text-primary)]">{v.hkVorauszahlung} €</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)] mb-1">Kaution</div>
                    <div className="font-medium text-[var(--text-primary)]">
                      {v.kaution ? `${v.kaution} €` : "-"}
                    </div>
                    {v.kaution && (
                      <div className="text-xs text-[var(--text-secondary)] mt-1">
                        {getKautionStatusLabel(v.kautionStatus)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[var(--border)] text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                    <div>
                      <div className="text-[var(--text-secondary)]">Einzug</div>
                      <div className="font-medium text-[var(--text-primary)]">
                        {format(new Date(v.einzugsdatum), "dd.MM.yyyy", {
                          locale: de,
                        })}
                      </div>
                    </div>
                  </div>
                  {v.auszugsdatum && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                      <div>
                        <div className="text-[var(--text-secondary)]">Auszug</div>
                        <div className="font-medium text-[var(--text-primary)]">
                          {format(new Date(v.auszugsdatum), "dd.MM.yyyy", {
                            locale: de,
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--border)] flex gap-2">
                  <button className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]">
                    Details ansehen
                  </button>
                  <button className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]">
                    Vertrag generieren
                  </button>
                  {v.vertragStatus !== "BEENDET" && (v.vertragStatus as string) !== "GEKUENDIGT" && !v.auszugsdatum && (
                    <button
                      onClick={() => setKuendigungDialog({ id: v.id, auszugsdatum: "" })}
                      className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-orange-400 hover:text-orange-300 hover:bg-[var(--bg-card-hover)]"
                    >
                      Kündigen
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredVertraege?.length === 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm p-8">
          <div className="text-center">
            <FileText className="mx-auto h-10 w-10 text-[var(--text-muted)] mb-3" />
            <p className="text-[var(--text-secondary)] font-medium">Keine Mietverträge gefunden</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Legen Sie Ihr erstes Mietverhältnis mit dem Button oben rechts an.
            </p>
          </div>
        </div>
      )}

      {/* Kündigung Dialog */}
      {kuendigungDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Vertrag kündigen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Auszugsdatum
                </label>
                <input
                  type="date"
                  value={kuendigungDialog.auszugsdatum}
                  onChange={(e) => setKuendigungDialog({ ...kuendigungDialog, auszugsdatum: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setKuendigungDialog(null)}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                >
                  Abbrechen
                </button>
                <button
                  disabled={!kuendigungDialog.auszugsdatum || kuendigungMutation.isPending}
                  onClick={() => {
                    kuendigungMutation.mutate({
                      id: kuendigungDialog.id,
                      auszugsdatum: new Date(kuendigungDialog.auszugsdatum),
                    });
                  }}
                  className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {kuendigungMutation.isPending ? "Wird gespeichert..." : "Kündigung bestätigen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <NeuerVertragModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
