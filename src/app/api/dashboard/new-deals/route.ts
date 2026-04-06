import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get("view") ?? "mom";
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");

  try {
    if (view === "wow") {
      const result = startDate && endDate
        ? await sql`
            SELECT
              TO_CHAR((DATE_TRUNC('week', d.close_date + INTERVAL '1 day') - INTERVAL '1 day')::date, 'YYYY-MM-DD') AS period,
              COUNT(*)::int AS deal_count,
              SUM(d.mrr) AS sold_mrr
            FROM deals d
            WHERE d.close_date IS NOT NULL
              AND d.close_date >= ${startDate}::date
              AND d.close_date <= ${endDate}::date
            GROUP BY period
            ORDER BY period
          `
        : await sql`
            SELECT
              TO_CHAR((DATE_TRUNC('week', d.close_date + INTERVAL '1 day') - INTERVAL '1 day')::date, 'YYYY-MM-DD') AS period,
              COUNT(*)::int AS deal_count,
              SUM(d.mrr) AS sold_mrr
            FROM deals d
            WHERE d.close_date IS NOT NULL
              AND d.close_date >= CURRENT_DATE - INTERVAL '8 weeks'
            GROUP BY period
            ORDER BY period
          `;
      return NextResponse.json({ rows: result.rows }, { headers: { "Cache-Control": "no-store" } });
    }

    // MoM (default)
    const result = startDate && endDate
      ? await sql`
          SELECT
            TO_CHAR(d.close_date, 'YYYY-MM') AS period,
            COUNT(*)::int AS deal_count,
            SUM(d.mrr) AS sold_mrr
          FROM deals d
          WHERE d.close_date IS NOT NULL
            AND d.close_date >= ${startDate}::date
            AND d.close_date <= ${endDate}::date
          GROUP BY TO_CHAR(d.close_date, 'YYYY-MM')
          ORDER BY period
        `
      : await sql`
          SELECT
            TO_CHAR(d.close_date, 'YYYY-MM') AS period,
            COUNT(*)::int AS deal_count,
            SUM(d.mrr) AS sold_mrr
          FROM deals d
          WHERE d.close_date IS NOT NULL
          GROUP BY TO_CHAR(d.close_date, 'YYYY-MM')
          ORDER BY period
        `;
    return NextResponse.json({ rows: result.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    console.error("new-deals error:", error);
    return NextResponse.json({ error: "Failed to fetch new deals data" }, { status: 500 });
  }
}
