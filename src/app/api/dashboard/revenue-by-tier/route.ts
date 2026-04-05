import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await sql`
      WITH base AS (
        SELECT
          m.tier,
          CASE WHEN LOWER(m.currency) = 'usd' THEN m.mrr ELSE 0 END AS usd_mrr,
          CASE
            WHEN LOWER(m.currency) != 'usd' OR m.currency IS NULL THEN
              CASE
                WHEN m.tier = 'Standard' THEN 1000
                WHEN m.tier = 'VIP' THEN 3000
                WHEN m.tier = 'VIP (Yearly)' THEN 36000
                WHEN m.tier = 'Premium' THEN 8000
                WHEN m.tier = 'Premium + Scale Workshop' THEN 8000
                ELSE 0
              END
            ELSE 0
          END AS non_usd_normalized_mrr
        FROM memberships m
        WHERE m.status = 'Active'
          AND m.membership_type = 'Paying Member'
          AND m.billing_date::date
              >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
      ),
      by_tier AS (
        SELECT tier,
          COALESCE(SUM(usd_mrr), 0) AS usd_mrr,
          COALESCE(SUM(non_usd_normalized_mrr), 0) AS non_usd_mrr
        FROM base GROUP BY tier
      ),
      with_total AS (
        SELECT tier, usd_mrr, non_usd_mrr, usd_mrr + non_usd_mrr AS total_mrr FROM by_tier
        UNION ALL
        SELECT 'Total', COALESCE(SUM(usd_mrr),0), COALESCE(SUM(non_usd_mrr),0),
          COALESCE(SUM(usd_mrr),0) + COALESCE(SUM(non_usd_mrr),0) FROM by_tier
      )
      SELECT tier, usd_mrr, non_usd_mrr, total_mrr,
        CASE WHEN tier = 'Total' THEN 100
          ELSE ROUND(total_mrr::numeric / NULLIF(SUM(CASE WHEN tier != 'Total' THEN total_mrr END) OVER (), 0) * 100, 1)
        END AS pct_of_total
      FROM with_total
      ORDER BY CASE tier
        WHEN 'Total' THEN 0 WHEN 'Standard' THEN 1 WHEN 'Premium' THEN 2
        WHEN 'VIP' THEN 3 WHEN 'VIP (Yearly)' THEN 4 WHEN 'Premium + Scale Workshop' THEN 5
      END
    `;

    return NextResponse.json(
      { rows: result.rows },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Dashboard revenue-by-tier error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
