"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";
import { TwoFactorDisable } from "@/components/auth/TwoFactorDisable";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { validatePassword } from "@/lib/password-policy";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { MessageSquare, CreditCard, Copy, Check, ExternalLink } from "lucide-react";

function SecurityTab() {
  const utils = trpc.useUtils();
  const { data: securityStatus, isLoading } =
    trpc.authSecurity.getSecurityStatus.useQuery();

  const [showSetup, setShowSetup] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const changePassword = trpc.authSecurity.changePassword.useMutation({
    onSuccess: () => {
      setPwSuccess(true);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwError(null);
    },
    onError: (err) => {
      setPwError(err.message);
    },
  });

  const handleChangePassword = () => {
    setPwError(null);
    setPwSuccess(false);

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("Passwörter stimmen nicht überein");
      return;
    }

    const validation = validatePassword(pwForm.newPassword);
    if (!validation.valid) {
      setPwError(validation.errors[0]);
      return;
    }

    changePassword.mutate({
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
        <p className="text-sm text-[var(--text-secondary)]">Laden…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 2FA Section */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          Zwei-Faktor-Authentifizierung (2FA)
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Schützen Sie Ihren Account mit einem zusätzlichen Sicherheitscode.
        </p>

        {securityStatus?.twoFactorEnabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-700">
                2FA ist aktiviert
              </span>
            </div>
            <TwoFactorDisable
              onComplete={() => {
                utils.authSecurity.getSecurityStatus.invalidate();
              }}
            />
          </div>
        ) : showSetup ? (
          <TwoFactorSetup
            onComplete={() => {
              setShowSetup(false);
              utils.authSecurity.getSecurityStatus.invalidate();
            }}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium text-yellow-700">
                2FA ist nicht aktiviert
              </span>
            </div>
            <button
              onClick={() => setShowSetup(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              2FA aktivieren
            </button>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          Passwort ändern
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Aktualisieren Sie Ihr Passwort regelmäßig für mehr Sicherheit.
        </p>

        {pwSuccess && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
            Passwort wurde erfolgreich geändert.
          </div>
        )}

        {pwError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {pwError}
          </div>
        )}

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Aktuelles Passwort
            </label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) =>
                setPwForm((f) => ({ ...f, currentPassword: e.target.value }))
              }
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Neues Passwort
            </label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={(e) =>
                setPwForm((f) => ({ ...f, newPassword: e.target.value }))
              }
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <PasswordStrengthMeter password={pwForm.newPassword} />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Neues Passwort bestätigen
            </label>
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) =>
                setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))
              }
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={
              !pwForm.currentPassword ||
              !pwForm.newPassword ||
              !pwForm.confirmPassword ||
              changePassword.isPending
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {changePassword.isPending
              ? "Wird gespeichert…"
              : "Passwort ändern"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoDataTab() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const seedMutation = trpc.seeding.createDemoData.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setShowConfirm(false);
    },
    onError: (err) => {
      setError(err.message);
      setShowConfirm(false);
    },
  });

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Demo-Daten</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Erstellt realistische Demo-Daten (Objekte, Einheiten, Mieter, Mietverhältnisse, Tickets und Mahnungen) für Testzwecke.
        Nur möglich wenn die Datenbank noch leer ist.
      </p>

      {result && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-sm font-medium text-green-800 mb-2">Demo-Daten erfolgreich erstellt:</p>
          <ul className="text-sm text-green-700 space-y-0.5">
            <li>{result.objekte} Objekte</li>
            <li>{result.einheiten} Einheiten</li>
            <li>{result.mieter} Mieter</li>
            <li>{result.mietverhaeltnisse} Mietverhältnisse</li>
            <li>{result.sollstellungen} Sollstellungen</li>
            <li>{result.tickets} Tickets</li>
            <li>{result.mahnungen} Mahnungen</li>
          </ul>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {showConfirm ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-medium text-orange-800 mb-3">
            Wirklich Demo-Daten einfügen? Diese Aktion kann nicht rückgängig gemacht werden und ist nur möglich wenn die Datenbank leer ist.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
            >
              Abbrechen
            </button>
            <button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {seedMutation.isPending ? "Erstelle..." : "Demo-Daten einfügen"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!!result}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Demo-Daten einfügen
        </button>
      )}
    </div>
  );
}

function AutoMahnungTab() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.userSettings.getAutoMahnungSettings.useQuery();
  const [form, setForm] = useState({ autoMahnungAktiv: false, autoMahnungTageNachFaelligkeit: 7, autoMahnungEmailAktiv: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        autoMahnungAktiv: settings.autoMahnungAktiv,
        autoMahnungTageNachFaelligkeit: settings.autoMahnungTageNachFaelligkeit,
        autoMahnungEmailAktiv: settings.autoMahnungEmailAktiv,
      });
    }
  }, [settings]);

  const updateMutation = trpc.userSettings.updateAutoMahnung.useMutation({
    onSuccess: () => {
      setSaved(true);
      utils.userSettings.getAutoMahnungSettings.invalidate();
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-[var(--text-secondary)]">Laden...</div>;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Automatische Mahnungen</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Automatisch Mahnungen für überfällige Mieter erstellen.
      </p>

      {saved && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          Einstellungen gespeichert.
        </div>
      )}

      <div className="space-y-5 max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Auto-Mahnung aktiv</p>
            <p className="text-xs text-[var(--text-secondary)]">Mahnungen automatisch erstellen</p>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, autoMahnungAktiv: !f.autoMahnungAktiv }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.autoMahnungAktiv ? "bg-blue-600" : "bg-[var(--border)] dark:bg-gray-600"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${form.autoMahnungAktiv ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tage nach Fälligkeit</label>
          <input
            type="number"
            min={1}
            max={60}
            value={form.autoMahnungTageNachFaelligkeit}
            onChange={(e) => setForm(f => ({ ...f, autoMahnungTageNachFaelligkeit: parseInt(e.target.value) || 7 }))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Nach wie vielen Tagen nach Fälligkeit eine Mahnung erstellt wird</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">E-Mail automatisch senden</p>
            <p className="text-xs text-[var(--text-secondary)]">Mahnung per E-Mail versenden (coming soon)</p>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, autoMahnungEmailAktiv: !f.autoMahnungEmailAktiv }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.autoMahnungEmailAktiv ? "bg-blue-600" : "bg-[var(--border)] dark:bg-gray-600"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${form.autoMahnungEmailAktiv ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <button
          onClick={() => updateMutation.mutate(form)}
          disabled={updateMutation.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {updateMutation.isPending ? "Speichere..." : "Einstellungen speichern"}
        </button>
      </div>
    </div>
  );
}

function FeedbackTab() {
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSuccess = () => {
    setSubmitted(true);
    localStorage.setItem("pg_feedback_done", "true");
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
      <div className="flex items-start gap-4 mb-6">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <MessageSquare className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Helfen Sie uns, PropGate zu verbessern
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Ihr Feedback ist wertvoll — teilen Sie uns mit, was gut funktioniert und was verbessert werden kann. Jeder Beitrag wird gelesen.
          </p>
        </div>
      </div>

      {submitted && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          Vielen Dank für Ihr Feedback! Wir schätzen Ihre Rückmeldung sehr.
        </div>
      )}

      <button
        onClick={() => setShowModal(true)}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Feedback senden
      </button>

      <FeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

function AbonnementTab() {
  const [copied, setCopied] = useState(false);
  const { data: billing, isLoading: billingLoading } = trpc.billing.getBillingInfo.useQuery();
  const { data: referral, isLoading: referralLoading } = trpc.billing.getReferralStats.useQuery();

  const createPortal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => { window.open(data.url, "_blank"); },
  });

  const handleCopy = () => {
    if (!billing?.referralCode) return;
    navigator.clipboard.writeText(billing.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    active:    { label: "Aktiv",         color: "text-green-500" },
    trialing:  { label: "Testphase",     color: "text-blue-400" },
    past_due:  { label: "Zahlung offen", color: "text-yellow-500" },
    canceled:  { label: "Gekündigt",     color: "text-red-500" },
  };

  if (billingLoading) {
    return <div className="p-6 text-sm text-[var(--text-secondary)]">Laden…</div>;
  }

  const status = billing?.subscriptionStatus
    ? (statusLabels[billing.subscriptionStatus] ?? { label: billing.subscriptionStatus, color: "text-[var(--text-secondary)]" })
    : { label: "–", color: "text-[var(--text-secondary)]" };

  return (
    <div className="space-y-6">
      {/* Plan + Status */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Ihr Abonnement</h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Plan</p>
            <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{billing?.planLabel ?? "–"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Abrechnung</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
              {billing?.billingInterval === "annual" ? "Jährlich (−10%)" : "Monatlich"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Status</p>
            <p className={`mt-1 text-sm font-semibold ${status.color}`}>
              {status.label}
              {billing?.subscriptionStatus === "trialing" && billing.trialEndsAt && (
                <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
                  (bis {new Date(billing.trialEndsAt).toLocaleDateString("de-DE")})
                </span>
              )}
            </p>
          </div>
        </div>

        {billing?.nextInvoiceDate && (
          <div className="mt-4 rounded-lg bg-[var(--bg-page)] p-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Nächste Abbuchung:{" "}
              <strong className="text-[var(--text-primary)]">
                {billing.nextInvoiceAmount != null
                  ? `${billing.nextInvoiceAmount.toFixed(2).replace(".", ",")} €`
                  : "–"}
              </strong>
              {" "}am{" "}
              <strong className="text-[var(--text-primary)]">
                {new Date(billing.nextInvoiceDate).toLocaleDateString("de-DE")}
              </strong>
            </p>
          </div>
        )}

        {billing?.customerBalance && billing.customerBalance < 0 && (
          <div className="mt-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 p-3">
            <p className="text-sm text-green-700 dark:text-green-400">
              Guthaben (wird automatisch abgezogen):{" "}
              <strong>{Math.abs(billing.customerBalance).toFixed(2).replace(".", ",")} €</strong>
            </p>
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={() => createPortal.mutate()}
            disabled={createPortal.isPending || !billing?.subscriptionStatus}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] disabled:opacity-50 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            {createPortal.isPending ? "Öffne Portal…" : "Zahlungsmethode verwalten"}
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Referral-Code */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Freunde empfehlen</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Für jeden Freund, den Sie werben und der zahlt, erhalten Sie einen Monat gratis.
        </p>

        {billing?.referralCode ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5">
              <span className="font-mono text-lg font-bold text-[var(--text-primary)]">
                {billing.referralCode}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Kopiert!" : "Kopieren"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">Kein Referral-Code gefunden.</p>
        )}

        {billing?.referralCode && (
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            Teilen Sie diesen Code mit: &bdquo;Teste PropGate 30 Tage gratis – nutze meinen Code{" "}
            <strong>{billing.referralCode}</strong> bei der Registrierung!&ldquo;
          </p>
        )}
      </div>

      {/* Geworbene Nutzer + Gutschriften */}
      {!referralLoading && referral && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Empfehlungs-Übersicht
          </h2>

          {referral.referred.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Sie haben noch niemanden geworben. Teilen Sie Ihren Code!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Datum</th>
                    <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Workspace</th>
                    <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Plan</th>
                    <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {referral.referred.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2 text-[var(--text-secondary)]">
                        {new Date(t.createdAt).toLocaleDateString("de-DE")}
                      </td>
                      <td className="py-2 font-medium text-[var(--text-primary)]">{t.name}</td>
                      <td className="py-2 text-[var(--text-secondary)] capitalize">{t.plan}</td>
                      <td className="py-2">
                        <span className={`text-xs font-medium ${
                          t.subscriptionStatus === "active" ? "text-green-500" :
                          t.subscriptionStatus === "trialing" ? "text-blue-400" : "text-[var(--text-secondary)]"
                        }`}>
                          {t.subscriptionStatus ?? "–"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {referral.credits.length > 0 && (
            <div className="mt-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 p-3">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Gesamte Gutschriften: <strong>{referral.totalEarned.toFixed(2).replace(".", ",")} €</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EinstellungenPage() {
  const [activeTab, setActiveTab] = useState<
    "parameter" | "benutzer" | "audit" | "sicherheit" | "demo" | "automahnung" | "feedback" | "abonnement"
  >("parameter");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Einstellungen</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Systemparameter und Benutzerverwaltung
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-[var(--border)]">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab("parameter")}
            className={`border-b-2 py-2 px-1 text-sm font-medium ${
              activeTab === "parameter"
                ? "border-blue-600 text-blue-400"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Parameter
          </button>
          <button
            onClick={() => setActiveTab("benutzer")}
            className={`border-b-2 py-2 px-1 text-sm font-medium ${
              activeTab === "benutzer"
                ? "border-blue-600 text-blue-400"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Benutzerverwaltung
          </button>
          <button
            onClick={() => setActiveTab("sicherheit")}
            className={`border-b-2 py-2 px-1 text-sm font-medium ${
              activeTab === "sicherheit"
                ? "border-blue-600 text-blue-400"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Sicherheit
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`border-b-2 py-2 px-1 text-sm font-medium ${
              activeTab === "audit"
                ? "border-blue-600 text-blue-400"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Audit-Log
          </button>
          <button
            onClick={() => setActiveTab("automahnung")}
            className={`border-b-2 py-2 px-1 text-sm font-medium ${
              activeTab === "automahnung"
                ? "border-blue-600 text-blue-400"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Auto-Mahnung
          </button>
          <button
            onClick={() => setActiveTab("demo")}
            className={`border-b-2 py-2 px-1 text-sm font-medium ${
              activeTab === "demo"
                ? "border-blue-600 text-blue-400"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Demo-Daten
          </button>
          <button
            onClick={() => setActiveTab("feedback")}
            className={`flex items-center gap-1.5 border-b-2 py-2 px-1 text-sm font-medium ${
              activeTab === "feedback"
                ? "border-blue-600 text-blue-400"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Feedback
          </button>
          <button
            onClick={() => setActiveTab("abonnement")}
            className={`flex items-center gap-1.5 border-b-2 py-2 px-1 text-sm font-medium ${
              activeTab === "abonnement"
                ? "border-blue-600 text-blue-400"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Abonnement
          </button>
        </nav>
      </div>

      {/* Sicherheit Tab */}
      {activeTab === "sicherheit" && <SecurityTab />}

      {/* Parameter Tab */}
      {activeTab === "parameter" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            System-Parameter
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Verzugszins-Satz (p.a.)
              </label>
              <input
                type="number"
                step="0.0001"
                defaultValue="0.05"
                className="w-full rounded border border-[var(--border)] px-3 py-2"
                placeholder="0.05 = 5%"
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Beispiel: 0.05 = 5% per annum
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Fälligkeitstag Warmmiete
              </label>
              <input
                type="number"
                min="1"
                max="28"
                defaultValue="3"
                className="w-full rounded border border-[var(--border)] px-3 py-2"
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Tag im Monat (1-28)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Mahngebühr Erinnerung
              </label>
              <input
                type="number"
                step="0.01"
                defaultValue="0.00"
                className="w-full rounded border border-[var(--border)] px-3 py-2"
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">In Euro (€)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Mahngebühr 1. Mahnung
              </label>
              <input
                type="number"
                step="0.01"
                defaultValue="5.00"
                className="w-full rounded border border-[var(--border)] px-3 py-2"
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">In Euro (€)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Mahngebühr 2. Mahnung
              </label>
              <input
                type="number"
                step="0.01"
                defaultValue="10.00"
                className="w-full rounded border border-[var(--border)] px-3 py-2"
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">In Euro (€)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Mahngebühr 3. Mahnung
              </label>
              <input
                type="number"
                step="0.01"
                defaultValue="15.00"
                className="w-full rounded border border-[var(--border)] px-3 py-2"
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">In Euro (€)</p>
            </div>

            <div className="pt-4">
              <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Parameter speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Benutzerverwaltung Tab */}
      {activeTab === "benutzer" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Benutzerverwaltung
            </h2>
            <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              + Benutzer anlegen
            </button>
          </div>

          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-page)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  E-Mail
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Rolle
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-4 text-center text-sm text-[var(--text-secondary)]"
                >
                  Benutzerverwaltung in Entwicklung
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Audit-Log Tab */}
      {activeTab === "audit" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Audit-Log (Änderungshistorie)
          </h2>

          <div className="mb-4 flex gap-4">
            <input
              type="text"
              placeholder="Suche nach Entität..."
              className="flex-1 rounded border px-3 py-2"
            />
            <select className="rounded border border-[var(--border)] px-3 py-2">
              <option value="">Alle Aktionen</option>
              <option value="CREATE">Erstellt</option>
              <option value="UPDATE">Geändert</option>
              <option value="DELETE">Gelöscht</option>
            </select>
          </div>

          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-page)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Zeitpunkt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Benutzer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Aktion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Entität
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-4 text-center text-sm text-[var(--text-secondary)]"
                >
                  Audit-Log-Ansicht in Entwicklung
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Auto-Mahnung Tab */}
      {activeTab === "automahnung" && <AutoMahnungTab />}

      {/* Demo-Daten Tab */}
      {activeTab === "demo" && <DemoDataTab />}

      {/* Feedback Tab */}
      {activeTab === "feedback" && <FeedbackTab />}

      {/* Abonnement Tab */}
      {activeTab === "abonnement" && <AbonnementTab />}
    </div>
  );
}
