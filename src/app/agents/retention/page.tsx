'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import RetentionArtifact, { CohortResponse } from './RetentionArtifact';

const METRIC_DEFINITIONS: { label: string; description: string }[] = [
  {
    label: 'AI Activation',
    description: '2+ days using ACQ AI in their first 7 days',
  },
  {
    label: 'Community Engagement',
    description: '3+ posts or comments in first 15 days',
  },
  {
    label: 'Both Signals',
    description: 'Hit both AI activation and community engagement',
  },
  {
    label: 'Billing Source',
    description:
      'How the member came in — Skool, ACE, or Recharge. Skool-native members behave differently; signals predict churn for ACE/Recharge but not for Skool.',
  },
  {
    label: 'Churn Rate',
    description: 'Cancelled members ÷ total cohort members × 100',
  },
  {
    label: 'Verified Revenue',
    description:
      'HubSpot revenue_verification_status = Verification Successful',
  },
];

const cardStyle: React.CSSProperties = {
  background: 'var(--card-bg)',
  borderColor: 'var(--card-border)',
  boxShadow: 'var(--shadow-sm)',
};

const COHORT_START = '2026-03-01';
const COHORT_END = '2026-03-31';
const COHORT_LOCKED = '2026-04-18';

function formatLockedDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : ''));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function SkeletonArtifact() {
  return (
    <section
      className="rounded-2xl border p-8 mb-4 relative overflow-hidden"
      style={{ ...cardStyle, minHeight: 480 }}
    >
      <div
        className="animate-gentle-pulse rounded-lg"
        style={{
          height: 16,
          width: 160,
          background: 'var(--neutral-100)',
          marginBottom: 20,
        }}
      />
      <div
        className="animate-gentle-pulse rounded-lg"
        style={{
          height: 32,
          width: 280,
          background: 'var(--neutral-100)',
          marginBottom: 28,
        }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 12,
          marginBottom: 32,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-gentle-pulse rounded-lg"
            style={{ height: 96, background: 'var(--neutral-100)' }}
          />
        ))}
      </div>
      <div
        className="animate-gentle-pulse rounded-lg"
        style={{
          height: 220,
          background: 'var(--neutral-100)',
          marginBottom: 16,
        }}
      />
      <p
        style={{
          fontSize: 13,
          color: 'var(--neutral-400)',
          textAlign: 'center',
          marginTop: 24,
        }}
      >
        Loading cohort analysis…
      </p>
    </section>
  );
}

export default function RetentionAgentPage() {
  const [data, setData] = useState<CohortResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [definitionsOpen, setDefinitionsOpen] = useState(false);

  const fetchCohort = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/agents/retention/cohort?startDate=${COHORT_START}&endDate=${COHORT_END}&lockedDate=${COHORT_LOCKED}&t=${Date.now()}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const json = (await res.json()) as CohortResponse;
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCohort();
  }, [fetchCohort]);

  const subtitle = data
    ? `March 2026 cohort · n=${data.meta.total_members} · queried ${
        formatLockedDate(data.meta.locked_date) ?? 'today'
      }`
    : 'Loading cohort…';

  return (
    <main className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link
          href="/agents"
          className="text-sm transition-colors mb-4 inline-block"
          style={{ color: 'var(--neutral-500)' }}
        >
          ← Back to Agents
        </Link>

        <div className="mb-6">
          <PageHeader
            title="Retention & Activation"
            subtitle={subtitle}
            actions={
              <>
                {lastUpdated && (
                  <span
                    className="text-xs"
                    style={{ color: 'var(--neutral-400)' }}
                  >
                    Last updated: {lastUpdated}
                  </span>
                )}
                <button
                  onClick={fetchCohort}
                  className="p-2 rounded-lg transition-colors hover:bg-[var(--neutral-100)]"
                  title="Refresh"
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                    style={{ color: 'var(--neutral-600)' }}
                  />
                </button>
              </>
            }
          />
        </div>

        {/* Artifact area */}
        {error ? (
          <section
            className="rounded-2xl border p-6 mb-8"
            style={{
              ...cardStyle,
              borderColor: 'var(--color-danger, #ef4444)',
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--color-danger, #ef4444)' }}>
              Failed to load cohort: {error}
            </div>
          </section>
        ) : loading && !data ? (
          <SkeletonArtifact />
        ) : data ? (
          <div style={{ marginBottom: 24 }}>
            <RetentionArtifact data={data} />
          </div>
        ) : null}

        {/* Metric definitions */}
        <section style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setDefinitionsOpen(!definitionsOpen)}
            className="flex items-center gap-2 mb-3 text-sm font-semibold transition-colors"
            style={{ color: 'var(--neutral-700)' }}
          >
            {definitionsOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Metric definitions
          </button>
          {definitionsOpen && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 16,
              }}
            >
              {METRIC_DEFINITIONS.map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border p-5"
                  style={cardStyle}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--neutral-900)',
                      marginBottom: 6,
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--neutral-500)',
                      lineHeight: 1.5,
                    }}
                  >
                    {m.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Chat placeholder */}
        <section className="rounded-2xl border p-5" style={cardStyle}>
          <div
            style={{
              fontSize: 13,
              color: 'var(--neutral-500)',
              marginBottom: 10,
            }}
          >
            Ask questions about this cohort →
          </div>
          <input
            type="text"
            disabled
            placeholder="Chat coming soon…"
            className="w-full px-4 py-2.5 text-sm border rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              borderColor: 'var(--neutral-200)',
              background: 'var(--neutral-50)',
              color: 'var(--neutral-500)',
            }}
          />
        </section>
      </div>
    </main>
  );
}
