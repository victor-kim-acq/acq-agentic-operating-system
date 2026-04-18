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

function normalizeSource(src: string | null | undefined): string {
  if (!src || src === "") return "Unknown";
  return src;
}

interface MemberRow {
  source: string;
  tier: string;
  status: "active" | "cancelled";
  ai_activated: boolean;
  community_engaged: boolean;
}

interface Aggregate {
  total: number;
  churned: number;
  churn_pct: number;
}

function agg(rows: MemberRow[]): Aggregate {
  const total = rows.length;
  const churned = rows.filter((r) => r.status === "cancelled").length;
  const churn_pct =
    total > 0 ? Math.round((churned / total) * 1000) / 10 : 0;
  return { total, churned, churn_pct };
}

function segmentOf(r: MemberRow): string {
  if (r.ai_activated && r.community_engaged) return "ai_and_community";
  if (r.ai_activated && !r.community_engaged) return "ai_only";
  if (!r.ai_activated && r.community_engaged) return "community_only";
  return "neither";
}

export async function GET(req: NextRequest) {
  const startDate =
    req.nextUrl.searchParams.get("startDate") ?? "2026-03-01";
  const endDate =
    req.nextUrl.searchParams.get("endDate") ?? "2026-03-31";
  const lockedDate = req.nextUrl.searchParams.get("lockedDate");

  try {
    const excludeEmails = loadExcludeEmails();
    const excludeValues =
      excludeEmails.length > 0
        ? excludeEmails
            .map((e) => `('${e.replace(/'/g, "''")}')`)
            .join(",")
        : "('__none__')";

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
          ) >= 3 AS community_engaged
        FROM with_ai wa
      )
      SELECT
        billing_source,
        tier,
        status,
        ai_activated,
        community_engaged
      FROM with_all
    `);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: MemberRow[] = result.rows.map((r: any) => ({
      source: normalizeSource(r.billing_source),
      tier: r.tier || "Unknown",
      status: r.status,
      ai_activated: r.ai_activated === true,
      community_engaged: r.community_engaged === true,
    }));

    // --- Headline ---
    const aiActivatedRows = rows.filter((r) => r.ai_activated);
    const communityEngagedRows = rows.filter((r) => r.community_engaged);
    const fullyActivatedRows = rows.filter(
      (r) => r.ai_activated && r.community_engaged
    );

    const rate = (num: number, denom: number) =>
      denom > 0 ? Math.round((num / denom) * 1000) / 10 : 0;

    const headline = {
      ai_activated: aiActivatedRows.length,
      ai_not_activated: rows.length - aiActivatedRows.length,
      ai_activation_rate: rate(aiActivatedRows.length, rows.length),
      community_engaged: communityEngagedRows.length,
      community_not_engaged: rows.length - communityEngagedRows.length,
      community_engagement_rate: rate(
        communityEngagedRows.length,
        rows.length
      ),
      fully_activated: fullyActivatedRows.length,
      fully_activated_rate: rate(fullyActivatedRows.length, rows.length),
    };

    // --- By source ---
    const sourceNames = ["Skool", "ACE", "Recharge", "Unknown"];
    const by_source = sourceNames.map((source) => {
      const bucket = rows.filter((r) => r.source === source);
      const base = agg(bucket);
      const aiAct = bucket.filter((r) => r.ai_activated).length;
      const commEng = bucket.filter((r) => r.community_engaged).length;
      const countSegment = (segName: string) =>
        bucket.filter((r) => segmentOf(r) === segName).length;
      return {
        source,
        ...base,
        ai_activated: aiAct,
        ai_not_activated: bucket.length - aiAct,
        community_engaged: commEng,
        community_not_engaged: bucket.length - commEng,
        ai_and_community: countSegment("ai_and_community"),
        ai_only: countSegment("ai_only"),
        community_only: countSegment("community_only"),
        neither: countSegment("neither"),
      };
    });

    // --- By tier ---
    const tiers = Array.from(new Set(rows.map((r) => r.tier))).sort();
    const by_tier = tiers.map((tier) => ({
      tier,
      ...agg(rows.filter((r) => r.tier === tier)),
    }));

    // --- Combined matrix (overall segments) ---
    const segments = [
      "ai_and_community",
      "ai_only",
      "community_only",
      "neither",
    ];
    const combined_matrix = segments.map((segment) => ({
      segment,
      ...agg(rows.filter((r) => segmentOf(r) === segment)),
    }));

    const total_churned = rows.filter((r) => r.status === "cancelled").length;
    const meta = {
      start_date: startDate,
      end_date: endDate,
      locked_date: lockedDate ?? null,
      queried_at: new Date().toISOString(),
      total_members: rows.length,
      total_churned,
      churn_rate_pct: rate(total_churned, rows.length),
    };

    return NextResponse.json(
      { meta, headline, by_source, by_tier, combined_matrix },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Retention cohort error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
