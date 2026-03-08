"use client";

import { useState } from "react";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";

type Step = "qr" | "verify" | "recovery";

export function TwoFactorSetup({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>("qr");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<{
    qrCode: string;
    secret: string;
    recoveryCodes: string[];
  } | null>(null);

  const generateSetup = trpc.authSecurity.generateTOTPSetup.useMutation({
    onSuccess: (data) => { setSetupData(data); },
    onError: (err) => { setError(err.message); },
  });

  const enableTOTP = trpc.authSecurity.enableTOTP.useMutation({
    onSuccess: () => { setStep("recovery"); },
    onError: (err) => { setError(err.message); },
  });

  const handleStart = () => { setError(null); generateSetup.mutate(); };

  const handleVerify = () => {
    if (!setupData) return;
    setError(null);
    enableTOTP.mutate({ code, recoveryCodes: setupData.recoveryCodes });
  };

  const handleCopyCodes = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.recoveryCodes.join("\n"));
  };

  const handleDownloadCodes = () => {
    if (!setupData) return;
    const content = [
      "PropGate - Wiederherstellungscodes",
      "===================================",
      "",
      "Bewahren Sie diese Codes sicher auf.",
      "Jeder Code kann nur einmal verwendet werden.",
      "",
      ...setupData.recoveryCodes,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "propgate-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!setupData) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Zwei-Faktor-Authentifizierung schützt Ihren Account mit einem zusätzlichen Code bei der Anmeldung.
        </p>
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <button onClick={handleStart} disabled={generateSetup.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {generateSetup.isPending ? "Wird eingerichtet…" : "2FA einrichten"}
        </button>
      </div>
    );
  }

  if (step === "qr") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Scannen Sie den QR-Code mit Ihrer Authenticator-App (z.B. Google Authenticator, Authy).
        </p>
        <div className="flex justify-center">
          <Image src={setupData.qrCode} alt="QR-Code für 2FA" width={192} height={192} unoptimized />
        </div>
        <details className="rounded-lg border border-[var(--border)] p-3">
          <summary className="cursor-pointer text-sm font-medium text-[var(--text-secondary)]">
            QR-Code kann nicht gescannt werden?
          </summary>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Geben Sie diesen Code manuell in Ihre Authenticator-App ein:
          </p>
          <code className="mt-1 block rounded bg-[var(--bg-card-hover)] p-2 text-xs font-mono break-all text-[var(--text-primary)]">
            {setupData.secret}
          </code>
        </details>
        <button onClick={() => setStep("verify")}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Weiter
        </button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein, um die Einrichtung abzuschließen.
        </p>
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <div>
          <input type="text" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000" maxLength={6} autoComplete="one-time-code"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3 text-center text-lg font-mono tracking-widest text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setStep("qr"); setError(null); }}
            className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]">
            Zurück
          </button>
          <button onClick={handleVerify} disabled={code.length !== 6 || enableTOTP.isPending}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {enableTOTP.isPending ? "Wird überprüft…" : "Aktivieren"}
          </button>
        </div>
      </div>
    );
  }

  // step === "recovery"
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
        <h3 className="text-sm font-semibold text-yellow-400">Wiederherstellungscodes speichern</h3>
        <p className="mt-1 text-xs text-yellow-300/80">
          Bewahren Sie diese Codes sicher auf. Sie können damit auf Ihren Account zugreifen,
          falls Sie Ihre Authenticator-App verlieren. Jeder Code kann nur einmal verwendet werden.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--bg-page)] p-4">
        {setupData.recoveryCodes.map((code, i) => (
          <code key={i} className="text-sm font-mono text-[var(--text-primary)]">{code}</code>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={handleCopyCodes}
          className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]">
          Kopieren
        </button>
        <button onClick={handleDownloadCodes}
          className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]">
          Herunterladen
        </button>
      </div>
      <button onClick={onComplete}
        className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
        Fertig — Codes gespeichert
      </button>
    </div>
  );
}
