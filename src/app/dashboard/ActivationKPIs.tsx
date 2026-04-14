'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { Table2 } from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import GradientBar from '@/components/ui/GradientBar';
import ViewToggle, { ChartView } from '@/components/ui/ViewToggle';
import { pctLabel } from './helpers';

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
  ace_rech_not_activated: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countLabel: any = (v: unknown) => {
  const n = Number(v);
  return n > 0 ? n.toLocaleString() : '';
};

/** Format week label as M/D */
function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

const CHART_HEIGHT = 380;
const NOT_ACTIVATED_COLOR = '#f59e0b'; // amber-500

const thClass = 'text-left text-xs font-medium uppercase tracking-wider pb-2 border-b';
const tdClass = 'py-2 border-b';
const thStyle = { color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' };
const tdStyle = { borderColor: 'var(--neutral-100)' };

interface ActivationKPIsProps {
  startDate: string;
  endDate: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRows(raw: any[]): ActivationRow[] {
  return raw.map((r) => ({
    ...r,
    acquired: Number(r.acquired) || 0,
    churned: Number(r.churned) || 0,
    ai_activated: Number(r.ai_activated) || 0,
    ai_not_activated: Number(r.ai_not_activated) || 0,
    ai_activation_rate: Number(r.ai_activation_rate) || 0,
    community_engaged: Number(r.community_engaged) || 0,
    community_not_engaged: Number(r.community_not_engaged) || 0,
    community_engagement_rate: Number(r.community_engagement_rate) || 0,
    at_risk_vip: Number(r.at_risk_vip) || 0,
    total_vip: Number(r.total_vip) || 0,
    fully_activated: Number(r.fully_activated) || 0,
    fully_activated_rate: Number(r.fully_activated_rate) || 0,
    ace_rech_fully_activated: Number(r.ace_rech_fully_activated) || 0,
    ace_rech_total: Number(r.ace_rech_total) || 0,
    ace_rech_fully_activated_rate: Number(r.ace_rech_fully_activated_rate) || 0,
    ace_rech_not_activated: (Number(r.ace_rech_total) || 0) - (Number(r.ace_rech_fully_activated) || 0),
  }));
}

function useActivationData(view: ChartView, startDate: string, endDate: string) {
  const [rows, setRows] = useState<ActivationRow[]>([]);
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/dashboard/activation-kpis?view=${view}&startDate=${startDate}&endDate=${endDate}&t=${Date.now()}`
      );
      const data = await res.json();
      setRows(parseRows(data.rows ?? []));
    } catch (err) {
      console.error('Failed to fetch activation-kpis:', err);
    }
  }, [view, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return rows;
}

function prepareData(rows: ActivationRow[], view: ChartView) {
  return rows.map((r) => ({
    ...r,
    label: view === 'wow' ? formatWeekLabel(r.period_key ?? r.period) : r.period,
  }));
}

export default function ActivationKPIs({ startDate, endDate }: ActivationKPIsProps) {
  const [aiView, setAiView] = useState<ChartView>('mom');
  const [commView, setCommView] = useState<ChartView>('mom');
  const [vipView, setVipView] = useState<ChartView>('mom');
  const [aceView, setAceView] = useState<ChartView>('mom');

  const [aiTable, setAiTable] = useState(false);
  const [commTable, setCommTable] = useState(false);
  const [vipTable, setVipTable] = useState(false);
  const [aceTable, setAceTable] = useState(false);

  const aiRows = useActivationData(aiView, startDate, endDate);
  const commRows = useActivationData(commView, startDate, endDate);
  const vipRows = useActivationData(vipView, startDate, endDate);
  const aceRows = useActivationData(aceView, startDate, endDate);

  const aiData = prepareData(aiRows, aiView);
  const commData = prepareData(commRows, commView);
  const vipData = prepareData(vipRows, vipView);
  const aceData = prepareData(aceRows, aceView);

  const actions = (showTable: boolean, toggleTable: () => void, view: ChartView, onViewChange: (v: ChartView) => void) => (
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
        loading={aiData.length === 0}
        actions={actions(aiTable, () => setAiTable(!aiTable), aiView, setAiView)}
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
                {aiData.map((r) => (
                  <tr key={r.period_key} className="hover:bg-[var(--neutral-50)]">
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
            <ComposedChart data={aiData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
              <Tooltip content={<ActivationTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="ai_activated" name="Activated"fill="var(--chart-2)" shape={<GradientBar />}>
                <LabelList dataKey="ai_activated" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Bar yAxisId="left" dataKey="ai_not_activated" name="Not Activated"fill={NOT_ACTIVATED_COLOR} shape={<GradientBar />}>
                <LabelList dataKey="ai_not_activated" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
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
        loading={commData.length === 0}
        actions={actions(commTable, () => setCommTable(!commTable), commView, setCommView)}
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
                {commData.map((r) => (
                  <tr key={r.period_key} className="hover:bg-[var(--neutral-50)]">
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
            <ComposedChart data={commData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
              <Tooltip content={<ActivationTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="community_engaged" name="Engaged 3+"fill="var(--chart-1)" shape={<GradientBar />}>
                <LabelList dataKey="community_engaged" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Bar yAxisId="left" dataKey="community_not_engaged" name="Not Engaged"fill={NOT_ACTIVATED_COLOR} shape={<GradientBar />}>
                <LabelList dataKey="community_not_engaged" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
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
        loading={vipData.length === 0}
        actions={actions(vipTable, () => setVipTable(!vipTable), vipView, setVipView)}
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
                {vipData.map((r) => (
                  <tr key={r.period_key} className="hover:bg-[var(--neutral-50)]">
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
            <ComposedChart data={vipData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
              <Tooltip content={<ActivationTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="at_risk_vip" name="At-Risk VIPs" fill={NOT_ACTIVATED_COLOR} shape={<GradientBar />}>
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
        loading={aceData.length === 0}
        actions={actions(aceTable, () => setAceTable(!aceTable), aceView, setAceView)}
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
                {aceData.map((r) => (
                  <tr key={r.period_key} className="hover:bg-[var(--neutral-50)]">
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
            <ComposedChart data={aceData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} width={40} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} tickFormatter={(v) => `${v}%`} width={45} domain={[0, 100]} />
              <Tooltip content={<ActivationTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="ace_rech_fully_activated" name="Fully Activated"fill="var(--chart-5)" shape={<GradientBar />}>
                <LabelList dataKey="ace_rech_fully_activated" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
              </Bar>
              <Bar yAxisId="left" dataKey="ace_rech_not_activated" name="Not Fully Activated"fill={NOT_ACTIVATED_COLOR} shape={<GradientBar />}>
                <LabelList dataKey="ace_rech_not_activated" position="top" fontSize={10} fill="var(--neutral-500)" formatter={countLabel} />
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
