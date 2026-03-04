"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ErweiterterMieterModal } from "@/components/mieter/ErweiterterMieterModal";

export default function MieterPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"aktiv" | "frueher" | "alle">("aktiv");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedObjekte, setSelectedObjekte] = useState<string[]>([]);

  const { data: mieter, isLoading } = trpc.mieter.list.useQuery();
  const { data: stats } = trpc.mieter.stats.useQuery();
  const { data: objekte } = trpc.objekte.list.useQuery();

  // Filter: Aktive vs. Frühere Mieter
  const aktiveMieter = mieter?.filter((m) =>
    m.mietverhaeltnisse.some((mv: any) => !mv.auszugsdatum)
  );
  const fruehereMieter = mieter?.filter((m) =>
    m.mietverhaeltnisse.every((mv: any) => mv.auszugsdatum)
  );

  const displayMieter =
    statusFilter === "aktiv" ? aktiveMieter :
    statusFilter === "frueher" ? fruehereMieter :
    mieter;

  const filteredMieter = displayMieter?.filter((m) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      m.nachname.toLowerCase().includes(searchLower) ||
      m.vorname?.toLowerCase().includes(searchLower) ||
      m.firma?.toLowerCase().includes(searchLower) ||
      m.email?.toLowerCase().includes(searchLower)
    );

    // Filter nach ausgewählten Objekten
    const matchesObjekt = selectedObjekte.length === 0 || m.mietverhaeltnisse.some((mv: any) =>
      mv.einheit?.objektId && selectedObjekte.includes(mv.einheit.objektId)
    );

    return matchesSearch && matchesObjekt;
  });

  const toggleObjekt = (objektId: string) => {
    setSelectedObjekte((prev) =>
      prev.includes(objektId)
        ? prev.filter((id) => id !== objektId)
        : [...prev, objektId]
    );
  };

  const getDisplayName = (m: any) => {
    if (m.firma) return m.firma;
    return `${m.vorname || ""} ${m.nachname}`.trim();
  };

  const getMietverhaeltnis = (m: any) => {
    return m.mietverhaeltnisse[0]; // Aktuellstes Mietverhältnis
  };

  if (isLoading) {
    return <div className="p-8 text-center text-[var(--text-muted)]">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Mieter</h1>
          <p className="mt-2 text-[var(--text-secondary)]">Verwalten Sie Ihre Mieter und deren Kontaktdaten</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Neuer Mieter
        </button>
      </div>

      {/* Compact Stats */}
      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
        <span><span className="font-semibold text-[var(--text-primary)]">{stats?.gesamt || 0}</span> Gesamt</span>
        <span className="text-[var(--border)]">|</span>
        <span><span className="font-semibold text-green-400">{aktiveMieter?.length || 0}</span> Aktiv</span>
        <span className="text-[var(--border)]">|</span>
        <span><span className="font-semibold text-[var(--text-muted)]">{fruehereMieter?.length || 0}</span> Früher</span>
      </div>

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
                const mieterCount = mieter?.filter((m) =>
                  m.mietverhaeltnisse.some((mv: any) => mv.einheit?.objektId === objekt.id)
                ).length || 0;

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
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>{objekt.bezeichnung}</span>
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {mieterCount}
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
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Suche nach Name, Firma oder E-Mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-1">
            <button
              onClick={() => setStatusFilter("aktiv")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === "aktiv"
                  ? "bg-green-500/15 text-green-400"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Aktive Mieter
            </button>
            <button
              onClick={() => setStatusFilter("frueher")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === "frueher"
                  ? "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Frühere Mieter
            </button>
            <button
              onClick={() => setStatusFilter("alle")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === "alle"
                  ? "bg-blue-500/15 text-blue-400"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Alle
            </button>
          </div>
        </div>
      </div>

      {/* Mieter Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMieter?.map((m) => {
          const mv = getMietverhaeltnis(m);
          const isAktiv = mv && !mv.auszugsdatum;

          return (
            <div
              key={m.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/mieter/${m.id}`)}
            >
              <div className="p-4">
                {/* Row 1: Name + Status badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">{getDisplayName(m)}</h3>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      isAktiv
                        ? "bg-green-500/15 text-green-400"
                        : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {isAktiv ? "Aktiv" : "Früher"}
                  </span>
                </div>

                {/* Row 2: Einheit/Objekt + Kaltmiete */}
                {mv && (
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-[var(--text-secondary)] truncate">
                      {mv.einheit ? `${mv.einheit.objekt?.bezeichnung} - ${mv.einheit.einheitNr}` : "–"}
                    </span>
                    <span className="shrink-0 font-semibold text-[var(--text-primary)]">
                      {parseFloat(mv.kaltmiete.toString()).toFixed(2)} €
                    </span>
                  </div>
                )}

                {/* Row 3: Contact info (compact, no SVG icons) */}
                {(m.email || m.telefonMobil || m.telefon) && (
                  <div className="text-xs text-[var(--text-muted)] truncate">
                    {m.email && <span>{m.email}</span>}
                    {m.email && (m.telefonMobil || m.telefon) && <span className="mx-1.5">·</span>}
                    {(m.telefonMobil || m.telefon) && <span>{m.telefonMobil || m.telefon}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredMieter?.length === 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-[var(--text-primary)]">Keine Mieter gefunden</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Beginnen Sie, indem Sie einen neuen Mieter erstellen.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Neuer Mieter
          </button>
        </div>
      )}

      {/* Modal */}
      <ErweiterterMieterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          utils.mieter.list.invalidate();
          utils.mieter.stats.invalidate();
        }}
      />
    </div>
  );
}
