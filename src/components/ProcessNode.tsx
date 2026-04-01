"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  Acquisition: { bg: "#064e3b", border: "#10b981", text: "#6ee7b7" },
  Onboarding: { bg: "#1e3a5f", border: "#3b82f6", text: "#93c5fd" },
  Retention: { bg: "#3b1f6e", border: "#7c3aed", text: "#c4b5fd" },
  "Features/Logistics": { bg: "#4a1942", border: "#ec4899", text: "#f9a8d4" },
};

function ProcessNode({ data }: NodeProps) {
  const colors = categoryColors[data.category as string] ?? {
    bg: "#1f2937",
    border: "#6b7280",
    text: "#d1d5db",
  };

  return (
    <div
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        color: colors.text,
        borderRadius: 12,
        padding: "12px 20px",
        fontSize: 13,
        fontWeight: 600,
        minWidth: 140,
        textAlign: "center",
        boxShadow: `0 0 12px ${colors.border}40`,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: colors.border }} />
      <div>{data.label as string}</div>
      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
        {data.category as string}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: colors.border }} />
    </div>
  );
}

export default memo(ProcessNode);
