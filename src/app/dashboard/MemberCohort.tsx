'use client';

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Table2 } from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import GradientBar from '@/components/ui/GradientBar';
import { MemberCohortRow } from './types';
import { pctLabel, ChartTooltip } from './helpers';

interface Props {
  rows: MemberCohortRow[];
  onViewDetail: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countLabel: any = (v: unknown) => { const n = Number(v); return n > 0 ? n.toLocaleString() : ''; };

export default function MemberCohort({ rows, onViewDetail }: Props) {
  return (
    <ChartCard
      title="Member Acquisition & Churn by Cohort Month"
      height={350}
      actions={
        <button onClick={onViewDetail} className="flex items-center gap-1 text-xs transition-colors hover:opacity-70" style={{ color: 'var(--neutral-400)' }}>
          <Table2 className="w-3.5 h-3.5" /> View Table
        </button>
      }
    >
      {rows.length > 0 && (
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={rows} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
            <XAxis dataKey="cohort_month" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<MemberCohortTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="acquired" name="Acquired" fill="var(--chart-1)" shape={<GradientBar />}>
              <LabelList dataKey="acquired" position="top" fontSize={11} fill="var(--neutral-500)" formatter={countLabel} />
            </Bar>
            <Bar yAxisId="left" dataKey="churned" name="Churned" fill="var(--chart-4)" shape={<GradientBar />}>
              <LabelList dataKey="churned" position="top" fontSize={11} fill="var(--neutral-500)" formatter={countLabel} />
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="churn_rate_pct" name="Churn Rate %" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)', r: 4 }}>
              <LabelList dataKey="churn_rate_pct" position="top" fontSize={11} fill="var(--neutral-500)" formatter={pctLabel} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MemberCohortTooltip = ({ active, payload, label }: any) => {
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
          {entry.name}: {entry.name === 'Churn Rate %' ? `${Number(entry.value).toFixed(1)}%` : Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};
