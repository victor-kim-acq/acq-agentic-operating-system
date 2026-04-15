'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DateRangeFilter from '@/components/ui/DateRangeFilter';

import { Summary } from './types';
import { today, sixWeeksAgo } from './helpers';

import KPISummary from './KPISummary';
import ActivationKPIs from './ActivationKPIs';
import ChatPanel from './ChatPanel';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(sixWeeksAgo);
  const [endDate, setEndDate] = useState(today);

  const [summary, setSummary] = useState<Summary | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const t = Date.now();
      const dp = `&startDate=${startDate}&endDate=${endDate}`;
      const summaryRes = await fetch(`/api/dashboard/summary?t=${t}${dp}`);
      const summaryData = await summaryRes.json();

      setSummary({
        collected_revenue: Number(summaryData.collected_revenue),
        annual_run_rate: Number(summaryData.annual_run_rate),
        churned_revenue: Number(summaryData.churned_revenue),
      });
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
      <div className="max-w-[1600px] mx-auto space-y-10">
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
          onReset={() => { setStartDate(sixWeeksAgo()); setEndDate(today()); }}
        />

        <ChatPanel />

        <KPISummary summary={summary} loading={loading} />

        <ActivationKPIs startDate={startDate} endDate={endDate} />
      </div>
    </div>
  );
}
