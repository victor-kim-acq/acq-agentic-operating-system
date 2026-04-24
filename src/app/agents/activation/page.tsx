'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import type { CohortResponse } from '../retention/RetentionArtifact';
import ChatPanel from '../retention/ChatPanel';
import { AIActivationRateCard } from '@/app/dashboard/ActivationKPIs';
import AIWeeklyActiveCard from '@/app/dashboard/AIWeeklyActiveCard';
import CollapsibleNotes, { Note } from '@/components/ui/CollapsibleNotes';


const FILTER_NOTES: Note[] = [
  {
    title: 'What these filters do',
    bullets: [
      'Start / End date define the cohort window on the x-axis. Change them to show more or fewer weeks/months.',
      'Locked-as-of freezes the data as of a specific point in time. Useful for reproducing snapshots, comparing cohorts at equivalent ages, or measuring "what did the chart look like last week."',
      'Apply commits all three values at once — nothing re-fetches until you click it.',
    ],
  },
  {
    title: 'How each filter affects the charts',
    bullets: [
      'Start date — earliest bar shown on the x-axis. On the WAU chart, messages before this date are ignored.',
      'End date — latest bar shown. On the Activation chart, members who joined after end-date are excluded. On the WAU chart, messages after end-date are ignored.',
      'Locked-as-of — only kicks in when it\'s earlier than end-date. When active, it takes over as the effective cap on everything: join dates, message dates, and active-base cancellation rollback (cancellations that happened after the locked date get treated as "hadn\'t happened yet").',
    ],
  },
  {
    title: 'Worked example — start=3/1, end=4/11, locked=4/8',
    bullets: [
      'Effective cap = 4/8 (the minimum of end and locked).',
      'Activation chart, last bar (week of 4/5): counts only members who joined 4/5–4/8, and their activations only count through 4/8. So that bar reflects ~3 days of cohort runway instead of the full 7.',
      'WAU chart, last bar (week of 4/5): counts messages 4/5 → 4/8 only. Active base reflects community size as of 4/8, and any cancellations between 4/9 and 4/11 are rolled back to "still active."',
    ],
  },
  {
    title: 'Things to keep in mind',
    bullets: [
      'If locked-as-of ≥ end-date, it has no effect. Set them equal (or leave locked later than end) when you just want current numbers.',
      'If locked-as-of < end-date, the most recent bars will be partial — read them as mid-period snapshots, not as final counts.',
      'Nothing re-fetches until Apply is clicked — typing into a date picker doesn\'t change anything by itself.',
      'Start date can go before March 2026, but the WAU chart\'s active base will inflate for those earlier weeks because pre-March cancellations aren\'t in our data. A footnote on that chart already mentions this.',
    ],
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

export default function ActivationAgentPage() {
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);
  const [lockedDate, setLockedDate] = useState(DEFAULT_LOCKED);

  const [data, setData] = useState<CohortResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);

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

        {/* Chat card */}
        <div className="mb-6">
          <ChatPanel key={chatResetKey} cohort={data} />
        </div>

        {/* Filter card */}
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
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--neutral-100)' }}>
              <CollapsibleNotes
                notes={FILTER_NOTES}
                header="About these filters"
                fadeColor="var(--card-bg)"
              />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div style={{ marginBottom: 24 }}>
          <AIActivationRateCard
            startDate={startDate}
            endDate={endDate}
            lockedDate={lockedDate}
          />
          <div style={{ marginTop: 24 }}>
            <AIWeeklyActiveCard
              startDate={startDate}
              endDate={endDate}
              lockedDate={lockedDate}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
