"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";

export default function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const onDelete = useCallback(() => {
    setEdges((eds) => eds.filter((e) => e.id !== id));
    fetch(`/api/processes/edges/${id}`, { method: "DELETE" }).catch((err) =>
      console.error("Failed to delete edge:", err)
    );
  }, [id, setEdges]);

  const saveLabel = useCallback(() => {
    const newLabel = inputValue.trim() || null;
    setEditing(false);
    setEdges((eds) =>
      eds.map((e) =>
        e.id === id ? { ...e, label: newLabel ?? undefined } : e
      )
    );
    fetch(`/api/processes/edges/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel }),
    }).catch((err) => console.error("Failed to update edge label:", err));
  }, [id, inputValue, setEdges]);

  const startEditing = useCallback(() => {
    setInputValue(typeof label === "string" ? label : "");
    setEditing(true);
  }, [label]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
  }, []);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        saveLabel();
      } else if (e.key === "Escape") {
        cancelEditing();
      }
    },
    [saveLabel, cancelEditing]
  );

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        if (!editing) setHovered(false);
      }}
    >
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
      />
      {/* Invisible wider path for easier hover targeting */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
      />
      {/* Existing label display (hidden while editing) */}
      {label && !editing && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -130%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
              fontSize: 11,
              ...Object.fromEntries(
                Object.entries(labelBgStyle || {}).map(([k, v]) => [k, v])
              ),
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            <span style={labelStyle as React.CSSProperties}>{label}</span>
          </div>
        </EdgeLabelRenderer>
      )}
      {/* Inline edit input */}
      {editing && (
        <EdgeLabelRenderer>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveLabel}
            style={{
              position: "absolute",
              transform: `translate(-50%, -130%) translate(${labelX}px, ${labelY}px)`,
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 4,
              border: "1px solid #94a3b8",
              background: "#fff",
              color: "#334155",
              outline: "none",
              width: 120,
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
              zIndex: 10,
            }}
          />
        </EdgeLabelRenderer>
      )}
      {/* Hover controls: pencil + delete */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            display: "flex",
            gap: 4,
            opacity: hovered && !editing ? 1 : 0,
            transition: "opacity 0.15s",
            pointerEvents: hovered && !editing ? "all" : "none",
          }}
        >
          <button
            onClick={startEditing}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#3b82f6",
              color: "white",
              border: "none",
              fontSize: 10,
              lineHeight: "16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            }}
            title="Edit label"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#ef4444",
              color: "white",
              border: "none",
              fontSize: 12,
              lineHeight: "16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            }}
            title="Delete edge"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}
