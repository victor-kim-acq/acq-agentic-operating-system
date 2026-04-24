'use client';

import { useCallback, useEffect, useState } from 'react';
import ChartCard from '@/components/ui/ChartCard';
import CollapsibleNotes, { Note } from '@/components/ui/CollapsibleNotes';

interface AtRiskMember {
  skool_user_id: string;
  email: string;
  full_name: string;
  tier: string;
  billing_source: string | null;
  member_status: string;
  joined_at: string;
  composite_score: number;
  days_since_join: number | null;
  days_since_last_post: number | null;
  ai_activated: boolean;
}

interface AtRiskResponse {
  rows: AtRiskMember[];
  total: number;
  limit: number;
}

interface Props {
  filters: {
    status: string;
    source: string;
    tier: string;
    joinStart: string;
    joinEnd: string;
  };
}

const AT_RISK_NOTES: Note[] = [
  {
    title: 'What this table shows',
    bullets: [
      'Every At-Risk member (composite score 0–25) that matches the filters above, sorted by days since last post (longest-silent first, then lowest score).',
      'Start here for CS outreach lists — these are the members most likely to churn next if signals correlate with churn (the retention framework says they do, heavily, for ACE/Recharge).',
      "Skool-native at-risk members should be deprioritized vs. ACE/Recharge at-risk — Skool's signal-to-churn relationship is much weaker.",
    ],
  },
  {
    title: 'Column notes',
    bullets: [
      "Score — composite health score (0–100). All rows here are by definition ≤ 25.",
      "Silent — days since the member's last post. A NULL value (—) means they have never posted; sort puts those at the top.",
      "AI — whether the member activated AI (sent messages on 2+ distinct days in their first 7 days). A \"No\" on top of a long silence is the strongest at-risk signal.",
      'Tier, Source — pulled from the unified_skool_cohort join. Unknown = the member has no matching cohort row (rare edge case).',
    ],
  },
];

export default function AtRiskMembersCard({ filters }: Props) {
  const [data, setData] = useState<AtRiskResponse | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const qs = new URLSearchParams({
        status: filters.status,
        source: filters.source,
        tier: filters.tier,
        joinStart: filters.joinStart,
        joinEnd: filters.joinEnd,
        limit: '100',
        t: String(Date.now()),
      }).toString();
      const res = await fetch(`/api/dashboard/at-risk-members?${qs}`);
      const json = (await res.json()) as AtRiskResponse;
      setData(json);
    } catch (err) {
      console.error('at-risk-members fetch failed:', err);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const shown = rows.length;

  const subtitle =
    total === 0
      ? undefined
      : shown < total
      ? `Showing top ${shown} of ${total.toLocaleString()} at-risk members`
      : `${total.toLocaleString()} at-risk members`;

  return (
    <ChartCard
      title="At-Risk Members"
      subtitle={subtitle}
      height={420}
      loading={!data}
    >
      {rows.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--neutral-400)',
            fontSize: 13,
          }}
        >
          No at-risk members match the current filters.
        </div>
      ) : (
        <MemberTable rows={rows} />
      )}
      <div style={{ marginTop: 28 }}>
        <CollapsibleNotes
          notes={AT_RISK_NOTES}
          header="About this list"
          fadeColor="var(--card-bg)"
        />
      </div>
    </ChartCard>
  );
}

const thBase: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--neutral-400)',
  borderBottom: '1px solid var(--neutral-200)',
  padding: '8px 12px',
  whiteSpace: 'nowrap',
  background: 'var(--card-bg)',
  position: 'sticky',
  top: 0,
};
const tdBase: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--neutral-100)',
  fontSize: 13,
  whiteSpace: 'nowrap',
};

function formatTier(tier: string): string {
  if (!tier || tier === 'Unknown') return tier || '—';
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 4,
        background: '#fef3c7',
        color: '#b45309',
        minWidth: 30,
        textAlign: 'center',
      }}
    >
      {score}
    </span>
  );
}

function YesNo({ yes }: { yes: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 4,
        background: yes ? 'var(--color-success-bg)' : '#fef3c7',
        color: yes ? 'var(--color-success)' : '#b45309',
      }}
    >
      {yes ? 'Yes' : 'No'}
    </span>
  );
}

function MemberTable({ rows }: { rows: AtRiskMember[] }) {
  return (
    <div
      className="overflow-auto"
      style={{
        maxHeight: 420,
        border: '1px solid var(--neutral-100)',
        borderRadius: 6,
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thBase, textAlign: 'left', minWidth: 220 }}>Email</th>
            <th style={{ ...thBase, textAlign: 'left' }}>Joined</th>
            <th style={{ ...thBase, textAlign: 'left' }}>Tier</th>
            <th style={{ ...thBase, textAlign: 'left' }}>Source</th>
            <th style={{ ...thBase, textAlign: 'center' }}>Score</th>
            <th style={{ ...thBase, textAlign: 'right' }}>Silent</th>
            <th style={{ ...thBase, textAlign: 'center' }}>AI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr
              key={m.skool_user_id}
              className="hover:bg-[var(--neutral-50)]"
            >
              <td
                style={{
                  ...tdBase,
                  textAlign: 'left',
                  color: 'var(--neutral-700)',
                }}
              >
                {m.email || m.full_name || m.skool_user_id.slice(0, 8)}
                {m.member_status === 'cancelled' && (
                  <span
                    style={{
                      fontSize: 10,
                      marginLeft: 6,
                      color: 'var(--color-danger)',
                    }}
                  >
                    churned
                  </span>
                )}
              </td>
              <td style={{ ...tdBase, textAlign: 'left', color: 'var(--neutral-500)' }}>
                {m.joined_at || '—'}
              </td>
              <td style={{ ...tdBase, textAlign: 'left' }}>{formatTier(m.tier)}</td>
              <td style={{ ...tdBase, textAlign: 'left', color: 'var(--neutral-500)' }}>
                {m.billing_source ?? '—'}
              </td>
              <td style={{ ...tdBase, textAlign: 'center' }}>
                <ScoreBadge score={m.composite_score} />
              </td>
              <td style={{ ...tdBase, textAlign: 'right', color: 'var(--neutral-500)' }}>
                {m.days_since_last_post == null
                  ? '—'
                  : `${m.days_since_last_post}d`}
              </td>
              <td style={{ ...tdBase, textAlign: 'center' }}>
                <YesNo yes={m.ai_activated} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
