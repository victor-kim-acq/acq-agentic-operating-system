import { sql } from "@vercel/postgres";

const processes = [
  // Acquisition (green) — left column
  { id: "referrals", name: "Referrals", category: "Acquisition", position_x: 0, position_y: 0 },
  { id: "organic", name: "Organic", category: "Acquisition", position_x: 0, position_y: 120 },
  { id: "paid", name: "Paid", category: "Acquisition", position_x: 0, position_y: 240 },
  { id: "book-skool-funnel", name: "Book <> Skool Funnel", category: "Acquisition", position_x: 0, position_y: 360 },

  // Onboarding (blue) — second column
  { id: "sell-by-chat", name: "Sell By Chat / VSL / Payment", category: "Onboarding", position_x: 350, position_y: 120 },
  { id: "founding-members", name: "Founding Members", category: "Onboarding", position_x: 350, position_y: 280 },
  { id: "revenue-verification", name: "Revenue Verification", category: "Onboarding", position_x: 700, position_y: 500 },
  { id: "vip-premium", name: "VIP / Premium", category: "Onboarding", position_x: 700, position_y: 120 },
  { id: "standard", name: "Standard", category: "Onboarding", position_x: 700, position_y: 280 },
  { id: "onboarding-stage", name: "Onboarding", category: "Onboarding", position_x: 1050, position_y: 200 },

  // Retention (purple) — middle-right columns
  { id: "community-management", name: "Community Management", category: "Retention", position_x: 1400, position_y: 200 },
  { id: "churn-left", name: "Churn", category: "Retention", position_x: 1400, position_y: 420 },
  { id: "manual-kick-out", name: "Manual Kick Out", category: "Retention", position_x: 1400, position_y: 560 },
  { id: "workshops-full", name: "Workshops Full Unlock", category: "Retention", position_x: 1750, position_y: 100 },
  { id: "workshops-monthly", name: "Workshops Monthly Unlock", category: "Retention", position_x: 1750, position_y: 260 },
  { id: "upsell", name: "Upsell", category: "Retention", position_x: 2100, position_y: 180 },
  { id: "12-playbooks-immediate", name: "12 PlayBooks Delivery Immediate", category: "Retention", position_x: 2450, position_y: 80 },
  { id: "12-playbooks-6th", name: "12 PlayBooks Delivery 6th Month", category: "Retention", position_x: 2800, position_y: 80 },
  { id: "100m-trilogy-immediate", name: "$100M Trilogy Delivery Immediate", category: "Retention", position_x: 2450, position_y: 280 },
  { id: "100m-trilogy-6th", name: "$100M Trilogy Delivery 6th Month", category: "Retention", position_x: 2800, position_y: 280 },
  { id: "churn-right", name: "Churn", category: "Retention", position_x: 3150, position_y: 180 },

  // Features / Logistics (pink)
  { id: "acq-ai", name: "ACQ AI", category: "Features/Logistics", position_x: 1400, position_y: 0 },
  { id: "read-only", name: "Read Only", category: "Features/Logistics", position_x: 700, position_y: 640 },
  { id: "post-comment", name: "Post & Comment", category: "Features/Logistics", position_x: 700, position_y: 760 },
];

const connections = [
  // Acquisition → Sell By Chat
  { id: "e-ref-sell", source_id: "referrals", target_id: "sell-by-chat", label: null },
  { id: "e-org-sell", source_id: "organic", target_id: "sell-by-chat", label: null },
  { id: "e-paid-sell", source_id: "paid", target_id: "sell-by-chat", label: null },
  { id: "e-book-sell", source_id: "book-skool-funnel", target_id: "sell-by-chat", label: null },

  // Sell By Chat → tiers
  { id: "e-sell-founding", source_id: "sell-by-chat", target_id: "founding-members", label: null },
  { id: "e-sell-vip", source_id: "sell-by-chat", target_id: "vip-premium", label: null },
  { id: "e-sell-std", source_id: "sell-by-chat", target_id: "standard", label: null },

  // Founding Members → tiers
  { id: "e-found-vip", source_id: "founding-members", target_id: "vip-premium", label: null },
  { id: "e-found-std", source_id: "founding-members", target_id: "standard", label: null },

  // Revenue Verification → access levels
  { id: "e-rev-readonly", source_id: "revenue-verification", target_id: "read-only", label: "< $1M ARR" },
  { id: "e-rev-postcomment", source_id: "revenue-verification", target_id: "post-comment", label: "> $1M ARR" },

  // Tiers → Onboarding stage
  { id: "e-vip-onb", source_id: "vip-premium", target_id: "onboarding-stage", label: null },
  { id: "e-std-onb", source_id: "standard", target_id: "onboarding-stage", label: null },

  // Onboarding → downstream
  { id: "e-onb-comm", source_id: "onboarding-stage", target_id: "community-management", label: null },
  { id: "e-onb-ai", source_id: "onboarding-stage", target_id: "acq-ai", label: "Grant access" },

  // Community Management → branches
  { id: "e-comm-churnL", source_id: "community-management", target_id: "churn-left", label: null },
  { id: "e-comm-wfull", source_id: "community-management", target_id: "workshops-full", label: null },
  { id: "e-comm-wmonth", source_id: "community-management", target_id: "workshops-monthly", label: null },

  // Churn left → Manual Kick Out
  { id: "e-churnL-kick", source_id: "churn-left", target_id: "manual-kick-out", label: null },

  // Workshops → Upsell
  { id: "e-wfull-upsell", source_id: "workshops-full", target_id: "upsell", label: null },
  { id: "e-wmonth-upsell", source_id: "workshops-monthly", target_id: "upsell", label: null },

  // Upsell → deliveries
  { id: "e-upsell-12pb", source_id: "upsell", target_id: "12-playbooks-immediate", label: null },
  { id: "e-upsell-100m", source_id: "upsell", target_id: "100m-trilogy-immediate", label: null },

  // Immediate → 6th month
  { id: "e-12pb-6th", source_id: "12-playbooks-immediate", target_id: "12-playbooks-6th", label: null },
  { id: "e-100m-6th", source_id: "100m-trilogy-immediate", target_id: "100m-trilogy-6th", label: null },

  // 6th month → Churn right
  { id: "e-12pb6-churnR", source_id: "12-playbooks-6th", target_id: "churn-right", label: null },
  { id: "e-100m6-churnR", source_id: "100m-trilogy-6th", target_id: "churn-right", label: null },

  // ACQ AI → Community Management (reverse edge — cut access)
  { id: "e-ai-comm", source_id: "acq-ai", target_id: "community-management", label: "Cut access" },
];

async function seed() {
  console.log("Seeding business processes...");

  for (const p of processes) {
    await sql`
      INSERT INTO business_processes (id, name, category, position_x, position_y)
      VALUES (${p.id}, ${p.name}, ${p.category}, ${p.position_x}, ${p.position_y})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        position_x = EXCLUDED.position_x,
        position_y = EXCLUDED.position_y
    `;
  }
  console.log(`  Seeded ${processes.length} processes`);

  for (const c of connections) {
    await sql`
      INSERT INTO process_connections (id, source_id, target_id, label)
      VALUES (${c.id}, ${c.source_id}, ${c.target_id}, ${c.label})
      ON CONFLICT (id) DO UPDATE SET
        source_id = EXCLUDED.source_id,
        target_id = EXCLUDED.target_id,
        label = EXCLUDED.label
    `;
  }
  console.log(`  Seeded ${connections.length} connections`);

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
