'use client';

import { useCallback, useEffect, useState } from 'react';
import { Table2 } from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import CollapsibleNotes, { Note } from '@/components/ui/CollapsibleNotes';
import HealthMemberTable, {
  HealthMember,
  ColumnKey,
} from '@/components/ui/HealthMemberTable';

export interface BandBySourceRow {
  source: string;
  at_risk: number;
  steady: number;
  champion: number;
  total: number;
  avg_score: number;
}

export interface BandBySourceResponse {
  rows: BandBySourceRow[];
  totals: BandBySourceRow;
  as_of: string | null;
}

interface Props {
  filters: {
    status: string;
    source: string;
    tier: string;
    joinStart: string;
    joinEnd: string;
  };
  onData?: (data: BandBySourceResponse) => void;
}

const BAND_COLORS = {
  at_risk: '#ef4444',
  steady: '#f59e0b',
  champion: '#22c55e',
} as const;

const NOTES: Note[] = [
  {
    title: 'What this table shows',
    bullets: [
      'Every active member placed in one of three bands based on composite health score, split by billing source.',
      'At Risk (0–25) · Steady (26–75) · Champion (76–100). See "Recommended Actions" below for what to do with each group.',
      "The 'All' row sums down the columns so you can see the community-wide picture in one number.",
    ],
  },
  {
    title: 'How to read the sources',
    bullets: [
      'ACE & Recharge are our sales-driven billing paths — members here typically went through onboarding and verification.',
      'Skool-native members signed up directly on Skool without touching the sales motion.',
      'Founding Members are the pre-Feb 2026 cohort whose billing source never enriched — ~80% are legacy users from before the March launch. The remaining ~20% are post-launch members with a billing-source enrichment gap.',
    ],
  },
  {
    title: 'How the composite score is computed',
    bullets: [
      'Per-source weights (ACE/Recharge): Engagement 30% · Learning 25% · AI adoption 20% · Upvotes 15% · Recency 10%',
      'Per-source weights (Skool/Founding): Engagement 35% · Learning 30% · Upvotes 20% · Recency 15% · AI 0%',
      'AI is weighted 0 for Skool because profiling showed the signal inverts there — cancelled Skool members were actually more likely to be AI-activated than active ones.',
      'Full formula + trigger definitions are in .claude/skills/member-health/SKILL.md.',
    ],
  },
];

const thBase: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--neutral-400)',
  borderBottom: '1px solid var(--neutral-200)',
  padding: '9px 14px',
  background: 'var(--card-bg)',
  whiteSpace: 'nowrap',
};
const tdBase: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--neutral-100)',
  fontSize: 13,
  color: 'var(--neutral-700)',
  fontVariantNumeric: 'tabular-nums',
};

function pct(count: number, total: number) {
  if (total <= 0) return null;
  return Math.round((count / total) * 100);
}

function Cell({
  count,
  total,
  color,
}: {
  count: number;
  total: number;
  color: string;
}) {
  const p = pct(count, total);
  return (
    <td style={{ ...tdBase, textAlign: 'center' }}>
      <span style={{ fontWeight: 600, color }}>{count.toLocaleString()}</span>
      {p !== null && count > 0 && (
        <span
          style={{
            color: 'var(--neutral-400)',
            fontSize: 11,
            marginLeft: 5,
            fontWeight: 400,
          }}
        >
          {p}%
        </span>
      )}
    </td>
  );
}

const TABLE_COLUMNS: { key: ColumnKey; label: string; align?: 'left' | 'right' | 'center' }[] = [
  { key: 'email', label: 'Email', align: 'left' },
  { key: 'source', label: 'Source', align: 'left' },
  { key: 'tier', label: 'Tier', align: 'left' },
  { key: 'band', label: 'Band', align: 'left' },
  { key: 'score', label: 'Score', align: 'right' },
  { key: 'joined', label: 'Joined', align: 'left' },
  { key: 'days_silent', label: 'Days Silent', align: 'right' },
];

function useMembersList(
  filters: Props['filters'],
  enabled: boolean
): { rows: HealthMember[]; loading: boolean } {
  const [rows, setRows] = useState<HealthMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        status: filters.status,
        source: filters.source,
        tier: filters.tier,
        joinStart: filters.joinStart,
        joinEnd: filters.joinEnd,
        sort: 'score_desc',
        limit: '2000',
        t: String(Date.now()),
      }).toString();
      const res = await fetch(`/api/dashboard/health-members?${qs}`);
      const json = await res.json();
      setRows((json.rows ?? []) as HealthMember[]);
      setLoaded(true);
    } catch (err) {
      console.error('health-members fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (enabled && !loaded) fetchList();
  }, [enabled, loaded, fetchList]);
  // reset cache when filters change
  useEffect(() => {
    setLoaded(false);
  }, [filters]);

  return { rows, loading };
}

export default function BandBySourceCard({ filters, onData }: Props) {
  const [data, setData] = useState<BandBySourceResponse | null>(null);
  const [showTable, setShowTable] = useState(false);
  const { rows: memberRows, loading: membersLoading } = useMembersList(
    filters,
    showTable
  );

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
      const res = await fetch(`/api/dashboard/health-bands-by-source?${qs}`);
      const json = (await res.json()) as BandBySourceResponse;
      setData(json);
      onData?.(json);
    } catch (err) {
      console.error('health-bands-by-source fetch failed:', err);
    }
  }, [filters, onData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const subtitle = data
    ? `${data.totals.total.toLocaleString()} members · avg score ${data.totals.avg_score}`
    : undefined;

  const actions = (
    <button
      onClick={() => setShowTable((v) => !v)}
      className="flex items-center gap-1 text-xs transition-colors hover:opacity-70"
      style={{ color: 'var(--neutral-400)' }}
    >
      <Table2 className="w-3.5 h-3.5" />
      {showTable ? 'Chart' : 'Table'}
    </button>
  );

  return (
    <ChartCard
      title="Band Distribution by Billing Source"
      subtitle={subtitle}
      height={280}
      loading={!data && !showTable}
      actions={actions}
    >
      {showTable ? (
        membersLoading && memberRows.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'var(--neutral-400)',
              fontSize: 13,
            }}
          >
            Loading members…
          </div>
        ) : (
          <HealthMemberTable
            rows={memberRows}
            columns={TABLE_COLUMNS}
            filename="band-distribution-members.csv"
          />
        )
      ) : data && data.rows.length > 0 ? (
        <div
          style={{
            border: '1px solid var(--neutral-100)',
            borderRadius: 8,
            overflow: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: 'left', minWidth: 140 }}>
                  Source
                </th>
                <th style={{ ...thBase, textAlign: 'center' }}>
                  <span style={{ color: BAND_COLORS.at_risk }}>At Risk</span>
                </th>
                <th style={{ ...thBase, textAlign: 'center' }}>
                  <span style={{ color: BAND_COLORS.steady }}>Steady</span>
                </th>
                <th style={{ ...thBase, textAlign: 'center' }}>
                  <span style={{ color: BAND_COLORS.champion }}>Champion</span>
                </th>
                <th style={{ ...thBase, textAlign: 'center' }}>Total</th>
                <th style={{ ...thBase, textAlign: 'center' }}>Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.source}>
                  <td
                    style={{
                      ...tdBase,
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'var(--neutral-900)',
                    }}
                  >
                    {r.source}
                  </td>
                  <Cell
                    count={r.at_risk}
                    total={r.total}
                    color={BAND_COLORS.at_risk}
                  />
                  <Cell
                    count={r.steady}
                    total={r.total}
                    color={BAND_COLORS.steady}
                  />
                  <Cell
                    count={r.champion}
                    total={r.total}
                    color={BAND_COLORS.champion}
                  />
                  <td
                    style={{
                      ...tdBase,
                      textAlign: 'center',
                      color: 'var(--neutral-500)',
                    }}
                  >
                    {r.total.toLocaleString()}
                  </td>
                  <td
                    style={{
                      ...tdBase,
                      textAlign: 'center',
                      fontWeight: 600,
                      color: 'var(--neutral-900)',
                    }}
                  >
                    {r.avg_score}
                  </td>
                </tr>
              ))}
              <tr style={{ background: 'var(--neutral-50)' }}>
                <td
                  style={{
                    ...tdBase,
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'var(--neutral-900)',
                  }}
                >
                  All
                </td>
                <Cell
                  count={data.totals.at_risk}
                  total={data.totals.total}
                  color={BAND_COLORS.at_risk}
                />
                <Cell
                  count={data.totals.steady}
                  total={data.totals.total}
                  color={BAND_COLORS.steady}
                />
                <Cell
                  count={data.totals.champion}
                  total={data.totals.total}
                  color={BAND_COLORS.champion}
                />
                <td
                  style={{
                    ...tdBase,
                    textAlign: 'center',
                    fontWeight: 600,
                    color: 'var(--neutral-700)',
                  }}
                >
                  {data.totals.total.toLocaleString()}
                </td>
                <td
                  style={{
                    ...tdBase,
                    textAlign: 'center',
                    fontWeight: 600,
                    color: 'var(--neutral-900)',
                  }}
                >
                  {data.totals.avg_score}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--neutral-400)',
            fontSize: 13,
          }}
        >
          No members match the current filters.
        </div>
      )}
      <div style={{ marginTop: 28 }}>
        <CollapsibleNotes
          notes={NOTES}
          header="About this table"
          fadeColor="var(--card-bg)"
        />
      </div>
    </ChartCard>
  );
}
