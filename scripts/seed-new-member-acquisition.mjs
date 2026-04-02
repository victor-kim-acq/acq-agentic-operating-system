import { sql } from "@vercel/postgres";

// ── Node definitions ────────────────────────────────────────────────
// Layout: 3 acquisition channels at top (y=0), Data Normalization below (y=200),
// then left-to-right horizontal flow. Onboarding Task Creation offset above main line.

const nodes = [
  // Row 0 — Acquisition channels (y=0, spread on x)
  { id: "nma-ace-channel",       name: "ACE Acquisition Channel",       category: "Acquisition", position_x: 0,    position_y: 0,   icon: "💳", color: "#2563eb", description: "Source: Stripe via ACE middleware" },
  { id: "nma-skool-channel",     name: "Skool Acquisition Channel",     category: "Acquisition", position_x: 400,  position_y: 0,   icon: "🏫", color: "#7c3aed", description: "Source: Community platform direct payment" },
  { id: "nma-recharge-channel",  name: "Recharge Acquisition Channel",  category: "Acquisition", position_x: 800,  position_y: 0,   icon: "🔄", color: "#16a34a", description: "Source: Subscription billing (Shopify)" },

  // Row 1 — Normalization (centered below channels)
  { id: "nma-data-normalization", name: "Data Normalization",            category: "Onboarding",  position_x: 400,  position_y: 200, icon: "⚙️", color: "#6b7280", description: "Unified schema: email, name, tier, MRR, currency, billing source" },

  // Row 2 — Main pipeline flows left to right
  { id: "nma-contact-dedup",     name: "Contact Dedup",                 category: "Onboarding",  position_x: 400,  position_y: 400, icon: "👤", color: "#f97316", description: "Sub-workflow: find or create HubSpot contact" },
  { id: "nma-deal-resolution",   name: "Deal Resolution",               category: "Onboarding",  position_x: 400,  position_y: 600, icon: "🤝", color: "#2563eb", description: "Find existing open Vantage deal → update or create new" },

  // Conditional branch — offset above main line
  { id: "nma-ob-task-creation",  name: "Onboarding Task Creation",      category: "Onboarding",  position_x: 800,  position_y: 520, icon: "📞", color: "#16a34a", description: "Recharge members only · OB call task with contact/deal associations" },

  // Continue main pipeline
  { id: "nma-membership-record", name: "Membership Record Creation",    category: "Onboarding",  position_x: 800,  position_y: 700, icon: "📋", color: "#0d9488", description: "Custom object billing stamp: tier, MRR, source, status" },
  { id: "nma-contact-status",    name: "Contact Status Update",         category: "Onboarding",  position_x: 1200, position_y: 700, icon: "✅", color: "#16a34a", description: "Active status, tier, billing source, lifecycle stage" },
  { id: "nma-ob-list",           name: "Onboarding List",               category: "Onboarding",  position_x: 1600, position_y: 700, icon: "📬", color: "#f97316", description: "HubSpot list add · Skipped for specific deal owners" },
  { id: "nma-book-shipping",     name: "Book Shipping Automation",      category: "Features/Logistics", position_x: 2000, position_y: 700, icon: "📦", color: "#92400e", description: "Skool/ACE members only" },
  { id: "nma-acq-ai-user",      name: "Create or Update ACQ AI User",  category: "Features/Logistics", position_x: 2400, position_y: 700, icon: "🤖", color: "#7c3aed", description: "Clerk provisioning: Legacy + Vantage org roles, store ID in HubSpot" },
  { id: "nma-skool-invite",     name: "Skool Invite (Recharge/ACE only)", category: "Features/Logistics", position_x: 2800, position_y: 700, icon: "🎟️", color: "#7c3aed", description: "Zapier hook to send community access" },
  { id: "nma-slack-notification", name: "Slack Notification",           category: "Features/Logistics", position_x: 3200, position_y: 700, icon: "🔔", color: "#eab308", description: "Summary alert with deal/membership links and statuses" },
];

const edges = [
  // Channels → Data Normalization
  { id: "nma-e-ace-norm",      source_id: "nma-ace-channel",        target_id: "nma-data-normalization", label: null },
  { id: "nma-e-skool-norm",    source_id: "nma-skool-channel",      target_id: "nma-data-normalization", label: null },
  { id: "nma-e-recharge-norm", source_id: "nma-recharge-channel",   target_id: "nma-data-normalization", label: null },

  // Data Normalization → Contact Dedup → Deal Resolution
  { id: "nma-e-norm-dedup",    source_id: "nma-data-normalization", target_id: "nma-contact-dedup",      label: null },
  { id: "nma-e-dedup-deal",    source_id: "nma-contact-dedup",      target_id: "nma-deal-resolution",    label: null },

  // Deal Resolution → Onboarding Task Creation (conditional) and → Membership Record
  { id: "nma-e-deal-obtask",   source_id: "nma-deal-resolution",    target_id: "nma-ob-task-creation",   label: "Recharge only" },
  { id: "nma-e-deal-membership", source_id: "nma-deal-resolution",  target_id: "nma-membership-record",  label: null },

  // OB Task rejoins at Membership Record
  { id: "nma-e-obtask-membership", source_id: "nma-ob-task-creation", target_id: "nma-membership-record", label: null },

  // Main pipeline continues
  { id: "nma-e-membership-status", source_id: "nma-membership-record", target_id: "nma-contact-status",   label: null },
  { id: "nma-e-status-oblist",     source_id: "nma-contact-status",    target_id: "nma-ob-list",           label: null },
  { id: "nma-e-oblist-book",       source_id: "nma-ob-list",           target_id: "nma-book-shipping",     label: null },
  { id: "nma-e-book-acqai",        source_id: "nma-book-shipping",     target_id: "nma-acq-ai-user",      label: null },
  { id: "nma-e-acqai-skool",       source_id: "nma-acq-ai-user",      target_id: "nma-skool-invite",      label: null },
  { id: "nma-e-skool-slack",       source_id: "nma-skool-invite",      target_id: "nma-slack-notification", label: null },
];

async function seed() {
  console.log("Clearing existing data...");
  await sql`DELETE FROM process_connections`;
  await sql`DELETE FROM business_processes`;
  console.log("  Cleared all existing nodes and edges.");

  console.log("Seeding New Member Acquisition nodes...");
  for (const n of nodes) {
    const metadata = JSON.stringify({
      icon: n.icon,
      color: n.color,
      funnel: "New Member Acquisition",
      stats: [],
    });

    await sql`
      INSERT INTO business_processes (id, name, category, description, position_x, position_y, metadata)
      VALUES (${n.id}, ${n.name}, ${n.category}, ${n.description}, ${n.position_x}, ${n.position_y}, ${metadata}::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        position_x = EXCLUDED.position_x,
        position_y = EXCLUDED.position_y,
        metadata = EXCLUDED.metadata
    `;
  }
  console.log(`  Seeded ${nodes.length} nodes.`);

  console.log("Seeding New Member Acquisition edges...");
  for (const e of edges) {
    await sql`
      INSERT INTO process_connections (id, source_id, target_id, label)
      VALUES (${e.id}, ${e.source_id}, ${e.target_id}, ${e.label})
      ON CONFLICT (id) DO UPDATE SET
        source_id = EXCLUDED.source_id,
        target_id = EXCLUDED.target_id,
        label = EXCLUDED.label
    `;
  }
  console.log(`  Seeded ${edges.length} edges.`);

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
