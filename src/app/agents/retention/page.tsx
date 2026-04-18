'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import RetentionArtifact, { CohortResponse } from './RetentionArtifact';
import ChatPanel from './ChatPanel';

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

const DEFAULT_START = '2026-03-01';
const DEFAULT_END = '2026-03-31';
const DEFAULT_LOCKED = '2026-04-18';

function formatFullDate(iso: string | null): string | null {
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
      className="rounded-2xl border p-6 sm:p-8 mb-4 relative overflow-hidden"
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
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
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
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);
  const [lockedDate, setLockedDate] = useState(DEFAULT_LOCKED);

  const [data, setData] = useState<CohortResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [definitionsOpen, setDefinitionsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Bump to remount ChatPanel (clearing its history) on refresh / date change
  const [chatResetKey, setChatResetKey] = useState(0);

  // Draft values used by the inline picker before the user commits
  const [draftStart, setDraftStart] = useState(DEFAULT_START);
  const [draftEnd, setDraftEnd] = useState(DEFAULT_END);
  const [draftLocked, setDraftLocked] = useState(DEFAULT_LOCKED);

  const fetchCohort = useCallback(
    async (sd: string, ed: string, ld: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/agents/retention/cohort?startDate=${sd}&endDate=${ed}&lockedDate=${ld}&t=${Date.now()}`
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
    },
    []
  );

  const hasAutoLoaded = useRef(false);
  useEffect(() => {
    if (hasAutoLoaded.current) return;
    hasAutoLoaded.current = true;
    fetchCohort(startDate, endDate, lockedDate);
  }, [fetchCohort, startDate, endDate, lockedDate]);

  const handleRefresh = () => {
    setChatResetKey((k) => k + 1);
    fetchCohort(startDate, endDate, lockedDate);
  };

  const handleApplyDates = () => {
    setStartDate(draftStart);
    setEndDate(draftEnd);
    setLockedDate(draftLocked);
    setChatResetKey((k) => k + 1);
    setPickerOpen(false);
    fetchCohort(draftStart, draftEnd, draftLocked);
  };

  const snapshotDisplay = data
    ? formatFullDate(
        (data.meta.locked_date ?? data.meta.queried_at).slice(0, 10)
      )
    : null;
  const snapshotLabel = data?.meta.locked_date ? 'locked as of' : 'queried';

  return (
    <main className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
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
            actions={
              <>
                {lastUpdated && (
                  <span
                    className="text-xs hidden sm:inline"
                    style={{ color: 'var(--neutral-400)' }}
                  >
                    Last updated: {lastUpdated}
                  </span>
                )}
                <button
                  onClick={handleRefresh}
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
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: 'var(--neutral-400)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>
              {data
                ? `${formatFullDate(startDate)} – ${formatFullDate(endDate)} cohort`
                : 'Loading cohort…'}
            </span>
            {data && (
              <>
                <span aria-hidden>·</span>
                <span>n={data.meta.total_members}</span>
                <span aria-hidden>·</span>
                <button
                  type="button"
                  onClick={() => {
                    setDraftStart(startDate);
                    setDraftEnd(endDate);
                    setDraftLocked(lockedDate);
                    setPickerOpen((o) => !o);
                  }}
                  className="underline hover:opacity-80 decoration-dotted underline-offset-2"
                  style={{ color: 'var(--neutral-500)' }}
                >
                  {snapshotLabel} {snapshotDisplay ?? 'today'}
                </button>
              </>
            )}
          </div>
          {pickerOpen && (
            <div
              className="rounded-2xl border mt-3 p-4"
              style={{ ...cardStyle }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--neutral-500)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Start date
                  </span>
                  <input
                    type="date"
                    value={draftStart}
                    onChange={(e) => setDraftStart(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--neutral-200)' }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--neutral-500)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    End date
                  </span>
                  <input
                    type="date"
                    value={draftEnd}
                    onChange={(e) => setDraftEnd(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--neutral-200)' }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--neutral-500)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Locked-as-of
                  </span>
                  <input
                    type="date"
                    value={draftLocked}
                    onChange={(e) => setDraftLocked(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--neutral-200)' }}
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="text-xs px-3 py-1.5 rounded-md border font-medium"
                  style={{
                    borderColor: 'var(--neutral-200)',
                    color: 'var(--neutral-700)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyDates}
                  disabled={
                    !draftStart ||
                    !draftEnd ||
                    !draftLocked ||
                    draftStart > draftEnd
                  }
                  className="text-xs px-3 py-1.5 rounded-md text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'var(--brand-primary, #7c3aed)' }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Artifact area */}
        {error ? (
          <section
            className="rounded-2xl border p-6 mb-8"
            style={{
              background: 'var(--color-danger-light, #fef2f2)',
              borderColor: 'var(--color-danger, #ef4444)',
              color: '#7f1d1d',
            }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: '#b91c1c' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Couldn&rsquo;t load the cohort
                </div>
                <div
                  style={{
                    fontSize: 13,
                    marginTop: 4,
                    color: 'var(--neutral-700)',
                  }}
                >
                  {error}
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="mt-3 text-xs px-3 py-1.5 rounded-md border font-medium transition-colors hover:bg-[var(--card-bg)]"
                  style={{
                    borderColor: 'var(--color-danger, #ef4444)',
                    color: '#b91c1c',
                    background: 'var(--card-bg)',
                  }}
                  disabled={loading}
                >
                  {loading ? 'Retrying…' : 'Retry'}
                </button>
              </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* Chat — key forces remount (clears history) on refresh/date change */}
        <ChatPanel key={chatResetKey} cohort={data} />
      </div>
    </main>
  );
}
