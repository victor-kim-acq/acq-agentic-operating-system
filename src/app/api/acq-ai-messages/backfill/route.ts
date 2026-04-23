import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const METABASE_CARD_URL =
  "https://lefty-krill.metabaseapp.com/api/card/1374/query/json?ignore_cache=true";

const START_DATE_PARAM_ID = "952b9efe-77c2-4e71-b944-d3d63c1bd9bd";
const END_DATE_PARAM_ID = "6237feb1-1557-49ba-acbf-08832f50bebe";

type CardRow = {
  MESSAGE_ID: string;
  CHAT_ID: string;
  EMAIL: string;
  CONTENT_TEXT: string | null;
  CREATED_AT: string;
};

const clean = (s: string | null) => (s ? s.replace(/\0/g, "") : s);

const BATCH_SIZE = 500;

export async function POST(request: NextRequest) {
  try {
  const started = Date.now();
  const metabaseKey = process.env.METABASE_API_KEY;
  if (!metabaseKey) {
    return NextResponse.json(
      { error: "METABASE_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { start_date, end_date } = await request.json();
  if (!start_date || !end_date) {
    return NextResponse.json(
      { error: "start_date and end_date required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const fetchStart = Date.now();
  const r = await fetch(METABASE_CARD_URL, {
    method: "POST",
    headers: { "x-api-key": metabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      parameters: [
        {
          id: START_DATE_PARAM_ID,
          type: "string/=",
          target: ["variable", ["template-tag", "start_date"]],
          value: start_date,
        },
        {
          id: END_DATE_PARAM_ID,
          type: "string/=",
          target: ["variable", ["template-tag", "end_date"]],
          value: end_date,
        },
      ],
    }),
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
    for (const row of batch) {
      placeholders.push(
        `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}::timestamptz)`
      );
      params.push(
        row.MESSAGE_ID,
        row.CHAT_ID,
        row.EMAIL,
        clean(row.CONTENT_TEXT),
        row.CREATED_AT
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
    window: { start_date, end_date },
    total_rows: rows.length,
    upserted,
    timing_ms: { fetch: fetchMs, insert: insertMs, total: totalMs },
  });
  } catch (err) {
    console.error("backfill error:", err);
    return NextResponse.json(
      { error: String(err), stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5).join(" | ") : undefined },
      { status: 500 }
    );
  }
}
