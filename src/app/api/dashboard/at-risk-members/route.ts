import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

function whereClauses(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "active";
  const source = req.nextUrl.searchParams.get("source") ?? "all";
  const tier = req.nextUrl.searchParams.get("tier") ?? "all";
  const joinStart = req.nextUrl.searchParams.get("joinStart");
  const joinEnd = req.nextUrl.searchParams.get("joinEnd");

  const clauses: string[] = ["band = 'at_risk'"];
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

  return { sqlText: `WHERE ${clauses.join(" AND ")}`, params, nextIdx: i };
}

export async function GET(req: NextRequest) {
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "100");
  const limit = Math.max(1, Math.min(500, isNaN(limitRaw) ? 100 : limitRaw));

  try {
    const { sqlText, params, nextIdx } = whereClauses(req);

    const [listResult, countResult] = await Promise.all([
      sql.query(
        `
        SELECT
          skool_user_id,
          email,
          full_name,
          tier,
          billing_source,
          member_status,
          TO_CHAR(join_date, 'YYYY-MM-DD')     AS joined_at,
          composite_score,
          days_since_join,
          days_since_last_post,
          ai_activated
        FROM member_health_scored
        ${sqlText}
        ORDER BY
          days_since_last_post DESC NULLS FIRST,
          composite_score ASC
        LIMIT $${nextIdx}
        `,
        [...params, String(limit)]
      ),
      sql.query(
        `SELECT COUNT(*)::int AS total FROM member_health_scored ${sqlText}`,
        params
      ),
    ]);

    const rows = listResult.rows.map((r) => ({
      skool_user_id: r.skool_user_id as string,
      email: (r.email as string) ?? "",
      full_name: (r.full_name as string) ?? "",
      tier: (r.tier as string) ?? "Unknown",
      billing_source: (r.billing_source as string) ?? null,
      member_status: (r.member_status as string) ?? "active",
      joined_at: (r.joined_at as string) ?? "",
      composite_score: Number(r.composite_score) || 0,
      days_since_join: r.days_since_join == null ? null : Number(r.days_since_join),
      days_since_last_post:
        r.days_since_last_post == null ? null : Number(r.days_since_last_post),
      ai_activated: !!r.ai_activated,
    }));

    return NextResponse.json(
      {
        rows,
        total: Number(countResult.rows[0]?.total) || 0,
        limit,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("at-risk-members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
