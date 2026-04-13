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

const TIER_STYLES: Record<string, React.CSSProperties> = {
  gold: { background: "#fffbeb", color: "#92400e", boxShadow: "inset 0 0 0 1px #fde68a" },
  silver: { background: "var(--neutral-50)", color: "var(--neutral-700)", boxShadow: "inset 0 0 0 1px var(--neutral-200)" },
  bronze: { background: "#fff7ed", color: "#9a3412", boxShadow: "inset 0 0 0 1px #fed7aa" },
  platinum: { background: "#f5f3ff", color: "#5b21b6", boxShadow: "inset 0 0 0 1px #ddd6fe" },
};

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  const style = TIER_STYLES[tier.toLowerCase()] ?? TIER_STYLES.silver;
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
      style={style}
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
      className="inline-flex items-center gap-1 text-xs font-medium"
      style={{ color: active ? "var(--color-success)" : "var(--neutral-400)" }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: active ? "var(--color-success)" : "var(--neutral-300)" }}
      />
      {status}
    </span>
  );
}

function ResultRow({ member }: { member: MemberResult }) {
  const name =
    [member.firstname, member.lastname].filter(Boolean).join(" ") || "\u2014";
  return (
    <>
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--neutral-900)" }}>{name}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--neutral-500)" }}>{member.email}</p>
      </div>
      <div className="flex items-center gap-3">
        <StatusDot status={member.vtg_current_membership_status} />
        <TierBadge tier={member.vtg_current_membership_tier} />
        <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--brand-primary)" }}>
          View \u2192
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
        placeholder="Search by name or email\u2026"
        className={`flex-1 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
          mode === "compact" ? "px-3 py-2" : "px-4 py-2.5"
        }`}
        style={{
          borderColor: "var(--neutral-200)",
          color: "var(--neutral-800)",
          background: "var(--card-bg)",
          boxShadow: "var(--shadow-xs)",
          '--tw-ring-color': "var(--brand-primary)",
        } as React.CSSProperties}
      />
      <button
        onClick={() => handleSearch(query)}
        disabled={loading || !query.trim()}
        className={`text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          mode === "compact" ? "px-4 py-2" : "px-5 py-2.5"
        }`}
        style={{ background: "var(--brand-primary)", boxShadow: "var(--shadow-xs)" }}
      >
        {loading ? "Searching\u2026" : "Search"}
      </button>
    </div>
  );

  if (mode === "compact") {
    return (
      <div ref={containerRef} className="relative mb-4">
        {searchBar}

        {dropdownOpen && results.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 border rounded-xl z-50 max-h-80 overflow-y-auto"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--shadow-lg)" }}
          >
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
                className="w-full flex items-center justify-between px-4 py-3 transition-colors border-b last:border-0 text-left group"
                style={{ borderColor: "var(--neutral-100)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--neutral-50)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <ResultRow member={m} />
              </button>
            ))}
          </div>
        )}

        {mode === "compact" && searched && results.length === 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 border rounded-xl z-50 px-4 py-3"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--shadow-lg)" }}
          >
            <p className="text-sm" style={{ color: "var(--neutral-500)" }}>
              No members found for &ldquo;{query}&rdquo;.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">{searchBar}</div>

      {searched && results.length === 0 && (
        <p className="text-sm text-center py-10" style={{ color: "var(--neutral-500)" }}>
          No members found for &ldquo;{query}&rdquo;.
        </p>
      )}

      {results.length > 1 && (
        <div className="space-y-2">
          {results.map((m) => (
            <Link
              key={m.contactId}
              href={`/members/${m.contactId}`}
              className="flex items-center justify-between rounded-2xl border px-5 py-4 transition-all group"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
                boxShadow: "var(--shadow-xs)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--neutral-300)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-xs)"; e.currentTarget.style.borderColor = "var(--card-border)"; }}
            >
              <ResultRow member={m} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
