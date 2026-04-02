"use client";

import { useState, useMemo, useCallback } from "react";
import type { Node } from "@xyflow/react";

interface FunnelManagerProps {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  open: boolean;
  onClose: () => void;
}

interface FunnelGroup {
  color: string;
  funnel: string;
  count: number;
  nodeIds: string[];
}

function getMetadata(node: Node): Record<string, unknown> {
  return (node.data?.metadata as Record<string, unknown>) || {};
}

export default function FunnelManager({ nodes, setNodes, open, onClose }: FunnelManagerProps) {
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const [colorInput, setColorInput] = useState("");

  const groups = useMemo<FunnelGroup[]>(() => {
    const map = new Map<string, { funnel: string; nodeIds: string[] }>();
    for (const node of nodes) {
      const meta = getMetadata(node);
      const color = (meta.color as string) || "#6b7280";
      const funnel = (meta.funnel as string) || "";
      if (!map.has(color)) {
        map.set(color, { funnel, nodeIds: [] });
      }
      map.get(color)!.nodeIds.push(node.id);
    }
    return Array.from(map.entries()).map(([color, { funnel, nodeIds }]) => ({
      color,
      funnel,
      count: nodeIds.length,
      nodeIds,
    }));
  }, [nodes]);

  const updateFunnelName = useCallback(
    (color: string, newFunnel: string) => {
      const group = groups.find((g) => g.color === color);
      if (!group) return;

      setNodes((nds) =>
        nds.map((n) => {
          const meta = getMetadata(n);
          if ((meta.color as string || "#6b7280") !== color) return n;
          const updated = { ...meta, funnel: newFunnel };
          return { ...n, data: { ...n.data, metadata: updated } };
        })
      );

      for (const nodeId of group.nodeIds) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;
        const meta = getMetadata(node);
        fetch(`/api/processes/nodes/${nodeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: { ...meta, funnel: newFunnel } }),
        }).catch((err) => console.error("Failed to update funnel name:", err));
      }
    },
    [groups, nodes, setNodes]
  );

  const updateFunnelColor = useCallback(
    (oldColor: string, newColor: string) => {
      if (oldColor === newColor) return;
      const group = groups.find((g) => g.color === oldColor);
      if (!group) return;

      setNodes((nds) =>
        nds.map((n) => {
          const meta = getMetadata(n);
          if ((meta.color as string || "#6b7280") !== oldColor) return n;
          const updated = { ...meta, color: newColor };
          return { ...n, data: { ...n.data, metadata: updated } };
        })
      );

      for (const nodeId of group.nodeIds) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;
        const meta = getMetadata(node);
        fetch(`/api/processes/nodes/${nodeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: { ...meta, color: newColor } }),
        }).catch((err) => console.error("Failed to update funnel color:", err));
      }

      setEditingColor(null);
    },
    [groups, nodes, setNodes]
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 320,
        height: "100vh",
        background: "#ffffff",
        borderLeft: "1px solid #e2e8f0",
        boxShadow: "-4px 0 12px rgba(0,0,0,0.08)",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 15, color: "#1e293b" }}>
          Funnel Manager
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: 18,
            cursor: "pointer",
            color: "#64748b",
            padding: "2px 6px",
          }}
        >
          &times;
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "12px 20px" }}>
        {groups.length === 0 && (
          <p style={{ color: "#94a3b8", fontSize: 13 }}>No nodes on canvas.</p>
        )}
        {groups.map((group) => (
          <div
            key={group.color}
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {editingColor === group.color ? (
                <input
                  type="text"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const hex = colorInput.trim();
                      if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
                        updateFunnelColor(group.color, hex);
                      }
                    } else if (e.key === "Escape") {
                      setEditingColor(null);
                    }
                  }}
                  onBlur={() => {
                    const hex = colorInput.trim();
                    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
                      updateFunnelColor(group.color, hex);
                    } else {
                      setEditingColor(null);
                    }
                  }}
                  autoFocus
                  style={{
                    width: 80,
                    fontSize: 12,
                    padding: "2px 6px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    fontFamily: "monospace",
                  }}
                />
              ) : (
                <button
                  onClick={() => {
                    setEditingColor(group.color);
                    setColorInput(group.color);
                  }}
                  title="Click to change color"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: group.color,
                    border: "2px solid #e2e8f0",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
              )}
              <input
                type="color"
                value={group.color}
                onChange={(e) => updateFunnelColor(group.color, e.target.value)}
                style={{
                  width: 24,
                  height: 24,
                  padding: 0,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                title="Pick color"
              />
              <span
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  marginLeft: "auto",
                  flexShrink: 0,
                }}
              >
                {group.count} node{group.count !== 1 ? "s" : ""}
              </span>
            </div>
            <FunnelNameInput
              color={group.color}
              initialValue={group.funnel}
              onSave={updateFunnelName}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelNameInput({
  color,
  initialValue,
  onSave,
}: {
  color: string;
  initialValue: string;
  onSave: (color: string, name: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  const save = () => {
    if (value !== initialValue) {
      onSave(color, value);
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
      }}
      placeholder="Funnel name..."
      style={{
        width: "100%",
        fontSize: 13,
        padding: "6px 8px",
        border: "1px solid #cbd5e1",
        borderRadius: 6,
        background: "#ffffff",
        color: "#334155",
        outline: "none",
      }}
    />
  );
}
