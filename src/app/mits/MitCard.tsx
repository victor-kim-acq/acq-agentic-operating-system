"use client";

import { Mit } from "./page";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  on_track: { bg: "var(--color-success-light)", text: "var(--color-success)", dot: "var(--color-success)", bar: "var(--color-success)" },
  at_risk: { bg: "var(--color-warning-light)", text: "var(--color-warning)", dot: "var(--color-warning)", bar: "var(--color-warning)" },
  off_track: { bg: "var(--color-danger-light)", text: "var(--color-danger)", dot: "var(--color-danger)", bar: "var(--color-danger)" },
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
      className="rounded-xl border p-5 transition-all cursor-pointer group"
      style={{
        background: "var(--card-bg)",
        borderColor: isDailyOps ? "var(--brand-primary)" : "var(--card-border)",
        boxShadow: isDailyOps ? "0 0 0 1px var(--brand-light)" : "var(--shadow-sm)",
      }}
      onClick={onSelect}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = isDailyOps ? "0 0 0 1px var(--brand-light)" : "var(--shadow-sm)")}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: sc.dot }}
          >
            {mit.sort_order ?? 0}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {isDailyOps && (
                <span className="text-sm" style={{ color: "var(--brand-primary)" }} title="Pinned \u2014 cannot be deleted">
                  \ud83d\udccc
                </span>
              )}
              <h3 className="font-semibold text-sm leading-tight" style={{ color: "var(--neutral-900)" }}>
                {mit.title}
              </h3>
            </div>
            {ownerName && (
              <p className="text-xs mt-0.5" style={{ color: "var(--neutral-400)" }}>{ownerName}</p>
            )}
          </div>
        </div>
        <span
          className="px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={{ background: sc.bg, color: sc.text }}
        >
          {STATUS_LABELS[mit.status || "on_track"] || mit.status}
        </span>
      </div>

      {taskCount && taskCount.total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: "var(--neutral-500)" }}>
              {taskCount.completed}/{taskCount.total} tasks
            </span>
            <span className="text-xs" style={{ color: "var(--neutral-400)" }}>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--neutral-100)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: sc.bar }}
            />
          </div>
        </div>
      )}

      {mit.problem_statement && (
        <p className="text-xs leading-relaxed line-clamp-3 mb-3" style={{ color: "var(--neutral-500)" }}>
          {mit.problem_statement.length > 120
            ? mit.problem_statement.slice(0, 120) + "..."
            : mit.problem_statement}
        </p>
      )}

      <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--brand-primary)" }}>
        View Details \u2192
      </span>
    </div>
  );
}
