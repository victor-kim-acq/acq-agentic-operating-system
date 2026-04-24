'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import ChatPanel from '../retention/ChatPanel';
import HealthDistributionCard, {
  HealthDistribution,
} from '@/app/dashboard/HealthDistributionCard';
import HealthByCohortCard from '@/app/dashboard/HealthByCohortCard';
import AtRiskMembersCard from '@/app/dashboard/AtRiskMembersCard';
import CollapsibleNotes, { Note } from '@/components/ui/CollapsibleNotes';

const DEFAULT_STATUS = 'active';
const DEFAULT_SOURCE = 'all';
const DEFAULT_TIER = 'all';
// last 12 months, roughly
const today = new Date();
const oneYearAgo = new Date(today);
oneYearAgo.setUTCFullYear(today.getUTCFullYear() - 1);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const DEFAULT_JOIN_START = iso(oneYearAgo);
const DEFAULT_JOIN_END = iso(today);

const FILTER_NOTES: Note[] = [
  {
    title: 'What these filters do',
    bullets: [
      'Member status — include only active members, only cancelled, or both.',
      'Billing source / Tier — narrow to a specific segment (ACE / Recharge / Skool, Standard / VIP / Premium).',
      'Join-date range — restricts which cohorts are shown on the Cohort chart and which members appear in the At-Risk list.',
      "Apply commits all five values at once — nothing re-fetches until you click it.",
    ],
  },
  {
    title: 'Why there is no "Locked-as-of" filter here',
    bullets: [
      'Unlike /agents/activation, the health table is a daily snapshot — there is only ever one version of the data at a time.',
      "To compare historical snapshots you'd need daily history (see open decisions in the plan file). For now, use the refresh timestamp at the top of the page to know when the snapshot was taken.",
    ],
  },
];

const SUGGESTIONS = [
  'Explain how the composite score is computed.',
  'Are newer cohorts weaker than older ones?',
  'Who are our Champions — and what do they have in common?',
  'What should the CS team prioritize this week?',
];

const CHAT_DESCRIPTION =
  'Ask about the composite score, band definitions, cohort trends, or who to prioritize for outreach.';

const cardStyle: React.CSSProperties = {
  background: 'var(--card-bg)',
  borderColor: 'var(--card-border)',
  boxShadow: 'var(--shadow-sm)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--neutral-500)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle: React.CSSProperties = {
  borderColor: 'var(--neutral-200)',
};

function formatRefreshedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function HealthAgentPage() {
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [tier, setTier] = useState(DEFAULT_TIER);
  const [joinStart, setJoinStart] = useState(DEFAULT_JOIN_START);
  const [joinEnd, setJoinEnd] = useState(DEFAULT_JOIN_END);

  const [draftStatus, setDraftStatus] = useState(DEFAULT_STATUS);
  const [draftSource, setDraftSource] = useState(DEFAULT_SOURCE);
  const [draftTier, setDraftTier] = useState(DEFAULT_TIER);
  const [draftJoinStart, setDraftJoinStart] = useState(DEFAULT_JOIN_START);
  const [draftJoinEnd, setDraftJoinEnd] = useState(DEFAULT_JOIN_END);

  const [distribution, setDistribution] = useState<HealthDistribution | null>(
    null
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [chatResetKey, setChatResetKey] = useState(0);

  const filters = useMemo(
    () => ({ status, source, tier, joinStart, joinEnd }),
    [status, source, tier, joinStart, joinEnd]
  );

  const handleApply = useCallback(() => {
    setStatus(draftStatus);
    setSource(draftSource);
    setTier(draftTier);
    setJoinStart(draftJoinStart);
    setJoinEnd(draftJoinEnd);
    setChatResetKey((k) => k + 1);
  }, [draftStatus, draftSource, draftTier, draftJoinStart, draftJoinEnd]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setChatResetKey((k) => k + 1);
  }, []);

  const handleDistributionData = useCallback((d: HealthDistribution) => {
    setDistribution(d);
  }, []);

  const atRiskCount = useMemo(
    () => distribution?.buckets.find((b) => b.band === 'dormant')?.count ?? 0,
    [distribution]
  );
  const totalCount = distribution?.total ?? 0;
  const avgScore = distribution?.avg_score ?? 0;
  const refreshedAt = formatRefreshedAt(distribution?.as_of ?? null);

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
            title="Member Health"
            actions={
              <>
                {refreshedAt && (
                  <span
                    className="text-xs hidden sm:inline"
                    style={{ color: 'var(--neutral-400)' }}
                  >
                    Data refreshed: {refreshedAt}
                  </span>
                )}
                <button
                  onClick={handleRefresh}
                  className="p-2 rounded-lg transition-colors hover:bg-[var(--neutral-100)]"
                  title="Refresh"
                >
                  <RefreshCw
                    className="w-4 h-4"
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
            {distribution ? (
              <>
                <span>{totalCount.toLocaleString()} members</span>
                <span aria-hidden>·</span>
                <span>avg score {avgScore}</span>
                <span aria-hidden>·</span>
                <span>{atRiskCount.toLocaleString()} at risk</span>
              </>
            ) : (
              <span>Loading snapshot…</span>
            )}
          </div>
        </div>

        {/* Chat card */}
        <div className="mb-6">
          <ChatPanel
            key={chatResetKey}
            cohort={distribution}
            apiRoute="/api/agents/health/chat"
            description={CHAT_DESCRIPTION}
            placeholder="Ask about the score, bands, or cohort trends…"
            loadingPlaceholder="Loading health snapshot…"
            suggestions={SUGGESTIONS}
          />
        </div>

        {/* Filter card */}
        <div className="rounded-2xl border mb-6" style={cardStyle}>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <label className="flex flex-col gap-1">
                <span style={labelStyle}>Status</span>
                <select
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm bg-[var(--card-bg)]"
                  style={inputStyle}
                >
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="all">All</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span style={labelStyle}>Billing source</span>
                <select
                  value={draftSource}
                  onChange={(e) => setDraftSource(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm bg-[var(--card-bg)]"
                  style={inputStyle}
                >
                  <option value="all">All</option>
                  <option value="ACE">ACE</option>
                  <option value="Recharge">Recharge</option>
                  <option value="Skool">Skool</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span style={labelStyle}>Tier</span>
                <select
                  value={draftTier}
                  onChange={(e) => setDraftTier(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm bg-[var(--card-bg)]"
                  style={inputStyle}
                >
                  <option value="all">All</option>
                  <option value="standard">Standard</option>
                  <option value="vip">VIP</option>
                  <option value="premium">Premium</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span style={labelStyle}>Joined from</span>
                <input
                  type="date"
                  value={draftJoinStart}
                  onChange={(e) => setDraftJoinStart(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span style={labelStyle}>Joined to</span>
                <input
                  type="date"
                  value={draftJoinEnd}
                  onChange={(e) => setDraftJoinEnd(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </label>
            </div>
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={handleApply}
                disabled={
                  !draftJoinStart ||
                  !draftJoinEnd ||
                  draftJoinStart > draftJoinEnd
                }
                className="text-xs px-3 py-1.5 rounded-md text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--brand-primary, #7c3aed)' }}
              >
                Apply
              </button>
            </div>
            <div style={{ marginTop: 28 }}>
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
          <HealthDistributionCard
            key={`dist-${refreshKey}`}
            filters={filters}
            onData={handleDistributionData}
          />
          <div style={{ marginTop: 24 }}>
            <HealthByCohortCard key={`cohort-${refreshKey}`} filters={filters} />
          </div>
          <div style={{ marginTop: 24 }}>
            <AtRiskMembersCard key={`atrisk-${refreshKey}`} filters={filters} />
          </div>
        </div>
      </div>
    </main>
  );
}
