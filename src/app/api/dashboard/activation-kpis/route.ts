import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { readFileSync } from "fs";
import { join } from "path";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

function loadExcludeEmails(): string[] {
  try {
    const csv = readFileSync(join(process.cwd(), "exclude.csv"), "utf8");
    return csv
      .split("\n")
      .slice(1)
      .map((line) => {
        const parts = line.split(",");
        return parts[2]?.trim()?.toLowerCase();
      })
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const startDate =
    req.nextUrl.searchParams.get("startDate") ?? "2026-03-01";
  const endDate =
    req.nextUrl.searchParams.get("endDate") ?? new Date().toISOString().slice(0, 10);

  try {
    const excludeEmails = loadExcludeEmails();
    const excludeValues =
      excludeEmails.length > 0
        ? excludeEmails.map((e) => `('${e.replace(/'/g, "''")}')`).join(",")
        : "('__none__')";

    const result = await sql.query(`
      WITH exclude_list AS (
        SELECT email FROM (VALUES ${excludeValues}) AS t(email)
      ),
      /* ── Base: all Skool joiners in the date range ── */
      all_joiners AS (
        SELECT LOWER(email) AS email, join_date AS joined_at, 'active' AS status, user_id
        FROM skool_members
        WHERE join_date >= '${startDate}' AND join_date < ('${endDate}'::date + INTERVAL '1 day')
          AND LOWER(email) NOT IN (SELECT email FROM exclude_list)
        UNION ALL
        SELECT LOWER(email), approved_at, 'cancelled', skool_user_id
        FROM skool_cancellations
        WHERE approved_at >= '${startDate}' AND approved_at < ('${endDate}'::date + INTERVAL '1 day')
          AND LOWER(email) NOT IN (SELECT email FROM exclude_list)
      ),
      /* ── Enrich with contact_id, tier, billing_source ── */
      enriched AS (
        SELECT
          aj.email, aj.joined_at, aj.status, aj.user_id,
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
      /* ── AI activation: 2+ active days in week 1 ── */
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
      /* ── Community engagement: 3+ posts/comments in first 15 days ── */
      with_all AS (
        SELECT wa.*,
          (SELECT COUNT(*) FROM skool_posts sp
           WHERE sp.author_id = wa.user_id
             AND sp.created_at BETWEEN wa.joined_at AND wa.joined_at + INTERVAL '15 days')
          +
          (SELECT COUNT(*) FROM skool_comments sc
           WHERE sc.author_id = wa.user_id
             AND sc.created_at BETWEEN wa.joined_at AND wa.joined_at + INTERVAL '15 days')
          AS engagement_15d
        FROM with_ai wa
      )
      SELECT
        /* 1. AI Activation Rate */
        COUNT(*) AS total_acquired,
        SUM(CASE WHEN ai_activated THEN 1 ELSE 0 END) AS ai_activated_count,
        ROUND(SUM(CASE WHEN ai_activated THEN 1 ELSE 0 END)::numeric
              / NULLIF(COUNT(*), 0) * 100, 1) AS ai_activation_rate,

        /* 2. Community Engagement Gap */
        SUM(CASE WHEN engagement_15d >= 3 THEN 1 ELSE 0 END) AS community_engaged_count,
        SUM(CASE WHEN engagement_15d < 3 THEN 1 ELSE 0 END) AS community_gap_count,
        ROUND(SUM(CASE WHEN engagement_15d < 3 THEN 1 ELSE 0 END)::numeric
              / NULLIF(COUNT(*), 0) * 100, 1) AS community_gap_pct,

        /* 3. At-Risk VIP Count */
        SUM(CASE WHEN tier = 'VIP' AND NOT ai_activated THEN 1 ELSE 0 END) AS at_risk_vip_count,
        SUM(CASE WHEN tier = 'VIP' THEN 1 ELSE 0 END) AS total_vip_count,

        /* 4. Fully Activated Rate (both signals) */
        SUM(CASE WHEN ai_activated AND engagement_15d >= 3 THEN 1 ELSE 0 END) AS fully_activated_count,
        ROUND(SUM(CASE WHEN ai_activated AND engagement_15d >= 3 THEN 1 ELSE 0 END)::numeric
              / NULLIF(COUNT(*), 0) * 100, 1) AS fully_activated_rate,

        /* 5. ACE/Recharge fully activated rate */
        SUM(CASE WHEN billing_source IN ('ACE','Recharge')
                  AND ai_activated AND engagement_15d >= 3 THEN 1 ELSE 0 END) AS ace_rech_fully_activated,
        SUM(CASE WHEN billing_source IN ('ACE','Recharge') THEN 1 ELSE 0 END) AS ace_rech_total,
        ROUND(
          SUM(CASE WHEN billing_source IN ('ACE','Recharge')
                    AND ai_activated AND engagement_15d >= 3 THEN 1 ELSE 0 END)::numeric
          / NULLIF(SUM(CASE WHEN billing_source IN ('ACE','Recharge') THEN 1 ELSE 0 END), 0) * 100, 1
        ) AS ace_rech_fully_activated_rate,

        /* Churn context */
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS total_churned,
        ROUND(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)::numeric
              / NULLIF(COUNT(*), 0) * 100, 1) AS churn_rate
      FROM with_all
    `);

    const row = result.rows[0];

    return NextResponse.json(
      {
        total_acquired: Number(row.total_acquired),
        ai_activation_rate: Number(row.ai_activation_rate) || 0,
        ai_activated_count: Number(row.ai_activated_count),
        community_engaged_count: Number(row.community_engaged_count),
        community_gap_count: Number(row.community_gap_count),
        community_gap_pct: Number(row.community_gap_pct) || 0,
        at_risk_vip_count: Number(row.at_risk_vip_count),
        total_vip_count: Number(row.total_vip_count),
        fully_activated_rate: Number(row.fully_activated_rate) || 0,
        fully_activated_count: Number(row.fully_activated_count),
        ace_rech_fully_activated_rate: Number(row.ace_rech_fully_activated_rate) || 0,
        ace_rech_fully_activated: Number(row.ace_rech_fully_activated),
        ace_rech_total: Number(row.ace_rech_total),
        total_churned: Number(row.total_churned),
        churn_rate: Number(row.churn_rate) || 0,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Activation KPIs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
