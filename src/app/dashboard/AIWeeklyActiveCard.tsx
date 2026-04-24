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
import CollapsibleNotes, { Note } from '@/components/ui/CollapsibleNotes';

const WAU_NOTES: Note[] = [
  {
    title: 'What this chart measures',
    bullets: [
      'A time-series view of ACQ AI weekly (or monthly) active users. Each bar represents activity during a given calendar period.',
      'Slate bar — members active in the community at some point during the period (the denominator).',
      'Blue bar — of those, how many used AI on 2+ distinct days during that same period.',
      'Line — blue ÷ slate, expressed as a percentage.',
    ],
  },
  {
    title: 'Exact calculation',
    bullets: [
      'A member counts as WAU (or MAU) for a period if they sent AI messages on 2 or more distinct calendar days within that week (Sun–Sat) or month. Same "2+ distinct days" threshold as the activation chart, but measured against the fixed calendar period — not the member\'s personal first 7 days.',
      '"Sent a message" = at least one row in the AI messages log. Any content, any length.',
      'Active base = members whose join date was before the period ended AND (never cancelled OR cancelled after the period started). Read as: "was a member at some point during the period." Someone who joined Tuesday and cancelled Thursday still counts for that week.',
      'Weeks are Sunday-to-Saturday.',
    ],
  },
  {
    title: 'Worked example — week of 2026-03-16',
    bullets: [
      '722 members were active in the community that week (slate bar).',
      '316 of them sent AI messages on 2+ distinct days during Sun 3/15 → Sat 3/21 (blue bar).',
      'Rate: 316 ÷ 722 = 43.8% (line).',
    ],
  },
  {
    title: 'Things to keep in mind',
    bullets: [
      'The current (in-progress) week shows a partial read — fewer days to accumulate the 2+ day threshold, so the blue bar and rate will be lower than usual. Expect them to climb as the week fills out.',
      "Unlike the activation chart, the measurement window is the calendar week, not each member's personal 7 days. A Saturday joiner has only 1 day of runway to hit WAU that week — they typically show up in the slate bar but not the blue bar until the following week. This structurally depresses the rate slightly during weeks with lots of late joiners.",
      "Pre-March 2026 cancellations are missing from our data. If the date range extends before March 2026, the slate bar for those weeks will be inflated (we can't deduct cancellations we don't know about).",
      'The Table toggle shows members active in the most recent period, with a column for days messaged and total messages that period.',
    ],
  },
];

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
  lockedDate?: string;
}

const CHART_HEIGHT = 380;
const WAU_COLOR = 'var(--chart-1)';
const ACTIVE_BASE_COLOR = '#64748b';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countLabel: any = (v: unknown) => {
  const n = Number(v);
  return n > 0 ? n.toLocaleString() : '';
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pctIntLabel: any = (v: unknown) => {
  const n = Number(v);
  return n > 0 ? `${Math.round(n)}%` : '';
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

function useAggregateData(view: ChartView, startDate: string, endDate: string, lockedDate?: string) {
  const [rows, setRows] = useState<WAURow[]>([]);
  const fetchData = useCallback(async () => {
    try {
      const lockedParam = lockedDate ? `&lockedDate=${lockedDate}` : '';
      const res = await fetch(
        `/api/dashboard/weekly-ai-activity?view=${view}&startDate=${startDate}&endDate=${endDate}${lockedParam}&t=${Date.now()}`
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
  }, [view, startDate, endDate, lockedDate]);
  useEffect(() => { fetchData(); }, [fetchData]);
  return rows;
}

function useMembersData(view: ChartView, endDate: string, enabled: boolean, lockedDate?: string) {
  const [rows, setRows] = useState<WAUMemberRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fetchData = useCallback(async () => {
    try {
      const lockedParam = lockedDate ? `&lockedDate=${lockedDate}` : '';
      const res = await fetch(
        `/api/dashboard/weekly-ai-activity/members?view=${view}&endDate=${endDate}${lockedParam}&t=${Date.now()}`
      );
      const data = await res.json();
      setRows(data.rows ?? []);
      setLoaded(true);
    } catch (err) {
      console.error('Failed to fetch weekly-ai-activity members:', err);
    }
  }, [view, endDate, lockedDate]);
  useEffect(() => {
    if (enabled && !loaded) fetchData();
  }, [enabled, loaded, fetchData]);
  useEffect(() => { setLoaded(false); }, [view, endDate, lockedDate]);
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
    </div>
  );
};

export default function AIWeeklyActiveCard({ startDate, endDate, lockedDate }: Props) {
  const [view, setView] = useState<ChartView>('wow');
  const [showTable, setShowTable] = useState(false);
  const rows = useAggregateData(view, startDate, endDate, lockedDate);
  const members = useMembersData(view, endDate, showTable, lockedDate);
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
            <Bar yAxisId="left" dataKey="active_base" name="Active members" fill={ACTIVE_BASE_COLOR} shape={<GradientBar />}>
              <LabelList dataKey="active_base" position="top" fontSize={11} fontWeight={600} fill="var(--neutral-800)" formatter={countLabel} />
            </Bar>
            <Bar yAxisId="left" dataKey="wau" name="WAU" fill={WAU_COLOR} shape={<GradientBar />}>
              <LabelList dataKey="wau" position="top" fontSize={11} fontWeight={600} fill="var(--neutral-800)" formatter={countLabel} />
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="wau_rate" name="WAU Rate %" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)', r: 3 }}>
              <LabelList dataKey="wau_rate" position="top" offset={16} fontSize={11} fontWeight={600} fill="var(--chart-3)" formatter={pctIntLabel} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      )}
      <div style={{ marginTop: 28 }}>
        <CollapsibleNotes
          notes={WAU_NOTES}
          header="About this chart"
          fadeColor="var(--card-bg)"
        />
      </div>
    </ChartCard>
  );
}
