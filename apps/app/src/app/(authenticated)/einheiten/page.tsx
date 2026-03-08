"use client";

import { trpc } from "@/lib/trpc/client";
import { Building2, Plus, Pencil, Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { NeueEinheitModal } from "@/components/einheiten/NeueEinheitModal";
import { EinheitBearbeitenModal } from "@/components/einheiten/EinheitBearbeitenModal";

type Einheit = {
  id: string;
  einheitNr: string;
  typ: "WOHNUNG" | "GEWERBE" | "STELLPLATZ" | "LAGER";
  flaeche: string;
  zimmer?: number | null;
  lage?: string | null;
  eurProQm?: string | null;
  ausstattung?: string | null;
  status: string;
  objektId: string | null;
  objekt?: { bezeichnung: string } | null;
  mietverhaeltnisse?: {
    id: string;
    kaltmiete: number | string;
    einzugsdatum?: string | Date | null;
    auszugsdatum?: string | Date | null;
  }[];
};

export default function EinheitenPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedObjekte, setSelectedObjekte] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEinheit, setEditingEinheit] = useState<Einheit | null>(null);

  const { data: einheiten, isLoading } = trpc.einheiten.list.useQuery({});
  const { data: stats } = trpc.einheiten.stats.useQuery(undefined);
  const { data: objekte } = trpc.objekte.list.useQuery();

  const filteredEinheiten = einheiten?.filter((einheit) => {
    const matchesSearch =
      einheit.einheitNr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      einheit.objekt?.bezeichnung
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || einheit.status === statusFilter;

    const matchesObjekt =
      selectedObjekte.length === 0 ||
      (einheit.objektId && selectedObjekte.includes(einheit.objektId));

    return matchesSearch && matchesStatus && matchesObjekt;
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
      case "VERMIETET":
        return "bg-green-500/15 text-green-400";
      case "VERFUEGBAR":
        return "bg-blue-500/15 text-blue-400";
      case "KUENDIGUNG":
        return "bg-yellow-500/15 text-yellow-400";
      case "SANIERUNG":
        return "bg-orange-500/15 text-orange-400";
      case "RESERVIERT":
        return "bg-purple-500/15 text-purple-400";
      default:
        return "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]";
    }
  };

  const getTypLabel = (typ: string) => {
    switch (typ) {
      case "WOHNUNG": return "Wohnung";
      case "GEWERBE": return "Gewerbe";
      case "STELLPLATZ": return "Stellplatz";
      case "LAGER": return "Lager";
      default: return typ;
    }
  };

  const getStatusLabel = (status: string, einheit?: Einheit) => {
    const fmt = (d: string | Date) => d ? new Date(d).toLocaleDateString("de-DE") : "";
    const mv = einheit?.mietverhaeltnisse?.[0];
    switch (status) {
      case "VERMIETET": return "Vermietet";
      case "VERFUEGBAR": return "Verfügbar";
      case "KUENDIGUNG": {
        const aus = mv?.auszugsdatum ? fmt(mv.auszugsdatum) : "";
        return aus ? `Gekündigt — bis ${aus}` : "Kündigung";
      }
      case "SANIERUNG": return "Sanierung";
      case "RESERVIERT": {
        const ein = mv?.einzugsdatum ? fmt(mv.einzugsdatum) : "";
        return ein ? `Reserviert — ab ${ein}` : "Reserviert";
      }
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Lade Einheiten...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Einheiten</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Wohn- und Gewerbeeinheiten
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Neue Einheit
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--text-secondary)]">Gesamt Einheiten</div>
              <Building2 className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{stats.gesamt}</div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
            <div className="text-sm font-medium text-[var(--text-secondary)]">Verfügbar</div>
            <div className="mt-2 text-2xl font-bold text-blue-400">
              {stats.verfuegbar}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
            <div className="text-sm font-medium text-[var(--text-secondary)]">Vermietet</div>
            <div className="mt-2 text-2xl font-bold text-green-400">
              {stats.vermietet}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
            <div className="text-sm font-medium text-[var(--text-secondary)]">Durchschnitt €/m²</div>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{stats.durchschnittEurProQm}</div>
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
                const einheitenCount = einheiten?.filter((e) => e.objektId === objekt.id).length || 0;

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
                    <Building2 className="h-4 w-4" />
                    <span>{objekt.bezeichnung}</span>
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {einheitenCount}
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Suche nach Einheit oder Objekt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-[200px] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Alle Status</option>
            <option value="VERFUEGBAR">Verfügbar</option>
            <option value="VERMIETET">Vermietet</option>
            <option value="KUENDIGUNG">Kündigung</option>
            <option value="SANIERUNG">Sanierung</option>
            <option value="RESERVIERT">Reserviert</option>
          </select>
        </div>
      </div>

      {/* Einheiten List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEinheiten?.map((einheit) => (
          <div key={einheit.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {einheit.objekt?.bezeichnung}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Einheit {einheit.einheitNr}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(einheit.status)}`}>
                  {getStatusLabel(einheit.status, einheit as unknown as Einheit)}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Typ:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {getTypLabel(einheit.typ)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Fläche:</span>
                  <span className="font-medium text-[var(--text-primary)]">{einheit.flaeche} m²</span>
                </div>
                {einheit.zimmer && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Zimmer:</span>
                    <span className="font-medium text-[var(--text-primary)]">{einheit.zimmer}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Lage:</span>
                  <span className="font-medium text-[var(--text-primary)]">{einheit.lage || "–"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">€/m² (eff.):</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {(() => {
                      const activeLease = einheit.mietverhaeltnisse?.find(
                        (mv) => !mv.auszugsdatum
                      );
                      const flaeche = parseFloat(einheit.flaeche);
                      if (activeLease && flaeche > 0) {
                        const kaltmiete = typeof activeLease.kaltmiete === "string"
                          ? parseFloat(activeLease.kaltmiete)
                          : Number(activeLease.kaltmiete);
                        return `${(kaltmiete / flaeche).toFixed(2)} €`;
                      }
                      return "–";
                    })()}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex gap-2">
                <button className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]">
                  Details ansehen
                </button>
                <button
                  onClick={() => setEditingEinheit(einheit as unknown as Einheit)}
                  className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Bearbeiten
                </button>
                {einheit.status === "VERMIETET" && (
                  <button
                    onClick={() => router.push("/vertraege")}
                    className="flex items-center gap-1.5 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm font-medium text-yellow-400 hover:bg-yellow-500/20"
                  >
                    Kündigung
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEinheiten?.length === 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm p-8">
          <div className="text-center">
            <Building2 className="mx-auto h-10 w-10 text-[var(--text-muted)] mb-3" />
            <p className="text-[var(--text-secondary)] font-medium">Keine Einheiten gefunden</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Erstellen Sie Ihre erste Einheit mit dem Button oben rechts.
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      <NeueEinheitModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {}}
      />
      <EinheitBearbeitenModal
        isOpen={editingEinheit !== null}
        einheit={editingEinheit}
        onClose={() => setEditingEinheit(null)}
        onSuccess={() => {}}
      />
    </div>
  );
}
