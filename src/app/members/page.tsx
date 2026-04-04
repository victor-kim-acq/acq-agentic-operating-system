"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface MemberResult {
  contactId: string;
  firstname: string;
  lastname: string;
  email: string;
  vtg_current_membership_tier: string | null;
  vtg_current_membership_status: string | null;
  vtg_billing_source: string | null;
}

const TIER_COLORS: Record<string, string> = {
  gold: "bg-amber-100 text-amber-700",
  silver: "bg-slate-100 text-slate-600",
  bronze: "bg-orange-100 text-orange-700",
  platinum: "bg-purple-100 text-purple-700",
};

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  const key = tier.toLowerCase();
  const cls = TIER_COLORS[key] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {tier}
    </span>
  );
}

function StatusDot({ status }: { status: string | null }) {
  if (!status) return null;
  const active = status.toLowerCase() === "active";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        active ? "text-emerald-600" : "text-slate-400"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`}
      />
      {status}
    </span>
  );
}

export default function MembersPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(false);

    const res = await fetch(
      `/api/members/search?q=${encodeURIComponent(q.trim())}`
    );

    if (res.status === 401) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }

    const data = await res.json();
    const found: MemberResult[] = data.results ?? [];
    setResults(found);
    setSearched(true);
    setLoading(false);

    if (found.length === 1) {
      router.push(`/members/${found[0].contactId}`);
    }
  }

  if (unauthorized) {
    return (
      <div className="min-h-[calc(100vh-44px)] bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">You need to log in to view member data.</p>
          <Link
            href="/members/login"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-44px)] bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Members</h1>
          <p className="text-sm text-slate-500 mt-1">
            Search HubSpot contacts by name or email.
          </p>
        </div>

        {/* Search input */}
        <div className="flex gap-3 mb-8">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
            placeholder="Search by name or email…"
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          />
          <button
            onClick={() => handleSearch(query)}
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        {/* Results */}
        {searched && results.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-10">
            No members found for &ldquo;{query}&rdquo;.
          </p>
        )}

        {results.length > 1 && (
          <div className="space-y-2">
            {results.map((m) => (
              <Link
                key={m.contactId}
                href={`/members/${m.contactId}`}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-4 hover:shadow-md transition-all group"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {[m.firstname, m.lastname].filter(Boolean).join(" ") || "—"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{m.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusDot status={m.vtg_current_membership_status} />
                  <TierBadge tier={m.vtg_current_membership_tier} />
                  <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    View →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
