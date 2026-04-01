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
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span
        style={{
          marginLeft: "auto",
          fontWeight: 500,
          color: "#1e293b",
          fontFamily: "DM Mono, monospace",
          fontSize: 11,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ProcessNode({ data, selected }: NodeProps) {
  const d = data as ProcessNodeData;
  const meta = d.metadata || {};
  const color = meta.color || "#6b7280";
  const icon = meta.icon || "📦";
  const label = d.label || "Untitled";
  const stats = meta.stats || [];

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
          {stats.map((s, i) => (
            <StatRow key={i} icon={s.icon} label={s.label} value={s.value} />
          ))}
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
