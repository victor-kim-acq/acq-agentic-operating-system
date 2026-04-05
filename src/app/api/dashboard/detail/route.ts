import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const panel = req.nextUrl.searchParams.get("panel");

  try {
    let result;

    switch (panel) {
      case "revenue-by-tier":
      case "revenue-by-source":
        result = await sql`
          SELECT
            m.membership_id,
            m.membership_name,
            m.tier,
            m.billing_source,
            m.status,
            m.mrr,
            m.currency,
            m.billing_date,
            m.membership_type,
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
            END AS normalized_mrr
          FROM memberships m
          WHERE m.status = 'Active'
            AND m.membership_type = 'Paying Member'
            AND m.billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
          ORDER BY m.tier, m.mrr DESC
        `;
        break;

      case "mom-revenue":
        result = await sql`
          SELECT
            m.membership_id,
            m.membership_name,
            m.tier,
            m.billing_source,
            m.mrr,
            m.currency,
            m.billing_date,
            TO_CHAR(m.billing_date::date, 'Mon YYYY') AS billing_month,
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
            END AS normalized_mrr
          FROM memberships m
          WHERE m.status = 'Active'
            AND m.membership_type = 'Paying Member'
            AND m.billing_date::date >= '2026-02-01'
          ORDER BY m.billing_date DESC, m.billing_source
        `;
        break;

      case "sold-vs-collected":
        result = await sql`
          WITH deal_info AS (
            SELECT
              d.deal_id,
              d.dealname,
              d.close_date,
              TO_CHAR((d.close_date AT TIME ZONE 'America/Los_Angeles')::date, 'Mon YYYY') AS close_month,
              d.mrr AS deal_mrr,
              d.currency,
              d.tier,
              c.email,
              c.firstname,
              c.lastname,
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
              END AS normalized_mrr,
              MAX(CASE WHEN m.status = 'Active' THEN 1 ELSE 0 END) AS has_active,
              MAX(CASE WHEN m.status = 'Cancellation' THEN 1 ELSE 0 END) AS has_cancellation,
              MAX(CASE WHEN m.status = 'Payment Failed' THEN 1 ELSE 0 END) AS has_payment_failed,
              MAX(CASE WHEN m.status IS NOT NULL THEN 1 ELSE 0 END) AS has_any_membership
            FROM deals d
            JOIN contact_deal cd ON d.deal_id = cd.deal_id
            JOIN contacts c ON cd.contact_id = c.contact_id AND c.membership_type = 'Paying Member'
            LEFT JOIN deal_membership dm ON d.deal_id = dm.deal_id
            LEFT JOIN memberships m ON dm.membership_id = m.membership_id
              AND m.membership_type = 'Paying Member'
              AND m.status IN ('Active', 'Cancellation', 'Payment Failed')
            WHERE d.mrr IS NOT NULL AND d.mrr != 0
              AND (d.close_date AT TIME ZONE 'America/Los_Angeles')::date >= '2026-02-01'
            GROUP BY d.deal_id, d.dealname, d.close_date, d.mrr, d.currency, d.tier,
                     c.email, c.firstname, c.lastname
          )
          SELECT
            deal_id, dealname, close_month, close_date, deal_mrr, normalized_mrr, currency, tier,
            email, firstname, lastname,
            CASE
              WHEN has_active = 1 THEN 'Collected'
              WHEN has_cancellation = 1 THEN 'Cancelled'
              WHEN has_payment_failed = 1 THEN 'Payment Failed'
              WHEN has_any_membership = 0 THEN 'No Billing Yet'
            END AS deal_status
          FROM deal_info
          ORDER BY close_date DESC
        `;
        break;

      case "churn-cohort":
        result = await sql`
          SELECT
            m.membership_id,
            m.membership_name,
            m.status,
            m.tier,
            m.billing_source,
            m.mrr,
            m.currency,
            m.billing_date,
            d.deal_id,
            d.dealname,
            TO_CHAR((d.close_date AT TIME ZONE 'America/Los_Angeles')::date, 'Mon YYYY') AS close_month,
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
            END AS normalized_mrr
          FROM memberships m
          LEFT JOIN deal_membership dm ON m.membership_id = dm.membership_id
          LEFT JOIN deals d ON dm.deal_id = d.deal_id
          WHERE m.status IN ('Active', 'Cancellation')
            AND m.membership_type = 'Paying Member'
            AND m.billing_date::date >= '2026-02-01'
            AND (d.close_date AT TIME ZONE 'America/Los_Angeles')::date >= '2026-02-01'
          ORDER BY d.close_date DESC, m.status
        `;
        break;

      default:
        return NextResponse.json(
          { error: "Invalid panel parameter" },
          { status: 400 }
        );
    }

    return NextResponse.json(
      { rows: result.rows, row_count: result.rows.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Dashboard detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
