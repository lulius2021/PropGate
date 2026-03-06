"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  AuthCard, AuthInput, AuthButton, AuthError,
  MailIcon, LockIcon, EyeIcon,
} from "@/components/auth/AuthCard";

const loginSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail-Adresse eingeben"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});
type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema as any),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        if (result.error.includes("ACCOUNT_LOCKED")) {
          const minutes = result.error.split(":")[1] || "15";
          setError(`Ihr Account wurde gesperrt. Bitte versuchen Sie es in ${minutes} Minuten erneut.`);
        } else {
          setError("Ungültige E-Mail oder Passwort");
        }
      } else if (result?.ok) {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        if (session?.user?.needsTwoFactor && !session?.user?.twoFactorVerified) {
          router.push("/verify-2fa");
        } else {
          router.push(searchParams.get("callbackUrl") || "/dashboard");
        }
        router.refresh();
      }
    } catch (err: any) {
      if (err?.message?.includes("429") || err?.status === 429) {
        setError("Zu viele Anmeldeversuche. Bitte warten Sie einen Moment.");
      } else {
        setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard>
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-[2.25rem] font-bold tracking-tight text-[var(--auth-heading)]">Anmelden</h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--auth-text-sub)]">
          Melden Sie sich an und verwalten Sie Ihr Immobilienportfolio nahtlos weiter.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <AuthError message={error} />

        {searchParams.get("reset") === "success" && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            Passwort erfolgreich zurückgesetzt. Bitte melden Sie sich an.
          </div>
        )}

        <AuthInput
          icon={<MailIcon />}
          type="email"
          autoComplete="email"
          placeholder="E-Mail-Adresse"
          {...register("email")}
        />
        {errors.email && <p className="px-2 text-xs text-red-400">{errors.email.message}</p>}

        <AuthInput
          icon={<LockIcon />}
          type={showPw ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Passwort"
          {...register("password")}
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
        {errors.password && <p className="px-2 text-xs text-red-400">{errors.password.message}</p>}

        <div className="flex justify-end pb-1">
          <Link href="/forgot-password" className="text-sm text-[#0066ff] hover:text-[#4da6ff] transition">
            Passwort vergessen?
          </Link>
        </div>

        <AuthButton loading={isLoading}>
          {isLoading ? "Wird angemeldet…" : "Anmelden"}
        </AuthButton>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--auth-text-muted)]">
        Noch kein Account?{" "}
        <Link href="/register" className="font-semibold text-[#0066ff] hover:text-[#4da6ff] transition">
          Registrieren
        </Link>
      </p>

    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[var(--auth-bg)]"><div className="text-[var(--auth-text-muted)]">Laden…</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
