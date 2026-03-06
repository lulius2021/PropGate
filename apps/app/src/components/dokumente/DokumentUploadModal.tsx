"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc/client";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const KATEGORIEN = [
  { value: "RECHNUNG", label: "Rechnung" },
  { value: "MIETVERTRAG", label: "Mietvertrag" },
  { value: "MAHNUNG", label: "Mahnung" },
  { value: "ZAEHLERABLESUNG", label: "Zählerablesung" },
  { value: "DARLEHEN", label: "Darlehen" },
  { value: "SONSTIGES", label: "Sonstiges" },
];

export function DokumentUploadModal({ open, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [typ, setTyp] = useState("SONSTIGES");
  const [objektId, setObjektId] = useState("");
  const [einheitId, setEinheitId] = useState("");
  const [notiz, setNotiz] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: objekte } = trpc.objekte.list.useQuery();
  const { data: einheiten } = trpc.einheiten.list.useQuery(
    { objektId: objektId || undefined },
    { enabled: !!objektId }
  );

  const uploadMutation = trpc.dokumente.upload.useMutation({
    onSuccess: () => {
      setSuccess(true);
      utils.dokumente.list.invalidate();
      setTimeout(() => {
        setSuccess(false);
        setFile(null);
        setObjektId("");
        setEinheitId("");
        setNotiz("");
        onSuccess?.();
        onClose();
      }, 1500);
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const handleFile = (f: File) => {
    if (f.size > 10 * 1024 * 1024) {
      setError("Datei zu groß. Maximum 10 MB.");
      return;
    }
    setFile(f);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const handleSubmit = () => {
    if (!file) {
      setError("Bitte eine Datei auswählen");
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        dateiname: file.name,
        mimeType: file.type as any,
        dateiinhalt: base64,
        groesse: file.size,
        typ: typ as any,
        objektId: objektId || undefined,
        einheitId: einheitId || undefined,
        notiz: notiz || undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-[var(--bg-card)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Beleg hochladen</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-secondary)]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-sm font-medium text-green-700">
            Dokument erfolgreich hochgeladen!
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Drop Zone */}
            <div
              className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                isDragging ? "border-blue-400 bg-blue-50" : "border-[var(--border)] hover:border-[var(--border)]"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{file.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto mb-2 h-10 w-10 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Datei hierher ziehen oder{" "}
                    <span className="text-blue-400">auswählen</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">PDF, Bilder, max. 10 MB</p>
                </div>
              )}
            </div>

            {/* Kategorie */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Kategorie</label>
              <select
                value={typ}
                onChange={(e) => setTyp(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {KATEGORIEN.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </div>

            {/* Objekt */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Objekt (optional)</label>
              <select
                value={objektId}
                onChange={(e) => { setObjektId(e.target.value); setEinheitId(""); }}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Kein Objekt --</option>
                {objekte?.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.bezeichnung}</option>
                ))}
              </select>
            </div>

            {/* Einheit (nur wenn Objekt gewählt) */}
            {objektId && (
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Einheit (optional)</label>
                <select
                  value={einheitId}
                  onChange={(e) => setEinheitId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Alle Einheiten --</option>
                  {einheiten?.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.einheitNr}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Notiz */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Notiz (optional)</label>
              <textarea
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Notiz zum Dokument..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploadMutation.isPending || !file}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {uploadMutation.isPending ? "Hochladen..." : "Hochladen"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
