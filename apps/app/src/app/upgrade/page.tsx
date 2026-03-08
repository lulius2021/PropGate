"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { signOut } from "next-auth/react";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const PLANS = [
  {
    id: "starter",
    label: "Starter",
    priceMonthly: "9,99",
    priceAnnual: "8,99",
    limit: "bis 5 Objekte",
    features: ["Alle Grundfunktionen", "Bis zu 5 Objekte"],
  },
  {
    id: "plus",
    label: "Plus",
    priceMonthly: "29,99",
    priceAnnual: "26,99",
    limit: "bis 20 Objekte",
    features: ["Tickets & Bankimport", "Dokumente & Export", "Bis zu 20 Objekte"],
  },
  {
    id: "pro",
    label: "Pro",
    priceMonthly: "79,99",
    priceAnnual: "71,99",
    limit: "bis 60 Objekte",
    badge: "Empfohlen",
    features: ["Alle Plus-Features", "Bis zu 60 Objekte"],
  },
  {
    id: "unlimited",
    label: "Unlimited",
    priceMonthly: "149,00",
    priceAnnual: "134,10",
    limit: "Unbegrenzt",
    features: ["Alle Features", "Multi-User", "API-Zugriff", "Unbegrenzte Objekte"],
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];
type Billing = "monthly" | "annual";

function PaymentStep({
  onSuccess,
  onError,
}: {
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
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/dashboard` },
        redirect: "if_required",
      });

      if (
        result.error?.code === "payment_intent_unexpected_state" ||
        result.error?.type === "invalid_request_error"
      ) {
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

      onSuccess();
    } catch {
      onError("Zahlung fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <PaymentElement />
      </div>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
      >
        {loading ? "Zahlung wird verarbeitet…" : "Jetzt kostenpflichtig abonnieren"}
      </button>
    </div>
  );
}

export default function UpgradePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("starter");
  const [billing, setBilling] = useState<Billing>("monthly");
  const [step, setStep] = useState<"plan" | "payment">("plan");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan)!;
  const price =
    billing === "annual" ? selectedPlanData.priceAnnual : selectedPlanData.priceMonthly;

  const handleContinue = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, billing }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upgrade fehlgeschlagen");
        return;
      }
      if (data.clientSecret && stripePromise) {
        setClientSecret(data.clientSecret);
        setStep("payment");
      } else {
        // Stripe not configured or no payment needed
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Testzeitraum abgelaufen</h1>
          <p className="mt-2 text-sm text-white/50">
            Wählen Sie einen Plan, um PropGate weiter zu nutzen.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          {step === "plan" ? (
            <>
              {/* Billing toggle */}
              <div className="mb-5 flex items-center justify-center gap-1 rounded-full border border-white/10 bg-black/20 p-1">
                <button
                  type="button"
                  onClick={() => setBilling("monthly")}
                  className={[
                    "flex-1 rounded-full py-1.5 text-xs font-semibold transition-all",
                    billing === "monthly"
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-white/40 hover:text-white/70",
                  ].join(" ")}
                >
                  Monatlich
                </button>
                <button
                  type="button"
                  onClick={() => setBilling("annual")}
                  className={[
                    "flex-1 rounded-full py-1.5 text-xs font-semibold transition-all",
                    billing === "annual"
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-white/40 hover:text-white/70",
                  ].join(" ")}
                >
                  Jährlich
                  <span className="ml-1.5 rounded-full bg-blue-600/20 px-1.5 py-0.5 text-[0.6rem] font-bold text-blue-400">
                    −10%
                  </span>
                </button>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-2 gap-2">
                {PLANS.map((plan) => {
                  const active = selectedPlan === plan.id;
                  const planPrice =
                    billing === "annual" ? plan.priceAnnual : plan.priceMonthly;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={[
                        "relative rounded-xl border px-3.5 py-3 text-left transition-all",
                        active
                          ? "border-blue-500/60 bg-blue-600/10 shadow-[0_0_0_1px_rgba(37,99,235,0.3)]"
                          : "border-white/10 bg-black/20 hover:border-white/20",
                      ].join(" ")}
                    >
                      {"badge" in plan && plan.badge && (
                        <span className="absolute -top-2 right-2.5 rounded-full bg-blue-600 px-2 py-0.5 text-[0.6rem] font-bold text-white">
                          {plan.badge}
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-semibold ${active ? "text-blue-400" : "text-white"}`}
                        >
                          {plan.label}
                        </span>
                        <span
                          className={`text-[0.7rem] font-medium ${active ? "text-blue-400" : "text-white/50"}`}
                        >
                          {planPrice} €/Mo.
                        </span>
                      </div>
                      <div
                        className={`mt-0.5 text-[0.7rem] ${active ? "text-blue-400/70" : "text-white/40"}`}
                      >
                        {plan.limit}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected plan features */}
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="mb-2 text-xs font-semibold text-white/60 uppercase tracking-wide">
                  {selectedPlanData.label} enthält:
                </p>
                <ul className="space-y-1">
                  {selectedPlanData.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-white/70">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 shrink-0">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price summary */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <span className="text-sm text-white/60">
                  {selectedPlanData.label} · {billing === "annual" ? "Jährlich" : "Monatlich"}
                </span>
                <span className="text-lg font-bold text-white">
                  {price} €<span className="text-sm font-normal text-white/40">/Mo.</span>
                </span>
              </div>

              {error && (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleContinue}
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                {loading ? "Wird vorbereitet…" : `Weiter zur Zahlung →`}
              </button>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-2 w-full text-center text-xs text-white/30 hover:text-white/60 transition"
              >
                Abmelden
              </button>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Zahlungsmethode</h2>
                <span className="text-sm text-white/50">
                  {selectedPlanData.label} · {price} €/Mo.
                </span>
              </div>

              {error && (
                <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {clientSecret && stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: { theme: "night", variables: { colorPrimary: "#2563eb" } },
                  }}
                >
                  <PaymentStep
                    onSuccess={() => {
                      router.push("/dashboard");
                      router.refresh();
                    }}
                    onError={(msg) => setError(msg)}
                  />
                </Elements>
              ) : (
                <p className="text-sm text-white/50">Stripe nicht konfiguriert.</p>
              )}

              <button
                type="button"
                onClick={() => { setStep("plan"); setClientSecret(null); setError(null); }}
                className="mt-3 w-full text-center text-xs text-white/30 hover:text-white/60 transition"
              >
                ← Plan ändern
              </button>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-white/20">
          Sichere Zahlung ueber Stripe · SSL-verschluesselt · Es gelten unsere{" "}
          <a href={`${process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://propgate.de"}/agb`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white/40 transition">AGB</a>
        </p>
      </div>
    </div>
  );
}
