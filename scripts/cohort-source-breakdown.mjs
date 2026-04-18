/**
 * Cohort Source Breakdown — March 2026
 *
 * Single cohort query mirroring src/app/api/dashboard/activation-kpis/route.ts
 * (all_joiners → enriched → with_ai → with_all), extended with a
 * community_engaged boolean. Outputs three breakdowns grouped by
 * billing_source to scripts/output/cohort-source-breakdown.json.
 *
 * Run: source .env.local && export POSTGRES_URL && node scripts/cohort-source-breakdown.mjs
 */

import { sql } from '@vercel/postgres';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const EXCLUDE_CSV = join(REPO_ROOT, 'exclude.csv');
const OUTPUT_PATH = join(__dirname, 'output', 'cohort-source-breakdown.json');

const START_DATE = '2026-03-01';
const END_DATE = '2026-04-01'; // exclusive

function loadExcludeEmails() {
  try {
    const csv = readFileSync(EXCLUDE_CSV, 'utf8');
    return csv
      .split('\n')
      .slice(1)
      .map((line) => (line.split(',')[2] || '').trim().toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeSource(src) {
  if (!src || src === '') return 'Unknown';
  return src;
}

async function run() {
  const excludeEmails = loadExcludeEmails();
  const excludeValues =
    excludeEmails.length > 0
      ? excludeEmails.map((e) => `('${e.replace(/'/g, "''")}')`).join(',')
      : "('__none__')";

  const result = await sql.query(`
    WITH exclude_list AS (
      SELECT email FROM (VALUES ${excludeValues}) AS t(email)
    ),
    all_joiners AS (
      SELECT LOWER(email) AS email, join_date AS joined_at, 'active' AS status, user_id
      FROM skool_members
      WHERE join_date >= '${START_DATE}' AND join_date < '${END_DATE}'
        AND LOWER(email) NOT IN (SELECT email FROM exclude_list)
      UNION ALL
      SELECT LOWER(email), approved_at, 'cancelled', skool_user_id
      FROM skool_cancellations
      WHERE approved_at >= '${START_DATE}' AND approved_at < '${END_DATE}'
        AND LOWER(email) NOT IN (SELECT email FROM exclude_list)
    ),
    enriched AS (
      SELECT
        aj.*,
        (SELECT ce.contact_id FROM contact_emails ce WHERE LOWER(ce.email) = aj.email LIMIT 1) AS contact_id,
        COALESCE(
          (SELECT c.membership_tier FROM contacts c
           JOIN contact_emails ce ON c.contact_id = ce.contact_id
           WHERE LOWER(ce.email) = aj.email LIMIT 1),
          'Unknown'
        ) AS tier,
        (SELECT d.billing_source FROM contact_deal cd
         JOIN deals d ON cd.deal_id = d.deal_id
         JOIN contact_emails ce ON cd.contact_id = ce.contact_id
         WHERE LOWER(ce.email) = aj.email
         ORDER BY d.close_date DESC LIMIT 1
        ) AS billing_source
      FROM all_joiners aj
    ),
    with_ai AS (
      SELECT e.*,
        CASE WHEN (
          SELECT aai.active_days_week1 FROM acq_ai_usage aai
          WHERE LOWER(aai.email) = e.email
        ) >= 2 OR (e.contact_id IS NOT NULL AND (
          SELECT aai.active_days_week1 FROM acq_ai_usage aai
          JOIN contact_emails ce2 ON LOWER(aai.email) = LOWER(ce2.email)
          WHERE ce2.contact_id = e.contact_id LIMIT 1
        ) >= 2) THEN true ELSE false END AS ai_activated
      FROM enriched e
    ),
    with_all AS (
      SELECT wa.*,
        (
          (SELECT COUNT(*) FROM skool_posts sp
           WHERE sp.author_id = wa.user_id
             AND sp.created_at BETWEEN wa.joined_at AND wa.joined_at + INTERVAL '15 days')
          +
          (SELECT COUNT(*) FROM skool_comments sc
           WHERE sc.author_id = wa.user_id
             AND sc.created_at BETWEEN wa.joined_at AND wa.joined_at + INTERVAL '15 days')
        ) AS engagement_15d,
        (
          (
            (SELECT COUNT(*) FROM skool_posts sp
             WHERE sp.author_id = wa.user_id
               AND sp.created_at BETWEEN wa.joined_at AND wa.joined_at + INTERVAL '15 days')
            +
            (SELECT COUNT(*) FROM skool_comments sc
             WHERE sc.author_id = wa.user_id
               AND sc.created_at BETWEEN wa.joined_at AND wa.joined_at + INTERVAL '15 days')
          ) >= 3
        ) AS community_engaged
      FROM with_ai wa
    )
    SELECT
      billing_source,
      tier,
      status,
      ai_activated,
      community_engaged,
      (SELECT c.revenue_verification_status FROM contacts c
       WHERE c.contact_id = with_all.contact_id LIMIT 1
      ) = 'Verification Successful' AS revenue_verified
    FROM with_all
  `);

  const rows = result.rows.map((r) => ({
    billing_source: normalizeSource(r.billing_source),
    tier: r.tier,
    status: r.status,
    ai_activated: r.ai_activated === true,
    community_engaged: r.community_engaged === true,
    revenue_verified: r.revenue_verified === true,
  }));

  // --- Aggregations ---

  // Helper: aggregate rows into {total, churned, churn_pct}
  const agg = (arr) => {
    const total = arr.length;
    const churned = arr.filter((r) => r.status === 'cancelled').length;
    const churn_pct =
      total > 0 ? Math.round((churned / total) * 1000) / 10 : 0;
    return { total, churned, churn_pct };
  };

  // 1. Signal 2 — community engaged/not, by source
  const signal_2_community = [];
  const bySourceComm = new Map();
  for (const r of rows) {
    const key = `${r.billing_source}|${r.community_engaged ? 'engaged' : 'not_engaged'}`;
    if (!bySourceComm.has(key)) bySourceComm.set(key, []);
    bySourceComm.get(key).push(r);
  }
  for (const [key, group] of bySourceComm) {
    const [source, segment] = key.split('|');
    signal_2_community.push({ source, segment, ...agg(group) });
  }

  // 2. Signal 3 — tier × source (exclude 'Unknown' tier)
  const signal_3_tier = [];
  const bySourceTier = new Map();
  for (const r of rows) {
    if (r.tier === 'Unknown') continue;
    const key = `${r.billing_source}|${r.tier}`;
    if (!bySourceTier.has(key)) bySourceTier.set(key, []);
    bySourceTier.get(key).push(r);
  }
  for (const [key, group] of bySourceTier) {
    const [source, segment] = key.split('|');
    signal_3_tier.push({ source, segment, ...agg(group) });
  }

  // 3. Combined matrix — AI × community × source
  const combined_matrix = [];
  const bySourceCombo = new Map();
  const comboFor = (r) => {
    if (r.ai_activated && r.community_engaged) return 'ai_and_community';
    if (r.ai_activated && !r.community_engaged) return 'ai_only';
    if (!r.ai_activated && r.community_engaged) return 'community_only';
    return 'neither';
  };
  for (const r of rows) {
    const key = `${r.billing_source}|${comboFor(r)}`;
    if (!bySourceCombo.has(key)) bySourceCombo.set(key, []);
    bySourceCombo.get(key).push(r);
  }
  for (const [key, group] of bySourceCombo) {
    const [source, segment] = key.split('|');
    combined_matrix.push({ source, segment, ...agg(group) });
  }

  // 4. Verified revenue by source
  const verified_revenue_by_source = [];
  const bySourceVerified = new Map();
  for (const r of rows) {
    const key = `${r.billing_source}|${r.revenue_verified ? 'verified' : 'not_verified'}`;
    if (!bySourceVerified.has(key)) bySourceVerified.set(key, []);
    bySourceVerified.get(key).push(r);
  }
  for (const [key, group] of bySourceVerified) {
    const [source, segment] = key.split('|');
    verified_revenue_by_source.push({ source, segment, ...agg(group) });
  }

  // Stable sort: source alpha, then segment alpha
  const sortBreakdown = (arr) =>
    arr.sort((a, b) =>
      a.source !== b.source
        ? a.source.localeCompare(b.source)
        : a.segment.localeCompare(b.segment)
    );

  const output = {
    cohort: {
      start_date: START_DATE,
      end_date_exclusive: END_DATE,
      total_members: rows.length,
      total_churned: rows.filter((r) => r.status === 'cancelled').length,
    },
    signal_2_community: sortBreakdown(signal_2_community),
    signal_3_tier: sortBreakdown(signal_3_tier),
    combined_matrix: sortBreakdown(combined_matrix),
    verified_revenue_by_source: sortBreakdown(verified_revenue_by_source),
  };

  // Write JSON
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  // --- Summary to stdout ---
  console.log('\n=== Cohort Source Breakdown — March 2026 ===\n');
  console.log(`Total members: ${output.cohort.total_members} (${output.cohort.total_churned} churned)`);
  console.log(`Output written: ${OUTPUT_PATH}\n`);

  const printTable = (title, breakdown) => {
    console.log(`--- ${title} (${breakdown.length} groups) ---`);
    console.log(
      'Source'.padEnd(14) +
        'Segment'.padEnd(22) +
        'Total'.padStart(7) +
        'Churned'.padStart(10) +
        'Churn %'.padStart(10)
    );
    console.log('-'.repeat(63));
    for (const row of breakdown) {
      console.log(
        (row.source || '').padEnd(14) +
          (row.segment || '').padEnd(22) +
          String(row.total).padStart(7) +
          String(row.churned).padStart(10) +
          (row.churn_pct + '%').padStart(10)
      );
    }
    console.log();
  };

  printTable('signal_2_community', output.signal_2_community);
  printTable('signal_3_tier', output.signal_3_tier);
  printTable('combined_matrix', output.combined_matrix);
  printTable('verified_revenue_by_source', output.verified_revenue_by_source);
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
