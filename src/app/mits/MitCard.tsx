"use client";

import { Mit } from "./page";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  on_track: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  at_risk: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", bar: "bg-amber-500" },
  off_track: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", bar: "bg-red-500" },
};

function getStatusConfig(status: string | null) {
  return STATUS_CONFIG[status || "on_track"] || STATUS_CONFIG.on_track;
}

const STATUS_LABELS: Record<string, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  off_track: "Off Track",
};

interface MitCardProps {
  mit: Mit;
  ownerName: string | null;
  taskCount?: { completed: number; total: number };
  onSelect: () => void;
  isDailyOps?: boolean;
}

export default function MitCard({
  mit,
  ownerName,
  taskCount,
  onSelect,
  isDailyOps,
}: MitCardProps) {
  const sc = getStatusConfig(mit.status);
  const progress =
    taskCount && taskCount.total > 0
      ? Math.round((taskCount.completed / taskCount.total) * 100)
      : 0;

  return (
    <div
      className={`bg-white rounded-xl border ${
        isDailyOps ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200"
      } p-5 hover:shadow-md transition-all cursor-pointer group`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Sort order circle */}
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${sc.dot}`}
          >
            {mit.sort_order ?? 0}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {isDailyOps && (
                <span className="text-blue-500 text-sm" title="Pinned — cannot be deleted">
                  📌
                </span>
              )}
              <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                {mit.title}
              </h3>
            </div>
            {ownerName && (
              <p className="text-xs text-slate-400 mt-0.5">{ownerName}</p>
            )}
          </div>
        </div>
        {/* Status badge */}
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}
        >
          {STATUS_LABELS[mit.status || "on_track"] || mit.status}
        </span>
      </div>

      {/* Progress bar */}
      {taskCount && taskCount.total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">
              {taskCount.completed}/{taskCount.total} tasks
            </span>
            <span className="text-xs text-slate-400">{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${sc.bar}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Problem statement preview */}
      {mit.problem_statement && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-3">
          {mit.problem_statement.length > 120
            ? mit.problem_statement.slice(0, 120) + "..."
            : mit.problem_statement}
        </p>
      )}

      <span className="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        View Details →
      </span>
    </div>
  );
}
