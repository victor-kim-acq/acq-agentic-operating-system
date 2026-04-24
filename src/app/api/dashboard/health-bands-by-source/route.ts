import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

const ROW_ORDER = ["ACE", "Recharge", "Skool", "Founding Members"] as const;

function whereClauses(req: NextRequest): { sqlText: string; params: string[] } {
  const status = req.nextUrl.searchParams.get("status") ?? "active";
  const source = req.nextUrl.searchParams.get("source") ?? "all";
  const tier = req.nextUrl.searchParams.get("tier") ?? "all";
  const joinStart = req.nextUrl.searchParams.get("joinStart");
  const joinEnd = req.nextUrl.searchParams.get("joinEnd");

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

  return {
    sqlText: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { sqlText, params } = whereClauses(req);

    // COALESCE(billing_source, NULL) is null for Unknown; we surface them as
    // "Founding Members" in the API response because ~80% of them are pre-Feb
    // 2026 joiners whose billing_source never enriched.
    const result = await sql.query(
      `
      SELECT
        COALESCE(billing_source, 'Founding Members')             AS source,
        COUNT(*) FILTER (WHERE band = 'at_risk')::int            AS at_risk,
        COUNT(*) FILTER (WHERE band = 'steady')::int             AS steady,
        COUNT(*) FILTER (WHERE band = 'champion')::int           AS champion,
        COUNT(*)::int                                            AS total,
        ROUND(AVG(composite_score))::int                         AS avg_score,
        MAX(refreshed_at)                                        AS as_of
      FROM member_health_scored
      ${sqlText}
      GROUP BY 1
      `,
      params
    );

    const bySource = new Map(result.rows.map((r) => [r.source as string, r]));
    const rows = ROW_ORDER.filter((s) => bySource.has(s)).map((s) => {
      const r = bySource.get(s)!;
      return {
        source: s,
        at_risk: Number(r.at_risk),
        steady: Number(r.steady),
        champion: Number(r.champion),
        total: Number(r.total),
        avg_score: Number(r.avg_score) || 0,
      };
    });

    const total = rows.reduce((s, r) => s + r.total, 0);
    const weightedAvg =
      total > 0
        ? Math.round(rows.reduce((s, r) => s + r.avg_score * r.total, 0) / total)
        : 0;

    const totals = {
      source: "All",
      at_risk: rows.reduce((s, r) => s + r.at_risk, 0),
      steady: rows.reduce((s, r) => s + r.steady, 0),
      champion: rows.reduce((s, r) => s + r.champion, 0),
      total,
      avg_score: weightedAvg,
    };

    // as_of for display
    const asOf =
      result.rows.map((r) => r.as_of).filter(Boolean).sort().pop() ?? null;

    return NextResponse.json(
      { rows, totals, as_of: asOf },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("health-bands-by-source error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
