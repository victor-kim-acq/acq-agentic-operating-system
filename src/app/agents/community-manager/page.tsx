"use client";

import Link from "next/link";
import { useEffect, useState, FormEvent, useCallback } from "react";

type Rule = {
  id: number | string;
  communication_type: string;
  email_subject: string;
  email_body: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  interval_days: number;
  is_active: boolean;
  created_at: string;
};

const DEFAULT_FROM_NAME = "Saulo Medeiros";
const DEFAULT_FROM_EMAIL = "vantage@acquisition.com";

export default function CommunityManagerAgentPage() {
  const [communicationType, setCommunicationType] = useState("");
  const [intervalDays, setIntervalDays] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [fromName, setFromName] = useState(DEFAULT_FROM_NAME);
  const [fromEmail, setFromEmail] = useState(DEFAULT_FROM_EMAIL);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/community-manager?t=${Date.now()}`);
      if (!res.ok) return;
      const data = (await res.json()) as Rule[];
      setRules(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!communicationType.trim() || !intervalDays || !emailSubject.trim() || !emailBody.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/agents/community-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communication_type: communicationType.trim(),
          interval_days: parseInt(intervalDays, 10),
          email_subject: emailSubject.trim(),
          email_body: emailBody,
          from_name: fromName.trim(),
          from_email: fromEmail.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      setCommunicationType("");
      setIntervalDays("");
      setEmailSubject("");
      setEmailBody("");
      setFromName(DEFAULT_FROM_NAME);
      setFromEmail(DEFAULT_FROM_EMAIL);
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(rule: Rule) {
    try {
      const res = await fetch("/api/agents/community-manager", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
      });
      if (!res.ok) return;
      await loadRules();
    } catch {
      // ignore
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link
          href="/agents"
          className="text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4 inline-block"
        >
          ← Back to Agents
        </Link>
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Community Manager Agent</h1>
          <p className="text-sm text-slate-500 mt-1">
            Set up scheduled communications for members based on membership milestones
          </p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="communication-type" className="block text-sm font-medium text-slate-700 mb-1.5">
                Communication Type
              </label>
              <input
                id="communication-type"
                type="text"
                required
                disabled={loading}
                value={communicationType}
                onChange={(e) => setCommunicationType(e.target.value)}
                placeholder="day_31_survey"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label htmlFor="interval-days" className="block text-sm font-medium text-slate-700 mb-1.5">
                Interval (days since join)
              </label>
              <input
                id="interval-days"
                type="number"
                min="0"
                required
                disabled={loading}
                value={intervalDays}
                onChange={(e) => setIntervalDays(e.target.value)}
                placeholder="31"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email-subject" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email Subject
            </label>
            <input
              id="email-subject"
              type="text"
              required
              disabled={loading}
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label htmlFor="email-body" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email Body
            </label>
            <textarea
              id="email-body"
              rows={9}
              required
              disabled={loading}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Paste the email copy here. Plain text with line breaks."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="from-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                From Name
              </label>
              <input
                id="from-name"
                type="text"
                disabled={loading}
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label htmlFor="from-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                From Email
              </label>
              <input
                id="from-email"
                type="text"
                disabled={loading}
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-4 rounded-md transition-colors"
          >
            {loading ? "Creating..." : "Create Communication Rule"}
          </button>
        </form>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Active Rules</h2>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            {rules.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 text-center">
                No communication rules yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5">Type</th>
                    <th className="text-left px-4 py-2.5">Day</th>
                    <th className="text-left px-4 py-2.5">Subject</th>
                    <th className="text-left px-4 py-2.5">Status</th>
                    <th className="text-left px-4 py-2.5">Created</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700">
                        {rule.communication_type}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{rule.interval_days}</td>
                      <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate">
                        {rule.email_subject}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            rule.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {rule.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {new Date(rule.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => toggleActive(rule)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {rule.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
