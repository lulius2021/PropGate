"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { validatePassword } from "@/lib/password-policy";
import {
  AuthCard, AuthInput, AuthButton, AuthError,
  MailIcon, LockIcon, EyeIcon, UserIcon, ShieldIcon,
} from "@/components/auth/AuthCard";
import { trpc } from "@/lib/trpc/client";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.52 6.17 19.79 19.79 0 01.47 4.26 2 2 0 012.4 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.16 6.16l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const BuildingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="15" rx="2"/>
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="12.01"/>
  </svg>
);

const GiftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12"/>
    <rect x="2" y="7" width="20" height="5"/>
    <line x1="12" y1="22" x2="12" y2="7"/>
    <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
    <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ── Plan data ────────────────────────────────────────────────────
const PAID_PLANS = [
  { id: "starter", label: "Starter", priceMonthly: "9,99", priceAnnual: "8,99", limit: "bis 5 Objekte" },
  { id: "plus",    label: "Plus",    priceMonthly: "29,99", priceAnnual: "26,99", limit: "bis 20 Objekte" },
  { id: "pro",     label: "Pro",     priceMonthly: "79,99", priceAnnual: "71,99", limit: "bis 60 Objekte", badge: "Empfohlen" },
  { id: "unlimited", label: "Unlimited", priceMonthly: "149,00", priceAnnual: "134,10", limit: "Unbegrenzt" },
] as const;

type PlanId = "trial" | (typeof PAID_PLANS)[number]["id"];
type Billing = "monthly" | "annual";

function formatPhone(raw: string) {
  return raw.replace(/[^\d\s+\-()]/g, "");
}

// ── PaymentStep component (shown after registration for paid plans) ──
function PaymentStep({
  clientSecret,
  email,
  password,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  email: string;
  password: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      // Try confirmPayment first, fall back to confirmSetup
      // Versuche confirmPayment, falls fehlschlägt confirmSetup (für Trials)
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/dashboard` },
        redirect: "if_required",
      });

      if (result.error?.code === "payment_intent_unexpected_state" || result.error?.type === "invalid_request_error") {
        const setupResult = await stripe.confirmSetup({
          elements,
          confirmParams: { return_url: `${window.location.origin}/dashboard` },
          redirect: "if_required",
        });
        if (setupResult.error) {
          onError(setupResult.error.message ?? "Zahlung fehlgeschlagen");
          return;
        }
      } else if (result.error) {
        onError(result.error.message ?? "Zahlung fehlgeschlagen");
        return;
      }

      // Auto-Login nach erfolgreicher Zahlung
      await signIn("credentials", { email, password, redirect: false });
      onSuccess();
    } catch {
      onError("Zahlung fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--auth-input-border)] p-4">
        <PaymentElement />
      </div>
      <AuthButton loading={loading} onClick={handleConfirm}>
        {loading ? "Zahlung wird verarbeitet…" : "Jetzt kostenpflichtig abonnieren"}
      </AuthButton>
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPlan = searchParams.get("plan") as PlanId | null;

  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    urlPlan === "trial" || PAID_PLANS.some((p) => p.id === urlPlan) ? (urlPlan ?? "trial") : "trial"
  );
  const [billing, setBilling] = useState<Billing>("monthly");
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", password: "" });
  const [referralCode, setReferralCode] = useState("");
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Payment step state
  const [step, setStep] = useState<"info" | "payment">("info");
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: field === "phone" ? formatPhone(e.target.value) : e.target.value }));

  const validateReferral = trpc.billing.validateReferralCode.useQuery(
    { code: referralCode.trim().toUpperCase() },
    { enabled: false }
  );

  const handleReferralBlur = async () => {
    const code = referralCode.trim().toUpperCase();
    if (!code) { setReferralValid(null); return; }
    setReferralChecking(true);
    try {
      const result = await validateReferral.refetch();
      setReferralValid(result.data?.valid ?? false);
    } catch {
      setReferralValid(false);
    } finally {
      setReferralChecking(false);
    }
  };

  const isTrial = selectedPlan === "trial";
  const isPaid = !isTrial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validation = validatePassword(form.password);
    if (!validation.valid) { setError(validation.errors[0]); return; }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          company: form.company,
          phone: form.phone,
          email: form.email,
          password: form.password,
          plan: selectedPlan,
          billing: isTrial ? null : billing,
          referralCode: referralCode.trim().toUpperCase() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registrierung fehlgeschlagen"); return; }

      if (isPaid && data.clientSecret && stripePromise) {
        // Paid plan with Stripe: show payment step
        setClientSecret(data.clientSecret);
        setStep("payment");
      } else {
        // Trial or Stripe not configured: direct sign in
        const result = await signIn("credentials", {
          email: form.email,
          password: form.password,
          redirect: false,
        });
        if (result?.ok) { router.push("/dashboard"); router.refresh(); }
        else { router.push("/login?registered=true"); }
      }
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  // ── Payment step ─────────────────────────────────────────────
  if (step === "payment" && clientSecret && stripePromise) {
    return (
      <AuthCard wide>
        <div className="mb-6 text-center">
          <h1 className="text-[2rem] font-bold tracking-tight text-[var(--auth-heading)]">Zahlungsmethode</h1>
          <p className="mt-1.5 text-[0.9rem] leading-relaxed text-[var(--auth-text-sub)]">
            Ihre Daten sind sicher verschlüsselt.
          </p>
        </div>
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: { theme: "night", variables: { colorPrimary: "#0066ff" } },
          }}
        >
          <PaymentStep
            clientSecret={clientSecret}
            email={form.email}
            password={form.password}
            onSuccess={() => { router.push("/dashboard"); router.refresh(); }}
            onError={(msg) => setError(msg)}
          />
        </Elements>
        <button
          type="button"
          onClick={() => { setStep("info"); setClientSecret(null); }}
          className="mt-3 w-full text-center text-sm text-[var(--auth-text-muted)] hover:text-[var(--auth-heading)] transition"
        >
          ← Zurück
        </button>
      </AuthCard>
    );
  }

  // ── Info step (main form) ────────────────────────────────────
  return (
    <AuthCard wide>
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-[2rem] font-bold tracking-tight text-[var(--auth-heading)]">Account erstellen</h1>
        <p className="mt-1.5 text-[0.9rem] leading-relaxed text-[var(--auth-text-sub)]">
          Starten Sie jetzt mit PropGate — keine Kreditkarte erforderlich.
        </p>
      </div>

      {/* ── Plan selector ─────────────────────────────────────── */}
      <div className="mb-5 space-y-3">
        {/* Free Trial */}
        <button
          type="button"
          onClick={() => setSelectedPlan("trial")}
          className={[
            "relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all duration-150",
            isTrial
              ? "border-[#0066ff]/50 bg-[#0066ff]/10 shadow-[0_0_0_1px_rgba(0,102,255,0.25)]"
              : "border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] hover:border-[#0066ff]/30",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#0066ff]/5 to-transparent" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={[
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                isTrial ? "border-[#0066ff]/40 bg-[#0066ff]/15 text-[#4da6ff]" : "border-[var(--auth-input-border)] bg-[var(--auth-card)] text-[var(--auth-icon)]",
              ].join(" ")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isTrial ? "text-[#4da6ff]" : "text-[var(--auth-heading)]"}`}>
                    30 Tage kostenlos testen
                  </span>
                  <span className={[
                    "rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide",
                    isTrial ? "bg-[#0066ff]/20 text-[#4da6ff]" : "bg-[var(--auth-input-border)] text-[var(--auth-text-muted)]",
                  ].join(" ")}>
                    Free Trial
                  </span>
                </div>
                <div className={`mt-0.5 text-[0.75rem] ${isTrial ? "text-[#4da6ff]/70" : "text-[var(--auth-text-muted)]"}`}>
                  Alle Pro-Features · Kein Abo · Endet automatisch
                </div>
              </div>
            </div>
            <div className={[
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
              isTrial ? "border-[#0066ff] bg-[#0066ff]" : "border-[var(--auth-input-border)] bg-transparent",
            ].join(" ")}>
              {isTrial && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
          </div>
        </button>

        {/* Divider + billing toggle */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--auth-input-border)]" />
          <span className="shrink-0 text-[0.7rem] font-medium text-[var(--auth-text-muted)]">oder Plan wählen</span>
          <div className="h-px flex-1 bg-[var(--auth-input-border)]" />
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-1 rounded-full border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={[
              "flex-1 rounded-full py-1.5 text-xs font-semibold transition-all duration-150",
              billing === "monthly" ? "bg-[var(--auth-card)] text-[var(--auth-heading)] shadow-sm" : "text-[var(--auth-text-muted)] hover:text-[var(--auth-heading)]",
            ].join(" ")}
          >
            Monatlich
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={[
              "flex-1 rounded-full py-1.5 text-xs font-semibold transition-all duration-150",
              billing === "annual" ? "bg-[var(--auth-card)] text-[var(--auth-heading)] shadow-sm" : "text-[var(--auth-text-muted)] hover:text-[var(--auth-heading)]",
            ].join(" ")}
          >
            Jährlich
            <span className={[
              "ml-1.5 rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold",
              billing === "annual" ? "bg-[#0066ff]/15 text-[#4da6ff]" : "bg-[var(--auth-input-border)] text-[var(--auth-text-muted)]",
            ].join(" ")}>
              −10%
            </span>
          </button>
        </div>

        {/* Paid plans — 2×2 grid */}
        <div className="grid grid-cols-2 gap-2">
          {PAID_PLANS.map((plan) => {
            const active = selectedPlan === plan.id;
            const price = billing === "annual" ? plan.priceAnnual : plan.priceMonthly;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={[
                  "relative rounded-2xl border px-3.5 py-3 text-left transition-all duration-150",
                  active
                    ? "border-[#0066ff]/60 bg-[#0066ff]/10 shadow-[0_0_0_1px_rgba(0,102,255,0.3)]"
                    : "border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] hover:border-[#0066ff]/30",
                ].join(" ")}
              >
                {"badge" in plan && plan.badge && (
                  <span className="absolute -top-2 right-2.5 rounded-full bg-[#0066ff] px-2 py-0.5 text-[0.6rem] font-bold text-white">
                    {plan.badge}
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${active ? "text-[#4da6ff]" : "text-[var(--auth-heading)]"}`}>
                    {plan.label}
                  </span>
                  <span className={`text-[0.68rem] font-medium ${active ? "text-[#4da6ff]" : "text-[var(--auth-text-muted)]"}`}>
                    {price} €/Mo.
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className={`text-[0.7rem] ${active ? "text-[#4da6ff]/70" : "text-[var(--auth-text-muted)]"}`}>
                    {plan.limit}
                  </span>
                  {billing === "annual" && (
                    <span className={`text-[0.6rem] font-semibold ${active ? "text-[#4da6ff]" : "text-[var(--auth-text-muted)]"}`}>
                      −10%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Form ──────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <AuthError message={error} />

        <div className="grid grid-cols-2 gap-2">
          <AuthInput
            icon={<UserIcon />}
            type="text"
            required
            value={form.name}
            onChange={set("name")}
            placeholder="Ihr Name"
            autoComplete="name"
          />
          <AuthInput
            icon={<BuildingIcon />}
            type="text"
            value={form.company}
            onChange={set("company")}
            placeholder="Unternehmen"
            autoComplete="organization"
          />
        </div>

        <AuthInput
          icon={<MailIcon />}
          type="email"
          required
          value={form.email}
          onChange={set("email")}
          placeholder="E-Mail-Adresse"
          autoComplete="email"
        />

        <AuthInput
          icon={<PhoneIcon />}
          type="tel"
          value={form.phone}
          onChange={set("phone")}
          placeholder="Telefon (optional)"
          autoComplete="tel"
        />

        <div className="space-y-1">
          <AuthInput
            icon={<LockIcon />}
            type={showPw ? "text" : "password"}
            required
            value={form.password}
            onChange={set("password")}
            placeholder="Passwort (mind. 10 Zeichen)"
            autoComplete="new-password"
            trailing={
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="text-[#0066ff] transition hover:text-[#4da6ff]"
                tabIndex={-1}
              >
                <EyeIcon off={!showPw} />
              </button>
            }
          />
          <PasswordStrengthMeter password={form.password} />
        </div>

        {/* Referral-Code Feld */}
        <div className="relative">
          <AuthInput
            icon={<GiftIcon />}
            type="text"
            value={referralCode}
            onChange={(e) => {
              setReferralCode(e.target.value.toUpperCase());
              setReferralValid(null);
            }}
            onBlur={handleReferralBlur}
            placeholder="Referral-Code (optional, z.B. PG-7X9K2R)"
            autoComplete="off"
            trailing={
              referralChecking ? (
                <svg className="h-4 w-4 animate-spin text-[var(--auth-text-muted)]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : referralValid === true ? (
                <span className="text-green-400"><CheckIcon /></span>
              ) : referralValid === false && referralCode ? (
                <span className="text-red-400 text-xs">Ungültig</span>
              ) : null
            }
          />
          {referralValid === true && (
            <p className="mt-1 flex items-center gap-1 text-[0.72rem] font-medium text-green-400">
              <CheckIcon />
              Code gültig — 1 Monat gratis!
            </p>
          )}
        </div>

        <div className="pt-1">
          <AuthButton loading={loading}>
            {loading
              ? "Account wird erstellt…"
              : isTrial
              ? "30 Tage gratis starten"
              : isPaid && stripePromise
              ? `Weiter zur Zahlung`
              : `Jetzt ${billing === "annual" ? "jährlich" : "monatlich"} starten`}
          </AuthButton>
        </div>
      </form>

      {isTrial && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-[#0066ff]/15 bg-[#0066ff]/8 px-3 py-2.5 text-[0.75rem] text-[#4da6ff]/80">
          <ShieldIcon />
          <span>30 Tage alle Pro-Features kostenlos. Keine Kreditkarte. Danach wählen Sie einen passenden Plan.</span>
        </p>
      )}

      <p className="mt-5 text-center text-sm text-[var(--auth-text-muted)]">
        Bereits einen Account?{" "}
        <Link href="/login" className="font-semibold text-[#0066ff] hover:text-[#4da6ff] transition">
          Anmelden
        </Link>
      </p>
    </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[var(--auth-bg)]"><div className="text-[var(--auth-text-muted)]">Laden…</div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
