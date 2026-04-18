'use client';

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import StatCard from '@/components/ui/StatCard';

// ---- Types mirroring the cohort API response ----
export interface CohortMeta {
  start_date: string;
  end_date: string;
  locked_date: string | null;
  queried_at: string;
  total_members: number;
  total_churned: number;
  churn_rate_pct: number;
}

export interface CohortHeadline {
  ai_activated: number;
  ai_not_activated: number;
  ai_activation_rate: number;
  community_engaged: number;
  community_not_engaged: number;
  community_engagement_rate: number;
  fully_activated: number;
  fully_activated_rate: number;
}

export interface SourceRow {
  source: string;
  total: number;
  churned: number;
  churn_pct: number;
  ai_activated: number;
  ai_not_activated: number;
  community_engaged: number;
  community_not_engaged: number;
  ai_and_community: number;
  ai_only: number;
  community_only: number;
  neither: number;
}

export interface TierRow {
  tier: string;
  total: number;
  churned: number;
  churn_pct: number;
}

export interface SegmentRow {
  segment: string;
  total: number;
  churned: number;
  churn_pct: number;
}

export interface SourceSegmentCell {
  source: string;
  segment: string;
  total: number;
  churned: number;
  churn_pct: number;
}

export interface SourceTierCell {
  source: string;
  tier: string;
  total: number;
  churned: number;
  churn_pct: number;
}

export interface CohortResponse {
  meta: CohortMeta;
  headline: CohortHeadline;
  by_source: SourceRow[];
  by_tier: TierRow[];
  combined_matrix: SegmentRow[];
  source_segment_matrix: SourceSegmentCell[];
  source_tier_matrix: SourceTierCell[];
}

// ---- Constants ----

const ACTIVATED_COLOR = 'var(--chart-2)';
const NOT_ACTIVATED_COLOR = '#f59e0b';
const TIER_COLORS: Record<string, string> = {
  Standard: '#2563eb',
  VIP: '#7c3aed',
  Premium: '#0d9488',
};
const SEGMENT_COLORS: Record<string, string> = {
  ai_and_community: 'var(--chart-2)',
  ai_only: '#5DCAA5',
  community_only: '#9FE1CB',
  neither: '#ef4444',
};

const VISIBLE_SOURCES = ['Skool', 'ACE', 'Recharge'] as const;
const MATRIX_SOURCES = ['Skool', 'ACE', 'Recharge', 'Unknown'] as const;
const VISIBLE_TIERS = ['Standard', 'VIP', 'Premium'] as const;
const SEGMENT_ORDER: Array<keyof typeof SEGMENT_COLORS> = [
  'ai_and_community',
  'ai_only',
  'community_only',
  'neither',
];
const SEGMENT_LABELS: Record<string, string> = {
  ai_and_community: 'AI + community',
  ai_only: 'AI only',
  community_only: 'Community only',
  neither: 'Neither',
};

// ---- Helpers ----

function pctFmt(n: number) {
  return `${n.toFixed(1)}%`;
}

/** Cell color by churn % — heatmap spec from the artifact. */
function churnCellStyle(pct: number): { background: string; color: string } {
  if (pct <= 8) return { background: '#f0fdfa', color: '#0f766e' };
  if (pct <= 13) return { background: '#f5f3ff', color: '#6d28d9' };
  if (pct <= 18) return { background: '#fffbeb', color: '#b45309' };
  if (pct <= 23) return { background: '#fff7ed', color: '#c2410c' };
  return { background: '#fef2f2', color: '#b91c1c' };
}

interface ChurnCellProps {
  pct: number;
  churned: number;
  total: number;
}

function ChurnCell({ pct, churned, total }: ChurnCellProps) {
  if (total === 0) {
    return (
      <td
        style={{
          padding: '9px 14px',
          borderBottom: '1px solid var(--neutral-100)',
          textAlign: 'center',
          color: 'var(--neutral-400)',
          fontSize: 13,
        }}
      >
        —
      </td>
    );
  }
  const lowSample = total < 5;
  const style = churnCellStyle(pct);
  return (
    <td
      style={{
        padding: '9px 14px',
        borderBottom: '1px solid var(--neutral-100)',
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 600,
        ...style,
      }}
    >
      <div>
        {pctFmt(pct)}
        {lowSample && <span title="n < 5, directional only"> †</span>}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 400,
          opacity: 0.75,
          marginTop: 1,
        }}
      >
        {churned}/{total}
      </div>
    </td>
  );
}

function LabelTd({ main, sub }: { main: string; sub?: string }) {
  return (
    <td
      style={{
        padding: '9px 14px',
        borderBottom: '1px solid var(--neutral-100)',
        color: 'var(--neutral-700)',
        fontSize: 13,
      }}
    >
      {main}
      {sub && (
        <span
          style={{
            display: 'block',
            fontSize: 11,
            color: 'var(--neutral-400)',
            marginTop: 1,
          }}
        >
          {sub}
        </span>
      )}
    </td>
  );
}

function ThRow({ cells }: { cells: string[] }) {
  return (
    <thead>
      <tr>
        {cells.map((c, i) => (
          <th
            key={c}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--neutral-400)',
              padding: '9px 14px',
              background: 'var(--neutral-50)',
              borderBottom: '1px solid var(--card-border)',
              textAlign: i === 0 ? 'left' : 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function SmallSampleFootnote() {
  return (
    <div
      style={{
        fontSize: 11,
        color: 'var(--neutral-400)',
        marginTop: 8,
        lineHeight: 1.5,
      }}
    >
      † n&lt;5 — directional only.
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid var(--card-border)',
        borderRadius: 12,
        overflow: 'auto',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: 560,
        }}
      >
        {children}
      </table>
    </div>
  );
}

// ---- Section primitives ----

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
        boxShadow: 'var(--shadow-sm)',
        padding: 24,
        marginBottom: 16,
      }}
    >
      {eyebrow && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--neutral-400)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
      )}
      <h2
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--neutral-900)',
          margin: '0 0 12px',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function PartHead({ children }: { children: string }) {
  return (
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
      <span>{children}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 12,
      }}
    >
      {items.map((it) => (
        <span
          key={it.label}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--neutral-500)',
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: it.color,
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function TableCaption({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--neutral-500)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        margin: '20px 0 8px',
      }}
    >
      {children}
    </div>
  );
}

// ---- Chart: horizontal churn bar ----

interface ChurnBarRow {
  label: string;
  value: number;
  fill: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChurnTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-md)',
        padding: '6px 10px',
        fontSize: 12,
      }}
    >
      <div style={{ color: 'var(--neutral-700)', fontWeight: 500 }}>
        {p.payload.label}
      </div>
      <div style={{ color: p.payload.fill, fontWeight: 600, marginTop: 2 }}>
        {Number(p.value).toFixed(1)}% churn
      </div>
    </div>
  );
}

function HorizontalChurnChart({
  data,
  height = 200,
  domainMax,
  yWidth = 200,
}: {
  data: ChurnBarRow[];
  height?: number;
  domainMax?: number;
  yWidth?: number;
}) {
  const computedMax =
    domainMax ??
    Math.max(
      8,
      Math.ceil(Math.max(...data.map((d) => d.value), 0) * 1.3)
    );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 56, left: 0, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} stroke="rgba(0,0,0,0.05)" />
        <XAxis
          type="number"
          domain={[0, computedMax]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11, fill: 'var(--neutral-400)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={yWidth}
          tick={{ fontSize: 12, fill: 'var(--neutral-700)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
          content={<ChurnTooltip />}
        />
        <Bar dataKey="value" radius={[4, 4, 4, 4]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((v: any) => `${Number(v).toFixed(1)}%`) as any}
            style={{
              fontSize: 11,
              fill: 'var(--neutral-700)',
              fontWeight: 600,
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- Helpers for source_segment_matrix lookups ----

function cellsForSource(
  matrix: SourceSegmentCell[],
  source: string
): {
  activated: { total: number; churned: number; pct: number };
  notActivated: { total: number; churned: number; pct: number };
  engaged: { total: number; churned: number; pct: number };
  notEngaged: { total: number; churned: number; pct: number };
  segments: Record<string, SourceSegmentCell>;
} {
  const bucket = matrix.filter((c) => c.source === source);
  const by = (seg: string) =>
    bucket.find((c) => c.segment === seg) ?? {
      source,
      segment: seg,
      total: 0,
      churned: 0,
      churn_pct: 0,
    };
  const segs: Record<string, SourceSegmentCell> = {
    ai_and_community: by('ai_and_community'),
    ai_only: by('ai_only'),
    community_only: by('community_only'),
    neither: by('neither'),
  };

  const activatedTotal = segs.ai_and_community.total + segs.ai_only.total;
  const activatedChurned =
    segs.ai_and_community.churned + segs.ai_only.churned;
  const notActivatedTotal = segs.community_only.total + segs.neither.total;
  const notActivatedChurned =
    segs.community_only.churned + segs.neither.churned;
  const engagedTotal = segs.ai_and_community.total + segs.community_only.total;
  const engagedChurned =
    segs.ai_and_community.churned + segs.community_only.churned;
  const notEngagedTotal = segs.ai_only.total + segs.neither.total;
  const notEngagedChurned = segs.ai_only.churned + segs.neither.churned;

  const pct = (c: number, t: number) => (t > 0 ? (c / t) * 100 : 0);

  return {
    activated: {
      total: activatedTotal,
      churned: activatedChurned,
      pct: pct(activatedChurned, activatedTotal),
    },
    notActivated: {
      total: notActivatedTotal,
      churned: notActivatedChurned,
      pct: pct(notActivatedChurned, notActivatedTotal),
    },
    engaged: {
      total: engagedTotal,
      churned: engagedChurned,
      pct: pct(engagedChurned, engagedTotal),
    },
    notEngaged: {
      total: notEngagedTotal,
      churned: notEngagedChurned,
      pct: pct(notEngagedChurned, notEngagedTotal),
    },
    segments: segs,
  };
}

// ---- Section components ----

function HeadlineMetrics({
  meta,
  headline,
}: {
  meta: CohortMeta;
  headline: CohortHeadline;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
        marginBottom: 8,
      }}
    >
      <StatCard label="New members" value={meta.total_members.toLocaleString()} />
      <StatCard
        label="Churned"
        value={meta.total_churned.toLocaleString()}
        trend={{
          value: pctFmt(meta.churn_rate_pct),
          positive: false,
          context: 'churn rate',
        }}
      />
      <StatCard
        label="AI activated"
        value={pctFmt(headline.ai_activation_rate)}
        trend={{
          value: `${headline.ai_activated} / ${meta.total_members}`,
          positive: true,
          context: '2+ days week 1',
        }}
      />
      <StatCard
        label="Community engaged"
        value={pctFmt(headline.community_engagement_rate)}
        trend={{
          value: `${headline.community_engaged} / ${meta.total_members}`,
          positive: true,
          context: '3+ posts/comments',
        }}
      />
      <StatCard
        label="Both signals"
        value={pctFmt(headline.fully_activated_rate)}
        trend={{
          value: `${headline.fully_activated} / ${meta.total_members}`,
          positive: true,
          context: 'fully activated',
        }}
      />
    </div>
  );
}

function Signal1({
  meta,
  combined_matrix,
  source_segment_matrix,
  by_source,
}: {
  meta: CohortMeta;
  combined_matrix: SegmentRow[];
  source_segment_matrix: SourceSegmentCell[];
  by_source: SourceRow[];
}) {
  const aiAnd = combined_matrix.find((s) => s.segment === 'ai_and_community')!;
  const aiOnly = combined_matrix.find((s) => s.segment === 'ai_only')!;
  const commOnly = combined_matrix.find((s) => s.segment === 'community_only')!;
  const neither = combined_matrix.find((s) => s.segment === 'neither')!;

  const activatedTotal = aiAnd.total + aiOnly.total;
  const activatedChurned = aiAnd.churned + aiOnly.churned;
  const notActivatedTotal = commOnly.total + neither.total;
  const notActivatedChurned = commOnly.churned + neither.churned;
  const activatedChurn = activatedTotal
    ? (activatedChurned / activatedTotal) * 100
    : 0;
  const notActivatedChurn = notActivatedTotal
    ? (notActivatedChurned / notActivatedTotal) * 100
    : 0;

  const chartData: ChurnBarRow[] = [
    {
      label: `Activated (n=${activatedTotal})`,
      value: Math.round(activatedChurn * 10) / 10,
      fill: ACTIVATED_COLOR.replace('var(--chart-2)', '#0d9488'),
    },
    {
      label: `Not activated (n=${notActivatedTotal})`,
      value: Math.round(notActivatedChurn * 10) / 10,
      fill: NOT_ACTIVATED_COLOR,
    },
  ];

  return (
    <Section eyebrow="Signal 1" title="ACQ AI activation cuts churn nearly in half">
      <p style={{ fontSize: 12, color: 'var(--neutral-400)', marginBottom: 14 }}>
        n={meta.total_members} members. Activated = 2+ days using ACQ AI in week 1.
      </p>
      <Legend
        items={[
          { color: '#0d9488', label: `Activated (n=${activatedTotal})` },
          { color: NOT_ACTIVATED_COLOR, label: `Not activated (n=${notActivatedTotal})` },
        ]}
      />
      <HorizontalChurnChart data={chartData} />

      <TableCaption>Churn % by billing source × activation level</TableCaption>
      <TableWrap>
        <ThRow cells={['Source', 'Overall', 'AI activated', 'Not activated']} />
        <tbody>
          {VISIBLE_SOURCES.map((source) => {
            const row = by_source.find((r) => r.source === source);
            if (!row) return null;
            const split = cellsForSource(source_segment_matrix, source);
            return (
              <tr key={source}>
                <LabelTd main={source} sub={`n=${row.total}`} />
                <ChurnCell pct={row.churn_pct} churned={row.churned} total={row.total} />
                <ChurnCell
                  pct={split.activated.pct}
                  churned={split.activated.churned}
                  total={split.activated.total}
                />
                <ChurnCell
                  pct={split.notActivated.pct}
                  churned={split.notActivated.churned}
                  total={split.notActivated.total}
                />
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
      <SmallSampleFootnote />
    </Section>
  );
}

function Signal2({
  meta,
  combined_matrix,
  source_segment_matrix,
}: {
  meta: CohortMeta;
  combined_matrix: SegmentRow[];
  source_segment_matrix: SourceSegmentCell[];
}) {
  const aiAnd = combined_matrix.find((s) => s.segment === 'ai_and_community')!;
  const aiOnly = combined_matrix.find((s) => s.segment === 'ai_only')!;
  const commOnly = combined_matrix.find((s) => s.segment === 'community_only')!;
  const neither = combined_matrix.find((s) => s.segment === 'neither')!;

  const engagedTotal = aiAnd.total + commOnly.total;
  const engagedChurned = aiAnd.churned + commOnly.churned;
  const notEngagedTotal = aiOnly.total + neither.total;
  const notEngagedChurned = aiOnly.churned + neither.churned;
  const engagedChurn = engagedTotal
    ? (engagedChurned / engagedTotal) * 100
    : 0;
  const notEngagedChurn = notEngagedTotal
    ? (notEngagedChurned / notEngagedTotal) * 100
    : 0;

  const chartData: ChurnBarRow[] = [
    {
      label: `Engaged (n=${engagedTotal})`,
      value: Math.round(engagedChurn * 10) / 10,
      fill: '#0d9488',
    },
    {
      label: `Not engaged (n=${notEngagedTotal})`,
      value: Math.round(notEngagedChurn * 10) / 10,
      fill: NOT_ACTIVATED_COLOR,
    },
  ];

  return (
    <Section eyebrow="Signal 2" title="Community engagement — strong but rare">
      <p style={{ fontSize: 12, color: 'var(--neutral-400)', marginBottom: 14 }}>
        n={meta.total_members}. Engaged = 3+ posts or comments in first 15 days.
      </p>
      <Legend
        items={[
          { color: '#0d9488', label: `Engaged (n=${engagedTotal})` },
          { color: NOT_ACTIVATED_COLOR, label: `Not engaged (n=${notEngagedTotal})` },
        ]}
      />
      <HorizontalChurnChart data={chartData} />

      <TableCaption>Churn % by billing source × community engagement</TableCaption>
      <TableWrap>
        <ThRow cells={['Source', 'Engaged', 'Not engaged']} />
        <tbody>
          {VISIBLE_SOURCES.map((source) => {
            const split = cellsForSource(source_segment_matrix, source);
            const total = split.engaged.total + split.notEngaged.total;
            if (total === 0) return null;
            return (
              <tr key={source}>
                <LabelTd main={source} sub={`n=${total}`} />
                <ChurnCell
                  pct={split.engaged.pct}
                  churned={split.engaged.churned}
                  total={split.engaged.total}
                />
                <ChurnCell
                  pct={split.notEngaged.pct}
                  churned={split.notEngaged.churned}
                  total={split.notEngaged.total}
                />
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
      <SmallSampleFootnote />
    </Section>
  );
}

function Signal3({
  by_tier,
  source_tier_matrix,
}: {
  by_tier: TierRow[];
  source_tier_matrix: SourceTierCell[];
}) {
  const rows = VISIBLE_TIERS.map(
    (t) => by_tier.find((r) => r.tier === t) ?? null
  ).filter(Boolean) as TierRow[];

  const chartData: ChurnBarRow[] = rows.map((r) => ({
    label: `${r.tier} (n=${r.total})`,
    value: Math.round(r.churn_pct * 10) / 10,
    fill: TIER_COLORS[r.tier] ?? 'var(--chart-1)',
  }));

  return (
    <Section eyebrow="Signal 3" title="Higher tier, lower churn">
      <p style={{ fontSize: 12, color: 'var(--neutral-400)', marginBottom: 14 }}>
        {rows.reduce((s, r) => s + r.total, 0)} members with known tier.
      </p>
      <Legend
        items={rows.map((r) => ({
          color: TIER_COLORS[r.tier] ?? 'var(--chart-1)',
          label: `${r.tier} (n=${r.total})`,
        }))}
      />
      <HorizontalChurnChart data={chartData} height={210} />

      <TableCaption>Churn % by tier × billing source</TableCaption>
      <TableWrap>
        <ThRow cells={['Tier', ...VISIBLE_SOURCES]} />
        <tbody>
          {VISIBLE_TIERS.map((tier) => (
            <tr key={tier}>
              <LabelTd main={tier} />
              {VISIBLE_SOURCES.map((source) => {
                const cell = source_tier_matrix.find(
                  (c) => c.source === source && c.tier === tier
                );
                if (!cell)
                  return (
                    <ChurnCell key={source} pct={0} churned={0} total={0} />
                  );
                return (
                  <ChurnCell
                    key={source}
                    pct={cell.churn_pct}
                    churned={cell.churned}
                    total={cell.total}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <div
        style={{
          fontSize: 11,
          color: 'var(--neutral-400)',
          marginTop: 8,
          lineHeight: 1.5,
        }}
      >
        ACE has no VIP members in this cohort. Cells with n&lt;5 are
        directional only.
      </div>
    </Section>
  );
}

function CombinedRetention({
  combined_matrix,
  source_segment_matrix,
  meta,
}: {
  combined_matrix: SegmentRow[];
  source_segment_matrix: SourceSegmentCell[];
  meta: CohortMeta;
}) {
  const chartData: ChurnBarRow[] = SEGMENT_ORDER.map((seg) => {
    const row = combined_matrix.find((s) => s.segment === seg);
    const total = row?.total ?? 0;
    return {
      label: `${SEGMENT_LABELS[seg]} (n=${total})`,
      value: row ? Math.round(row.churn_pct * 10) / 10 : 0,
      fill: SEGMENT_COLORS[seg],
    };
  });

  return (
    <Section
      eyebrow="Combined retention"
      title="Signals compound — both together beats neither"
    >
      <p style={{ fontSize: 12, color: 'var(--neutral-400)', marginBottom: 14 }}>
        n={meta.total_members}. Cells with n&lt;5 are directional only (marked †).
      </p>
      <Legend
        items={[
          { color: SEGMENT_COLORS.ai_and_community, label: 'Both signals' },
          { color: SEGMENT_COLORS.ai_only, label: 'AI only' },
          { color: SEGMENT_COLORS.community_only, label: 'Community only' },
          { color: SEGMENT_COLORS.neither, label: 'Neither' },
        ]}
      />
      <HorizontalChurnChart data={chartData} height={240} />

      <TableCaption>Churn % by segment × billing source</TableCaption>
      <TableWrap>
        <ThRow cells={['Segment', ...MATRIX_SOURCES]} />
        <tbody>
          {SEGMENT_ORDER.map((seg) => (
            <tr key={seg}>
              <LabelTd main={SEGMENT_LABELS[seg]} />
              {MATRIX_SOURCES.map((source) => {
                const cell = source_segment_matrix.find(
                  (c) => c.source === source && c.segment === seg
                );
                if (!cell)
                  return <ChurnCell key={source} pct={0} churned={0} total={0} />;
                return (
                  <ChurnCell
                    key={source}
                    pct={cell.churn_pct}
                    churned={cell.churned}
                    total={cell.total}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <SmallSampleFootnote />
    </Section>
  );
}

// ---- Top-level component ----

export default function RetentionArtifact({ data }: { data: CohortResponse }) {
  const {
    meta,
    headline,
    by_source,
    by_tier,
    combined_matrix,
    source_segment_matrix,
    source_tier_matrix,
  } = data;
  return (
    <div>
      <PartHead>Cohort overview</PartHead>
      <HeadlineMetrics meta={meta} headline={headline} />

      <PartHead>The signals</PartHead>
      <Signal1
        meta={meta}
        combined_matrix={combined_matrix}
        source_segment_matrix={source_segment_matrix}
        by_source={by_source}
      />
      <Signal2
        meta={meta}
        combined_matrix={combined_matrix}
        source_segment_matrix={source_segment_matrix}
      />
      <Signal3 by_tier={by_tier} source_tier_matrix={source_tier_matrix} />

      <PartHead>Combined retention</PartHead>
      <CombinedRetention
        combined_matrix={combined_matrix}
        source_segment_matrix={source_segment_matrix}
        meta={meta}
      />
    </div>
  );
}
