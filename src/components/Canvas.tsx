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
  SelectionMode,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ProcessNode from "./ProcessNode";
import DeletableEdge from "./DeletableEdge";
import EditNodeModal from "./EditNodeModal";
import type { BusinessProcess, ProcessConnection } from "@/types/canvas";
import FunnelManager from "./FunnelManager";
import { getLayoutedNodes } from "@/lib/autoLayout";

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
  const [funnelPanelOpen, setFunnelPanelOpen] = useState(false);
  const [activeFunnel, setActiveFunnel] = useState<string | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const clipboardRef = useRef<Array<{ label: string; category: string; metadata: Record<string, unknown>; position: { x: number; y: number } }> | null>(null);

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

  const tidyUp = useCallback(() => {
    const layouted = getLayoutedNodes(nodes, edges);
    setNodes(layouted);
    for (const node of layouted) {
      fetch(`/api/processes/nodes/${node.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_x: node.position.x,
          position_y: node.position.y,
        }),
      }).catch((err) => console.error("Failed to persist layout position:", err));
    }
    window.requestAnimationFrame(() => fitView({ duration: 300 }));
  }, [nodes, edges, setNodes, fitView]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;

      if (e.key === "c") {
        const selected = nodes.filter((n) => n.selected);
        if (selected.length === 0) return;
        clipboardRef.current = selected.map((n) => ({
          label: n.data.label as string,
          category: n.data.category as string,
          metadata: (n.data.metadata as Record<string, unknown>) || {},
          position: { x: n.position.x, y: n.position.y },
        }));
      }

      if (e.key === "v") {
        if (editingNode) return;
        const clip = clipboardRef.current;
        if (!clip || clip.length === 0) return;
        e.preventDefault();

        const newNodes: Node[] = clip.map((item) => {
          const id = crypto.randomUUID();
          return {
            id,
            type: "process" as const,
            position: { x: item.position.x + 50, y: item.position.y + 50 },
            data: { label: item.label, category: item.category, metadata: { ...item.metadata } },
          };
        });

        setNodes((nds) => [...nds, ...newNodes]);

        // Shift clipboard positions for cascading pastes
        clipboardRef.current = clip.map((item) => ({
          ...item,
          position: { x: item.position.x + 50, y: item.position.y + 50 },
        }));

        for (const node of newNodes) {
          fetch("/api/processes/nodes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: node.id,
              name: node.data.label,
              category: node.data.category,
              description: null,
              position_x: node.position.x,
              position_y: node.position.y,
              metadata: node.data.metadata,
            }),
          }).catch((err) => console.error("Failed to create pasted node:", err));
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [nodes, setNodes, editingNode]);

  // Build sets: direct matches + pass-through intersection nodes
  // Pass-through: has incoming edge from a funnel node AND outgoing edge to a funnel node
  const { visibleNodeIds, directNodeIds } = useMemo(() => {
    if (!activeFunnel) return { visibleNodeIds: null, directNodeIds: null };
    const direct = new Set<string>();
    for (const n of nodes) {
      const meta = (n.data?.metadata as Record<string, unknown>) || {};
      if ((meta.color as string || "#6b7280") === activeFunnel) direct.add(n.id);
    }
    // For non-direct nodes, check pass-through: incoming from direct AND outgoing to direct
    const hasIncomingFromDirect = new Set<string>();
    const hasOutgoingToDirect = new Set<string>();
    for (const e of edges) {
      if (direct.has(e.source)) hasIncomingFromDirect.add(e.target);
      if (direct.has(e.target)) hasOutgoingToDirect.add(e.source);
    }
    const visible = new Set(direct);
    hasIncomingFromDirect.forEach((id) => {
      if (!direct.has(id) && hasOutgoingToDirect.has(id)) visible.add(id);
    });
    return { visibleNodeIds: visible, directNodeIds: direct };
  }, [nodes, edges, activeFunnel]);

  const displayNodes = useMemo(() => {
    if (!visibleNodeIds) return nodes;
    return nodes.map((n) =>
      visibleNodeIds.has(n.id)
        ? n
        : { ...n, style: { ...n.style, opacity: 0.15, filter: "blur(1px)" }, selectable: false, draggable: false }
    );
  }, [nodes, visibleNodeIds]);

  const displayEdges = useMemo(() => {
    if (!visibleNodeIds || !directNodeIds) return edges;
    return edges.map((e) => {
      const srcVisible = visibleNodeIds.has(e.source);
      const tgtVisible = visibleNodeIds.has(e.target);
      // Highlight if both endpoints are visible (direct or pass-through)
      if (srcVisible && tgtVisible) {
        return {
          ...e,
          animated: true,
          style: { stroke: activeFunnel!, strokeWidth: 2.5 },
        };
      }
      return { ...e, style: { ...e.style, opacity: 0.08 } };
    });
  }, [edges, visibleNodeIds, directNodeIds, activeFunnel]);

  // Escape clears the funnel filter
  useEffect(() => {
    if (!activeFunnel) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveFunnel(null);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [activeFunnel]);

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
        nodes={displayNodes}
        edges={displayEdges}
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
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
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
      <button
        onClick={tidyUp}
        style={{
          position: "fixed",
          bottom: 24,
          left: 144,
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
        Tidy Up
      </button>
      <button
        onClick={() => setFunnelPanelOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: 24,
          left: 244,
          padding: "8px 16px",
          background: funnelPanelOpen ? "#7c3aed" : "#2563eb",
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
        Funnels
      </button>
      <FunnelManager
        nodes={nodes}
        setNodes={setNodes}
        open={funnelPanelOpen}
        onClose={() => setFunnelPanelOpen(false)}
        activeFunnel={activeFunnel}
        setActiveFunnel={setActiveFunnel}
      />
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
