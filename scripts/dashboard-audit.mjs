import { sql } from "@vercel/postgres";
import { writeFileSync } from "fs";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt$(v) {
  const n = Number(v);
  if (isNaN(n)) return "$0";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function mdTable(rows, columns) {
  if (!rows || rows.length === 0) return "_No rows returned._\n";
  const cols = columns || Object.keys(rows[0]);
  let out = "| " + cols.join(" | ") + " |\n";
  out += "| " + cols.map(() => "---").join(" | ") + " |\n";
  for (const r of rows) {
    out += "| " + cols.map((c) => String(r[c] ?? "NULL")).join(" | ") + " |\n";
  }
  return out;
}

async function q(query) {
  const result = await sql.query(query);
  return result.rows;
}

async function qval(query) {
  const rows = await q(query);
  return rows[0] ? Object.values(rows[0])[0] : null;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const md = [];
  const issues = [];
  const ts = new Date().toISOString();

  md.push(`# Dashboard Data Audit`);
  md.push(`Generated: ${ts}\n`);

  // ════════════════════════════════════════════════════════════════════════════
  // A. Cross-reference data
  // ════════════════════════════════════════════════════════════════════════════

  md.push(`## Data Overview\n`);

  // Distinct values
  md.push(`### Distinct Column Values\n`);

  const distinctQueries = [
    ["status", "SELECT DISTINCT status FROM memberships ORDER BY 1"],
    ["membership_type", "SELECT DISTINCT membership_type FROM memberships ORDER BY 1"],
    ["billing_source", "SELECT DISTINCT billing_source FROM memberships ORDER BY 1"],
    ["tier", "SELECT DISTINCT tier FROM memberships ORDER BY 1"],
    ["currency", "SELECT DISTINCT currency FROM memberships ORDER BY 1"],
  ];

  for (const [col, query] of distinctQueries) {
    const rows = await q(query);
    const vals = rows.map((r) => r[col] ?? "NULL");
    md.push(`**${col}:** ${vals.map((v) => "`" + v + "`").join(", ")}\n`);
    if (vals.includes("NULL") || vals.includes("null")) {
      issues.push(`Column \`${col}\` contains NULL values.`);
    }
  }

  // Date ranges
  md.push(`### Date Ranges\n`);

  const billingRange = (
    await q(
      `SELECT MIN(billing_date::date) AS earliest, MAX(billing_date::date) AS latest
       FROM memberships WHERE status = 'Active' AND membership_type = 'Paying Member'`
    )
  )[0];
  md.push(
    `**billing_date (Active Paying):** ${billingRange.earliest} to ${billingRange.latest}\n`
  );

  const dealRange = (
    await q(`SELECT MIN(close_date) AS earliest, MAX(close_date) AS latest FROM deals`)
  )[0];
  md.push(
    `**close_date (deals):** ${dealRange.earliest} to ${dealRange.latest}\n`
  );

  // Bridge table counts
  md.push(`### Bridge Table Coverage\n`);

  const bridgeRows = await q(`
    SELECT 'contact_membership' AS tbl, COUNT(*)::int AS cnt FROM contact_membership
    UNION ALL SELECT 'contact_deal', COUNT(*)::int FROM contact_deal
    UNION ALL SELECT 'deal_membership', COUNT(*)::int FROM deal_membership
  `);
  md.push(mdTable(bridgeRows));

  // Orphan checks
  md.push(`### Orphan Records\n`);

  const orphanMemberships = await qval(`
    SELECT COUNT(*)::int AS orphan_memberships FROM memberships m
    LEFT JOIN contact_membership cm ON m.membership_id = cm.membership_id
    WHERE cm.contact_id IS NULL
  `);
  const orphanDeals = await qval(`
    SELECT COUNT(*)::int AS orphan_deals FROM deals d
    LEFT JOIN contact_deal cd ON d.deal_id = cd.deal_id
    WHERE cd.contact_id IS NULL
  `);
  md.push(`- **Orphan memberships** (no contact link): ${orphanMemberships}`);
  md.push(`- **Orphan deals** (no contact link): ${orphanDeals}\n`);
  if (Number(orphanMemberships) > 0)
    issues.push(`${orphanMemberships} memberships have no contact link via contact_membership.`);
  if (Number(orphanDeals) > 0)
    issues.push(`${orphanDeals} deals have no contact link via contact_deal.`);

  // ════════════════════════════════════════════════════════════════════════════
  // B. Panel-by-panel filter funnels
  // ════════════════════════════════════════════════════════════════════════════

  // ── Panel 1: Collected Revenue ─────────────────────────────────────────────
  md.push(`## Panel 1: Current Month Collected Revenue\n`);
  md.push(`### Query Logic`);
  md.push(
    `Sums normalized MRR from the \`memberships\` table where \`status = 'Active'\`, \`membership_type = 'Paying Member'\`, and \`billing_date\` falls in the current calendar month (LA timezone). Non-USD records use tier-based normalization: Standard=$1,000, VIP=$3,000, VIP (Yearly)=$36,000, Premium=$8,000.\n`
  );

  md.push(`### Filter Funnel`);

  const p1s1 = await qval(`SELECT COUNT(*)::int FROM memberships`);
  const p1s2 = await qval(`SELECT COUNT(*)::int FROM memberships WHERE status = 'Active'`);
  const p1s3 = await qval(
    `SELECT COUNT(*)::int FROM memberships WHERE status = 'Active' AND membership_type = 'Paying Member'`
  );
  const p1s4 = await qval(
    `SELECT COUNT(*)::int FROM memberships WHERE status = 'Active' AND membership_type = 'Paying Member' AND billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date`
  );
  const p1result = await qval(`
    SELECT COALESCE(SUM(
      CASE WHEN LOWER(currency) = 'usd' THEN mrr ELSE
        CASE WHEN tier = 'Standard' THEN 1000 WHEN tier = 'VIP' THEN 3000
             WHEN tier = 'VIP (Yearly)' THEN 36000 WHEN tier = 'Premium' THEN 8000 ELSE 0 END
      END
    ), 0) AS result
    FROM memberships
    WHERE status = 'Active' AND membership_type = 'Paying Member'
      AND billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
  `);
  const p1samples = await q(`
    SELECT membership_id, membership_name, status, membership_type, billing_date, mrr, currency, tier
    FROM memberships
    WHERE status = 'Active' AND membership_type = 'Paying Member'
      AND billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
    LIMIT 5
  `);

  md.push(`| Step | Filter | Row Count |`);
  md.push(`| --- | --- | --- |`);
  md.push(`| 1 | All memberships | ${p1s1} |`);
  md.push(`| 2 | status = 'Active' | ${p1s2} |`);
  md.push(`| 3 | + membership_type = 'Paying Member' | ${p1s3} |`);
  md.push(`| 4 | + billing_date >= current month | ${p1s4} |\n`);
  md.push(`### Result`);
  md.push(`**${fmt$(p1result)}**\n`);
  md.push(`### Sample Rows (5)`);
  md.push(mdTable(p1samples));

  if (Number(p1s4) === 0)
    issues.push("Panel 1 (Collected Revenue): Zero rows after date filter -- no billing_date in the current month.");

  // ── Panel 2: Annual Run Rate ───────────────────────────────────────────────
  md.push(`## Panel 2: Annual Run Rate\n`);
  md.push(`### Query Logic`);
  md.push(
    `Same base as Panel 1 but joins through contact_membership -> contacts (where contacts.membership_type = 'Paying Member'), then multiplies total by 12. This additional join can drop rows if bridge table or contact is missing.\n`
  );

  md.push(`### Filter Funnel`);

  const p2s1 = p1s4; // same base
  const p2s2 = await qval(`
    SELECT COUNT(*)::int FROM memberships m
    JOIN contact_membership cm ON m.membership_id = cm.membership_id
    WHERE m.status = 'Active' AND m.membership_type = 'Paying Member'
      AND m.billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
  `);
  const p2s3 = await qval(`
    SELECT COUNT(*)::int FROM memberships m
    JOIN contact_membership cm ON m.membership_id = cm.membership_id
    JOIN contacts c ON cm.contact_id = c.contact_id AND c.membership_type = 'Paying Member'
    WHERE m.status = 'Active' AND m.membership_type = 'Paying Member'
      AND m.billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
  `);
  const p2result = await qval(`
    SELECT COALESCE(SUM(
      CASE WHEN LOWER(m.currency) = 'usd' THEN m.mrr ELSE
        CASE WHEN m.tier = 'Standard' THEN 1000 WHEN m.tier = 'VIP' THEN 3000
             WHEN m.tier = 'VIP (Yearly)' THEN 36000 WHEN m.tier = 'Premium' THEN 8000 ELSE 0 END
      END
    ), 0) * 12 AS result
    FROM memberships m
    JOIN contact_membership cm ON m.membership_id = cm.membership_id
    JOIN contacts c ON cm.contact_id = c.contact_id AND c.membership_type = 'Paying Member'
    WHERE m.status = 'Active' AND m.membership_type = 'Paying Member'
      AND m.billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
  `);

  md.push(`| Step | Filter | Row Count |`);
  md.push(`| --- | --- | --- |`);
  md.push(`| 1 | Active Paying + current month (from Panel 1) | ${p2s1} |`);
  md.push(`| 2 | + JOIN contact_membership | ${p2s2} |`);
  md.push(`| 3 | + JOIN contacts (membership_type = 'Paying Member') | ${p2s3} |\n`);
  md.push(`### Result`);
  md.push(`**${fmt$(p2result)}**\n`);

  const dropP2 = Number(p2s1) - Number(p2s3);
  if (dropP2 > 0)
    issues.push(
      `Panel 2 (ARR): ${dropP2} memberships dropped by contact_membership/contacts join (${p2s1} -> ${p2s3}). ARR is under-counted vs collected revenue.`
    );

  // ── Panel 3: Churned Revenue ───────────────────────────────────────────────
  md.push(`## Panel 3: Current Month Churned Revenue\n`);
  md.push(`### Query Logic`);
  md.push(
    `Same as Panel 1 but filters on \`status = 'Cancellation'\` instead of \`Active\`.\n`
  );

  md.push(`### Filter Funnel`);

  const p3s1 = await qval(`SELECT COUNT(*)::int FROM memberships WHERE status = 'Cancellation'`);
  const p3s2 = await qval(
    `SELECT COUNT(*)::int FROM memberships WHERE status = 'Cancellation' AND membership_type = 'Paying Member'`
  );
  const p3s3 = await qval(
    `SELECT COUNT(*)::int FROM memberships WHERE status = 'Cancellation' AND membership_type = 'Paying Member' AND billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date`
  );
  const p3result = await qval(`
    SELECT COALESCE(SUM(
      CASE WHEN LOWER(currency) = 'usd' THEN mrr ELSE
        CASE WHEN tier = 'Standard' THEN 1000 WHEN tier = 'VIP' THEN 3000
             WHEN tier = 'VIP (Yearly)' THEN 36000 WHEN tier = 'Premium' THEN 8000 ELSE 0 END
      END
    ), 0) AS result
    FROM memberships
    WHERE status = 'Cancellation' AND membership_type = 'Paying Member'
      AND billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
  `);
  const p3samples = await q(`
    SELECT membership_id, membership_name, status, membership_type, billing_date, mrr, currency, tier
    FROM memberships
    WHERE status = 'Cancellation' AND membership_type = 'Paying Member'
      AND billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
    LIMIT 5
  `);

  md.push(`| Step | Filter | Row Count |`);
  md.push(`| --- | --- | --- |`);
  md.push(`| 1 | status = 'Cancellation' | ${p3s1} |`);
  md.push(`| 2 | + membership_type = 'Paying Member' | ${p3s2} |`);
  md.push(`| 3 | + billing_date >= current month | ${p3s3} |\n`);
  md.push(`### Result`);
  md.push(`**${fmt$(p3result)}**\n`);
  md.push(`### Sample Rows (5)`);
  md.push(mdTable(p3samples));

  // ── Panel 4: Revenue by Tier ───────────────────────────────────────────────
  md.push(`## Panel 4: Revenue by Tier\n`);
  md.push(`### Query Logic`);
  md.push(
    `Groups Active Paying members (current month) by tier, computing USD MRR, non-USD normalized MRR, total MRR, and percent of total. Includes a Total summary row.\n`
  );

  md.push(`### Filter Funnel (row counts by tier)`);

  const p4counts = await q(`
    SELECT tier, COUNT(*)::int AS cnt
    FROM memberships
    WHERE status = 'Active' AND membership_type = 'Paying Member'
      AND billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
    GROUP BY tier ORDER BY tier
  `);
  md.push(mdTable(p4counts));

  md.push(`### Result (actual query)`);
  const p4result = await q(`
    WITH base AS (
      SELECT m.tier,
        CASE WHEN LOWER(m.currency) = 'usd' THEN m.mrr ELSE 0 END AS usd_mrr,
        CASE WHEN LOWER(m.currency) != 'usd' OR m.currency IS NULL THEN
          CASE WHEN m.tier = 'Standard' THEN 1000 WHEN m.tier = 'VIP' THEN 3000
               WHEN m.tier = 'VIP (Yearly)' THEN 36000 WHEN m.tier = 'Premium' THEN 8000 ELSE 0 END
        ELSE 0 END AS non_usd_normalized_mrr
      FROM memberships m
      WHERE m.status = 'Active' AND m.membership_type = 'Paying Member'
        AND m.billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
    ),
    by_tier AS (
      SELECT tier, COALESCE(SUM(usd_mrr), 0) AS usd_mrr, COALESCE(SUM(non_usd_normalized_mrr), 0) AS non_usd_mrr
      FROM base GROUP BY tier
    ),
    with_total AS (
      SELECT tier, usd_mrr, non_usd_mrr, usd_mrr + non_usd_mrr AS total_mrr FROM by_tier
      UNION ALL
      SELECT 'Total', COALESCE(SUM(usd_mrr),0), COALESCE(SUM(non_usd_mrr),0), COALESCE(SUM(usd_mrr),0) + COALESCE(SUM(non_usd_mrr),0) FROM by_tier
    )
    SELECT tier, usd_mrr, non_usd_mrr, total_mrr,
      CASE WHEN tier = 'Total' THEN 100
        ELSE ROUND(total_mrr::numeric / NULLIF(SUM(CASE WHEN tier != 'Total' THEN total_mrr END) OVER (), 0) * 100, 1)
      END AS pct_of_total
    FROM with_total
    ORDER BY CASE tier
      WHEN 'Total' THEN 0 WHEN 'Standard' THEN 1 WHEN 'Premium' THEN 2
      WHEN 'VIP' THEN 3 WHEN 'VIP (Yearly)' THEN 4 WHEN 'Premium + Scale Workshop' THEN 5
    END
  `);
  md.push(mdTable(p4result));

  // ── Panel 5: Revenue by Source ─────────────────────────────────────────────
  md.push(`## Panel 5: Revenue by Source\n`);
  md.push(`### Query Logic`);
  md.push(
    `Same as Panel 4 but grouped by \`billing_source\` instead of \`tier\`.\n`
  );

  md.push(`### Filter Funnel (row counts by billing_source)`);

  const p5counts = await q(`
    SELECT billing_source, COUNT(*)::int AS cnt
    FROM memberships
    WHERE status = 'Active' AND membership_type = 'Paying Member'
      AND billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
    GROUP BY billing_source ORDER BY billing_source
  `);
  md.push(mdTable(p5counts));

  md.push(`### Result (actual query)`);
  const p5result = await q(`
    WITH base AS (
      SELECT m.billing_source,
        CASE WHEN LOWER(m.currency) = 'usd' THEN m.mrr ELSE 0 END AS usd_mrr,
        CASE WHEN LOWER(m.currency) != 'usd' OR m.currency IS NULL THEN
          CASE WHEN m.tier = 'Standard' THEN 1000 WHEN m.tier = 'VIP' THEN 3000
               WHEN m.tier = 'VIP (Yearly)' THEN 36000 WHEN m.tier = 'Premium' THEN 8000 ELSE 0 END
        ELSE 0 END AS non_usd_normalized_mrr
      FROM memberships m
      WHERE m.status = 'Active' AND m.membership_type = 'Paying Member'
        AND m.billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
    ),
    by_source AS (
      SELECT billing_source, COALESCE(SUM(usd_mrr), 0) AS usd_mrr, COALESCE(SUM(non_usd_normalized_mrr), 0) AS non_usd_mrr
      FROM base GROUP BY billing_source
    ),
    with_total AS (
      SELECT billing_source, usd_mrr, non_usd_mrr, usd_mrr + non_usd_mrr AS total_mrr FROM by_source
      UNION ALL
      SELECT 'Total', COALESCE(SUM(usd_mrr),0), COALESCE(SUM(non_usd_mrr),0), COALESCE(SUM(usd_mrr),0) + COALESCE(SUM(non_usd_mrr),0) FROM by_source
    )
    SELECT billing_source, usd_mrr, non_usd_mrr, total_mrr,
      CASE WHEN billing_source = 'Total' THEN 100
        ELSE ROUND(total_mrr::numeric / NULLIF(SUM(CASE WHEN billing_source != 'Total' THEN total_mrr END) OVER (), 0) * 100, 1)
      END AS pct_of_total
    FROM with_total
    ORDER BY CASE billing_source
      WHEN 'Total' THEN 0 WHEN 'recharge' THEN 1 WHEN 'skool' THEN 2 WHEN 'stripe' THEN 3 ELSE 4
    END
  `);
  md.push(mdTable(p5result));

  // ── Panel 6: MoM Revenue ──────────────────────────────────────────────────
  md.push(`## Panel 6: Month-over-Month Revenue\n`);
  md.push(`### Query Logic`);
  md.push(
    `Groups Active Paying members by month (from billing_date) and billing_source, starting from 2026-02-01. Shows normalized MRR per month/source.\n`
  );

  md.push(`### Filter Funnel (row counts by month)`);

  const p6counts = await q(`
    SELECT TO_CHAR(DATE_TRUNC('month', billing_date::date), 'Mon YYYY') AS month, COUNT(*)::int AS cnt
    FROM memberships
    WHERE status = 'Active' AND membership_type = 'Paying Member'
      AND billing_date::date >= '2026-02-01'
    GROUP BY 1 ORDER BY MIN(billing_date::date)
  `);
  md.push(mdTable(p6counts));

  md.push(`### Result (actual query)`);
  const p6result = await q(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', m.billing_date::date), 'Mon YYYY') AS month_label,
      m.billing_source,
      COALESCE(SUM(
        CASE WHEN LOWER(m.currency) = 'usd' THEN m.mrr ELSE
          CASE WHEN m.tier = 'Standard' THEN 1000 WHEN m.tier = 'VIP' THEN 3000
               WHEN m.tier = 'VIP (Yearly)' THEN 36000 WHEN m.tier = 'Premium' THEN 8000 ELSE 0 END
        END
      ), 0) AS total_mrr
    FROM memberships m
    WHERE m.status = 'Active' AND m.membership_type = 'Paying Member'
      AND m.billing_date::date >= '2026-02-01'
    GROUP BY 1, DATE_TRUNC('month', m.billing_date::date), m.billing_source
    ORDER BY DATE_TRUNC('month', m.billing_date::date),
      CASE m.billing_source WHEN 'recharge' THEN 1 WHEN 'skool' THEN 2 WHEN 'stripe' THEN 3 ELSE 4 END
  `);
  md.push(mdTable(p6result));

  // ── Panel 7: Sold vs Collected ─────────────────────────────────────────────
  md.push(`## Panel 7: Sold vs Collected\n`);
  md.push(`### Query Logic`);
  md.push(
    `Starts from deals (where mrr IS NOT NULL and != 0, close_date >= 2026-02-01), joins through contact_deal -> contacts (Paying Member), then LEFT JOINs deal_membership -> memberships to classify each deal as Collected, Cancelled, Payment Failed, or No Billing Yet. Groups by close_date month.\n`
  );

  md.push(`### Filter Funnel`);

  const p7s1 = await qval(`SELECT COUNT(*)::int FROM deals WHERE mrr IS NOT NULL AND mrr != 0`);
  const p7s2 = await qval(
    `SELECT COUNT(*)::int FROM deals WHERE mrr IS NOT NULL AND mrr != 0 AND (close_date AT TIME ZONE 'America/Los_Angeles')::date >= '2026-02-01'`
  );
  const p7s3 = await qval(`
    SELECT COUNT(DISTINCT d.deal_id)::int
    FROM deals d
    JOIN contact_deal cd ON d.deal_id = cd.deal_id
    JOIN contacts c ON cd.contact_id = c.contact_id AND c.membership_type = 'Paying Member'
    WHERE d.mrr IS NOT NULL AND d.mrr != 0
      AND (d.close_date AT TIME ZONE 'America/Los_Angeles')::date >= '2026-02-01'
  `);

  md.push(`| Step | Filter | Row Count |`);
  md.push(`| --- | --- | --- |`);
  md.push(`| 1 | deals with mrr IS NOT NULL and != 0 | ${p7s1} |`);
  md.push(`| 2 | + close_date >= 2026-02-01 | ${p7s2} |`);
  md.push(`| 3 | + JOIN contact_deal + contacts (Paying Member) | ${p7s3} |\n`);

  md.push(`### Result (actual query)`);
  const p7result = await q(`
    WITH deal_memberships AS (
      SELECT
        TO_CHAR(DATE_TRUNC('month', (d.close_date AT TIME ZONE 'America/Los_Angeles')), 'Mon YYYY') AS close_month,
        DATE_TRUNC('month', (d.close_date AT TIME ZONE 'America/Los_Angeles')) AS sort_month,
        d.deal_id,
        CASE WHEN LOWER(d.currency) = 'usd' THEN d.mrr ELSE
          CASE WHEN d.tier = 'Standard' THEN 1000 WHEN d.tier = 'VIP' THEN 3000
               WHEN d.tier = 'VIP (Yearly)' THEN 36000 WHEN d.tier = 'Premium' THEN 8000 ELSE 0 END
        END AS deal_mrr,
        MAX(CASE WHEN m.status = 'Active' THEN 1 ELSE 0 END) AS has_active,
        MAX(CASE WHEN m.status = 'Cancellation' THEN 1 ELSE 0 END) AS has_cancellation,
        MAX(CASE WHEN m.status = 'Payment Failed' THEN 1 ELSE 0 END) AS has_payment_failed,
        MAX(CASE WHEN m.status IS NOT NULL THEN 1 ELSE 0 END) AS has_any_membership
      FROM deals d
      JOIN contact_deal cd ON d.deal_id = cd.deal_id
      JOIN contacts c ON cd.contact_id = c.contact_id AND c.membership_type = 'Paying Member'
      LEFT JOIN deal_membership dm ON d.deal_id = dm.deal_id
      LEFT JOIN memberships m ON dm.membership_id = m.membership_id
        AND m.membership_type = 'Paying Member'
        AND m.status IN ('Active', 'Cancellation', 'Payment Failed')
      WHERE d.mrr IS NOT NULL AND d.mrr != 0
        AND (d.close_date AT TIME ZONE 'America/Los_Angeles')::date >= '2026-02-01'
      GROUP BY 1, 2, 3, 4
    ),
    classified AS (
      SELECT *,
        CASE
          WHEN has_active = 1 THEN 'Collected'
          WHEN has_cancellation = 1 THEN 'Cancelled'
          WHEN has_payment_failed = 1 THEN 'Payment Failed'
          WHEN has_any_membership = 0 THEN 'No Billing Yet'
        END AS deal_status
      FROM deal_memberships
    )
    SELECT close_month, sort_month,
      COALESCE(SUM(deal_mrr), 0) AS closed_mrr,
      COALESCE(SUM(CASE WHEN deal_status = 'Collected' THEN deal_mrr ELSE 0 END), 0) AS collected_mrr,
      COALESCE(SUM(CASE WHEN deal_status = 'Cancelled' THEN deal_mrr ELSE 0 END), 0) AS cancelled_mrr,
      COALESCE(SUM(CASE WHEN deal_status = 'Payment Failed' THEN deal_mrr ELSE 0 END), 0) AS payment_failed_mrr,
      COALESCE(SUM(CASE WHEN deal_status = 'No Billing Yet' THEN deal_mrr ELSE 0 END), 0) AS no_billing_mrr,
      COUNT(*)::int AS deal_count
    FROM classified
    GROUP BY 1, 2
    ORDER BY 2
  `);
  md.push(
    mdTable(p7result, [
      "close_month",
      "closed_mrr",
      "collected_mrr",
      "cancelled_mrr",
      "payment_failed_mrr",
      "no_billing_mrr",
      "deal_count",
    ])
  );

  const dropP7 = Number(p7s2) - Number(p7s3);
  if (dropP7 > 0)
    issues.push(
      `Panel 7 (Sold vs Collected): ${dropP7} deals dropped by contact_deal/contacts join (${p7s2} -> ${p7s3}).`
    );

  // ── Panel 8: Churn Cohort ─────────────────────────────────────────────────
  md.push(`## Panel 8: Churn Cohort\n`);
  md.push(`### Query Logic`);
  md.push(
    `Starts from memberships (Active or Cancellation, Paying Member, billing_date >= 2026-02-01), LEFT JOINs deal_membership -> deals, groups by deal close_date month. Shows active MRR, cancellation MRR, and churn rate percentage per cohort. Note: the LEFT JOIN to deals plus a WHERE filter on close_date effectively makes it an INNER JOIN.\n`
  );

  md.push(`### Filter Funnel`);

  const p8s1 = await qval(`
    SELECT COUNT(*)::int FROM memberships
    WHERE status IN ('Active', 'Cancellation') AND membership_type = 'Paying Member'
      AND billing_date::date >= '2026-02-01'
  `);
  const p8s2 = await qval(`
    SELECT COUNT(*)::int FROM memberships m
    LEFT JOIN deal_membership dm ON m.membership_id = dm.membership_id
    LEFT JOIN deals d ON dm.deal_id = d.deal_id
    WHERE m.status IN ('Active', 'Cancellation') AND m.membership_type = 'Paying Member'
      AND m.billing_date::date >= '2026-02-01'
      AND (d.close_date AT TIME ZONE 'America/Los_Angeles')::date >= '2026-02-01'
  `);

  md.push(`| Step | Filter | Row Count |`);
  md.push(`| --- | --- | --- |`);
  md.push(`| 1 | Memberships: Active or Cancellation, Paying, billing_date >= 2026-02-01 | ${p8s1} |`);
  md.push(`| 2 | + LEFT JOIN deals with close_date >= 2026-02-01 | ${p8s2} |\n`);

  const dropP8 = Number(p8s1) - Number(p8s2);
  if (dropP8 > 0)
    issues.push(
      `Panel 8 (Churn Cohort): ${dropP8} memberships dropped because LEFT JOIN to deals + close_date filter acts as INNER JOIN (${p8s1} -> ${p8s2}).`
    );

  md.push(`### Result (actual query)`);
  const p8result = await q(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', (d.close_date AT TIME ZONE 'America/Los_Angeles')), 'Mon YYYY') AS close_month_cohort,
      COALESCE(SUM(CASE WHEN m.status = 'Active' THEN
        CASE WHEN LOWER(m.currency) = 'usd' THEN m.mrr ELSE
          CASE WHEN m.tier = 'Standard' THEN 1000 WHEN m.tier = 'VIP' THEN 3000
               WHEN m.tier = 'VIP (Yearly)' THEN 36000 WHEN m.tier = 'Premium' THEN 8000 ELSE 0 END
        END
      ELSE 0 END), 0) AS active_mrr,
      COALESCE(SUM(CASE WHEN m.status = 'Cancellation' THEN
        CASE WHEN LOWER(m.currency) = 'usd' THEN m.mrr ELSE
          CASE WHEN m.tier = 'Standard' THEN 1000 WHEN m.tier = 'VIP' THEN 3000
               WHEN m.tier = 'VIP (Yearly)' THEN 36000 WHEN m.tier = 'Premium' THEN 8000 ELSE 0 END
        END
      ELSE 0 END), 0) AS cancellation_mrr,
      ROUND(
        COALESCE(SUM(CASE WHEN m.status = 'Cancellation' THEN
          CASE WHEN LOWER(m.currency) = 'usd' THEN m.mrr ELSE
            CASE WHEN m.tier = 'Standard' THEN 1000 WHEN m.tier = 'VIP' THEN 3000
                 WHEN m.tier = 'VIP (Yearly)' THEN 36000 WHEN m.tier = 'Premium' THEN 8000 ELSE 0 END
          END
        ELSE 0 END), 0)::numeric
        / NULLIF(COALESCE(SUM(CASE WHEN m.status = 'Active' THEN
          CASE WHEN LOWER(m.currency) = 'usd' THEN m.mrr ELSE
            CASE WHEN m.tier = 'Standard' THEN 1000 WHEN m.tier = 'VIP' THEN 3000
                 WHEN m.tier = 'VIP (Yearly)' THEN 36000 WHEN m.tier = 'Premium' THEN 8000 ELSE 0 END
          END
        ELSE 0 END), 0), 0) * 100,
        2
      ) AS churn_rate_pct
    FROM memberships m
    LEFT JOIN deal_membership dm ON m.membership_id = dm.membership_id
    LEFT JOIN deals d ON dm.deal_id = d.deal_id
    WHERE m.status IN ('Active', 'Cancellation') AND m.membership_type = 'Paying Member'
      AND m.billing_date::date >= '2026-02-01'
      AND (d.close_date AT TIME ZONE 'America/Los_Angeles')::date >= '2026-02-01'
    GROUP BY 1, DATE_TRUNC('month', (d.close_date AT TIME ZONE 'America/Los_Angeles'))
    ORDER BY DATE_TRUNC('month', (d.close_date AT TIME ZONE 'America/Los_Angeles'))
  `);
  md.push(mdTable(p8result));

  // ════════════════════════════════════════════════════════════════════════════
  // Issues
  // ════════════════════════════════════════════════════════════════════════════

  md.push(`## Potential Issues Found\n`);
  if (issues.length === 0) {
    md.push(`No issues detected.\n`);
  } else {
    for (const issue of issues) {
      md.push(`- ${issue}`);
    }
    md.push("");
  }

  // Write output
  const output = md.join("\n");
  writeFileSync("docs/dashboard-data-audit.md", output, "utf-8");
  console.log(`Audit complete. Wrote docs/dashboard-data-audit.md (${output.length} chars)`);
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
