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
              TO_CHAR((DATE_TRUNC('week', m.billing_date::date + 1) - INTERVAL '1 day')::date, 'YYYY-MM-DD') AS period,
              SUM(CASE WHEN m.status = 'Active' THEN m.mrr ELSE 0 END) AS active_mrr,
              SUM(CASE WHEN m.status = 'Cancellation' THEN m.mrr ELSE 0 END) AS cancelled_mrr,
              COALESCE(ROUND(
                SUM(CASE WHEN m.status = 'Cancellation' THEN m.mrr ELSE 0 END) * 100.0 /
                NULLIF(SUM(CASE WHEN m.status = 'Active' THEN m.mrr ELSE 0 END), 0)
              , 2), 0) AS churn_rate_pct
            FROM memberships m
            WHERE m.mrr > 0
              AND m.billing_date >= ${startDate}
              AND m.billing_date <= ${endDate}
            GROUP BY period
            ORDER BY period
          `
        : await sql`
            SELECT
              TO_CHAR((DATE_TRUNC('week', m.billing_date::date + 1) - INTERVAL '1 day')::date, 'YYYY-MM-DD') AS period,
              SUM(CASE WHEN m.status = 'Active' THEN m.mrr ELSE 0 END) AS active_mrr,
              SUM(CASE WHEN m.status = 'Cancellation' THEN m.mrr ELSE 0 END) AS cancelled_mrr,
              COALESCE(ROUND(
                SUM(CASE WHEN m.status = 'Cancellation' THEN m.mrr ELSE 0 END) * 100.0 /
                NULLIF(SUM(CASE WHEN m.status = 'Active' THEN m.mrr ELSE 0 END), 0)
              , 2), 0) AS churn_rate_pct
            FROM memberships m
            WHERE m.mrr > 0
              AND m.billing_date::date >= CURRENT_DATE - INTERVAL '8 weeks'
            GROUP BY period
            ORDER BY period
          `;
      return NextResponse.json({ rows: result.rows }, { headers: { "Cache-Control": "no-store" } });
    }

    // MoM (default)
    const result = startDate && endDate
      ? await sql`
          SELECT
            LEFT(m.billing_date, 7) AS period,
            SUM(CASE WHEN m.status = 'Active' THEN m.mrr ELSE 0 END) AS active_mrr,
            SUM(CASE WHEN m.status = 'Cancellation' THEN m.mrr ELSE 0 END) AS cancelled_mrr,
            COALESCE(ROUND(
              SUM(CASE WHEN m.status = 'Cancellation' THEN m.mrr ELSE 0 END) * 100.0 /
              NULLIF(SUM(CASE WHEN m.status = 'Active' THEN m.mrr ELSE 0 END), 0)
            , 2), 0) AS churn_rate_pct
          FROM memberships m
          WHERE m.mrr > 0
            AND m.billing_date IS NOT NULL
            AND LENGTH(m.billing_date) >= 7
            AND m.billing_date >= ${startDate}
            AND m.billing_date <= ${endDate}
          GROUP BY LEFT(m.billing_date, 7)
          ORDER BY period
        `
      : await sql`
          SELECT
            LEFT(m.billing_date, 7) AS period,
            SUM(CASE WHEN m.status = 'Active' THEN m.mrr ELSE 0 END) AS active_mrr,
            SUM(CASE WHEN m.status = 'Cancellation' THEN m.mrr ELSE 0 END) AS cancelled_mrr,
            COALESCE(ROUND(
              SUM(CASE WHEN m.status = 'Cancellation' THEN m.mrr ELSE 0 END) * 100.0 /
              NULLIF(SUM(CASE WHEN m.status = 'Active' THEN m.mrr ELSE 0 END), 0)
            , 2), 0) AS churn_rate_pct
          FROM memberships m
          WHERE m.mrr > 0
            AND m.billing_date IS NOT NULL
            AND LENGTH(m.billing_date) >= 7
          GROUP BY LEFT(m.billing_date, 7)
          ORDER BY period
        `;
    return NextResponse.json({ rows: result.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    console.error("revenue-churn error:", error);
    return NextResponse.json({ error: "Failed to fetch revenue/churn data" }, { status: 500 });
  }
}
