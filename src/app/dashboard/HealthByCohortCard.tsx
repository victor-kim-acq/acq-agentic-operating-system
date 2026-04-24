'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import ChartCard from '@/components/ui/ChartCard';
import GradientBar from '@/components/ui/GradientBar';
import ViewToggle, { ChartView } from '@/components/ui/ViewToggle';
import CollapsibleNotes, { Note } from '@/components/ui/CollapsibleNotes';

const CHART_HEIGHT = 380;

const BAND_COLORS: Record<string, string> = {
  dormant: '#64748b',
  lukewarm: '#f59e0b',
  engaged: '#0d9488',
  champion: '#2563eb',
};

interface CohortRow {
  period: string;
  period_key: string;
  total: number;
  dormant: number;
  lukewarm: number;
  engaged: number;
  champion: number;
  avg_score: number;
}

interface Props {
  filters: {
    status: string;
    source: string;
    tier: string;
    joinStart: string;
    joinEnd: string;
  };
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countLabel: any = (v: unknown) => {
  const n = Number(v);
  return n > 0 ? n.toLocaleString() : '';
};

const COHORT_NOTES: Note[] = [
  {
    title: 'What this chart shows',
    bullets: [
      'The band breakdown (Dormant / Lukewarm / Engaged / Champion) of each join-month cohort, stacked as a single bar per cohort.',
      'The line shows average composite score per cohort on the right axis.',
      'Answers "are newer cohorts weaker or stronger than older ones?" — the single question the retention framework cares about most.',
    ],
  },
  {
    title: 'How the buckets are assigned',
    bullets: [
      'Each member is scored once (daily snapshot) using the composite formula shown in the distribution chart above.',
      'Members are then grouped by the month or week they joined. The same member stays in their original join-period cohort forever — this chart is about who joined when, not who is active now.',
      'Cohort buckets with fewer than 5 members are tiny and should be read as directional only — a single champion can swing the average dramatically.',
    ],
  },
  {
    title: 'Things to keep in mind',
    bullets: [
      'Older cohorts have had longer to develop engagement signals — a March joiner has had 7+ weeks to post, a member who joined this week has had 3 days. Expect a visible upward trend in old-cohort avg score that reflects tenure, not quality.',
      'If the dormant share is growing monotonically in more recent cohorts, that is a signal that new-member activation is degrading. Cross-check against /agents/activation before concluding.',
      'The join-date filter above sets the x-axis range. Leave it wide (e.g. last 12 months) for long-term trend reading; narrow it (last 8 weeks + switch to WoW) to see recent cohort drift.',
    ],
  },
];

export default function HealthByCohortCard({ filters }: Props) {
  const [view, setView] = useState<ChartView>('mom');
  const [rows, setRows] = useState<CohortRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        status: filters.status,
        source: filters.source,
        tier: filters.tier,
        joinStart: filters.joinStart,
        joinEnd: filters.joinEnd,
        view,
        t: String(Date.now()),
      }).toString();
      const res = await fetch(`/api/dashboard/health-by-cohort?${qs}`);
      const json = await res.json();
      setRows((json.rows ?? []) as CohortRow[]);
    } catch (err) {
      console.error('health-by-cohort fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, view]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const data = rows.map((r) => ({
    ...r,
    label: view === 'wow' ? formatWeekLabel(r.period_key) : r.period,
  }));

  const actions = <ViewToggle view={view} onChange={setView} />;

  return (
    <ChartCard
      title="Health by Join-Month Cohort"
      subtitle="Band breakdown per cohort · line is avg composite score"
      height={CHART_HEIGHT}
      loading={loading && data.length === 0}
      actions={actions}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--neutral-700)' }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: 'var(--neutral-700)' }}
            width={40}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'var(--neutral-700)' }}
            tickFormatter={(v) => String(Math.round(Number(v)))}
            width={35}
          />
          <Tooltip content={<CohortTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar
            yAxisId="left"
            dataKey="dormant"
            name="Dormant"
            stackId="band"
            fill={BAND_COLORS.dormant}
            shape={<GradientBar />}
          />
          <Bar
            yAxisId="left"
            dataKey="lukewarm"
            name="Lukewarm"
            stackId="band"
            fill={BAND_COLORS.lukewarm}
            shape={<GradientBar />}
          />
          <Bar
            yAxisId="left"
            dataKey="engaged"
            name="Engaged"
            stackId="band"
            fill={BAND_COLORS.engaged}
            shape={<GradientBar />}
          />
          <Bar
            yAxisId="left"
            dataKey="champion"
            name="Champion"
            stackId="band"
            fill={BAND_COLORS.champion}
            shape={<GradientBar />}
          >
            <LabelList
              dataKey="total"
              position="top"
              fontSize={11}
              fontWeight={600}
              fill="var(--neutral-800)"
              formatter={countLabel}
            />
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avg_score"
            name="Avg score"
            stroke="var(--chart-3)"
            strokeWidth={2}
            dot={{ fill: 'var(--chart-3)', r: 3 }}
          >
            <LabelList
              dataKey="avg_score"
              position="top"
              offset={16}
              fontSize={11}
              fontWeight={600}
              fill="var(--chart-3)"
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 28 }}>
        <CollapsibleNotes
          notes={COHORT_NOTES}
          header="About this chart"
          fadeColor="var(--card-bg)"
        />
      </div>
    </ChartCard>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
}

function CohortTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as CohortRow & { label: string };
  return (
    <div
      className="rounded-lg p-3 text-sm border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--neutral-200)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        {label} <span style={{ color: 'var(--neutral-400)', fontWeight: 400 }}>· n={p.total}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '2px 12px', fontSize: 12 }}>
        <span style={{ color: BAND_COLORS.dormant }}>Dormant</span>
        <span style={{ textAlign: 'right' }}>{p.dormant.toLocaleString()}</span>
        <span style={{ color: BAND_COLORS.lukewarm }}>Lukewarm</span>
        <span style={{ textAlign: 'right' }}>{p.lukewarm.toLocaleString()}</span>
        <span style={{ color: BAND_COLORS.engaged }}>Engaged</span>
        <span style={{ textAlign: 'right' }}>{p.engaged.toLocaleString()}</span>
        <span style={{ color: BAND_COLORS.champion }}>Champion</span>
        <span style={{ textAlign: 'right' }}>{p.champion.toLocaleString()}</span>
        <span style={{ color: 'var(--chart-3)', borderTop: '1px solid var(--neutral-100)', paddingTop: 4, marginTop: 4 }}>
          Avg score
        </span>
        <span style={{ textAlign: 'right', borderTop: '1px solid var(--neutral-100)', paddingTop: 4, marginTop: 4, fontWeight: 600 }}>
          {p.avg_score}
        </span>
      </div>
    </div>
  );
}
