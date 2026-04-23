import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const METABASE_CARD_URL =
  "https://lefty-krill.metabaseapp.com/api/card/1365/query/json?ignore_cache=true";

type CardRow = {
  MESSAGE_ID: string;
  CHAT_ID: string;
  EMAIL: string;
  CONTENT_TEXT: string | null;
  CREATED_AT: string;
};

const clean = (s: string | null) => (s ? s.replace(/\0/g, "") : s);

const BATCH_SIZE = 500;

export async function POST() {
  const started = Date.now();
  const metabaseKey = process.env.METABASE_API_KEY;
  if (!metabaseKey) {
    return NextResponse.json(
      { error: "METABASE_API_KEY not configured" },
      { status: 500 }
    );
  }

  const fetchStart = Date.now();
  const r = await fetch(METABASE_CARD_URL, {
    method: "POST",
    headers: { "x-api-key": metabaseKey, "Content-Type": "application/json" },
  });
  if (!r.ok) {
    const text = await r.text();
    return NextResponse.json(
      { error: `Metabase ${r.status}: ${text.slice(0, 200)}` },
      { status: 502 }
    );
  }
  const rows = (await r.json()) as CardRow[];
  const fetchMs = Date.now() - fetchStart;

  let upserted = 0;
  const insertStart = Date.now();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const placeholders: string[] = [];
    const params: (string | null)[] = [];
    let p = 1;
    for (const r of batch) {
      placeholders.push(
        `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}::timestamptz)`
      );
      params.push(
        r.MESSAGE_ID,
        r.CHAT_ID,
        r.EMAIL,
        clean(r.CONTENT_TEXT),
        r.CREATED_AT
      );
    }
    await sql.query(
      `INSERT INTO acq_ai_messages (message_id, chat_id, email, content_text, created_at)
       VALUES ${placeholders.join(", ")}
       ON CONFLICT (message_id) DO UPDATE SET content_text = EXCLUDED.content_text`,
      params
    );
    upserted += batch.length;
  }

  const insertMs = Date.now() - insertStart;
  const totalMs = Date.now() - started;

  return NextResponse.json({
    status: "ok",
    total_rows: rows.length,
    upserted,
    timing_ms: { fetch: fetchMs, insert: insertMs, total: totalMs },
  });
}
