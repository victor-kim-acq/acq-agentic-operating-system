import { sql } from "@vercel/postgres";

async function migrate() {
  console.log("Running MIT/CT migrations...");

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      reports_to TEXT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  Created users table");

  await sql`
    CREATE TABLE IF NOT EXISTS mits (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      owner_id TEXT REFERENCES users(id),
      quarter INTEGER,
      year INTEGER,
      status TEXT,
      problem_statement TEXT,
      hypothesis TEXT,
      sort_order INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  Created mits table");

  await sql`
    CREATE TABLE IF NOT EXISTS critical_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      mit_id TEXT NOT NULL REFERENCES mits(id),
      owner_id TEXT REFERENCES users(id),
      due_date DATE,
      status TEXT,
      sort_order INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  Created critical_tasks table");

  await sql`
    CREATE TABLE IF NOT EXISTS mit_node_assignments (
      id TEXT PRIMARY KEY,
      mit_id TEXT NOT NULL REFERENCES mits(id),
      node_id TEXT NOT NULL REFERENCES business_processes(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(mit_id, node_id)
    )
  `;
  console.log("  Created mit_node_assignments table");

  console.log("MIT/CT migrations complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
