"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ViewToggle } from "@/components/objekte/ViewToggle";
import { ObjektCard } from "@/components/objekte/ObjektCard";
import { ErweiterterObjektModal } from "@/components/objekte/ErweiterterObjektModal";
import { ObjektLimitReached } from "@/components/ui/PlanLimitReached";

export default function ObjektePage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: objekte, isLoading } = trpc.objekte.list.useQuery();
  const { data: planInfo } = trpc.plan.info.useQuery();
  const [view, setView] = useState<"table" | "grid">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("propgate_objekte_view") as "table" | "grid") ?? "grid";
    }
    return "grid";
  });

  const handleViewChange = (v: "table" | "grid") => {
    setView(v);
    localStorage.setItem("propgate_objekte_view", v);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) {
    return <div>Laden...</div>;
  }

  const limitReached = planInfo?.objekteLimitReached ?? false;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Objekte</h1>
          <p className="mt-2 text-[var(--text-secondary)]">Verwaltung aller Immobilienobjekte</p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={handleViewChange} />
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={limitReached}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Neues Objekt
          </button>
        </div>
      </div>

      {/* Plan-Limit-Warnung */}
      {limitReached && planInfo && (
        <div className="mb-6">
          <ObjektLimitReached
            currentCount={planInfo.currentObjekte}
            maxCount={planInfo.maxObjekte!}
          />
        </div>
      )}

      {objekte && objekte.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-page)] p-12 text-center">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">Keine Objekte vorhanden</h3>
          <p className="mt-2 text-[var(--text-secondary)]">
            Erstellen Sie Ihr erstes Objekt, um zu beginnen.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Objekt erstellen
          </button>
        </div>
      ) : view === "grid" ? (
        // Finder-Ansicht mit Karten
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {objekte?.map((objekt) => (
            <ObjektCard
              key={objekt.id}
              objekt={objekt as { id: string; bezeichnung: string; strasse: string; plz: string; ort: string; objektart: string; bildUrl?: string | null; _count: { einheiten: number } }}
              onClick={() => router.push(`/objekte/${objekt.id}`)}
            />
          ))}
        </div>
      ) : (
        // Tabellenansicht
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-page)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Bezeichnung
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Adresse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Art
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Einheiten
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              {objekte?.map((objekt) => (
                <tr key={objekt.id} className="hover:bg-[var(--bg-card-hover)] cursor-pointer" onClick={() => router.push(`/objekte/${objekt.id}`)}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="font-medium text-[var(--text-primary)]">{objekt.bezeichnung}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {objekt.strasse}, {objekt.plz} {objekt.ort}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {objekt.objektart}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {objekt._count.einheiten}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <button
                      onClick={() => router.push(`/objekte/${objekt.id}`)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Neues Objekt Modal */}
      <ErweiterterObjektModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          // Refresh die Liste
          utils.objekte.list.invalidate();
          utils.plan.info.invalidate();
        }}
      />
    </div>
  );
}
