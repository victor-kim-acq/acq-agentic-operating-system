"use client";

import { useState, useEffect, useRef } from "react";
import type { Node } from "@xyflow/react";
import { X, Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";

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

const COLOR_PALETTE: string[][] = [
  ["#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff"],
  ["#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff"],
  ["#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc"],
  ["#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8", "#b4a7d6", "#d5a6bd"],
  ["#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0"],
  ["#a61c00", "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3c78d8", "#3d85c6", "#674ea7", "#a64d79"],
  ["#85200c", "#990000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#1155cc", "#0b5394", "#351c75", "#741b47"],
];

function autoSize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

export default function EditNodeModal({ node, onClose, onSave }: EditNodeModalProps) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [stats, setStats] = useState<Stat[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);

  useEffect(() => {
    if (!node) return;
    const meta = (node.data.metadata as { icon?: string; color?: string; stats?: Stat[] }) || {};
    setLabel((node.data.label as string) || "");
    setIcon(meta.icon || "📦");
    setColor(meta.color || "#6b7280");
    setStats(meta.stats ? meta.stats.map((s) => ({ ...s })) : []);
  }, [node]);

  useEffect(() => {
    textareaRefs.current.forEach((el) => autoSize(el));
  }, [stats]);

  if (!node) return null;

  const addStat = () => setStats([...stats, { icon: "📊", label: "New step", value: "" }]);

  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    setDropIndex(i);
  };
  const handleDrop = () => {
    if (dragIndex === null || dropIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const next = [...stats];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    setStats(next);
    setDragIndex(null);
    setDropIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };
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

  const normalizedColor = color.toLowerCase();

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
          width: "min(900px, 90vw)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Edit Node</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            <X size={18} />
          </button>
        </div>

        {/* Label + inline emoji */}
        <div style={{ marginBottom: 16, flexShrink: 0 }}>
          <label style={labelStyle}>Node Label</label>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              style={{
                width: 36,
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: "8px 4px",
                fontSize: 18,
                textAlign: "center",
                outline: "none",
                flexShrink: 0,
              }}
            />
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
        </div>

        {/* Color (collapsible) */}
        <div style={{ marginBottom: 16, flexShrink: 0 }}>
          <label style={labelStyle}>Color</label>
          <button
            onClick={() => setColorOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              padding: "6px 10px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 6, background: color, border: "1px solid #e2e8f0", flexShrink: 0 }} />
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: "#1e293b" }}>{color}</span>
            <span style={{ marginLeft: "auto", color: "#94a3b8", display: "flex" }}>
              {colorOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
          {colorOpen && (
            <div style={{ marginTop: 10 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, 24px)",
              gap: 2,
              marginBottom: 8,
            }}
          >
            {COLOR_PALETTE.flat().map((c) => {
              const selected = normalizedColor === c;
              return (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  title={c}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 1,
                    background: c,
                    border: selected ? "2px solid #1e293b" : "1px solid #e2e8f0",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  {selected && (
                    <span
                      style={{
                        color: ["#ffffff", "#f3f3f3", "#efefef", "#ffff00", "#fff2cc"].includes(c) ? "#1e293b" : "white",
                        fontSize: 12,
                        fontWeight: 700,
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                        lineHeight: 1,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
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
          )}
        </div>

        {/* AI Summary */}
        <div style={{ marginBottom: 16, flexShrink: 0 }}>
          <label style={labelStyle}>AI Summary</label>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 16,
              minHeight: 80,
              fontSize: 13,
              fontStyle: "italic",
              color: "#94a3b8",
              fontFamily: "Inter, sans-serif",
            }}
          >
            AI-generated summary of this process step will appear here...
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexShrink: 0 }}>
            <label style={labelStyle}>Steps</label>
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
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingRight: 4 }}>
            {stats.map((s, i) => {
              const showIndicator = dragIndex !== null && dropIndex === i && dragIndex !== i;
              return (
                <div
                  key={i}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={handleDrop}
                  style={{
                    borderTop: showIndicator ? "2px solid #2563eb" : "2px solid transparent",
                    opacity: dragIndex === i ? 0.4 : 1,
                    display: "flex",
                    gap: 6,
                    marginBottom: 6,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragEnd={handleDragEnd}
                    style={{
                      cursor: "grab",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 2px 0",
                    }}
                    title="Drag to reorder"
                  >
                    <GripVertical size={16} />
                  </span>
                  <input
                    type="text"
                    value={s.icon}
                    onChange={(e) => updateStat(i, "icon", e.target.value)}
                    style={{
                      width: 36,
                      border: "1px solid #e2e8f0",
                      borderRadius: 5,
                      padding: "8px 4px",
                      fontSize: 14,
                      textAlign: "center",
                      outline: "none",
                      flexShrink: 0,
                    }}
                  />
                  <textarea
                    ref={(el) => {
                      textareaRefs.current[i] = el;
                      autoSize(el);
                    }}
                    rows={1}
                    value={s.label}
                    onChange={(e) => {
                      updateStat(i, "label", e.target.value);
                      autoSize(e.target);
                    }}
                    placeholder="Step description"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: "1px solid #e2e8f0",
                      borderRadius: 5,
                      padding: "8px 10px",
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "Inter, sans-serif",
                      resize: "none",
                      overflow: "hidden",
                      lineHeight: 1.4,
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={() => removeStat(i)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 8, flexShrink: 0 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
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
