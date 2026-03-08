"use client";

import { trpc } from "@/lib/trpc/client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const getTypColor = (typ: string) => {
  switch (typ) {
    case "STROM":
      return "bg-yellow-500/15 text-yellow-400";
    case "GAS":
      return "bg-orange-500/15 text-orange-400";
    case "WASSER_KALT":
      return "bg-blue-500/15 text-blue-400";
    case "WASSER_WARM":
      return "bg-red-500/15 text-red-400";
    case "WAERME":
      return "bg-purple-500/15 text-purple-400";
    default:
      return "bg-gray-500/15 text-gray-400";
  }
};

const ablesungsTypOptions = ["REGULAER", "EINZUG", "AUSZUG"] as const;

export default function ZaehlerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const today = new Date().toISOString().split("T")[0];
  const [datum, setDatum] = useState(today);
  const [stand, setStand] = useState("");
  const [ablesesTyp, setAblesesTyp] = useState<(typeof ablesungsTypOptions)[number]>("REGULAER");
  const [notiz, setNotiz] = useState("");

  const utils = trpc.useUtils();

  const { data: zaehler, isLoading, error } = trpc.zaehler.getById.useQuery({ id });

  const erfasseStandMutation = trpc.zaehler.erfasseStand.useMutation({
    onSuccess: () => {
      toast.success("Zählerstand erfolgreich erfasst");
      utils.zaehler.getById.invalidate({ id });
      setStand("");
      setNotiz("");
      setAblesesTyp("REGULAER");
      setDatum(new Date().toISOString().split("T")[0]);
    },
    onError: (err) => {
      toast.error("Fehler beim Erfassen: " + err.message);
    },
  });

  if (isLoading) {
    return <div className="p-4">Laden...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-400">Fehler: {error.message}</div>;
  }

  if (!zaehler) {
    return <div className="p-4 text-[var(--text-secondary)]">Zaehler nicht gefunden.</div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stand || !datum) {
      toast.error("Bitte Datum und Stand ausfüllen");
      return;
    }
    const standNum = parseFloat(stand);
    if (isNaN(standNum) || standNum < 0) {
      toast.error("Stand muss eine positive Zahl sein");
      return;
    }
    erfasseStandMutation.mutate({
      zaehlerId: zaehler.id,
      datum: new Date(datum),
      stand: standNum,
      ablesesTyp,
      notiz: notiz || undefined,
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push("/zaehler")}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Zurück zu Zähler
        </button>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold leading-5 ${getTypColor(zaehler.typ)}`}
        >
          {zaehler.typ}
        </span>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Zähler {zaehler.zaehlernummer}
        </h1>
      </div>

      {/* Info: Objekt / Einheit */}
      <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
        <div className="text-xs font-medium uppercase text-[var(--text-secondary)] mb-2">
          Zuordnung
        </div>
        <div className="flex gap-4">
          {zaehler.objekt && (
            <button
              onClick={() => router.push(`/objekte/${zaehler.objekt!.id}`)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Objekt: {zaehler.objekt.bezeichnung} &rarr;
            </button>
          )}
          {zaehler.einheit && (
            <button
              onClick={() => router.push(`/einheiten/${zaehler.einheit!.id}`)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Einheit: {zaehler.einheit.einheitNr} &rarr;
            </button>
          )}
          {!zaehler.objekt && !zaehler.einheit && (
            <span className="text-sm text-[var(--text-secondary)]">Keine Zuordnung</span>
          )}
        </div>
      </div>

      {/* Ablese-Historie */}
      <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Ablese-Historie</h2>
        </div>
        {zaehler.ablesungen && zaehler.ablesungen.length > 0 ? (
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-page)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Stand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Typ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Notiz
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              {zaehler.ablesungen.map((a) => (
                <tr key={a.id} className="hover:bg-[var(--bg-card-hover)]">
                  <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                    {new Date(a.datum).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                    {typeof a.stand === "object" && a.stand !== null
                      ? a.stand.toNumber()
                      : a.stand}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-gray-500/15 px-2 text-xs font-semibold leading-5 text-gray-400">
                      {a.ablesesTyp}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {a.notiz || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-center text-sm text-[var(--text-secondary)]">
            Noch keine Ablesungen vorhanden.
          </div>
        )}
      </div>

      {/* Neuen Zaehlerstand erfassen */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Neuen Zählerstand erfassen
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Datum
              </label>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Stand
              </label>
              <input
                type="number"
                step="0.01"
                value={stand}
                onChange={(e) => setStand(e.target.value)}
                placeholder="z.B. 12345.67"
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Typ
              </label>
              <select
                value={ablesesTyp}
                onChange={(e) =>
                  setAblesesTyp(e.target.value as (typeof ablesungsTypOptions)[number])
                }
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {ablesungsTypOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Notiz (optional)
              </label>
              <input
                type="text"
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                placeholder="Bemerkung..."
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={erfasseStandMutation.isPending || !stand || !datum}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {erfasseStandMutation.isPending ? "Speichern..." : "Zählerstand erfassen"}
          </button>
        </form>
      </div>
    </div>
  );
}
