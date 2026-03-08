import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { FeedbackPopup } from "@/components/feedback/FeedbackPopup";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // 2FA enforcement: if user has 2FA enabled but hasn't verified yet, redirect
  const user = session.user as { tenantId?: string; tenantName?: string; needsTwoFactor?: boolean; twoFactorVerified?: boolean; role?: string } | undefined;
  if (user?.needsTwoFactor && !user?.twoFactorVerified) {
    redirect("/verify-2fa");
  }

  // Trial expiry check: redirect to /upgrade if trial ended and no active subscription
  if (user?.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { trialEndsAt: true, stripeSubscriptionId: true, subscriptionStatus: true },
    });
    const trialExpired =
      tenant?.trialEndsAt &&
      tenant.trialEndsAt < new Date() &&
      !tenant.stripeSubscriptionId;
    if (trialExpired) {
      redirect("/upgrade");
    }
  }

  const initials = (session.user?.name || session.user?.email || "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-page)]">
      {/* Sidebar — fixed height, independent scroll */}
      <Sidebar userInitials={initials} userName={session.user?.name || session.user?.email || ""} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 h-16 z-30">
          <div className="flex h-full items-center justify-between px-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {user?.tenantName || "Dashboard"}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {/* Avatar */}
              <div className="relative">
                <div className="p-px rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-card)]">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{initials}</span>
                  </div>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-[var(--text-primary)]">{session.user?.name || session.user?.email}</p>
                <p className="text-xs text-[var(--text-muted)]">{user?.role || "User"}</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Page Content — only this scrolls */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-fade-up">{children}</div>
        </main>
      </div>
      <FeedbackPopup />
    </div>
  );
}
