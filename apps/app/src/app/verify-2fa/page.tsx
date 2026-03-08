"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  AuthCard, AuthButton, AuthError, ShieldIcon,
} from "@/components/auth/AuthCard";

export default function Verify2FAPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), isRecoveryCode: isRecovery }),
      });
      if (res.status === 429) { setError("Zu viele Versuche. Bitte warten Sie einen Moment."); return; }
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ungültiger Code"); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#0066ff]/25 bg-[#0066ff]/10">
          <span className="text-[#0066ff]"><ShieldIcon /></span>
        </div>
        <h1 className="text-[2rem] font-bold tracking-tight text-white">
          {isRecovery ? "Wiederherstellung" : "Zwei-Faktor"}
        </h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-[#6b7a99]">
          {isRecovery
            ? "Geben Sie einen Ihrer Wiederherstellungscodes ein."
            : "Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <AuthError message={error} />

        <div className="relative">
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={isRecovery ? "XXXXXXXX" : "000 000"}
            maxLength={isRecovery ? 8 : 6}
            autoComplete="one-time-code"
            className="w-full rounded-full border border-white/[0.08] bg-[#0a0e17] py-3 text-center text-xl font-mono tracking-[0.25em] text-white placeholder:text-[#3d4d66] focus:border-[#0066ff]/60 focus:outline-none focus:ring-1 focus:ring-[#0066ff]/25 transition"
          />
        </div>

        <div className="pt-1">
          <AuthButton loading={loading}>
            {loading ? "Wird überprüft…" : "Verifizieren"}
          </AuthButton>
        </div>
      </form>

      <div className="mt-5 space-y-3 text-center">
        <button
          onClick={() => { setIsRecovery(!isRecovery); setCode(""); setError(null); }}
          className="text-sm text-[#0066ff] hover:text-[#4da6ff] transition"
        >
          {isRecovery ? "← Authenticator-Code verwenden" : "Wiederherstellungscode verwenden"}
        </button>

        <div className="border-t border-white/[0.06] pt-3">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-[#3d4d66] hover:text-[#6b7a99] transition"
          >
            Abmelden
          </button>
        </div>
      </div>
    </AuthCard>
  );
}
