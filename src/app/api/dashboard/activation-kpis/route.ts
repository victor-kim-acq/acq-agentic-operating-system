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
    req.nextUrl.searchParams.get("endDate") ??
    new Date().toISOString().slice(0, 10);
  const view = req.nextUrl.searchParams.get("view") ?? "mom"; // mom | wow

  try {
    const excludeEmails = loadExcludeEmails();
    const excludeValues =
      excludeEmails.length > 0
        ? excludeEmails
            .map((e) => `('${e.replace(/'/g, "''")}')`)
            .join(",")
        : "('__none__')";

    const truncExpr =
      view === "wow"
        ? "DATE_TRUNC('week', aj.joined_at)"
        : "DATE_TRUNC('month', aj.joined_at)";

    const periodFormat =
      view === "wow"
        ? "TO_CHAR(DATE_TRUNC('week', aj.joined_at), 'YYYY-MM-DD')"
        : "TO_CHAR(DATE_TRUNC('month', aj.joined_at), 'Mon YYYY')";

    const result = await sql.query(`
      WITH exclude_list AS (
        SELECT email FROM (VALUES ${excludeValues}) AS t(email)
      ),
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
      enriched AS (
        SELECT
          aj.*,
          ${truncExpr} AS period_key,
          ${periodFormat} AS period_label,
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
        period_label,
        period_key,

        /* Totals */
        COUNT(*) AS acquired,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS churned,

        /* 1. AI Activation */
        SUM(CASE WHEN ai_activated THEN 1 ELSE 0 END) AS ai_activated,
        SUM(CASE WHEN NOT ai_activated THEN 1 ELSE 0 END) AS ai_not_activated,
        ROUND(SUM(CASE WHEN ai_activated THEN 1 ELSE 0 END)::numeric
              / NULLIF(COUNT(*), 0) * 100, 1) AS ai_activation_rate,

        /* 2. Community Engagement */
        SUM(CASE WHEN engagement_15d >= 3 THEN 1 ELSE 0 END) AS community_engaged,
        SUM(CASE WHEN engagement_15d < 3 THEN 1 ELSE 0 END) AS community_not_engaged,
        ROUND(SUM(CASE WHEN engagement_15d >= 3 THEN 1 ELSE 0 END)::numeric
              / NULLIF(COUNT(*), 0) * 100, 1) AS community_engagement_rate,

        /* 3. At-Risk VIPs */
        SUM(CASE WHEN tier = 'VIP' AND NOT ai_activated THEN 1 ELSE 0 END) AS at_risk_vip,
        SUM(CASE WHEN tier = 'VIP' THEN 1 ELSE 0 END) AS total_vip,

        /* 4. Fully Activated (both signals) */
        SUM(CASE WHEN ai_activated AND engagement_15d >= 3 THEN 1 ELSE 0 END) AS fully_activated,
        ROUND(SUM(CASE WHEN ai_activated AND engagement_15d >= 3 THEN 1 ELSE 0 END)::numeric
              / NULLIF(COUNT(*), 0) * 100, 1) AS fully_activated_rate,

        /* 5. ACE/Recharge fully activated */
        SUM(CASE WHEN billing_source IN ('ACE','Recharge')
                  AND ai_activated AND engagement_15d >= 3 THEN 1 ELSE 0 END) AS ace_rech_fully_activated,
        SUM(CASE WHEN billing_source IN ('ACE','Recharge') THEN 1 ELSE 0 END) AS ace_rech_total,
        ROUND(
          SUM(CASE WHEN billing_source IN ('ACE','Recharge')
                    AND ai_activated AND engagement_15d >= 3 THEN 1 ELSE 0 END)::numeric
          / NULLIF(SUM(CASE WHEN billing_source IN ('ACE','Recharge') THEN 1 ELSE 0 END), 0) * 100, 1
        ) AS ace_rech_fully_activated_rate

      FROM with_all
      GROUP BY period_label, period_key
      ORDER BY period_key
    `);

    const rows = result.rows.map((r) => ({
      period: r.period_label,
      period_key: r.period_key,
      acquired: Number(r.acquired),
      churned: Number(r.churned),
      ai_activated: Number(r.ai_activated),
      ai_not_activated: Number(r.ai_not_activated),
      ai_activation_rate: Number(r.ai_activation_rate) || 0,
      community_engaged: Number(r.community_engaged),
      community_not_engaged: Number(r.community_not_engaged),
      community_engagement_rate: Number(r.community_engagement_rate) || 0,
      at_risk_vip: Number(r.at_risk_vip),
      total_vip: Number(r.total_vip),
      fully_activated: Number(r.fully_activated),
      fully_activated_rate: Number(r.fully_activated_rate) || 0,
      ace_rech_fully_activated: Number(r.ace_rech_fully_activated),
      ace_rech_total: Number(r.ace_rech_total),
      ace_rech_fully_activated_rate:
        Number(r.ace_rech_fully_activated_rate) || 0,
    }));

    return NextResponse.json(
      { rows },
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
