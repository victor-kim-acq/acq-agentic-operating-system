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
  const endDate =
    req.nextUrl.searchParams.get("endDate") ??
    new Date().toISOString().slice(0, 10);
  const view = req.nextUrl.searchParams.get("view") ?? "wow";
  const bucket = view === "mom" ? "month" : "week";

  try {
    const excludeEmails = loadExcludeEmails();
    const excludeValues =
      excludeEmails.length > 0
        ? excludeEmails
            .map((e) => `('${e.replace(/'/g, "''")}')`)
            .join(",")
        : "('__none__')";

    // Pick the most-recent period bucket that overlaps the cohort endDate.
    const result = await sql.query(`
      WITH exclude_list AS (
        SELECT email FROM (VALUES ${excludeValues}) AS t(email)
      ),
      target_period AS (
        SELECT DATE_TRUNC('${bucket}', '${endDate}'::timestamptz) AS period_start,
               DATE_TRUNC('${bucket}', '${endDate}'::timestamptz) + INTERVAL '1 ${bucket}' AS period_end
      ),
      msg_activity AS (
        SELECT
          u.skool_user_id,
          COUNT(DISTINCT DATE(aim.created_at)) AS days_in_period,
          COUNT(*) AS messages_in_period
        FROM target_period tp
        JOIN acq_ai_messages aim
          ON aim.created_at >= tp.period_start
         AND aim.created_at <  tp.period_end
        JOIN unified_skool_cohort u
          ON LOWER(TRIM(aim.email)) = u.email
        GROUP BY u.skool_user_id
      ),
      member_info AS (
        SELECT DISTINCT ON (u.skool_user_id)
          u.skool_user_id,
          u.email,
          u.full_name,
          u.join_date,
          u.tier,
          u.member_status
        FROM unified_skool_cohort u
        WHERE u.email_source = 'skool_login'
          AND u.email NOT IN (SELECT email FROM exclude_list)
        ORDER BY u.skool_user_id
      )
      SELECT
        mi.email,
        mi.full_name AS name,
        mi.join_date,
        mi.tier,
        mi.member_status AS status,
        ma.days_in_period,
        ma.messages_in_period,
        (ma.days_in_period >= 2) AS wau
      FROM msg_activity ma
      JOIN member_info mi ON mi.skool_user_id = ma.skool_user_id
      ORDER BY ma.days_in_period DESC, ma.messages_in_period DESC
    `);

    const rows = result.rows.map((r) => ({
      email: r.email,
      name: r.name,
      joined_at:
        r.join_date instanceof Date
          ? r.join_date.toISOString().slice(0, 10)
          : String(r.join_date ?? "").slice(0, 10),
      tier: r.tier ?? "Unknown",
      status: r.status ?? "active",
      days_in_period: Number(r.days_in_period),
      messages_in_period: Number(r.messages_in_period),
      wau: Boolean(r.wau),
    }));

    return NextResponse.json(
      { rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Weekly AI activity members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
