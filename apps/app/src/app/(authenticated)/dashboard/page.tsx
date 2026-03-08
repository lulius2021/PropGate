"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { SimpleDashboard } from "@/components/dashboard/SimpleDashboard";

export default function DashboardPage() {
  const router = useRouter();
  const [objektFilter, setObjektFilter] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("propgate_dash_objekt") ?? "";
    }
    return "";
  });
  const [zeitraum, setZeitraum] = useState<"MONAT" | "QUARTAL" | "JAHR" | "">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("propgate_dash_zeitraum") as "MONAT" | "QUARTAL" | "JAHR" | "") ?? "";
    }
    return "";
  });

  const { data: objekte } = trpc.objekte.list.useQuery();
  const { data: kpis, isLoading } = trpc.reporting.dashboardKPIs.useQuery({
    objektId: objektFilter || undefined,
    zeitraum: zeitraum || undefined,
  });
  const { data: userSettings } = trpc.userSettings.getSettings.useQuery();
  const saveSnapshots = trpc.statistik.saveSnapshots.useMutation();
  const snapshotDone = useRef(false);

  useEffect(() => {
    if (kpis && !snapshotDone.current) {
      snapshotDone.current = true;
      saveSnapshots.mutate();
    }
  }, [kpis]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userSettings !== undefined && userSettings !== null && !userSettings.hasCompletedOnboarding) {
      router.push("/onboarding");
    }
  }, [userSettings, router]);

  const handleObjektChange = (value: string) => {
    setObjektFilter(value);
    localStorage.setItem("propgate_dash_objekt", value);
  };

  const handleZeitraumChange = (value: string) => {
    setZeitraum(value as "MONAT" | "QUARTAL" | "JAHR" | "");
    localStorage.setItem("propgate_dash_zeitraum", value);
  };

  return (
    <SimpleDashboard
      data={kpis}
      isLoading={isLoading}
      objektFilter={objektFilter}
      zeitraum={zeitraum}
      objekte={objekte ?? []}
      onObjektChange={handleObjektChange}
      onZeitraumChange={handleZeitraumChange}
    />
  );
}
