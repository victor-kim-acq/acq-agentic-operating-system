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
      WITH deal_memberships AS (
        SELECT
          TO_CHAR(DATE_TRUNC('month', (d.close_date AT TIME ZONE 'America/Los_Angeles')), 'Mon YYYY') AS close_month,
          DATE_TRUNC('month', (d.close_date AT TIME ZONE 'America/Los_Angeles')) AS sort_month,
          d.deal_id,
          CASE
            WHEN LOWER(d.currency) = 'usd' THEN d.mrr
            ELSE CASE
              WHEN d.tier = 'Standard' THEN 1000
              WHEN d.tier = 'VIP' THEN 3000
              WHEN d.tier = 'VIP (Yearly)' THEN 36000
              WHEN d.tier = 'Premium' THEN 8000
              WHEN d.tier = 'Premium + Scale Workshop' THEN 8000
              ELSE 0
            END
          END AS deal_mrr,
          MAX(CASE WHEN m.status = 'Active' THEN 1 ELSE 0 END) AS has_active,
          MAX(CASE WHEN m.status = 'Cancellation' THEN 1 ELSE 0 END) AS has_cancellation,
          MAX(CASE WHEN m.status = 'Payment Failed' THEN 1 ELSE 0 END) AS has_payment_failed,
          MAX(CASE WHEN m.status IS NOT NULL THEN 1 ELSE 0 END) AS has_any_membership
        FROM deals d
        JOIN contact_deal cd ON d.deal_id = cd.deal_id
        JOIN contacts c ON cd.contact_id = c.contact_id
          AND c.membership_type = 'Paying Member'
        LEFT JOIN deal_membership dm ON d.deal_id = dm.deal_id
        LEFT JOIN memberships m ON dm.membership_id = m.membership_id
          AND m.membership_type = 'Paying Member'
          AND m.status IN ('Active', 'Cancellation', 'Payment Failed')
        WHERE d.mrr IS NOT NULL
          AND d.mrr != 0
          AND (d.close_date AT TIME ZONE 'America/Los_Angeles')::date >= ${dateFilterStart}::date
          AND (d.close_date AT TIME ZONE 'America/Los_Angeles')::date <= ${dateFilterEnd}::date
        GROUP BY 1, 2, 3, 4
      ),
      classified AS (
        SELECT *,
          CASE
            WHEN has_active = 1 THEN 'Collected'
            WHEN has_cancellation = 1 THEN 'Cancelled'
            WHEN has_payment_failed = 1 THEN 'Payment Failed'
            WHEN has_any_membership = 0 THEN 'No Billing Yet'
          END AS deal_status
        FROM deal_memberships
      )
      SELECT
        close_month, sort_month,
        COALESCE(SUM(deal_mrr), 0) AS closed_mrr,
        COALESCE(SUM(CASE WHEN deal_status = 'Collected' THEN deal_mrr ELSE 0 END), 0) AS collected_mrr,
        COALESCE(SUM(CASE WHEN deal_status = 'Cancelled' THEN deal_mrr ELSE 0 END), 0) AS cancelled_mrr,
        COALESCE(SUM(CASE WHEN deal_status = 'Payment Failed' THEN deal_mrr ELSE 0 END), 0) AS payment_failed_mrr,
        COALESCE(SUM(CASE WHEN deal_status = 'No Billing Yet' THEN deal_mrr ELSE 0 END), 0) AS no_billing_mrr,
        COUNT(*) AS deal_count
      FROM classified
      GROUP BY 1, 2
      ORDER BY 2
    `;

    return NextResponse.json({ rows: result.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Dashboard sold-vs-collected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
