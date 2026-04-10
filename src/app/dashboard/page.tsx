'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import type { ChartView } from '@/components/ui/ViewToggle';
import PageHeader from '@/components/ui/PageHeader';
import DateRangeFilter from '@/components/ui/DateRangeFilter';

import {
  Summary, TierRow, SourceRow, MoMRow, SoldRow, ChurnRow,
  RevenueChurnRow, NewDealsRow, SoldCollectedChartRow,
} from './types';
import { today, firstOfMonth } from './helpers';

import KPISummary from './KPISummary';
import TopCharts from './TopCharts';
import RevenueByTier from './RevenueByTier';
import RevenueBySource from './RevenueBySource';
import MoMRevenue from './MoMRevenue';
import SoldVsCollected from './SoldVsCollected';
import ChurnCohort from './ChurnCohort';
import ChatPanel from './ChatPanel';
import DetailModal from './DetailModal';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [tierRows, setTierRows] = useState<TierRow[]>([]);
  const [sourceRows, setSourceRows] = useState<SourceRow[]>([]);
  const [momRows, setMoMRows] = useState<MoMRow[]>([]);
  const [soldRows, setSoldRows] = useState<SoldRow[]>([]);
  const [churnRows, setChurnRows] = useState<ChurnRow[]>([]);

  const [detailModal, setDetailModal] = useState<{ title: string; panel: string } | null>(null);

  /* ---- Top chart state ---- */
  const [revChurnView, setRevChurnView] = useState<ChartView>('mom');
  const [revChurnData, setRevChurnData] = useState<RevenueChurnRow[]>([]);
  const [newDealsView, setNewDealsView] = useState<ChartView>('mom');
  const [newDealsData, setNewDealsData] = useState<NewDealsRow[]>([]);
  const [soldCollView, setSoldCollView] = useState<ChartView>('mom');
  const [soldCollData, setSoldCollData] = useState<SoldCollectedChartRow[]>([]);

  const fetchChart = useCallback(async (endpoint: string, view: ChartView, sd: string, ed: string) => {
    try {
      const res = await fetch(`/api/dashboard/${endpoint}?view=${view}&startDate=${sd}&endDate=${ed}&t=${Date.now()}`);
      const data = await res.json();
      return data.rows ?? [];
    } catch (err) {
      console.error(`Failed to fetch ${endpoint}:`, err);
      return [];
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchChart('revenue-churn', revChurnView, startDate, endDate).then((rows: any[]) =>
      setRevChurnData(rows.map((r: any) => ({ period: r.period, active_mrr: Number(r.active_mrr) || 0, cancelled_mrr: Number(r.cancelled_mrr) || 0, churn_rate_pct: Number(r.churn_rate_pct) || 0 })))
    );
  }, [revChurnView, startDate, endDate, fetchChart]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchChart('new-deals', newDealsView, startDate, endDate).then((rows: any[]) =>
      setNewDealsData(rows.map((r: any) => ({ period: r.period, deal_count: Number(r.deal_count) || 0, sold_mrr: Number(r.sold_mrr) || 0 })))
    );
  }, [newDealsView, startDate, endDate, fetchChart]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchChart('sold-collected-chart', soldCollView, startDate, endDate).then((rows: any[]) =>
      setSoldCollData(rows.map((r: any) => ({ period: r.period, closed_mrr: Number(r.closed_mrr) || 0, collected_mrr: Number(r.collected_mrr) || 0, cancelled_mrr: Number(r.cancelled_mrr) || 0 })))
    );
  }, [soldCollView, startDate, endDate, fetchChart]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const t = Date.now();
      const dp = `&startDate=${startDate}&endDate=${endDate}`;
      const [summaryRes, tierRes, sourceRes, momRes, soldRes, churnRes] = await Promise.all([
        fetch(`/api/dashboard/summary?t=${t}${dp}`),
        fetch(`/api/dashboard/revenue-by-tier?t=${t}${dp}`),
        fetch(`/api/dashboard/revenue-by-source?t=${t}${dp}`),
        fetch(`/api/dashboard/mom-revenue?t=${t}${dp}`),
        fetch(`/api/dashboard/sold-vs-collected?t=${t}${dp}`),
        fetch(`/api/dashboard/churn-cohort?t=${t}${dp}`),
      ]);
      const [summaryData, tierData, sourceData, momData, soldData, churnData] = await Promise.all([
        summaryRes.json(), tierRes.json(), sourceRes.json(), momRes.json(), soldRes.json(), churnRes.json(),
      ]);

      setSummary({
        collected_revenue: Number(summaryData.collected_revenue),
        annual_run_rate: Number(summaryData.annual_run_rate),
        churned_revenue: Number(summaryData.churned_revenue),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTierRows((tierData.rows ?? []).map((r: any) => ({ ...r, usd_mrr: Number(r.usd_mrr), non_usd_mrr: Number(r.non_usd_mrr), total_mrr: Number(r.total_mrr), pct_of_total: Number(r.pct_of_total) })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSourceRows((sourceData.rows ?? []).map((r: any) => ({ ...r, usd_mrr: Number(r.usd_mrr), non_usd_mrr: Number(r.non_usd_mrr), total_mrr: Number(r.total_mrr), pct_of_total: Number(r.pct_of_total) })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMoMRows((momData.rows ?? []).map((r: any) => ({ ...r, total_mrr: Number(r.total_mrr) })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSoldRows((soldData.rows ?? []).map((r: any) => ({ ...r, closed_mrr: Number(r.closed_mrr), collected_mrr: Number(r.collected_mrr), cancelled_mrr: Number(r.cancelled_mrr), payment_failed_mrr: Number(r.payment_failed_mrr), no_billing_mrr: Number(r.no_billing_mrr), deal_count: Number(r.deal_count) })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setChurnRows((churnData.rows ?? []).map((r: any) => ({ ...r, active_mrr: Number(r.active_mrr), cancellation_mrr: Number(r.cancellation_mrr), churn_rate_pct: Number(r.churn_rate_pct) })));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--page-bg)' }}>
      <div className="max-w-[1600px] mx-auto space-y-6">
        <PageHeader
          title="Dashboard"
          actions={
            <>
              {lastUpdated && <span className="text-xs" style={{ color: 'var(--neutral-400)' }}>Last updated: {lastUpdated}</span>}
              <button onClick={fetchAll} className="p-2 rounded-lg transition-colors hover:bg-[var(--neutral-100)]" title="Refresh">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--neutral-600)' }} />
              </button>
            </>
          }
        />

        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
          onReset={() => { setStartDate(firstOfMonth()); setEndDate(today()); }}
        />

        <ChatPanel />

        <KPISummary summary={summary} loading={loading} />

        {!loading || summary ? (
          <>
            <TopCharts
              revChurnView={revChurnView} revChurnData={revChurnData} onRevChurnViewChange={setRevChurnView}
              newDealsView={newDealsView} newDealsData={newDealsData} onNewDealsViewChange={setNewDealsView}
              soldCollView={soldCollView} soldCollData={soldCollData} onSoldCollViewChange={setSoldCollView}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RevenueByTier rows={tierRows} onViewDetail={() => setDetailModal({ title: 'Revenue by Tier \u2014 Detail', panel: 'revenue-by-tier' })} />
              <RevenueBySource rows={sourceRows} onViewDetail={() => setDetailModal({ title: 'Revenue by Billing Source \u2014 Detail', panel: 'revenue-by-source' })} />
            </div>

            <MoMRevenue rows={momRows} onViewDetail={() => setDetailModal({ title: 'MoM Revenue \u2014 Detail', panel: 'mom-revenue' })} />
            <SoldVsCollected rows={soldRows} onViewDetail={() => setDetailModal({ title: 'Sold Revenue vs Collected \u2014 Detail', panel: 'sold-vs-collected' })} />
            <ChurnCohort rows={churnRows} onViewDetail={() => setDetailModal({ title: 'Churn Cohort \u2014 Detail', panel: 'churn-cohort' })} />
          </>
        ) : null}
      </div>

      <DetailModal
        open={detailModal !== null}
        onClose={() => setDetailModal(null)}
        title={detailModal?.title ?? ''}
        panel={detailModal?.panel ?? ''}
      />
    </div>
  );
}
