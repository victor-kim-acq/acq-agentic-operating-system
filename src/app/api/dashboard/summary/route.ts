import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [collectedResult, arrResult, churnedResult] = await Promise.all([
      sql`
        SELECT COALESCE(SUM(
          CASE
            WHEN LOWER(m.currency) = 'usd' THEN m.mrr
            ELSE CASE
              WHEN m.tier = 'Standard' THEN 1000
              WHEN m.tier = 'VIP' THEN 3000
              WHEN m.tier = 'VIP (Yearly)' THEN 36000
              WHEN m.tier = 'Premium' THEN 8000
              ELSE 0
            END
          END
        ), 0) AS active_revenue
        FROM memberships m
        WHERE m.status = 'Active'
          AND m.membership_type = 'Paying Member'
          AND (m.billing_date AT TIME ZONE 'America/Los_Angeles')::date
              >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
      `,
      sql`
        SELECT COALESCE(SUM(
          CASE
            WHEN LOWER(m.currency) = 'usd' THEN m.mrr
            ELSE CASE
              WHEN m.tier = 'Standard' THEN 1000
              WHEN m.tier = 'VIP' THEN 3000
              WHEN m.tier = 'VIP (Yearly)' THEN 36000
              WHEN m.tier = 'Premium' THEN 8000
              ELSE 0
            END
          END
        ), 0) * 12 AS annual_run_rate
        FROM memberships m
        JOIN contact_membership cm ON m.membership_id = cm.membership_id
        JOIN contacts c ON cm.contact_id = c.contact_id
          AND c.membership_type = 'Paying Member'
        WHERE m.status = 'Active'
          AND m.membership_type = 'Paying Member'
          AND (m.billing_date AT TIME ZONE 'America/Los_Angeles')::date
              >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
      `,
      sql`
        SELECT COALESCE(SUM(
          CASE
            WHEN LOWER(m.currency) = 'usd' THEN m.mrr
            ELSE CASE
              WHEN m.tier = 'Standard' THEN 1000
              WHEN m.tier = 'VIP' THEN 3000
              WHEN m.tier = 'VIP (Yearly)' THEN 36000
              WHEN m.tier = 'Premium' THEN 8000
              ELSE 0
            END
          END
        ), 0) AS cancellation_revenue
        FROM memberships m
        WHERE m.status = 'Cancellation'
          AND m.membership_type = 'Paying Member'
          AND (m.billing_date AT TIME ZONE 'America/Los_Angeles')::date
              >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
      `,
    ]);

    return NextResponse.json(
      {
        collected_revenue: Number(collectedResult.rows[0].active_revenue),
        annual_run_rate: Number(arrResult.rows[0].annual_run_rate),
        churned_revenue: Number(churnedResult.rows[0].cancellation_revenue),
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
