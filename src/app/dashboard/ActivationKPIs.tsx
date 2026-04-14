'use client';

import { useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { Table2 } from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import GradientBar from '@/components/ui/GradientBar';
import ViewToggle, { ChartView } from '@/components/ui/ViewToggle';
import { pctLabel, ChartTooltip, formatPeriodLabel } from './helpers';

export interface ActivationRow {
  period: string;
  period_key: string;
  acquired: number;
  churned: number;
  ai_activated: number;
  ai_not_activated: number;
  ai_activation_rate: number;
  community_engaged: number;
  community_not_engaged: number;
  community_engagement_rate: number;
  at_risk_vip: number;
  total_vip: number;
  fully_activated: number;
  fully_activated_rate: number;
  ace_rech_fully_activated: number;
  ace_rech_total: number;
  ace_rech_fully_activated_rate: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countLabel: any = (v: unknown) => {
  const n = Number(v);
  return n > 0 ? n.toLocaleString() : '';
};

interface ActivationKPIsProps {
  rows: ActivationRow[];
  view: ChartView;
  onViewChange: (v: ChartView) => void;
}

const CHART_HEIGHT = 380;

const thClass = 'text-left text-xs font-medium uppercase tracking-wider pb-2 border-b';
const tdClass = 'py-2 border-b';
const thStyle = { color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' };
const tdStyle = { borderColor: 'var(--neutral-100)' };

export default function ActivationKPIs({ rows, view, onViewChange }: ActivationKPIsProps) {
  const [aiTable, setAiTable] = useState(false);
  const [commTable, setCommTable] = useState(false);
  const [vipTable, setVipTable] = useState(false);
  const [aceTable, setAceTable] = useState(false);

  const data = rows.map((r) => ({
    ...r,
    label: view === 'wow' ? formatPeriodLabel(r.period_key ?? r.period, 'wow') : r.period,
  }));

  const loading = rows.length === 0;

  const chartActions = (showTable: boolean, toggleTable: () => void) => (
    <>
      <button
        onClick={toggleTable}
        className="flex items-center gap-1 text-xs transition-colors hover:opacity-70"
        style={{ color: 'var(--neutral-400)' }}
      >
        <Table2 className="w-3.5 h-3.5" />{showTable ? 'Chart' : 'Table'}
      </button>
      <ViewToggle view={view} onChange={onViewChange} />
    </>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 1. ACQ AI Activation Rate */}
      <ChartCard
        title="ACQ AI Activation Rate"
        subtitle="Members with 2+ active days in first 7 days"
        height={CHART_HEIGHT}
        loading={loading}
        actions={chartActions(aiTable, () => setAiTable(!aiTable))}
      >
        {aiTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thClass} style={thStyle}>Cohort</th>
                  <th className={`${thClass} text-right`} style={thStyle}>Acquired</th>
                  <th className={`${thClass} text-right`} style={thStyle}>Activated</th>
                  <th className={`${thClass} text-right`} style={thStyle}>Not Activated</th>
                  <th className={`${thClass} text-right`} style={thStyle}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.period} className="hover:bg-[var(--neutral-50)]">
                    <td className={tdClass} style={tdStyle}>{r.label}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.acquired}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.ai_activated}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.ai_not_activated}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.ai_activation_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
              <Tooltip content={<ActivationTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="ai_activated" name="Activated" stackId="a" fill="var(--chart-2)" shape={<GradientBar />}>
                <LabelList dataKey="ai_activated" position="inside" fontSize={10} fill="var(--neutral-700)" formatter={countLabel} />
              </Bar>
              <Bar yAxisId="left" dataKey="ai_not_activated" name="Not Activated" stackId="a" fill="var(--neutral-200)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="ai_not_activated" position="inside" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="ai_activation_rate" name="Activation Rate %" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)', r: 3 }}>
                <LabelList dataKey="ai_activation_rate" position="top" fontSize={10} fill="var(--neutral-500)" formatter={pctLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 2. Community Engagement Rate */}
      <ChartCard
        title="Community Engagement Rate"
        subtitle="Members with 3+ posts/comments in first 15 days"
        height={CHART_HEIGHT}
        loading={loading}
        actions={chartActions(commTable, () => setCommTable(!commTable))}
      >
        {commTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thClass} style={thStyle}>Cohort</th>
                  <th className={`${thClass} text-right`} style={thStyle}>Acquired</th>
                  <th className={`${thClass} text-right`} style={thStyle}>Engaged</th>
                  <th className={`${thClass} text-right`} style={thStyle}>Not Engaged</th>
                  <th className={`${thClass} text-right`} style={thStyle}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.period} className="hover:bg-[var(--neutral-50)]">
                    <td className={tdClass} style={tdStyle}>{r.label}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.acquired}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.community_engaged}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.community_not_engaged}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.community_engagement_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
              <Tooltip content={<ActivationTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="community_engaged" name="Engaged 3+" stackId="a" fill="var(--chart-1)" shape={<GradientBar />}>
                <LabelList dataKey="community_engaged" position="inside" fontSize={10} fill="var(--neutral-700)" formatter={countLabel} />
              </Bar>
              <Bar yAxisId="left" dataKey="community_not_engaged" name="Not Engaged" stackId="a" fill="var(--neutral-200)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="community_not_engaged" position="inside" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="community_engagement_rate" name="Engagement Rate %" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)', r: 3 }}>
                <LabelList dataKey="community_engagement_rate" position="top" fontSize={10} fill="var(--neutral-500)" formatter={pctLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 3. At-Risk VIPs */}
      <ChartCard
        title="At-Risk VIPs"
        subtitle="VIP members not activated on ACQ AI"
        height={CHART_HEIGHT}
        loading={loading}
        actions={chartActions(vipTable, () => setVipTable(!vipTable))}
      >
        {vipTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thClass} style={thStyle}>Cohort</th>
                  <th className={`${thClass} text-right`} style={thStyle}>Total VIPs</th>
                  <th className={`${thClass} text-right`} style={thStyle}>At Risk</th>
                  <th className={`${thClass} text-right`} style={thStyle}>Fully Activated</th>
                  <th className={`${thClass} text-right`} style={thStyle}>Full Act. Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.period} className="hover:bg-[var(--neutral-50)]">
                    <td className={tdClass} style={tdStyle}>{r.label}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.total_vip}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.at_risk_vip}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.fully_activated}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.fully_activated_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
              <Tooltip content={<ActivationTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="at_risk_vip" name="At-Risk VIPs" fill="var(--chart-4)" shape={<GradientBar />}>
                <LabelList dataKey="at_risk_vip" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Bar yAxisId="left" dataKey="fully_activated" name="Fully Activated" fill="var(--chart-2)" shape={<GradientBar />}>
                <LabelList dataKey="fully_activated" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="fully_activated_rate" name="Fully Activated Rate %" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)', r: 3 }}>
                <LabelList dataKey="fully_activated_rate" position="top" fontSize={10} fill="var(--neutral-500)" formatter={pctLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 4. ACE/Recharge Activation */}
      <ChartCard
        title="ACE/Recharge Activation"
        subtitle="Fully activated (AI + community) for ACE & Recharge sources"
        height={CHART_HEIGHT}
        loading={loading}
        actions={chartActions(aceTable, () => setAceTable(!aceTable))}
      >
        {aceTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thClass} style={thStyle}>Cohort</th>
                  <th className={`${thClass} text-right`} style={thStyle}>ACE/Rech Total</th>
                  <th className={`${thClass} text-right`} style={thStyle}>Fully Activated</th>
                  <th className={`${thClass} text-right`} style={thStyle}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.period} className="hover:bg-[var(--neutral-50)]">
                    <td className={tdClass} style={tdStyle}>{r.label}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.ace_rech_total}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.ace_rech_fully_activated}</td>
                    <td className={`${tdClass} text-right`} style={tdStyle}>{r.ace_rech_fully_activated_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
              <Tooltip content={<ActivationTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="ace_rech_fully_activated" name="Fully Activated" stackId="a" fill="var(--chart-5)" shape={<GradientBar />}>
                <LabelList dataKey="ace_rech_fully_activated" position="inside" fontSize={10} fill="var(--neutral-700)" formatter={countLabel} />
              </Bar>
              <Bar yAxisId="left" dataKey="ace_rech_not_activated" name="Not Fully Activated" stackId="a" fill="var(--neutral-200)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="ace_rech_not_activated" position="inside" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="ace_rech_fully_activated_rate" name="Activation Rate %" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)', r: 3 }}>
                <LabelList dataKey="ace_rech_fully_activated_rate" position="top" fontSize={10} fill="var(--neutral-500)" formatter={pctLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ActivationTooltip = ({ active, payload, label }: any) => {
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
          {entry.name}: {entry.name.includes('%') ? `${Number(entry.value).toFixed(1)}%` : Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};
