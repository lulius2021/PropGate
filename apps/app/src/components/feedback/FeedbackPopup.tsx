"use client";

import { useState } from "react";
import { MessageSquareHeart } from "lucide-react";
import { FeedbackModal } from "./FeedbackModal";

function computeInitialVisibility(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const alreadyCounted = sessionStorage.getItem("pg_session_counted");
    let loginCount = parseInt(localStorage.getItem("pg_login_count") ?? "0", 10);

    if (!alreadyCounted) {
      loginCount += 1;
      localStorage.setItem("pg_login_count", String(loginCount));
      sessionStorage.setItem("pg_session_counted", "true");
    }

    const feedbackDone = localStorage.getItem("pg_feedback_done") === "true";
    const nextAt = parseInt(localStorage.getItem("pg_feedback_next_at") ?? "3", 10);

    return !feedbackDone && loginCount === nextAt;
  } catch {
    return false;
  }
}

export function FeedbackPopup() {
  const [visible, setVisible] = useState(computeInitialVisibility);
  const [showModal, setShowModal] = useState(false);

  if (!visible) return null;

  const handleRemindLater = () => {
    const loginCount = parseInt(localStorage.getItem("pg_login_count") ?? "0", 10);
    localStorage.setItem("pg_feedback_next_at", String(loginCount + 2));
    setVisible(false);
  };

  const handleNeverAsk = () => {
    localStorage.setItem("pg_feedback_next_at", "9999");
    setVisible(false);
  };

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleFeedbackSuccess = () => {
    localStorage.setItem("pg_feedback_done", "true");
    setVisible(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl ring-1 ring-blue-500/20">
          {/* Glow effect */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-purple-500/5" />

          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <MessageSquareHeart className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          <h2 className="mb-2 text-center text-lg font-semibold text-[var(--text-primary)]">
            Wie gefällt Ihnen PropGate?
          </h2>
          <p className="mb-6 text-center text-sm text-[var(--text-secondary)]">
            Ihr Feedback hilft uns, die Software gezielt zu verbessern. Es dauert nur 1 Minute.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleOpenModal}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Feedback senden
            </button>
            <button
              onClick={handleRemindLater}
              className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-page)] transition-colors"
            >
              Erinnere mich später
            </button>
            <button
              onClick={handleNeverAsk}
              className="w-full px-4 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Nein, danke
            </button>
          </div>
        </div>
      </div>

      <FeedbackModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setVisible(false);
        }}
        onSuccess={handleFeedbackSuccess}
      />
    </>
  );
}
