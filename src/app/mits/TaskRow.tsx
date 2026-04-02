"use client";

import { useState, useRef, useEffect } from "react";
import { CriticalTask, User } from "./page";

const TASK_STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  not_started: { bg: "bg-slate-100", text: "text-slate-600", label: "Not Started" },
  in_progress: { bg: "bg-amber-50", text: "text-amber-700", label: "In Progress" },
  complete: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Complete" },
};

interface TaskRowProps {
  task: CriticalTask;
  users: User[];
  mitId: string;
  onUpdate: (updated: CriticalTask) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskRow({
  task,
  users,
  mitId,
  onUpdate,
  onDelete,
}: TaskRowProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleValue(task.title);
  }, [task.title]);

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  const putTask = async (fields: Partial<CriticalTask>) => {
    try {
      const res = await fetch(`/api/mits/${mitId}/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const handleTitleSave = () => {
    setEditingTitle(false);
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdate({ ...task, title: trimmed });
      putTask({ title: trimmed });
    } else {
      setTitleValue(task.title);
    }
  };

  const toggleComplete = () => {
    const newStatus = task.status === "complete" ? "not_started" : "complete";
    onUpdate({ ...task, status: newStatus });
    putTask({ status: newStatus });
  };

  const handleDelete = async () => {
    onDelete(task.id);
    try {
      await fetch(`/api/mits/${mitId}/tasks/${task.id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const isComplete = task.status === "complete";
  const sc = TASK_STATUS_CONFIG[task.status || "not_started"] || TASK_STATUS_CONFIG.not_started;

  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 group">
      {/* Completion circle */}
      <button
        onClick={toggleComplete}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          isComplete
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "border-slate-300 hover:border-emerald-400"
        }`}
      >
        {isComplete && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {editingTitle ? (
          <input
            ref={titleRef}
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
              if (e.key === "Escape") {
                setTitleValue(task.title);
                setEditingTitle(false);
              }
            }}
            className="w-full text-sm border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <span
            onClick={() => setEditingTitle(true)}
            className={`text-sm cursor-text ${
              isComplete ? "line-through text-slate-400" : "text-slate-800"
            }`}
          >
            {task.title || "Untitled task"}
          </span>
        )}
      </div>

      {/* Owner dropdown */}
      <select
        value={task.owner_id || ""}
        onChange={(e) => {
          const newOwnerId = e.target.value || null;
          onUpdate({ ...task, owner_id: newOwnerId });
          putTask({ owner_id: newOwnerId });
        }}
        className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[120px]"
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>

      {/* Due date */}
      <input
        type="date"
        value={task.due_date ? task.due_date.split("T")[0] : ""}
        onChange={(e) => {
          const newDate = e.target.value || null;
          onUpdate({ ...task, due_date: newDate });
          putTask({ due_date: newDate });
        }}
        className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {/* Status */}
      <select
        value={task.status || "not_started"}
        onChange={(e) => {
          onUpdate({ ...task, status: e.target.value });
          putTask({ status: e.target.value });
        }}
        className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 ${sc.bg} ${sc.text}`}
      >
        <option value="not_started">Not Started</option>
        <option value="in_progress">In Progress</option>
        <option value="complete">Complete</option>
      </select>

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
        title="Delete task"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
