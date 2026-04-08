"use client";

import Link from "next/link";

const agents = [
  {
    href: "/agents/marketing-ops",
    icon: "📧",
    name: "Marketing Ops Agent",
    description: "Create email campaigns in HubSpot with AI-generated copy",
  },
  {
    href: "/agents/community-manager",
    icon: "👥",
    name: "Community Manager Agent",
    description: "Set up scheduled communications for members based on membership milestones",
  },
];

export default function AgentsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Agents</h1>
          <p className="text-sm text-slate-500 mt-1">
            AI-powered tools for ACQ Vantage operations
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Link
              key={agent.href}
              href={agent.href}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{agent.icon}</div>
              <div className="font-bold text-slate-900">{agent.name}</div>
              <div className="text-sm text-slate-500 mt-1">{agent.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
