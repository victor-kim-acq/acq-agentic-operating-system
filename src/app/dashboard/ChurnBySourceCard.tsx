'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ChartCard from '@/components/ui/ChartCard';
import CollapsibleNotes, { Note } from '@/components/ui/CollapsibleNotes';

interface ChurnRow {
  source: string;
  total: number;
  cancelled: number;
  overall_churn: number | null;
  verified_churn: number | null;
  verified_n: number;
  notverified_churn: number | null;
  notverified_n: number;
  onboard_churn: number | null;
  onboard_n: number;
  notonboard_churn: number | null;
  notonboard_n: number;
  standard_churn: number | null;
  standard_n: number;
  vip_churn: number | null;
  vip_n: number;
  premium_churn: number | null;
  premium_n: number;
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

const CHART_HEIGHT = 360;

// Deliberate visual grouping: rescue-signal pairs (verified/not, onboarded/not)
// use green/red tones; tiers use a distinct palette.
const SERIES = [
  { key: 'verified_churn',     nKey: 'verified_n',     name: 'Verified revenue',     color: '#0d9488' },
  { key: 'notverified_churn',  nKey: 'notverified_n',  name: 'Not verified',         color: '#f59e0b' },
  { key: 'onboard_churn',      nKey: 'onboard_n',      name: 'Onboarding completed', color: '#2563eb' },
  { key: 'notonboard_churn',   nKey: 'notonboard_n',   name: 'Not onboarded',        color: '#ef4444' },
  { key: 'standard_churn',     nKey: 'standard_n',     name: 'Standard',             color: '#64748b' },
  { key: 'vip_churn',          nKey: 'vip_n',          name: 'VIP',                  color: '#7c3aed' },
  { key: 'premium_churn',      nKey: 'premium_n',      name: 'Premium',              color: '#0891b2' },
] as const;

const NOTES: Note[] = [
  {
    title: 'What this chart shows',
    bullets: [
      'Churn rate per billing source, cut by five segments: verified revenue (yes/no), onboarding call (completed/never), and membership tier (Standard / VIP / Premium).',
      'Churn rate formula: cancelled members ÷ (active + cancelled) within the join-date window. Each group of seven bars is one billing source.',
      "The page's Status filter is intentionally ignored here — a churn-rate chart needs both active and cancelled to compute the denominator. Everything else (joined-from / joined-to / tier / source filters) applies normally.",
    ],
  },
  {
    title: 'How to read the bars',
    bullets: [
      'Green / amber — verified vs not verified revenue. Framework says 0% churn when verified for ACE/Recharge; watch the gap.',
      'Blue / red — onboarding completed vs never. Framework\'s strongest rescue lever — completers 11.1% churn vs never-booked 32.3%.',
      'Slate / purple / cyan — tier (Standard / VIP / Premium). Tier discipline matters: higher tier typically means lower churn.',
      'Missing bars: if a source × segment has zero members, that bar is omitted at that x-axis position. Hover the group to see all n values.',
    ],
  },
  {
    title: 'Things to keep in mind',
    bullets: [
      'Founding Members are pre-Feb 2026 joiners with no billing source — they will often show very high churn on every bar because they predate onboarding and verification systems (most never completed either).',
      'Small denominators are noisy. Hover any bar group to see n for each segment; anything n<5 should be read as directional only.',
      'Framework reference: acq-vantage-retention skill (signals 1–5 and the segmentation reasoning).',
    ],
  },
];

export default function ChurnBySourceCard({ filters }: Props) {
  const [rows, setRows] = useState<ChurnRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        // intentionally omit status — endpoint ignores it anyway, but skipping
        // the round-trip keeps the log clean
        source: filters.source,
        tier: filters.tier,
        joinStart: filters.joinStart,
        joinEnd: filters.joinEnd,
        t: String(Date.now()),
      }).toString();
      const res = await fetch(`/api/dashboard/health-churn-by-source?${qs}`);
      const json = await res.json();
      setRows((json.rows ?? []) as ChurnRow[]);
    } catch (err) {
      console.error('health-churn-by-source fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const subtitle =
    rows.length > 0
      ? `n=${rows.reduce((s, r) => s + r.total, 0).toLocaleString()} cohort members · cancelled ÷ (active + cancelled)`
      : undefined;

  return (
    <ChartCard
      title="Churn Rate by Source × Segment"
      subtitle={subtitle}
      height={CHART_HEIGHT}
      loading={loading && rows.length === 0}
    >
      {rows.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--neutral-400)',
            fontSize: 13,
          }}
        >
          No members match the current filters.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            data={rows}
            margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            barGap={2}
            barCategoryGap="18%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
            <XAxis
              dataKey="source"
              tick={{ fontSize: 12, fill: 'var(--neutral-700)' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'var(--neutral-700)' }}
              tickFormatter={(v) => `${v}%`}
              width={45}
            />
            <Tooltip
              content={<ChurnTooltip />}
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {SERIES.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
      <div style={{ marginTop: 28 }}>
        <CollapsibleNotes
          notes={NOTES}
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

function ChurnTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ChurnRow;
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
        {label}{' '}
        <span style={{ color: 'var(--neutral-400)', fontWeight: 400 }}>
          · overall {row.overall_churn === null ? '—' : `${row.overall_churn.toFixed(1)}%`}{' '}
          · n={row.total}
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto auto auto',
          columnGap: 10,
          rowGap: 2,
          fontSize: 12,
        }}
      >
        {SERIES.map((s) => {
          const churn = row[s.key] as number | null;
          const n = row[s.nKey] as number;
          return (
            <>
              <span key={`${s.key}-label`} style={{ color: s.color }}>
                {s.name}
              </span>
              <span key={`${s.key}-val`} style={{ textAlign: 'right', fontWeight: 600 }}>
                {churn === null ? '—' : `${churn.toFixed(1)}%`}
              </span>
              <span
                key={`${s.key}-n`}
                style={{
                  color: 'var(--neutral-400)',
                  textAlign: 'right',
                  fontWeight: 400,
                }}
              >
                n={n}
              </span>
            </>
          );
        })}
      </div>
    </div>
  );
}
