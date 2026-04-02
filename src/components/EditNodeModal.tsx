"use client";

import { useState, useEffect } from "react";
import type { Node } from "@xyflow/react";
import { X, Plus, Trash2 } from "lucide-react";

interface Stat {
  icon: string;
  label: string;
  value: string;
}

interface EditNodeModalProps {
  node: Node | null;
  onClose: () => void;
  onSave: (id: string, updates: { name: string; metadata: { icon: string; color: string; stats: Stat[] } }) => void;
}

export default function EditNodeModal({ node, onClose, onSave }: EditNodeModalProps) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    if (!node) return;
    const meta = (node.data.metadata as { icon?: string; color?: string; stats?: Stat[] }) || {};
    setLabel((node.data.label as string) || "");
    setIcon(meta.icon || "📦");
    setColor(meta.color || "#6b7280");
    setStats(meta.stats ? meta.stats.map((s) => ({ ...s })) : []);
  }, [node]);

  if (!node) return null;

  const addStat = () => setStats([...stats, { icon: "📊", label: "New metric", value: "0" }]);
  const removeStat = (i: number) => setStats(stats.filter((_, idx) => idx !== i));
  const updateStat = (i: number, field: keyof Stat, val: string) => {
    setStats(stats.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));
  };

  const handleSave = () => {
    onSave(node.id, { name: label, metadata: { icon, color, stats } });
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 13,
    color: "#1e293b",
    outline: "none",
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 6,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          width: 420,
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Edit Node</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            <X size={18} />
          </button>
        </div>

        {/* Label */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Node Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>

        {/* Icon */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Icon (emoji)</label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            style={{ ...inputStyle, width: 60, textAlign: "center", fontSize: 18 }}
            onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>

        {/* Color */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Color</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {[
              "#16a34a", "#2563eb", "#7c3aed", "#ec4899",
              "#ea580c", "#ca8a04", "#0891b2", "#dc2626",
              "#4f46e5", "#059669", "#d97706", "#6366f1",
              "#84cc16", "#f43f5e", "#06b6d4", "#8b5cf6",
            ].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: c,
                  border: color === c ? "2px solid #1e293b" : "2px solid transparent",
                  boxShadow: color === c ? `0 0 0 2px ${c}40` : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                {color === c && (
                  <span style={{ color: "white", fontSize: 14, fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: color, border: "1px solid #e2e8f0", flexShrink: 0 }} />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ ...inputStyle, fontFamily: "DM Mono, monospace", fontSize: 12 }}
              onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              placeholder="#hex"
            />
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={labelStyle}>Stats</label>
            <button
              onClick={addStat}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "#f1f5f9",
                border: "none",
                borderRadius: 5,
                padding: "4px 8px",
                fontSize: 11,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              <Plus size={11} /> Add
            </button>
          </div>
          {stats.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
              <input
                type="text"
                value={s.icon}
                onChange={(e) => updateStat(i, "icon", e.target.value)}
                style={{
                  width: 36,
                  border: "1px solid #e2e8f0",
                  borderRadius: 5,
                  padding: "6px 4px",
                  fontSize: 14,
                  textAlign: "center",
                  outline: "none",
                }}
              />
              <input
                type="text"
                value={s.label}
                onChange={(e) => updateStat(i, "label", e.target.value)}
                placeholder="Label"
                style={{
                  flex: 1,
                  border: "1px solid #e2e8f0",
                  borderRadius: 5,
                  padding: "6px 8px",
                  fontSize: 12,
                  outline: "none",
                  fontFamily: "Inter, sans-serif",
                }}
              />
              <input
                type="text"
                value={s.value}
                onChange={(e) => updateStat(i, "value", e.target.value)}
                placeholder="Value"
                style={{
                  width: 80,
                  border: "1px solid #e2e8f0",
                  borderRadius: 5,
                  padding: "6px 8px",
                  fontSize: 12,
                  outline: "none",
                  fontFamily: "DM Mono, monospace",
                }}
              />
              <button
                onClick={() => removeStat(i)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4 }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#f1f5f9",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              color: "#475569",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              background: "#2563eb",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
