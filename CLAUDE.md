# ACQ Agentic Operating System

## Purpose
An agentic operating system for ACQ Vantage that visualizes business processes
as an interactive React Flow canvas. Long-term vision: overlay MITs/CTs
(quarterly goals and critical tasks), then AI-driven task management from
meeting transcripts.

Current state: Fully interactive canvas with CRUD, drag persistence, rich node
cards, edit modal, edge wiring/deletion, and light theme. Ready for population
with real ACQ Vantage process data.

## Tech Stack
- Next.js 14+ (App Router) on Vercel
- Vercel Postgres (Neon) via `@vercel/postgres`
- Tailwind CSS
- React Flow (`@xyflow/react`) for canvas rendering
- Lucide React for icons (edit modal only)

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
The `metadata` column is read by `ProcessNode.tsx` and written by `EditNodeModal.tsx`.
Structure:
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
- **color** (string): Hex color for the top border and handle dots. Default: "#6b7280"
- **funnel** (string): Funnel tag for filtering (e.g. "New Member Acquisition", "Churn/Billing Cycle"). Not yet rendered in UI but must be set on every node for future filtering.
- **stats** (array): Stat rows rendered below the label. Each has `icon` (emoji), `label` (string), `value` (string). Empty array = no stats section.

## API Routes

All routes use `sql` tagged templates from `@vercel/postgres` via `src/lib/db.ts`.

### GET `/api/processes`
Returns all nodes and edges. Response:
```json
{ "processes": [...], "connections": [...] }
```
Has `fetchCache = 'force-no-store'` and `dynamic = 'force-dynamic'` exports.
Client appends `?t=Date.now()` for cache busting.

### POST `/api/processes/nodes`
Create a node. Body:
```json
{
  "id": "uuid",
  "name": "Node Label",
  "category": "Acquisition",
  "description": null,
  "position_x": 400,
  "position_y": 200
}
```
**Note:** This endpoint does NOT accept metadata in the body. To set metadata
on a new node, POST to create it, then PUT to `/api/processes/nodes/:id` with
the metadata payload.

### PUT `/api/processes/nodes/:id`
Update a node. Supports partial updates — send only the fields you're changing.
Accepted fields: `position_x`+`position_y`, `name`, `metadata`, or combinations.
Metadata body example:
```json
{
  "name": "ACE Acquisition Channel",
  "metadata": {
    "icon": "💳",
    "color": "#2563eb",
    "funnel": "New Member Acquisition",
    "stats": [
      { "icon": "💰", "label": "Source", "value": "Stripe via ACE" }
    ]
  }
}
```

### DELETE `/api/processes/nodes/:id`
Deletes the node and all connected edges (both source and target).

### POST `/api/processes/edges`
Create an edge. Body:
```json
{
  "id": "uuid",
  "source_id": "node-uuid",
  "target_id": "node-uuid",
  "label": "Recharge only"
}
```
Label is nullable — pass `null` for unlabeled edges.

### DELETE `/api/processes/edges/:id`
Deletes a single edge.

## Canvas Behavior (Current)
- **Node rendering:** White cards with colored top border (from `metadata.color`), emoji icon, label, optional stat rows. Component: `ProcessNode.tsx`.
- **Drag persistence:** `onNodeDragStop` → PUT position to API.
- **Edit modal:** Double-click node → modal with label, icon (emoji), color (preset swatches + hex input), and stats (add/remove/edit). Component: `EditNodeModal.tsx`.
- **Edge wiring:** Drag from source handle to target handle → POST edge. Dashed gray style, optional label.
- **Edge deletion:** Hover edge → delete button. Or select + Backspace/Delete.
- **Node deletion:** Select + Backspace/Delete → DELETE node (cascades edges).
- **Add node:** Button at bottom-left → creates node at viewport center.
- **Minimap:** Color-coded by `category` field (not metadata color).
- **Theme:** Light background with dot grid.

## Position Coordinate System
React Flow positions are in abstract units (not pixels). Approximate spacing that
works well with the current node card size (~220px wide rendered):
- **Horizontal spacing between nodes:** 300–400 units
- **Vertical spacing between rows:** 200–250 units
- **Fan-out pattern (e.g. 3 sources → 1 target):** Place sources at same Y, spread on X by 350 units each, center the target below at the middle X.

## Scripts
- `scripts/migrate.mjs` — Creates tables + adds metadata column. Run via `node scripts/migrate.mjs` (requires POSTGRES_URL env var).
- `scripts/seed.mjs` — Seeds placeholder data. Will be replaced by real process data.
- `scripts/backfill-metadata.mjs` — One-time backfill for metadata column on existing rows.

## Key Quirk: Next.js 14 Fetch Caching
Next.js 14 patches global `fetch` and caches HTTP responses by default. Since
`@vercel/postgres` talks to Neon via HTTP fetch, all SELECT queries get cached —
writes succeed but reads return stale data. **Fix:** Add these exports to any
API route that reads from the DB:
```ts
export const fetchCache = 'force-no-store';
export const dynamic = 'force-dynamic';
```
The `fetchCache` export is the one that actually resolves it. Also add
`Cache-Control: no-store` header on GET responses and `?t=Date.now()` on
client fetch calls as belt-and-suspenders.

## Canvas Population Approach
Business process maps are translated from n8n workflow JSONs into business-language
nodes and edges. The process:
1. Send n8n workflow JSON to Claude.ai for architecture/reasoning
2. Claude translates to business-language node/edge taxonomy at Option B abstraction
   (one node per business function, not per n8n node)
3. Victor reviews and adjusts labels/abstraction
4. Claude Code populates via POST/PUT endpoints

Each workflow maps to a **funnel** (stored in `metadata.funnel`). Current funnels:
- "New Member Acquisition" — ACE/Skool/Recharge → HubSpot + Clerk + Skool onboarding

## What's Next (Roadmap)
1. ~~Editable canvas~~ ✅ Done
2. **Populate real process map** ← Current step
3. Funnel tagging — dropdown filter in UI, opacity/blur on non-matching nodes
4. MITs and CTs page — quarterly goals with critical tasks overlaid on canvas
5. Executive summary / grouped view

## What's Out of Scope (For Now)
- Authentication
- AI transcript parsing
- Live data connections to n8n/HubSpot
- MIT/CT data model (tables not yet created)