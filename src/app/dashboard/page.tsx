'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Summary {
  collected_revenue: number;
  annual_run_rate: number;
  churned_revenue: number;
}

interface TierRow {
  tier: string;
  usd_mrr: number;
  non_usd_mrr: number;
  total_mrr: number;
  pct_of_total: number;
}

interface SourceRow {
  billing_source: string;
  usd_mrr: number;
  non_usd_mrr: number;
  total_mrr: number;
  pct_of_total: number;
}

interface MoMRow {
  month_label: string;
  sort_month: string;
  billing_source: string;
  total_mrr: number;
}

interface SoldRow {
  close_month: string;
  sort_month: string;
  closed_mrr: number;
  collected_mrr: number;
  cancelled_mrr: number;
  payment_failed_mrr: number;
  no_billing_mrr: number;
  deal_count: number;
}

interface ChurnRow {
  close_month_cohort: string;
  sort_month: string;
  active_mrr: number;
  cancellation_mrr: number;
  churn_rate_pct: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const sourceLabel: Record<string, string> = {
  recharge: 'Recharge',
  skool: 'Skool',
  stripe: 'ACE',
  Total: 'Total',
};

const displaySource = (s: string) => sourceLabel[s] ?? s;

/* ------------------------------------------------------------------ */
/*  Skeleton helpers                                                   */
/* ------------------------------------------------------------------ */

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className ?? 'h-6 w-32'}`} />;
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
      <SkeletonBlock className="h-9 w-40" />
      <SkeletonBlock className="h-4 w-24" />
    </div>
  );
}

function SkeletonTable({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
      <SkeletonBlock className="h-5 w-48 mb-4" />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBlock key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [tierRows, setTierRows] = useState<TierRow[]>([]);
  const [sourceRows, setSourceRows] = useState<SourceRow[]>([]);
  const [momRows, setMoMRows] = useState<MoMRow[]>([]);
  const [soldRows, setSoldRows] = useState<SoldRow[]>([]);
  const [churnRows, setChurnRows] = useState<ChurnRow[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const t = Date.now();
      const [summaryRes, tierRes, sourceRes, momRes, soldRes, churnRes] = await Promise.all([
        fetch(`/api/dashboard/summary?t=${t}`),
        fetch(`/api/dashboard/revenue-by-tier?t=${t}`),
        fetch(`/api/dashboard/revenue-by-source?t=${t}`),
        fetch(`/api/dashboard/mom-revenue?t=${t}`),
        fetch(`/api/dashboard/sold-vs-collected?t=${t}`),
        fetch(`/api/dashboard/churn-cohort?t=${t}`),
      ]);

      const [summaryData, tierData, sourceData, momData, soldData, churnData] = await Promise.all([
        summaryRes.json(),
        tierRes.json(),
        sourceRes.json(),
        momRes.json(),
        soldRes.json(),
        churnRes.json(),
      ]);

      setSummary(summaryData);
      setTierRows(tierData.rows ?? []);
      setSourceRows(sourceData.rows ?? []);
      setMoMRows(momData.rows ?? []);
      setSoldRows(soldData.rows ?? []);
      setChurnRows(churnData.rows ?? []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ---- Pivot MoM data: rows = months, cols = billing sources ---- */
  const momPivoted = (() => {
    const monthMap = new Map<string, { month_label: string; sort_month: string; Recharge: number; Skool: number; ACE: number; Total: number }>();
    for (const row of momRows) {
      if (!monthMap.has(row.sort_month)) {
        monthMap.set(row.sort_month, { month_label: row.month_label, sort_month: row.sort_month, Recharge: 0, Skool: 0, ACE: 0, Total: 0 });
      }
      const entry = monthMap.get(row.sort_month)!;
      const label = displaySource(row.billing_source) as 'Recharge' | 'Skool' | 'ACE';
      if (label === 'Recharge' || label === 'Skool' || label === 'ACE') {
        entry[label] += row.total_mrr;
      }
      entry.Total += row.total_mrr;
    }
    return Array.from(monthMap.values()).sort((a, b) => a.sort_month.localeCompare(b.sort_month));
  })();

  /* ---- Sold totals row ---- */
  const soldTotals = soldRows.reduce(
    (acc, r) => ({
      closed_mrr: acc.closed_mrr + r.closed_mrr,
      collected_mrr: acc.collected_mrr + r.collected_mrr,
      cancelled_mrr: acc.cancelled_mrr + r.cancelled_mrr,
      payment_failed_mrr: acc.payment_failed_mrr + r.payment_failed_mrr,
      no_billing_mrr: acc.no_billing_mrr + r.no_billing_mrr,
      deal_count: acc.deal_count + r.deal_count,
    }),
    { closed_mrr: 0, collected_mrr: 0, cancelled_mrr: 0, payment_failed_mrr: 0, no_billing_mrr: 0, deal_count: 0 },
  );

  /* ---- Churn rate color ---- */
  const churnColor = (pct: number) => {
    if (pct > 50) return 'text-red-600';
    if (pct > 25) return 'text-red-500';
    if (pct > 10) return 'text-amber-500';
    return 'text-emerald-600';
  };

  /* ---- Tier totals row ---- */
  const tierTotals = tierRows.reduce(
    (acc, r) => ({
      usd_mrr: acc.usd_mrr + r.usd_mrr,
      non_usd_mrr: acc.non_usd_mrr + r.non_usd_mrr,
      total_mrr: acc.total_mrr + r.total_mrr,
      pct_of_total: acc.pct_of_total + r.pct_of_total,
    }),
    { usd_mrr: 0, non_usd_mrr: 0, total_mrr: 0, pct_of_total: 0 },
  );

  /* ---- Source totals row ---- */
  const sourceTotals = sourceRows.reduce(
    (acc, r) => ({
      usd_mrr: acc.usd_mrr + r.usd_mrr,
      non_usd_mrr: acc.non_usd_mrr + r.non_usd_mrr,
      total_mrr: acc.total_mrr + r.total_mrr,
      pct_of_total: acc.pct_of_total + r.pct_of_total,
    }),
    { usd_mrr: 0, non_usd_mrr: 0, total_mrr: 0, pct_of_total: 0 },
  );

  /* ---------------------------------------------------------------- */
  /*  Table header style                                               */
  /* ---------------------------------------------------------------- */
  const thClass = 'text-left text-xs text-slate-500 uppercase tracking-wider pb-2 border-b';
  const thRight = `${thClass} text-right`;
  const tdClass = 'py-2 border-b border-slate-100';
  const tdRight = `${tdClass} text-right`;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex items-center gap-3">
            {lastUpdated && <span className="text-xs text-slate-400">Last updated: {lastUpdated}</span>}
            <button
              onClick={fetchAll}
              className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && !summary ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SkeletonTable cols={5} />
              <SkeletonTable cols={5} />
            </div>
            <SkeletonTable cols={5} rows={6} />
            <SkeletonTable cols={7} rows={6} />
            <SkeletonTable cols={4} rows={6} />
          </>
        ) : (
          <>
            {/* Row 1: Stat cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="text-3xl font-bold text-emerald-600">{fmt(summary?.collected_revenue ?? 0)}</div>
                <div className="text-sm text-slate-500 mt-1">Current Month Collected</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="text-3xl font-bold text-slate-900">{fmt(summary?.annual_run_rate ?? 0)}</div>
                <div className="text-sm text-slate-500 mt-1">Annual Run Rate</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="text-3xl font-bold text-red-500">{fmt(summary?.churned_revenue ?? 0)}</div>
                <div className="text-sm text-slate-500 mt-1">Current Month Churned</div>
              </div>
            </div>

            {/* Row 2: Two tables side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Revenue by Tier */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Revenue by Tier</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={thClass}>Tier</th>
                      <th className={thRight}>USD MRR</th>
                      <th className={thRight}>Non-USD MRR</th>
                      <th className={thRight}>Total MRR</th>
                      <th className={thRight}>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tierRows.map((row) => (
                      <tr key={row.tier}>
                        <td className={tdClass}>{row.tier}</td>
                        <td className={tdRight}>{fmt(row.usd_mrr)}</td>
                        <td className={tdRight}>{fmt(row.non_usd_mrr)}</td>
                        <td className={tdRight}>{fmt(row.total_mrr)}</td>
                        <td className={tdRight}>{row.pct_of_total.toFixed(1)}%</td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-slate-50">
                      <td className={tdClass}>Total</td>
                      <td className={tdRight}>{fmt(tierTotals.usd_mrr)}</td>
                      <td className={tdRight}>{fmt(tierTotals.non_usd_mrr)}</td>
                      <td className={tdRight}>{fmt(tierTotals.total_mrr)}</td>
                      <td className={tdRight}>{tierTotals.pct_of_total.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Revenue by Billing Source */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Revenue by Billing Source</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={thClass}>Billing Source</th>
                      <th className={thRight}>USD MRR</th>
                      <th className={thRight}>Non-USD MRR</th>
                      <th className={thRight}>Total MRR</th>
                      <th className={thRight}>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceRows.map((row) => (
                      <tr key={row.billing_source}>
                        <td className={tdClass}>{displaySource(row.billing_source)}</td>
                        <td className={tdRight}>{fmt(row.usd_mrr)}</td>
                        <td className={tdRight}>{fmt(row.non_usd_mrr)}</td>
                        <td className={tdRight}>{fmt(row.total_mrr)}</td>
                        <td className={tdRight}>{row.pct_of_total.toFixed(1)}%</td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-slate-50">
                      <td className={tdClass}>Total</td>
                      <td className={tdRight}>{fmt(sourceTotals.usd_mrr)}</td>
                      <td className={tdRight}>{fmt(sourceTotals.non_usd_mrr)}</td>
                      <td className={tdRight}>{fmt(sourceTotals.total_mrr)}</td>
                      <td className={tdRight}>{sourceTotals.pct_of_total.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 3: MoM Revenue */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Month-over-Month Revenue by Billing Source</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={thClass}>Month</th>
                    <th className={thRight}>Recharge</th>
                    <th className={thRight}>Skool</th>
                    <th className={thRight}>ACE</th>
                    <th className={thRight}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {momPivoted.map((row) => (
                    <tr key={row.sort_month}>
                      <td className={tdClass}>{row.month_label}</td>
                      <td className={tdRight}>{fmt(row.Recharge)}</td>
                      <td className={tdRight}>{fmt(row.Skool)}</td>
                      <td className={tdRight}>{fmt(row.ACE)}</td>
                      <td className={tdRight}>{fmt(row.Total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Row 4: Sold vs Collected */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Sold Revenue vs Collected Revenue</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={thClass}>Month</th>
                      <th className={thRight}>Closed MRR</th>
                      <th className={thRight}>Collected MRR</th>
                      <th className={thRight}>Cancelled MRR</th>
                      <th className={thRight}>Payment Failed MRR</th>
                      <th className={thRight}>No Billing Yet MRR</th>
                      <th className={thRight}>Deal Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soldRows.map((row) => (
                      <tr key={row.sort_month}>
                        <td className={tdClass}>{row.close_month}</td>
                        <td className={tdRight}>{fmt(row.closed_mrr)}</td>
                        <td className={`${tdRight} text-emerald-600`}>{fmt(row.collected_mrr)}</td>
                        <td className={`${tdRight} text-red-500`}>{fmt(row.cancelled_mrr)}</td>
                        <td className={`${tdRight} text-red-500`}>{fmt(row.payment_failed_mrr)}</td>
                        <td className={`${tdRight} text-slate-400`}>{fmt(row.no_billing_mrr)}</td>
                        <td className={tdRight}>{row.deal_count}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-slate-50">
                      <td className={tdClass}>Total</td>
                      <td className={tdRight}>{fmt(soldTotals.closed_mrr)}</td>
                      <td className={`${tdRight} text-emerald-600`}>{fmt(soldTotals.collected_mrr)}</td>
                      <td className={`${tdRight} text-red-500`}>{fmt(soldTotals.cancelled_mrr)}</td>
                      <td className={`${tdRight} text-red-500`}>{fmt(soldTotals.payment_failed_mrr)}</td>
                      <td className={`${tdRight} text-slate-400`}>{fmt(soldTotals.no_billing_mrr)}</td>
                      <td className={tdRight}>{soldTotals.deal_count}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 5: Churn Cohort */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Churn Rate by Deal Close Month</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={thClass}>Cohort Month</th>
                    <th className={thRight}>Active MRR</th>
                    <th className={thRight}>Cancellation MRR</th>
                    <th className={thRight}>Churn Rate %</th>
                  </tr>
                </thead>
                <tbody>
                  {churnRows.map((row) => (
                    <tr key={row.sort_month}>
                      <td className={tdClass}>{row.close_month_cohort}</td>
                      <td className={`${tdRight} text-emerald-600`}>{fmt(row.active_mrr)}</td>
                      <td className={`${tdRight} text-red-500`}>{fmt(row.cancellation_mrr)}</td>
                      <td className={`${tdRight} ${churnColor(row.churn_rate_pct)}`}>
                        {row.churn_rate_pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
