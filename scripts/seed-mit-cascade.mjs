import { sql } from "@vercel/postgres";

const processes = [
  // Tier 1 — Department MITs (y=0)
  { id: "dept-plg", name: "Product-Led Growth & AHA Activation", category: "Department MIT", position_x: 0, position_y: 0,
    metadata: { icon: "⚡", color: "#ef4444", stats: [
      { icon: "🎯", label: "Find activation point, nail time-to-value", value: "" },
    ]}},
  { id: "dept-agents", name: "Agents Team Building", category: "Department MIT", position_x: 400, position_y: 0,
    metadata: { icon: "🤖", color: "#f59e0b", stats: [
      { icon: "🎯", label: "Automate every workflow, AI-enable the team", value: "" },
    ]}},
  { id: "dept-signals", name: "Signals to Scale", category: "Department MIT", position_x: 800, position_y: 0,
    metadata: { icon: "📈", color: "#10b981", stats: [
      { icon: "🎯", label: "Define scaling scorecard: CAC, LTV, retention", value: "" },
    ]}},

  // Tier 2 — Victor's Team MITs (y=350)
  { id: "mit-1", name: "MIT 1: Data Foundation & Infrastructure", category: "Team MIT", position_x: -100, position_y: 350,
    metadata: { icon: "🗄️", color: "#2563eb", stats: [
      { icon: "📋", label: "Democratized data for experiments & decisions", value: "" },
    ]}},
  { id: "mit-2", name: "MIT 2: UI Layer", category: "Team MIT", position_x: 200, position_y: 350,
    metadata: { icon: "🖥️", color: "#7c3aed", stats: [
      { icon: "📋", label: "Self-service tools, remove bottlenecks", value: "" },
    ]}},
  { id: "mit-3", name: "MIT 3: AI Enablement", category: "Team MIT", position_x: 500, position_y: 350,
    metadata: { icon: "🧠", color: "#10b981", stats: [
      { icon: "📋", label: "1 employee + AI leverage = 100x output", value: "" },
    ]}},
  { id: "mit-4", name: "MIT 4: Ascension Operations", category: "Team MIT", position_x: 800, position_y: 350,
    metadata: { icon: "🚀", color: "#f59e0b", stats: [
      { icon: "📋", label: "Automate AP → Vantage ascension motion", value: "" },
    ]}},
  { id: "mit-5", name: "MIT 5: Discovery for Q3", category: "Team MIT", position_x: 1100, position_y: 350,
    metadata: { icon: "🔍", color: "#ec4899", stats: [
      { icon: "📋", label: "AI automation offering for members", value: "" },
    ]}},

  // Tier 3 — MIT 1 deliverables (x=-100)
  { id: "del-nl-slack", name: "Natural Language Data Querying via Slack", category: "Deliverable", position_x: -100, position_y: 650,
    metadata: { icon: "💬", color: "#2563eb", stats: [
      { icon: "📌", label: "No more Victor as reporting bottleneck", value: "" },
    ]}},
  { id: "del-hygiene", name: "Data Hygiene Agent 2.0", category: "Deliverable", position_x: -100, position_y: 780,
    metadata: { icon: "🧹", color: "#2563eb", stats: [
      { icon: "📌", label: "Deduplication agent, forecasting agent", value: "" },
    ]}},
  { id: "del-2nd-layer", name: "Second Data Layer", category: "Deliverable", position_x: -100, position_y: 910,
    metadata: { icon: "📊", color: "#2563eb", stats: [
      { icon: "📌", label: "Activation analysis, LTV, CAC, attribution", value: "" },
    ]}},

  // Tier 3 — MIT 2 deliverables (x=200)
  { id: "del-www-clip", name: "What's Working Wednesday Clip Selector", category: "Deliverable", position_x: 200, position_y: 650,
    metadata: { icon: "🎬", color: "#7c3aed", stats: [
      { icon: "📌", label: "UI for community managers", value: "" },
    ]}},
  { id: "del-email-seq", name: "Email Sequence Builder", category: "Deliverable", position_x: 200, position_y: 780,
    metadata: { icon: "📧", color: "#7c3aed", stats: [
      { icon: "📌", label: "NL input → auto-built HubSpot sequence", value: "" },
    ]}},
  { id: "del-promo", name: "Promo Code Generator", category: "Deliverable", position_x: 200, position_y: 910,
    metadata: { icon: "🏷️", color: "#7c3aed", stats: [
      { icon: "📌", label: "Self-service for sales team", value: "" },
    ]}},

  // Tier 3 — MIT 3 deliverables (x=500)
  { id: "del-skills-doc", name: "Skills Documentation for Data Analysis", category: "Deliverable", position_x: 500, position_y: 650,
    metadata: { icon: "📄", color: "#10b981", stats: [
      { icon: "📌", label: "Reusable file any team member can give any agent", value: "" },
    ]}},
  { id: "del-vibe-guide", name: "Vibe Coding / Automation Guide", category: "Deliverable", position_x: 500, position_y: 780,
    metadata: { icon: "📖", color: "#10b981", stats: [
      { icon: "📌", label: "Build your own agents with guardrails", value: "" },
    ]}},

  // Tier 3 — MIT 4 deliverables (x=800)
  { id: "del-hubspot-transcripts", name: "Auto-Populate HubSpot from Transcripts", category: "Deliverable", position_x: 800, position_y: 650,
    metadata: { icon: "🎙️", color: "#f59e0b", stats: [
      { icon: "📌", label: "Accurate pipeline management", value: "" },
    ]}},
  { id: "del-conversion-insights", name: "Conversion Insights & Experiment Reporting", category: "Deliverable", position_x: 800, position_y: 780,
    metadata: { icon: "📈", color: "#f59e0b", stats: [
      { icon: "📌", label: "Visibility on what's converting", value: "" },
    ]}},

  // Tier 3 — MIT 5 deliverables (x=1100)
  { id: "del-fde-model", name: "Forward Deployed Engineer Model Validation", category: "Deliverable", position_x: 1100, position_y: 650,
    metadata: { icon: "🏗️", color: "#ec4899", stats: [
      { icon: "📌", label: "CRM/systems automation at SMBs", value: "" },
    ]}},
  { id: "del-go-nogo", name: "Exit Q2 with go/no-go decision", category: "Deliverable", position_x: 1100, position_y: 780,
    metadata: { icon: "🚦", color: "#ec4899", stats: [
      { icon: "📌", label: "Clear first thing to build, or deprioritize", value: "" },
    ]}},
];

const connections = [
  // Tier 1 → Tier 2 (Department → Team MITs)
  { id: "e-plg-mit1", source_id: "dept-plg", target_id: "mit-1", label: null },
  { id: "e-agents-mit1", source_id: "dept-agents", target_id: "mit-1", label: null },
  { id: "e-signals-mit1", source_id: "dept-signals", target_id: "mit-1", label: null },
  { id: "e-agents-mit2", source_id: "dept-agents", target_id: "mit-2", label: null },
  { id: "e-agents-mit3", source_id: "dept-agents", target_id: "mit-3", label: null },
  { id: "e-plg-mit4", source_id: "dept-plg", target_id: "mit-4", label: null },
  { id: "e-signals-mit4", source_id: "dept-signals", target_id: "mit-4", label: null },
  { id: "e-signals-mit5", source_id: "dept-signals", target_id: "mit-5", label: null },

  // Tier 2 → Tier 3 (Team MITs → Deliverables)
  { id: "e-mit1-nlslack", source_id: "mit-1", target_id: "del-nl-slack", label: null },
  { id: "e-mit1-hygiene", source_id: "mit-1", target_id: "del-hygiene", label: null },
  { id: "e-mit1-2ndlayer", source_id: "mit-1", target_id: "del-2nd-layer", label: null },
  { id: "e-mit2-www", source_id: "mit-2", target_id: "del-www-clip", label: null },
  { id: "e-mit2-email", source_id: "mit-2", target_id: "del-email-seq", label: null },
  { id: "e-mit2-promo", source_id: "mit-2", target_id: "del-promo", label: null },
  { id: "e-mit3-skills", source_id: "mit-3", target_id: "del-skills-doc", label: null },
  { id: "e-mit3-vibe", source_id: "mit-3", target_id: "del-vibe-guide", label: null },
  { id: "e-mit4-hubspot", source_id: "mit-4", target_id: "del-hubspot-transcripts", label: null },
  { id: "e-mit4-conversion", source_id: "mit-4", target_id: "del-conversion-insights", label: null },
  { id: "e-mit5-fde", source_id: "mit-5", target_id: "del-fde-model", label: null },
  { id: "e-mit5-gonogo", source_id: "mit-5", target_id: "del-go-nogo", label: null },
];

async function seed() {
  console.log("Seeding MIT cascade nodes...");

  for (const p of processes) {
    await sql`
      INSERT INTO business_processes (id, name, category, description, position_x, position_y, metadata)
      VALUES (${p.id}, ${p.name}, ${p.category}, ${null}, ${p.position_x}, ${p.position_y}, CAST(${JSON.stringify(p.metadata)} AS jsonb))
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        position_x = EXCLUDED.position_x,
        position_y = EXCLUDED.position_y,
        metadata = EXCLUDED.metadata
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

  console.log("MIT cascade seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
