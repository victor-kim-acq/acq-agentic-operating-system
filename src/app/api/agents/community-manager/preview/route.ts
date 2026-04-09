import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ruleId = searchParams.get("rule_id");

    if (!ruleId) {
      return NextResponse.json({ error: "Missing rule_id" }, { status: 400 });
    }

    const ruleResult = await sql`
      SELECT id, communication_type, interval_days
      FROM scheduled_communications
      WHERE id = ${ruleId}
    `;

    if (ruleResult.rows.length === 0) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const rule = ruleResult.rows[0] as {
      id: number;
      communication_type: string;
      interval_days: number;
    };

    const membersResult = await sql`
      SELECT sm.full_name, sm.email, sm.join_date,
             (CURRENT_DATE - DATE(sm.join_date)) AS days_since_join,
             cl.status AS send_status,
             cl.sent_at
      FROM skool_members sm
      LEFT JOIN LATERAL (
        SELECT status, sent_at FROM communications_log
        WHERE contact_email = sm.email
          AND communication_type = ${rule.communication_type}
        ORDER BY sent_at DESC
        LIMIT 1
      ) cl ON true
      WHERE DATE(sm.join_date) = CURRENT_DATE - INTERVAL '1 day' * ${rule.interval_days}
        AND sm.email IS NOT NULL
      ORDER BY sm.full_name
    `;

    return NextResponse.json(
      {
        members: membersResult.rows,
        count: membersResult.rows.length,
        rule: {
          communication_type: rule.communication_type,
          interval_days: rule.interval_days,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to preview eligible members:", error);
    return NextResponse.json(
      { error: "Failed to preview eligible members" },
      { status: 500 }
    );
  }
}
