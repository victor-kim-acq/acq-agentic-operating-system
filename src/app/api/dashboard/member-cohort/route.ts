import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { readFileSync } from "fs";
import { join } from "path";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

function loadExcludeEmails(): string[] {
  try {
    const csv = readFileSync(join(process.cwd(), "exclude.csv"), "utf8");
    return csv
      .split("\n")
      .slice(1)
      .map((line) => {
        const parts = line.split(",");
        return parts[2]?.trim()?.toLowerCase();
      })
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const excludeEmails = loadExcludeEmails();

    // Build a VALUES clause for the exclusion list
    const excludeValues =
      excludeEmails.length > 0
        ? excludeEmails.map((e) => `('${e.replace(/'/g, "''")}')`).join(",")
        : "('__none__')";

    const result = await sql.query(`
      WITH exclude_list AS (
        SELECT email FROM (VALUES ${excludeValues}) AS t(email)
      ),
      -- All March joiners from skool_members (active)
      active_joiners AS (
        SELECT
          email,
          join_date AS joined_at,
          'active' AS source
        FROM skool_members
        WHERE join_date IS NOT NULL
      ),
      -- All joiners from skool_cancellations (churned)
      cancelled_joiners AS (
        SELECT
          email,
          approved_at AS joined_at,
          'cancelled' AS source
        FROM skool_cancellations
        WHERE approved_at IS NOT NULL
      ),
      -- Union both, exclude internal emails
      all_joiners AS (
        SELECT email, joined_at, source
        FROM active_joiners
        WHERE LOWER(email) NOT IN (SELECT email FROM exclude_list)
        UNION ALL
        SELECT email, joined_at, source
        FROM cancelled_joiners
        WHERE LOWER(email) NOT IN (SELECT email FROM exclude_list)
      ),
      -- Group by month
      monthly AS (
        SELECT
          TO_CHAR(DATE_TRUNC('month', joined_at), 'Mon YYYY') AS cohort_month,
          DATE_TRUNC('month', joined_at) AS sort_month,
          COUNT(*) AS acquired,
          SUM(CASE WHEN source = 'cancelled' THEN 1 ELSE 0 END) AS churned
        FROM all_joiners
        GROUP BY 1, 2
      )
      SELECT
        cohort_month,
        sort_month,
        acquired,
        churned,
        ROUND(churned::numeric / NULLIF(acquired, 0) * 100, 1) AS churn_rate_pct
      FROM monthly
      ORDER BY sort_month
    `);

    return NextResponse.json(
      { rows: result.rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Dashboard member-cohort error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
