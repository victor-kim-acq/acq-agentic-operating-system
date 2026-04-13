'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Table2 } from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import GradientBar from '@/components/ui/GradientBar';
import { SoldRow } from './types';
import { fmt, fmtLabel, ChartTooltip } from './helpers';

interface Props {
  rows: SoldRow[];
  onViewDetail: () => void;
}

export default function SoldVsCollected({ rows, onViewDetail }: Props) {
  return (
    <ChartCard
      title="Sold Revenue vs Collected Revenue"
      height={350}
      actions={
        <button onClick={onViewDetail} className="flex items-center gap-1 text-xs transition-colors hover:opacity-70" style={{ color: 'var(--neutral-400)' }}>
          <Table2 className="w-3.5 h-3.5" /> View Table
        </button>
      }
    >
      {rows.length > 0 && (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={rows} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
            <XAxis dataKey="close_month" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => fmt(v)} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="closed_mrr" name="Closed MRR" fill="var(--chart-1)" shape={<GradientBar />}>
              <LabelList dataKey="closed_mrr" position="top" fontSize={11} fill="var(--neutral-500)" formatter={fmtLabel} />
            </Bar>
            <Bar dataKey="collected_mrr" name="Collected MRR" fill="var(--chart-2)" shape={<GradientBar />}>
              <LabelList dataKey="collected_mrr" position="top" fontSize={11} fill="var(--neutral-500)" formatter={fmtLabel} />
            </Bar>
            <Bar dataKey="cancelled_mrr" name="Cancelled MRR" fill="var(--chart-4)" shape={<GradientBar />}>
              <LabelList dataKey="cancelled_mrr" position="top" fontSize={11} fill="var(--neutral-500)" formatter={fmtLabel} />
            </Bar>
            <Bar dataKey="payment_failed_mrr" name="Payment Failed" fill="var(--chart-3)" shape={<GradientBar />}>
              <LabelList dataKey="payment_failed_mrr" position="top" fontSize={11} fill="var(--neutral-500)" formatter={fmtLabel} />
            </Bar>
            <Bar dataKey="no_billing_mrr" name="No Billing Yet" fill="var(--neutral-400)" shape={<GradientBar />}>
              <LabelList dataKey="no_billing_mrr" position="top" fontSize={11} fill="var(--neutral-500)" formatter={fmtLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
