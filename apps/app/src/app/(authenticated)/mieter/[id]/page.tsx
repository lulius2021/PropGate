"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ErweiterterMieterModal } from "@/components/mieter/ErweiterterMieterModal";
import { toast } from "sonner";

export default function MieterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const utils = trpc.useUtils();
  const mieterId = params.id as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notizText, setNotizText] = useState("");

  const { data: mieter, isLoading } = trpc.mieter.getById.useQuery({ id: mieterId });
  const { data: notizen, refetch: refetchNotizen } = trpc.mieter.listNotizen.useQuery({ mieterId });

  const addNotizMutation = trpc.mieter.addNotiz.useMutation({
    onSuccess: () => {
      setNotizText("");
      refetchNotizen();
      toast.success("Notiz gespeichert");
    },
    onError: (err) => toast.error("Fehler: " + err.message),
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-[var(--text-secondary)]">Laden...</div>
      </div>
    );
  }

  if (!mieter) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Mieter nicht gefunden</h2>
          <button
            onClick={() => router.push("/mieter")}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const displayName = mieter.firma || `${mieter.vorname || ""} ${mieter.nachname}`.trim();
  const aktiveMietverhaeltnisse = mieter.mietverhaeltnisse?.filter((mv) => !mv.auszugsdatum) || [];
  const fruehereMietverhaeltnisse = mieter.mietverhaeltnisse?.filter((mv) => mv.auszugsdatum) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/mieter")}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Zurück
        </button>
      </div>

      {/* Mieter-Übersicht */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
        <div className="border-b border-[var(--border)] bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <span className="text-2xl font-semibold">
                  {displayName[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">{displayName}</h1>
                {mieter.firma && mieter.vorname && mieter.nachname && (
                  <p className="mt-1 text-lg text-[var(--text-secondary)]">
                    Ansprechpartner: {mieter.vorname} {mieter.nachname}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-4">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    mieter.typ === "PRIVAT" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"
                  }`}>
                    {mieter.typ === "PRIVAT" ? "Privat" : "Geschäftlich"}
                  </span>
                  {aktiveMietverhaeltnisse.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-green-500/15 px-3 py-1 text-sm font-medium text-green-400">
                      Aktiver Mieter
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Mieter bearbeiten
            </button>
          </div>
        </div>

        {/* Kontaktdaten */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Kontaktdaten</h3>
            <div className="space-y-2 text-sm">
              {mieter.email && (
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[var(--text-secondary)]">{mieter.email}</span>
                </div>
              )}
              {mieter.telefonMobil && (
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[var(--text-secondary)]">{mieter.telefonMobil} (Mobil)</span>
                </div>
              )}
              {mieter.telefonFestnetz && (
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-[var(--text-secondary)]">{mieter.telefonFestnetz} (Festnetz)</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Adresse</h3>
            <div className="text-sm text-[var(--text-secondary)]">
              {mieter.strasse && <div>{mieter.strasse} {mieter.hausnummer}</div>}
              {(mieter.plz || mieter.ort) && <div>{mieter.plz} {mieter.ort}</div>}
              {mieter.land && <div>{mieter.land}</div>}
              {!mieter.strasse && !mieter.plz && <span className="text-[var(--text-muted)]">Keine Adresse hinterlegt</span>}
            </div>
          </div>

          {mieter.geburtsdatum && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Geburtsdatum</h3>
              <div className="text-sm text-[var(--text-secondary)]">
                {new Date(mieter.geburtsdatum).toLocaleDateString("de-DE")}
              </div>
            </div>
          )}

          {mieter.notfallkontaktName && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Notfallkontakt</h3>
              <div className="text-sm text-[var(--text-secondary)]">
                <div>{mieter.notfallkontaktName}</div>
                {mieter.notfallkontaktBeziehung && <div className="text-[var(--text-secondary)]">{mieter.notfallkontaktBeziehung}</div>}
                {mieter.notfallkontaktTelefon && <div>{mieter.notfallkontaktTelefon}</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Aktive Mietverhältnisse */}
      {aktiveMietverhaeltnisse.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          <div className="border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Aktive Mietverhältnisse</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {aktiveMietverhaeltnisse.map((mv) => (
              <div key={mv.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">
                      {mv.einheit.objekt?.bezeichnung} - Einheit {mv.einheit.einheitNr}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {mv.einheit.objekt?.strasse}, {mv.einheit.objekt?.plz} {mv.einheit.objekt?.ort}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400">
                    Aktiv
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--text-secondary)]">Einzug</span>
                    <div className="font-semibold text-[var(--text-primary)]">
                      {new Date(mv.einzugsdatum).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Kaltmiete</span>
                    <div className="font-semibold text-[var(--text-primary)]">
                      {parseFloat(String(mv.kaltmiete)).toFixed(2)} €
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Nebenkosten</span>
                    <div className="font-semibold text-[var(--text-primary)]">
                      {parseFloat(String(mv.bkVorauszahlung)).toFixed(2)} €
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Warmmiete</span>
                    <div className="font-semibold text-blue-400">
                      {(parseFloat(String(mv.kaltmiete)) + parseFloat(String(mv.bkVorauszahlung)) + parseFloat(String(mv.hkVorauszahlung))).toFixed(2)} €
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frühere Mietverhältnisse */}
      {fruehereMietverhaeltnisse.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          <div className="border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Frühere Mietverhältnisse</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {fruehereMietverhaeltnisse.map((mv) => (
              <div key={mv.id} className="p-6 bg-[var(--bg-page)]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[var(--text-secondary)]">
                      {mv.einheit.objekt?.bezeichnung} - Einheit {mv.einheit.einheitNr}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {new Date(mv.einzugsdatum).toLocaleDateString("de-DE")} - {mv.auszugsdatum ? new Date(mv.auszugsdatum).toLocaleDateString("de-DE") : "unbefristet"}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[var(--bg-card-hover)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                    Beendet
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--text-secondary)]">Dauer</span>
                    <div className="font-semibold text-[var(--text-secondary)]">
                      {mv.auszugsdatum ? Math.round((new Date(mv.auszugsdatum).getTime() - new Date(mv.einzugsdatum).getTime()) / (1000 * 60 * 60 * 24 * 30)) : "—"} Monate
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Letzte Kaltmiete</span>
                    <div className="font-semibold text-[var(--text-secondary)]">
                      {parseFloat(String(mv.kaltmiete)).toFixed(2)} €
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notizen (statisches Freitext-Feld) */}
      {mieter.notizen && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Stammnotiz</h3>
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{mieter.notizen}</p>
        </div>
      )}

      {/* Notizen-Timeline */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Kommentare & Verlauf</h2>
        </div>
        <div className="p-6 space-y-4">
          {/* Neue Notiz */}
          <div className="flex gap-3">
            <textarea
              value={notizText}
              onChange={(e) => setNotizText(e.target.value)}
              placeholder="Notiz hinzufügen..."
              rows={3}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => notizText.trim() && addNotizMutation.mutate({ mieterId, inhalt: notizText.trim() })}
              disabled={!notizText.trim() || addNotizMutation.isPending}
              className="self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {addNotizMutation.isPending ? "..." : "Speichern"}
            </button>
          </div>

          {/* Timeline */}
          {notizen && notizen.length > 0 ? (
            <div className="space-y-3">
              {notizen.map((n) => (
                <div key={n.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-semibold text-blue-400">
                    {(n.user?.name || n.user?.email || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 rounded-lg bg-[var(--bg-page)] border border-[var(--border)] px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        {n.user?.name || n.user?.email || "Unbekannt"}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(n.createdAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{n.inhalt}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">Noch keine Kommentare.</p>
          )}
        </div>
      </div>

      {/* Modal */}
      <ErweiterterMieterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          utils.mieter.getById.invalidate({ id: mieterId });
        }}
        mieterId={mieterId}
      />
    </div>
  );
}
