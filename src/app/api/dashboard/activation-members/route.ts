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
  const startDate = req.nextUrl.searchParams.get("startDate") ?? "2026-03-01";
  const endDate =
    req.nextUrl.searchParams.get("endDate") ??
    new Date().toISOString().slice(0, 10);
  const lockedDate = req.nextUrl.searchParams.get("lockedDate");
  const effectiveEnd =
    lockedDate && lockedDate < endDate ? lockedDate : endDate;

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
      all_joiners AS (
        SELECT DISTINCT ON (LOWER(email))
          LOWER(email) AS email,
          joined_at,
          user_id,
          name
        FROM (
          SELECT LOWER(email) AS email, join_date AS joined_at, user_id,
                 COALESCE(full_name, email) AS name
          FROM skool_members
          WHERE join_date >= '${startDate}' AND join_date < ('${effectiveEnd}'::date + INTERVAL '1 day')
            AND LOWER(email) NOT IN (SELECT email FROM exclude_list)
          UNION ALL
          SELECT LOWER(email), approved_at, skool_user_id,
                 COALESCE(first_name || ' ' || last_name, email) AS name
          FROM skool_cancellations
          WHERE approved_at >= '${startDate}' AND approved_at < ('${effectiveEnd}'::date + INTERVAL '1 day')
            AND LOWER(email) NOT IN (SELECT email FROM exclude_list)
        ) combined
        ORDER BY LOWER(email), joined_at ASC
      ),
      enriched AS (
        SELECT
          aj.*,
          CASE WHEN EXISTS (
            SELECT 1 FROM skool_cancellations sc WHERE LOWER(sc.email) = aj.email
          ) THEN 'cancelled' ELSE 'active' END AS status,
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
          ) AS billing_source,
          (SELECT d.mrr FROM contact_deal cd
           JOIN deals d ON cd.deal_id = d.deal_id
           JOIN contact_emails ce ON cd.contact_id = ce.contact_id
           WHERE LOWER(ce.email) = aj.email
           ORDER BY d.close_date DESC LIMIT 1
          ) AS mrr
        FROM all_joiners aj
      )
      SELECT
        e.email,
        e.name,
        TO_CHAR(e.joined_at, 'YYYY-MM-DD') AS joined_at,
        e.tier,
        e.billing_source,
        e.mrr,
        e.status,
        CASE WHEN (
          SELECT aai.active_days_week1 FROM acq_ai_usage aai WHERE LOWER(aai.email) = e.email
        ) >= 2 OR (e.contact_id IS NOT NULL AND (
          SELECT aai.active_days_week1 FROM acq_ai_usage aai
          JOIN contact_emails ce2 ON LOWER(aai.email) = LOWER(ce2.email)
          WHERE ce2.contact_id = e.contact_id LIMIT 1
        ) >= 2) THEN true ELSE false END AS ai_activated,
        (
          (SELECT COUNT(*) FROM skool_posts sp
           WHERE sp.author_id = e.user_id
             AND sp.created_at BETWEEN e.joined_at AND e.joined_at + INTERVAL '15 days')
          +
          (SELECT COUNT(*) FROM skool_comments sc
           WHERE sc.author_id = e.user_id
             AND sc.created_at BETWEEN e.joined_at AND e.joined_at + INTERVAL '15 days')
        ) >= 3 AS community_engaged
      FROM enriched e
      ORDER BY e.joined_at DESC, e.email
    `);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = result.rows.map((r: any) => ({
      email: r.email,
      name: r.name,
      joined_at: r.joined_at,
      tier: r.tier,
      billing_source: r.billing_source,
      mrr: Number(r.mrr) || 0,
      status: r.status,
      ai_activated: r.ai_activated,
      community_engaged: r.community_engaged,
      fully_activated: r.ai_activated && r.community_engaged,
    }));

    return NextResponse.json(
      { rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Activation members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
