"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import * as XLSX from "xlsx";

type Zeitraum = "3m" | "6m" | "12m" | "alle";

const zeitraumOptions: { value: Zeitraum; label: string }[] = [
  { value: "3m", label: "3 Monate" },
  { value: "6m", label: "6 Monate" },
  { value: "12m", label: "12 Monate" },
  { value: "alle", label: "Alle" },
];

const tooltipContentStyle = {
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
};
const tooltipLabelStyle = { color: "var(--text-primary)" };
const tooltipItemStyle = { color: "var(--text-secondary)" };

const axisTickStyle = { fill: "#9ca3af", fontSize: 12 };
const gridStroke = "rgba(255,255,255,0.1)";

const legendFormatter = (value: string) => (
  <span style={{ color: "#9ca3af" }}>{value}</span>
);

export default function ReportingPage() {
  const [exporting, setExporting] = useState(false);
  const [zeitraum, setZeitraum] = useState<Zeitraum>("12m");

  const { data: monatsuebersicht } = trpc.reporting.monatsuebersicht.useQuery();
  const { data: statusquoten } = trpc.reporting.statusquoten.useQuery();
  const { data: portfolioData } = trpc.reporting.portfolioExport.useQuery();

  const handleExportExcel = () => {
    if (!portfolioData) return;

    setExporting(true);

    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(portfolioData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Portfolio");

      // Generate Excel file
      XLSX.writeFile(wb, `Portfolio_${new Date().toISOString().substring(0, 10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!portfolioData) return;

    setExporting(true);

    try {
      // Create CSV headers
      const headers = Object.keys(portfolioData[0] || {});
      const csvContent = [
        headers.join(";"),
        ...portfolioData.map((row) =>
          headers.map((h) => (row as Record<string, unknown>)[h] || "").join(";")
        ),
      ].join("\n");

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Portfolio_${new Date().toISOString().substring(0, 10)}.csv`;
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Reporting & Statistik</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Auswertungen und Portfolio-Exporte
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!portfolioData || exporting}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {exporting ? "Exportiere..." : "CSV Export"}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!portfolioData || exporting}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? "Exportiere..." : "Excel Export"}
          </button>
        </div>
      </div>

      {/* Soll/Ist Monatsübersicht */}
      <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Soll/Ist Übersicht
          </h2>
          <div className="flex gap-1">
            {zeitraumOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setZeitraum(opt.value)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  zeitraum === opt.value
                    ? "bg-blue-600 text-white"
                    : "bg-[var(--bg-page)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {(() => {
          const sliceCount =
            zeitraum === "3m" ? 3 : zeitraum === "6m" ? 6 : zeitraum === "12m" ? 12 : undefined;
          const chartData =
            monatsuebersicht && sliceCount
              ? monatsuebersicht.slice(-sliceCount)
              : monatsuebersicht;

          return chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="monat" tick={axisTickStyle} />
                <YAxis tick={axisTickStyle} />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Legend formatter={legendFormatter} />
                <Line
                  type="monotone"
                  dataKey="soll"
                  stroke="#3b82f6"
                  name="Soll (€)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="ist"
                  stroke="#10b981"
                  name="Ist (€)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[var(--text-secondary)]">Keine Daten verfügbar</p>
          );
        })()}
      </div>

      {/* Statusquoten */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Einheiten nach Status
          </h2>
          {statusquoten?.einheiten && statusquoten.einheiten.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusquoten.einheiten}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="status" tick={axisTickStyle} />
                <YAxis tick={axisTickStyle} />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Bar dataKey="anzahl" fill="#3b82f6" name="Anzahl" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[var(--text-secondary)]">Keine Daten verfügbar</p>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Tickets nach Status
          </h2>
          {statusquoten?.tickets && statusquoten.tickets.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusquoten.tickets}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="status" tick={axisTickStyle} />
                <YAxis tick={axisTickStyle} />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Bar dataKey="anzahl" fill="#f59e0b" name="Anzahl" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[var(--text-secondary)]">Keine Daten verfügbar</p>
          )}
        </div>
      </div>

      {/* Portfolio Preview */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Portfolio-Übersicht
        </h2>
        {portfolioData && portfolioData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--bg-page)]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Objekt
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Einheit
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Typ
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Fläche (m²)
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Kaltmiete
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
                {portfolioData.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-card-hover)]">
                    <td className="px-4 py-2 text-sm text-[var(--text-primary)]">
                      {item.objektBezeichnung}
                    </td>
                    <td className="px-4 py-2 text-sm text-[var(--text-primary)]">
                      {item.einheitNr}
                    </td>
                    <td className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                      {item.einheitTyp}
                    </td>
                    <td className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                      {item.flaeche}
                    </td>
                    <td className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                      {item.status}
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium text-[var(--text-primary)]">
                      {item.kaltmiete} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {portfolioData.length > 10 && (
              <p className="mt-4 text-sm text-[var(--text-secondary)]">
                Zeige 10 von {portfolioData.length} Einheiten. Nutze Export für vollständige Liste.
              </p>
            )}
          </div>
        ) : (
          <p className="text-[var(--text-secondary)]">Keine Daten verfügbar</p>
        )}
      </div>
    </div>
  );
}
