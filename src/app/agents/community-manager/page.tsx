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

  const [previewRuleId, setPreviewRuleId] = useState<string | number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    members: { full_name: string; email: string; join_date: string; days_since_join: number; send_status: string | null; sent_at: string | null }[];
    count: number;
    rule: { communication_type: string; interval_days: number };
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editDraft, setEditDraft] = useState<Rule | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  function toggleExpanded(rule: Rule) {
    setExpandedId((prev) => (prev === rule.id ? null : rule.id));
  }

  function startEdit(rule: Rule) {
    setEditingId(rule.id);
    setEditDraft({ ...rule });
    setExpandedId(rule.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit() {
    if (!editDraft) return;
    setEditSaving(true);
    try {
      const res = await fetch("/api/agents/community-manager", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editDraft.id,
          communication_type: editDraft.communication_type,
          email_subject: editDraft.email_subject,
          email_body: editDraft.email_body,
          from_name: editDraft.from_name,
          from_email: editDraft.from_email,
          interval_days: editDraft.interval_days,
        }),
      });
      if (!res.ok) return;
      await loadRules();
      setEditingId(null);
      setEditDraft(null);
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteRule(rule: Rule) {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/agents/community-manager?id=${rule.id}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      if (expandedId === rule.id) setExpandedId(null);
      if (editingId === rule.id) cancelEdit();
      if (previewRuleId === rule.id) closePreview();
      await loadRules();
    } catch {
      // ignore
    }
  }

  async function openPreview(rule: Rule) {
    setPreviewRuleId(rule.id);
    setPreviewLoading(true);
    setPreviewData(null);
    setPreviewError(null);
    try {
      const res = await fetch(`/api/agents/community-manager/preview?rule_id=${rule.id}&t=${Date.now()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setPreviewData(await res.json());
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreviewRuleId(null);
    setPreviewData(null);
    setPreviewError(null);
  }

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
      <div className="max-w-4xl mx-auto px-6 py-8">
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
              <ul className="divide-y divide-slate-100">
                {rules.map((rule) => {
                  const isExpanded = expandedId === rule.id;
                  const isEditing = editingId === rule.id;
                  return (
                    <li
                      key={rule.id}
                      className={`transition-opacity ${rule.is_active ? "" : "opacity-50"}`}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(rule)}
                          className="text-slate-400 hover:text-slate-700 text-xs w-4"
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? "▼" : "▶"}
                        </button>
                        <div className="font-mono text-xs text-slate-700 w-40 truncate">
                          {rule.communication_type}
                        </div>
                        <div className="text-xs text-slate-500 w-16">
                          Day {rule.interval_days}
                        </div>
                        <div className="text-sm text-slate-700 flex-1 truncate">
                          {rule.email_subject}
                        </div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            rule.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {rule.is_active ? "Active" : "Inactive"}
                        </span>
                        <div className="text-xs text-slate-400 w-20 text-right">
                          {new Date(rule.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2 items-center">
                          <button
                            type="button"
                            onClick={() => openPreview(rule)}
                            className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(rule)}
                            className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(rule)}
                            className={`text-xs px-2 py-1 rounded font-medium border ${
                              rule.is_active
                                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                : "border-green-200 text-green-700 hover:bg-green-50"
                            }`}
                          >
                            {rule.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRule(rule)}
                            className="text-xs px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {isExpanded && !isEditing && (
                        <div className="px-4 pb-4 pl-11 space-y-2 bg-slate-50/50">
                          <div className="text-xs text-slate-500">
                            <span className="font-medium">From:</span> {rule.from_name} &lt;{rule.from_email}&gt;
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                              Email Body
                            </div>
                            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans bg-white border border-slate-200 rounded-md p-3">
                              {rule.email_body}
                            </pre>
                          </div>
                        </div>
                      )}

                      {isEditing && editDraft && (
                        <div className="px-4 pb-4 pl-11 space-y-3 bg-slate-50/50">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Communication Type
                              </label>
                              <input
                                type="text"
                                readOnly
                                value={editDraft.communication_type}
                                className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-100 text-slate-500 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Interval (days)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={editDraft.interval_days}
                                onChange={(e) =>
                                  setEditDraft({ ...editDraft, interval_days: parseInt(e.target.value || "0", 10) })
                                }
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              Email Subject
                            </label>
                            <input
                              type="text"
                              value={editDraft.email_subject}
                              onChange={(e) => setEditDraft({ ...editDraft, email_subject: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              Email Body
                            </label>
                            <textarea
                              rows={9}
                              value={editDraft.email_body}
                              onChange={(e) => setEditDraft({ ...editDraft, email_body: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                From Name
                              </label>
                              <input
                                type="text"
                                value={editDraft.from_name}
                                onChange={(e) => setEditDraft({ ...editDraft, from_name: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                From Email
                              </label>
                              <input
                                type="text"
                                value={editDraft.from_email}
                                onChange={(e) => setEditDraft({ ...editDraft, from_email: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={editSaving}
                              className="text-xs px-3 py-1.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={editSaving}
                              className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium"
                            >
                              {editSaving ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {previewRuleId !== null && (
            <div className="mt-4 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-900">
                  {previewLoading
                    ? "Loading preview..."
                    : previewError
                    ? "Preview"
                    : previewData
                    ? `${previewData.count} member${previewData.count === 1 ? "" : "s"} at milestone for ${previewData.rule.communication_type}`
                    : "Preview"}
                </h3>
                <button
                  type="button"
                  onClick={closePreview}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Close
                </button>
              </div>
              {previewError ? (
                <div className="p-4 text-sm text-red-700">{previewError}</div>
              ) : previewLoading ? (
                <div className="p-6 text-sm text-slate-500 text-center">Loading...</div>
              ) : previewData && previewData.count === 0 ? (
                <div className="p-6 text-sm text-slate-500 text-center">
                  No members hitting this milestone today.
                </div>
              ) : previewData ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-2.5">Name</th>
                      <th className="text-left px-4 py-2.5">Email</th>
                      <th className="text-left px-4 py-2.5">Join Date</th>
                      <th className="text-left px-4 py-2.5">Days Since Join</th>
                      <th className="text-left px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.members.map((m) => (
                      <tr key={m.email}>
                        <td className="px-4 py-2.5 text-slate-700">{m.full_name}</td>
                        <td className="px-4 py-2.5 text-slate-700">{m.email}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">
                          {new Date(m.join_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{m.days_since_join}</td>
                        <td className="px-4 py-2.5">
                          {m.send_status === "sent" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Sent
                              {m.sent_at && (
                                <span className="text-green-500 font-normal">
                                  {new Date(m.sent_at).toLocaleDateString()}
                                </span>
                              )}
                            </span>
                          ) : m.send_status === "error" ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Error
                            </span>
                          ) : m.send_status === "skipped" ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                              Skipped
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
