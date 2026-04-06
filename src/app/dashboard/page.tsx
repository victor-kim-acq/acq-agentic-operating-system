'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Send, ChevronDown, ChevronRight, Loader2, X, Table2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Line, LabelList,
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

interface ChatMessage {
  id: string;
  question: string;
  summary: string | null;
  sql: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[] | null;
  row_count: number;
  error: string | null;
  loading: boolean;
}

interface ColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'right';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  format?: (v: any) => string;
  colorClass?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colorFn?: (v: any) => string;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtLabel: any = (v: unknown) => { const n = Number(v); return n > 0 ? fmt(n) : ''; };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pctLabel: any = (v: unknown) => { const n = Number(v); return n > 0 ? `${n.toFixed(1)}%` : ''; };

const sourceLabel: Record<string, string> = {
  recharge: 'Recharge',
  skool: 'Skool',
  stripe: 'ACE',
  Total: 'Total',
};

const displaySource = (s: string) => sourceLabel[s] ?? s;

/* ------------------------------------------------------------------ */
/*  Detail column definitions per panel                                */
/* ------------------------------------------------------------------ */

const DETAIL_COLUMNS: Record<string, ColumnDef[]> = {
  'revenue-by-tier': [
    { key: 'membership_id', label: 'ID' },
    { key: 'membership_name', label: 'Name' },
    { key: 'tier', label: 'Tier' },
    { key: 'billing_source', label: 'Source' },
    { key: 'mrr', label: 'Raw MRR', align: 'right', format: fmt },
    { key: 'normalized_mrr', label: 'Normalized MRR', align: 'right', format: fmt },
    { key: 'currency', label: 'Currency' },
    { key: 'billing_date', label: 'Billing Date' },
  ],
  'revenue-by-source': [
    { key: 'membership_id', label: 'ID' },
    { key: 'membership_name', label: 'Name' },
    { key: 'tier', label: 'Tier' },
    { key: 'billing_source', label: 'Source' },
    { key: 'mrr', label: 'Raw MRR', align: 'right', format: fmt },
    { key: 'normalized_mrr', label: 'Normalized MRR', align: 'right', format: fmt },
    { key: 'currency', label: 'Currency' },
    { key: 'billing_date', label: 'Billing Date' },
  ],
  'mom-revenue': [
    { key: 'membership_id', label: 'ID' },
    { key: 'membership_name', label: 'Name' },
    { key: 'billing_month', label: 'Month' },
    { key: 'tier', label: 'Tier' },
    { key: 'billing_source', label: 'Source' },
    { key: 'normalized_mrr', label: 'Normalized MRR', align: 'right', format: fmt },
    { key: 'currency', label: 'Currency' },
    { key: 'billing_date', label: 'Billing Date' },
  ],
  'sold-vs-collected': [
    { key: 'deal_id', label: 'Deal ID' },
    { key: 'dealname', label: 'Deal Name' },
    { key: 'close_month', label: 'Close Month' },
    { key: 'firstname', label: 'First Name' },
    { key: 'lastname', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'tier', label: 'Tier' },
    { key: 'normalized_mrr', label: 'MRR', align: 'right', format: fmt },
    {
      key: 'deal_status', label: 'Status',
      colorFn: (v: string) => {
        if (v === 'Collected') return 'text-emerald-600';
        if (v === 'Cancelled') return 'text-red-500';
        if (v === 'Payment Failed') return 'text-amber-500';
        if (v === 'No Billing Yet') return 'text-slate-400';
        return '';
      },
    },
  ],
  'churn-cohort': [
    { key: 'membership_id', label: 'ID' },
    { key: 'membership_name', label: 'Name' },
    {
      key: 'status', label: 'Status',
      colorFn: (v: string) => v === 'Active' ? 'text-emerald-600' : v === 'Cancellation' ? 'text-red-500' : '',
    },
    { key: 'close_month', label: 'Deal Close Month' },
    { key: 'dealname', label: 'Deal Name' },
    { key: 'tier', label: 'Tier' },
    { key: 'billing_source', label: 'Source' },
    { key: 'normalized_mrr', label: 'Normalized MRR', align: 'right', format: fmt },
    { key: 'billing_date', label: 'Billing Date' },
  ],
};

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
/*  Detail Table Modal                                                 */
/* ------------------------------------------------------------------ */

function DetailModal({ open, onClose, title, panel }: { open: boolean; onClose: () => void; title: string; panel: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows, setRows] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const MAX_DISPLAY = 200;

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !panel) return;
    setDetailLoading(true);
    setError(null);
    setRows([]);
    fetch(`/api/dashboard/detail?panel=${panel}&t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setRows(data.rows ?? []);
          setRowCount(data.row_count ?? 0);
        }
      })
      .catch(() => setError('Failed to fetch detail data'))
      .finally(() => setDetailLoading(false));
  }, [open, panel]);

  if (!open) return null;

  const columns = DETAIL_COLUMNS[panel] ?? [];
  const thBase = 'text-xs text-slate-500 uppercase tracking-wider pb-2 border-b whitespace-nowrap';
  const tdBase = 'py-2 border-b border-slate-100 whitespace-nowrap';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-6xl w-full mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
          <h3 className="text-lg font-semibold">
            {title}
            {!detailLoading && rowCount > 0 && (
              <span className="text-sm font-normal text-slate-400 ml-2">({rowCount} records)</span>
            )}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-auto px-6 py-4 flex-1">
          {detailLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 py-4">{error}</div>
          )}
          {!detailLoading && !error && rows.length > 0 && (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key} className={`${thBase} ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, MAX_DISPLAY).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {columns.map((col) => {
                        const raw = row[col.key];
                        const display = col.format ? col.format(Number(raw)) : (raw == null ? '—' : String(raw));
                        const color = col.colorFn ? col.colorFn(raw) : (col.colorClass ?? '');
                        return (
                          <td key={col.key} className={`${tdBase} ${col.align === 'right' ? 'text-right' : ''} ${color}`}>
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rowCount > MAX_DISPLAY && (
                <p className="text-xs text-slate-400 mt-3">Showing {MAX_DISPLAY} of {rowCount} records</p>
              )}
            </>
          )}
          {!detailLoading && !error && rows.length === 0 && (
            <p className="text-sm text-slate-400 py-4">No records found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat bubble component                                              */
/* ------------------------------------------------------------------ */

function ChatBubble({ msg, thClass, tdClass }: { msg: ChatMessage; thClass: string; tdClass: string }) {
  const [sqlOpen, setSqlOpen] = useState(false);
  const MAX_DISPLAY_ROWS = 20;

  return (
    <div className="space-y-2">
      <div className="bg-slate-100 rounded-lg p-3 text-sm text-slate-700">{msg.question}</div>

      {msg.loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating query...
        </div>
      )}

      {msg.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {msg.error}
          {msg.sql && (
            <pre className="mt-2 bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap">{msg.sql}</pre>
          )}
        </div>
      )}

      {msg.summary && (
        <div className="text-base text-slate-900 font-medium py-1">{msg.summary}</div>
      )}

      {msg.sql && !msg.error && (
        <button
          onClick={() => setSqlOpen(!sqlOpen)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {sqlOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {sqlOpen ? 'Hide SQL' : 'Show SQL'}
        </button>
      )}
      {sqlOpen && msg.sql && (
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap">{msg.sql}</pre>
      )}

      {msg.rows && msg.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {Object.keys(msg.rows[0]).map((col) => (
                  <th key={col} className={thClass}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {msg.rows.slice(0, MAX_DISPLAY_ROWS).map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} className={tdClass}>{val == null ? '—' : String(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {msg.row_count > MAX_DISPLAY_ROWS && (
            <p className="text-xs text-slate-400 mt-2">Showing {MAX_DISPLAY_ROWS} of {msg.row_count} rows</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  View Table button helper                                           */
/* ------------------------------------------------------------------ */

function ViewTableButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
    >
      <Table2 className="w-3.5 h-3.5" />
      View Table
    </button>
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

  /* ---- Detail modal state ---- */
  const [detailModal, setDetailModal] = useState<{ title: string; panel: string } | null>(null);

  /* ---- Chat state ---- */
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    'How many active members do we have right now?',
    "What's our total MRR by tier this month?",
    'Show me the top 5 deals by MRR that closed in March',
    'Which billing source has the highest churn rate?',
  ];

  const submitQuestion = useCallback(async (question: string) => {
    const id = crypto.randomUUID();
    const msg: ChatMessage = { id, question, summary: null, sql: null, rows: null, row_count: 0, error: null, loading: true };
    setChatMessages((prev) => [...prev, msg]);
    setChatInput('');

    try {
      const res = await fetch('/api/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChatMessages((prev) => prev.map((m) => m.id === id ? { ...m, loading: false, error: data.error || 'Request failed', sql: data.sql || null } : m));
      } else {
        setChatMessages((prev) => prev.map((m) => m.id === id ? { ...m, loading: false, summary: data.summary, sql: data.sql, rows: data.rows, row_count: data.row_count } : m));
      }
    } catch {
      setChatMessages((prev) => prev.map((m) => m.id === id ? { ...m, loading: false, error: 'Network error' } : m));
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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

  /* ---- Pivot MoM data ---- */
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

  /* ---- Sold totals ---- */
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

  /* ---- Chart data ---- */
  const tierChartData = tierRows.filter((r) => r.tier !== 'Total');
  const sourceChartData = sourceRows
    .filter((r) => r.billing_source !== 'Total')
    .map((r) => ({ ...r, label: displaySource(r.billing_source) }));

  /* ---- Styles for chat ---- */
  const thClass = 'text-left text-xs text-slate-500 uppercase tracking-wider pb-2 border-b';
  const tdClass = 'py-2 border-b border-slate-100';

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
            <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-slate-200 transition-colors" title="Refresh">
              <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ---- Chat Panel ---- */}
        <div className="bg-white border border-slate-200 rounded-lg">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <h2 className="text-lg font-semibold">Ask a question about your data</h2>
            {chatOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          </button>

          {chatOpen && (
            <div className="border-t border-slate-100 p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => submitQuestion(s)}
                      className="text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-full px-3 py-1.5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {chatMessages.length > 0 && (
                <div className="max-h-[600px] overflow-y-auto space-y-4">
                  {chatMessages.map((msg) => (
                    <ChatBubble key={msg.id} msg={msg} thClass={thClass} tdClass={tdClass} />
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatInput.trim()) submitQuestion(chatInput.trim());
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about revenue, members, deals, churn..."
                  className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && !summary ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SkeletonTable cols={5} /><SkeletonTable cols={5} /></div>
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

            {/* Row 2: Revenue by Tier + Source */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Revenue by Tier */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Revenue by Tier</h2>
                  <ViewTableButton onClick={() => setDetailModal({ title: 'Revenue by Tier — Detail', panel: 'revenue-by-tier' })} />
                </div>
                {tierChartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={tierChartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="usd_mrr" name="USD MRR" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="usd_mrr" position="top" fontSize={11} formatter={fmtLabel} />
                      </Bar>
                      <Bar dataKey="non_usd_mrr" name="Non-USD MRR" fill="#10b981" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="non_usd_mrr" position="top" fontSize={11} formatter={fmtLabel} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Revenue by Billing Source */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Revenue by Billing Source</h2>
                  <ViewTableButton onClick={() => setDetailModal({ title: 'Revenue by Billing Source — Detail', panel: 'revenue-by-source' })} />
                </div>
                {sourceChartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sourceChartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="usd_mrr" name="USD MRR" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="usd_mrr" position="top" fontSize={11} formatter={fmtLabel} />
                      </Bar>
                      <Bar dataKey="non_usd_mrr" name="Non-USD MRR" fill="#10b981" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="non_usd_mrr" position="top" fontSize={11} formatter={fmtLabel} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Row 3: MoM Revenue */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Month-over-Month Revenue by Billing Source</h2>
                <ViewTableButton onClick={() => setDetailModal({ title: 'MoM Revenue — Detail', panel: 'mom-revenue' })} />
              </div>
              {momPivoted.length > 0 && (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={momPivoted} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month_label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Recharge" stackId="a" fill="#84cc16" />
                    <Bar dataKey="Skool" stackId="a" fill="#fbbf24" />
                    <Bar dataKey="ACE" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="Total" position="top" fontSize={11} formatter={fmtLabel} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Row 4: Sold vs Collected */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Sold Revenue vs Collected Revenue</h2>
                <ViewTableButton onClick={() => setDetailModal({ title: 'Sold Revenue vs Collected — Detail', panel: 'sold-vs-collected' })} />
              </div>
              {soldRows.length > 0 && (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={soldRows} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="close_month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="closed_mrr" name="Closed MRR" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="closed_mrr" position="top" fontSize={11} formatter={fmtLabel} />
                    </Bar>
                    <Bar dataKey="collected_mrr" name="Collected MRR" fill="#10b981" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="collected_mrr" position="top" fontSize={11} formatter={fmtLabel} />
                    </Bar>
                    <Bar dataKey="cancelled_mrr" name="Cancelled MRR" fill="#ef4444" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="cancelled_mrr" position="top" fontSize={11} formatter={fmtLabel} />
                    </Bar>
                    <Bar dataKey="payment_failed_mrr" name="Payment Failed" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="payment_failed_mrr" position="top" fontSize={11} formatter={fmtLabel} />
                    </Bar>
                    <Bar dataKey="no_billing_mrr" name="No Billing Yet" fill="#94a3b8" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="no_billing_mrr" position="top" fontSize={11} formatter={fmtLabel} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Row 5: Churn Cohort */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Churn Rate by Deal Close Month</h2>
                <ViewTableButton onClick={() => setDetailModal({ title: 'Churn Cohort — Detail', panel: 'churn-cohort' })} />
              </div>
              {churnRows.length > 0 && (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={churnRows} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="close_month_cohort" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="left" dataKey="active_mrr" name="Active MRR" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="active_mrr" position="top" fontSize={11} formatter={fmtLabel} />
                    </Bar>
                    <Bar yAxisId="left" dataKey="cancellation_mrr" name="Cancellation MRR" fill="#ef4444" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="cancellation_mrr" position="top" fontSize={11} formatter={fmtLabel} />
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="churn_rate_pct" name="Churn Rate %" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }}>
                      <LabelList dataKey="churn_rate_pct" position="top" fontSize={11} formatter={pctLabel} />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}

      </div>

      {/* ---- Detail Modal ---- */}
      <DetailModal
        open={detailModal !== null}
        onClose={() => setDetailModal(null)}
        title={detailModal?.title ?? ''}
        panel={detailModal?.panel ?? ''}
      />
    </div>
  );
}
