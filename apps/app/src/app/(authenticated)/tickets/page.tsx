"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlanLimitReached } from "@/components/ui/PlanLimitReached";

// Form Schema
const createTicketSchema = z.object({
  titel: z.string().min(1, "Titel erforderlich"),
  beschreibung: z.string().optional(),
  kategorie: z.enum(["SCHADENSMELDUNG", "WARTUNG", "ANFRAGE", "BESCHWERDE", "SANIERUNG", "AUFGABE"]),
  prioritaet: z.enum(["NIEDRIG", "MITTEL", "HOCH", "KRITISCH"]),
  frist: z.string().optional(),
});

type CreateTicketInput = z.infer<typeof createTicketSchema>;

const ALL_STATUSES = [
  "ERFASST",
  "IN_BEARBEITUNG",
  "ZUR_PRUEFUNG",
  "ABGESCHLOSSEN",
  "BEAUFTRAGT",
  "TERMIN_VEREINBART",
  "IN_ARBEIT",
  "RUECKFRAGE",
  "ABGERECHNET",
] as const;

const STATUS_LABELS: Record<string, string> = {
  ERFASST: "Erfasst",
  IN_BEARBEITUNG: "In Bearbeitung",
  ZUR_PRUEFUNG: "Zur Prüfung",
  ABGESCHLOSSEN: "Abgeschlossen",
  BEAUFTRAGT: "Beauftragt",
  TERMIN_VEREINBART: "Termin vereinbart",
  IN_ARBEIT: "In Arbeit",
  RUECKFRAGE: "Rückfrage",
  ABGERECHNET: "Abgerechnet",
};

const KATEGORIE_LABELS: Record<string, string> = {
  SCHADENSMELDUNG: "Schadensmeldung",
  WARTUNG: "Wartung",
  ANFRAGE: "Anfrage",
  BESCHWERDE: "Beschwerde",
  SANIERUNG: "Sanierung",
  AUFGABE: "Aufgabe",
  SANITAER: "Sanitär",
  ELEKTRIK: "Elektrik",
  HEIZUNG: "Heizung",
  FENSTER_TUEREN: "Fenster/Türen",
  DACH: "Dach",
  FASSADE: "Fassade",
  AUFZUG: "Aufzug",
  SONSTIGES: "Sonstiges",
  SCHIMMEL: "Schimmel",
  WASSERSCHADEN: "Wasserschaden",
  EINBRUCH: "Einbruch",
  LAERM: "Lärm",
};

export default function TicketsPage() {
  const router = useRouter();
  type TicketStatusFilter = "AKTUELL" | "ERFASST" | "IN_BEARBEITUNG" | "ZUR_PRUEFUNG" | "ABGESCHLOSSEN" | "BEAUFTRAGT" | "TERMIN_VEREINBART" | "IN_ARBEIT" | "RUECKFRAGE" | "ABGERECHNET" | undefined;
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>("AKTUELL");
  const [sortBy, setSortBy] = useState<"prioritaet" | "createdAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedObjektId, setSelectedObjektId] = useState("");
  const [selectedEinheitId, setSelectedEinheitId] = useState("");

  const utils = trpc.useUtils();
  const { data: objekte } = trpc.objekte.list.useQuery();
  const { data: einheiten } = trpc.einheiten.list.useQuery({});

  const { data: ticketsRaw, isLoading, error } = trpc.tickets.list.useQuery({
    status: statusFilter,
  });

  const PRIO_ORDER: Record<string, number> = { KRITISCH: 0, HOCH: 1, MITTEL: 2, NIEDRIG: 3 };

  const tickets = ticketsRaw ? [...ticketsRaw].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "prioritaet") {
      cmp = (PRIO_ORDER[a.prioritaet] ?? 99) - (PRIO_ORDER[b.prioritaet] ?? 99);
    } else {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return sortDir === "asc" ? cmp : -cmp;
  }) : ticketsRaw;
  const { data: stats } = trpc.tickets.stats.useQuery();

  // Form Hook
  const form = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      titel: "",
      beschreibung: "",
      kategorie: "ANFRAGE",
      prioritaet: "MITTEL",
    },
  });

  const watchedKategorie = useWatch({ control: form.control, name: "kategorie" });
  const watchedPrioritaet = useWatch({ control: form.control, name: "prioritaet" });

  // Create Mutation
  const createMutation = trpc.tickets.create.useMutation({
    onSuccess: () => {
      utils.tickets.list.invalidate();
      utils.tickets.stats.invalidate();
      setCreateDialogOpen(false);
      form.reset();
      setSelectedObjektId("");
      setSelectedEinheitId("");
      toast.success("Ticket erstellt");
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  // Submit Handler
  const onSubmit = (data: CreateTicketInput) => {
    createMutation.mutate({
      ...data,
      beschreibung: data.beschreibung || "",
      frist: data.frist ? new Date(data.frist) : undefined,
      objektId: selectedObjektId || undefined,
      einheitId: selectedEinheitId || undefined,
    });
  };

  // Plan-Gate: Feature nicht verfügbar
  if (error?.data?.code === "FORBIDDEN") {
    return (
      <div className="mx-auto max-w-lg mt-12">
        <PlanLimitReached
          feature="tickets"
          message={error.message}
        />
      </div>
    );
  }

  if (isLoading) {
    return <div>Laden...</div>;
  }

  const getPrioColor = (prio: string) => {
    switch (prio) {
      case "KRITISCH":
        return "bg-red-500/15 text-red-400";
      case "HOCH":
        return "bg-orange-500/15 text-orange-400";
      case "MITTEL":
        return "bg-yellow-500/15 text-yellow-400";
      default:
        return "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ERFASST":
        return "bg-blue-500/15 text-blue-400";
      case "IN_BEARBEITUNG":
        return "bg-purple-500/15 text-purple-400";
      case "ZUR_PRUEFUNG":
        return "bg-orange-500/15 text-orange-400";
      case "ABGESCHLOSSEN":
        return "bg-green-500/15 text-green-400";
      case "BEAUFTRAGT":
        return "bg-purple-500/15 text-purple-400";
      case "TERMIN_VEREINBART":
        return "bg-indigo-500/15 text-indigo-400";
      case "IN_ARBEIT":
        return "bg-blue-500/15 text-blue-400";
      case "RUECKFRAGE":
        return "bg-orange-500/15 text-orange-400";
      case "ABGERECHNET":
        return "bg-green-500/15 text-green-400";
      default:
        return "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]";
    }
  };

  const getSLABadge = (ticket: { slaFaelligkeitDatum?: string | Date | null }) => {
    if (!ticket.slaFaelligkeitDatum) return null;
    const now = new Date();
    const sla = new Date(ticket.slaFaelligkeitDatum);
    const diffMs = sla.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="ml-2 inline-flex rounded-full bg-red-500/15 px-2 text-xs font-semibold leading-5 text-red-400">
          SLA {Math.abs(diffDays)}d überfällig
        </span>
      );
    }
    if (diffDays <= 2) {
      return (
        <span className="ml-2 inline-flex rounded-full bg-yellow-500/15 px-2 text-xs font-semibold leading-5 text-yellow-400">
          SLA {diffDays}d
        </span>
      );
    }
    return (
      <span className="ml-2 inline-flex rounded-full bg-[var(--bg-card-hover)] px-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        SLA {diffDays}d
      </span>
    );
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Tickets</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Schadensmeldungen, Wartung und Anfragen
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Neues Ticket
        </Button>
      </div>

      {/* Statistiken */}
      {stats && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Erfasst</div>
            <div className="mt-1 text-2xl font-bold text-blue-400">
              {stats.erfasst}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">In Bearbeitung</div>
            <div className="mt-1 text-2xl font-bold text-purple-400">
              {stats.inBearbeitung}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Kritisch (offen)</div>
            <div className="mt-1 text-2xl font-bold text-red-400">
              {stats.kritisch}
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs + Sort */}
      <div className="mb-4 space-y-2">
        {/* Main Tabs: Aktuell / Abgeschlossen / Alle */}
        <div className="flex gap-1 rounded-lg bg-[var(--bg-page)] p-1 w-fit">
          <button
            onClick={() => setStatusFilter("AKTUELL")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === "AKTUELL"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Aktuell
          </button>
          <button
            onClick={() => setStatusFilter("ABGESCHLOSSEN")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === "ABGESCHLOSSEN"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Abgeschlossen
          </button>
          <button
            onClick={() => setStatusFilter(undefined)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === undefined
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Alle
          </button>
        </div>

        {/* Secondary: individual status filters (shown when "Alle" is active) */}
        {statusFilter === undefined && (
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className="rounded px-2.5 py-1 text-xs bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition-colors"
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span>Sortierung:</span>
          <button
            onClick={() => { setSortBy("createdAt"); setSortDir(s => s === "desc" ? "asc" : "desc"); }}
            className={`rounded px-2 py-0.5 text-xs ${sortBy === "createdAt" ? "bg-blue-600 text-white" : "bg-[var(--bg-card-hover)]"}`}
          >
            Datum {sortBy === "createdAt" ? (sortDir === "desc" ? "↓" : "↑") : ""}
          </button>
          <button
            onClick={() => { setSortBy("prioritaet"); setSortDir(s => s === "asc" ? "desc" : "asc"); }}
            className={`rounded px-2 py-0.5 text-xs ${sortBy === "prioritaet" ? "bg-blue-600 text-white" : "bg-[var(--bg-card-hover)]"}`}
          >
            Priorität {sortBy === "prioritaet" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </button>
        </div>
      </div>

      {/* Tabelle */}
      {tickets && tickets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-page)] p-12 text-center">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            Keine Tickets vorhanden
          </h3>
          <p className="mt-2 text-[var(--text-secondary)]">Erstellen Sie Ihr erstes Ticket.</p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Ticket erstellen
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-page)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Titel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Kategorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Priorität
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Erstellt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Zuordnung
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              {tickets?.map((ticket) => {
                const count = (ticket as typeof ticket & { _count?: { kommentare: number; dokumente: number } })._count;
                return (
                <tr key={ticket.id} className="hover:bg-[var(--bg-card-hover)] cursor-pointer" onClick={() => router.push(`/tickets/${ticket.id}`)}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-[var(--text-primary)]">{ticket.titel}</div>
                    {count && count.kommentare > 0 && (
                      <div className="text-xs text-[var(--text-secondary)]">
                        {count.kommentare} Kommentar(e)
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {KATEGORIE_LABELS[ticket.kategorie] || ticket.kategorie}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getPrioColor(ticket.prioritaet)}`}
                    >
                      {ticket.prioritaet}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(ticket.status)}`}
                    >
                      {STATUS_LABELS[ticket.status] || ticket.status}
                    </span>
                    {getSLABadge(ticket)}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {new Date(ticket.createdAt).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {ticket.objektId || ticket.einheitId ? (
                      <div className="flex flex-col gap-0.5">
                        {ticket.objektId && (
                          <span className="text-[var(--text-primary)]">
                            {objekte?.find((o) => o.id === ticket.objektId)?.bezeichnung || "Objekt"}
                          </span>
                        )}
                        {ticket.einheitId && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            {einheiten?.find((e) => e.id === ticket.einheitId)?.einheitNr || "Einheit"}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl bg-[var(--bg-card)] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[var(--text-primary)]">
              Neues Ticket erstellen
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            {/* Titel */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Titel *
              </label>
              <Input
                {...form.register("titel")}
                placeholder="z.B. Wasserhahn tropft"
                className="bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border)] focus:border-blue-500 focus:ring-blue-500 placeholder:text-[var(--text-muted)]"
              />
              {form.formState.errors.titel && (
                <p className="text-sm text-red-400 mt-1">
                  {form.formState.errors.titel.message}
                </p>
              )}
            </div>

            {/* Beschreibung */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Beschreibung
              </label>
              <Textarea
                {...form.register("beschreibung")}
                placeholder="Details zum Problem..."
                rows={4}
                className="bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border)] focus:border-blue-500 focus:ring-blue-500 resize-none placeholder:text-[var(--text-muted)]"
              />
            </div>

            {/* Kategorie & Priorität nebeneinander */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Kategorie *
                </label>
                <Select
                  value={watchedKategorie}
                  onValueChange={(value) =>
                    form.setValue("kategorie", value as CreateTicketInput["kategorie"])
                  }
                >
                  <SelectTrigger className="bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--bg-card)]">
                    <SelectItem value="SCHADENSMELDUNG" className="text-[var(--text-primary)]">
                      Schadensmeldung
                    </SelectItem>
                    <SelectItem value="WARTUNG" className="text-[var(--text-primary)]">
                      Wartung
                    </SelectItem>
                    <SelectItem value="ANFRAGE" className="text-[var(--text-primary)]">
                      Anfrage
                    </SelectItem>
                    <SelectItem value="BESCHWERDE" className="text-[var(--text-primary)]">
                      Beschwerde
                    </SelectItem>
                    <SelectItem value="SANIERUNG" className="text-[var(--text-primary)]">
                      Sanierung
                    </SelectItem>
                    <SelectItem value="AUFGABE" className="text-[var(--text-primary)]">
                      Aufgabe
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Priorität *
                </label>
                <Select
                  value={watchedPrioritaet}
                  onValueChange={(value) =>
                    form.setValue("prioritaet", value as CreateTicketInput["prioritaet"])
                  }
                >
                  <SelectTrigger className="bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--bg-card)]">
                    <SelectItem value="NIEDRIG" className="text-[var(--text-primary)]">
                      Niedrig
                    </SelectItem>
                    <SelectItem value="MITTEL" className="text-[var(--text-primary)]">
                      Mittel
                    </SelectItem>
                    <SelectItem value="HOCH" className="text-[var(--text-primary)]">
                      Hoch
                    </SelectItem>
                    <SelectItem value="KRITISCH" className="text-[var(--text-primary)]">
                      Kritisch
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Frist */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Frist (Optional)
              </label>
              <Input
                type="date"
                {...form.register("frist")}
                className="bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border)] focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Objekt & Einheit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Objekt (Optional)
                </label>
                <select
                  value={selectedObjektId}
                  onChange={(e) => { setSelectedObjektId(e.target.value); setSelectedEinheitId(""); }}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Kein Objekt</option>
                  {objekte?.map((o) => (
                    <option key={o.id} value={o.id}>{o.bezeichnung}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Einheit (Optional)
                </label>
                <select
                  value={selectedEinheitId}
                  onChange={(e) => setSelectedEinheitId(e.target.value)}
                  disabled={!selectedObjektId}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Keine Einheit</option>
                  {einheiten?.filter((e) => e.objektId === selectedObjektId).map((e) => (
                    <option key={e.id} value={e.id}>{e.einheitNr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)] mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                className="border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createMutation.isPending ? "Erstelle..." : "Ticket erstellen"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
