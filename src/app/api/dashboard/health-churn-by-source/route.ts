import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

// Churn rate by billing source, cut by retention-framework rescue signals
// (verified revenue, onboarding completed) and membership tier.
//
// Formula: cancelled ÷ (active + cancelled) for each source × segment cell.
// Denominator always includes both statuses — the page-level `status` filter
// is intentionally ignored here because a churn-rate chart needs both.

const ROW_ORDER = ["ACE", "Recharge", "Skool", "Founding Members"] as const;

function whereClauses(req: NextRequest): { sqlText: string; params: string[] } {
  const source = req.nextUrl.searchParams.get("source") ?? "all";
  const tier = req.nextUrl.searchParams.get("tier") ?? "all";
  const joinStart = req.nextUrl.searchParams.get("joinStart");
  const joinEnd = req.nextUrl.searchParams.get("joinEnd");

  // status filter intentionally NOT applied — churn rate needs both.
  const clauses: string[] = ["member_status IN ('active','cancelled')"];
  const params: string[] = [];
  let i = 1;

  if (source !== "all") {
    clauses.push(`billing_source = $${i++}`);
    params.push(source);
  }
  if (tier !== "all") {
    clauses.push(`tier = $${i++}`);
    params.push(tier);
  }
  if (joinStart) {
    clauses.push(`join_date >= $${i++}`);
    params.push(joinStart);
  }
  if (joinEnd) {
    clauses.push(`join_date < ($${i++}::date + INTERVAL '1 day')`);
    params.push(joinEnd);
  }

  return {
    sqlText: `WHERE ${clauses.join(" AND ")}`,
    params,
  };
}

function rate(cancelled: number, total: number): number | null {
  if (!total) return null;
  return Math.round((cancelled / total) * 1000) / 10;
}

export async function GET(req: NextRequest) {
  try {
    const { sqlText, params } = whereClauses(req);

    const result = await sql.query(
      `
      WITH scoped AS (
        SELECT
          COALESCE(billing_source, 'Founding Members') AS source,
          member_status,
          tier,
          has_completed_onboarding,
          revenue_verified
        FROM member_health_scored
        ${sqlText}
      )
      SELECT
        source,
        COUNT(*)::int                                                                  AS total_all,
        COUNT(*) FILTER (WHERE member_status = 'cancelled')::int                       AS cancelled_all,

        COUNT(*) FILTER (WHERE revenue_verified)::int                                  AS verified_total,
        COUNT(*) FILTER (WHERE revenue_verified AND member_status='cancelled')::int    AS verified_cancelled,
        COUNT(*) FILTER (WHERE NOT revenue_verified)::int                              AS notverified_total,
        COUNT(*) FILTER (WHERE NOT revenue_verified AND member_status='cancelled')::int AS notverified_cancelled,

        COUNT(*) FILTER (WHERE has_completed_onboarding)::int                          AS onboard_total,
        COUNT(*) FILTER (WHERE has_completed_onboarding AND member_status='cancelled')::int AS onboard_cancelled,
        COUNT(*) FILTER (WHERE NOT has_completed_onboarding)::int                      AS notonboard_total,
        COUNT(*) FILTER (WHERE NOT has_completed_onboarding AND member_status='cancelled')::int AS notonboard_cancelled,

        COUNT(*) FILTER (WHERE tier='standard')::int                                   AS standard_total,
        COUNT(*) FILTER (WHERE tier='standard' AND member_status='cancelled')::int     AS standard_cancelled,
        COUNT(*) FILTER (WHERE tier='vip')::int                                        AS vip_total,
        COUNT(*) FILTER (WHERE tier='vip' AND member_status='cancelled')::int          AS vip_cancelled,
        COUNT(*) FILTER (WHERE tier='premium')::int                                    AS premium_total,
        COUNT(*) FILTER (WHERE tier='premium' AND member_status='cancelled')::int      AS premium_cancelled
      FROM scoped
      GROUP BY source
      `,
      params
    );

    const bySource = new Map(result.rows.map((r) => [r.source as string, r]));

    const rows = ROW_ORDER.filter((s) => bySource.has(s)).map((s) => {
      const r = bySource.get(s)!;
      return {
        source: s,
        total: Number(r.total_all),
        cancelled: Number(r.cancelled_all),
        overall_churn: rate(Number(r.cancelled_all), Number(r.total_all)),

        verified_churn: rate(Number(r.verified_cancelled), Number(r.verified_total)),
        verified_n: Number(r.verified_total),
        notverified_churn: rate(
          Number(r.notverified_cancelled),
          Number(r.notverified_total)
        ),
        notverified_n: Number(r.notverified_total),

        onboard_churn: rate(Number(r.onboard_cancelled), Number(r.onboard_total)),
        onboard_n: Number(r.onboard_total),
        notonboard_churn: rate(
          Number(r.notonboard_cancelled),
          Number(r.notonboard_total)
        ),
        notonboard_n: Number(r.notonboard_total),

        standard_churn: rate(Number(r.standard_cancelled), Number(r.standard_total)),
        standard_n: Number(r.standard_total),
        vip_churn: rate(Number(r.vip_cancelled), Number(r.vip_total)),
        vip_n: Number(r.vip_total),
        premium_churn: rate(Number(r.premium_cancelled), Number(r.premium_total)),
        premium_n: Number(r.premium_total),
      };
    });

    return NextResponse.json(
      { rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("health-churn-by-source error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
