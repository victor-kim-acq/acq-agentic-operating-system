"use client";

import { useState, useCallback } from "react";
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

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
      {label && (
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
      <EdgeLabelRenderer>
        <button
          onClick={onDelete}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
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
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s",
            pointerEvents: hovered ? "all" : "none",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          }}
        >
          ×
        </button>
      </EdgeLabelRenderer>
    </g>
  );
}
