"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MitWithTasks, CriticalTask, User } from "./page";
import TaskRow from "./TaskRow";

const STATUS_CONFIG: Record<string, { bg: string; text: string; bar: string; dot: string }> = {
  on_track: { bg: "var(--color-success-light)", text: "var(--color-success)", bar: "var(--color-success)", dot: "var(--color-success)" },
  at_risk: { bg: "var(--color-warning-light)", text: "var(--color-warning)", bar: "var(--color-warning)", dot: "var(--color-warning)" },
  off_track: { bg: "var(--color-danger-light)", text: "var(--color-danger)", bar: "var(--color-danger)", dot: "var(--color-danger)" },
};

interface MitDetailProps {
  mitId: string;
  users: User[];
  onBack: () => void;
}

export default function MitDetail({ mitId, users, onBack }: MitDetailProps) {
  const [mit, setMit] = useState<MitWithTasks | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingProblem, setEditingProblem] = useState(false);
  const [problemValue, setProblemValue] = useState("");
  const [editingHypothesis, setEditingHypothesis] = useState(false);
  const [hypothesisValue, setHypothesisValue] = useState("");

  const fetchMit = useCallback(async () => {
    try {
      const res = await fetch(`/api/mits/${mitId}?t=${Date.now()}`);
      const data: MitWithTasks = await res.json();
      setMit(data);
      setProblemValue(data.problem_statement || "");
      setHypothesisValue(data.hypothesis || "");
    } catch (err) {
      console.error("Failed to fetch MIT:", err);
    } finally {
      setLoading(false);
    }
  }, [mitId]);

  useEffect(() => { fetchMit(); }, [fetchMit]);

  const putMit = async (fields: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/mits/${mitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        const updated = await res.json();
        setMit((prev) => (prev ? { ...prev, ...updated } : prev));
      }
    } catch (err) {
      console.error("Failed to update MIT:", err);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setMit((prev) => (prev ? { ...prev, status: newStatus } : prev));
    putMit({ status: newStatus });
  };

  const saveProblem = () => {
    setEditingProblem(false);
    const trimmed = problemValue.trim();
    if (trimmed !== (mit?.problem_statement || "")) {
      setMit((prev) => (prev ? { ...prev, problem_statement: trimmed || null } : prev));
      putMit({ problem_statement: trimmed || null });
    }
  };

  const saveHypothesis = () => {
    setEditingHypothesis(false);
    const trimmed = hypothesisValue.trim();
    if (trimmed !== (mit?.hypothesis || "")) {
      setMit((prev) => (prev ? { ...prev, hypothesis: trimmed || null } : prev));
      putMit({ hypothesis: trimmed || null });
    }
  };

  const handleTaskUpdate = (updated: CriticalTask) => {
    setMit((prev) => {
      if (!prev) return prev;
      return { ...prev, critical_tasks: prev.critical_tasks.map((t) => t.id === updated.id ? updated : t) };
    });
  };

  const handleTaskDelete = (taskId: string) => {
    setMit((prev) => {
      if (!prev) return prev;
      return { ...prev, critical_tasks: prev.critical_tasks.filter((t) => t.id !== taskId) };
    });
  };

  const addTask = async () => {
    const newTask: CriticalTask = {
      id: crypto.randomUUID(),
      title: "",
      mit_id: mitId,
      owner_id: null,
      due_date: null,
      status: "not_started",
      sort_order: null,
      created_at: new Date().toISOString(),
    };

    setMit((prev) => {
      if (!prev) return prev;
      return { ...prev, critical_tasks: [...prev.critical_tasks, newTask] };
    });

    try {
      await fetch(`/api/mits/${mitId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newTask.id, title: newTask.title, status: "not_started" }),
      });
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
        <span className="text-sm" style={{ color: "var(--neutral-400)" }}>Loading...</span>
      </div>
    );
  }

  if (!mit) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
        <span className="text-sm" style={{ color: "var(--neutral-400)" }}>MIT not found</span>
      </div>
    );
  }

  const sc = STATUS_CONFIG[mit.status || "on_track"] || STATUS_CONFIG.on_track;
  const completedTasks = mit.critical_tasks.filter((t) => t.status === "complete").length;
  const totalTasks = mit.critical_tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isDailyOps = mit.title === "Daily Operations";

  const textAreaCls = "w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 resize-none";
  const textAreaStyle: React.CSSProperties = {
    borderColor: "var(--brand-primary)",
    color: "var(--neutral-700)",
    '--tw-ring-color': "var(--brand-primary)",
  } as React.CSSProperties;

  return (
    <div className="min-h-screen" style={{ background: "var(--page-bg)" }}>
      <nav
        className="border-b px-6 py-3 flex items-center justify-between"
        style={{ background: "var(--card-bg)", borderColor: "var(--neutral-200)" }}
      >
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm transition-colors" style={{ color: "var(--neutral-500)" }}>Canvas</Link>
          <button onClick={onBack} className="text-sm transition-colors" style={{ color: "var(--neutral-500)" }}>MITs</button>
          <span className="text-sm font-semibold truncate max-w-xs" style={{ color: "var(--neutral-800)" }}>{mit.title}</span>
        </div>
        <span className="text-xs" style={{ color: "var(--neutral-400)" }}>ACQ Agentic OS</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <button onClick={onBack} className="text-sm mb-6 inline-flex items-center gap-1 transition-colors" style={{ color: "var(--neutral-500)" }}>
          \u2190 Back to MITs
        </button>

        {/* MIT Header Card */}
        <div
          className="rounded-xl border p-6 mb-6"
          style={{
            background: "var(--card-bg)",
            borderColor: isDailyOps ? "var(--brand-primary)" : "var(--card-border)",
            boxShadow: isDailyOps ? "0 0 0 1px var(--brand-light)" : "var(--shadow-sm)",
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: sc.dot }}>
                {mit.sort_order ?? 0}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {isDailyOps && <span style={{ color: "var(--brand-primary)" }}>\ud83d\udccc</span>}
                  <h1 className="text-xl font-bold" style={{ color: "var(--neutral-900)" }}>{mit.title}</h1>
                </div>
                {mit.quarter && mit.year && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--neutral-400)" }}>Q{mit.quarter} {mit.year}</p>
                )}
              </div>
            </div>
            <select
              value={mit.status || "on_track"}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-semibold rounded-full px-3 py-1.5 border-0 cursor-pointer focus:outline-none focus:ring-2"
              style={{ background: sc.bg, color: sc.text, '--tw-ring-color': "var(--brand-primary)" } as React.CSSProperties}
            >
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="off_track">Off Track</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs" style={{ color: "var(--neutral-500)" }}>{completedTasks}/{totalTasks} tasks</span>
              <span className="text-xs" style={{ color: "var(--neutral-400)" }}>{progress}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--neutral-100)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: sc.bar }} />
            </div>
          </div>
        </div>

        {/* Problem Statement */}
        <div className="rounded-xl border p-6 mb-4" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--shadow-sm)" }}>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--brand-primary)" }}>Problem Statement</h2>
          {editingProblem ? (
            <textarea value={problemValue} onChange={(e) => setProblemValue(e.target.value)} onBlur={saveProblem} onKeyDown={(e) => { if (e.key === "Escape") { setProblemValue(mit.problem_statement || ""); setEditingProblem(false); } }} autoFocus rows={4} className={textAreaCls} style={textAreaStyle} />
          ) : (
            <p
              onClick={() => setEditingProblem(true)}
              className="text-sm leading-relaxed cursor-text min-h-[2rem] rounded px-1 -mx-1 py-1 transition-colors"
              style={{ color: "var(--neutral-700)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--neutral-50)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {mit.problem_statement || (<span style={{ color: "var(--neutral-400)", fontStyle: "italic" }}>Click to add a problem statement...</span>)}
            </p>
          )}
        </div>

        {/* Hypothesis */}
        <div className="rounded-xl border p-6 mb-6" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--shadow-sm)" }}>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--brand-primary)" }}>Hypothesis</h2>
          {editingHypothesis ? (
            <textarea value={hypothesisValue} onChange={(e) => setHypothesisValue(e.target.value)} onBlur={saveHypothesis} onKeyDown={(e) => { if (e.key === "Escape") { setHypothesisValue(mit.hypothesis || ""); setEditingHypothesis(false); } }} autoFocus rows={4} className={textAreaCls} style={textAreaStyle} />
          ) : (
            <p
              onClick={() => setEditingHypothesis(true)}
              className="text-sm leading-relaxed cursor-text min-h-[2rem] rounded px-1 -mx-1 py-1 transition-colors"
              style={{ color: "var(--neutral-700)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--neutral-50)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {mit.hypothesis || (<span style={{ color: "var(--neutral-400)", fontStyle: "italic" }}>Click to add a hypothesis...</span>)}
            </p>
          )}
        </div>

        {/* Tasks */}
        <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--neutral-100)" }}>
            <h2 className="text-sm font-bold" style={{ color: "var(--neutral-900)" }}>Tasks</h2>
            <button onClick={addTask} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors" style={{ background: "var(--brand-primary)" }}>
              + Add Task
            </button>
          </div>

          {mit.critical_tasks.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm" style={{ color: "var(--neutral-400)" }}>
              No tasks yet. Add one to get started.
            </div>
          ) : (
            <div>
              {mit.critical_tasks.map((task) => (
                <TaskRow key={task.id} task={task} users={users} mitId={mitId} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
