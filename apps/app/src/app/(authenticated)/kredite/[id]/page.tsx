"use client";

import { trpc } from "@/lib/trpc/client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function KreditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const kreditId = params.id as string;

  const [showSondertilgungDialog, setShowSondertilgungDialog] = useState(false);
  const [sondertilgungData, setSondertilgungData] = useState({
    datum: "",
    betrag: "",
    notiz: "",
  });

  const { data: kredit, isLoading, refetch } = trpc.kredite.getById.useQuery({
    id: kreditId,
  });
  const { data: tilgungsplanData } = trpc.kredite.getTilgungsplan.useQuery({
    id: kreditId,
  });

  const createSondertilgungMutation =
    trpc.kredite.createSondertilgung.useMutation({
      onSuccess: () => {
        refetch();
        setShowSondertilgungDialog(false);
        setSondertilgungData({ datum: "", betrag: "", notiz: "" });
      },
    });

  const deleteSondertilgungMutation =
    trpc.kredite.deleteSondertilgung.useMutation({
      onSuccess: () => {
        refetch();
      },
    });

  const handleCreateSondertilgung = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSondertilgungMutation.mutateAsync({
        kreditId,
        datum: new Date(sondertilgungData.datum),
        betrag: parseFloat(sondertilgungData.betrag),
        notiz: sondertilgungData.notiz || undefined,
      });
      alert("Sondertilgung erfolgreich erstellt!");
    } catch (error) {
      alert(`Fehler: ${(error as Error).message}`);
    }
  };

  const handleDeleteSondertilgung = async (id: string) => {
    if (confirm("Möchten Sie diese Sondertilgung wirklich löschen?")) {
      try {
        await deleteSondertilgungMutation.mutateAsync({ id });
        alert("Sondertilgung gelöscht!");
      } catch (error) {
        alert(`Fehler: ${(error as Error).message}`);
      }
    }
  };

  if (isLoading) {
    return <div>Laden...</div>;
  }

  if (!kredit) {
    return <div>Darlehen nicht gefunden</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Button variant="outline" onClick={() => router.back()}>
            ← Zurück
          </Button>
          <h1 className="mt-4 text-3xl font-bold text-[var(--text-primary)]">
            {kredit.bezeichnung}
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">{kredit.bank}</p>
        </div>
        <Button onClick={() => setShowSondertilgungDialog(true)}>
          + Sondertilgung
        </Button>
      </div>

      {/* Stammdaten */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-[var(--text-secondary)]">Ursprungsbetrag</div>
          <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            {parseFloat(kredit.ursprungsbetrag).toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            €
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--text-secondary)]">Aktuelle Restschuld</div>
          <div className="mt-1 text-2xl font-bold text-red-400">
            {parseFloat(kredit.restschuld).toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            €
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--text-secondary)]">Monatliche Rate</div>
          <div className="mt-1 text-2xl font-bold text-blue-400">
            {parseFloat(kredit.rate).toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            €
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--text-secondary)]">Zinssatz</div>
          <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            {(parseFloat(kredit.zinssatz) * 100).toFixed(2)} %
          </div>
        </Card>
      </div>

      {/* Details */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 text-xl font-bold">Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-[var(--text-secondary)]">Referenznummer</div>
            <div className="font-medium">{kredit.referenznummer || "-"}</div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)]">Startdatum</div>
            <div className="font-medium">
              {new Date(kredit.startdatum).toLocaleDateString("de-DE")}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)]">Auszahlungsdatum</div>
            <div className="font-medium">
              {kredit.auszahlungsdatum
                ? new Date(kredit.auszahlungsdatum).toLocaleDateString("de-DE")
                : "-"}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)]">Laufzeit</div>
            <div className="font-medium">
              {kredit.laufzeitMonate} Monate (
              {Math.floor(kredit.laufzeitMonate / 12)} Jahre)
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)]">Zinsbindung bis</div>
            <div className="font-medium">
              {kredit.zinsbindungBis
                ? new Date(kredit.zinsbindungBis).toLocaleDateString("de-DE")
                : "-"}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)]">Laufzeitende</div>
            <div className="font-medium">
              {kredit.laufzeitEnde
                ? new Date(kredit.laufzeitEnde).toLocaleDateString("de-DE")
                : "-"}
            </div>
          </div>
        </div>
        {kredit.notizen && (
          <div className="mt-4">
            <div className="text-sm text-[var(--text-secondary)]">Notizen</div>
            <div className="mt-1 whitespace-pre-wrap">{kredit.notizen}</div>
          </div>
        )}
      </Card>

      {/* Sondertilgungen */}
      {kredit.sondertilgungen && kredit.sondertilgungen.length > 0 && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="mb-4 text-xl font-bold">Sondertilgungen</h2>
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--bg-page)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Betrag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Notiz
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Aktion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
                {kredit.sondertilgungen.map((st) => (
                  <tr key={st.id}>
                    <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                      {new Date(st.datum).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-[var(--text-primary)]">
                      {parseFloat(st.betrag).toLocaleString("de-DE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      €
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {st.notiz || "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSondertilgung(st.id)}
                      >
                        Löschen
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tilgungsplan */}
      {tilgungsplanData && (
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-xl font-bold">Tilgungsplan</h2>

            {/* Gesamtkosten */}
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-[var(--bg-page)] p-3">
                <div className="text-sm text-[var(--text-secondary)]">Gesamtzinsen</div>
                <div className="text-lg font-bold text-orange-400">
                  {tilgungsplanData.gesamtkosten.gesamtzinsen.toLocaleString(
                    "de-DE",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}{" "}
                  €
                </div>
              </div>
              <div className="rounded-lg bg-[var(--bg-page)] p-3">
                <div className="text-sm text-[var(--text-secondary)]">Gesamttilgung</div>
                <div className="text-lg font-bold text-blue-400">
                  {tilgungsplanData.gesamtkosten.gesamttilgung.toLocaleString(
                    "de-DE",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}{" "}
                  €
                </div>
              </div>
              <div className="rounded-lg bg-[var(--bg-page)] p-3">
                <div className="text-sm text-[var(--text-secondary)]">Gesamtkosten</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">
                  {tilgungsplanData.gesamtkosten.gesamtkosten.toLocaleString(
                    "de-DE",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}{" "}
                  €
                </div>
              </div>
            </div>

            {/* Tabelle */}
            <div className="max-h-[600px] overflow-y-auto">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="sticky top-0 bg-[var(--bg-page)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Monat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Restschuld
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Zinsen
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Tilgung
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Sondertilgung
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Neue Restschuld
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
                  {tilgungsplanData.plan.map((eintrag, index) => (
                    <tr
                      key={index}
                      className={
                        eintrag.sondertilgung > 0 ? "bg-blue-50" : ""
                      }
                    >
                      <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                        {eintrag.monat}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {new Date(eintrag.datum).toLocaleDateString("de-DE", {
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[var(--text-primary)]">
                        {eintrag.restschuld.toLocaleString("de-DE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-orange-400">
                        {eintrag.zinsen.toLocaleString("de-DE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-blue-400">
                        {eintrag.tilgung.toLocaleString("de-DE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-[var(--text-primary)]">
                        {eintrag.rate.toLocaleString("de-DE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        {eintrag.sondertilgung > 0 ? (
                          <Badge variant="default">
                            {eintrag.sondertilgung.toLocaleString("de-DE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-[var(--text-primary)]">
                        {eintrag.restschuldNachZahlung.toLocaleString(
                          "de-DE",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Dialog für Sondertilgung */}
      {showSondertilgungDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-[var(--bg-card)] p-6">
            <h2 className="mb-4 text-xl font-bold">
              Sondertilgung hinzufügen
            </h2>
            <form onSubmit={handleCreateSondertilgung}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Datum *
                  </label>
                  <Input
                    type="date"
                    required
                    value={sondertilgungData.datum}
                    onChange={(e) =>
                      setSondertilgungData({
                        ...sondertilgungData,
                        datum: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Betrag * (€)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={sondertilgungData.betrag}
                    onChange={(e) =>
                      setSondertilgungData({
                        ...sondertilgungData,
                        betrag: e.target.value,
                      })
                    }
                    placeholder="z.B. 10000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Notiz
                  </label>
                  <textarea
                    className="w-full rounded border border-[var(--border)] px-3 py-2"
                    rows={2}
                    value={sondertilgungData.notiz}
                    onChange={(e) =>
                      setSondertilgungData({
                        ...sondertilgungData,
                        notiz: e.target.value,
                      })
                    }
                    placeholder="Optional..."
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSondertilgungDialog(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={createSondertilgungMutation.isPending}
                >
                  {createSondertilgungMutation.isPending
                    ? "Speichern..."
                    : "Speichern"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
