'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import ChartCard from '@/components/ui/ChartCard';
import GradientBar from '@/components/ui/GradientBar';
import CollapsibleNotes, { Note } from '@/components/ui/CollapsibleNotes';

export interface HealthBand {
  band: 'at_risk' | 'steady' | 'champion';
  count: number;
  pct: number;
  avg_score: number;
}

export interface HealthDistribution {
  buckets: HealthBand[];
  total: number;
  avg_score: number;
  as_of: string | null;
}

const BAND_LABELS: Record<HealthBand['band'], string> = {
  at_risk: 'At Risk',
  steady: 'Steady',
  champion: 'Champion',
};

const BAND_COLORS: Record<HealthBand['band'], string> = {
  at_risk: '#ef4444',
  steady: '#f59e0b',
  champion: '#22c55e',
};

const BAND_RANGES: Record<HealthBand['band'], string> = {
  at_risk: '0–25',
  steady: '26–75',
  champion: '76–100',
};

const CHART_HEIGHT = 340;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countLabel: any = (v: unknown) => {
  const n = Number(v);
  return n > 0 ? n.toLocaleString() : '';
};

const HEALTH_NOTES: Note[] = [
  {
    title: 'What this chart shows',
    bullets: [
      'The filtered member population split into three health bands based on a composite score (0–100). Higher score = more engaged across all signals.',
      'At Risk (0–25) — prioritize for CS outreach. · Steady (26–75) — light-touch nurture. · Champion (76–100) — celebrate, use as advocates.',
      'The %s above each bar are share of the filtered population — they sum to 100%.',
    ],
  },
  {
    title: 'How the composite score is computed (v2 — per billing source)',
    bullets: [
      'Weights differ by billing source. Same components, same caps — just different coefficients.',
      'For ACE / Recharge: Engagement 30% · Learning 25% · AI 20% · Upvotes 15% · Recency 10%.',
      'For Skool / Unknown: Engagement 35% · Learning 30% · Upvotes 20% · Recency 15% · AI 0%.',
      'Why AI is zero for Skool: profiling showed AI activation inverts for Skool-native members — cancelled Skool members were more likely to be AI-activated than active ones.',
      'Component definitions: Engagement = min(posts + comments, 20). Upvotes = min(upvotes_received, 50). Learning = min(courses_started × 10 + courses_completed × 20, 100). AI = ai_activated ? 100 : min(ai_total_chats, 100). Recency = max(0, 100 − min(days_since_last_post, 30) × 3.33).',
      'v2 weights came from profiling active vs cancelled distributions per billing source — see .claude/skills/member-health/SKILL.md for full rationale.',
    ],
  },
  {
    title: 'Things to keep in mind',
    bullets: [
      'An at-risk-heavy distribution is normal for any community — most members are lurkers, which pulls nearly every engagement component to zero. The useful question is "has the at-risk share grown over time?", which the cohort chart below answers.',
      'The data is a snapshot refreshed daily at 06:00 UTC. A very-recently-joined member may not be scored yet.',
      'Members with no matching cohort row (NULL tier / billing_source) are rare edge cases where the health and cohort rebuilds were a few minutes out of sync.',
    ],
  },
];

interface Props {
  filters: {
    status: string;
    source: string;
    tier: string;
    joinStart: string;
    joinEnd: string;
  };
  onData?: (data: HealthDistribution) => void;
}

export default function HealthDistributionCard({ filters, onData }: Props) {
  const [data, setData] = useState<HealthDistribution | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const qs = new URLSearchParams({
        status: filters.status,
        source: filters.source,
        tier: filters.tier,
        joinStart: filters.joinStart,
        joinEnd: filters.joinEnd,
        t: String(Date.now()),
      }).toString();
      const res = await fetch(`/api/dashboard/health-distribution?${qs}`);
      const json = (await res.json()) as HealthDistribution;
      setData(json);
      onData?.(json);
    } catch (err) {
      console.error('health-distribution fetch failed:', err);
    }
  }, [filters, onData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rows =
    data?.buckets.map((b) => ({
      ...b,
      label: BAND_LABELS[b.band],
      range: BAND_RANGES[b.band],
      fill: BAND_COLORS[b.band],
    })) ?? [];

  const subtitle = data
    ? `n=${data.total.toLocaleString()} · avg score ${data.avg_score}`
    : undefined;

  return (
    <ChartCard
      title="Health Score Distribution"
      subtitle={subtitle}
      height={CHART_HEIGHT}
      loading={!data}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={rows} margin={{ top: 30, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: 'var(--neutral-700)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--neutral-200)' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--neutral-700)' }}
            width={40}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<DistributionTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
          <Bar dataKey="count" shape={<GradientBar />}>
            {rows.map((r) => (
              <Cell key={r.band} fill={r.fill} />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              fontSize={12}
              fontWeight={600}
              fill="var(--neutral-800)"
              formatter={countLabel}
            />
            <LabelList
              dataKey="pct"
              position="top"
              offset={22}
              fontSize={11}
              fontWeight={500}
              fill="var(--neutral-400)"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((v: any) => (Number(v) > 0 ? `${Number(v).toFixed(0)}%` : '')) as any}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 28 }}>
        <CollapsibleNotes
          notes={HEALTH_NOTES}
          header="About this chart"
          fadeColor="var(--card-bg)"
        />
      </div>
    </ChartCard>
  );
}

interface TooltipProps {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
}

function DistributionTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as {
    label: string;
    range: string;
    count: number;
    pct: number;
    avg_score: number;
    fill: string;
  };
  return (
    <div
      className="rounded-lg p-3 text-sm border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--neutral-200)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, color: p.fill }}>
        {p.label}
      </div>
      <div style={{ fontSize: 11, color: 'var(--neutral-400)', marginBottom: 6 }}>
        Score {p.range}
      </div>
      <div style={{ color: 'var(--neutral-700)' }}>
        {p.count.toLocaleString()} members ({p.pct.toFixed(1)}%)
      </div>
      <div style={{ color: 'var(--neutral-500)', fontSize: 12, marginTop: 2 }}>
        Avg score: {p.avg_score}
      </div>
    </div>
  );
}
