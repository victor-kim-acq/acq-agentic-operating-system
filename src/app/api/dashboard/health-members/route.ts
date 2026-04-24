import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

// Single endpoint for member-level drill-down across all the /agents/health
// chart cards. Callers pick the slice they need via query params:
//   - band=at_risk | steady | champion | all (default: all)
//   - sort=score_asc | score_desc | silent_desc | joined_desc (default: score_asc)
//   - limit (default 1000, cap 2000)

function whereClauses(req: NextRequest): { sqlText: string; params: string[]; nextIdx: number } {
  const status = req.nextUrl.searchParams.get("status") ?? "active";
  const source = req.nextUrl.searchParams.get("source") ?? "all";
  const tier = req.nextUrl.searchParams.get("tier") ?? "all";
  const joinStart = req.nextUrl.searchParams.get("joinStart");
  const joinEnd = req.nextUrl.searchParams.get("joinEnd");
  const band = req.nextUrl.searchParams.get("band") ?? "all";

  const clauses: string[] = [];
  const params: string[] = [];
  let i = 1;

  if (status !== "all") {
    clauses.push(`member_status = $${i++}`);
    params.push(status);
  }
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
  if (band !== "all") {
    clauses.push(`band = $${i++}`);
    params.push(band);
  }

  return {
    sqlText: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
    nextIdx: i,
  };
}

function orderByClause(sort: string): string {
  switch (sort) {
    case "score_desc":
      return "ORDER BY composite_score DESC, days_since_last_post DESC NULLS FIRST";
    case "silent_desc":
      return "ORDER BY days_since_last_post DESC NULLS FIRST, composite_score ASC";
    case "joined_desc":
      return "ORDER BY join_date DESC NULLS LAST, composite_score DESC";
    case "score_asc":
    default:
      return "ORDER BY composite_score ASC, days_since_last_post DESC NULLS FIRST";
  }
}

export async function GET(req: NextRequest) {
  const sort = req.nextUrl.searchParams.get("sort") ?? "score_asc";
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "1000");
  const limit = Math.max(1, Math.min(2000, isNaN(limitRaw) ? 1000 : limitRaw));

  try {
    const { sqlText, params, nextIdx } = whereClauses(req);

    const result = await sql.query(
      `
      SELECT
        skool_user_id,
        email,
        full_name,
        COALESCE(billing_source, 'Founding Members') AS source,
        tier,
        member_status,
        TO_CHAR(join_date, 'YYYY-MM-DD')             AS joined_at,
        band,
        composite_score,
        days_since_join,
        days_since_last_post,
        ai_activated,
        ai_total_chats,
        total_posts,
        total_comments,
        total_upvotes_received,
        courses_started,
        courses_completed,
        has_completed_onboarding,
        revenue_verified
      FROM member_health_scored
      ${sqlText}
      ${orderByClause(sort)}
      LIMIT $${nextIdx}
      `,
      [...params, String(limit)]
    );

    const rows = result.rows.map((r) => ({
      skool_user_id: r.skool_user_id as string,
      email: (r.email as string) ?? "",
      full_name: (r.full_name as string) ?? "",
      source: r.source as string,
      tier: (r.tier as string) ?? "Unknown",
      member_status: r.member_status as string,
      joined_at: (r.joined_at as string) ?? "",
      band: r.band as string,
      composite_score: Number(r.composite_score) || 0,
      days_since_join: r.days_since_join == null ? null : Number(r.days_since_join),
      days_since_last_post:
        r.days_since_last_post == null ? null : Number(r.days_since_last_post),
      ai_activated: !!r.ai_activated,
      ai_total_chats: Number(r.ai_total_chats) || 0,
      total_posts: Number(r.total_posts) || 0,
      total_comments: Number(r.total_comments) || 0,
      total_upvotes_received: Number(r.total_upvotes_received) || 0,
      courses_started: Number(r.courses_started) || 0,
      courses_completed: Number(r.courses_completed) || 0,
      has_completed_onboarding: !!r.has_completed_onboarding,
      revenue_verified: !!r.revenue_verified,
    }));

    return NextResponse.json(
      { rows, total: rows.length, limit },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("health-members error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
