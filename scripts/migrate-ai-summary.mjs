import { sql } from "@vercel/postgres";

async function migrate() {
  await sql`
    ALTER TABLE skool_members
    ADD COLUMN IF NOT EXISTS ai_summary TEXT,
    ADD COLUMN IF NOT EXISTS summary_generated_at TIMESTAMPTZ
  `;
  console.log("Added ai_summary columns to skool_members");
  process.exit(0);
}

migrate().catch((e) => { console.error(e); process.exit(1); });
