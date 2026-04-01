import { sql } from "@vercel/postgres";

const categoryDefaults = {
  Acquisition: { icon: "📡", color: "#16a34a", stats: [] },
  Onboarding: { icon: "👋", color: "#2563eb", stats: [] },
  Retention: { icon: "🔁", color: "#7c3aed", stats: [] },
  "Features/Logistics": { icon: "⚙️", color: "#ec4899", stats: [] },
};

async function backfill() {
  console.log("Backfilling metadata...");

  const { rows } = await sql`SELECT id, category FROM business_processes`;

  for (const row of rows) {
    const meta = categoryDefaults[row.category] || { icon: "📦", color: "#6b7280", stats: [] };
    await sql`UPDATE business_processes SET metadata = ${JSON.stringify(meta)}::jsonb WHERE id = ${row.id}`;
    console.log(`  ${row.id} (${row.category}) → ${meta.icon}`);
  }

  console.log(`Backfill complete. Updated ${rows.length} rows.`);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
