"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ZaehlerPage() {
  const router = useRouter();
  const [typFilter, setTypFilter] = useState<
    "STROM" | "GAS" | "WASSER_KALT" | "WASSER_WARM" | "WAERME" | undefined
  >();
  const [showForm, setShowForm] = useState(false);
  const [formZaehlernummer, setFormZaehlernummer] = useState("");
  const [formTyp, setFormTyp] = useState<"STROM" | "GAS" | "WASSER_KALT" | "WASSER_WARM" | "WAERME">("STROM");
  const [formObjektId, setFormObjektId] = useState("");
  const [formEinheitId, setFormEinheitId] = useState("");

  const { data: zaehler, isLoading, refetch: refetchZaehler } = trpc.zaehler.list.useQuery({
    typ: typFilter,
  });
  const { data: stats } = trpc.zaehler.stats.useQuery();
  const { data: objekte } = trpc.objekte.list.useQuery();
  const { data: einheiten } = trpc.einheiten.list.useQuery({});

  const createZaehlerMutation = trpc.zaehler.create.useMutation({
    onSuccess: () => {
      refetchZaehler();
      setShowForm(false);
      setFormZaehlernummer("");
      setFormTyp("STROM");
      setFormObjektId("");
      setFormEinheitId("");
      toast.success("Zähler erstellt");
    },
    onError: (err) => {
      toast.error("Fehler: " + err.message);
    },
  });

  if (isLoading) {
    return <div>Laden...</div>;
  }

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
        return "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]";
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Zählerverwaltung</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Verwaltung von Strom-, Gas- und Wasserzählern
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + Neuer Zähler
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Neuen Zähler anlegen</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!formObjektId && !formEinheitId) {
                toast.error("Bitte ein Objekt oder eine Einheit auswählen");
                return;
              }
              // Backend erwartet entweder objektId ODER einheitId, nie beide.
              // Wenn eine Einheit gewählt ist, wird nur einheitId gesendet.
              createZaehlerMutation.mutate({
                zaehlernummer: formZaehlernummer,
                typ: formTyp,
                objektId: formEinheitId ? undefined : formObjektId || undefined,
                einheitId: formEinheitId || undefined,
              });
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Zählernummer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formZaehlernummer}
                  onChange={(e) => setFormZaehlernummer(e.target.value)}
                  placeholder="z.B. Z-12345"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Typ <span className="text-red-500">*</span>
                </label>
                <select
                  value={formTyp}
                  onChange={(e) => setFormTyp(e.target.value as typeof formTyp)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="STROM">Strom</option>
                  <option value="GAS">Gas</option>
                  <option value="WASSER_KALT">Wasser kalt</option>
                  <option value="WASSER_WARM">Wasser warm</option>
                  <option value="WAERME">Wärme</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Objekt <span className="text-red-500">*</span>
                </label>
                <select
                  value={formObjektId}
                  onChange={(e) => {
                    setFormObjektId(e.target.value);
                    setFormEinheitId("");
                  }}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Objekt auswählen...</option>
                  {objekte?.map((o) => (
                    <option key={o.id} value={o.id}>{o.bezeichnung}</option>
                  ))}
                </select>
              </div>

              {formObjektId && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Einheit (optional, präzisiert Zuordnung)
                  </label>
                  <select
                    value={formEinheitId}
                    onChange={(e) => setFormEinheitId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Dem Objekt zuordnen (nicht einer Einheit)</option>
                    {einheiten?.filter((e) => e.objektId === formObjektId).map((e) => (
                      <option key={e.id} value={e.id}>
                        Einheit {e.einheitNr}{e.lage ? ` – ${e.lage}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={createZaehlerMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createZaehlerMutation.isPending ? "Erstelle..." : "Erstellen"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Statistiken */}
      {stats && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Gesamt</div>
            <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
              {stats.gesamt}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Strom</div>
            <div className="mt-1 text-2xl font-bold text-yellow-400">
              {stats.strom}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Gas</div>
            <div className="mt-1 text-2xl font-bold text-orange-400">
              {stats.gas}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Wasser</div>
            <div className="mt-1 text-2xl font-bold text-blue-400">
              {stats.wasser}
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTypFilter(undefined)}
          className={`rounded px-3 py-1 text-sm ${
            !typFilter
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Alle
        </button>
        <button
          onClick={() => setTypFilter("STROM")}
          className={`rounded px-3 py-1 text-sm ${
            typFilter === "STROM"
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Strom
        </button>
        <button
          onClick={() => setTypFilter("GAS")}
          className={`rounded px-3 py-1 text-sm ${
            typFilter === "GAS"
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Gas
        </button>
        <button
          onClick={() => setTypFilter("WASSER_KALT")}
          className={`rounded px-3 py-1 text-sm ${
            typFilter === "WASSER_KALT"
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Wasser kalt
        </button>
        <button
          onClick={() => setTypFilter("WASSER_WARM")}
          className={`rounded px-3 py-1 text-sm ${
            typFilter === "WASSER_WARM"
              ? "bg-blue-600 text-white"
              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          Wasser warm
        </button>
      </div>

      {/* Tabelle */}
      {zaehler && zaehler.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-page)] p-12 text-center">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            Keine Zähler vorhanden
          </h3>
          <p className="mt-2 text-[var(--text-secondary)]">
            Legen Sie Ihren ersten Zähler an.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Zähler anlegen
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-page)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Zählernummer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Typ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Zuordnung
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Ablesungen
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              {zaehler?.map((z) => (
                <tr key={z.id} className="hover:bg-[var(--bg-card-hover)] cursor-pointer" onClick={() => router.push(`/zaehler/${z.id}`)}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-[var(--text-primary)]">
                      {z.zaehlernummer}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getTypColor(z.typ)}`}
                    >
                      {z.typ}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {z.objekt
                      ? `Objekt: ${z.objekt.bezeichnung}`
                      : z.einheit
                        ? `Einheit: ${z.einheit.einheitNr}`
                        : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {z._count.ablesungen} Ablesung(en)
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link
                      href={`/zaehler/${z.id}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
