import { sql } from "@vercel/postgres";

async function migrate() {
  console.log("Running edge handle migrations...");

  await sql`ALTER TABLE process_connections ADD COLUMN IF NOT EXISTS source_handle TEXT`;
  console.log("  Added source_handle column");

  await sql`ALTER TABLE process_connections ADD COLUMN IF NOT EXISTS target_handle TEXT`;
  console.log("  Added target_handle column");

  console.log("Edge handle migrations complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
