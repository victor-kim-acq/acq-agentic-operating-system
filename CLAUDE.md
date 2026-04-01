# ACQ Agentic Operating System

## Purpose
An agentic operating system for ACQ Vantage that visualizes business processes 
as an interactive canvas, overlays strategic priorities (MITs and CTs), and 
eventually executes operational work autonomously based on meeting transcripts 
and AI-driven task management.

V1 scope: Read-only React Flow canvas rendering the ACQ Vantage business process 
map with mock data. No auth, no AI features yet.

## Tech Stack
- Next.js 14+ (App Router) on Vercel
- Vercel Postgres (Neon)
- Tailwind CSS
- React Flow (canvas rendering)

## Brand Colors
- Primary: #7c3aed, #6f00ff
- Background: #111827
- Light: #e5e7eb, #f3e8ff

## Local Development
1. Clone the repo
2. Copy .env.local.example to .env.local, fill in real values
3. npm install
4. npm run dev → http://localhost:3000
5. POSTGRES_URL must point to Neon (not localhost)

## Data Model
Four core objects with these relationships:

**BusinessProcess** — nodes on the canvas
- id, name, category, description, position_x, position_y
- category: Acquisition | Onboarding | Retention | Features/Logistics
- categories are flexible and stored in DB, not hardcoded

**ProcessConnection** — edges between nodes
- id, source_id (→ BusinessProcess), target_id (→ BusinessProcess), label

**MIT** (Most Important Thing) — quarterly goals
- id, title, owner_id (→ User), quarter, year, category
- one permanent MIT per user: "Daily Operations"

**CT** (Critical Task) — execution items
- id, title, parent_mit_id (→ MIT), owner_id (→ User), status
- one CT belongs to exactly one MIT

**User**
- id, name, role, reports_to (→ User, nullable)

## V1 Canvas Behavior
- Nodes colored by category (not by MIT yet)
- Clicking a node opens a side panel showing associated MITs and CTs
- Mock data seeded via /scripts/seed.mjs

## Key Business Rules
- Every CT must have exactly one parent MIT
- Daily Operations MIT always exists per user — never deleted
- Categories are DB-driven, not hardcoded in the UI
- Canvas is the primary view — no list/table views in V1

## Known Quirks
- React Flow requires explicit width/height on its container div or it renders blank
- Vercel hobby plan has 60s function timeout — no long-running AI processing in V1

## What's Explicitly Out of Scope for V1
- Authentication
- AI transcript parsing
- Live data (everything is seeded mock data)
- Editable canvas