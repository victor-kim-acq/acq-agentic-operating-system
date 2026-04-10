"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import PageHeader from "@/components/ui/PageHeader";

type CampaignResponse = {
  success: boolean;
  campaign_name: string;
  workflow_url: string;
  email_count: number;
  list_name: string;
  list_id: string;
  list_created: boolean;
  message: string;
};

const inputCls = "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed resize-y";
const inputStyle: React.CSSProperties = {
  borderColor: "var(--neutral-200)",
  color: "var(--neutral-800)",
  '--tw-ring-color': "var(--brand-primary)",
} as React.CSSProperties;

export default function MarketingOpsAgentPage() {
  const [brief, setBrief] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [referenceEmails, setReferenceEmails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CampaignResponse | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!brief.trim()) return;

    setLoading(true);
    setError(null);

    const payload: Record<string, string> = { brief: brief.trim() };
    if (campaignName.trim()) payload.campaign_name = campaignName.trim();
    if (referenceEmails.trim()) payload.reference_emails = referenceEmails.trim();

    try {
      const res = await fetch("/api/agents/marketing-ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);

      const data = (await res.json()) as CampaignResponse;
      if (!data.success) throw new Error(data.message || "Campaign creation failed");

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setBrief("");
    setCampaignName("");
    setReferenceEmails("");
    setResult(null);
    setError(null);
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--page-bg)" }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link
          href="/agents"
          className="text-sm transition-colors mb-4 inline-block"
          style={{ color: "var(--neutral-500)" }}
        >
          \u2190 Back to Agents
        </Link>
        <div className="mb-8">
          <PageHeader
            title="Marketing Ops Agent"
            subtitle="Create email campaigns in HubSpot with our marketing ops agent"
          />
        </div>

        {result ? (
          <div
            className="rounded-xl border p-6"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--shadow-sm)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--color-success-light)" }}>
                <svg className="w-5 h-5" style={{ color: "var(--color-success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--neutral-900)" }}>Campaign created</h2>
            </div>

            <dl className="space-y-3 mb-6">
              {[
                { label: "Campaign Name", value: result.campaign_name },
                { label: "Emails Created", value: result.email_count },
                { label: "Enrollment List", value: result.list_name },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--neutral-500)" }}>{label}</dt>
                  <dd className="text-sm mt-0.5" style={{ color: "var(--neutral-900)" }}>{value}</dd>
                </div>
              ))}
            </dl>

            {!result.list_created && (
              <div className="mb-4 p-3 rounded-lg border text-sm" style={{ background: "var(--color-warning-light)", borderColor: "var(--color-warning)", color: "var(--neutral-800)" }}>
                Enrollment list creation failed \u2014 set enrollment manually in HubSpot.
              </div>
            )}

            <a
              href={result.workflow_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
              style={{ background: "var(--brand-primary)" }}
            >
              Review in HubSpot \u2192
            </a>
            <button
              type="button"
              onClick={reset}
              className="block w-full text-center mt-2 text-sm py-2 transition-colors"
              style={{ color: "var(--neutral-500)" }}
            >
              Create Another
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border p-6 space-y-5"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--shadow-sm)" }}
          >
            <div>
              <label htmlFor="brief" className="block text-sm font-medium mb-1.5" style={{ color: "var(--neutral-700)" }}>
                Campaign Brief
              </label>
              <textarea
                id="brief"
                rows={9}
                required
                disabled={loading}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={`Describe your campaign. You can include pre-written email templates, or just describe the goal and we'll write the copy for you.\n\nExample: "Write a 3-email sequence announcing a live workshop on hiring, happening April 22nd at 10am PDT. The zoom link is https://zoom.us/j/123456. Email 1 goes out 5 days before, email 2 goes out 1 day before, email 3 goes out the morning of. The speaker is Caio Beleza, President of ACQ Vantage."`}
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="campaign-name" className="block text-sm font-medium mb-1.5" style={{ color: "var(--neutral-700)" }}>
                Campaign Name
              </label>
              <input
                id="campaign-name"
                type="text"
                disabled={loading}
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. ACQ Vantage - Hiring Workshop (April 2026)"
                className={inputCls}
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: "var(--neutral-500)" }}>
                Optional. If left blank, one will be generated automatically.
              </p>
            </div>

            <div>
              <label htmlFor="reference-emails" className="block text-sm font-medium mb-1.5" style={{ color: "var(--neutral-700)" }}>
                Reference Emails for Tone/Style
              </label>
              <textarea
                id="reference-emails"
                rows={1}
                disabled={loading}
                value={referenceEmails}
                onChange={(e) => setReferenceEmails(e.target.value)}
                placeholder="Paste example emails here if you want to match a specific tone or style..."
                className={inputCls}
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: "var(--neutral-500)" }}>
                Optional. The system already knows Alex&apos;s writing style.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg border text-sm" style={{ background: "var(--color-danger-light)", borderColor: "var(--color-danger)", color: "var(--neutral-800)" }}>
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || !brief.trim()}
                className="w-full text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--brand-primary)" }}
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {loading ? "Creating campaign..." : "Create Campaign"}
              </button>
              {loading && (
                <p className="text-xs text-center mt-2" style={{ color: "var(--neutral-500)" }}>
                  This usually takes 15\u201330 seconds. Please don&apos;t close this tab.
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
