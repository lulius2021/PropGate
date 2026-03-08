"use client";

import { trpc } from "@/lib/trpc/client";
import { useState, useEffect, useRef } from "react";

const MAHNSTUFE_LABELS: Record<string, string> = {
  ERINNERUNG: "Zahlungserinnerung",
  MAHNUNG_1: "1. Mahnung",
  MAHNUNG_2: "2. Mahnung",
  MAHNUNG_3: "3. Mahnung (letzte)",
};

type Tab = "vorschlaege" | "alle" | "zustellprotokoll";

export default function MahnungenPage() {
  const [activeTab, setActiveTab] = useState<Tab>("vorschlaege");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: mahnungen, isLoading } = trpc.mahnungen.list.useQuery();
  const { data: vorschlaege, isLoading: vorschlaegeLoading } =
    trpc.mahnungen.vorschlaege.useQuery();
  const { data: stats } = trpc.mahnungen.stats.useQuery();

  const invalidateAll = () => {
    utils.mahnungen.list.invalidate();
    utils.mahnungen.vorschlaege.invalidate();
    utils.mahnungen.stats.invalidate();
  };

  const erstellenMutation = trpc.mahnungen.erstellen.useMutation({
    onSuccess: () => {
      invalidateAll();
    },
  });

  const updateStatusMutation = trpc.mahnungen.updateStatus.useMutation({
    onSuccess: () => {
      invalidateAll();
      setOpenDropdownId(null);
    },
  });

  const sperrenMutation = trpc.mahnungen.sperren.useMutation({
    onSuccess: () => {
      invalidateAll();
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Auto-clear error message after 5 seconds
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const handleErstellen = async (
    mietverhaeltnisId: string,
    mahnstufe: "ERINNERUNG" | "MAHNUNG_1" | "MAHNUNG_2" | "MAHNUNG_3"
  ) => {
    const label = MAHNSTUFE_LABELS[mahnstufe] ?? mahnstufe;
    if (
      confirm(
        `Möchten Sie wirklich eine ${label} für dieses Mietverhältnis erstellen?`
      )
    ) {
      setSuccessMsg("");
      setErrorMsg("");
      try {
        const result = await erstellenMutation.mutateAsync({
          mietverhaeltnisId,
          mahnstufe,
          dokumentGenerieren: true,
        });
        if ((result as { dokumentFehler?: boolean })?.dokumentFehler) {
          setSuccessMsg(`${label} erstellt — Dokument konnte nicht generiert werden.`);
        } else {
          setSuccessMsg(`${label} erfolgreich erstellt!`);
        }
      } catch (error) {
        setErrorMsg(`Fehler: ${(error as Error).message}`);
      }
    }
  };

  const handleStatusChange = async (mahnungId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: mahnungId,
        status: newStatus as "OFFEN" | "VERSENDET" | "BEZAHLT" | "STORNIERT" | "STRITTIG" | "INKASSO",
      });
      setSuccessMsg(`Status auf ${newStatus} geändert.`);
    } catch (error) {
      setErrorMsg(`Fehler: ${(error as Error).message}`);
    }
  };

  const handleSperren = async (mietverhaeltnisId: string) => {
    if (confirm("Mahnvorschlag für dieses Mietverhältnis sperren?")) {
      try {
        await sperrenMutation.mutateAsync({ mietverhaeltnisId });
        setSuccessMsg("Mahnvorschlag gesperrt.");
      } catch (error) {
        setErrorMsg(`Fehler: ${(error as Error).message}`);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OFFEN":
        return "bg-orange-500/15 text-orange-400";
      case "VERSENDET":
        return "bg-blue-500/15 text-blue-400";
      case "BEZAHLT":
        return "bg-green-500/15 text-green-400";
      case "STORNIERT":
        return "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]";
      case "STRITTIG":
        return "bg-yellow-500/15 text-yellow-400";
      case "INKASSO":
        return "bg-gray-500/20 text-[var(--text-primary)] border border-[var(--border)]";
      default:
        return "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]";
    }
  };

  if (isLoading || vorschlaegeLoading) {
    return <div>Laden...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Mahnwesen</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Verwaltung von Mahnungen und Zahlungserinnerungen
          </p>
        </div>
      </div>

      {/* Inline Success Banner */}
      {successMsg && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-800">{successMsg}</p>
        </div>
      )}

      {/* Inline Error Banner */}
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">{errorMsg}</p>
        </div>
      )}

      {/* Statistiken */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Offene Mahnungen</div>
            <div className="mt-1 text-2xl font-bold text-orange-400">
              {stats.offen.anzahl}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {stats.offen.summe.toFixed(2)} €
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Versendet</div>
            <div className="mt-1 text-2xl font-bold text-blue-400">
              {stats.versendet.anzahl}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {stats.versendet.summe.toFixed(2)} €
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setActiveTab("vorschlaege")}
          className={`rounded px-4 py-2 text-sm font-medium ${
            activeTab === "vorschlaege"
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Vorschläge ({vorschlaege?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("alle")}
          className={`rounded px-4 py-2 text-sm font-medium ${
            activeTab === "alle"
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Alle Mahnungen ({mahnungen?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("zustellprotokoll")}
          className={`rounded px-4 py-2 text-sm font-medium ${
            activeTab === "zustellprotokoll"
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Zustellprotokoll
        </button>
      </div>

      {/* Mahnvorschläge */}
      {activeTab === "vorschlaege" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          {vorschlaege && vorschlaege.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-[var(--text-primary)]">
                Keine Mahnvorschläge
              </h3>
              <p className="mt-2 text-[var(--text-secondary)]">
                Aktuell gibt es keine überfälligen Zahlungen.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--bg-page)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Mieter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Objekt / Einheit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Offener Betrag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Offene Posten
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Tage überfällig
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Empfohlen
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Aktion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
                {vorschlaege?.map((vorschlag) => (
                  <tr key={vorschlag.mietverhaeltnisId} className="hover:bg-[var(--bg-card-hover)]">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--text-primary)]">
                        {vorschlag.mieter.nachname}
                      </div>
                      {vorschlag.mieter.firma && (
                        <div className="text-xs text-[var(--text-secondary)]">
                          {vorschlag.mieter.firma}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {vorschlag.objekt.bezeichnung} - {vorschlag.einheit.einheitNr}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-red-400">
                      {vorschlag.offenerBetrag.toFixed(2)} €
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {vorschlag.offeneSollstellungen?.map((s: { titel: string }) => s.titel).join(", ") || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-red-500/15 px-2 text-xs font-semibold leading-5 text-red-400">
                        {vorschlag.tageUeberfaellig} Tage
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                      {MAHNSTUFE_LABELS[vorschlag.empfohleneStufe] ?? vorschlag.empfohleneStufe}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            handleErstellen(
                              vorschlag.mietverhaeltnisId,
                              vorschlag.empfohleneStufe
                            )
                          }
                          disabled={erstellenMutation.isPending}
                          className="rounded bg-orange-600 px-3 py-1 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
                        >
                          {erstellenMutation.isPending ? "..." : "Erstellen"}
                        </button>
                        <button
                          onClick={() => handleSperren(vorschlag.mietverhaeltnisId)}
                          disabled={sperrenMutation.isPending}
                          className="rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
                        >
                          Sperren
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Alle Mahnungen */}
      {activeTab === "alle" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          {mahnungen && mahnungen.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-[var(--text-primary)]">
                Keine Mahnungen vorhanden
              </h3>
              <p className="mt-2 text-[var(--text-secondary)]">
                Es wurden noch keine Mahnungen erstellt.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--bg-page)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Mieter / Objekt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Mahnstufe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Offene Posten
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Offener Betrag
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Gebühren
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Dokument
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
                {mahnungen?.map((mahnung) => (
                  <tr key={mahnung.id} className="hover:bg-[var(--bg-card-hover)]">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--text-primary)]">
                        {mahnung.mietverhaeltnis?.mieter?.nachname || "—"}
                        {mahnung.mietverhaeltnis?.mieter?.vorname ? `, ${mahnung.mietverhaeltnis.mieter.vorname}` : ""}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {mahnung.mietverhaeltnis?.einheit?.objekt?.bezeichnung || ""}{" "}
                        {mahnung.mietverhaeltnis?.einheit?.einheitNr ? `/ ${mahnung.mietverhaeltnis.einheit.einheitNr}` : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-[var(--text-primary)]">
                      {MAHNSTUFE_LABELS[mahnung.mahnstufe] ?? mahnung.mahnstufe}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {mahnung.offeneSollstellungen && mahnung.offeneSollstellungen.length > 0
                        ? mahnung.offeneSollstellungen.map((s: { titel: string }) => s.titel).join(", ")
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {new Date(mahnung.mahnDatum).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-[var(--text-primary)]">
                      {mahnung.offenerBetrag} €
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[var(--text-secondary)]">
                      {(parseFloat(mahnung.mahngebuehr) + parseFloat(mahnung.verzugszinsen)).toFixed(2)} €
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(mahnung.status)}`}
                      >
                        {mahnung.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {mahnung.dokumentGeneriert ? (
                        <span className="text-green-400">Generiert</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">Nicht generiert</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block" ref={openDropdownId === mahnung.id ? dropdownRef : undefined}>
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === mahnung.id ? null : mahnung.id)}
                          className="rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                        >
                          Status ändern
                        </button>
                        {openDropdownId === mahnung.id && (
                          <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-1 shadow-lg">
                            {["OFFEN", "VERSENDET", "BEZAHLT", "STORNIERT", "STRITTIG", "INKASSO"]
                              .filter((s) => s !== mahnung.status)
                              .map((status) => (
                                <button
                                  key={status}
                                  onClick={() => handleStatusChange(mahnung.id, status)}
                                  className="block w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                                >
                                  <span className={`mr-2 inline-block h-2 w-2 rounded-full ${getStatusColor(status).split(" ")[0]}`} />
                                  {status}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Zustellprotokoll */}
      {activeTab === "zustellprotokoll" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-[var(--text-primary)]">
              Zustellprotokoll
            </h3>
            <p className="mt-2 text-[var(--text-secondary)]">
              Zustellprotokolle werden in einer zukünftigen Version angezeigt.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
