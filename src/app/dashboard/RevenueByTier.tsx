'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Table2 } from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import GradientBar from '@/components/ui/GradientBar';
import { TierRow } from './types';
import { fmt, fmtLabel, ChartTooltip } from './helpers';

interface Props {
  rows: TierRow[];
  onViewDetail: () => void;
}

export default function RevenueByTier({ rows, onViewDetail }: Props) {
  const chartData = rows.filter((r) => r.tier !== 'Total');

  return (
    <ChartCard
      title="Revenue by Tier"
      height={300}
      actions={
        <button onClick={onViewDetail} className="flex items-center gap-1 text-xs transition-colors hover:opacity-70" style={{ color: 'var(--neutral-400)' }}>
          <Table2 className="w-3.5 h-3.5" /> View Table
        </button>
      }
    >
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
            <XAxis dataKey="tier" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => fmt(v)} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="usd_mrr" name="USD MRR" fill="var(--chart-1)" shape={<GradientBar />}>
              <LabelList dataKey="usd_mrr" position="top" fontSize={11} fill="var(--neutral-500)" formatter={fmtLabel} />
            </Bar>
            <Bar dataKey="non_usd_mrr" name="Non-USD MRR" fill="var(--chart-2)" shape={<GradientBar />}>
              <LabelList dataKey="non_usd_mrr" position="top" fontSize={11} fill="var(--neutral-500)" formatter={fmtLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
