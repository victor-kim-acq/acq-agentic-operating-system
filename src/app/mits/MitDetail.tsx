"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MitWithTasks, CriticalTask, User } from "./page";
import TaskRow from "./TaskRow";

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; bar: string; dot: string; selectBg: string }
> = {
  on_track: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    selectBg: "bg-emerald-50 text-emerald-700",
  },
  at_risk: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
    selectBg: "bg-amber-50 text-amber-700",
  },
  off_track: {
    bg: "bg-red-50",
    text: "text-red-700",
    bar: "bg-red-500",
    dot: "bg-red-500",
    selectBg: "bg-red-50 text-red-700",
  },
};

interface MitDetailProps {
  mitId: string;
  users: User[];
  onBack: () => void;
}

export default function MitDetail({ mitId, users, onBack }: MitDetailProps) {
  const [mit, setMit] = useState<MitWithTasks | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields
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

  useEffect(() => {
    fetchMit();
  }, [fetchMit]);

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
      return {
        ...prev,
        critical_tasks: prev.critical_tasks.map((t) =>
          t.id === updated.id ? updated : t
        ),
      };
    });
  };

  const handleTaskDelete = (taskId: string) => {
    setMit((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        critical_tasks: prev.critical_tasks.filter((t) => t.id !== taskId),
      };
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

    // Optimistic add
    setMit((prev) => {
      if (!prev) return prev;
      return { ...prev, critical_tasks: [...prev.critical_tasks, newTask] };
    });

    try {
      await fetch(`/api/mits/${mitId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newTask.id,
          title: newTask.title,
          status: "not_started",
        }),
      });
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Loading...</span>
      </div>
    );
  }

  if (!mit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="text-slate-400 text-sm">MIT not found</span>
      </div>
    );
  }

  const sc = STATUS_CONFIG[mit.status || "on_track"] || STATUS_CONFIG.on_track;
  const completedTasks = mit.critical_tasks.filter(
    (t) => t.status === "complete"
  ).length;
  const totalTasks = mit.critical_tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isDailyOps = mit.title === "Daily Operations";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav bar */}
      <nav className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            Canvas
          </Link>
          <button
            onClick={onBack}
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            MITs
          </button>
          <span className="text-sm font-semibold text-slate-800 truncate max-w-xs">
            {mit.title}
          </span>
        </div>
        <span className="text-xs text-slate-400">ACQ Agentic OS</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back link */}
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-800 mb-6 inline-flex items-center gap-1 transition-colors"
        >
          ← Back to MITs
        </button>

        {/* MIT Header Card */}
        <div
          className={`bg-white rounded-xl border ${
            isDailyOps ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200"
          } p-6 mb-6`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${sc.dot}`}
              >
                {mit.sort_order ?? 0}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {isDailyOps && <span className="text-blue-500">📌</span>}
                  <h1 className="text-xl font-bold text-slate-900">
                    {mit.title}
                  </h1>
                </div>
                {mit.quarter && mit.year && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Q{mit.quarter} {mit.year}
                  </p>
                )}
              </div>
            </div>

            {/* Status dropdown */}
            <select
              value={mit.status || "on_track"}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`text-xs font-semibold rounded-full px-3 py-1.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${sc.selectBg}`}
            >
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="off_track">Off Track</option>
            </select>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">
                {completedTasks}/{totalTasks} tasks
              </span>
              <span className="text-xs text-slate-400">{progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${sc.bar}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Problem Statement */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-3">
            Problem Statement
          </h2>
          {editingProblem ? (
            <textarea
              value={problemValue}
              onChange={(e) => setProblemValue(e.target.value)}
              onBlur={saveProblem}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setProblemValue(mit.problem_statement || "");
                  setEditingProblem(false);
                }
              }}
              autoFocus
              rows={4}
              className="w-full text-sm text-slate-700 border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          ) : (
            <p
              onClick={() => setEditingProblem(true)}
              className="text-sm text-slate-700 leading-relaxed cursor-text min-h-[2rem] hover:bg-slate-50 rounded px-1 -mx-1 py-1 transition-colors"
            >
              {mit.problem_statement || (
                <span className="text-slate-400 italic">
                  Click to add a problem statement...
                </span>
              )}
            </p>
          )}
        </div>

        {/* Hypothesis */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-3">
            Hypothesis
          </h2>
          {editingHypothesis ? (
            <textarea
              value={hypothesisValue}
              onChange={(e) => setHypothesisValue(e.target.value)}
              onBlur={saveHypothesis}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setHypothesisValue(mit.hypothesis || "");
                  setEditingHypothesis(false);
                }
              }}
              autoFocus
              rows={4}
              className="w-full text-sm text-slate-700 border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          ) : (
            <p
              onClick={() => setEditingHypothesis(true)}
              className="text-sm text-slate-700 leading-relaxed cursor-text min-h-[2rem] hover:bg-slate-50 rounded px-1 -mx-1 py-1 transition-colors"
            >
              {mit.hypothesis || (
                <span className="text-slate-400 italic">
                  Click to add a hypothesis...
                </span>
              )}
            </p>
          )}
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Tasks</h2>
            <button
              onClick={addTask}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Task
            </button>
          </div>

          {mit.critical_tasks.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">
              No tasks yet. Add one to get started.
            </div>
          ) : (
            <div>
              {mit.critical_tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  users={users}
                  mitId={mitId}
                  onUpdate={handleTaskUpdate}
                  onDelete={handleTaskDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
