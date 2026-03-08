"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";

const KATEGORIEN = [
  "ARCHITEKT",
  "AUFZUG",
  "BRANDSCHUTZ",
  "DACH",
  "ELEKTRIKER",
  "GARTEN",
  "GUTACHTER",
  "HAUSMEISTER",
  "HAUSREINIGUNG",
  "HEIZUNG",
  "IT_TELEKOM",
  "KLIMA_LUEFTUNG",
  "MAKLER",
  "MALER",
  "RECHTSANWALT",
  "REINIGUNG",
  "SANITAER",
  "SCHAEDLINGSBEKAEMPFUNG",
  "SCHLUESSELDIENST",
  "SCHREINER",
  "SONSTIGES",
  "STEUERBERATER",
  "UMZUG",
  "VERSICHERUNG",
];

const KATEGORIE_LABELS: Record<string, string> = {
  ARCHITEKT: "Architekt",
  AUFZUG: "Aufzug",
  BRANDSCHUTZ: "Brandschutz",
  DACH: "Dach",
  ELEKTRIKER: "Elektriker",
  GARTEN: "Garten",
  GUTACHTER: "Gutachter",
  HAUSMEISTER: "Hausmeister",
  HAUSREINIGUNG: "Hausreinigung",
  HEIZUNG: "Heizung",
  IT_TELEKOM: "IT / Telekom",
  KLIMA_LUEFTUNG: "Klima / Lüftung",
  MAKLER: "Makler",
  MALER: "Maler",
  RECHTSANWALT: "Rechtsanwalt",
  REINIGUNG: "Reinigung",
  SANITAER: "Sanitär",
  SCHAEDLINGSBEKAEMPFUNG: "Schädlingsbekämpfung",
  SCHLUESSELDIENST: "Schlüsseldienst",
  SCHREINER: "Schreiner",
  SONSTIGES: "Sonstiges",
  STEUERBERATER: "Steuerberater",
  UMZUG: "Umzug",
  VERSICHERUNG: "Versicherung",
};

function getKategorieLabel(kategorie: string): string {
  return KATEGORIE_LABELS[kategorie] || kategorie;
}

export default function DienstleisterPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", telefon: "", email: "", kategorie: "", notiz: "" });
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: dienstleister, isLoading, refetch } = trpc.dienstleister.list.useQuery();
  const createMutation = trpc.dienstleister.create.useMutation({ onSuccess: () => { refetch(); setShowForm(false); resetForm(); } });
  const updateMutation = trpc.dienstleister.update.useMutation({ onSuccess: () => { refetch(); setEditId(null); resetForm(); } });
  const deleteMutation = trpc.dienstleister.delete.useMutation({ onSuccess: () => refetch() });

  const resetForm = () => setForm({ name: "", telefon: "", email: "", kategorie: "", notiz: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, ...form });
        setSuccessMsg("Dienstleister aktualisiert");
      } else {
        await createMutation.mutateAsync(form);
        setSuccessMsg("Dienstleister erstellt");
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleEdit = (d: { id: string; name: string; telefon: string | null; email: string | null; kategorie: string | null; notiz: string | null }) => {
    setEditId(d.id);
    setForm({ name: d.name, telefon: d.telefon || "", email: d.email || "", kategorie: d.kategorie || "", notiz: d.notiz || "" });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Dienstleister wirklich löschen?")) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  if (isLoading) return <div className="p-8">Laden...</div>;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dienstleister</h1>
          <p className="mt-2 text-[var(--text-secondary)]">Handwerker und Servicepartner verwalten</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); resetForm(); }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Neuer Dienstleister
        </button>
      </div>

      {successMsg && <div className="mb-4 rounded border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">{successMsg}</div>}
      {errorMsg && <div className="mb-4 rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMsg}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">{editId ? "Dienstleister bearbeiten" : "Neuer Dienstleister"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Kategorie</label>
              <select value={form.kategorie} onChange={(e) => setForm({ ...form, kategorie: e.target.value })}
                className="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Keine</option>
                {KATEGORIEN.map((k) => <option key={k} value={k}>{getKategorieLabel(k)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Telefon</label>
              <input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                className="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">E-Mail</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Notiz</label>
              <textarea value={form.notiz} onChange={(e) => setForm({ ...form, notiz: e.target.value })} rows={2}
                className="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {createMutation.isPending || updateMutation.isPending ? "Speichern..." : "Speichern"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); resetForm(); }}
              className="rounded border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
        {!dienstleister?.length ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-[var(--text-primary)]">Keine Dienstleister</h3>
            <p className="mt-2 text-[var(--text-secondary)]">Fügen Sie Ihren ersten Dienstleister hinzu.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-page)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Kategorie</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Kontakt</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Tickets</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              {dienstleister.map((d) => (
                <tr key={d.id} className="hover:bg-[var(--bg-card-hover)]">
                  <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{d.name}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{d.kategorie ? getKategorieLabel(d.kategorie) : "—"}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {d.telefon && <div>{d.telefon}</div>}
                    {d.email && <div className="text-blue-400">{d.email}</div>}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-[var(--text-secondary)]">{d._count?.tickets || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(d)} className="mr-2 text-sm text-blue-400 hover:text-blue-300">Bearbeiten</button>
                    <button onClick={() => handleDelete(d.id)} className="text-sm text-red-400 hover:text-red-300">Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
