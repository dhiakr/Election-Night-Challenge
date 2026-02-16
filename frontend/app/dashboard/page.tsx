"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import API from "@/lib/api";
import { ConstituencyResult, TotalsResponse } from "@/lib/types";
import DashboardHeader from "./components/DashboardHeader";
import ConstituencyView from "./components/ConstituencyView";
import ParliamentDistributionView from "./components/ParliamentDistributionView";
import { DASHBOARD_REFRESH_INTERVAL_MS } from "./constants";

export default function DashboardPage() {
  const [constituencies, setConstituencies] = useState<ConstituencyResult[]>([]);
  const [totals, setTotals] = useState<TotalsResponse | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const [constituenciesRes, totalsRes] = await Promise.all([
        API.get<ConstituencyResult[]>("/constituencies"),
        API.get<TotalsResponse>("/totals"),
      ]);

      setConstituencies(constituenciesRes.data);
      setTotals(totalsRes.data);
    } catch {
      setError("Unable to load election data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = window.setInterval(() => fetchData(true), DASHBOARD_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (constituencies.length === 0) {
      setSelectedName("");
      return;
    }

    const stillExists = constituencies.some((item) => item.name === selectedName);
    if (!stillExists) {
      setSelectedName(constituencies[0].name);
    }
  }, [constituencies, selectedName]);

  const selectedConstituency = useMemo(
    () => constituencies.find((item) => item.name === selectedName) ?? null,
    [constituencies, selectedName]
  );

  return (
    <main className="screen-shell dashboard-shell">
      <DashboardHeader refreshing={refreshing} onRefresh={() => fetchData(true)} />

      {error && <p className="error-text panel">{error}</p>}

      {loading ? (
        <section className="panel">Loading election data...</section>
      ) : (
        <section className="dashboard-grid">
          <ConstituencyView
            constituencies={constituencies}
            selectedName={selectedName}
            selectedConstituency={selectedConstituency}
            onSelect={setSelectedName}
          />
          <ParliamentDistributionView totals={totals} />
        </section>
      )}
    </main>
  );
}
