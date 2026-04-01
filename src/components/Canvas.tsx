"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ProcessNode from "./ProcessNode";
import EditNodeModal from "./EditNodeModal";
import type { BusinessProcess, ProcessConnection } from "@/types/canvas";

const categoryMinimapColors: Record<string, string> = {
  Acquisition: "#10b981",
  Onboarding: "#3b82f6",
  Retention: "#7c3aed",
  "Features/Logistics": "#ec4899",
};

export default function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<Node | null>(null);

  const nodeTypes: NodeTypes = useMemo(() => ({ process: ProcessNode }), []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/processes");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();

        const flowNodes: Node[] = data.processes.map((p: BusinessProcess) => ({
          id: p.id,
          type: "process",
          position: { x: p.position_x, y: p.position_y },
          data: { label: p.name, category: p.category, metadata: p.metadata || {} },
        }));

        const flowEdges: Edge[] = data.connections.map((c: ProcessConnection) => ({
          id: c.id,
          source: c.source_id,
          target: c.target_id,
          label: c.label ?? undefined,
          animated: false,
          style: { stroke: "#94a3b8", strokeWidth: 2 },
          labelStyle: { fill: "#64748b", fontSize: 11 },
          labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.9 },
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (err) {
        console.error(err);
        setError("Failed to load canvas data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [setNodes, setEdges]);

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      fetch(`/api/processes/nodes/${node.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_x: node.position.x,
          position_y: node.position.y,
        }),
      }).catch((err) => console.error("Failed to save node position:", err));
    },
    []
  );

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setEditingNode(node);
    },
    []
  );

  const handleEditSave = useCallback(
    (id: string, updates: { name: string; metadata: { icon: string; color: string; stats: Array<{ icon: string; label: string; value: string }> } }) => {
      fetch(`/api/processes/nodes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }).catch((err) => console.error("Failed to save node edits:", err));

      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, label: updates.name, metadata: updates.metadata } }
            : n
        )
      );
    },
    [setNodes]
  );

  const nodeColor = useCallback(
    (node: Node) => categoryMinimapColors[node.data?.category as string] ?? "#6b7280",
    []
  );

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p className="text-foreground text-lg">Loading canvas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        panOnScroll
        zoomOnScroll={false}
        deleteKeyCode={["Delete", "Backspace"]}
      >
        <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={nodeColor}
          style={{ background: "#f1f5f9" }}
          maskColor="rgba(0,0,0,0.1)"
        />
      </ReactFlow>
      <EditNodeModal
        node={editingNode}
        onClose={() => setEditingNode(null)}
        onSave={handleEditSave}
      />
    </div>
  );
}
