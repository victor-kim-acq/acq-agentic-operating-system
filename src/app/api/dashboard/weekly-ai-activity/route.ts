import { NextRequest, NextResponse } from "next/server";
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
      .map((line) => line.split(",")[2]?.trim()?.toLowerCase())
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const startDate =
    req.nextUrl.searchParams.get("startDate") ?? "2026-03-01";
  const endDate =
    req.nextUrl.searchParams.get("endDate") ??
    new Date().toISOString().slice(0, 10);
  const view = req.nextUrl.searchParams.get("view") ?? "wow";
  const bucket = view === "mom" ? "month" : "week";
  const periodFormat = bucket === "week" ? "'YYYY-MM-DD'" : "'Mon YYYY'";

  try {
    const excludeEmails = loadExcludeEmails();
    const excludeValues =
      excludeEmails.length > 0
        ? excludeEmails
            .map((e) => `('${e.replace(/'/g, "''")}')`)
            .join(",")
        : "('__none__')";

    const result = await sql.query(`
      WITH exclude_list AS (
        SELECT email FROM (VALUES ${excludeValues}) AS t(email)
      ),
      cohort_base AS (
        SELECT
          u.skool_user_id,
          u.join_date,
          MAX(sc.cancelled_at) AS cancelled_at
        FROM unified_skool_cohort u
        LEFT JOIN skool_cancellations sc ON sc.skool_user_id = u.skool_user_id
        WHERE u.email_source = 'skool_login'
          AND u.email NOT IN (SELECT email FROM exclude_list)
        GROUP BY u.skool_user_id, u.join_date
      ),
      periods AS (
        SELECT
          period_start,
          (period_start + INTERVAL '1 ${bucket}') AS period_end
        FROM generate_series(
          DATE_TRUNC('${bucket}', '${startDate}'::timestamptz),
          DATE_TRUNC('${bucket}', '${endDate}'::timestamptz),
          INTERVAL '1 ${bucket}'
        ) AS period_start
      ),
      active_base AS (
        SELECT
          p.period_start,
          COUNT(DISTINCT cb.skool_user_id) AS active_base
        FROM periods p
        LEFT JOIN cohort_base cb
          ON cb.join_date < p.period_end
          AND (cb.cancelled_at IS NULL OR cb.cancelled_at > p.period_start)
        GROUP BY p.period_start
      ),
      msg_activity AS (
        SELECT
          DATE_TRUNC('${bucket}', aim.created_at) AS period_start,
          u.skool_user_id,
          COUNT(DISTINCT DATE(aim.created_at)) AS days_in_period,
          COUNT(*) AS messages_in_period
        FROM acq_ai_messages aim
        JOIN unified_skool_cohort u ON LOWER(TRIM(aim.email)) = u.email
        WHERE aim.created_at >= '${startDate}'::timestamptz
          AND aim.created_at < ('${endDate}'::date + INTERVAL '1 day')::timestamptz
        GROUP BY DATE_TRUNC('${bucket}', aim.created_at), u.skool_user_id
      ),
      wau AS (
        SELECT period_start, COUNT(DISTINCT skool_user_id) AS wau
        FROM msg_activity
        WHERE days_in_period >= 2
        GROUP BY period_start
      )
      SELECT
        TO_CHAR(p.period_start, ${periodFormat}) AS period_label,
        p.period_start AS period_key,
        COALESCE(w.wau, 0) AS wau,
        COALESCE(ab.active_base, 0) AS active_base,
        CASE WHEN ab.active_base > 0
          THEN ROUND(COALESCE(w.wau, 0)::numeric / ab.active_base * 100, 1)
          ELSE 0
        END AS wau_rate
      FROM periods p
      LEFT JOIN active_base ab ON ab.period_start = p.period_start
      LEFT JOIN wau w ON w.period_start = p.period_start
      ORDER BY p.period_start
    `);

    const rows = result.rows.map((r) => ({
      period: r.period_label,
      period_key: r.period_key,
      wau: Number(r.wau),
      active_base: Number(r.active_base),
      wau_rate: Number(r.wau_rate) || 0,
    }));

    return NextResponse.json(
      { rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Weekly AI activity error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
