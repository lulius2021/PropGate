"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[var(--text-primary)]">Ein Fehler ist aufgetreten</h1>
        <p className="mt-4 text-[var(--text-secondary)]">
          Es tut uns leid, aber etwas ist schief gelaufen.
        </p>
        {error.digest && (
          <p className="mt-2 text-sm text-[var(--text-muted)]">Fehlercode: {error.digest}</p>
        )}
        <div className="mt-8 space-x-4">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Erneut versuchen
          </button>
          <Link
            href="/"
            className="inline-block rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-6 py-3 font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
          >
            Zurück zum Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
