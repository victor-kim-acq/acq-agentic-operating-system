"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  gold: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  silver: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
  bronze: "bg-orange-50 text-orange-800 ring-1 ring-orange-200",
  platinum: "bg-violet-50 text-violet-800 ring-1 ring-violet-200",
};

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  const cls =
    TIER_COLORS[tier.toLowerCase()] ??
    "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${cls}`}
    >
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
        active ? "text-emerald-700" : "text-slate-400"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-slate-300"
        }`}
      />
      {status}
    </span>
  );
}

function ResultRow({ member }: { member: MemberResult }) {
  const name =
    [member.firstname, member.lastname].filter(Boolean).join(" ") || "—";
  return (
    <>
      <div>
        <p className="text-sm font-semibold text-slate-900">{name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{member.email}</p>
      </div>
      <div className="flex items-center gap-3">
        <StatusDot status={member.vtg_current_membership_status} />
        <TierBadge tier={member.vtg_current_membership_tier} />
        <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
          View →
        </span>
      </div>
    </>
  );
}

interface MemberSearchProps {
  mode: "full" | "compact";
  onUnauthorized?: () => void;
}

export default function MemberSearch({
  mode,
  onUnauthorized,
}: MemberSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  async function handleSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(false);

    const res = await fetch(
      `/api/members/search?q=${encodeURIComponent(q.trim())}`
    );

    if (res.status === 401) {
      onUnauthorized?.();
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
      setDropdownOpen(false);
    } else if (mode === "compact") {
      setDropdownOpen(found.length > 0);
    }
  }

  const closeDropdown = useCallback(() => {
    setDropdownOpen(false);
  }, []);

  useEffect(() => {
    if (mode !== "compact" || !dropdownOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeDropdown();
    }
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mode, dropdownOpen, closeDropdown]);

  const searchBar = (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
        placeholder="Search by name or email…"
        className={`flex-1 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm ${
          mode === "compact" ? "px-3 py-2" : "px-4 py-2.5"
        }`}
      />
      <button
        onClick={() => handleSearch(query)}
        disabled={loading || !query.trim()}
        className={`bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm ${
          mode === "compact" ? "px-4 py-2" : "px-5 py-2.5"
        }`}
      >
        {loading ? "Searching…" : "Search"}
      </button>
    </div>
  );

  if (mode === "compact") {
    return (
      <div ref={containerRef} className="relative mb-4">
        {searchBar}

        {/* Dropdown results */}
        {dropdownOpen && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
            {results.map((m) => (
              <button
                key={m.contactId}
                onClick={() => {
                  setDropdownOpen(false);
                  setQuery("");
                  setResults([]);
                  setSearched(false);
                  router.push(`/members/${m.contactId}`);
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 text-left group"
              >
                <ResultRow member={m} />
              </button>
            ))}
          </div>
        )}

        {/* No results in compact mode */}
        {mode === "compact" && searched && results.length === 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 px-4 py-3">
            <p className="text-sm text-slate-500">
              No members found for &ldquo;{query}&rdquo;.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div>
      <div className="mb-8">{searchBar}</div>

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
              <ResultRow member={m} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
