"use client";

import { useState } from "react";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";

interface NeuesObjektModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NeuesObjektModal({ isOpen, onClose, onSuccess }: NeuesObjektModalProps) {
  const [formData, setFormData] = useState({
    bezeichnung: "",
    strasse: "",
    plz: "",
    ort: "",
    objektart: "WOHNHAUS" as "WOHNHAUS" | "GEWERBE" | "GEMISCHT",
    gesamtflaeche: "",
    bildUrl: "",
    notizen: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const createMutation = trpc.objekte.create.useMutation({
    onSuccess: () => {
      // Reset form
      setFormData({
        bezeichnung: "",
        strasse: "",
        plz: "",
        ort: "",
        objektart: "WOHNHAUS",
        gesamtflaeche: "",
        bildUrl: "",
        notizen: "",
      });
      setImagePreview(null);
      onSuccess();
      onClose();
    },
  });

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      setFormData((prev) => ({ ...prev, bildUrl: base64String }));
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData({ ...formData, bildUrl: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createMutation.mutate({
      bezeichnung: formData.bezeichnung,
      strasse: formData.strasse,
      plz: formData.plz,
      ort: formData.ort,
      objektart: formData.objektart,
      gesamtflaeche: formData.gesamtflaeche ? parseFloat(formData.gesamtflaeche) : undefined,
      bildUrl: formData.bildUrl || null,
      notizen: formData.notizen || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-20 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-card)] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Neues Objekt erstellen</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-secondary)]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Stammdaten */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Stammdaten</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Bezeichnung <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.bezeichnung}
                  onChange={(e) => setFormData({ ...formData, bezeichnung: e.target.value })}
                  placeholder="z.B. Musterstraße 10"
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Objektart <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.objektart}
                  onChange={(e) => setFormData({ ...formData, objektart: e.target.value as "WOHNHAUS" | "GEWERBE" | "GEMISCHT" })}
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="WOHNHAUS">Wohnhaus</option>
                  <option value="GEWERBE">Gewerbe</option>
                  <option value="GEMISCHT">Gemischt</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Gesamtfläche (m²)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.gesamtflaeche}
                  onChange={(e) => setFormData({ ...formData, gesamtflaeche: e.target.value })}
                  placeholder="z.B. 450.50"
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 mt-4">Adresse</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Straße <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.strasse}
                  onChange={(e) => setFormData({ ...formData, strasse: e.target.value })}
                  placeholder="z.B. Musterstraße 10"
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  PLZ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.plz}
                  onChange={(e) => setFormData({ ...formData, plz: e.target.value })}
                  placeholder="z.B. 10115"
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Ort <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.ort}
                  onChange={(e) => setFormData({ ...formData, ort: e.target.value })}
                  placeholder="z.B. Berlin"
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Medien */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 mt-4">Medien</h3>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Objekt-Bild hochladen
              </label>

              {!imagePreview ? (
                <div
                  className="flex items-center justify-center w-full"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileSelect(file);
                  }}
                >
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-[var(--border)] border-dashed rounded-xl cursor-pointer bg-[var(--bg-page)] hover:bg-[var(--bg-card-hover)] transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-10 h-10 mb-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mb-2 text-sm text-[var(--text-secondary)]">
                        <span className="font-semibold">Klicken zum Hochladen</span> oder Drag & Drop
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">PNG, JPG oder WEBP (max. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <Image
                    src={imagePreview}
                    alt="Vorschau"
                    width={800}
                    height={160}
                    className="w-full max-h-40 rounded-xl object-contain border border-[var(--border)]"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 rounded-full bg-red-500 p-2 text-white shadow-lg hover:bg-red-600 transition-all"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                {isUploading ? "Bild wird geladen..." : "Ohne Bild wird das PropGate Logo verwendet."}
              </p>
            </div>
          </div>

          {/* Notizen */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Notizen</h3>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Notizen
              </label>
              <textarea
                value={formData.notizen}
                onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
                rows={4}
                placeholder="Zusätzliche Informationen zum Objekt..."
                className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Error Message */}
          {createMutation.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-800">
                Fehler beim Erstellen: {createMutation.error.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-page)] disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Erstelle...
                </>
              ) : (
                "Objekt erstellen"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
