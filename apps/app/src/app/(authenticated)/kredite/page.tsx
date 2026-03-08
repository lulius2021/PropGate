"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function KreditePage() {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    bezeichnung: "",
    bank: "",
    referenznummer: "",
    startdatum: "",
    auszahlungsdatum: "",
    ursprungsbetrag: "",
    rate: "",
    zinssatz: "",
    laufzeitMonate: "",
    zinsbindungBis: "",
    laufzeitEnde: "",
    zahlungsfrequenz: "MONATLICH",
    notizen: "",
  });

  const { data: kredite, isLoading, refetch } = trpc.kredite.list.useQuery();
  const { data: stats } = trpc.kredite.stats.useQuery();

  const createMutation = trpc.kredite.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowDialog(false);
      setFormData({
        bezeichnung: "",
        bank: "",
        referenznummer: "",
        startdatum: "",
        auszahlungsdatum: "",
        ursprungsbetrag: "",
        rate: "",
        zinssatz: "",
        laufzeitMonate: "",
        zinsbindungBis: "",
        laufzeitEnde: "",
        zahlungsfrequenz: "MONATLICH",
        notizen: "",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        bezeichnung: formData.bezeichnung,
        bank: formData.bank,
        referenznummer: formData.referenznummer || undefined,
        startdatum: new Date(formData.startdatum),
        auszahlungsdatum: formData.auszahlungsdatum
          ? new Date(formData.auszahlungsdatum)
          : undefined,
        ursprungsbetrag: parseFloat(formData.ursprungsbetrag),
        rate: parseFloat(formData.rate),
        zinssatz: parseFloat(formData.zinssatz) / 100, // Convert % to decimal
        laufzeitMonate: parseInt(formData.laufzeitMonate),
        zinsbindungBis: formData.zinsbindungBis
          ? new Date(formData.zinsbindungBis)
          : undefined,
        laufzeitEnde: formData.laufzeitEnde
          ? new Date(formData.laufzeitEnde)
          : undefined,
        zahlungsfrequenz: formData.zahlungsfrequenz,
        notizen: formData.notizen || undefined,
      });
      alert("Kredit erfolgreich erstellt!");
    } catch (error) {
      alert(`Fehler: ${(error as Error).message}`);
    }
  };

  if (isLoading) {
    return <div>Laden...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Kreditverwaltung</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Übersicht über Finanzierungen und Darlehen
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>+ Neues Darlehen</Button>
      </div>

      {/* Statistiken */}
      {stats && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-[var(--text-secondary)]">Anzahl Darlehen</div>
            <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
              {stats.gesamt}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-[var(--text-secondary)]">Restschuld gesamt</div>
            <div className="mt-1 text-2xl font-bold text-red-400">
              {stats.gesamtRestschuld} €
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-[var(--text-secondary)]">Gesamt-Rate (monatlich)</div>
            <div className="mt-1 text-2xl font-bold text-blue-400">
              {stats.gesamtRate} €
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-[var(--text-secondary)]">
              Zinsbindung endet (12 Mon.)
            </div>
            <div className="mt-1 text-2xl font-bold text-orange-400">
              {stats.zinsbindungAuslaufend}
            </div>
          </Card>
        </div>
      )}

      {/* Dialog für neues Darlehen */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-[var(--bg-card)] p-6">
            <h2 className="mb-4 text-xl font-bold">Neues Darlehen anlegen</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Grunddaten */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Bezeichnung *
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.bezeichnung}
                    onChange={(e) =>
                      setFormData({ ...formData, bezeichnung: e.target.value })
                    }
                    placeholder="z.B. Objektfinanzierung Musterstraße 1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Bank *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.bank}
                      onChange={(e) =>
                        setFormData({ ...formData, bank: e.target.value })
                      }
                      placeholder="z.B. Sparkasse"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Referenznummer
                    </label>
                    <Input
                      type="text"
                      value={formData.referenznummer}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          referenznummer: e.target.value,
                        })
                      }
                      placeholder="z.B. 123456789"
                    />
                  </div>
                </div>

                {/* Datums-Felder */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Startdatum *
                    </label>
                    <Input
                      type="date"
                      required
                      value={formData.startdatum}
                      onChange={(e) =>
                        setFormData({ ...formData, startdatum: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Auszahlungsdatum
                    </label>
                    <Input
                      type="date"
                      value={formData.auszahlungsdatum}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          auszahlungsdatum: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Finanzielle Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Ursprungsbetrag * (€)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={formData.ursprungsbetrag}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ursprungsbetrag: e.target.value,
                        })
                      }
                      placeholder="z.B. 250000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Monatliche Rate * (€)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={formData.rate}
                      onChange={(e) =>
                        setFormData({ ...formData, rate: e.target.value })
                      }
                      placeholder="z.B. 1200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Zinssatz * (%)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={formData.zinssatz}
                      onChange={(e) =>
                        setFormData({ ...formData, zinssatz: e.target.value })
                      }
                      placeholder="z.B. 3.25"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Laufzeit * (Monate)
                    </label>
                    <Input
                      type="number"
                      required
                      value={formData.laufzeitMonate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          laufzeitMonate: e.target.value,
                        })
                      }
                      placeholder="z.B. 360"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Zinsbindung bis
                    </label>
                    <Input
                      type="date"
                      value={formData.zinsbindungBis}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          zinsbindungBis: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Notizen
                  </label>
                  <textarea
                    className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
                    rows={3}
                    value={formData.notizen}
                    onChange={(e) =>
                      setFormData({ ...formData, notizen: e.target.value })
                    }
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabelle */}
      {kredite && kredite.length === 0 ? (
        <Card className="border-dashed border-[var(--border)] bg-[var(--bg-page)] p-12 text-center">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            Keine Darlehen erfasst
          </h3>
          <p className="mt-2 text-[var(--text-secondary)]">
            Erfassen Sie Ihre Finanzierungen für bessere Übersicht.
          </p>
          <Button className="mt-4" onClick={() => setShowDialog(true)}>
            Darlehen anlegen
          </Button>
        </Card>
      ) : (
        <Card>
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-page)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Bezeichnung
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Bank
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Ursprungsbetrag
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Rate (mtl.)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Zinssatz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Laufzeit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Sondertilgungen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              {kredite?.map((kredit) => (
                <tr
                  key={kredit.id}
                  className="cursor-pointer hover:bg-[var(--bg-card-hover)]"
                  onClick={() => router.push(`/kredite/${kredit.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-[var(--text-primary)]">
                      {kredit.bezeichnung}
                    </div>
                    {kredit.referenznummer && (
                      <div className="text-xs text-[var(--text-secondary)]">
                        Ref: {kredit.referenznummer}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {kredit.bank}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-[var(--text-primary)]">
                    {parseFloat(kredit.ursprungsbetrag).toLocaleString("de-DE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    €
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-[var(--text-primary)]">
                    {parseFloat(kredit.rate).toLocaleString("de-DE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    €
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-[var(--text-secondary)]">
                    {(parseFloat(kredit.zinssatz) * 100).toFixed(2)} %
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {kredit.laufzeitMonate} Monate
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex rounded-full bg-blue-500/15 px-2 text-xs font-semibold leading-5 text-blue-400">
                      {kredit.sondertilgungen?.length || 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
