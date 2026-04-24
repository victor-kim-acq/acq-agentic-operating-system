'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { Table2 } from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import GradientBar from '@/components/ui/GradientBar';
import ViewToggle, { ChartView } from '@/components/ui/ViewToggle';
import { pctLabel } from './helpers';

interface WAURow {
  period: string;
  period_key: string;
  wau: number;
  active_base: number;
  wau_rate: number;
}

interface WAUMemberRow {
  email: string;
  name: string;
  joined_at: string;
  tier: string;
  status: string;
  days_in_period: number;
  messages_in_period: number;
  wau: boolean;
}

interface Props {
  startDate: string;
  endDate: string;
}

const CHART_HEIGHT = 380;
const WAU_COLOR = 'var(--chart-2)';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countLabel: any = (v: unknown) => {
  const n = Number(v);
  return n > 0 ? n.toLocaleString() : '';
};

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function prepareData(rows: WAURow[], view: ChartView) {
  return rows.map((r) => ({
    ...r,
    label: view === 'wow' ? formatWeekLabel(r.period_key ?? r.period) : r.period,
  }));
}

function useAggregateData(view: ChartView, startDate: string, endDate: string) {
  const [rows, setRows] = useState<WAURow[]>([]);
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/dashboard/weekly-ai-activity?view=${view}&startDate=${startDate}&endDate=${endDate}&t=${Date.now()}`
      );
      const data = await res.json();
      setRows(
        (data.rows ?? []).map((r: WAURow) => ({
          ...r,
          wau: Number(r.wau) || 0,
          active_base: Number(r.active_base) || 0,
          wau_rate: Number(r.wau_rate) || 0,
        }))
      );
    } catch (err) {
      console.error('Failed to fetch weekly-ai-activity:', err);
    }
  }, [view, startDate, endDate]);
  useEffect(() => { fetchData(); }, [fetchData]);
  return rows;
}

function useMembersData(view: ChartView, endDate: string, enabled: boolean) {
  const [rows, setRows] = useState<WAUMemberRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/dashboard/weekly-ai-activity/members?view=${view}&endDate=${endDate}&t=${Date.now()}`
      );
      const data = await res.json();
      setRows(data.rows ?? []);
      setLoaded(true);
    } catch (err) {
      console.error('Failed to fetch weekly-ai-activity members:', err);
    }
  }, [view, endDate]);
  useEffect(() => {
    if (enabled && !loaded) fetchData();
  }, [enabled, loaded, fetchData]);
  useEffect(() => { setLoaded(false); }, [view, endDate]);
  return rows;
}

const YesNo = ({ yes }: { yes: boolean }) => (
  <span
    style={{
      display: 'inline-block',
      fontSize: 11,
      fontWeight: 500,
      padding: '2px 8px',
      borderRadius: 4,
      background: yes ? 'var(--color-success-bg)' : '#fef3c7',
      color: yes ? 'var(--color-success)' : '#b45309',
    }}
  >
    {yes ? 'Yes' : 'No'}
  </span>
);

function MemberTable({ members, view }: { members: WAUMemberRow[]; view: ChartView }) {
  const periodLabel = view === 'wow' ? 'week' : 'month';
  if (members.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--neutral-400)', fontSize: 13 }}>
        No members active in the current {periodLabel}.
      </div>
    );
  }
  const thBase: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--neutral-400)',
    borderBottom: '1px solid var(--neutral-200)',
    padding: '8px 12px',
    whiteSpace: 'nowrap',
    background: 'var(--card-bg)',
    position: 'sticky',
    top: 0,
  };
  const tdBase: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid var(--neutral-100)',
    fontSize: 13,
    whiteSpace: 'nowrap',
  };
  return (
    <div
      className="overflow-auto"
      style={{ maxHeight: 400, border: '1px solid var(--neutral-100)', borderRadius: 6 }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thBase, textAlign: 'left', minWidth: 220 }}>Email</th>
            <th style={{ ...thBase, textAlign: 'left' }}>Joined</th>
            <th style={{ ...thBase, textAlign: 'left' }}>Tier</th>
            <th style={{ ...thBase, textAlign: 'right' }}>Days this {periodLabel}</th>
            <th style={{ ...thBase, textAlign: 'right' }}>Msgs this {periodLabel}</th>
            <th style={{ ...thBase, textAlign: 'center' }}>WAU</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={`${m.email}-${m.joined_at}`} className="hover:bg-[var(--neutral-50)]">
              <td style={{ ...tdBase, textAlign: 'left', color: 'var(--neutral-700)' }}>
                {m.email}
                {m.status === 'cancelled' && (
                  <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--color-danger)' }}>churned</span>
                )}
              </td>
              <td style={{ ...tdBase, textAlign: 'left' }}>{m.joined_at}</td>
              <td style={{ ...tdBase, textAlign: 'left' }}>{m.tier}</td>
              <td style={{ ...tdBase, textAlign: 'right' }}>{m.days_in_period}</td>
              <td style={{ ...tdBase, textAlign: 'right' }}>{m.messages_in_period.toLocaleString()}</td>
              <td style={{ ...tdBase, textAlign: 'center' }}>
                <YesNo yes={m.wau} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WAUTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div
      className="rounded-lg p-3 text-sm border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--neutral-200)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((p: { name: string; value: number; color: string; dataKey: string }) => {
        const isRate = p.dataKey === 'wau_rate';
        return (
          <div key={p.name} style={{ color: p.color, fontSize: 12 }}>
            {p.name}: {isRate ? `${p.value.toFixed(1)}%` : p.value.toLocaleString()}
          </div>
        );
      })}
      {payload[0]?.payload?.active_base !== undefined && (
        <div style={{ color: 'var(--neutral-400)', fontSize: 11, marginTop: 4 }}>
          Active base: {Number(payload[0].payload.active_base).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default function AIWeeklyActiveCard({ startDate, endDate }: Props) {
  const [view, setView] = useState<ChartView>('wow');
  const [showTable, setShowTable] = useState(false);
  const rows = useAggregateData(view, startDate, endDate);
  const members = useMembersData(view, endDate, showTable);
  const data = prepareData(rows, view);

  const actions = (
    <>
      <button
        onClick={() => setShowTable((s) => !s)}
        className="flex items-center gap-1 text-xs transition-colors hover:opacity-70"
        style={{ color: 'var(--neutral-400)' }}
      >
        <Table2 className="w-3.5 h-3.5" />
        {showTable ? 'Chart' : 'Table'}
      </button>
      {!showTable && <ViewToggle view={view} onChange={setView} />}
    </>
  );

  return (
    <ChartCard
      title="AI Weekly Active Users"
      subtitle="Members using AI 2+ days in the period \u00f7 active community size"
      height={CHART_HEIGHT}
      loading={data.length === 0 && !showTable}
      actions={actions}
    >
      {showTable ? (
        <MemberTable members={members} view={view} />
      ) : (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
            <Tooltip content={<WAUTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="wau" name="WAU" fill={WAU_COLOR} shape={<GradientBar />}>
              <LabelList dataKey="wau" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="wau_rate" name="WAU Rate %" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)', r: 3 }}>
              <LabelList dataKey="wau_rate" position="top" fontSize={10} fill="var(--neutral-500)" formatter={pctLabel} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
