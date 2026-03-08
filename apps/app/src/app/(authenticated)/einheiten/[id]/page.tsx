"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { EinheitBearbeitenModal } from "@/components/einheiten/EinheitBearbeitenModal";
import { NeuerVertragModal } from "@/components/vertraege/NeuerVertragModal";

export default function EinheitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const utils = trpc.useUtils();
  const id = params.id as string;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVertragModalOpen, setIsVertragModalOpen] = useState(false);

  const { data: einheit, isLoading } = trpc.einheiten.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-[var(--text-secondary)]">Laden...</div>
      </div>
    );
  }

  if (!einheit) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Einheit nicht gefunden</h2>
          <button
            onClick={() => router.push("/einheiten")}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const aktiveMV = einheit.mietverhaeltnisse?.find(
    (mv) => !mv.auszugsdatum
  );

  const getTypLabel = (typ: string) => {
    switch (typ) {
      case "WOHNUNG": return "Wohnung";
      case "GEWERBE": return "Gewerbe";
      case "STELLPLATZ": return "Stellplatz";
      case "LAGER": return "Lager";
      default: return typ;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERMIETET":
        return "bg-green-500/15 text-green-400";
      case "VERFUEGBAR":
        return "bg-yellow-500/15 text-yellow-400";
      case "KUENDIGUNG":
        return "bg-orange-500/15 text-orange-400";
      case "SANIERUNG":
        return "bg-red-500/15 text-red-400";
      case "RESERVIERT":
        return "bg-purple-500/15 text-purple-400";
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

  const kaltmiete = aktiveMV ? parseFloat(aktiveMV.kaltmiete.toString()) : 0;
  const bk = aktiveMV ? parseFloat(aktiveMV.bkVorauszahlung.toString()) : 0;
  const hk = aktiveMV ? parseFloat(aktiveMV.hkVorauszahlung.toString()) : 0;
  const warmmiete = kaltmiete + bk + hk;
  const flaeche = parseFloat(einheit.flaeche.toString());
  const kaltmieteProQm = flaeche > 0 ? (kaltmiete / flaeche).toFixed(2) : "–";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/objekte/${einheit.objektId}`)}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zu {einheit.objekt?.bezeichnung}
        </button>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] shadow-sm hover:bg-[var(--bg-card-hover)]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Bearbeiten
        </button>
      </div>

      {/* Einheit title */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
        <div className="border-b border-[var(--border)] bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Einheit {einheit.einheitNr}
              </h1>
              <p className="mt-1 text-[var(--text-secondary)]">
                {einheit.objekt?.bezeichnung}
              </p>
            </div>
            <span
              className={`ml-auto inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(einheit.status)}`}
            >
              {getStatusLabel(einheit.status)}
            </span>
          </div>
        </div>

        {/* Stammdaten */}
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Stammdaten</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-[var(--text-secondary)]">Typ</dt>
              <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">{getTypLabel(einheit.typ)}</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--text-secondary)]">Lage</dt>
              <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                {(einheit as { lage?: string | null }).lage ?? "–"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--text-secondary)]">Fläche</dt>
              <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">{einheit.flaeche.toString()} m²</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--text-secondary)]">Zimmer</dt>
              <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">{einheit.zimmer ?? "–"}</dd>
            </div>
            {einheit.ausstattung && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-sm text-[var(--text-secondary)]">Ausstattung</dt>
                <dd className="mt-1 text-sm font-medium text-[var(--text-primary)] whitespace-pre-wrap">
                  {einheit.ausstattung}
                </dd>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aktives Mietverhältnis */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Aktives Mietverhältnis</h2>
        </div>

        {aktiveMV ? (
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-[var(--text-secondary)]">Mieter</dt>
                <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {aktiveMV.mieter.firma
                    ? aktiveMV.mieter.firma
                    : `${aktiveMV.mieter.vorname ?? ""} ${aktiveMV.mieter.nachname}`.trim()}
                </dd>
              </div>
              {aktiveMV.mieter.email && (
                <div>
                  <dt className="text-sm text-[var(--text-secondary)]">E-Mail</dt>
                  <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">{aktiveMV.mieter.email}</dd>
                </div>
              )}
              {aktiveMV.mieter.telefon && (
                <div>
                  <dt className="text-sm text-[var(--text-secondary)]">Telefon</dt>
                  <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">{aktiveMV.mieter.telefon}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-[var(--text-secondary)]">Einzugsdatum</dt>
                <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {new Date(aktiveMV.einzugsdatum).toLocaleDateString("de-DE")}
                </dd>
              </div>
            </div>

            <hr className="my-5 border-[var(--border)]" />

            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Mietzahlungen</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
              <div>
                <dt className="text-sm text-[var(--text-secondary)]">Kaltmiete</dt>
                <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {kaltmiete.toFixed(2)} €
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--text-secondary)]">BK-Vorauszahlung</dt>
                <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {bk.toFixed(2)} €
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--text-secondary)]">HK-Vorauszahlung</dt>
                <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {hk.toFixed(2)} €
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--text-secondary)]">Warmmiete</dt>
                <dd className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                  {warmmiete.toFixed(2)} €
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--text-secondary)]">Kaltmiete/m²</dt>
                <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {kaltmieteProQm} €
                </dd>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-[var(--text-primary)]">Kein aktives Mietverhältnis</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Diese Einheit ist derzeit nicht vermietet.
            </p>
            <button
              onClick={() => setIsVertragModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Mietverhältnis anlegen
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <EinheitBearbeitenModal
        isOpen={isEditModalOpen}
        einheit={
          isEditModalOpen
            ? {
                id: einheit.id,
                einheitNr: einheit.einheitNr,
                typ: einheit.typ as "WOHNUNG" | "GEWERBE" | "STELLPLATZ" | "LAGER",
                flaeche: einheit.flaeche.toString(),
                zimmer: einheit.zimmer,
                lage: (einheit as { lage?: string | null }).lage ?? null,
                eurProQm: einheit.eurProQm?.toString() ?? null,
                ausstattung: einheit.ausstattung,
              }
            : null
        }
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          utils.einheiten.getById.invalidate({ id });
        }}
      />
      <NeuerVertragModal
        isOpen={isVertragModalOpen}
        onClose={() => setIsVertragModalOpen(false)}
        onSuccess={() => {
          utils.einheiten.getById.invalidate({ id });
        }}
        defaultEinheitId={einheit.id}
      />
    </div>
  );
}
