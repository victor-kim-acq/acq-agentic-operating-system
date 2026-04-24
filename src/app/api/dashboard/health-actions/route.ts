import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

// v2 action set. Anchored to the retention framework's five signals
// (acq-vantage-retention SKILL.md) + one empirical addition (course).
// Cells intentionally overlap — a member can trigger multiple actions.
interface ActionDef {
  key: "ai" | "post" | "onboard" | "verify" | "course";
  label: string;
  rationale: string;
  appliesTo: "all" | "ace_recharge";
}

const ACTIONS: ActionDef[] = [
  {
    key: "ai",
    label: "Nudge AI usage",
    rationale:
      "Framework's #1 retention signal. Triggers when the member hasn't hit the 2+ distinct AI days threshold in their first 7 days. Applies to all sources — for Skool the signal doesn't predict churn, but AI usage is still the top lever across the community and nudging costs nothing.",
    appliesTo: "all",
  },
  {
    key: "post",
    label: "Incentive to post",
    rationale:
      "Framework's #2 signal (community engagement). Triggers on zero posts + zero comments — getting lurkers to post for the first time flips the biggest missing component.",
    appliesTo: "all",
  },
  {
    key: "onboard",
    label: "Book onboarding call",
    rationale:
      "Framework's strongest rescue lever — completers churn at 11.1% vs 32.3% for never-booked. Triggers when the member has no completed onboarding meeting on record.",
    appliesTo: "all",
  },
  {
    key: "verify",
    label: "Complete revenue verification",
    rationale:
      "Framework says 0% churn when verified for ACE/Recharge, irrelevant for Skool-native. Triggers only for ACE/Recharge members whose contact isn't flagged 'Verification Successful'.",
    appliesTo: "ace_recharge",
  },
  {
    key: "course",
    label: "Send course to watch",
    rationale:
      "Not in the framework's top 5, but profiling showed learning as the cleanest active-vs-cancelled separator (8–15× ratio). Triggers on zero courses started.",
    appliesTo: "all",
  },
];

const ROW_ORDER = ["ACE", "Recharge", "Skool", "Founding Members"] as const;

function whereClauses(req: NextRequest): { sqlText: string; params: string[] } {
  const status = req.nextUrl.searchParams.get("status") ?? "active";
  const source = req.nextUrl.searchParams.get("source") ?? "all";
  const tier = req.nextUrl.searchParams.get("tier") ?? "all";
  const joinStart = req.nextUrl.searchParams.get("joinStart");
  const joinEnd = req.nextUrl.searchParams.get("joinEnd");

  const clauses: string[] = ["band = 'at_risk'"];
  const params: string[] = [];
  let i = 1;

  if (status !== "all") {
    clauses.push(`member_status = $${i++}`);
    params.push(status);
  }
  if (source !== "all") {
    clauses.push(`billing_source = $${i++}`);
    params.push(source);
  }
  if (tier !== "all") {
    clauses.push(`tier = $${i++}`);
    params.push(tier);
  }
  if (joinStart) {
    clauses.push(`join_date >= $${i++}`);
    params.push(joinStart);
  }
  if (joinEnd) {
    clauses.push(`join_date < ($${i++}::date + INTERVAL '1 day')`);
    params.push(joinEnd);
  }

  return { sqlText: `WHERE ${clauses.join(" AND ")}`, params };
}

export async function GET(req: NextRequest) {
  try {
    const { sqlText, params } = whereClauses(req);

    const result = await sql.query(
      `
      WITH scoped AS (
        SELECT
          COALESCE(billing_source, 'Founding Members')   AS source,
          ai_activated,
          total_posts,
          total_comments,
          has_completed_onboarding,
          revenue_verified,
          courses_started
        FROM member_health_scored
        ${sqlText}
      )
      SELECT
        source,
        COUNT(*)::int                                                       AS at_risk_total,
        COUNT(*) FILTER (WHERE NOT ai_activated)::int                       AS ai_action,
        COUNT(*) FILTER (WHERE total_posts + total_comments = 0)::int       AS post_action,
        COUNT(*) FILTER (WHERE NOT has_completed_onboarding)::int           AS onboard_action,
        COUNT(*) FILTER (
          WHERE NOT revenue_verified
            AND source IN ('ACE','Recharge')
        )::int                                                              AS verify_action,
        COUNT(*) FILTER (WHERE courses_started = 0)::int                    AS course_action
      FROM scoped
      GROUP BY source
      `,
      params
    );

    const bySource = new Map(
      result.rows.map((r) => [r.source as string, r])
    );
    const rows = ROW_ORDER.filter((s) => bySource.has(s)).map((s) => {
      const r = bySource.get(s)!;
      return {
        source: s,
        at_risk_total: Number(r.at_risk_total),
        ai: Number(r.ai_action),
        post: Number(r.post_action),
        onboard: Number(r.onboard_action),
        verify: Number(r.verify_action),
        course: Number(r.course_action),
      };
    });

    const totals = {
      source: "All",
      at_risk_total: rows.reduce((s, r) => s + r.at_risk_total, 0),
      ai: rows.reduce((s, r) => s + r.ai, 0),
      post: rows.reduce((s, r) => s + r.post, 0),
      onboard: rows.reduce((s, r) => s + r.onboard, 0),
      verify: rows.reduce((s, r) => s + r.verify, 0),
      course: rows.reduce((s, r) => s + r.course, 0),
    };

    return NextResponse.json(
      { actions: ACTIONS, rows, totals },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("health-actions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
