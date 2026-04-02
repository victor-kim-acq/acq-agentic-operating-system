# ACQ Agentic Operating System

## Purpose
An agentic operating system for ACQ Vantage that visualizes business processes
as an interactive React Flow canvas, with funnel-based filtering and (next)
MIT/CT overlay for strategic goal tracking.

Long-term vision: AI-driven task management from meeting transcripts.

Current state: Fully interactive canvas with real ACQ Vantage process data,
funnel manager with color-based grouping, funnel filtering with blur/animation,
copy/paste, multi-select, edge label editing, and auto-layout.

## Tech Stack
- Next.js 14+ (App Router) on Vercel
- Vercel Postgres (Neon) via `@vercel/postgres`
- Tailwind CSS
- React Flow (`@xyflow/react`) for canvas rendering
- dagre (`@dagrejs/dagre`) for auto-layout
- Lucide React for icons

## Local Development
1. Clone the repo
2. Copy .env.local.example to .env.local, fill in real values
3. `npm install`
4. `npm run dev` → http://localhost:3000
5. POSTGRES_URL must point to Neon (not localhost)

## Database Schema

### `business_processes` — canvas nodes
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID, generated client-side via `crypto.randomUUID()` |
| name | TEXT NOT NULL | Display label on the node card |
| category | TEXT NOT NULL | e.g. "Acquisition", "Onboarding", "Retention" |
| description | TEXT | Nullable, not currently rendered |
| position_x | DOUBLE PRECISION | Canvas X coordinate |
| position_y | DOUBLE PRECISION | Canvas Y coordinate |
| metadata | JSONB DEFAULT '{}' | See Metadata Schema below |
| created_at | TIMESTAMPTZ | Auto-set |

### `process_connections` — canvas edges
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| source_id | TEXT FK → business_processes | |
| target_id | TEXT FK → business_processes | |
| label | TEXT | Nullable, rendered on the edge if present |
| created_at | TIMESTAMPTZ | Auto-set |

### Node Metadata JSONB Schema
The `metadata` column is read by `ProcessNode.tsx` and written by
`EditNodeModal.tsx` and `FunnelManager.tsx`.
```json
{
  "icon": "📦",
  "color": "#16a34a",
  "funnel": "New Member Acquisition",
  "stats": [
    { "icon": "📊", "label": "Metric name", "value": "123" }
  ]
}
```
- **icon** (string): Emoji displayed in the node header. Default: "📦"
- **color** (string): Hex color for the top border and handle dots. Default: "#6b7280". **Color is the permanent funnel identifier** — changing a funnel's color in FunnelManager batch-updates all member nodes.
- **funnel** (string): Funnel name label for the color group. Set via FunnelManager.
- **stats** (array): Stat rows rendered below the label. Each has `icon` (emoji), `label` (string), `value` (string). Empty array = no stats section.

### Tables to create (MIT/CT system — Phase 1)
These tables do NOT exist yet. They are the next feature to build.

**`users`**
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | Display name |
| role | TEXT | e.g. "President", "AI Lead" |
| reports_to | TEXT FK → users | Nullable |
| created_at | TIMESTAMPTZ | Auto-set |

**`mits`** (Most Important Things)
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| title | TEXT NOT NULL | e.g. "Product-Led Growth & AHA Activation" |
| owner_id | TEXT FK → users | Who owns this MIT |
| quarter | INTEGER | 1-4 |
| year | INTEGER | e.g. 2026 |
| status | TEXT | "on_track", "at_risk", "off_track" |
| problem_statement | TEXT | Nullable |
| hypothesis | TEXT | Nullable |
| sort_order | INTEGER | Display order within the quarter |
| created_at | TIMESTAMPTZ | Auto-set |

**`critical_tasks`** (CTs)
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| title | TEXT NOT NULL | Task description |
| mit_id | TEXT FK → mits | Every CT belongs to exactly one MIT |
| owner_id | TEXT FK → users | Who owns this CT |
| due_date | DATE | Nullable |
| status | TEXT | "not_started", "in_progress", "complete" |
| sort_order | INTEGER | Display order within the MIT |
| created_at | TIMESTAMPTZ | Auto-set |

**`mit_node_assignments`** — join table (Option B: arbitrary node sets)
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| mit_id | TEXT FK → mits | |
| node_id | TEXT FK → business_processes | |
| created_at | TIMESTAMPTZ | Auto-set |
| UNIQUE(mit_id, node_id) | | Prevent duplicates |

**Design decision:** MITs map to arbitrary sets of nodes (not 1:1 with funnels).
A head of growth's MIT can span acquisition nodes across multiple funnels.
Node assignment works from both directions: from the canvas (click node → assign
to MIT) and from the MIT detail page (select nodes from a list).

## API Routes

All routes use `sql` tagged templates from `@vercel/postgres` via `src/lib/db.ts`.

### Processes (existing)

**GET `/api/processes`** — Returns all nodes and edges.
Has `fetchCache = 'force-no-store'` and `dynamic = 'force-dynamic'` exports.
Client appends `?t=Date.now()` for cache busting.

**POST `/api/processes/nodes`** — Create a node. Accepts `id`, `name`,
`category`, `description`, `position_x`, `position_y`, `metadata`.
Metadata is cast to JSONB.

**PUT `/api/processes/nodes/:id`** — Partial update. Accepts any combination
of `position_x`+`position_y`, `name`, `metadata`.

**DELETE `/api/processes/nodes/:id`** — Deletes node and all connected edges.

**POST `/api/processes/edges`** — Create an edge. Body: `id`, `source_id`,
`target_id`, `label` (nullable).

**PUT `/api/processes/edges/:id`** — Update edge label. Body: `{ "label": "text" }`.

**DELETE `/api/processes/edges/:id`** — Delete a single edge.

### MIT/CT routes (to be created in Phase 1)
Standard CRUD for `users`, `mits`, `critical_tasks`, and `mit_node_assignments`.
All GET routes must have `fetchCache = 'force-no-store'` and
`dynamic = 'force-dynamic'`.

## Canvas Behavior (Current)

### Node rendering
White cards with colored top border (from `metadata.color`), emoji icon, label,
optional stat rows. Component: `ProcessNode.tsx`.

### Interactions
- **Drag persistence:** `onNodeDragStop` → PUT position to API.
- **Edit modal:** Double-click node → modal with label, icon, color, stats. Component: `EditNodeModal.tsx`.
- **Copy/paste:** Ctrl/Cmd+C copies selected node(s), Ctrl/Cmd+V pastes with new UUIDs offset +50,+50. Supports multi-node copy/paste. Suppressed when edit modal is open.
- **Multi-select:** Left-click drag creates selection box (`selectionOnDrag`). `SelectionMode.Partial` — nodes partially in box get selected. Pan via middle/right-click.
- **Edge wiring:** Drag from source handle to target handle → POST edge. Dashed gray style.
- **Edge label editing:** Hover edge → pencil icon appears next to delete X. Click pencil → inline text input. Enter/blur saves via PUT. Escape cancels.
- **Edge deletion:** Hover edge → X button. Or select + Backspace/Delete.
- **Node deletion:** Select + Backspace/Delete → DELETE node (cascades edges). Works with multi-select for bulk delete.
- **Add node:** "Add Node" button in toolbar.
- **Auto-layout:** "Tidy Up" button in toolbar. Uses dagre with `rankdir: 'LR'`, `nodesep: 200`, `ranksep: 350`, node size 220x100. Batch PUTs all positions, then `fitView()`.

### Funnel Manager
Component: `FunnelManager.tsx`. Collapsible panel toggled from toolbar.
- Discovers unique `metadata.color` values across all nodes (only shows colors in use).
- Name each color group → batch-writes `metadata.funnel` to all matching nodes.
- Change a funnel's color → batch-updates `metadata.color` on all member nodes (color is the permanent funnel identifier).
- Shows node count per funnel.

### Funnel Filtering
State: `activeFunnel` (`string | null`) — the active `metadata.color`.
- Click a funnel in the panel to activate filter. Click again or "Clear" to deactivate.
- **Active funnel nodes:** Render normally.
- **Intersection nodes:** Render normally if they have at least one **incoming** edge from a funnel node AND at least one **outgoing** edge to a funnel node (pass-through test — funnel flows through them).
- **All other nodes:** `opacity: 0.15`, `filter: blur(1px)`, non-interactive.
- **Edges between active/intersection nodes:** `animated: true`, bolder stroke, funnel color.
- **All other edges:** `opacity: 0.08`.
- Derived via `useMemo` → `displayNodes` and `displayEdges`. Source-of-truth `nodes` array unchanged.

## Position Coordinate System
React Flow positions are in abstract units (not pixels). Approximate spacing
for the current node card size (~220px wide rendered):
- **Horizontal spacing:** 300–400 units
- **Vertical spacing:** 200–250 units
- **Fan-out:** Sources at same Y, spread on X by 350 each, target centered below.

## Auto-Layout (dagre)
`src/lib/autoLayout.ts` — accepts React Flow nodes + edges, returns repositioned
nodes. Config: `rankdir: 'LR'`, `nodesep: 200`, `ranksep: 350`, node size 220x100.
Dagre positions from center — the function adjusts to React Flow's top-left origin.

## Scripts
- `scripts/migrate.mjs` — Creates tables + metadata column. Run: `node scripts/migrate.mjs`
- `scripts/seed.mjs` — Legacy seed data (replaced by real process data).
- `scripts/backfill-metadata.mjs` — One-time metadata backfill.

## Key Quirk: Next.js 14 Fetch Caching
Next.js 14 patches global `fetch` and caches by default. `@vercel/postgres`
talks to Neon via HTTP fetch, so SELECTs get cached. **Fix on every API route
that reads from DB:**
```ts
export const fetchCache = 'force-no-store';
export const dynamic = 'force-dynamic';
```
Also: `Cache-Control: no-store` header on responses, `?t=Date.now()` on client fetches.

## Canvas Population Approach
Business process maps are translated from n8n workflow JSONs:
1. Send n8n workflow JSON to Claude.ai for architecture/reasoning
2. Translate to business-language nodes (Option B: one node per business function)
3. Victor reviews abstraction level and labels
4. Claude Code populates via POST/PUT endpoints

Each workflow maps to a **funnel** via `metadata.color` + `metadata.funnel`.

## MIT/CT Architecture (Phase 1–3)

### Phase 1: Data model + API routes
Create tables (`users`, `mits`, `critical_tasks`, `mit_node_assignments`),
migration script, and full CRUD API routes. No UI.

### Phase 2: MIT management page
Route: `/mits`. Card view (list of MITs with status badges, progress bars) and
detail view (problem statement, hypothesis, CT list with owner/due date/status).
CRUD for MITs and CTs. Assign owners. Independent from canvas.

### Phase 3: Node assignment + canvas overlay
- **From canvas:** Click/select node(s) → assign to an MIT (dropdown or modal).
- **From MIT detail page:** Select nodes from a list or minimap thumbnail.
- **Canvas filter:** Person/MIT selector (similar to funnel filter). Selecting an
  MIT highlights its assigned nodes, blurs the rest, animates connected edges.
  Same `useMemo` pattern as funnel filtering.

### Business rules
- Every CT belongs to exactly one MIT.
- MITs have owner, quarter, year, status, problem statement, hypothesis.
- CTs have owner (can differ from MIT owner), due date, status.
- Node assignment is many-to-many (a node can belong to multiple MITs).
- A "Daily Operations" MIT always exists per user — never deleted.

## Roadmap
1. ~~Editable canvas~~ ✅
2. ~~Populate real process map~~ ✅
3. ~~Funnel manager + filtering~~ ✅
4. ~~Copy/paste, multi-select, edge labels, auto-layout~~ ✅
5. **MIT/CT data model + API** ← Next
6. MIT management page
7. Node assignment + canvas MIT overlay
8. UI polish pass (toolbar redesign, background, filter UX)
9. Executive summary / grouped view

## What's Out of Scope (For Now)
- Authentication
- AI transcript parsing
- Live data connections to n8n/HubSpot