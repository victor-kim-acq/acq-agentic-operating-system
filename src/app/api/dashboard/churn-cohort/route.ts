import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', (d.close_date AT TIME ZONE 'America/Los_Angeles')), 'Mon YYYY') AS close_month_cohort,
        DATE_TRUNC('month', (d.close_date AT TIME ZONE 'America/Los_Angeles')) AS sort_month,
        COALESCE(SUM(CASE WHEN m.status = 'Active' THEN
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
        ELSE 0 END), 0) AS active_mrr,
        COALESCE(SUM(CASE WHEN m.status = 'Cancellation' THEN
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
        ELSE 0 END), 0) AS cancellation_mrr,
        ROUND(
          COALESCE(SUM(CASE WHEN m.status = 'Cancellation' THEN
            CASE WHEN LOWER(m.currency) = 'usd' THEN m.mrr
              ELSE CASE
                WHEN m.tier = 'Standard' THEN 1000 WHEN m.tier = 'VIP' THEN 3000
                WHEN m.tier = 'VIP (Yearly)' THEN 36000 WHEN m.tier = 'Premium' THEN 8000 WHEN m.tier = 'Premium + Scale Workshop' THEN 8000 ELSE 0
              END
            END
          ELSE 0 END), 0)::numeric
          / NULLIF(COALESCE(SUM(CASE WHEN m.status = 'Active' THEN
            CASE WHEN LOWER(m.currency) = 'usd' THEN m.mrr
              ELSE CASE
                WHEN m.tier = 'Standard' THEN 1000 WHEN m.tier = 'VIP' THEN 3000
                WHEN m.tier = 'VIP (Yearly)' THEN 36000 WHEN m.tier = 'Premium' THEN 8000 WHEN m.tier = 'Premium + Scale Workshop' THEN 8000 ELSE 0
              END
            END
          ELSE 0 END), 0), 0) * 100,
          2
        ) AS churn_rate_pct
      FROM memberships m
      LEFT JOIN deal_membership dm ON m.membership_id = dm.membership_id
      LEFT JOIN deals d ON dm.deal_id = d.deal_id
      WHERE m.status IN ('Active', 'Cancellation')
        AND m.membership_type = 'Paying Member'
        AND m.billing_date::date >= '2026-02-01'
        AND (d.close_date AT TIME ZONE 'America/Los_Angeles')::date >= '2026-02-01'
      GROUP BY 1, 2
      ORDER BY 2
    `;

    return NextResponse.json(
      { rows: result.rows },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Dashboard churn-cohort error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
