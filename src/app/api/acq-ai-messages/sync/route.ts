import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array required" },
        { status: 400 }
      );
    }

    const clean = (s: string | null) =>
      s ? s.replace(/\0/g, "") : s;

    let upserted = 0;

    for (const msg of messages) {
      const contentText = clean(msg.content_text);
      await sql`
        INSERT INTO acq_ai_messages (message_id, chat_id, email, content_text, created_at)
        VALUES (${msg.message_id}, ${msg.chat_id}, ${msg.email}, ${contentText}, ${msg.created_at}::timestamptz)
        ON CONFLICT (message_id) DO UPDATE SET
          content_text = EXCLUDED.content_text
      `;
      upserted++;
    }

    return NextResponse.json({ upserted, status: "ok" });
  } catch (error) {
    console.error("acq-ai-messages sync error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
