"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ProcessNode from "./ProcessNode";
import DeletableEdge from "./DeletableEdge";
import EditNodeModal from "./EditNodeModal";
import type { BusinessProcess, ProcessConnection } from "@/types/canvas";

const categoryMinimapColors: Record<string, string> = {
  Acquisition: "#10b981",
  Onboarding: "#3b82f6",
  Retention: "#7c3aed",
  "Features/Logistics": "#ec4899",
};

const edgeStyle = { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 5" };

function CanvasInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const clipboardRef = useRef<{ label: string; category: string; metadata: Record<string, unknown>; position: { x: number; y: number } } | null>(null);

  const nodeTypes: NodeTypes = useMemo(() => ({ process: ProcessNode }), []);
  const edgeTypes: EdgeTypes = useMemo(() => ({ default: DeletableEdge }), []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/processes?t=${Date.now()}`);
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
          style: edgeStyle,
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

  const onConnect = useCallback(
    (connection: Connection) => {
      const id = crypto.randomUUID();
      const newEdge: Edge = {
        id,
        source: connection.source,
        target: connection.target,
        animated: false,
        style: edgeStyle,
        labelStyle: { fill: "#64748b", fontSize: 11 },
        labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.9 },
      };
      setEdges((eds) => [...eds, newEdge]);
      fetch("/api/processes/edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          source_id: connection.source,
          target_id: connection.target,
          label: null,
        }),
      }).catch((err) => console.error("Failed to create edge:", err));
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    for (const edge of deleted) {
      fetch(`/api/processes/edges/${edge.id}`, { method: "DELETE" }).catch(
        (err) => console.error("Failed to delete edge:", err)
      );
    }
  }, []);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    for (const node of deleted) {
      fetch(`/api/processes/nodes/${node.id}`, { method: "DELETE" }).catch(
        (err) => console.error("Failed to delete node:", err)
      );
    }
  }, []);

  const addNode = useCallback(() => {
    const id = crypto.randomUUID();
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const metadata = { icon: "📡", color: "#16a34a", stats: [] };
    const newNode: Node = {
      id,
      type: "process",
      position,
      data: { label: "New Process", category: "Acquisition", metadata },
    };
    setNodes((nds) => [...nds, newNode]);
    fetch("/api/processes/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: "New Process",
        category: "Acquisition",
        description: null,
        position_x: position.x,
        position_y: position.y,
      }),
    }).catch((err) => console.error("Failed to create node:", err));
  }, [setNodes, screenToFlowPosition]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;

      if (e.key === "c") {
        const selected = nodes.find((n) => n.selected);
        if (!selected) return;
        clipboardRef.current = {
          label: selected.data.label as string,
          category: selected.data.category as string,
          metadata: (selected.data.metadata as Record<string, unknown>) || {},
          position: { x: selected.position.x, y: selected.position.y },
        };
      }

      if (e.key === "v") {
        if (editingNode) return;
        const clip = clipboardRef.current;
        if (!clip) return;
        e.preventDefault();

        const id = crypto.randomUUID();
        const position = { x: clip.position.x + 50, y: clip.position.y + 50 };
        const metadata = { ...clip.metadata };
        const newNode: Node = {
          id,
          type: "process",
          position,
          data: { label: clip.label, category: clip.category, metadata },
        };

        setNodes((nds) => [...nds, newNode]);
        clipboardRef.current = { ...clip, position };

        fetch("/api/processes/nodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            name: clip.label,
            category: clip.category,
            description: null,
            position_x: position.x,
            position_y: position.y,
            metadata,
          }),
        }).catch((err) => console.error("Failed to create pasted node:", err));
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [nodes, setNodes, editingNode]);

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
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodesDelete={onNodesDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
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
      <button
        onClick={addNode}
        style={{
          position: "fixed",
          bottom: 24,
          left: 24,
          padding: "8px 16px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 10,
        }}
      >
        + Add Node
      </button>
      <EditNodeModal
        node={editingNode}
        onClose={() => setEditingNode(null)}
        onSave={handleEditSave}
      />
    </div>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
