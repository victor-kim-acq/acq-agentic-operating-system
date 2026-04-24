'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { Table2 } from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import GradientBar from '@/components/ui/GradientBar';
import ViewToggle, { ChartView } from '@/components/ui/ViewToggle';
import CollapsibleNotes, { Note } from '@/components/ui/CollapsibleNotes';
import { pctLabel, fmt } from './helpers';

export interface ActivationRow {
  period: string;
  period_key: string;
  acquired: number;
  churned: number;
  ai_activated: number;
  ai_not_activated: number;
  ai_activation_rate: number;
  community_engaged: number;
  community_not_engaged: number;
  community_engagement_rate: number;
  at_risk_vip: number;
  total_vip: number;
  fully_activated: number;
  fully_activated_rate: number;
  ace_rech_ai_activated: number;
  ace_rech_ai_not_activated: number;
  ace_rech_total: number;
  ace_rech_ai_activation_rate: number;
  // derived
  fully_not_activated: number;
}

export interface MemberRow {
  email: string;
  name: string;
  joined_at: string;
  tier: string;
  billing_source: string | null;
  mrr: number;
  status: string;
  ai_activated: boolean;
  community_engaged: boolean;
  fully_activated: boolean;
}

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

const CHART_HEIGHT = 380;
const NOT_ACTIVATED_COLOR = '#f59e0b';

const thClass = 'text-left text-xs font-medium uppercase tracking-wider pb-2 border-b';
const tdClass = 'py-2 border-b';
const thStyle = { color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' };
const tdStyle = { borderColor: 'var(--neutral-100)' };

interface ActivationKPIsProps {
  startDate: string;
  endDate: string;
  lockedDate?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAggregateRows(raw: any[]): ActivationRow[] {
  return raw.map((r) => {
    const acquired = Number(r.acquired) || 0;
    const fully = Number(r.fully_activated) || 0;
    return {
      ...r,
      acquired,
      churned: Number(r.churned) || 0,
      ai_activated: Number(r.ai_activated) || 0,
      ai_not_activated: Number(r.ai_not_activated) || 0,
      ai_activation_rate: Number(r.ai_activation_rate) || 0,
      community_engaged: Number(r.community_engaged) || 0,
      community_not_engaged: Number(r.community_not_engaged) || 0,
      community_engagement_rate: Number(r.community_engagement_rate) || 0,
      at_risk_vip: Number(r.at_risk_vip) || 0,
      total_vip: Number(r.total_vip) || 0,
      fully_activated: fully,
      fully_activated_rate: Number(r.fully_activated_rate) || 0,
      ace_rech_ai_activated: Number(r.ace_rech_ai_activated) || 0,
      ace_rech_ai_not_activated: Number(r.ace_rech_ai_not_activated) || 0,
      ace_rech_total: Number(r.ace_rech_total) || 0,
      ace_rech_ai_activation_rate: Number(r.ace_rech_ai_activation_rate) || 0,
      fully_not_activated: acquired - fully,
    };
  });
}

function useAggregateData(view: ChartView, startDate: string, endDate: string, lockedDate?: string) {
  const [rows, setRows] = useState<ActivationRow[]>([]);
  const fetchData = useCallback(async () => {
    try {
      const lockedParam = lockedDate ? `&lockedDate=${lockedDate}` : '';
      const res = await fetch(
        `/api/dashboard/activation-kpis?view=${view}&startDate=${startDate}&endDate=${endDate}${lockedParam}&t=${Date.now()}`
      );
      const data = await res.json();
      setRows(parseAggregateRows(data.rows ?? []));
    } catch (err) {
      console.error('Failed to fetch activation-kpis:', err);
    }
  }, [view, startDate, endDate, lockedDate]);
  useEffect(() => { fetchData(); }, [fetchData]);
  return rows;
}

function useMembersData(startDate: string, endDate: string, enabled: boolean, lockedDate?: string) {
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fetchData = useCallback(async () => {
    try {
      const lockedParam = lockedDate ? `&lockedDate=${lockedDate}` : '';
      const res = await fetch(
        `/api/dashboard/activation-members?startDate=${startDate}&endDate=${endDate}${lockedParam}&t=${Date.now()}`
      );
      const data = await res.json();
      setRows(data.rows ?? []);
      setLoaded(true);
    } catch (err) {
      console.error('Failed to fetch activation-members:', err);
    }
  }, [startDate, endDate, lockedDate]);
  useEffect(() => {
    if (enabled && !loaded) fetchData();
  }, [enabled, loaded, fetchData]);
  // reset when date range changes
  useEffect(() => { setLoaded(false); }, [startDate, endDate, lockedDate]);
  return rows;
}

function prepareData(rows: ActivationRow[], view: ChartView) {
  return rows.map((r) => ({
    ...r,
    label: view === 'wow' ? formatWeekLabel(r.period_key ?? r.period) : r.period,
  }));
}

const YesNo = ({ yes }: { yes: boolean }) => (
  <span
    style={{
      display: 'inline-block',
      fontSize: '11px',
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

interface MemberTableProps {
  members: MemberRow[];
  signalLabel: string;
  signalKey: 'ai_activated' | 'community_engaged' | 'fully_activated';
}

function daysSince(dateStr: string): number {
  const joined = new Date(dateStr + 'T00:00:00Z');
  const now = new Date();
  const diffMs = now.getTime() - joined.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function MemberTable({ members, signalLabel, signalKey }: MemberTableProps) {
  if (members.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--neutral-400)', fontSize: 13 }}>
        No members in this cohort.
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
    <div className="overflow-auto" style={{ maxHeight: 400, border: '1px solid var(--neutral-100)', borderRadius: 6 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thBase, textAlign: 'left', minWidth: 220 }}>Email</th>
            <th style={{ ...thBase, textAlign: 'left' }}>Joined</th>
            <th style={{ ...thBase, textAlign: 'right' }}>Days since</th>
            <th style={{ ...thBase, textAlign: 'left' }}>Tier</th>
            <th style={{ ...thBase, textAlign: 'right' }}>MRR</th>
            <th style={{ ...thBase, textAlign: 'center' }}>{signalLabel}</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={`${m.email}-${m.status}-${m.joined_at}`} className="hover:bg-[var(--neutral-50)]">
              <td style={{ ...tdBase, textAlign: 'left', color: 'var(--neutral-700)' }}>
                {m.email}
                {m.status === 'cancelled' && (
                  <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--color-danger)' }}>churned</span>
                )}
              </td>
              <td style={{ ...tdBase, textAlign: 'left' }}>{m.joined_at}</td>
              <td style={{ ...tdBase, textAlign: 'right', color: 'var(--neutral-500)' }}>{daysSince(m.joined_at)}d</td>
              <td style={{ ...tdBase, textAlign: 'left' }}>{m.tier}</td>
              <td style={{ ...tdBase, textAlign: 'right' }}>{m.mrr > 0 ? fmt(m.mrr) : '—'}</td>
              <td style={{ ...tdBase, textAlign: 'center' }}>
                <YesNo yes={m[signalKey]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cardActions = (
  showTable: boolean,
  toggleTable: () => void,
  view: ChartView,
  onViewChange: (v: ChartView) => void
) => (
  <>
    <button
      onClick={toggleTable}
      className="flex items-center gap-1 text-xs transition-colors hover:opacity-70"
      style={{ color: 'var(--neutral-400)' }}
    >
      <Table2 className="w-3.5 h-3.5" />{showTable ? 'Chart' : 'Table'}
    </button>
    {!showTable && <ViewToggle view={view} onChange={onViewChange} />}
  </>
);

const AI_ACTIVATION_NOTES: Note[] = [
  {
    title: 'What this chart measures',
    bullets: [
      'A cohort view of ACQ AI activation. Each bar represents the members who joined in a given week or month.',
      'Green bar — members acquired in that period (the cohort).',
      'Slate bar — of those, how many activated AI in their first 7 days.',
      'Line — slate ÷ green, expressed as a percentage.',
    ],
  },
  {
    title: 'Exact calculation',
    bullets: [
      'Activated = sent AI messages on 2 or more distinct calendar days within the first 7 days of joining. Threshold is distinct days, not message count — 50 messages on a single day counts as 1 day; 1 message Monday + 1 message Thursday counts as 2 days.',
      '"Sent a message" = at least one row in the AI messages log. Any content, any length.',
      "The 7-day window starts at each member's exact join timestamp, not the calendar week. A Friday 3 pm joiner has until the following Friday 3 pm.",
      'Weeks on the x-axis are Sunday-to-Saturday, matching the calendar picker above.',
    ],
  },
  {
    title: 'Worked example — week of 2026-03-02',
    bullets: [
      '87 members joined that week (green bar).',
      '48 activated AI in their first 7 days (slate bar).',
      'Activation rate: 48 ÷ 87 = 55.2% (line).',
    ],
  },
  {
    title: 'Things to keep in mind',
    bullets: [
      "A week's bar is final once 7 days have passed since its last day (Saturday). Until then it can still climb as recent joiners close out their first-week windows. Practically, the most recent ~2 bars on the chart are still live; anything older is frozen.",
      "A member's activation window is their personal 7 days, not the calendar week, so a Saturday joiner may activate in what's technically the following calendar week. They still count in their original join-week bar.",
      'The Table toggle in the card header shows every member in the current cohort date range with an "activated yes/no" column — useful for drilling into who activated and who didn\'t.',
    ],
  },
];

export function AIActivationRateCard({ startDate, endDate, lockedDate }: ActivationKPIsProps) {
  const [view, setView] = useState<ChartView>('wow');
  const [showTable, setShowTable] = useState(false);
  const rows = useAggregateData(view, startDate, endDate, lockedDate);
  const members = useMembersData(startDate, endDate, showTable, lockedDate);
  const data = prepareData(rows, view);
  return (
    <ChartCard
      title="ACQ AI Activation Rate"
      subtitle="Members with 2+ active days in first 7 days"
      height={CHART_HEIGHT}
      loading={data.length === 0 && !showTable}
      actions={cardActions(showTable, () => setShowTable(!showTable), view, setView)}
    >
      {showTable ? (
        <MemberTable members={members} signalLabel="AI Activated" signalKey="ai_activated" />
      ) : (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
            <Tooltip content={<ActivationTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="acquired" name="Total acquired" fill="var(--chart-2)" shape={<GradientBar />}>
              <LabelList dataKey="acquired" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
            </Bar>
            <Bar yAxisId="left" dataKey="ai_activated" name="Activated" fill="#64748b" shape={<GradientBar />}>
              <LabelList dataKey="ai_activated" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="ai_activation_rate" name="Activation Rate %" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)', r: 3 }}>
              <LabelList dataKey="ai_activation_rate" position="top" fontSize={10} fill="var(--neutral-500)" formatter={pctLabel} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      )}
      <div style={{ marginTop: 28 }}>
        <CollapsibleNotes
          notes={AI_ACTIVATION_NOTES}
          header="About this chart"
          fadeColor="var(--card-bg)"
        />
      </div>
    </ChartCard>
  );
}

export default function ActivationKPIs({ startDate, endDate }: ActivationKPIsProps) {
  const [commView, setCommView] = useState<ChartView>('wow');
  const [vipView, setVipView] = useState<ChartView>('wow');
  const [aceView, setAceView] = useState<ChartView>('wow');
  const [bothView, setBothView] = useState<ChartView>('wow');

  const [commTable, setCommTable] = useState(false);
  const [vipTable, setVipTable] = useState(false);
  const [aceTable, setAceTable] = useState(false);
  const [bothTable, setBothTable] = useState(false);

  const commRows = useAggregateData(commView, startDate, endDate);
  const vipRows = useAggregateData(vipView, startDate, endDate);
  const aceRows = useAggregateData(aceView, startDate, endDate);
  const bothRows = useAggregateData(bothView, startDate, endDate);

  const anyTableOpen = commTable || vipTable || aceTable || bothTable;
  const members = useMembersData(startDate, endDate, anyTableOpen);

  const commData = prepareData(commRows, commView);
  const vipData = prepareData(vipRows, vipView);
  const aceData = prepareData(aceRows, aceView);
  const bothData = prepareData(bothRows, bothView);

  // Derived member lists
  const vipMembers = members.filter((m) => m.tier === 'VIP');
  const aceRechMembers = members.filter(
    (m) => m.billing_source === 'ACE' || m.billing_source === 'Recharge'
  );

  const actions = cardActions;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 1. ACQ AI Activation Rate */}
      <AIActivationRateCard startDate={startDate} endDate={endDate} />

      {/* 2. Community Engagement Rate */}
      <ChartCard
        title="Community Engagement Rate"
        subtitle="Members with 3+ posts/comments in first 15 days"
        height={CHART_HEIGHT}
        loading={commData.length === 0 && !commTable}
        actions={actions(commTable, () => setCommTable(!commTable), commView, setCommView)}
      >
        {commTable ? (
          <MemberTable members={members} signalLabel="Community Engaged" signalKey="community_engaged" />
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart data={commData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
              <Tooltip content={<ActivationTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="community_engaged" name="Engaged 3+" fill="var(--chart-1)" shape={<GradientBar />}>
                <LabelList dataKey="community_engaged" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Bar yAxisId="left" dataKey="community_not_engaged" name="Not Engaged" fill={NOT_ACTIVATED_COLOR} shape={<GradientBar />}>
                <LabelList dataKey="community_not_engaged" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="community_engagement_rate" name="Engagement Rate %" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)', r: 3 }}>
                <LabelList dataKey="community_engagement_rate" position="top" fontSize={10} fill="var(--neutral-500)" formatter={pctLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 3. At-Risk VIPs */}
      <ChartCard
        title="At-Risk VIPs"
        subtitle="VIP members not activated on ACQ AI"
        height={CHART_HEIGHT}
        loading={vipData.length === 0 && !vipTable}
        actions={actions(vipTable, () => setVipTable(!vipTable), vipView, setVipView)}
      >
        {vipTable ? (
          <MemberTable members={vipMembers} signalLabel="AI Activated" signalKey="ai_activated" />
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart data={vipData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
              <Tooltip content={<ActivationTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="at_risk_vip" name="At-Risk VIPs" fill={NOT_ACTIVATED_COLOR} shape={<GradientBar />}>
                <LabelList dataKey="at_risk_vip" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Bar yAxisId="left" dataKey="fully_activated" name="Fully Activated" fill="var(--chart-2)" shape={<GradientBar />}>
                <LabelList dataKey="fully_activated" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="fully_activated_rate" name="Fully Activated Rate %" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)', r: 3 }}>
                <LabelList dataKey="fully_activated_rate" position="top" fontSize={10} fill="var(--neutral-500)" formatter={pctLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 4. ACE/Recharge AI Activation */}
      <ChartCard
        title="ACE/Recharge AI Activation"
        subtitle="ACE & Recharge members with 2+ active days in first 7 days"
        height={CHART_HEIGHT}
        loading={aceData.length === 0 && !aceTable}
        actions={actions(aceTable, () => setAceTable(!aceTable), aceView, setAceView)}
      >
        {aceTable ? (
          <MemberTable members={aceRechMembers} signalLabel="AI Activated" signalKey="ai_activated" />
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart data={aceData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
              <Tooltip content={<ActivationTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="ace_rech_ai_activated" name="Activated" fill="var(--chart-5)" shape={<GradientBar />}>
                <LabelList dataKey="ace_rech_ai_activated" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Bar yAxisId="left" dataKey="ace_rech_ai_not_activated" name="Not Activated" fill={NOT_ACTIVATED_COLOR} shape={<GradientBar />}>
                <LabelList dataKey="ace_rech_ai_not_activated" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="ace_rech_ai_activation_rate" name="Activation Rate %" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)', r: 3 }}>
                <LabelList dataKey="ace_rech_ai_activation_rate" position="top" fontSize={10} fill="var(--neutral-500)" formatter={pctLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 5. Fully Activated Rate (Both Signals) */}
      <ChartCard
        title="Fully Activated Rate"
        subtitle="Members who hit BOTH signals (AI + community engagement)"
        height={CHART_HEIGHT}
        loading={bothData.length === 0 && !bothTable}
        actions={actions(bothTable, () => setBothTable(!bothTable), bothView, setBothView)}
      >
        {bothTable ? (
          <MemberTable members={members} signalLabel="Fully Activated" signalKey="fully_activated" />
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart data={bothData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
              <Tooltip content={<ActivationTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="fully_activated" name="Fully Activated" fill="var(--chart-2)" shape={<GradientBar />}>
                <LabelList dataKey="fully_activated" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Bar yAxisId="left" dataKey="fully_not_activated" name="Not Fully Activated" fill={NOT_ACTIVATED_COLOR} shape={<GradientBar />}>
                <LabelList dataKey="fully_not_activated" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="fully_activated_rate" name="Fully Activated Rate %" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)', r: 3 }}>
                <LabelList dataKey="fully_activated_rate" position="top" fontSize={10} fill="var(--neutral-500)" formatter={pctLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ActivationTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div
      className="rounded-lg p-3 text-sm border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--neutral-200)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <p className="font-medium mb-1" style={{ color: 'var(--neutral-900)' }}>{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.name.includes('%') ? `${Number(entry.value).toFixed(1)}%` : Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};
