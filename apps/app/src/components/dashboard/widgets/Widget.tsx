"use client";

import { useState } from "react";
import { WidgetType, WidgetSize } from "./types";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import { MahnungErstellenModal } from "@/components/mahnungen/MahnungErstellenModal";
import { NeuesObjektModal } from "@/components/objekte/NeuesObjektModal";
import { NeueEinheitModal } from "@/components/einheiten/NeueEinheitModal";
import { ErweiterterMieterModal } from "@/components/mieter/ErweiterterMieterModal";
import { DokumentUploadModal } from "@/components/dokumente/DokumentUploadModal";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CHART_COLORS = {
  green: "#22c55e",
  emerald: "#10b981",
  gray: "#e5e7eb",
  grayDark: "#9ca3af",
  orange: "#f97316",
  red: "#ef4444",
  yellow: "#eab308",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  teal: "#14b8a6",
  indigo: "#6366f1",
  rose: "#f43f5e",
  amber: "#f59e0b",
  cyan: "#06b6d4",
};

function DonutChart({
  data,
  innerLabel,
  innerSublabel,
  size,
}: {
  data: { name: string; value: number; color: string }[];
  innerLabel: string;
  innerSublabel?: string;
  size: WidgetSize;
}) {
  const isSmall = size === "small";
  const outerRadius = isSmall ? 50 : 70;
  const innerRadius = isSmall ? 35 : 50;
  const cx = "50%";
  const cy = "50%";

  return (
    <div className="relative flex items-center justify-center" style={{ width: "100%", height: isSmall ? 110 : 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx={cx}
            cy={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            strokeWidth={0}
            animationDuration={600}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={`font-bold text-[var(--text-primary)] ${isSmall ? "text-lg" : "text-2xl"}`}>{innerLabel}</span>
        {innerSublabel && !isSmall && (
          <span className="text-xs text-[var(--text-secondary)]">{innerSublabel}</span>
        )}
      </div>
    </div>
  );
}

function HorizontalBarChart({
  data,
  size,
  formatValue,
}: {
  data: { name: string; value: number; color: string }[];
  size: WidgetSize;
  formatValue?: (v: number) => string;
}) {
  const isSmall = size === "small";
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const fmt = formatValue ?? ((v: number) => String(v));

  return (
    <div className={`space-y-${isSmall ? "1" : "2"} w-full`}>
      {data.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <span className={`${isSmall ? "w-10 text-[10px]" : "w-16 text-xs"} text-[var(--text-secondary)] truncate`}>{item.name}</span>
          <div className="flex-1 h-5 rounded-full bg-[var(--bg-card-hover)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max((item.value / maxVal) * 100, item.value > 0 ? 4 : 0)}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
          <span className={`${isSmall ? "w-8 text-[10px]" : "w-14 text-xs"} text-right font-semibold text-[var(--text-primary)]`}>
            {fmt(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface WidgetProps {
  type: WidgetType;
  size: WidgetSize;
  data?: any;
  isLoading?: boolean;
}

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(num);
}

export function Widget({ type, size, data, isLoading }: WidgetProps) {
  const isSmall = size === "small";
  const isMedium = size === "medium";
  const isLarge = size === "large";

  // Modal state hooks
  const [showMahnungModal, setShowMahnungModal] = useState(false);
  const [showNeuesObjekt, setShowNeuesObjekt] = useState(false);
  const [showNeueEinheit, setShowNeueEinheit] = useState(false);
  const [showNeuerMieter, setShowNeuerMieter] = useState(false);
  const [showDokumentUpload, setShowDokumentUpload] = useState(false);
  const [chartJahr, setChartJahr] = useState(new Date().getFullYear());
  const [chartZeitraum, setChartZeitraum] = useState<"jahr" | "Q1" | "Q2" | "Q3" | "Q4" | "custom">("jahr");
  const [chartVon, setChartVon] = useState(0);   // month index 0-11
  const [chartBis, setChartBis] = useState(11);   // month index 0-11

  // All statistics hooks at top level — React Rules of Hooks requires unconditional calls
  const { data: vermietungData, isLoading: vermietungLoading } = trpc.statistik.vermietung.useQuery();
  const { data: sollIstData, isLoading: sollIstLoading } = trpc.statistik.sollIst.useQuery();
  const { data: cashflowData, isLoading: cashflowLoading } = trpc.statistik.cashflow.useQuery();
  const { data: finanzierungData, isLoading: finanzierungLoading } = trpc.statistik.finanzierung.useQuery();
  const { data: kostenAnalyseData, isLoading: kostenAnalyseLoading } = trpc.statistik.kostenAnalyse.useQuery();
  const { data: ticketAnalyseData, isLoading: ticketAnalyseLoading } = trpc.statistik.ticketAnalyse.useQuery();
  const { data: zaehlerAnalyseData, isLoading: zaehlerAnalyseLoading } = trpc.statistik.zaehlerAnalyse.useQuery();
  const { data: mieteAnalyseData, isLoading: mieteAnalyseLoading } = trpc.statistik.mieteAnalyse.useQuery();
  const { data: datenqualitaetData, isLoading: datenqualitaetLoading } = trpc.statistik.datenqualitaet.useQuery();
  const { data: sollIstMonatlichData, isLoading: sollIstMonatlichLoading } = trpc.statistik.sollIstMonatlich.useQuery({ jahr: chartJahr });
  const { data: cashflowMonatlichData, isLoading: cashflowMonatlichLoading } = trpc.statistik.cashflowMonatlich.useQuery({ jahr: chartJahr });
  const { data: kostenMonatlichData, isLoading: kostenMonatlichLoading } = trpc.statistik.kostenMonatlich.useQuery({ jahr: chartJahr });
  const { data: ticketsMonatlichData, isLoading: ticketsMonatlichLoading } = trpc.statistik.ticketsMonatlich.useQuery({ jahr: chartJahr });

  // Objekte Widget
  if (type === "objekte") {
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Objekte</p>
              <p className={`mt-2 font-bold tracking-tight text-[var(--text-primary)] ${isSmall ? "text-2xl" : "text-3xl"}`}>
                {isLoading ? "—" : data?.objekte ?? 0}
              </p>
            </div>
            <div className="ml-4 rounded-xl bg-blue-500/15 p-3">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          {!isSmall && (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Verwaltete Liegenschaften</p>
          )}
        </div>
      </div>
    );
  }

  // Einheiten Widget
  if (type === "einheiten") {
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Einheiten</p>
              <p className={`mt-2 font-bold tracking-tight text-[var(--text-primary)] ${isSmall ? "text-2xl" : "text-3xl"}`}>
                {isLoading ? "—" : data?.einheiten?.gesamt ?? 0}
              </p>
            </div>
            <div className="ml-4 rounded-xl bg-green-500/15 p-3">
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          </div>
          {!isSmall && !isLoading && data && (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              <span className="font-medium text-green-400">{data.einheiten.vermietet} vermietet</span>
              {" · "}
              <span className="font-medium text-[var(--text-muted)]">{data.einheiten.frei} frei</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Rückstände Widget
  if (type === "rueckstaende") {
    const hasArrears = !isLoading && parseFloat(String(data?.rueckstaende ?? 0)) > 0;
    return (
      <div className={`h-full rounded-xl border p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow ${hasArrears ? "border-orange-500/25 bg-orange-950/40" : "border-[var(--border)] bg-[var(--bg-card)]"}`}>
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${hasArrears ? "text-orange-400" : "text-[var(--text-secondary)]"}`}>
                Offene Rückstände
              </p>
              <p className={`mt-2 font-bold tracking-tight ${hasArrears ? "text-orange-300" : "text-[var(--text-primary)]"} ${isSmall ? "text-xl" : "text-3xl"}`}>
                {isLoading ? "—" : formatCurrency(data?.rueckstaende ?? 0)}
              </p>
            </div>
            <div className={`ml-4 rounded-xl p-3 ${hasArrears ? "bg-orange-500/20" : "bg-orange-500/15"}`}>
              <svg className={`h-5 w-5 ${hasArrears ? "text-orange-400" : "text-orange-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {!isSmall && (
            <p className={`mt-3 text-sm ${hasArrears ? "text-orange-400" : "text-[var(--text-secondary)]"}`}>Fällige Zahlungen</p>
          )}
        </div>
      </div>
    );
  }

  // Tickets Widget
  if (type === "tickets") {
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Offene Tickets</p>
              <p className={`mt-2 font-bold tracking-tight text-[var(--text-primary)] ${isSmall ? "text-2xl" : "text-3xl"}`}>
                {isLoading ? "—" : data?.offeneTickets ?? 0}
              </p>
            </div>
            <div className="ml-4 rounded-xl bg-red-500/15 p-3">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {!isSmall && (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Zu bearbeitende Meldungen</p>
          )}
        </div>
      </div>
    );
  }

  // Vermietungsquote Widget
  if (type === "vermietungsquote") {
    const occupancyRate = data?.einheiten?.gesamt
      ? Math.round((data.einheiten.vermietet / data.einheiten.gesamt) * 100)
      : 0;

    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">Vermietungsquote</p>
            <p className={`mt-2 font-bold text-[var(--text-primary)] ${isSmall ? "text-2xl" : "text-3xl"}`}>
              {isLoading ? "—" : `${occupancyRate} %`}
            </p>
          </div>
          <div className="mt-4">
            <div className="h-2.5 w-full rounded-full bg-[var(--bg-card-hover)]">
              <div
                className="h-2.5 rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
            {!isSmall && (
              <div className="mt-2 flex justify-between text-xs text-[var(--text-muted)]">
                <span>{data?.einheiten?.vermietet ?? 0} vermietet</span>
                <span>{data?.einheiten?.frei ?? 0} leer</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handlungsbedarf Widget
  if (type === "handlungsbedarf") {
    const actionItems = [
      { label: "Zahlungen unklar", count: data?.unklareZahlungen ?? 0, href: "/bank" },
      { label: "Offene Tickets", count: data?.offeneTickets ?? 0, href: "/tickets" },
      { label: "Offene Mahnungen", count: data?.offeneMahnungen ?? 0, isMahnung: true },
      { label: "Offene Sollstellungen", count: data?.offeneSollstellungen ?? 0, href: "/sollstellungen" },
    ].filter((item) => item.count > 0);

    if (!isLoading && actionItems.length === 0) {
      return (
        <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 rounded-xl bg-green-500/15 p-3 w-fit">
                <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Alles erledigt</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Keine offenen Aufgaben</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full rounded-xl border border-yellow-500/25 bg-yellow-500/10 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-yellow-400">
          Handlungsbedarf
        </h3>
        <div className="space-y-1">
          {actionItems.map((item) => (
            item.isMahnung ? (
              <button
                key="mahnungen"
                onClick={() => setShowMahnungModal(true)}
                className="no-drag flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-yellow-500/20"
              >
                <span className="text-sm text-yellow-300">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-yellow-300">{item.count}</span>
                  <span className="rounded bg-orange-600 px-2 py-0.5 text-xs font-medium text-white">Erstellen</span>
                </div>
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href!}
                className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors hover:bg-yellow-500/20"
              >
                <span className="text-sm text-yellow-300">{item.label}</span>
                <span className="text-sm font-bold text-yellow-300">{item.count}</span>
              </Link>
            )
          ))}
        </div>
        <MahnungErstellenModal
          open={showMahnungModal}
          onClose={() => setShowMahnungModal(false)}
          onSuccess={() => setShowMahnungModal(false)}
        />
      </div>
    );
  }

  // Schnellzugriff Widget
  if (type === "schnellzugriff") {
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Schnellzugriff
        </h3>
        <div className={`grid gap-3 ${isLarge ? "grid-cols-4" : "grid-cols-2"}`}>
          <button
            onClick={() => setShowNeuesObjekt(true)}
            className="no-drag flex flex-col items-center justify-center rounded-lg border border-blue-500/25 bg-blue-500/10 p-3 transition-all hover:scale-105 hover:bg-blue-500/15"
          >
            <svg className="h-5 w-5 text-blue-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-xs font-medium text-blue-400">+ Objekt</p>
          </button>
          <button
            onClick={() => setShowNeueEinheit(true)}
            className="no-drag flex flex-col items-center justify-center rounded-lg border border-green-500/25 bg-green-500/10 p-3 transition-all hover:scale-105 hover:bg-green-500/15"
          >
            <svg className="h-5 w-5 text-green-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-xs font-medium text-green-400">+ Einheit</p>
          </button>
          <button
            onClick={() => setShowNeuerMieter(true)}
            className="no-drag flex flex-col items-center justify-center rounded-lg border border-purple-500/25 bg-purple-500/10 p-3 transition-all hover:scale-105 hover:bg-purple-500/20"
          >
            <svg className="h-5 w-5 text-purple-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-xs font-medium text-purple-400">+ Mieter</p>
          </button>
          <button
            onClick={() => setShowDokumentUpload(true)}
            className="no-drag flex flex-col items-center justify-center rounded-lg border border-orange-500/25 bg-orange-500/10 p-3 transition-all hover:scale-105 hover:bg-orange-500/15"
          >
            <svg className="h-5 w-5 text-orange-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-xs font-medium text-orange-400">Beleg</p>
          </button>
        </div>

        {/* Modals */}
        <NeuesObjektModal
          isOpen={showNeuesObjekt}
          onClose={() => setShowNeuesObjekt(false)}
          onSuccess={() => setShowNeuesObjekt(false)}
        />
        <NeueEinheitModal
          isOpen={showNeueEinheit}
          onClose={() => setShowNeueEinheit(false)}
          onSuccess={() => setShowNeueEinheit(false)}
        />
        {showNeuerMieter && (
          <ErweiterterMieterModal
            isOpen={showNeuerMieter}
            onClose={() => setShowNeuerMieter(false)}
            onSuccess={() => setShowNeuerMieter(false)}
          />
        )}
        <DokumentUploadModal
          open={showDokumentUpload}
          onClose={() => setShowDokumentUpload(false)}
        />
      </div>
    );
  }

  // ───────────────────────────────────────────────────────
  // A) Vermietung Widgets
  // ───────────────────────────────────────────────────────

  if (type === "belegungsquote") {
    const stats = vermietungData; const loading = vermietungLoading;
    const quote = stats?.belegungsquote ?? 0;
    const chartData = stats ? [
      { name: "Vermietet", value: stats.einheitenVermietet, color: CHART_COLORS.emerald },
      { name: "Leer", value: stats.einheitenLeer, color: CHART_COLORS.gray },
    ] : [];
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Belegungsquote</p>
          {loading ? (
            <p className="mt-4 text-2xl font-bold text-[var(--text-primary)]">—</p>
          ) : (
            <>
              <DonutChart
                data={chartData}
                innerLabel={`${quote.toFixed(1)}%`}
                innerSublabel="belegt"
                size={size}
              />
              {!isSmall && stats && (
                <div className="mt-1 flex justify-between text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    {stats.einheitenVermietet} vermietet
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
                    {stats.einheitenLeer} leer
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (type === "leerstandsquote") {
    const stats = vermietungData; const loading = vermietungLoading;
    const quote = stats?.leerstandsquote ?? 0;
    const isHigh = quote > 10;
    return (
      <div className={`h-full rounded-xl border p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow ${isHigh ? "border-red-200 bg-red-50" : "border-[var(--border)] bg-[var(--bg-card)]"}`}>
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${isHigh ? "text-red-700" : "text-[var(--text-secondary)]"}`}>Leerstandsquote</p>
              <p className={`mt-2 font-bold tracking-tight ${isHigh ? "text-red-900" : "text-[var(--text-primary)]"} ${isSmall ? "text-2xl" : "text-3xl"}`}>
                {loading ? "—" : `${quote.toFixed(1)} %`}
              </p>
            </div>
            <div className={`ml-4 rounded-xl p-3 ${isHigh ? "bg-red-200" : "bg-emerald-100"}`}>
              <svg className={`h-5 w-5 ${isHigh ? "text-red-700" : "text-emerald-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          </div>
          {!isSmall && stats && (
            <p className={`mt-3 text-sm ${isHigh ? "text-red-400" : "text-[var(--text-secondary)]"}`}>
              {stats.einheitenLeer} von {stats.einheitenGesamt} Einheiten leer
            </p>
          )}
        </div>
      </div>
    );
  }

  if (type === "leerstandsdauer") {
    const stats = vermietungData; const loading = vermietungLoading;
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Leerstandsdauer</p>
              <p className={`mt-2 font-bold tracking-tight text-[var(--text-primary)] ${isSmall ? "text-2xl" : "text-3xl"}`}>
                {loading ? "—" : `${stats?.avgLeerstandsdauerTage?.toFixed(0) ?? 0} Tage`}
              </p>
            </div>
            <div className="ml-4 rounded-xl bg-emerald-100 p-3">
              <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {!isSmall && (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Durchschnittliche Leerstandsdauer</p>
          )}
        </div>
      </div>
    );
  }

  if (type === "fluktuationsquote") {
    const stats = vermietungData; const loading = vermietungLoading;
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Fluktuationsquote</p>
              <p className={`mt-2 font-bold tracking-tight text-[var(--text-primary)] ${isSmall ? "text-2xl" : "text-3xl"}`}>
                {loading ? "—" : `${stats?.fluktuationsquote?.toFixed(1) ?? 0} %`}
              </p>
            </div>
            <div className="ml-4 rounded-xl bg-emerald-100 p-3">
              <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
          {!isSmall && (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Kuendigungen / Gesamteinheiten p.a.</p>
          )}
        </div>
      </div>
    );
  }

  if (type === "ertragsverlustLeerstand") {
    const stats = vermietungData; const loading = vermietungLoading;
    const verlust = stats?.ertragsverlustLeerstand ?? 0;
    const hasLoss = verlust > 0;
    return (
      <div className={`h-full rounded-xl border p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow ${hasLoss ? "border-orange-500/25 bg-orange-50" : "border-[var(--border)] bg-[var(--bg-card)]"}`}>
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${hasLoss ? "text-orange-400" : "text-[var(--text-secondary)]"}`}>Ertragsverlust</p>
              <p className={`mt-2 font-bold tracking-tight ${hasLoss ? "text-orange-300" : "text-[var(--text-primary)]"} ${isSmall ? "text-xl" : "text-3xl"}`}>
                {loading ? "—" : formatCurrency(verlust)}
              </p>
            </div>
            <div className={`ml-4 rounded-xl p-3 ${hasLoss ? "bg-orange-500/20" : "bg-emerald-100"}`}>
              <svg className={`h-5 w-5 ${hasLoss ? "text-orange-400" : "text-emerald-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
          {!isSmall && (
            <p className={`mt-3 text-sm ${hasLoss ? "text-orange-400" : "text-[var(--text-secondary)]"}`}>Entgangene Mieteinnahmen durch Leerstand</p>
          )}
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────
  // B) Soll/Ist Widgets
  // ───────────────────────────────────────────────────────

  if (type === "sollstellungen") {
    const stats = sollIstData; const loading = sollIstLoading;
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Sollstellungen</p>
              <p className={`mt-2 font-bold tracking-tight text-[var(--text-primary)] ${isSmall ? "text-xl" : "text-3xl"}`}>
                {loading ? "—" : formatCurrency(stats?.sollSumme ?? 0)}
              </p>
            </div>
            <div className="ml-4 rounded-xl bg-blue-500/15 p-3">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          {!isSmall && (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Monatliche Soll-Mieten gesamt</p>
          )}
        </div>
      </div>
    );
  }

  if (type === "istzahlungen") {
    const stats = sollIstData; const loading = sollIstLoading;
    return (
      <div className="h-full rounded-xl border border-green-200 bg-green-500/10 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-green-400">Ist-Zahlungen</p>
              <p className={`mt-2 font-bold tracking-tight text-green-900 ${isSmall ? "text-xl" : "text-3xl"}`}>
                {loading ? "—" : formatCurrency(stats?.istSumme ?? 0)}
              </p>
            </div>
            <div className="ml-4 rounded-xl bg-green-200 p-3">
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          {!isSmall && (
            <p className="mt-3 text-sm text-green-400">Tatsaechlich eingegangene Zahlungen</p>
          )}
        </div>
      </div>
    );
  }

  if (type === "einzugsquote") {
    const stats = sollIstData; const loading = sollIstLoading;
    const quote = stats?.einzugsquote ?? 0;
    const mainColor = quote > 95 ? CHART_COLORS.green : quote > 80 ? CHART_COLORS.yellow : CHART_COLORS.red;
    const offen = stats ? stats.sollSumme - stats.istSumme : 0;
    const chartData = stats ? [
      { name: "Eingezogen", value: stats.istSumme, color: mainColor },
      { name: "Offen", value: Math.max(offen, 0), color: CHART_COLORS.gray },
    ] : [];
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Einzugsquote</p>
          {loading ? (
            <p className="mt-4 text-2xl font-bold text-[var(--text-primary)]">—</p>
          ) : (
            <>
              <DonutChart
                data={chartData}
                innerLabel={`${quote.toFixed(1)}%`}
                innerSublabel="eingezogen"
                size={size}
              />
              {!isSmall && stats && (
                <p className="mt-1 text-center text-xs text-[var(--text-secondary)]">
                  {formatCurrency(stats.istSumme)} von {formatCurrency(stats.sollSumme)}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (type === "mietrueckstaende") {
    const stats = sollIstData; const loading = sollIstLoading;
    const rueckstaende = stats?.rueckstaende ?? 0;
    const hasArrears = rueckstaende > 0;
    return (
      <div className={`h-full rounded-xl border p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow ${hasArrears ? "border-orange-500/25 bg-orange-950/40" : "border-[var(--border)] bg-[var(--bg-card)]"}`}>
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${hasArrears ? "text-orange-400" : "text-[var(--text-secondary)]"}`}>Mietrueckstaende</p>
              <p className={`mt-2 font-bold tracking-tight ${hasArrears ? "text-orange-300" : "text-[var(--text-primary)]"} ${isSmall ? "text-xl" : "text-3xl"}`}>
                {loading ? "—" : formatCurrency(rueckstaende)}
              </p>
            </div>
            <div className={`ml-4 rounded-xl p-3 ${hasArrears ? "bg-orange-500/20" : "bg-blue-500/15"}`}>
              <svg className={`h-5 w-5 ${hasArrears ? "text-orange-400" : "text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {!isSmall && stats && (
            <p className={`mt-3 text-sm ${hasArrears ? "text-orange-400" : "text-[var(--text-secondary)]"}`}>
              {stats.rueckstaendeMieterAnzahl} Mieter betroffen
            </p>
          )}
        </div>
      </div>
    );
  }

  if (type === "agingRueckstaende") {
    const stats = sollIstData; const loading = sollIstLoading;
    const aging = stats?.aging;
    const bars = [
      { name: "0–30", value: aging?.bis30 ?? 0, color: CHART_COLORS.yellow },
      { name: "31–60", value: aging?.bis60 ?? 0, color: CHART_COLORS.orange },
      { name: "61–90", value: aging?.bis90 ?? 0, color: CHART_COLORS.red },
      { name: "> 90", value: aging?.ueber90 ?? 0, color: "#dc2626" },
    ];
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Aging Rückstände</p>
          <div className="mt-3 flex-1">
            {loading ? (
              <p className="text-2xl font-bold text-[var(--text-primary)]">—</p>
            ) : (
              <HorizontalBarChart
                data={bars}
                size={size}
                formatValue={(v) => formatCurrency(v)}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === "zahlungsverzug") {
    const stats = sollIstData; const loading = sollIstLoading;
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Zahlungsverzug</p>
              <p className={`mt-2 font-bold tracking-tight text-[var(--text-primary)] ${isSmall ? "text-2xl" : "text-3xl"}`}>
                {loading ? "—" : `${stats?.avgZahlungsverzugTage?.toFixed(0) ?? 0} Tage`}
              </p>
            </div>
            <div className="ml-4 rounded-xl bg-blue-500/15 p-3">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {!isSmall && (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Durchschnittlicher Zahlungsverzug</p>
          )}
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────
  // C) Cashflow Widgets
  // ───────────────────────────────────────────────────────

  if (type === "operativerCashflow") {
    const stats = cashflowData; const loading = cashflowLoading;
    const value = stats?.operativerCashflow ?? 0;
    const isPositive = value >= 0;
    const chartData = stats ? [
      { name: "Einnahmen", value: stats.einnahmen, fill: CHART_COLORS.green },
      { name: "Ausgaben", value: stats.ausgabenOpex, fill: CHART_COLORS.red },
    ] : [];
    return (
      <div className={`h-full rounded-xl border p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow ${isPositive ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between">
            <p className={`text-sm font-medium ${isPositive ? "text-green-400" : "text-red-700"}`}>Operativer Cashflow</p>
            <p className={`font-bold ${isPositive ? "text-green-900" : "text-red-900"} ${isSmall ? "text-lg" : "text-xl"}`}>
              {loading ? "—" : formatCurrency(value)}
            </p>
          </div>
          {!loading && stats && !isSmall && (
            <div className="mt-2 flex-1" style={{ minHeight: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={65} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v) || 0)} contentStyle={{ fontSize: 12, borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20} animationDuration={600}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {!isSmall && stats && (
            <div className="mt-1 flex justify-between text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                Einnahmen
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                Ausgaben
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === "cashflowNachDebt") {
    const stats = cashflowData; const loading = cashflowLoading;
    const value = stats?.cashflowNachDebt ?? 0;
    const isPositive = value >= 0;
    const chartData = stats ? [
      { name: "Op. CF", value: stats.operativerCashflow, fill: CHART_COLORS.green },
      { name: "Kapital", value: stats.debtServiceGesamt, fill: CHART_COLORS.violet },
    ] : [];
    return (
      <div className={`h-full rounded-xl border p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow ${isPositive ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between">
            <p className={`text-sm font-medium ${isPositive ? "text-green-400" : "text-red-700"}`}>CF nach Kapitaldienst</p>
            <p className={`font-bold ${isPositive ? "text-green-900" : "text-red-900"} ${isSmall ? "text-lg" : "text-xl"}`}>
              {loading ? "—" : formatCurrency(value)}
            </p>
          </div>
          {!loading && stats && !isSmall && (
            <div className="mt-2 flex-1" style={{ minHeight: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={55} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v) || 0)} contentStyle={{ fontSize: 12, borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20} animationDuration={600}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {!isSmall && stats && (
            <div className="mt-1 flex justify-between text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                Cashflow
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
                Kapitaldienst
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === "debtService") {
    const stats = cashflowData; const loading = cashflowLoading;
    const chartData = stats ? [
      { name: "Zins", value: stats.debtServiceZins, color: CHART_COLORS.teal },
      { name: "Tilgung", value: stats.debtServiceTilgung, color: CHART_COLORS.violet },
    ].filter((d) => d.value > 0) : [];
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Kapitaldienst</p>
          {loading ? (
            <p className="mt-4 text-2xl font-bold text-[var(--text-primary)]">—</p>
          ) : (
            <>
              <DonutChart
                data={chartData.length > 0 ? chartData : [{ name: "Keine", value: 1, color: CHART_COLORS.gray }]}
                innerLabel={formatCurrency(stats?.debtServiceGesamt ?? 0)}
                size={size}
              />
              {!isSmall && stats && (
                <div className="mt-1 flex justify-center gap-4 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-500" />
                    Zins {formatCurrency(stats.debtServiceZins)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-500" />
                    Tilgung {formatCurrency(stats.debtServiceTilgung)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────
  // D) Finanzierung Widgets
  // ───────────────────────────────────────────────────────

  if (type === "restschuld") {
    const stats = finanzierungData; const loading = finanzierungLoading;
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Restschuld</p>
              <p className={`mt-2 font-bold tracking-tight text-[var(--text-primary)] ${isSmall ? "text-xl" : "text-3xl"}`}>
                {loading ? "—" : formatCurrency(stats?.restschuldGesamt ?? 0)}
              </p>
            </div>
            <div className="ml-4 rounded-xl bg-violet-100 p-3">
              <svg className="h-5 w-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
          </div>
          {!isSmall && stats && (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {stats.krediteAnzahl} Kredite, mtl. Rate {formatCurrency(stats.monatlicheRateGesamt)}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (type === "dscr") {
    const stats = finanzierungData; const loading = finanzierungLoading;
    const value = stats?.dscr ?? 0;
    const mainColor = value > 1.2 ? CHART_COLORS.green : value > 1.0 ? CHART_COLORS.yellow : CHART_COLORS.red;
    const bgColor = value > 1.2 ? "border-green-200 bg-green-50" : value > 1.0 ? "border-yellow-500/25 bg-yellow-500/10" : "border-red-200 bg-red-50";
    const label = value > 1.2 ? "gut" : value > 1.0 ? "grenzwertig" : "kritisch";
    // Gauge: fill proportional to DSCR (0 to 2 as max)
    const fill = Math.min(value / 2, 1);
    const chartData = [
      { name: "DSCR", value: fill * 100, color: mainColor },
      { name: "Rest", value: (1 - fill) * 100, color: CHART_COLORS.gray },
    ];
    return (
      <div className={`h-full rounded-xl border p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow ${bgColor}`}>
        <div className="flex h-full flex-col">
          <p className="text-sm font-medium text-[var(--text-secondary)]">DSCR</p>
          {loading ? (
            <p className="mt-4 text-2xl font-bold text-[var(--text-primary)]">—</p>
          ) : (
            <>
              <DonutChart
                data={chartData}
                innerLabel={`${value.toFixed(2)}x`}
                innerSublabel={label}
                size={size}
              />
              {!isSmall && (
                <p className="mt-1 text-center text-xs text-[var(--text-secondary)]">
                  Schuldendienstdeckungsgrad
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (type === "kredituebersicht") {
    const stats = finanzierungData; const loading = finanzierungLoading;
    const kredite = stats?.krediteDetails ?? [];
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-[var(--text-secondary)]">Kredituebersicht</p>
            <div className="ml-4 rounded-xl bg-violet-100 p-3">
              <svg className="h-5 w-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex-1 overflow-auto">
            {loading ? (
              <p className="text-2xl font-bold text-[var(--text-primary)]">—</p>
            ) : kredite.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Keine Kredite vorhanden</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                    <th className="pb-1 font-medium">Kredit</th>
                    {!isSmall && <th className="pb-1 font-medium">Bank</th>}
                    <th className="pb-1 text-right font-medium">Restschuld</th>
                    {!isSmall && <th className="pb-1 text-right font-medium">Rate</th>}
                  </tr>
                </thead>
                <tbody>
                  {kredite.map((k, idx) => (
                    <tr key={idx} className="border-b border-[var(--border)]">
                      <td className="py-1.5 font-medium text-[var(--text-primary)] truncate max-w-[100px]">{k.bezeichnung}</td>
                      {!isSmall && <td className="py-1.5 text-[var(--text-secondary)] truncate max-w-[80px]">{k.bank}</td>}
                      <td className="py-1.5 text-right text-[var(--text-primary)]">{formatCurrency(k.restschuld)}</td>
                      {!isSmall && <td className="py-1.5 text-right text-[var(--text-secondary)]">{formatCurrency(k.rate)}/mtl.</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────
  // E) Kosten Widgets
  // ───────────────────────────────────────────────────────

  if (type === "kostenGesamt") {
    const stats = kostenAnalyseData; const loading = kostenAnalyseLoading;
    const chartData = stats ? [
      { name: "BK", value: stats.bkRelevant, color: CHART_COLORS.blue },
      { name: "HK", value: stats.hkRelevant, color: CHART_COLORS.orange },
      { name: "Sonstige", value: stats.sonstige, color: CHART_COLORS.grayDark },
    ].filter((d) => d.value > 0) : [];
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Gesamtkosten</p>
          {loading ? (
            <p className="mt-4 text-2xl font-bold text-[var(--text-primary)]">—</p>
          ) : (
            <>
              <DonutChart
                data={chartData.length > 0 ? chartData : [{ name: "Keine", value: 1, color: CHART_COLORS.gray }]}
                innerLabel={formatCurrency(stats?.kostenGesamt ?? 0)}
                size={size}
              />
              {!isSmall && stats && (
                <div className="mt-1 flex flex-wrap justify-center gap-3 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                    BK {formatCurrency(stats.bkRelevant)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
                    HK {formatCurrency(stats.hkRelevant)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--border)] dark:bg-gray-500" />
                    Sonst. {formatCurrency(stats.sonstige)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (type === "kostenProQm") {
    const stats = kostenAnalyseData; const loading = kostenAnalyseLoading;
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Kosten pro m{"\u00B2"}</p>
              <p className={`mt-2 font-bold tracking-tight text-[var(--text-primary)] ${isSmall ? "text-xl" : "text-3xl"}`}>
                {loading ? "—" : `${formatCurrency(stats?.kostenProQm ?? 0)}/m\u00B2`}
              </p>
            </div>
            <div className="ml-4 rounded-xl bg-rose-100 p-3">
              <svg className="h-5 w-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
          </div>
          {!isSmall && stats && (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Gesamtflaeche: {stats.gesamtFlaeche?.toFixed(0) ?? 0} m{"\u00B2"}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (type === "kostenNachKategorie") {
    const stats = kostenAnalyseData; const loading = kostenAnalyseLoading;
    const kategorien = stats?.nachKategorie ?? [];
    const pieColors = [CHART_COLORS.rose, CHART_COLORS.blue, CHART_COLORS.orange, CHART_COLORS.teal, CHART_COLORS.violet, CHART_COLORS.amber, CHART_COLORS.cyan, CHART_COLORS.indigo];
    const chartData = kategorien.map((k, idx) => ({
      name: k.kategorie,
      value: k.summe,
      color: pieColors[idx % pieColors.length],
    }));
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Kosten nach Kategorie</p>
          {loading ? (
            <p className="mt-4 text-2xl font-bold text-[var(--text-primary)]">—</p>
          ) : kategorien.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">Keine Kostendaten vorhanden</p>
          ) : (
            <>
              <DonutChart
                data={chartData}
                innerLabel={`${kategorien.length}`}
                innerSublabel="Kategorien"
                size={size}
              />
              {!isSmall && (
                <div className="mt-1 space-y-1 overflow-auto max-h-20">
                  {kategorien.slice(0, 5).map((k, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 truncate max-w-[60%]">
                        <span className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
                        {k.kategorie}
                      </span>
                      <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(k.summe)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────
  // F) Ticket Widgets
  // ───────────────────────────────────────────────────────

  if (type === "ticketsPrioritaet") {
    const stats = ticketAnalyseData; const loading = ticketAnalyseLoading;
    const prio = stats?.nachPrioritaet;
    const bars = [
      { name: "Niedrig", value: prio?.niedrig ?? 0, color: CHART_COLORS.green },
      { name: "Mittel", value: prio?.mittel ?? 0, color: CHART_COLORS.yellow },
      { name: "Hoch", value: prio?.hoch ?? 0, color: CHART_COLORS.orange },
      { name: "Kritisch", value: prio?.kritisch ?? 0, color: CHART_COLORS.red },
    ];
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Tickets nach Priorität</p>
          <div className="mt-3 flex-1">
            {loading ? (
              <p className="text-2xl font-bold text-[var(--text-primary)]">—</p>
            ) : (
              <HorizontalBarChart data={bars} size={size} />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === "ticketBearbeitungszeit") {
    const stats = ticketAnalyseData; const loading = ticketAnalyseLoading;
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Bearbeitungszeit</p>
              <p className={`mt-2 font-bold tracking-tight text-[var(--text-primary)] ${isSmall ? "text-2xl" : "text-3xl"}`}>
                {loading ? "—" : `${stats?.avgBearbeitungsTage?.toFixed(1) ?? 0} Tage`}
              </p>
            </div>
            <div className="ml-4 rounded-xl bg-amber-100 p-3">
              <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {!isSmall && stats && (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {stats.offen} offen, {stats.abgeschlossen} abgeschlossen
            </p>
          )}
        </div>
      </div>
    );
  }

  if (type === "ticketKategorien") {
    const stats = ticketAnalyseData; const loading = ticketAnalyseLoading;
    const kategorien = stats?.topKategorien ?? [];
    const katColors = [CHART_COLORS.amber, CHART_COLORS.orange, CHART_COLORS.rose, CHART_COLORS.violet, CHART_COLORS.blue];
    const bars = kategorien.map((k, idx) => ({
      name: k.kategorie,
      value: k.anzahl,
      color: katColors[idx % katColors.length],
    }));
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Ticket-Kategorien</p>
          <div className="mt-3 flex-1">
            {loading ? (
              <p className="text-2xl font-bold text-[var(--text-primary)]">—</p>
            ) : kategorien.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Keine Ticketdaten vorhanden</p>
            ) : (
              <HorizontalBarChart data={bars} size={size} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────
  // I) Zaehler Widgets
  // ───────────────────────────────────────────────────────

  if (type === "zaehlerVollstaendigkeit") {
    const stats = zaehlerAnalyseData; const loading = zaehlerAnalyseLoading;
    const quote = stats?.vollstaendigkeitsquote ?? 0;
    const mainColor = quote > 90 ? CHART_COLORS.green : quote > 70 ? CHART_COLORS.yellow : CHART_COLORS.red;
    const chartData = stats ? [
      { name: "Mit Ablesung", value: stats.zaehlerMitAblesung, color: mainColor },
      { name: "Ohne", value: stats.zaehlerGesamt - stats.zaehlerMitAblesung, color: CHART_COLORS.gray },
    ] : [];
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Zähler-Vollständigkeit</p>
          {loading ? (
            <p className="mt-4 text-2xl font-bold text-[var(--text-primary)]">—</p>
          ) : (
            <>
              <DonutChart
                data={chartData}
                innerLabel={`${quote.toFixed(0)}%`}
                innerSublabel="erfasst"
                size={size}
              />
              {!isSmall && stats && (
                <div className="mt-1 flex justify-between text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: mainColor }} />
                    {stats.zaehlerMitAblesung} erfasst
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
                    {stats.zaehlerGesamt - stats.zaehlerMitAblesung} offen
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────
  // J) Miete Widgets
  // ───────────────────────────────────────────────────────

  if (type === "kaltmieteProQm") {
    const stats = mieteAnalyseData; const loading = mieteAnalyseLoading;
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Kaltmiete pro m{"\u00B2"}</p>
              <p className={`mt-2 font-bold tracking-tight text-[var(--text-primary)] ${isSmall ? "text-xl" : "text-3xl"}`}>
                {loading ? "—" : `${formatCurrency(stats?.avgKaltmieteProQm ?? 0)}/m\u00B2`}
              </p>
            </div>
            <div className="ml-4 rounded-xl bg-indigo-100 p-3">
              <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
          </div>
          {!isSmall && stats && (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {stats.mietverhaeltnisseAktiv} aktive Mietverhaeltnisse
            </p>
          )}
        </div>
      </div>
    );
  }

  if (type === "gesamtMiete") {
    const stats = mieteAnalyseData; const loading = mieteAnalyseLoading;
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Gesamtmiete</p>
              <p className={`mt-2 font-bold tracking-tight text-[var(--text-primary)] ${isSmall ? "text-xl" : "text-3xl"}`}>
                {loading ? "—" : formatCurrency(stats?.gesamtMonatlicheWarmmiete ?? 0)}
              </p>
            </div>
            <div className="ml-4 rounded-xl bg-indigo-100 p-3">
              <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          {!isSmall && stats && (
            <div className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>Kaltmiete</span>
                <span className="font-medium text-[var(--text-secondary)]">{formatCurrency(stats.gesamtMonatlicheKaltmiete)}</span>
              </div>
              <div className="flex justify-between">
                <span>Warmmiete</span>
                <span className="font-medium text-[var(--text-secondary)]">{formatCurrency(stats.gesamtMonatlicheWarmmiete)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────
  // K) Datenqualitaet Widgets
  // ───────────────────────────────────────────────────────

  if (type === "unzugeordneteZahlungen") {
    const stats = datenqualitaetData; const loading = datenqualitaetLoading;
    const count = stats?.unzugeordneteZahlungen ?? 0;
    const hasIssues = count > 0;
    return (
      <div className={`h-full rounded-xl border p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow ${hasIssues ? "border-orange-500/25 bg-orange-50" : "border-[var(--border)] bg-[var(--bg-card)]"}`}>
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${hasIssues ? "text-orange-400" : "text-[var(--text-secondary)]"}`}>Unzugeordnete Zahlungen</p>
              <p className={`mt-2 font-bold tracking-tight ${hasIssues ? "text-orange-300" : "text-[var(--text-primary)]"} ${isSmall ? "text-2xl" : "text-3xl"}`}>
                {loading ? "—" : count}
              </p>
            </div>
            <div className={`ml-4 rounded-xl p-3 ${hasIssues ? "bg-orange-500/20" : "bg-[var(--bg-card-hover)]"}`}>
              <svg className={`h-5 w-5 ${hasIssues ? "text-orange-400" : "text-[var(--text-secondary)]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {!isSmall && stats && (
            <p className={`mt-3 text-sm ${hasIssues ? "text-orange-400" : "text-[var(--text-secondary)]"}`}>
              Summe: {formatCurrency(stats.unzugeordneteZahlungenSumme)}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (type === "stammdatenLuecken") {
    const stats = datenqualitaetData; const loading = datenqualitaetLoading;
    const luecken = stats?.stammdatenLuecken;
    const total = luecken
      ? (luecken.einheitenOhneFlaeche + luecken.mietverhaeltnisseOhneKaltmiete + luecken.objekteOhneAdresse + luecken.mieterOhneKontakt)
      : 0;
    const hasIssues = total > 0;
    const items = luecken ? [
      { label: "Einheiten ohne Flaeche", value: luecken.einheitenOhneFlaeche },
      { label: "MV ohne Kaltmiete", value: luecken.mietverhaeltnisseOhneKaltmiete },
      { label: "Objekte ohne Adresse", value: luecken.objekteOhneAdresse },
      { label: "Mieter ohne Kontakt", value: luecken.mieterOhneKontakt },
    ] : [];
    return (
      <div className={`h-full rounded-xl border p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow ${hasIssues ? "border-yellow-500/25 bg-yellow-500/10" : "border-[var(--border)] bg-[var(--bg-card)]"}`}>
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${hasIssues ? "text-yellow-400" : "text-[var(--text-secondary)]"}`}>Stammdaten-Luecken</p>
              <p className={`mt-2 font-bold tracking-tight ${hasIssues ? "text-yellow-300" : "text-[var(--text-primary)]"} ${isSmall ? "text-2xl" : "text-3xl"}`}>
                {loading ? "—" : total}
              </p>
            </div>
            <div className={`ml-4 rounded-xl p-3 ${hasIssues ? "bg-yellow-200" : "bg-[var(--bg-card-hover)]"}`}>
              <svg className={`h-5 w-5 ${hasIssues ? "text-yellow-400" : "text-[var(--text-secondary)]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          {!isSmall && luecken && (
            <div className="mt-3 space-y-1">
              {items.filter((i) => i.value > 0).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className={hasIssues ? "text-yellow-400" : "text-[var(--text-secondary)]"}>{item.label}</span>
                  <span className={`font-semibold ${hasIssues ? "text-yellow-300" : "text-[var(--text-primary)]"}`}>{item.value}</span>
                </div>
              ))}
              {items.every((i) => i.value === 0) && (
                <p className="text-xs text-green-400">Alle Stammdaten vollstaendig</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────
  // Time range selector for charts
  // ───────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const quarterRanges: Record<string, [number, number]> = {
    Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11],
  };

  const handleZeitraumChange = (z: typeof chartZeitraum) => {
    setChartZeitraum(z);
    if (z === "jahr") { setChartVon(0); setChartBis(11); }
    else if (z in quarterRanges) { const [v, b] = quarterRanges[z]; setChartVon(v); setChartBis(b); }
  };

  const monatLabels = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

  // Filter chart data by selected range
  const filterByZeitraum = (data: any[] | null) => {
    if (!data) return null;
    const now = new Date();
    const curMonthIdx = now.getMonth();
    return data.filter((_: any, idx: number) => {
      const inRange = idx >= chartVon && idx <= chartBis;
      const inPast = chartJahr < currentYear || idx <= curMonthIdx;
      return inRange && inPast;
    });
  };

  const ZeitraumSelector = () => (
    <div className="flex items-center gap-1.5 flex-wrap">
      <select
        value={chartJahr}
        onChange={(e) => setChartJahr(Number(e.target.value))}
        className="rounded border border-[var(--border)] bg-[var(--bg-page)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-blue-500"
      >
        {yearOptions.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <div className="flex rounded border border-[var(--border)] overflow-hidden">
        {(["jahr", "Q1", "Q2", "Q3", "Q4", "custom"] as const).map((z) => (
          <button
            key={z}
            onClick={() => handleZeitraumChange(z)}
            className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
              chartZeitraum === z
                ? "bg-blue-500/20 text-blue-400"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            {z === "jahr" ? "Jahr" : z === "custom" ? "..." : z}
          </button>
        ))}
      </div>
      {chartZeitraum === "custom" && (
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
          <select
            value={chartVon}
            onChange={(e) => setChartVon(Number(e.target.value))}
            className="rounded border border-[var(--border)] bg-[var(--bg-page)] px-1 py-0.5 text-[10px] text-[var(--text-secondary)]"
          >
            {monatLabels.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <span>–</span>
          <select
            value={chartBis}
            onChange={(e) => setChartBis(Number(e.target.value))}
            className="rounded border border-[var(--border)] bg-[var(--bg-page)] px-1 py-0.5 text-[10px] text-[var(--text-secondary)]"
          >
            {monatLabels.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
      )}
    </div>
  );

  const formatYAxis = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return v.toFixed(0);
  };

  // ───────────────────────────────────────────────────────
  // Zeitverlauf-Charts
  // ───────────────────────────────────────────────────────

  if (type === "sollIstVerlauf") {
    const monate = filterByZeitraum(sollIstMonatlichData ?? null);
    const loading = sollIstMonatlichLoading;
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Soll / Ist Verlauf</p>
              <ZeitraumSelector />
            </div>
            <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                Soll
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                Ist
              </span>
            </div>
          </div>
          <div className="mt-2 flex-1" style={{ minHeight: isSmall ? 100 : 160 }}>
            {loading || !monate ? (
              <p className="mt-4 text-2xl font-bold text-[var(--text-primary)]">—</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monate} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="monat" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v) || 0)}
                    contentStyle={{ fontSize: 12, borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    labelStyle={{ color: "var(--text-secondary)" }}
                  />
                  <Bar dataKey="soll" name="Soll" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} barSize={isSmall ? 6 : 12} animationDuration={600} />
                  <Bar dataKey="ist" name="Ist" fill={CHART_COLORS.green} radius={[3, 3, 0, 0]} barSize={isSmall ? 6 : 12} animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === "cashflowVerlauf") {
    const filteredRaw = filterByZeitraum(cashflowMonatlichData ?? null);
    const monate = filteredRaw?.map((m: any) => {
      const hasData = (m.einnahmen && m.einnahmen !== 0) || (m.ausgaben && m.ausgaben !== 0);
      return hasData ? m : { ...m, einnahmen: null, ausgaben: null, cashflow: null };
    }) ?? null;
    const loading = cashflowMonatlichLoading;
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Cashflow Verlauf</p>
              <ZeitraumSelector />
            </div>
            <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-500" />
                Cashflow
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                Einnahmen
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
                Ausgaben
              </span>
            </div>
          </div>
          <div className="mt-2 flex-1" style={{ minHeight: isSmall ? 100 : 160 }}>
            {loading || !monate ? (
              <p className="mt-4 text-2xl font-bold text-[var(--text-primary)]">—</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monate} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="monat" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v) || 0)}
                    contentStyle={{ fontSize: 12, borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    labelStyle={{ color: "var(--text-secondary)" }}
                  />
                  <Line type="monotone" dataKey="einnahmen" name="Einnahmen" stroke={CHART_COLORS.green} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} animationDuration={600} connectNulls />
                  <Line type="monotone" dataKey="ausgaben" name="Ausgaben" stroke={CHART_COLORS.red} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} animationDuration={600} connectNulls />
                  <Line type="monotone" dataKey="cashflow" name="Cashflow" stroke={CHART_COLORS.teal} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.teal }} activeDot={{ r: 5 }} animationDuration={600} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === "kostenVerlauf") {
    const monate = filterByZeitraum(kostenMonatlichData ?? null); const loading = kostenMonatlichLoading;
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Kosten Verlauf</p>
              <ZeitraumSelector />
            </div>
            <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                BK
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
                HK
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--border)] dark:bg-gray-500" />
                Sonst.
              </span>
            </div>
          </div>
          <div className="mt-2 flex-1" style={{ minHeight: isSmall ? 100 : 160 }}>
            {loading || !monate ? (
              <p className="mt-4 text-2xl font-bold text-[var(--text-primary)]">—</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monate} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="monat" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v) || 0)}
                    contentStyle={{ fontSize: 12, borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    labelStyle={{ color: "var(--text-secondary)" }}
                  />
                  <Bar dataKey="bk" name="BK" stackId="a" fill={CHART_COLORS.blue} barSize={isSmall ? 8 : 16} animationDuration={600} />
                  <Bar dataKey="hk" name="HK" stackId="a" fill={CHART_COLORS.orange} barSize={isSmall ? 8 : 16} animationDuration={600} />
                  <Bar dataKey="sonstige" name="Sonstige" stackId="a" fill={CHART_COLORS.grayDark} radius={[3, 3, 0, 0]} barSize={isSmall ? 8 : 16} animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === "ticketsVerlauf") {
    const monate = filterByZeitraum(ticketsMonatlichData ?? null); const loading = ticketsMonatlichLoading;
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Tickets Verlauf</p>
              <ZeitraumSelector />
            </div>
            <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                Neu
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                Erledigt
              </span>
            </div>
          </div>
          <div className="mt-2 flex-1" style={{ minHeight: isSmall ? 100 : 160 }}>
            {loading || !monate ? (
              <p className="mt-4 text-2xl font-bold text-[var(--text-primary)]">—</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monate} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="monat" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} labelStyle={{ color: "var(--text-secondary)" }} />
                  <Line type="monotone" dataKey="neu" name="Neue Tickets" stroke={CHART_COLORS.amber} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.amber }} activeDot={{ r: 6 }} animationDuration={600} />
                  <Line type="monotone" dataKey="abgeschlossen" name="Abgeschlossen" stroke={CHART_COLORS.green} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: CHART_COLORS.green }} activeDot={{ r: 5 }} animationDuration={600} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
