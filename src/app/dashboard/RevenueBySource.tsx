'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Table2 } from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import { SourceRow } from './types';
import { fmt, fmtLabel, displaySource, ChartTooltip } from './helpers';

interface Props {
  rows: SourceRow[];
  onViewDetail: () => void;
}

export default function RevenueBySource({ rows, onViewDetail }: Props) {
  const chartData = rows
    .filter((r) => r.billing_source !== 'Total')
    .map((r) => ({ ...r, label: displaySource(r.billing_source) }));

  return (
    <ChartCard
      title="Revenue by Billing Source"
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="usd_mrr" name="USD MRR" fill="var(--chart-1)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="usd_mrr" position="top" fontSize={11} formatter={fmtLabel} />
            </Bar>
            <Bar dataKey="non_usd_mrr" name="Non-USD MRR" fill="var(--chart-2)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="non_usd_mrr" position="top" fontSize={11} formatter={fmtLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
