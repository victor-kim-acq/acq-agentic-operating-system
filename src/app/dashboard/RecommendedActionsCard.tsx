'use client';

import { useCallback, useEffect, useState } from 'react';
import ChartCard from '@/components/ui/ChartCard';
import CollapsibleNotes, { Note } from '@/components/ui/CollapsibleNotes';

type ActionKey = 'ai' | 'post' | 'onboard' | 'verify' | 'course';

interface ActionDef {
  key: ActionKey;
  label: string;
  rationale: string;
  appliesTo: 'all' | 'ace_recharge';
}

interface ActionRow {
  source: string;
  at_risk_total: number;
  ai: number;
  post: number;
  onboard: number;
  verify: number;
  course: number;
}

interface ActionsResponse {
  actions: ActionDef[];
  rows: ActionRow[];
  totals: ActionRow;
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

const SHORT_RATIONALE: Record<ActionKey, string> = {
  ai: 'Didn\'t hit 2+ AI days in first 7. Top retention signal.',
  post: 'Zero posts + comments. First-post flip is the biggest lever.',
  onboard: 'No completed onboarding meeting. Strongest rescue signal.',
  verify: 'Not revenue-verified. Applies to ACE & Recharge only.',
  course: 'Zero courses started. Learning is our cleanest separator.',
};

const ACTIONS_NOTES: Note[] = [
  {
    title: 'How to read this matrix',
    bullets: [
      'Rows are billing sources, columns are specific CS actions.',
      'Cells count at-risk members eligible for that action — overlaps are by design (a member with zero posts AND zero courses counts in two columns).',
      'The five columns are ordered by the retention-framework priority: AI, Community, Onboarding, Verification, plus Learning (empirical).',
    ],
  },
  {
    title: 'Action triggers (v2)',
    bullets: [
      '"Nudge AI usage" — ai_activated = false (didn\'t hit 2+ distinct AI days in first 7). Framework\'s #1 signal. Applies to every source — for Skool the signal is weaker as a churn predictor, but it\'s still the top lever across the community.',
      '"Incentive to post" — posts + comments = 0. Framework\'s #2 signal (community engagement).',
      '"Book onboarding call" — no completed onboarding meeting on record. Framework\'s strongest rescue lever — completers churn at 11.1% vs never-booked at 32.3%.',
      '"Complete revenue verification" — contact\'s revenue_verification_status ≠ \'Verification Successful\'. ACE/Recharge only. Framework says 0% churn when verified for those sources; irrelevant for Skool-native.',
      '"Send course to watch" — courses_started = 0. Not in framework\'s top 5 but learning was the cleanest active-vs-cancelled separator in profiling (8–15× ratio).',
    ],
  },
  {
    title: 'What this table is not',
    bullets: [
      "It's not a ranked to-do list. CS picks which column to focus on based on expected response rate and bandwidth — the table just tells you who's eligible.",
      "It doesn't prescribe the message itself. The 'what to send' is still a human decision; the data tells you the targeting criteria.",
      'It ignores Steady-band members by design. Biggest move is at_risk → steady; Steady → Champion is a later concern.',
      'Founding Members (pre-Feb 2026 joiners with no billing source) predate our onboarding and verification systems. Dash columns there are expected.',
    ],
  },
];

export default function RecommendedActionsCard({ filters }: Props) {
  const [data, setData] = useState<ActionsResponse | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const qs = new URLSearchParams({
        status: filters.status,
        source: filters.source,
        tier: filters.tier,
        joinStart: filters.joinStart,
        joinEnd: filters.joinEnd,
        t: String(Date.now()),
      }).toString();
      const res = await fetch(`/api/dashboard/health-actions?${qs}`);
      const json = (await res.json()) as ActionsResponse;
      setData(json);
    } catch (err) {
      console.error('health-actions fetch failed:', err);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <ChartCard
      title="Recommended Actions"
      subtitle="Which specific actions would flip at-risk members, by billing source"
      height={320}
      loading={!data}
    >
      {data && data.rows.length > 0 ? (
        <ActionMatrix data={data} />
      ) : (
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
      )}
      <div style={{ marginTop: 28 }}>
        <CollapsibleNotes
          notes={ACTIONS_NOTES}
          header="About this matrix"
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
  background: 'var(--card-bg)',
  textAlign: 'center',
  verticalAlign: 'top',
};
const thLeft: React.CSSProperties = {
  ...thBase,
  textAlign: 'left',
  minWidth: 110,
};
const tdBase: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--neutral-100)',
  fontSize: 13,
  textAlign: 'center',
  color: 'var(--neutral-700)',
};
const tdLeft: React.CSSProperties = {
  ...tdBase,
  textAlign: 'left',
  fontWeight: 500,
  color: 'var(--neutral-900)',
};

function ActionMatrix({ data }: { data: ActionsResponse }) {
  return (
    <div
      style={{
        border: '1px solid var(--neutral-100)',
        borderRadius: 8,
        overflow: 'auto',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
        <thead>
          <tr>
            <th style={thLeft}>Source</th>
            <th style={{ ...thBase, color: 'var(--neutral-500)' }}>
              At risk
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--neutral-400)',
                  marginTop: 2,
                  textTransform: 'none',
                  letterSpacing: 0,
                }}
              >
                total in segment
              </div>
            </th>
            {data.actions.map((a) => (
              <th key={a.key} style={thBase} title={a.rationale}>
                {a.label}
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--neutral-400)',
                    marginTop: 2,
                    textTransform: 'none',
                    letterSpacing: 0,
                    lineHeight: 1.35,
                    maxWidth: 160,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    fontWeight: 400,
                  }}
                >
                  {SHORT_RATIONALE[a.key]}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.source}>
              <td style={tdLeft}>{r.source}</td>
              <td
                style={{
                  ...tdBase,
                  color: 'var(--neutral-400)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {r.at_risk_total.toLocaleString()}
              </td>
              {data.actions.map((a) => (
                <td
                  key={a.key}
                  style={{ ...tdBase, fontVariantNumeric: 'tabular-nums' }}
                >
                  {a.appliesTo === 'ace_recharge' &&
                  !(r.source === 'ACE' || r.source === 'Recharge') ? (
                    <span style={{ color: 'var(--neutral-300)', fontSize: 12 }}>
                      —
                    </span>
                  ) : (
                    <ActionCell count={r[a.key]} total={r.at_risk_total} />
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr style={{ background: 'var(--neutral-50)' }}>
            <td style={{ ...tdLeft, fontWeight: 600 }}>All</td>
            <td
              style={{
                ...tdBase,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {data.totals.at_risk_total.toLocaleString()}
            </td>
            {data.actions.map((a) => (
              <td
                key={a.key}
                style={{
                  ...tdBase,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {data.totals[a.key].toLocaleString()}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ActionCell({ count, total }: { count: number; total: number }) {
  if (count === 0) {
    return <span style={{ color: 'var(--neutral-300)' }}>0</span>;
  }
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <>
      <span style={{ fontWeight: 600 }}>{count.toLocaleString()}</span>
      <span
        style={{
          color: 'var(--neutral-400)',
          fontSize: 11,
          marginLeft: 5,
          fontWeight: 400,
        }}
      >
        {pct}%
      </span>
    </>
  );
}
