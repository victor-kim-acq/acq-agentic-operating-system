'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Line, LabelList,
} from 'recharts';
import { Table2 } from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import GradientBar from '@/components/ui/GradientBar';
import ViewToggle, { ChartView } from '@/components/ui/ViewToggle';
import { RevenueChurnRow, NewDealsRow, SoldCollectedChartRow } from './types';
import { fmt, fmtShort, fmtShortLabel, pctLabel, formatPeriodLabel, ChartTooltip } from './helpers';

interface Props {
  revChurnView: ChartView;
  revChurnData: RevenueChurnRow[];
  onRevChurnViewChange: (v: ChartView) => void;
  newDealsView: ChartView;
  newDealsData: NewDealsRow[];
  onNewDealsViewChange: (v: ChartView) => void;
  soldCollView: ChartView;
  soldCollData: SoldCollectedChartRow[];
  onSoldCollViewChange: (v: ChartView) => void;
}

export default function TopCharts({
  revChurnView, revChurnData, onRevChurnViewChange,
  newDealsView, newDealsData, onNewDealsViewChange,
  soldCollView, soldCollData, onSoldCollViewChange,
}: Props) {
  const [revChurnTable, setRevChurnTable] = useState(false);
  const [newDealsTable, setNewDealsTable] = useState(false);
  const [soldCollTable, setSoldCollTable] = useState(false);

  const thClass = 'text-left text-xs font-medium uppercase tracking-wider pb-2 border-b';
  const tdClass = 'py-2 border-b';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Revenue & Churn */}
      <ChartCard
        title="Revenue & Churn"
        height={500}
        loading={revChurnData.length === 0}
        actions={<>
          <button onClick={() => setRevChurnTable(!revChurnTable)} className="flex items-center gap-1 text-xs transition-colors hover:opacity-70" style={{ color: 'var(--neutral-400)' }}>
            <Table2 className="w-3.5 h-3.5" />{revChurnTable ? 'Chart' : 'Table'}
          </button>
          <ViewToggle view={revChurnView} onChange={onRevChurnViewChange} />
        </>}
      >
        {revChurnTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>
                <th className={thClass} style={{ color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' }}>Period</th>
                <th className={`${thClass} text-right`} style={{ color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' }}>Active MRR</th>
                <th className={`${thClass} text-right`} style={{ color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' }}>Cancelled MRR</th>
                <th className={`${thClass} text-right`} style={{ color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' }}>Churn %</th>
              </tr></thead>
              <tbody>{revChurnData.map((r) => (
                <tr key={r.period} className="hover:bg-[var(--neutral-50)]">
                  <td className={tdClass} style={{ borderColor: 'var(--neutral-100)' }}>{formatPeriodLabel(r.period, revChurnView)}</td>
                  <td className={`${tdClass} text-right`} style={{ borderColor: 'var(--neutral-100)' }}>{fmt(r.active_mrr)}</td>
                  <td className={`${tdClass} text-right`} style={{ borderColor: 'var(--neutral-100)' }}>{fmt(r.cancelled_mrr)}</td>
                  <td className={`${tdClass} text-right`} style={{ borderColor: 'var(--neutral-100)' }}>{r.churn_rate_pct.toFixed(1)}%</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <ComposedChart data={revChurnData.map((r) => ({ ...r, label: formatPeriodLabel(r.period, revChurnView) }))} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => fmtShort(v)} width={70} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={40} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="active_mrr" name="Active MRR" fill="var(--chart-2)" shape={<GradientBar />}>
                <LabelList dataKey="active_mrr" position="top" fontSize={10} fill="var(--neutral-500)" formatter={fmtShortLabel} />
              </Bar>
              <Bar yAxisId="left" dataKey="cancelled_mrr" name="Cancelled MRR" fill="var(--chart-4)" shape={<GradientBar />}>
                <LabelList dataKey="cancelled_mrr" position="top" fontSize={10} fill="var(--neutral-500)" formatter={fmtShortLabel} />
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="churn_rate_pct" name="Churn Rate %" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)', r: 3 }}>
                <LabelList dataKey="churn_rate_pct" position="top" fontSize={10} fill="var(--neutral-500)" formatter={pctLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* New Deals & Revenue */}
      <ChartCard
        title="New Deals & Revenue"
        height={500}
        loading={newDealsData.length === 0}
        actions={<>
          <button onClick={() => setNewDealsTable(!newDealsTable)} className="flex items-center gap-1 text-xs transition-colors hover:opacity-70" style={{ color: 'var(--neutral-400)' }}>
            <Table2 className="w-3.5 h-3.5" />{newDealsTable ? 'Chart' : 'Table'}
          </button>
          <ViewToggle view={newDealsView} onChange={onNewDealsViewChange} />
        </>}
      >
        {newDealsTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>
                <th className={thClass} style={{ color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' }}>Period</th>
                <th className={`${thClass} text-right`} style={{ color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' }}>Deal Count</th>
                <th className={`${thClass} text-right`} style={{ color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' }}>Sold MRR</th>
              </tr></thead>
              <tbody>{newDealsData.map((r) => (
                <tr key={r.period} className="hover:bg-[var(--neutral-50)]">
                  <td className={tdClass} style={{ borderColor: 'var(--neutral-100)' }}>{formatPeriodLabel(r.period, newDealsView)}</td>
                  <td className={`${tdClass} text-right`} style={{ borderColor: 'var(--neutral-100)' }}>{r.deal_count}</td>
                  <td className={`${tdClass} text-right`} style={{ borderColor: 'var(--neutral-100)' }}>{fmt(r.sold_mrr)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <ComposedChart data={newDealsData.map((r) => ({ ...r, label: formatPeriodLabel(r.period, newDealsView) }))} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={35} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => fmtShort(v)} width={70} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="deal_count" name="Deal Count" fill="var(--chart-1)" shape={<GradientBar />}>
                <LabelList dataKey="deal_count" position="top" fontSize={10} fill="var(--neutral-500)" />
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="sold_mrr" name="Sold MRR" stroke="var(--chart-5)" strokeWidth={2} dot={{ fill: 'var(--chart-5)', r: 3 }}>
                <LabelList dataKey="sold_mrr" position="top" fontSize={10} fill="var(--neutral-500)" formatter={fmtShortLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Sold vs Collected Chart */}
      <ChartCard
        title="Sold vs Collected"
        height={500}
        loading={soldCollData.length === 0}
        actions={<>
          <button onClick={() => setSoldCollTable(!soldCollTable)} className="flex items-center gap-1 text-xs transition-colors hover:opacity-70" style={{ color: 'var(--neutral-400)' }}>
            <Table2 className="w-3.5 h-3.5" />{soldCollTable ? 'Chart' : 'Table'}
          </button>
          <ViewToggle view={soldCollView} onChange={onSoldCollViewChange} />
        </>}
      >
        {soldCollTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>
                <th className={thClass} style={{ color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' }}>Period</th>
                <th className={`${thClass} text-right`} style={{ color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' }}>Closed MRR</th>
                <th className={`${thClass} text-right`} style={{ color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' }}>Collected MRR</th>
                <th className={`${thClass} text-right`} style={{ color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' }}>Cancelled MRR</th>
              </tr></thead>
              <tbody>{soldCollData.map((r) => (
                <tr key={r.period} className="hover:bg-[var(--neutral-50)]">
                  <td className={tdClass} style={{ borderColor: 'var(--neutral-100)' }}>{formatPeriodLabel(r.period, soldCollView)}</td>
                  <td className={`${tdClass} text-right`} style={{ borderColor: 'var(--neutral-100)' }}>{fmt(r.closed_mrr)}</td>
                  <td className={`${tdClass} text-right`} style={{ borderColor: 'var(--neutral-100)' }}>{fmt(r.collected_mrr)}</td>
                  <td className={`${tdClass} text-right`} style={{ borderColor: 'var(--neutral-100)' }}>{fmt(r.cancelled_mrr)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={soldCollData.map((r) => ({ ...r, label: formatPeriodLabel(r.period, soldCollView) }))} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => fmtShort(v)} width={70} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="closed_mrr" name="Closed MRR" fill="var(--chart-1)" shape={<GradientBar />}>
                <LabelList dataKey="closed_mrr" position="top" fontSize={10} fill="var(--neutral-500)" formatter={fmtShortLabel} />
              </Bar>
              <Bar dataKey="collected_mrr" name="Collected MRR" fill="var(--chart-2)" shape={<GradientBar />}>
                <LabelList dataKey="collected_mrr" position="top" fontSize={10} fill="var(--neutral-500)" formatter={fmtShortLabel} />
              </Bar>
              <Bar dataKey="cancelled_mrr" name="Cancelled MRR" fill="var(--chart-4)" shape={<GradientBar />}>
                <LabelList dataKey="cancelled_mrr" position="top" fontSize={10} fill="var(--neutral-500)" formatter={fmtShortLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
