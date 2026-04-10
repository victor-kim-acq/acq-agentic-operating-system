'use client';

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Table2 } from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import { ChurnRow } from './types';
import { fmt, fmtLabel, pctLabel, ChartTooltip } from './helpers';

interface Props {
  rows: ChurnRow[];
  onViewDetail: () => void;
}

export default function ChurnCohort({ rows, onViewDetail }: Props) {
  return (
    <ChartCard
      title="Churn Rate by Deal Close Month"
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
            <XAxis dataKey="close_month_cohort" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => fmt(v)} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="active_mrr" name="Active MRR" fill="var(--chart-1)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="active_mrr" position="top" fontSize={11} fill="var(--neutral-500)" formatter={fmtLabel} />
            </Bar>
            <Bar yAxisId="left" dataKey="cancellation_mrr" name="Cancellation MRR" fill="var(--chart-4)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="cancellation_mrr" position="top" fontSize={11} fill="var(--neutral-500)" formatter={fmtLabel} />
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
