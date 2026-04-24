import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

function whereClauses(req: NextRequest): { sqlText: string; params: string[]; nextIdx: number } {
  const status = req.nextUrl.searchParams.get("status") ?? "active";
  const source = req.nextUrl.searchParams.get("source") ?? "all";
  const tier = req.nextUrl.searchParams.get("tier") ?? "all";
  const joinStart = req.nextUrl.searchParams.get("joinStart");
  const joinEnd = req.nextUrl.searchParams.get("joinEnd");

  const clauses: string[] = ["join_date IS NOT NULL"];
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
  const view = req.nextUrl.searchParams.get("view") ?? "mom";

  try {
    const { sqlText, params } = whereClauses(req);

    const truncExpr =
      view === "wow"
        ? "(DATE_TRUNC('week', join_date + INTERVAL '1 day') - INTERVAL '1 day')"
        : "DATE_TRUNC('month', join_date)";
    const labelExpr =
      view === "wow"
        ? "TO_CHAR((DATE_TRUNC('week', join_date + INTERVAL '1 day') - INTERVAL '1 day'), 'YYYY-MM-DD')"
        : "TO_CHAR(DATE_TRUNC('month', join_date), 'Mon YYYY')";

    const result = await sql.query(
      `
      SELECT
        ${labelExpr} AS period_label,
        ${truncExpr} AS period_key,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE band = 'at_risk')::int  AS at_risk,
        COUNT(*) FILTER (WHERE band = 'steady')::int   AS steady,
        COUNT(*) FILTER (WHERE band = 'champion')::int AS champion,
        ROUND(AVG(composite_score))::int AS avg_score
      FROM member_health_scored
      ${sqlText}
      GROUP BY period_label, period_key
      ORDER BY period_key
      `,
      params
    );

    const rows = result.rows.map((r) => ({
      period: r.period_label,
      period_key:
        r.period_key instanceof Date
          ? r.period_key.toISOString().slice(0, 10)
          : String(r.period_key),
      total: Number(r.total),
      at_risk: Number(r.at_risk),
      steady: Number(r.steady),
      champion: Number(r.champion),
      avg_score: Number(r.avg_score) || 0,
    }));

    return NextResponse.json(
      { rows, view },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("health-by-cohort error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
