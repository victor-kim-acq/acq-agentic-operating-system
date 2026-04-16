import { sql } from "@vercel/postgres";

async function migrate() {
  console.log("Running ACQ AI messages migration...");

  await sql`
    CREATE TABLE IF NOT EXISTS acq_ai_messages (
      message_id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      email TEXT NOT NULL,
      content JSONB,
      content_text TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      semantic_topic TEXT,
      semantic_intent TEXT,
      classified_at TIMESTAMPTZ,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  Created acq_ai_messages table");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_acq_ai_messages_email ON acq_ai_messages(email)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_acq_ai_messages_chat_id ON acq_ai_messages(chat_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_acq_ai_messages_created_at ON acq_ai_messages(created_at)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_acq_ai_messages_unclassified
    ON acq_ai_messages(created_at) WHERE semantic_topic IS NULL
  `;
  console.log("  Created indexes");

  const count = await sql`SELECT COUNT(*) as n FROM acq_ai_messages`;
  console.log(`  Current row count: ${count.rows[0].n}`);
  console.log("Done.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
