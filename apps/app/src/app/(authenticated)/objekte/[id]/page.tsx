"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ObjektImage } from "@/components/objekte/ObjektImage";
import { ErweiterterObjektModal } from "@/components/objekte/ErweiterterObjektModal";
import { NeueEinheitModal } from "@/components/einheiten/NeueEinheitModal";
import { toast } from "sonner";

export default function ObjektDetailPage() {
  const params = useParams();
  const router = useRouter();
  const utils = trpc.useUtils();
  const objektId = params.id as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEinheitModalOpen, setIsEinheitModalOpen] = useState(false);
  const [addDienstleisterOpen, setAddDienstleisterOpen] = useState(false);

  const { data: objekt, isLoading } = trpc.objekte.getById.useQuery({ id: objektId });
  const { data: zustaendigeDL, refetch: refetchDL } = trpc.dienstleister.listByObjekt.useQuery({ objektId });
  const { data: alleDL } = trpc.dienstleister.list.useQuery();

  const addZustaendigkeit = trpc.dienstleister.addObjektZustaendigkeit.useMutation({
    onSuccess: () => { refetchDL(); setAddDienstleisterOpen(false); toast.success("Dienstleister zugeordnet"); },
    onError: (err) => toast.error(err.message),
  });
  const removeZustaendigkeit = trpc.dienstleister.removeObjektZustaendigkeit.useMutation({
    onSuccess: () => { refetchDL(); toast.success("Zuordnung entfernt"); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-[var(--text-secondary)]">Laden...</div>
      </div>
    );
  }

  if (!objekt) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Objekt nicht gefunden</h2>
          <button
            onClick={() => router.push("/objekte")}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERMIETET":
        return "bg-green-500/15 text-green-400";
      case "VERFUEGBAR":
        return "bg-yellow-500/15 text-yellow-400";
      default:
        return "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "VERMIETET": return "Vermietet";
      case "VERFUEGBAR": return "Verfügbar";
      case "KUENDIGUNG": return "Kündigung";
      case "SANIERUNG": return "Sanierung";
      case "RESERVIERT": return "Reserviert";
      default: return status;
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

  return (
    <div className="space-y-6">
      {/* Header mit Zurück-Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/objekte")}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Zurück
        </button>
      </div>

      {/* Objektübersicht */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
        <div className="border-b border-[var(--border)] bg-gradient-to-r from-blue-500/10 to-blue-500/5 px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Objekt-Bild */}
              <ObjektImage
                bildUrl={objekt.bildUrl}
                alt={objekt.bezeichnung}
                size="large"
              />
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">{objekt.bezeichnung}</h1>
                <p className="mt-1 text-lg text-[var(--text-secondary)]">
                  {objekt.strasse}, {objekt.plz} {objekt.ort}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center rounded-full bg-blue-500/15 px-3 py-1 text-sm font-medium text-blue-400">
                    {objekt.objektart}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {objekt.einheiten.length} Einheiten
                  </span>
                  {objekt.gesamtflaeche && (
                    <span className="text-sm text-[var(--text-secondary)]">
                      {objekt.gesamtflaeche.toString()} m²
                    </span>
                  )}
                  {objekt.baujahr && (
                    <span className="text-sm text-[var(--text-secondary)]">
                      Baujahr {objekt.baujahr}
                    </span>
                  )}
                  {objekt.heizungsart && (
                    <span className="text-sm text-[var(--text-secondary)]">
                      {objekt.heizungsart}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] shadow-sm hover:bg-[var(--bg-card-hover)]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Objekt bearbeiten
            </button>
          </div>
        </div>

        {/* Notizen */}
        {objekt.notizen && (
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">Notizen</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{objekt.notizen}</p>
          </div>
        )}
      </div>

      {/* Einheiten */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Einheiten ({objekt.einheiten.length})
            </h2>
            <button
              onClick={() => setIsEinheitModalOpen(true)}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Neue Einheit
            </button>
          </div>
        </div>

        {objekt.einheiten.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-[var(--text-primary)]">Keine Einheiten vorhanden</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Erstellen Sie die erste Einheit für dieses Objekt.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--bg-page)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Einheit-Nr
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Typ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Fläche
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Zimmer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Lage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Aktueller Mieter
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
                {objekt.einheiten.map((einheit) => {
                  const aktiveMV = einheit.mietverhaeltnisse?.find(
                    (mv) => !mv.auszugsdatum
                  );
                  const mieterName = aktiveMV
                    ? aktiveMV.mieter.firma
                      ? aktiveMV.mieter.firma
                      : `${aktiveMV.mieter.vorname ?? ""} ${aktiveMV.mieter.nachname}`.trim()
                    : "Leer";

                  return (
                    <tr
                      key={einheit.id}
                      onClick={() => router.push(`/einheiten/${einheit.id}`)}
                      className="cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                        {einheit.einheitNr}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {getTypLabel(einheit.typ)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {einheit.flaeche.toString()} m²
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {einheit.zimmer ?? "–"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {(einheit as { lage?: string | null }).lage ?? "–"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(einheit.status)}`}
                        >
                          {getStatusLabel(einheit.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {mieterName}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Zuständige Dienstleister (H2) */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
        <div className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Zuständige Dienstleister</h2>
          <button
            onClick={() => setAddDienstleisterOpen(!addDienstleisterOpen)}
            className="rounded-md bg-[var(--bg-page)] border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          >
            + Zuordnen
          </button>
        </div>

        {addDienstleisterOpen && (
          <div className="border-b border-[var(--border)] px-6 py-4 bg-[var(--bg-page)]">
            <p className="text-sm text-[var(--text-secondary)] mb-2">Dienstleister auswählen:</p>
            <div className="flex flex-wrap gap-2">
              {alleDL?.filter((d) => !zustaendigeDL?.some((z) => z.dienstleisterId === d.id)).map((d) => (
                <button
                  key={d.id}
                  onClick={() => addZustaendigkeit.mutate({ dienstleisterId: d.id, objektId })}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                >
                  {d.name} {d.kategorie ? `(${d.kategorie})` : ""}
                </button>
              ))}
              {alleDL?.length === zustaendigeDL?.length && (
                <span className="text-sm text-[var(--text-muted)]">Alle Dienstleister bereits zugeordnet.</span>
              )}
            </div>
          </div>
        )}

        <div className="p-6">
          {zustaendigeDL && zustaendigeDL.length > 0 ? (
            <div className="space-y-2">
              {zustaendigeDL.map((z) => (
                <div key={z.dienstleisterId} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-2">
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{z.dienstleister.name}</span>
                    {z.dienstleister.kategorie && (
                      <span className="ml-2 text-xs text-[var(--text-secondary)]">{z.dienstleister.kategorie}</span>
                    )}
                    {z.dienstleister.telefon && (
                      <span className="ml-3 text-xs text-[var(--text-muted)]">{z.dienstleister.telefon}</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeZustaendigkeit.mutate({ dienstleisterId: z.dienstleisterId, objektId })}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">Noch keine Dienstleister zugeordnet.</p>
          )}
        </div>
      </div>

      {/* Bearbeiten-Modal */}
      <ErweiterterObjektModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          utils.objekte.getById.invalidate({ id: objektId });
        }}
        objektId={objektId}
      />

      {/* Neue Einheit Modal */}
      <NeueEinheitModal
        isOpen={isEinheitModalOpen}
        onClose={() => setIsEinheitModalOpen(false)}
        onSuccess={() => {
          utils.objekte.getById.invalidate({ id: objektId });
        }}
        defaultObjektId={objekt.id}
      />
    </div>
  );
}
