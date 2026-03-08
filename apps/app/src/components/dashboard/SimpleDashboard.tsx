"use client";

import { useState, useMemo } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { Widget, type DashboardData } from "./widgets/Widget";
import { WidgetLibrary } from "./WidgetLibrary";
import { VerlaufModal } from "./VerlaufModal";
import { WIDGET_DEFINITIONS } from "./widgets/definitions";
import { WidgetType, WidgetSize } from "./widgets/types";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./dashboard-custom.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface WidgetConfig {
  i: string;
  type: string;
  size: "small" | "medium" | "large";
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SimpleDashboardProps {
  data?: DashboardData;
  isLoading?: boolean;
  objektFilter?: string;
  zeitraum?: string;
  objekte?: { id: string; bezeichnung: string }[];
  onObjektChange?: (v: string) => void;
  onZeitraumChange?: (v: string) => void;
}

// Feste DEFAULT_WIDGETS - 4 Spalten Grid
const DEFAULT_WIDGETS: WidgetConfig[] = [
  // Reihe 1: 4 kleine Widgets (jeweils 1 Spalte breit)
  { i: "objekte-1", type: "objekte", size: "small", x: 0, y: 0, w: 1, h: 2 },
  { i: "einheiten-1", type: "einheiten", size: "small", x: 1, y: 0, w: 1, h: 2 },
  { i: "rueckstaende-1", type: "rueckstaende", size: "small", x: 2, y: 0, w: 1, h: 2 },
  { i: "tickets-1", type: "tickets", size: "small", x: 3, y: 0, w: 1, h: 2 },

  // Reihe 2: 2 mittlere Widgets (jeweils 2 Spalten breit)
  { i: "vermietungsquote-1", type: "vermietungsquote", size: "medium", x: 0, y: 2, w: 2, h: 3 },
  { i: "handlungsbedarf-1", type: "handlungsbedarf", size: "medium", x: 2, y: 2, w: 2, h: 3 },

  // Reihe 3: 1 großes Widget (4 Spalten breit)
  { i: "schnellzugriff-1", type: "schnellzugriff", size: "large", x: 0, y: 5, w: 4, h: 3 },

  // Reihe 4: 4 neue Statistik-Widgets
  { i: "belegungsquote-1", type: "belegungsquote", size: "small", x: 0, y: 8, w: 1, h: 2 },
  { i: "einzugsquote-1", type: "einzugsquote", size: "small", x: 1, y: 8, w: 1, h: 2 },
  { i: "operativerCashflow-1", type: "operativerCashflow", size: "small", x: 2, y: 8, w: 1, h: 2 },
  { i: "kaltmieteProQm-1", type: "kaltmieteProQm", size: "small", x: 3, y: 8, w: 1, h: 2 },

  // Reihe 5: 2 Zeitverlauf-Charts
  { i: "sollIstVerlauf-1", type: "sollIstVerlauf", size: "medium", x: 0, y: 10, w: 2, h: 3 },
  { i: "cashflowVerlauf-1", type: "cashflowVerlauf", size: "medium", x: 2, y: 10, w: 2, h: 3 },
];

export function SimpleDashboard({ data, isLoading, objektFilter, zeitraum, objekte, onObjektChange, onZeitraumChange }: SimpleDashboardProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [isEditing, setIsEditing] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [verlaufWidget, setVerlaufWidget] = useState<{ type: string; name: string } | null>(null);

  // Layout für react-grid-layout mit FESTEN Größen
  const layout: Layout[] = useMemo(
    () =>
      widgets.map((widget) => ({
        i: widget.i,
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h,
        minW: widget.w,
        maxW: widget.w,
        minH: widget.h,
        maxH: widget.h,
        isDraggable: isEditing,
        isResizable: false,
        static: false,
      })),
    [widgets, isEditing]
  );

  // Handle Layout Change - NUR Position, NIEMALS Größe
  const handleLayoutChange = (newLayout: Layout[]) => {
    if (!isEditing) return;

    setWidgets((prev) =>
      prev.map((widget) => {
        const layoutItem = newLayout.find((l) => l.i === widget.i);
        if (layoutItem) {
          return {
            ...widget,
            x: layoutItem.x,
            y: layoutItem.y,
            // w und h bleiben IMMER gleich!
          };
        }
        return widget;
      })
    );
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.i !== id));
  };

  const handleAddWidget = (type: WidgetType, size: WidgetSize) => {
    const definition = WIDGET_DEFINITIONS.find((w) => w.type === type);
    if (!definition) return;

    const sizeConfig = definition.sizes[size];
    const newId = `${type}-${Date.now()}`;

    const newWidget: WidgetConfig = {
      i: newId,
      type,
      size,
      x: 0,
      y: 0, // Grid platziert es automatisch
      w: sizeConfig.w,
      h: sizeConfig.h,
    };

    setWidgets((prev) => [...prev, newWidget]);
  };

  const activeWidgetTypes = useMemo(
    () => widgets.map((w) => w.type as WidgetType),
    [widgets]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {new Date().toLocaleDateString("de-DE", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing && (
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            >
              + Widget hinzufügen
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isEditing
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            {isEditing ? "Fertig" : "Bearbeiten"}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {(objektFilter !== undefined) && (
        <div className="flex flex-wrap gap-3">
          <select
            value={objektFilter}
            onChange={(e) => onObjektChange?.(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Alle Objekte</option>
            {objekte?.map((o) => (
              <option key={o.id} value={o.id}>{o.bezeichnung}</option>
            ))}
          </select>
          <select
            value={zeitraum}
            onChange={(e) => onZeitraumChange?.(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Gesamtzeitraum</option>
            <option value="MONAT">Letzter Monat</option>
            <option value="QUARTAL">Letztes Quartal</option>
            <option value="JAHR">Letztes Jahr</option>
          </select>
          {(objektFilter || zeitraum) && (
            <button
              onClick={() => { onObjektChange?.(""); onZeitraumChange?.(""); }}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Edit Mode Hint */}
      {isEditing && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-300">
              <span className="font-semibold">Bearbeitungsmodus aktiv:</span> Klicken Sie auf das X, um Widgets zu entfernen.
            </p>
          </div>
        </div>
      )}

      {/* Dashboard Grid - Mit react-grid-layout aber FESTEN Größen */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 4, md: 4, sm: 4, xs: 4, xxs: 4 }}
          rowHeight={80}
          onLayoutChange={handleLayoutChange}
          isDraggable={isEditing}
          isResizable={false}
          compactType="vertical"
          preventCollision={false}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          draggableCancel=".no-drag"
        >
          {widgets.map((widget) => {
            const widgetName = WIDGET_DEFINITIONS.find((d) => d.type === widget.type)?.name ?? widget.type;
            return (
              /*
               * [&>div]:pb-10 adds bottom-padding to Widget's own card div (the direct child),
               * so the card visually extends 40px at the bottom — that's where the Verlauf
               * button sits. The button is INSIDE the card border, not outside it.
               */
              <div key={widget.i} className={`relative ${!isEditing ? "[&>div]:pb-10" : ""}`}>
                <Widget
                  type={widget.type as WidgetType}
                  size={widget.size}
                  data={data}
                  isLoading={isLoading}
                />

                {/* Verlauf button — inside the card's padded bottom area */}
                {!isEditing && (
                  <button
                    className="no-drag absolute bottom-2.5 left-1/2 z-10 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)]/95 px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] shadow transition-all hover:border-blue-400 hover:bg-blue-500/10 hover:text-blue-400 hover:shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVerlaufWidget({ type: widget.type, name: widgetName });
                    }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verlauf
                  </button>
                )}

                {isEditing && (
                  <>
                    <div className="absolute inset-0 z-10 cursor-move" style={{ pointerEvents: "auto" }} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveWidget(widget.i);
                      }}
                      className="no-drag absolute right-2 top-2 z-20 rounded-full bg-red-500 p-2 text-white shadow-lg transition-all hover:scale-110 hover:bg-red-600"
                      style={{ pointerEvents: "auto" }}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </ResponsiveGridLayout>
      </div>

      {/* Widget Library Modal */}
      <WidgetLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onAdd={handleAddWidget}
        activeWidgets={activeWidgetTypes}
      />

      {/* Verlauf Modal */}
      {verlaufWidget && (
        <VerlaufModal
          widgetTyp={verlaufWidget.type}
          widgetName={verlaufWidget.name}
          onClose={() => setVerlaufWidget(null)}
        />
      )}
    </div>
  );
}
