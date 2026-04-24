'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import RetentionArtifact, { CohortResponse } from '../retention/RetentionArtifact';
import ChatPanel from '../retention/ChatPanel';
import { AIActivationRateCard } from '@/app/dashboard/ActivationKPIs';
import AIWeeklyActiveCard from '@/app/dashboard/AIWeeklyActiveCard';

const ANALYSIS_NOTES: {
  title: string;
  bullets: string[];
  checkmarks?: boolean;
  footer?: string;
}[] = [
  {
    title: 'How to use this report',
    bullets: [
      'Start / End date define the cohort window.',
      'Locked-as-of freezes the DB snapshot — it controls which rows are visible, not just cancellations. Rows for March members can land days or weeks after they joined, so earlier locked dates may undercount.',
      'Last updated / Refresh is when the page last fetched, not when the underlying data changed.',
    ],
  },
  {
    title: 'How the metrics work',
    bullets: [
      'AI Activation — 2+ distinct days using ACQ AI in the first 7 days.',
      'Community Engagement — 3+ posts or comments in the first 15 days; lurking doesn\u2019t count.',
      'AI only — activated AI but didn\u2019t hit the posting threshold.',
      'Community only — 3+ posts but didn\u2019t activate AI.',
      'Neither — missed both signals.',
      'Billing Source — Skool-native vs. ACE / Recharge behave fundamentally differently; signals predict churn for ACE / Recharge but not for Skool.',
      'Churn Rate — cancelled \u00f7 total cohort; cancellations after locked-as-of don\u2019t count.',
    ],
  },
  {
    title: 'Things that look off but aren\u2019t',
    bullets: [
      'Skool community-only = 0 is not a bug — the 32 non-activated Skool members also didn\u2019t post enough to clear the threshold.',
      'Activation rates are nearly identical across sources (~67\u201371%); the story isn\u2019t who activates, it\u2019s whether activation predicts churn — a 14\u201319pp gap for ACE / Recharge, none for Skool.',
      'ACE / Recharge community-engaged = 0% churn is real but n=5 and n=9; directional only.',
      'Recharge-Standard at 33.3% churn has n=9 — same small-sample caveat.',
    ],
  },
  {
    title: 'What we validated before publishing',
    checkmarks: true,
    bullets: [
      'Billing-source rows sum to the cohort total.',
      'Verified + not verified per source sums to that source\u2019s total.',
      'Churn counts match churn_pct within 0.5%.',
      'Cohort count frozen via lockedDate — same params always return the same total.',
    ],
    footer:
      'Validated against March 2026 cohort \u00b7 lockedDate 2026-04-16 \u00b7 n=208',
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

export default function ActivationAgentPage() {
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);
  const [lockedDate, setLockedDate] = useState(DEFAULT_LOCKED);

  const [data, setData] = useState<CohortResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

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
    fetchCohort(draftStart, draftEnd, draftLocked);
  };

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
            title="Activation"
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
              </>
            )}
          </div>
        </div>

        {/* Analysis notes */}
        <section style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--neutral-400)',
              padding: '24px 0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span>Analysis notes</span>
            <span style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                maxHeight: isNotesExpanded ? 2000 : 220,
                overflow: 'hidden',
                transition: 'max-height 0.4s ease',
              }}
            >
              {ANALYSIS_NOTES.map((note) => (
                <div key={note.title} style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--neutral-900)',
                      marginBottom: 8,
                    }}
                  >
                    {note.title}
                  </div>
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      fontSize: 13,
                      color: 'var(--neutral-600)',
                      lineHeight: 1.6,
                    }}
                  >
                    {note.bullets.map((b, i) => (
                      <li
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 10,
                          marginBottom: 6,
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            flexShrink: 0,
                            width: 14,
                            color: note.checkmarks
                              ? 'var(--color-success, #16a34a)'
                              : 'var(--neutral-400)',
                          }}
                        >
                          {note.checkmarks ? '\u2713' : '\u2022'}
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  {note.footer && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--neutral-400)',
                        marginTop: 10,
                        fontStyle: 'italic',
                      }}
                    >
                      {note.footer}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {!isNotesExpanded && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 80,
                  background:
                    'linear-gradient(to bottom, transparent, var(--page-bg))',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsNotesExpanded((v) => !v)}
            aria-expanded={isNotesExpanded}
            className="hover:text-[var(--neutral-900)] transition-colors"
            style={{
              width: '100%',
              textAlign: 'center',
              padding: '10px 0',
              marginTop: 8,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--neutral-600)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isNotesExpanded ? 'Show less' : 'Show more'}
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                marginLeft: 6,
                transition: 'transform 0.2s ease',
                transform: isNotesExpanded ? 'rotate(180deg)' : 'rotate(0)',
              }}
            >
              {'\u25BE'}
            </span>
          </button>
        </section>

        {/* Filter + Chat — single card */}
        <div
          className="rounded-2xl border mb-6"
          style={{ ...cardStyle }}
        >
          <div className="p-4">
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
            <div className="flex justify-end mt-4">
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
          <ChatPanel key={chatResetKey} cohort={data} noCard />
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
            <RetentionArtifact
              data={data}
              signal1Override={
                <div style={{ marginBottom: 24 }}>
                  <AIActivationRateCard startDate={startDate} endDate={endDate} />
                </div>
              }
              signal2Override={
                <div style={{ marginBottom: 24 }}>
                  <AIWeeklyActiveCard startDate={startDate} endDate={endDate} />
                </div>
              }
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
