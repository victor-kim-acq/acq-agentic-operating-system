'use client';

import StatCard from '@/components/ui/StatCard';
import { Summary } from './types';
import { fmt } from './helpers';

interface KPISummaryProps {
  summary: Summary | null;
  loading: boolean;
}

function SkeletonStat() {
  return (
    <div
      className="rounded-xl border p-6 space-y-3"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow-md)' }}
    >
      <div className="animate-pulse rounded h-4 w-24" style={{ background: 'var(--neutral-200)' }} />
      <div className="animate-pulse rounded h-9 w-40" style={{ background: 'var(--neutral-200)' }} />
    </div>
  );
}

export default function KPISummary({ summary, loading }: KPISummaryProps) {
  if (loading && !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
    );
  }
  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Collected Revenue (MRR)"
        value={fmt(summary.collected_revenue)}
        accentColor="var(--color-success)"
      />
      <StatCard
        label="Annual Run Rate"
        value={fmt(summary.annual_run_rate)}
        accentColor="var(--chart-1)"
      />
      <StatCard
        label="Churned Revenue (MRR)"
        value={fmt(summary.churned_revenue)}
        accentColor="var(--color-danger)"
      />
    </div>
  );
}
