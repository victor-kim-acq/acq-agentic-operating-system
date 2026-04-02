import { sql } from "@vercel/postgres";
import crypto from "crypto";

async function seed() {
  console.log("Seeding Daily Operations MITs...");

  const users = await sql`SELECT id, name FROM users`;

  for (const user of users.rows) {
    const existing = await sql`
      SELECT id FROM mits WHERE owner_id = ${user.id} AND title = 'Daily Operations'
    `;

    if (existing.rows.length > 0) {
      console.log(`  Skipped ${user.name} — Daily Operations MIT already exists`);
      continue;
    }

    const mitId = crypto.randomUUID();
    await sql`
      INSERT INTO mits (id, title, owner_id, quarter, year, status, sort_order)
      VALUES (${mitId}, 'Daily Operations', ${user.id}, NULL, NULL, 'on_track', 0)
    `;
    console.log(`  Created Daily Operations MIT for ${user.name}`);
  }

  console.log("Daily Operations seeding complete.");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
