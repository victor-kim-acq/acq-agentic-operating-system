import { sql } from "@vercel/postgres";
import crypto from "crypto";

async function seed() {
  console.log("Seeding users...");

  const caioId = crypto.randomUUID();
  const victorId = crypto.randomUUID();

  await sql`
    INSERT INTO users (id, name, role, reports_to)
    VALUES (${caioId}, 'Caio Beleza', 'President', NULL)
    ON CONFLICT (id) DO NOTHING
  `;
  console.log("  Created user: Caio Beleza (President)");

  await sql`
    INSERT INTO users (id, name, role, reports_to)
    VALUES (${victorId}, 'Victor Kim', 'AI Lead', ${caioId})
    ON CONFLICT (id) DO NOTHING
  `;
  console.log("  Created user: Victor Kim (AI Lead, reports to Caio)");

  console.log("User seeding complete.");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
