"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { User } from "./page";

interface AddMitModalProps {
  users: User[];
  onClose: () => void;
  onCreated: () => void;
}

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none";
const inputStyle: React.CSSProperties = {
  borderColor: "var(--neutral-200)",
  color: "var(--neutral-800)",
  '--tw-ring-color': "var(--brand-primary)",
} as React.CSSProperties;

export default function AddMitModal({ users, onClose, onCreated }: AddMitModalProps) {
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [status, setStatus] = useState("on_track");
  const [problemStatement, setProblemStatement] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [quarter, setQuarter] = useState("");
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/mits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          title: title.trim(),
          owner_id: ownerId || null,
          status,
          problem_statement: problemStatement.trim() || null,
          hypothesis: hypothesis.trim() || null,
          quarter: quarter ? parseInt(quarter) : null,
          year: year ? parseInt(year) : null,
          sort_order: null,
        }),
      });

      if (res.ok) {
        onCreated();
      }
    } catch (err) {
      console.error("Failed to create MIT:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="New MIT">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--neutral-600)" }}>
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            style={inputStyle}
            placeholder="e.g., Product-Led Growth & AHA Activation"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--neutral-600)" }}>Owner</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">Unassigned</option>
              {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--neutral-600)" }}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="off_track">Off Track</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--neutral-600)" }}>Quarter</label>
            <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">None</option>
              <option value="1">Q1</option>
              <option value="2">Q2</option>
              <option value="3">Q3</option>
              <option value="4">Q4</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--neutral-600)" }}>Year</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} style={inputStyle} placeholder="2026" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--neutral-600)" }}>Problem Statement</label>
          <textarea value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} rows={3} className={inputCls} style={inputStyle} placeholder="What problem does this MIT solve?" />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--neutral-600)" }}>Hypothesis</label>
          <textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} rows={3} className={inputCls} style={inputStyle} placeholder="What do you believe will happen if this succeeds?" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm transition-colors" style={{ color: "var(--neutral-600)" }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--brand-primary)" }}
          >
            {saving ? "Creating..." : "Create MIT"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
