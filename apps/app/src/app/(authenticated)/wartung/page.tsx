"use client";

import { trpc } from "@/lib/trpc/client";
import { useState, useMemo } from "react";

const KATEGORIEN = ["HEIZUNG", "AUFZUG", "BRANDSCHUTZ", "RAUCHWARNMELDER", "ELEKTRIK", "SANITAER", "DACH", "AUFZUG_TUV", "SONSTIGES"];

const KATEGORIE_LABELS: Record<string, string> = {
  HEIZUNG: "Heizung",
  AUFZUG: "Aufzug",
  BRANDSCHUTZ: "Brandschutz",
  RAUCHWARNMELDER: "Rauchwarnmelder",
  ELEKTRIK: "Elektrik",
  SANITAER: "Sanitär",
  DACH: "Dach",
  AUFZUG_TUV: "Aufzug TÜV",
  SONSTIGES: "Sonstiges",
};

const daysUntil = (date: Date | string) => {
  const d = new Date(date);
  const today = new Date();
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

type FilterStatus = "alle" | "offen" | "erledigt";

export default function WartungPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    bezeichnung: "", kategorie: "", intervallMonate: 12,
    naechsteFaelligkeit: new Date().toISOString().split("T")[0],
    verantwortlicher: "", notiz: "", objektId: "", einheitId: "",
  });
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("alle");
  const [filterObjektId, setFilterObjektId] = useState("");

  const { data: aufgaben, isLoading, refetch } = trpc.wartung.list.useQuery();
  const { data: faellig7 } = trpc.wartung.listFaelligIn.useQuery({ tage: 7 });
  const { data: faellig30 } = trpc.wartung.listFaelligIn.useQuery({ tage: 30 });
  const { data: objekteEinheiten } = trpc.wartung.objekteUndEinheiten.useQuery();

  const createMutation = trpc.wartung.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setSuccessMsg("Aufgabe erstellt"); resetForm(); },
  });
  const erledigtMutation = trpc.wartung.erledigt.useMutation({
    onSuccess: () => { refetch(); setSuccessMsg("Aufgabe als erledigt markiert"); },
  });
  const undoErledigt = trpc.wartung.undoErledigt.useMutation({
    onSuccess: () => { refetch(); setSuccessMsg("Erledigt rückgängig gemacht"); },
  });
  const deleteMutation = trpc.wartung.delete.useMutation({ onSuccess: () => refetch() });

  const resetForm = () => {
    setForm({
      bezeichnung: "", kategorie: "", intervallMonate: 12,
      naechsteFaelligkeit: new Date().toISOString().split("T")[0],
      verantwortlicher: "", notiz: "", objektId: "", einheitId: "",
    });
  };

  // Einheiten filtered by selected Objekt in the form
  const formEinheiten = useMemo(() => {
    if (!objekteEinheiten?.einheiten || !form.objektId) return [];
    return objekteEinheiten.einheiten.filter((e) => e.objektId === form.objektId);
  }, [objekteEinheiten?.einheiten, form.objektId]);

  // Filtered list
  const filteredAufgaben = useMemo(() => {
    if (!aufgaben) return [];
    return aufgaben.filter((a) => {
      if (filterStatus === "offen" && a.letzteAusfuehrung) return false;
      if (filterStatus === "erledigt" && !a.letzteAusfuehrung) return false;
      if (filterObjektId && a.objektId !== filterObjektId) return false;
      return true;
    });
  }, [aufgaben, filterStatus, filterObjektId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      await createMutation.mutateAsync({
        bezeichnung: form.bezeichnung,
        kategorie: form.kategorie,
        intervallMonate: form.intervallMonate,
        naechsteFaelligkeit: new Date(form.naechsteFaelligkeit),
        verantwortlicher: form.verantwortlicher || undefined,
        notiz: form.notiz || undefined,
        objektId: form.objektId || undefined,
        einheitId: form.einheitId || undefined,
      });
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  // Auto-dismiss success messages
  if (successMsg) {
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  if (isLoading) return <div className="p-8">Laden...</div>;

  const countErledigt = aufgaben?.filter((a) => a.letzteAusfuehrung).length ?? 0;
  const countOffen = (aufgaben?.length ?? 0) - countErledigt;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Wartungsplan</h1>
          <p className="mt-2 text-[var(--text-secondary)]">Pflichtprüfungen und Wartungsintervalle verwalten</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Neue Aufgabe
        </button>
      </div>

      {successMsg && <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{successMsg}</div>}
      {errorMsg && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMsg}</div>}

      {/* Stats Widgets */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={`rounded-lg border p-4 ${faellig7?.length ? "border-red-200 bg-red-50" : "border-[var(--border)] bg-[var(--bg-card)]"}`}>
          <div className="text-sm font-medium text-[var(--text-secondary)]">Fällig in 7 Tagen</div>
          <div className={`mt-1 text-2xl font-bold ${faellig7?.length ? "text-red-400" : "text-[var(--text-primary)]"}`}>{faellig7?.length || 0}</div>
        </div>
        <div className={`rounded-lg border p-4 ${(faellig30?.length || 0) > (faellig7?.length || 0) ? "border-orange-200 bg-orange-50" : "border-[var(--border)] bg-[var(--bg-card)]"}`}>
          <div className="text-sm font-medium text-[var(--text-secondary)]">Fällig in 30 Tagen</div>
          <div className={`mt-1 text-2xl font-bold ${(faellig30?.length || 0) > (faellig7?.length || 0) ? "text-orange-400" : "text-[var(--text-primary)]"}`}>{faellig30?.length || 0}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="text-sm font-medium text-[var(--text-secondary)]">Offen</div>
          <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{countOffen}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="text-sm font-medium text-[var(--text-secondary)]">Erledigt</div>
          <div className="mt-1 text-2xl font-bold text-green-400">{countErledigt}</div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-[var(--text-primary)]">Neue Wartungsaufgabe</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Bezeichnung *</label>
              <input required value={form.bezeichnung} onChange={(e) => setForm({ ...form, bezeichnung: e.target.value })}
                placeholder="z.B. Heizungswartung"
                className="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Kategorie *</label>
              <select required value={form.kategorie} onChange={(e) => setForm({ ...form, kategorie: e.target.value })}
                className="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)]">
                <option value="">Auswählen...</option>
                {KATEGORIEN.map((k) => <option key={k} value={k}>{KATEGORIE_LABELS[k] || k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Intervall (Monate)</label>
              <input type="number" min={1} value={form.intervallMonate} onChange={(e) => setForm({ ...form, intervallMonate: parseInt(e.target.value) || 12 })}
                className="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Nächste Fälligkeit</label>
              <input type="date" value={form.naechsteFaelligkeit} onChange={(e) => setForm({ ...form, naechsteFaelligkeit: e.target.value })}
                className="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Verantwortlicher</label>
              <input value={form.verantwortlicher} onChange={(e) => setForm({ ...form, verantwortlicher: e.target.value })}
                placeholder="z.B. Herr Müller"
                className="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Objekt</label>
              <select value={form.objektId} onChange={(e) => setForm({ ...form, objektId: e.target.value, einheitId: "" })}
                className="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)]">
                <option value="">Kein Objekt</option>
                {objekteEinheiten?.objekte.map((o) => (
                  <option key={o.id} value={o.id}>{o.bezeichnung}</option>
                ))}
              </select>
            </div>
            {form.objektId && formEinheiten.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Einheit</label>
                <select value={form.einheitId} onChange={(e) => setForm({ ...form, einheitId: e.target.value })}
                  className="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)]">
                  <option value="">Keine Einheit</option>
                  {formEinheiten.map((e) => (
                    <option key={e.id} value={e.id}>{e.einheitNr}{e.lage ? ` (${e.lage})` : ""}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={createMutation.isPending} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {createMutation.isPending ? "Erstelle..." : "Erstellen"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="rounded border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-secondary)]">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-1">
          {(["alle", "offen", "erledigt"] as FilterStatus[]).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${filterStatus === s ? "bg-blue-600 text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"}`}>
              {s === "alle" ? "Alle" : s === "offen" ? "Offen" : "Erledigt"}
            </button>
          ))}
        </div>
        {objekteEinheiten && objekteEinheiten.objekte.length > 0 && (
          <select value={filterObjektId} onChange={(e) => setFilterObjektId(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)]">
            <option value="">Alle Objekte</option>
            {objekteEinheiten.objekte.map((o) => (
              <option key={o.id} value={o.id}>{o.bezeichnung}</option>
            ))}
          </select>
        )}
        <span className="text-sm text-[var(--text-muted)]">{filteredAufgaben.length} Aufgabe{filteredAufgaben.length !== 1 ? "n" : ""}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
        {!filteredAufgaben.length ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-[var(--text-primary)]">Keine Wartungsaufgaben</h3>
            <p className="mt-2 text-[var(--text-secondary)]">
              {filterStatus !== "alle" || filterObjektId
                ? "Keine Aufgaben für den gewählten Filter."
                : "Erstellen Sie Ihre ersten Wartungsintervalle."}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-page)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Aufgabe</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Kategorie</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Objekt / Einheit</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Nächste Fälligkeit</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Intervall</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              {filteredAufgaben.map((a) => {
                const days = daysUntil(a.naechsteFaelligkeit);
                const istErledigt = !!a.letzteAusfuehrung;
                return (
                  <tr key={a.id} className={`hover:bg-[var(--bg-card-hover)] ${istErledigt ? "opacity-70" : ""}`}>
                    {/* Status badge */}
                    <td className="px-6 py-4">
                      {istErledigt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-semibold text-green-400">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          Erledigt
                        </span>
                      ) : days <= 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                          Überfällig
                        </span>
                      ) : days <= 7 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                          Dringend
                        </span>
                      ) : days <= 30 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-semibold text-orange-400">
                          Bald fällig
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                          Geplant
                        </span>
                      )}
                    </td>
                    {/* Bezeichnung */}
                    <td className="px-6 py-4">
                      <div className={`font-medium ${istErledigt ? "text-[var(--text-secondary)] line-through" : "text-[var(--text-primary)]"}`}>
                        {a.bezeichnung}
                      </div>
                      {a.verantwortlicher && (
                        <div className="mt-0.5 text-xs text-[var(--text-muted)]">{a.verantwortlicher}</div>
                      )}
                    </td>
                    {/* Kategorie */}
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{KATEGORIE_LABELS[a.kategorie] || a.kategorie}</td>
                    {/* Objekt / Einheit */}
                    <td className="px-6 py-4">
                      {a.objektName ? (
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)]">{a.objektName}</div>
                          {a.einheitName && (
                            <div className="text-xs text-[var(--text-muted)]">{a.einheitName}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">--</span>
                      )}
                    </td>
                    {/* Fälligkeit */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--text-primary)]">{new Date(a.naechsteFaelligkeit).toLocaleDateString("de-DE")}</div>
                      {!istErledigt && (
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${days <= 7 ? "bg-red-500/15 text-red-400" : days <= 30 ? "bg-orange-500/15 text-orange-400" : "bg-green-500/15 text-green-400"}`}>
                          {days <= 0 ? "Überfällig" : `in ${days} Tagen`}
                        </span>
                      )}
                      {istErledigt && a.letzteAusfuehrung && (
                        <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                          Zuletzt: {new Date(a.letzteAusfuehrung).toLocaleDateString("de-DE")}
                        </div>
                      )}
                    </td>
                    {/* Intervall */}
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">alle {a.intervallMonate} Monate</td>
                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {istErledigt ? (
                          <button onClick={() => undoErledigt.mutate({ id: a.id })} disabled={undoErledigt.isPending}
                            title="Zurücksetzen auf unerledigt"
                            className="inline-flex items-center gap-1 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50 transition-colors">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                            Unerledigt
                          </button>
                        ) : (
                          <button onClick={() => erledigtMutation.mutate({ id: a.id })} disabled={erledigtMutation.isPending}
                            title="Als erledigt markieren"
                            className="inline-flex items-center gap-1 rounded-md border border-green-500/30 bg-green-500/10 px-2.5 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-colors">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            Erledigt
                          </button>
                        )}
                        <button onClick={() => confirm("Wartungsaufgabe wirklich löschen?") && deleteMutation.mutate({ id: a.id })}
                          title="Löschen"
                          className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
