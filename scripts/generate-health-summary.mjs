#!/usr/bin/env node
/**
 * Produce a stakeholder-facing CSV summarising the member-health snapshot:
 *   Section 1 — Band Distribution (per billing source)
 *   Section 2 — Recommended Actions Matrix (at-risk members, per source)
 *   Section 3 — Documentation (band definitions, action triggers, score formula)
 *
 * Output: ./out/health-summary.csv
 *
 * Usage:
 *   node --env-file=.env.local scripts/generate-health-summary.mjs
 *
 * The snapshot filters to active members who joined in the last 12 months by
 * default. Override via env vars: JOIN_START=YYYY-MM-DD, JOIN_END=YYYY-MM-DD.
 */

import { sql } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';

// ── Filter state ────────────────────────────────────────────────────────────

const today = new Date();
const oneYearAgo = new Date(today);
oneYearAgo.setUTCFullYear(today.getUTCFullYear() - 1);

const iso = (d) => d.toISOString().slice(0, 10);
const JOIN_START = process.env.JOIN_START ?? iso(oneYearAgo);
const JOIN_END = process.env.JOIN_END ?? iso(today);

// ── CSV helpers ─────────────────────────────────────────────────────────────

const csvEsc = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};
const row = (...cells) => cells.map(csvEsc).join(',');
const blank = () => '';

// ── Queries ────────────────────────────────────────────────────────────────

const { rows: asOfRows } = await sql`
  SELECT MAX(refreshed_at) AS as_of FROM member_health_scored
`;
const asOf = asOfRows[0]?.as_of
  ? new Date(asOfRows[0].as_of).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  : 'unknown';

const { rows: bandRows } = await sql.query(
  `
  SELECT
    COALESCE(billing_source, 'Founding Members')         AS source,
    COUNT(*) FILTER (WHERE band = 'at_risk')::int        AS at_risk,
    COUNT(*) FILTER (WHERE band = 'steady')::int         AS steady,
    COUNT(*) FILTER (WHERE band = 'champion')::int       AS champion,
    COUNT(*)::int                                        AS total,
    ROUND(AVG(composite_score))::int                     AS avg_score
  FROM member_health_scored
  WHERE member_status = 'active'
    AND join_date >= $1::date
    AND join_date <  ($2::date + INTERVAL '1 day')
  GROUP BY COALESCE(billing_source, 'Founding Members')
  ORDER BY
    CASE COALESCE(billing_source, 'Founding Members')
      WHEN 'ACE' THEN 1 WHEN 'Recharge' THEN 2 WHEN 'Skool' THEN 3 ELSE 4 END
  `,
  [JOIN_START, JOIN_END]
);

const { rows: actionRows } = await sql.query(
  `
  WITH scoped AS (
    SELECT
      COALESCE(billing_source, 'Founding Members') AS source,
      ai_activated, total_posts, total_comments, courses_started,
      has_completed_onboarding, revenue_verified
    FROM member_health_scored
    WHERE member_status = 'active'
      AND band          = 'at_risk'
      AND join_date >= $1::date
      AND join_date <  ($2::date + INTERVAL '1 day')
  )
  SELECT
    source,
    COUNT(*)::int                                                           AS at_risk,
    COUNT(*) FILTER (WHERE NOT ai_activated)::int                           AS ai,
    COUNT(*) FILTER (WHERE total_posts + total_comments = 0)::int           AS post,
    COUNT(*) FILTER (WHERE NOT has_completed_onboarding)::int               AS onboard,
    COUNT(*) FILTER (
      WHERE NOT revenue_verified
        AND source IN ('ACE','Recharge')
    )::int                                                                  AS verify,
    COUNT(*) FILTER (WHERE courses_started = 0)::int                        AS course
  FROM scoped
  GROUP BY source
  ORDER BY
    CASE source
      WHEN 'ACE' THEN 1 WHEN 'Recharge' THEN 2 WHEN 'Skool' THEN 3 ELSE 4 END
  `,
  [JOIN_START, JOIN_END]
);

// ── Helpers for totals rows ────────────────────────────────────────────────

const bandTotal = bandRows.reduce(
  (acc, r) => ({
    at_risk: acc.at_risk + r.at_risk,
    steady: acc.steady + r.steady,
    champion: acc.champion + r.champion,
    total: acc.total + r.total,
  }),
  { at_risk: 0, steady: 0, champion: 0, total: 0 }
);

const actionTotal = actionRows.reduce(
  (acc, r) => ({
    at_risk: acc.at_risk + r.at_risk,
    ai: acc.ai + r.ai,
    post: acc.post + r.post,
    onboard: acc.onboard + r.onboard,
    verify: acc.verify + r.verify,
    course: acc.course + r.course,
  }),
  { at_risk: 0, ai: 0, post: 0, onboard: 0, verify: 0, course: 0 }
);

// ── Build CSV ──────────────────────────────────────────────────────────────

const lines = [];

// Metadata header
lines.push(row('ACQ Vantage — Member Health Snapshot'));
lines.push(row('Data refreshed', asOf));
lines.push(
  row('Filter', `Active members, joined ${JOIN_START} to ${JOIN_END}, all billing sources`)
);
lines.push(
  row('Generated', new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC')
);
lines.push(blank());

// Section 1 — Band distribution
lines.push(row('SECTION 1 — Band Distribution (active members)'));
lines.push(row('Source', 'At Risk', 'Steady', 'Champion', 'Total', 'Avg Score'));
for (const r of bandRows) {
  lines.push(row(r.source, r.at_risk, r.steady, r.champion, r.total, r.avg_score));
}
lines.push(
  row(
    'All',
    bandTotal.at_risk,
    bandTotal.steady,
    bandTotal.champion,
    bandTotal.total,
    bandTotal.total > 0
      ? Math.round(
          bandRows.reduce((s, r) => s + r.avg_score * r.total, 0) / bandTotal.total
        )
      : 0
  )
);
lines.push(blank());

// Section 2 — Action matrix
lines.push(row('SECTION 2 — Recommended Actions Matrix (at-risk members only)'));
lines.push(
  row(
    'Source',
    'At Risk (total)',
    'Nudge AI usage',
    'Incentive to post',
    'Book onboarding call',
    'Complete revenue verification',
    'Send course to watch'
  )
);
for (const r of actionRows) {
  // Verify action is ACE/Recharge only — show "—" for other sources.
  const verifyCell =
    r.source === 'ACE' || r.source === 'Recharge' ? r.verify : '—';
  lines.push(
    row(r.source, r.at_risk, r.ai, r.post, r.onboard, verifyCell, r.course)
  );
}
lines.push(
  row(
    'All',
    actionTotal.at_risk,
    actionTotal.ai,
    actionTotal.post,
    actionTotal.onboard,
    actionTotal.verify,
    actionTotal.course
  )
);
lines.push(blank());

// Section 3 — Documentation
lines.push(row('SECTION 3 — Documentation'));
lines.push(blank());

lines.push(row('> Band definitions'));
lines.push(row('Band', 'Score range', 'Color', 'Operational meaning'));
lines.push(
  row(
    'At Risk',
    '0–25',
    'Red',
    'Lowest 25% of possible score. Members with most missing signals. Prioritize for CS outreach.'
  )
);
lines.push(
  row(
    'Steady',
    '26–75',
    'Amber',
    'Middle band. Members are engaged on at least some signals but not a power user yet. Light-touch nurture — don\'t over-invest.'
  )
);
lines.push(
  row(
    'Champion',
    '76–100',
    'Green',
    'Highest band. Power users hitting most signals strongly. Celebrate, use as advocates, leave alone.'
  )
);
lines.push(blank());

lines.push(row('> Recommended action triggers (v2)'));
lines.push(row('Action', 'Trigger (per at-risk member)', 'Applies to', 'Why it matters'));
lines.push(
  row(
    'Nudge AI usage',
    'ai_activated = false (did not hit 2+ distinct AI days in first 7 days after joining)',
    'All sources',
    'Retention framework #1 signal. For ACE/Recharge, activation halves churn. For Skool-native the correlation is weaker, but AI usage is still the top lever across the community.'
  )
);
lines.push(
  row(
    'Incentive to post',
    'total_posts + total_comments = 0 (never posted)',
    'All sources',
    'Retention framework #2 signal (community engagement). Lurkers churn more than any other pattern — the first post is the highest-leverage flip.'
  )
);
lines.push(
  row(
    'Book onboarding call',
    'No completed onboarding meeting on record (meeting_outcome = COMPLETED and meeting_title LIKE onboard%)',
    'All sources',
    'Framework\'s strongest rescue lever. Completers churn at 11.1% vs never-booked at 32.3%. The largest gap among all rescue signals.'
  )
);
lines.push(
  row(
    'Complete revenue verification',
    'Contact\'s revenue_verification_status != Verification Successful',
    'ACE / Recharge only',
    'Framework: 0% churn when verified for ACE/Recharge. Irrelevant for Skool-native (no correlation), so not surfaced there.'
  )
);
lines.push(
  row(
    'Send course to watch',
    'courses_started = 0 (never started a course)',
    'All sources',
    'Not in framework top 5, but profiling showed learning as the cleanest active-vs-cancelled separator (8–15× mean ratio). Earns a column on empirical strength.'
  )
);
lines.push(blank());

lines.push(row('> How the composite score is computed (per billing source)'));
lines.push(
  row('Component', 'Signal', 'ACE / Recharge weight', 'Skool / Unknown weight', 'Why the split')
);
lines.push(row('Engagement', 'min(posts + comments, 20)', '30%', '35%', 'Consistent active-vs-cancelled separator across all sources. Slightly higher for Skool because AI is removed there.'));
lines.push(row('Learning', 'min(courses_started × 10 + courses_completed × 20, 100)', '25%', '30%', 'Strongest overall separator (8–15× ratio). Underweighted in v1.'));
lines.push(row('AI adoption', 'ai_activated ? 100 : min(ai_total_chats, 100)', '20%', '0%', 'ACE/Recharge: AI activation halves churn. Skool: signal inverted in profiling — cancelled members were MORE AI-active than active ones. Zero weight for Skool.'));
lines.push(row('Upvotes received', 'min(total_upvotes_received, 50)', '15%', '20%', 'Proxies perceived value-add. Bonus on top of engagement.'));
lines.push(row('Recency', 'max(0, 100 − min(days_since_last_post, 30) × 3.33)', '10%', '15%', 'Light weight. Circularly correlated with churn for cancelled members, so we cap it low.'));
lines.push(row('', '', '100%', '100%', ''));
lines.push(blank());

lines.push(row('> Notes & limitations (v2)'));
lines.push(row('Topic', 'Detail'));
lines.push(row('Snapshot, not time series', 'The health score is recomputed once per day. No historical comparison until we start storing daily snapshots.'));
lines.push(row('Cells overlap in the action matrix', 'A member with zero posts AND zero courses counts in two action columns. This is intentional — they need both interventions.'));
lines.push(row('Founding-era bias', 'The Founding Members row is pre-Feb 2026 joiners whose billing source never enriched (~80% of that segment). A large chunk of Recharge is also founding-era. These members predate our formal onboarding and revenue-verification systems, which inflates the "needs these actions" counts.'));
lines.push(row('Small cancelled cohort', 'Weights were tuned against a small cancelled population (ACE=9, Skool=22 members with tenure ≥ 30 days). Directional, not definitive — will re-tune once daily snapshots accumulate.'));
lines.push(row('AI predict vs. intervene', 'AI weight is 0 for Skool in the composite SCORE (not predictive), but the ACTION "nudge AI usage" still applies to all sources (AI is operationally the top lever). The two are intentionally different.'));
lines.push(blank());

lines.push(row('Source of truth'));
lines.push(row('Postgres view: member_health_scored (built by the Member Health Scores Data Pipeline, n8n workflow WrZW4BJlt5AVQj4h — daily 06:00 UTC)'));
lines.push(row('Full skill doc: .claude/skills/member-health/SKILL.md'));

// ── Write file ──────────────────────────────────────────────────────────────

const outDir = path.resolve('out');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'health-summary.csv');
fs.writeFileSync(outFile, lines.join('\n') + '\n');

console.log(`✓ Wrote ${outFile}`);
console.log(`  ${lines.length} rows, ${bandRows.length} sources in band table, ${actionRows.length} sources in action matrix`);
console.log(`  Snapshot as of: ${asOf}`);
console.log(`  Filter: active members, joined ${JOIN_START} to ${JOIN_END}`);
