'use client';

import StatCard from '@/components/ui/StatCard';

export interface ActivationData {
  total_acquired: number;
  ai_activation_rate: number;
  ai_activated_count: number;
  community_engaged_count: number;
  community_gap_count: number;
  community_gap_pct: number;
  at_risk_vip_count: number;
  total_vip_count: number;
  fully_activated_rate: number;
  fully_activated_count: number;
  ace_rech_fully_activated_rate: number;
  ace_rech_fully_activated: number;
  ace_rech_total: number;
  total_churned: number;
  churn_rate: number;
}

// Minimal SVG icons
const BrainIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-1.38 3.02A4 4 0 0 1 16 14v1a4 4 0 0 1-4 4" />
    <path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0 1.38 3.02A4 4 0 0 0 8 14v1a4 4 0 0 0 4 4" />
    <path d="M12 2v17" />
  </svg>
);
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
);
const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);
const ZapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  </svg>
);

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
      <div className="animate-gentle-pulse" style={{ height: 36, width: 80, background: 'var(--neutral-100)', borderRadius: 4, marginBottom: 12 }} />
      <div className="animate-gentle-pulse" style={{ height: 20, width: 100, background: 'var(--neutral-100)', borderRadius: 12 }} />
    </div>
  );
}

interface ActivationKPIsProps {
  data: ActivationData | null;
  loading: boolean;
}

export default function ActivationKPIs({ data, loading }: ActivationKPIsProps) {
  if (loading && !data) {
    return (
      <div>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
            Member Activation
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
          Member Activation
        </span>
        <span style={{ fontSize: 12, color: 'var(--neutral-400)' }}>
          {data.total_acquired} members acquired · {data.total_churned} churned ({data.churn_rate}%)
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        <StatCard
          icon={<BrainIcon />}
          label="ACQ AI Activation Rate"
          value={`${data.ai_activation_rate}%`}
          trend={{
            value: `${data.ai_activated_count} / ${data.total_acquired}`,
            positive: data.ai_activation_rate >= 65,
            context: '2+ days in week 1',
          }}
        />
        <StatCard
          icon={<UsersIcon />}
          label="Community Engagement Gap"
          value={`${data.community_gap_count}`}
          trend={{
            value: `${data.community_gap_pct}% not engaged`,
            positive: false,
            context: '<3 actions in 15d',
          }}
        />
        <StatCard
          icon={<ShieldIcon />}
          label="At-Risk VIPs"
          value={`${data.at_risk_vip_count}`}
          trend={
            data.total_vip_count > 0
              ? {
                  value: `of ${data.total_vip_count} VIPs`,
                  positive: data.at_risk_vip_count === 0,
                  context: 'not AI activated',
                }
              : null
          }
        />
        <StatCard
          icon={<SparklesIcon />}
          label="Fully Activated Rate"
          value={`${data.fully_activated_rate}%`}
          trend={{
            value: `${data.fully_activated_count} / ${data.total_acquired}`,
            positive: data.fully_activated_rate >= 50,
            context: 'AI + community',
          }}
        />
        <StatCard
          icon={<ZapIcon />}
          label="ACE/Recharge Activated"
          value={`${data.ace_rech_fully_activated_rate}%`}
          trend={{
            value: `${data.ace_rech_fully_activated} / ${data.ace_rech_total}`,
            positive: data.ace_rech_fully_activated_rate >= 20,
            context: 'AI + community',
          }}
        />
      </div>
    </div>
  );
}
