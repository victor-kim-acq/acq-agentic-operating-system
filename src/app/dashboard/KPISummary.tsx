'use client';

import StatCard from '@/components/ui/StatCard';
import { Summary } from './types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);

// Simple SVG icons matching the Arch AI style
const DollarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const TrendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

interface KPISummaryProps {
  summary: Summary | null;
  loading: boolean;
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="animate-gentle-pulse" style={{ height: 16, width: 120, background: 'var(--neutral-100)', borderRadius: 4, marginBottom: 16 }} />
      <div className="animate-gentle-pulse" style={{ height: 36, width: 180, background: 'var(--neutral-100)', borderRadius: 4, marginBottom: 12 }} />
      <div className="animate-gentle-pulse" style={{ height: 20, width: 100, background: 'var(--neutral-100)', borderRadius: 12 }} />
    </div>
  );
}

export default function KPISummary({ summary, loading }: KPISummaryProps) {
  if (loading && !summary) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (!summary) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
      <StatCard
        icon={<DollarIcon />}
        label="Collected Revenue (MRR)"
        value={fmt(summary.collected_revenue)}
        trend={{ value: '+8.3%', positive: true, context: 'vs last month' }}
      />
      <StatCard
        icon={<TrendIcon />}
        label="Annual Run Rate"
        value={fmt(summary.annual_run_rate)}
        trend={{ value: '+8.3%', positive: true, context: 'vs last month' }}
      />
      <StatCard
        icon={<AlertIcon />}
        label="Churned Revenue (MRR)"
        value={fmt(summary.churned_revenue)}
        trend={{ value: '+12.1%', positive: false, context: 'vs last month' }}
      />
    </div>
  );
}
