import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");

  try {
    const dateFilterStart = startDate ?? '2026-02-01';
    const dateFilterEnd = endDate ?? '2099-12-31';

    const result = await sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', m.billing_date::date), 'Mon YYYY') AS month_label,
        DATE_TRUNC('month', m.billing_date::date) AS sort_month,
        m.billing_source,
        COALESCE(SUM(
          CASE
            WHEN LOWER(m.currency) = 'usd' THEN m.mrr
            ELSE CASE
              WHEN m.tier = 'Standard' THEN 1000
              WHEN m.tier = 'VIP' THEN 3000
              WHEN m.tier = 'VIP (Yearly)' THEN 36000
              WHEN m.tier = 'Premium' THEN 8000
              WHEN m.tier = 'Premium + Scale Workshop' THEN 8000
              ELSE 0
            END
          END
        ), 0) AS total_mrr
      FROM memberships m
      WHERE m.status = 'Active'
        AND m.membership_type = 'Paying Member'
        AND m.billing_date >= ${dateFilterStart}
        AND m.billing_date <= ${dateFilterEnd}
      GROUP BY 1, 2, 3
      ORDER BY 2, CASE m.billing_source
        WHEN 'recharge' THEN 1 WHEN 'skool' THEN 2 WHEN 'stripe' THEN 3 ELSE 4
      END
    `;

    return NextResponse.json({ rows: result.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Dashboard mom-revenue error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
