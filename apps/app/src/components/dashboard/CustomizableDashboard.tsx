"use client";

import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { WidgetConfig, WidgetType, WidgetSize } from "./widgets/types";
import { WIDGET_DEFINITIONS } from "./widgets/definitions";
import { Widget, type DashboardData } from "./widgets/Widget";
import { WidgetLibrary } from "./WidgetLibrary";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./dashboard-custom.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

const noopSubscribe = () => () => {};
const getTrue = () => true;
const getFalse = () => false;

interface CustomizableDashboardProps {
  data?: DashboardData;
  isLoading?: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  // Reihe 1: 4 kleine Widgets nebeneinander (wie im Screenshot)
  { i: "objekte-1", type: "objekte", size: "small", x: 0, y: 0, w: 3, h: 2 },
  { i: "einheiten-1", type: "einheiten", size: "small", x: 3, y: 0, w: 3, h: 2 },
  { i: "rueckstaende-1", type: "rueckstaende", size: "small", x: 6, y: 0, w: 3, h: 2 },
  { i: "tickets-1", type: "tickets", size: "small", x: 9, y: 0, w: 3, h: 2 },

  // Reihe 2: 2 mittlere Widgets nebeneinander
  { i: "vermietungsquote-1", type: "vermietungsquote", size: "medium", x: 0, y: 2, w: 6, h: 3 },
  { i: "handlungsbedarf-1", type: "handlungsbedarf", size: "medium", x: 6, y: 2, w: 6, h: 3 },

  // Reihe 3: 1 großes Widget (Schnellzugriff)
  { i: "schnellzugriff-1", type: "schnellzugriff", size: "large", x: 0, y: 5, w: 12, h: 3 },
];

export function CustomizableDashboard({ data, isLoading }: CustomizableDashboardProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("dashboard-widgets", JSON.stringify(DEFAULT_WIDGETS));
    }
    return DEFAULT_WIDGETS;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const mounted = useSyncExternalStore(noopSubscribe, getTrue, getFalse);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (mounted && widgets.length > 0) {
      // Vor dem Speichern: Validiere und korrigiere alle Größen
      const validatedWidgets = widgets.map((widget) => {
        const definition = WIDGET_DEFINITIONS.find(d => d.type === widget.type);
        if (definition && widget.size) {
          const correctSize = definition.sizes[widget.size];
          return {
            ...widget,
            w: correctSize.w,
            h: correctSize.h,
          };
        }
        return widget;
      });
      localStorage.setItem("dashboard-widgets", JSON.stringify(validatedWidgets));
    }
  }, [widgets, mounted]);

  const layout: Layout[] = useMemo(
    () =>
      widgets.map((w) => {
        // Hole die korrekte Größe aus den Definitionen
        const definition = WIDGET_DEFINITIONS.find(d => d.type === w.type);
        const correctSize = definition?.sizes[w.size];
        const width = correctSize?.w ?? w.w;
        const height = correctSize?.h ?? w.h;

        return {
          i: w.i,
          x: w.x,
          y: w.y,
          w: width,
          h: height,
          minW: width,
          maxW: width,
          minH: height,
          maxH: height,
          isDraggable: isEditing,
          isResizable: false,
          static: false,
        };
      }),
    [widgets, isEditing]
  );

  // Snap-to-Slot Funktion: Zwingt Widgets in die 4 erlaubten Slots (12 Spalten Grid)
  const snapToSlot = (x: number, w: number): number => {
    if (w === 3) {
      // Klein (w: 3): Snap zu Slot 1 (x:0), Slot 2 (x:3), Slot 3 (x:6), oder Slot 4 (x:9)
      const slots = [0, 3, 6, 9];
      return slots.reduce((prev, curr) =>
        Math.abs(curr - x) < Math.abs(prev - x) ? curr : prev
      );
    } else if (w === 6) {
      // Mittel (w: 6): Snap zu Slot 1+2 (x:0) oder Slot 3+4 (x:6)
      return x < 3 ? 0 : 6;
    } else {
      // Groß (w: 12): Immer x:0 (volle Breite)
      return 0;
    }
  };

  const handleLayoutChange = (newLayout: Layout[]) => {
    if (!isEditing) return;

    setWidgets((prev) =>
      prev.map((widget) => {
        const layoutItem = newLayout.find((l) => l.i === widget.i);
        if (layoutItem) {
          // Größe kommt IMMER aus den Definitionen
          const definition = WIDGET_DEFINITIONS.find(d => d.type === widget.type);
          const correctSize = definition?.sizes[widget.size];

          if (!correctSize) return widget;

          // SNAP TO SLOT! x-Position wird auf erlaubte Slots gerundet
          const snappedX = snapToSlot(layoutItem.x, correctSize.w);

          return {
            ...widget,
            x: snappedX,
            y: layoutItem.y,
            w: correctSize.w,
            h: correctSize.h,
          };
        }
        return widget;
      })
    );
  };

  const handleDragStart = () => {
    // drag started
  };

  const handleDragStop = () => {
    // drag completed
  };

  const handleAddWidget = (type: WidgetType, size: WidgetSize) => {
    const definition = WIDGET_DEFINITIONS.find((w) => w.type === type);
    if (!definition) return;

    const sizeConfig = definition.sizes[size];
    const newId = `${type}-${Date.now()}`;

    // Calculate center position for 6-column grid
    const centerX = sizeConfig.w === 2 ? 2 : sizeConfig.w === 3 ? 1 : 0;

    const newWidget: WidgetConfig = {
      i: newId,
      type,
      size,
      x: centerX,
      y: 0, // Add to top/middle
      w: sizeConfig.w,
      h: sizeConfig.h,
    };

    setWidgets((prev) => [...prev, newWidget]);
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.i !== id));
  };

  const handleResetLayout = () => {
    if (confirm("Dashboard auf Standardlayout zurücksetzen?")) {
      // Lösche localStorage komplett
      localStorage.removeItem("dashboard-widgets");
      // Setze neue Widgets
      setWidgets(DEFAULT_WIDGETS);
      // Speichere neu
      localStorage.setItem("dashboard-widgets", JSON.stringify(DEFAULT_WIDGETS));
      // Lade Seite neu für sauberen Start
      window.location.reload();
    }
  };

  const handleWidgetMouseDown = () => {
    if (!isEditing) {
      const timer = setTimeout(() => {
        setIsEditing(true);
        setLongPressTimer(null);
      }, 2500);
      setLongPressTimer(timer);
    }
  };

  const handleWidgetMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const activeWidgetTypes = useMemo(
    () => widgets.map((w) => w.type),
    [widgets]
  );

  if (!mounted) {
    return <div className="p-8 text-center text-[var(--text-muted)]">Lädt...</div>;
  }

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
            <>
              <button
                onClick={handleResetLayout}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
              >
                Zurücksetzen
              </button>
              <button
                onClick={() => setIsLibraryOpen(true)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
              >
                + Widget hinzufügen
              </button>
            </>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isEditing
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            {isEditing ? "Fertig" : "Bearbeiten"}
          </button>
        </div>
      </div>

      {/* Edit Mode Hint */}
      {isEditing && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-400">
              <span className="font-semibold">Bearbeitungsmodus aktiv:</span> Ziehen Sie Widgets, um sie neu anzuordnen. Klicken Sie auf das X, um Widgets zu entfernen.
            </p>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="dashboard-grid-wrapper" style={{ maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
          rowHeight={50}
          onLayoutChange={handleLayoutChange}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          isDraggable={isEditing}
          isResizable={false}
          compactType={null}
          preventCollision={false}
          margin={[12, 12]}
          containerPadding={[0, 0]}
          draggableCancel=".no-drag"
        >
          {widgets.map((widget) => (
            <div
              key={widget.i}
              className={`widget-wrapper ${isEditing ? 'editing-mode' : ''}`}
            >
              <div
                className="widget-content"
                onMouseDown={() => !isEditing && handleWidgetMouseDown()}
                onMouseUp={handleWidgetMouseUp}
                onMouseLeave={handleWidgetMouseUp}
                onTouchStart={() => !isEditing && handleWidgetMouseDown()}
                onTouchEnd={handleWidgetMouseUp}
              >
                <Widget type={widget.type} size={widget.size} data={data} isLoading={isLoading} />
              </div>
              {isEditing && (
                <>
                  {/* Delete Button - X, oben links (Apple Style) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveWidget(widget.i);
                    }}
                    className="no-drag z-[200] rounded-full bg-red-500 p-2 text-white shadow-lg hover:bg-red-600 transition-all hover:scale-110"
                    style={{ position: 'absolute', top: '6px', left: '6px' }}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>


      {/* Widget Library Modal */}
      <WidgetLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onAdd={handleAddWidget}
        activeWidgets={activeWidgetTypes}
      />
    </div>
  );
}
