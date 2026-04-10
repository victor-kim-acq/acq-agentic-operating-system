'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Table2 } from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import { MoMRow } from './types';
import { fmt, fmtLabel, displaySource, ChartTooltip } from './helpers';

interface Props {
  rows: MoMRow[];
  onViewDetail: () => void;
}

export default function MoMRevenue({ rows, onViewDetail }: Props) {
  const pivoted = (() => {
    const monthMap = new Map<string, { month_label: string; sort_month: string; Recharge: number; Skool: number; ACE: number; Total: number }>();
    for (const row of rows) {
      if (!monthMap.has(row.sort_month)) {
        monthMap.set(row.sort_month, { month_label: row.month_label, sort_month: row.sort_month, Recharge: 0, Skool: 0, ACE: 0, Total: 0 });
      }
      const entry = monthMap.get(row.sort_month)!;
      const label = displaySource(row.billing_source) as 'Recharge' | 'Skool' | 'ACE';
      if (label === 'Recharge' || label === 'Skool' || label === 'ACE') {
        entry[label] += row.total_mrr;
      }
      entry.Total += row.total_mrr;
    }
    return Array.from(monthMap.values()).sort((a, b) => a.sort_month.localeCompare(b.sort_month));
  })();

  return (
    <ChartCard
      title="Month-over-Month Revenue by Billing Source"
      height={350}
      actions={
        <button onClick={onViewDetail} className="flex items-center gap-1 text-xs transition-colors hover:opacity-70" style={{ color: 'var(--neutral-400)' }}>
          <Table2 className="w-3.5 h-3.5" /> View Table
        </button>
      }
    >
      {pivoted.length > 0 && (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={pivoted} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" />
            <XAxis dataKey="month_label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Recharge" stackId="a" fill="#84cc16" />
            <Bar dataKey="Skool" stackId="a" fill="var(--chart-3)" />
            <Bar dataKey="ACE" stackId="a" fill="var(--chart-1)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="Total" position="top" fontSize={11} formatter={fmtLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
