"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GlobalSearch } from "@/components/GlobalSearch";
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  Receipt,
  Landmark,
  AlertTriangle,
  TrendingDown,
  Banknote,
  Calculator,
  Wrench,
  HardHat,
  Gauge,
  CalendarCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navGroups = [
  {
    label: "VERWALTUNG",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Objekte", href: "/objekte", icon: Building2 },
      { name: "Einheiten", href: "/einheiten", icon: DoorOpen },
      { name: "Mieter", href: "/mieter", icon: Users },
    ],
  },
  {
    label: "FINANZEN",
    items: [
      { name: "Sollstellungen", href: "/sollstellungen", icon: Receipt },
      { name: "Bank", href: "/bank", icon: Landmark },
      { name: "Mahnungen", href: "/mahnungen", icon: AlertTriangle },
      { name: "Kosten", href: "/kosten", icon: TrendingDown },
      { name: "Kredite", href: "/kredite", icon: Banknote },
      { name: "Nebenkostenabr.", href: "/nebenkostenabrechnung", icon: Calculator },
    ],
  },
  {
    label: "BETRIEB",
    items: [
      { name: "Tickets", href: "/tickets", icon: Wrench },
      { name: "Dienstleister", href: "/dienstleister", icon: HardHat },
      { name: "Zähler", href: "/zaehler", icon: Gauge },
      { name: "Wartungsplan", href: "/wartung", icon: CalendarCheck },
    ],
  },
  {
    label: "ANALYSE",
    items: [
      { name: "Reporting", href: "/reporting", icon: BarChart3 },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { name: "Einstellungen", href: "/einstellungen", icon: Settings },
    ],
  },
];

const STORAGE_KEY = "propgate_sidebar_collapsed";

export function Sidebar({ userInitials, userName }: { userInitials?: string; userName?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`sidebar-glow flex flex-col h-screen flex-shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border)] transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[260px]"
      }`}
    >
      {/* Logo + Collapse Toggle */}
      <div className="flex h-16 items-center justify-between px-4 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.45)]">
              <Image
                src="/logo.png"
                alt="PropGate Logo"
                width={36}
                height={36}
                className="object-cover"
                priority
              />
            </div>
            <span className="text-base font-bold whitespace-nowrap text-blue-400">PropGate</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.45)] mx-auto">
            <Image
              src="/logo.png"
              alt="PropGate Logo"
              width={36}
              height={36}
              className="object-cover"
              priority
            />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={toggleCollapsed}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)] transition-colors"
            aria-label="Sidebar einklappen"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={toggleCollapsed}
          className="mx-auto mt-2 flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)] transition-colors"
          aria-label="Sidebar ausklappen"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Global Search — only when expanded */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <GlobalSearch />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="flex items-center gap-2 mb-1 px-2">
                <span className="text-[9px] font-bold tracking-[0.15em] text-[var(--text-muted)] uppercase">{group.label}</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      className={`nav-item flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium ${
                        active
                          ? "nav-active bg-blue-500/15 text-blue-400"
                          : "text-[var(--text-secondary)] hover:bg-white/8 hover:text-[var(--text-primary)]"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <Icon size={18} className="nav-icon flex-shrink-0" />
                      {!collapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      {(userInitials || userName) && (
        <div className="border-t border-[var(--border)] p-3 flex-shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 px-1">
              <div className="p-px rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-sidebar)]">
                  <span className="text-[10px] font-bold text-[var(--text-primary)]">{userInitials}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{userName}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="p-px rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-sidebar)]">
                  <span className="text-[10px] font-bold text-[var(--text-primary)]">{userInitials}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
