import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await sql`
      SELECT id, communication_type, email_subject, email_body, from_name, from_email, reply_to, interval_days, is_active, created_at
      FROM scheduled_communications
      ORDER BY interval_days, created_at
    `;
    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch scheduled_communications:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled communications" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      communication_type,
      email_subject,
      email_body,
      from_name,
      from_email,
      interval_days,
    } = await req.json();

    if (!communication_type || !email_subject || !email_body || interval_days == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO scheduled_communications
        (communication_type, email_subject, email_body, from_name, from_email, reply_to, interval_days, is_active)
      VALUES
        (${communication_type}, ${email_subject}, ${email_body}, ${from_name}, ${from_email}, ${from_email}, ${parseInt(interval_days)}, true)
      RETURNING id, communication_type, email_subject, email_body, from_name, from_email, reply_to, interval_days, is_active, created_at
    `;
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create scheduled_communication:", error);
    return NextResponse.json(
      { error: "Failed to create scheduled communication" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, is_active } = await req.json();
    if (!id || typeof is_active !== "boolean") {
      return NextResponse.json({ error: "Missing id or is_active" }, { status: 400 });
    }

    const result = await sql`
      UPDATE scheduled_communications
      SET is_active = ${is_active}
      WHERE id = ${id}
      RETURNING id, communication_type, email_subject, email_body, from_name, from_email, reply_to, interval_days, is_active, created_at
    `;
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to update scheduled_communication:", error);
    return NextResponse.json(
      { error: "Failed to update scheduled communication" },
      { status: 500 }
    );
  }
}
