import { sql } from "@vercel/postgres";

async function migrate() {
  console.log("Running migrations...");

  await sql`
    CREATE TABLE IF NOT EXISTS business_processes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
      position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  Created business_processes table");

  await sql`
    CREATE TABLE IF NOT EXISTS process_connections (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES business_processes(id),
      target_id TEXT NOT NULL REFERENCES business_processes(id),
      label TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  Created process_connections table");

  console.log("Migrations complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
