'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Line,
} from 'recharts';

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
/*  Chart tooltip                                                      */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm text-sm">
      <p className="font-medium text-slate-900 mb-1">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.name === 'Churn Rate %' ? `${Number(entry.value).toFixed(1)}%` : fmt(entry.value)}
        </p>
      ))}
    </div>
  );
};

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

      setSummary({
        collected_revenue: Number(summaryData.collected_revenue),
        annual_run_rate: Number(summaryData.annual_run_rate),
        churned_revenue: Number(summaryData.churned_revenue),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTierRows((tierData.rows ?? []).map((r: any) => ({
        ...r,
        usd_mrr: Number(r.usd_mrr),
        non_usd_mrr: Number(r.non_usd_mrr),
        total_mrr: Number(r.total_mrr),
        pct_of_total: Number(r.pct_of_total),
      })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSourceRows((sourceData.rows ?? []).map((r: any) => ({
        ...r,
        usd_mrr: Number(r.usd_mrr),
        non_usd_mrr: Number(r.non_usd_mrr),
        total_mrr: Number(r.total_mrr),
        pct_of_total: Number(r.pct_of_total),
      })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMoMRows((momData.rows ?? []).map((r: any) => ({
        ...r,
        total_mrr: Number(r.total_mrr),
      })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSoldRows((soldData.rows ?? []).map((r: any) => ({
        ...r,
        closed_mrr: Number(r.closed_mrr),
        collected_mrr: Number(r.collected_mrr),
        cancelled_mrr: Number(r.cancelled_mrr),
        payment_failed_mrr: Number(r.payment_failed_mrr),
        no_billing_mrr: Number(r.no_billing_mrr),
        deal_count: Number(r.deal_count),
      })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setChurnRows((churnData.rows ?? []).map((r: any) => ({
        ...r,
        active_mrr: Number(r.active_mrr),
        cancellation_mrr: Number(r.cancellation_mrr),
        churn_rate_pct: Number(r.churn_rate_pct),
      })));
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

  /* ---- Chart data: tier/source rows excluding Total ---- */
  const tierChartData = tierRows.filter((r) => r.tier !== 'Total');
  const sourceChartData = sourceRows
    .filter((r) => r.billing_source !== 'Total')
    .map((r) => ({ ...r, label: displaySource(r.billing_source) }));

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
      <div className="max-w-[1600px] mx-auto space-y-6">
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

            {/* Row 2: Two panels side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Revenue by Tier */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Revenue by Tier</h2>
                {tierChartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={tierChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="usd_mrr" name="USD MRR" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="non_usd_mrr" name="Non-USD MRR" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <table className="w-full text-sm mt-4">
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
                    {tierRows.map((row) => {
                      const isTotal = row.tier === 'Total';
                      return (
                        <tr key={row.tier} className={isTotal ? 'font-semibold bg-slate-50' : ''}>
                          <td className={tdClass}>{row.tier}</td>
                          <td className={tdRight}>{fmt(row.usd_mrr)}</td>
                          <td className={tdRight}>{fmt(row.non_usd_mrr)}</td>
                          <td className={tdRight}>{fmt(row.total_mrr)}</td>
                          <td className={tdRight}>{row.pct_of_total.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Revenue by Billing Source */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Revenue by Billing Source</h2>
                {sourceChartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sourceChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="usd_mrr" name="USD MRR" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="non_usd_mrr" name="Non-USD MRR" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <table className="w-full text-sm mt-4">
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
                    {sourceRows.map((row) => {
                      const isTotal = row.billing_source === 'Total';
                      return (
                        <tr key={row.billing_source} className={isTotal ? 'font-semibold bg-slate-50' : ''}>
                          <td className={tdClass}>{displaySource(row.billing_source)}</td>
                          <td className={tdRight}>{fmt(row.usd_mrr)}</td>
                          <td className={tdRight}>{fmt(row.non_usd_mrr)}</td>
                          <td className={tdRight}>{fmt(row.total_mrr)}</td>
                          <td className={tdRight}>{row.pct_of_total.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 3: MoM Revenue */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Month-over-Month Revenue by Billing Source</h2>
              {momPivoted.length > 0 && (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={momPivoted} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month_label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Recharge" stackId="a" fill="#84cc16" />
                    <Bar dataKey="Skool" stackId="a" fill="#fbbf24" />
                    <Bar dataKey="ACE" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <table className="w-full text-sm mt-4">
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
              {soldRows.length > 0 && (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={soldRows} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="close_month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="closed_mrr" name="Closed MRR" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected_mrr" name="Collected MRR" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cancelled_mrr" name="Cancelled MRR" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="payment_failed_mrr" name="Payment Failed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="no_billing_mrr" name="No Billing Yet" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="overflow-x-auto mt-4">
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
              {churnRows.length > 0 && (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={churnRows} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="close_month_cohort" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="left" dataKey="active_mrr" name="Active MRR" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="cancellation_mrr" name="Cancellation MRR" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="churn_rate_pct" name="Churn Rate %" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              <table className="w-full text-sm mt-4">
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
