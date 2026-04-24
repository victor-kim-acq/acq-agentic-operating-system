import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

const BAND_ORDER = ["dormant", "lukewarm", "engaged", "champion"] as const;

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

  const sqlText = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { sqlText, params };
}

export async function GET(req: NextRequest) {
  try {
    const { sqlText, params } = whereClauses(req);

    const result = await sql.query(
      `
      SELECT
        band,
        COUNT(*)::int AS count,
        ROUND(AVG(composite_score))::int AS avg_score
      FROM member_health_scored
      ${sqlText}
      GROUP BY band
      `,
      params
    );

    const total = result.rows.reduce((s, r) => s + Number(r.count), 0);
    const overall = await sql.query(
      `
      SELECT
        ROUND(AVG(composite_score))::int AS avg_score,
        MAX(refreshed_at) AS as_of
      FROM member_health_scored
      ${sqlText}
      `,
      params
    );

    const byBand = new Map(
      result.rows.map((r) => [
        r.band as string,
        { count: Number(r.count), avg_score: Number(r.avg_score) || 0 },
      ])
    );

    const buckets = BAND_ORDER.map((band) => {
      const cell = byBand.get(band) ?? { count: 0, avg_score: 0 };
      return {
        band,
        count: cell.count,
        pct:
          total > 0
            ? Math.round((cell.count / total) * 1000) / 10
            : 0,
        avg_score: cell.avg_score,
      };
    });

    return NextResponse.json(
      {
        buckets,
        total,
        avg_score: Number(overall.rows[0]?.avg_score) || 0,
        as_of: overall.rows[0]?.as_of ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("health-distribution error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
