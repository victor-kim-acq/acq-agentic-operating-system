"use client";

import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";

const agents = [
  {
    href: "/agents/marketing-ops",
    icon: "\ud83d\udce7",
    name: "Marketing Ops Agent",
    description: "Create email campaigns in HubSpot with AI-generated copy",
  },
  {
    href: "/agents/community-manager",
    icon: "\ud83d\udc65",
    name: "Community Manager Agent",
    description: "Set up scheduled communications for members based on membership milestones",
  },
];

export default function AgentsPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--page-bg)" }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <PageHeader
            title="Agents"
            subtitle="AI-powered tools for ACQ Vantage operations"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Link
              key={agent.href}
              href={agent.href}
              className="rounded-xl border p-6 transition-all"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
                boxShadow: "var(--shadow-sm)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-sm)")}
            >
              <div className="text-3xl mb-3">{agent.icon}</div>
              <div className="font-bold" style={{ color: "var(--neutral-900)" }}>{agent.name}</div>
              <div className="text-sm mt-1" style={{ color: "var(--neutral-500)" }}>{agent.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
