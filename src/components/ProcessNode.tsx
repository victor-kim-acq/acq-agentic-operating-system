"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface ProcessNodeData {
  label?: string;
  category?: string;
  metadata?: {
    icon?: string;
    color?: string;
    stats?: Array<{ icon: string; label: string; value: string }>;
  };
  [key: string]: unknown;
}

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flow-node-stat">
      <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
      <span className="flow-node-stat-label">{label}</span>
      {value && (
        <span
          style={{
            marginLeft: "auto",
            fontWeight: 500,
            color: "#1e293b",
            fontFamily: "DM Mono, monospace",
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

const MAX_VISIBLE_STATS = 3;

function ProcessNode({ data, selected }: NodeProps) {
  const d = data as ProcessNodeData;
  const meta = d.metadata || {};
  const color = meta.color || "#6b7280";
  const icon = meta.icon || "📦";
  const label = d.label || "Untitled";
  const stats = meta.stats || [];
  const visibleStats = stats.slice(0, MAX_VISIBLE_STATS);
  const overflow = stats.length - visibleStats.length;

  return (
    <div
      className={`flow-node ${selected ? "selected" : ""}`}
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: color, borderColor: "white" }}
      />

      <div className="flow-node-header">
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span>{label}</span>
      </div>

      {stats.length > 0 && (
        <div className="flow-node-body">
          {visibleStats.map((s, i) => (
            <StatRow key={i} icon={s.icon} label={s.label} value={s.value} />
          ))}
          {overflow > 0 && (
            <div className="flow-node-stat-more">+{overflow} more</div>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: color, borderColor: "white" }}
      />
    </div>
  );
}

export default memo(ProcessNode);
