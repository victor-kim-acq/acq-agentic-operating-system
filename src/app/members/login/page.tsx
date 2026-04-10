"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/members");
    } else {
      setError("Incorrect password.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-44px)] flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
      <div
        className="rounded-xl border p-8 w-full max-w-sm"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <h1 className="text-xl font-bold mb-1" style={{ color: "var(--neutral-900)" }}>Member Access</h1>
        <p className="text-sm mb-6" style={{ color: "var(--neutral-500)" }}>
          Enter the dashboard password to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
            style={{
              borderColor: "var(--neutral-200)",
              color: "var(--neutral-800)",
              '--tw-ring-color': "var(--brand-primary)",
            } as React.CSSProperties}
          />

          {error && <p className="text-xs" style={{ color: "var(--color-danger)" }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--brand-primary)" }}
          >
            {loading ? "Signing in\u2026" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
