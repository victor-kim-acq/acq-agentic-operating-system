"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/ui/PageHeader";
import MitCard from "./MitCard";
import MitDetail from "./MitDetail";
import AddMitModal from "./AddMitModal";
import MitCascade from "./MitCascade";

type MitView = "cards" | "cascade";

export interface User {
  id: string;
  name: string;
  role: string | null;
  reports_to: string | null;
}

export interface CriticalTask {
  id: string;
  title: string;
  mit_id: string;
  owner_id: string | null;
  due_date: string | null;
  status: string | null;
  sort_order: number | null;
  created_at: string;
}

export interface Mit {
  id: string;
  title: string;
  owner_id: string | null;
  quarter: number | null;
  year: number | null;
  status: string | null;
  problem_statement: string | null;
  hypothesis: string | null;
  sort_order: number | null;
  created_at: string;
}

export interface MitWithTasks extends Mit {
  critical_tasks: CriticalTask[];
  node_assignments: { id: string; mit_id: string; node_id: string }[];
}

export default function MitsPage() {
  const [mits, setMits] = useState<Mit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [taskCounts, setTaskCounts] = useState<
    Record<string, { completed: number; total: number }>
  >({});
  const [selectedMitId, setSelectedMitId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<MitView>("cards");

  const fetchData = useCallback(async () => {
    try {
      const [mitsRes, usersRes] = await Promise.all([
        fetch(`/api/mits?t=${Date.now()}`),
        fetch(`/api/users?t=${Date.now()}`),
      ]);
      const mitsData: Mit[] = await mitsRes.json();
      const usersData: User[] = await usersRes.json();
      setMits(mitsData);
      setUsers(usersData);

      const counts: Record<string, { completed: number; total: number }> = {};
      await Promise.all(
        mitsData.map(async (mit) => {
          const res = await fetch(`/api/mits/${mit.id}/tasks?t=${Date.now()}`);
          const tasks: CriticalTask[] = await res.json();
          counts[mit.id] = {
            total: tasks.length,
            completed: tasks.filter((t) => t.status === "complete").length,
          };
        })
      );
      setTaskCounts(counts);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dailyOps = mits.filter((m) => m.title === "Daily Operations");
  const quarterlyMits = mits.filter((m) => m.title !== "Daily Operations");

  const getUserName = (ownerId: string | null) => {
    if (!ownerId) return null;
    return users.find((u) => u.id === ownerId)?.name ?? null;
  };

  if (selectedMitId) {
    return (
      <MitDetail
        mitId={selectedMitId}
        users={users}
        onBack={() => {
          setSelectedMitId(null);
          fetchData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--page-bg)" }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-12">
          <PageHeader
            title="Most Important Things"
            subtitle="Strategic priorities and progress"
          />
          <div className="flex items-center gap-3">
            <div
              className="flex gap-1 p-0.5 rounded-lg"
              style={{ background: "var(--neutral-100)" }}
            >
              {(["cards", "cascade"] as const).map((v) => (
                <button
                  key={v}
                  className="px-3 py-1 text-xs font-medium rounded-md"
                  style={{
                    background:
                      view === v ? "var(--neutral-800)" : "transparent",
                    color:
                      view === v ? "#fff" : "var(--neutral-500)",
                    transition:
                      "background-color 150ms ease, color 150ms ease",
                  }}
                  onClick={() => setView(v)}
                >
                  {v === "cards" ? "Cards" : "Cascade"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-white text-sm font-semibold rounded-xl transition-all"
              style={{ background: "var(--brand-primary)", boxShadow: "var(--shadow-sm)" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-sm)")}
            >
              + Add MIT
            </button>
          </div>
        </div>

        {view === "cascade" ? (
          <div style={{ overflowX: "auto" }}>
            <MitCascade />
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm" style={{ color: "var(--neutral-400)" }}>Loading...</div>
          </div>
        ) : (
          <>
            {dailyOps.length > 0 && (
              <div className="mb-12">
                <h2 className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: 'var(--neutral-400)', letterSpacing: '0.08em' }}>
                  Daily Operations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dailyOps.map((mit) => (
                    <MitCard
                      key={mit.id}
                      mit={mit}
                      ownerName={getUserName(mit.owner_id)}
                      taskCount={taskCounts[mit.id]}
                      onSelect={() => setSelectedMitId(mit.id)}
                      isDailyOps
                    />
                  ))}
                </div>
              </div>
            )}

            {quarterlyMits.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: 'var(--neutral-400)', letterSpacing: '0.08em' }}>
                  Strategic MITs
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quarterlyMits.map((mit) => (
                    <MitCard
                      key={mit.id}
                      mit={mit}
                      ownerName={getUserName(mit.owner_id)}
                      taskCount={taskCounts[mit.id]}
                      onSelect={() => setSelectedMitId(mit.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {mits.length === 0 && (
              <div className="text-center py-20" style={{ color: "var(--neutral-400)" }}>
                No MITs yet. Create one to get started.
              </div>
            )}
          </>
        )}
      </div>

      {showAddModal && (
        <AddMitModal
          users={users}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
