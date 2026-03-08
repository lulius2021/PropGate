"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

// This page needs to be outside the (authenticated) group to be public
// It uses a tRPC publicProcedure to submit tickets

export default function IntakePage({ params }: { params: { einheitToken: string } }) {
  const [form, setForm] = useState({
    kategorie: "SCHADENSMELDUNG",
    beschreibung: "",
    kontaktName: "",
    kontaktTelefon: "",
  });
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState("");

  const submitMutation = trpc.tickets.intakeSubmit.useMutation({
    onSuccess: (ticket) => setSubmitted(ticket.id),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.beschreibung.trim()) {
      setError("Bitte beschreiben Sie das Problem.");
      return;
    }
    await submitMutation.mutateAsync({
      einheitToken: params.einheitToken,
      kategorie: form.kategorie as "SCHADENSMELDUNG" | "WARTUNG" | "ANFRAGE" | "BESCHWERDE",
      beschreibung: form.beschreibung,
      kontaktName: form.kontaktName,
      kontaktTelefon: form.kontaktTelefon,
    });
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] p-4">
        <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Meldung eingereicht!</h2>
          <p className="text-[var(--text-secondary)]">Ihre Meldung wurde erfolgreich übermittelt.</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Ticket-ID: <code className="rounded bg-[var(--bg-card-hover)] px-2 py-1 text-xs">{submitted.slice(-8).toUpperCase()}</code></p>
          <p className="mt-4 text-sm text-[var(--text-secondary)]">Wir werden uns schnellstmöglich um Ihr Anliegen kümmern.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-card)] p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <span className="text-xl font-bold text-white">P</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Schadenmeldung / Anfrage</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Melden Sie uns ein Problem oder eine Anfrage</p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)]">Art der Meldung</label>
            <select value={form.kategorie} onChange={(e) => setForm({ ...form, kategorie: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="SCHADENSMELDUNG">Schadensmeldung</option>
              <option value="ANFRAGE">Allgemeine Anfrage</option>
              <option value="BESCHWERDE">Beschwerde</option>
              <option value="WARTUNG">Wartungsanfrage</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)]">Beschreibung *</label>
            <textarea
              required
              value={form.beschreibung}
              onChange={(e) => setForm({ ...form, beschreibung: e.target.value })}
              rows={4}
              placeholder="Bitte beschreiben Sie das Problem so genau wie möglich..."
              className="mt-1 block w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Ihr Name (optional)</label>
              <input value={form.kontaktName} onChange={(e) => setForm({ ...form, kontaktName: e.target.value })}
                placeholder="Max Mustermann"
                className="mt-1 block w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Telefon (optional)</label>
              <input value={form.kontaktTelefon} onChange={(e) => setForm({ ...form, kontaktTelefon: e.target.value })}
                placeholder="0170 1234567"
                className="mt-1 block w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitMutation.isPending ? "Wird gesendet..." : "Meldung absenden"}
          </button>
        </form>
      </div>
    </div>
  );
}
