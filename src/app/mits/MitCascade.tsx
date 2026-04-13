"use client";

// ── Types ──────────────────────────────────────────────────────────────

interface CascadeDeliverable {
  id: string;
  title: string;
  description: string;
  owners: string[];
}

interface CascadeMit {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  parentIds: string[];
  deliverables: CascadeDeliverable[];
  owners: string[];
  color: string;
}

interface CascadeGoal {
  id: string;
  title: string;
  description: string;
  color: string;
  tint: string;
}

// ── Hardcoded Data ─────────────────────────────────────────────────────

const GOALS: CascadeGoal[] = [
  {
    id: "plg",
    title: "Product-Led Growth & AHA Activation",
    description:
      "Find the activation point, nail time-to-value, and make the product so good members grow organically",
    color: "#2563eb",
    tint: "#eff6ff",
  },
  {
    id: "agents",
    title: "Agents Team Building",
    description:
      "Map every workflow, automate it, and make every team member proficient in building their own agents",
    color: "#10b981",
    tint: "#ecfdf5",
  },
  {
    id: "signals",
    title: "Signals to Scale",
    description:
      "Define the scorecard of what needs to be true (CAC, LTV, retention, ascension) before scaling aggressively",
    color: "#f59e0b",
    tint: "#fffbeb",
  },
];

const GOAL_MAP = Object.fromEntries(GOALS.map((g) => [g.id, g]));

const MITS: CascadeMit[] = [
  {
    id: "mit-1",
    number: 1,
    title: "Data Foundation & Infrastructure",
    subtitle: "Democratized data enables better experiments and decisions",
    parentIds: ["plg", "agents", "signals"],
    color: "#2563eb",
    owners: [],
    deliverables: [
      {
        id: "d-1a",
        title: "Natural Language Data Querying via Slack",
        description: "No more Victor as the reporting bottleneck",
        owners: [],
      },
      {
        id: "d-1b",
        title: "Data Hygiene Agent 2.0",
        description: "Deduplication agent, forecasting agent",
        owners: [],
      },
      {
        id: "d-1c",
        title: "Second Data Layer",
        description: "Activation point analysis, LTV, CAC, attribution/UTM",
        owners: [],
      },
    ],
  },
  {
    id: "mit-2",
    number: 2,
    title: "UI Layer",
    subtitle:
      "Self-service tools that remove Victor as the operational bottleneck",
    parentIds: ["agents"],
    color: "#7c3aed",
    owners: [],
    deliverables: [
      {
        id: "d-2a",
        title: "What's Working Wednesday Clip Selector",
        description: "UI for community managers",
        owners: [],
      },
      {
        id: "d-2b",
        title: "Email Sequence Builder",
        description: "Natural language input → auto-built HubSpot sequence",
        owners: [],
      },
      {
        id: "d-2c",
        title: "Promo Code Generator",
        description: "Self-service for sales team",
        owners: [],
      },
    ],
  },
  {
    id: "mit-3",
    number: 3,
    title: "AI Enablement",
    subtitle: "One employee with high AI leverage = 100 employees output",
    parentIds: ["agents"],
    color: "#10b981",
    owners: [],
    deliverables: [
      {
        id: "d-3a",
        title: "Skills Documentation for Data Analysis",
        description: "Reusable file any team member can give any agent",
        owners: [],
      },
      {
        id: "d-3b",
        title: "Vibe Coding / Automation Guide",
        description: "How to build your own agents with guardrails",
        owners: [],
      },
    ],
  },
  {
    id: "mit-4",
    number: 4,
    title: "Ascension Operations",
    subtitle:
      "Automate and bring data visibility to the AP → Vantage ascension motion",
    parentIds: ["plg", "signals"],
    color: "#f59e0b",
    owners: [],
    deliverables: [
      {
        id: "d-4a",
        title: "Auto-Populate HubSpot from Meeting Transcripts",
        description: "Accurate pipeline management",
        owners: [],
      },
      {
        id: "d-4b",
        title: "Conversion Insights & Experiment Reporting",
        description: "Visibility on what's actually converting",
        owners: [],
      },
    ],
  },
  {
    id: "mit-5",
    number: 5,
    title: "Discovery for Q3",
    subtitle:
      "Exploring AI automation as a potential offering for Vantage members",
    parentIds: ["signals"],
    color: "#ec4899",
    owners: [],
    deliverables: [
      {
        id: "d-5a",
        title: "Forward Deployed Engineer Model Validation",
        description: "CRM/systems automation at SMBs",
        owners: [],
      },
      {
        id: "d-5b",
        title: "Exit Q2 with go/no-go decision",
        description: "Clear first thing to build, or deprioritize",
        owners: [],
      },
    ],
  },
];

// ── Main Component ─────────────────────────────────────────────────────

export default function MitCascade() {
  return (
    <div style={{ minWidth: 900, paddingBottom: 24 }}>
      {/* ── Tier 1 label ── */}
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--neutral-400)" }}
      >
        Vantage Department MITs — Q2 2026
      </p>

      {/* ── Tier 1: Goals ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {GOALS.map((g) => (
          <div
            key={g.id}
            style={{
              flex: "1 1 0",
              maxWidth: 300,
              background: g.tint,
              border: "1px solid var(--card-border)",
              borderLeft: `3px solid ${g.color}`,
              borderRadius: "var(--radius-lg)",
              padding: "20px 18px",
              boxShadow: "var(--shadow-sm)",
              transition: "box-shadow 150ms ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow = "var(--shadow-md)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.boxShadow = "var(--shadow-sm)")
            }
          >
            <h3
              className="text-sm font-bold leading-snug mb-1.5"
              style={{ color: "var(--neutral-900)" }}
            >
              {g.title}
            </h3>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--neutral-500)" }}
            >
              {g.description}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tier 2 label ── */}
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--neutral-400)" }}
      >
        Victor&apos;s Team MITs
      </p>

      {/* ── Tier 2: MITs ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          alignItems: "flex-start",
          marginBottom: 0,
        }}
      >
        {MITS.map((mit) => (
          <div
            key={mit.id}
            style={{
              flex: "1 1 0",
              maxWidth: 220,
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-sm)",
              transition: "box-shadow 150ms ease",
              overflow: "hidden",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow = "var(--shadow-md)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.boxShadow = "var(--shadow-sm)")
            }
          >
            <div style={{ padding: "14px 14px 12px" }}>
              {/* Parent indicator dots */}
              <div
                style={{
                  display: "flex",
                  gap: 5,
                  marginBottom: 8,
                }}
              >
                {mit.parentIds.map((pid) => {
                  const goal = GOAL_MAP[pid];
                  return (
                    <span
                      key={pid}
                      title={goal?.title}
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: goal?.color ?? "var(--neutral-300)",
                        flexShrink: 0,
                        cursor: "default",
                      }}
                    />
                  );
                })}
              </div>

              <div
                className="text-xs font-semibold mb-1"
                style={{ color: mit.color }}
              >
                MIT {mit.number}
              </div>
              <h4
                className="text-sm font-bold leading-snug mb-1"
                style={{ color: "var(--neutral-900)" }}
              >
                {mit.title}
              </h4>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--neutral-500)" }}
              >
                {mit.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tier 3 label ── */}
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--neutral-400)" }}
      >
        Key Deliverables
      </p>

      {/* ── Tier 3: Deliverables ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {MITS.map((mit) => (
          <div
            key={mit.id}
            style={{
              flex: "1 1 0",
              maxWidth: 220,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {mit.deliverables.map((d) => (
              <div
                key={d.id}
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "var(--radius-md)",
                  padding: 12,
                  boxShadow: "var(--shadow-sm)",
                  transition: "box-shadow 150ms ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = "var(--shadow-md)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow = "var(--shadow-sm)")
                }
              >
                <p
                  className="text-xs font-semibold leading-snug mb-0.5"
                  style={{ color: "var(--neutral-800)" }}
                >
                  {d.title}
                </p>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--neutral-500)" }}
                >
                  {d.description}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
