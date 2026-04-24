---
name: activation-dashboard
description: Page-specific guide for /agents/activation — what the two charts (ACQ AI Activation Rate, AI Weekly Active Users) show, what the Start/End/Locked-as-of filters actually do, what the on-page chatbot is scoped to answer, and the underlying API endpoints. Use this skill whenever someone asks about "the activation page", "that chart", "why did the number change when I changed the filter", or is building/modifying anything on /agents/activation. Also load this into the system prompt of the page's in-app chatbot so it can ground answers in the same documentation everyone else reads. For the underlying metric definitions (what "AI activation" means, cohort methodology), defer to `acq-vantage-retention`. For table schemas and query patterns, defer to `acq-vantage-db`.
---

# Activation Dashboard (/agents/activation)

Single-page dashboard showing ACQ AI adoption. Layout (top to bottom): chatbot, filter card, two charts.

Code:
- Page: [src/app/agents/activation/page.tsx](../../../src/app/agents/activation/page.tsx)
- Chart 1 (cohort): [src/app/dashboard/ActivationKPIs.tsx](../../../src/app/dashboard/ActivationKPIs.tsx) → `AIActivationRateCard`
- Chart 2 (period): [src/app/dashboard/AIWeeklyActiveCard.tsx](../../../src/app/dashboard/AIWeeklyActiveCard.tsx)
- Chatbot: reuses [src/app/agents/retention/ChatPanel.tsx](../../../src/app/agents/retention/ChatPanel.tsx)

---

## What each chart measures

Both charts use the same threshold — **"used AI on 2+ distinct calendar days"** — but apply it to different windows. That distinction is the single most common source of confusion on this page.

### Chart 1 — ACQ AI Activation Rate (cohort view)

A bar per join week (or month). Measures what share of the cohort activated AI in their **personal first 7 days** after joining.

- Green bar (`acquired`): members who joined in that calendar period.
- Slate bar (`ai_activated`): of those, how many hit 2+ distinct AI days in their personal first 7 days.
- Line (`ai_activation_rate`): slate ÷ green, percent.

Key mechanics:
- The 7-day window starts at the member's exact join timestamp, not the calendar week. Friday 3 pm joiner has until Friday 3 pm next week.
- A bar is final 7 days after its last day (so week ending Sat 3/21 isn't final until Sat 3/28). Practically, the 1–2 most recent bars are still live.
- A Saturday joiner's activation window may finish in the following calendar week. They still count in their original join-week bar — not the bar where they completed activation.

### Chart 2 — AI Weekly Active Users (period view)

A bar per calendar period. Measures what share of the active community used AI 2+ days **within that same calendar period**.

- Slate bar (`active_base`): members who were active in the community at any point during the period (joined before period end, AND either never cancelled OR cancelled after period started).
- Blue bar (`wau`): of those, how many sent AI messages on 2+ distinct days during that period.
- Line (`wau_rate`): blue ÷ slate, percent.

Key mechanics:
- Measurement window is the fixed calendar period (Sun–Sat for weekly, month for monthly) — **not** each member's personal window.
- A Saturday joiner has 1 day of runway that week. They count in `active_base` but rarely in `wau` until the following week.
- The current period always shows a partial read — expect bar/rate to climb as the week fills out.

### Same definition, different windows — summary

| Aspect | Activation Rate | WAU |
|---|---|---|
| Threshold | 2+ distinct AI days | 2+ distinct AI days |
| Window | Each member's personal 7 days from join | Fixed calendar period (Sun–Sat / month) |
| Denominator | Members who joined in period | Members active in community during period |
| Reads | "Did new members adopt AI?" | "How many current members use AI regularly?" |
| When bar finalizes | 7 days after last day of period | End of period |

For the underlying "2+ distinct days" definition and why it's the threshold, see `acq-vantage-retention`.

---

## Filters

Three filters live in the card above the charts. Nothing re-fetches until Apply is clicked.

| Filter | Default | What it does |
|---|---|---|
| Start date | 2026-03-01 | Earliest bar shown on x-axis. WAU chart ignores messages before this date. |
| End date | 2026-03-31 | Latest bar shown. Activation chart excludes members who joined after end-date. WAU chart ignores messages after end-date. |
| Locked-as-of | 2026-04-18 | Freezes data as if queried at this point in time. Only takes effect when **earlier than end-date**. |

### Effective cap

The **effective cap** on everything (joins, messages, cancellations) is `min(end_date, locked_as_of)`.

- If locked-as-of ≥ end-date: locked has no effect. Reading stays "current."
- If locked-as-of < end-date: locked becomes the cap. Cancellations between locked-date and end-date get **rolled back** as if they hadn't happened — so the active base counts those members as still active through the locked date.

### Worked example — start=3/1, end=4/11, locked=4/8

Effective cap = 4/8.
- Activation chart, week of 4/5: counts members who joined 4/5–4/8 only; their activations only count through 4/8. The bar reflects ~3 days of cohort runway, not the full 7.
- WAU chart, week of 4/5: counts AI messages 4/5 → 4/8. Active base reflects community size as of 4/8. Cancellations between 4/9 and 4/11 are rolled back to "still active."

### Reproducibility property

The same `(start, end, locked)` triple **always** returns the same numbers regardless of when you query. This is intentional and valuable — snapshots are reproducible, so you can share a URL and get the same chart next week. Keep it that way when changing query logic.

---

## Chatbot scope

The in-app chatbot at the top of the page exists to let people ask questions grounded in what they're looking at. Scope it tightly.

### Answers

- Any number, bar, line, trend, or hover value on either chart
- How "activation" or "WAU" is measured, including the 2+ day threshold
- Why a specific number looks the way it does (partial current week, Saturday-joiner drag, locked-date rollback, etc.)
- Member-level drill-down — who's activated, who's not, who's at risk of churning, what tier they are
- Filter behavior — what each filter does, how the effective cap works, how to reproduce a snapshot

### Does NOT answer (redirect these)

- Churn / retention breakdowns by signal → direct to `/agents/retention`
- Community engagement (posts/comments) — only referenced here for context → direct to `/agents/retention`
- Revenue / MRR / deal metrics → direct to Dashboard page
- Subscription / billing ops → direct to Caio or the ops team

When redirecting, name the destination specifically. "That's on the retention page" beats "I can't answer that."

### Grounding rules

1. Always ground numerical answers in the current filter state — don't reuse defaults from memory if the user has changed them.
2. When a user asks "why is this number X," explain in terms of the chart's mechanics (personal 7-day window, current-period partial, effective cap), not in terms of SQL.
3. If a question needs a database query (e.g., "show me the activated members"), the chatbot can drill down via the member-level API endpoint, not by running ad-hoc SQL.

---

## API endpoints

| Purpose | Method | Endpoint |
|---|---|---|
| Activation Rate aggregate | GET | `/api/dashboard/activation-kpis?view={wow\|mom}&startDate&endDate&lockedDate` |
| Activation Rate members (drill-down) | GET | `/api/dashboard/activation-members?startDate&endDate&lockedDate` |
| WAU aggregate | GET | `/api/dashboard/weekly-ai-activity?view={wow\|mom}&startDate&endDate&lockedDate` |
| WAU members (drill-down for current period) | GET | `/api/dashboard/weekly-ai-activity/members?view&endDate&lockedDate` |

All endpoints append `&t=Date.now()` on the client for cache-busting (see CLAUDE.md on the Next.js 14 fetch cache quirk).

---

## Gotchas

1. **Current-period bars are live.** On both charts, the most recent bar hasn't finished accumulating. Read it as a mid-period snapshot, not a final number.

2. **Activation chart: ~2 most recent bars still move.** A bar is final only 7 days after its last day.

3. **WAU: pre-March 2026 active base is inflated.** `skool_cancellations` only covers post-March 2026. Pre-March weeks show an inflated active_base because we can't deduct cancellations we don't know about. The chart's "Things to keep in mind" note calls this out.

4. **Saturday joiners drag the activation rate.** They count in their join-week cohort but have weekend-spanning activation windows that may finish in the next calendar week. Structural, not fixable.

5. **Filter Apply is required.** Typing into a date picker changes nothing on its own. Easy to miss when debugging.

6. **Locked ≥ end is a no-op.** People sometimes worry they broke something; they didn't.

7. **Cohort denominator is read from `unified_skool_cohort`.** The `/api/dashboard/activation-kpis` endpoint queries `unified_skool_cohort WHERE email_source = 'skool_login'` directly — it does not UNION the raw tables at query time. The conceptual union of `skool_members` + `skool_cancellations` (which captures fast-churners who never landed in `skool_members`) is baked into `unified_skool_cohort`'s build pipeline instead. Same outcome, one layer removed. See `acq-vantage-db` for how the cohort table is built and `acq-vantage-retention` for the retention-framework cohort methodology.

8. **Excludes apply.** Test accounts, employees, and manually-added exclusions from `exclude.csv` are filtered out server-side in the API endpoints. The numbers here will not match a raw `SELECT COUNT(*) FROM skool_members`.

---

## Related

- **Methodology** (what "activation" means, how cohorts are built, analytical standards): `acq-vantage-retention` skill
- **Data** (table schemas, query patterns, how to pull the underlying numbers): `acq-vantage-db` skill
- **Parallel page** (`/agents/retention`): uses the same `ChatPanel` component with a different artifact; its chatbot has a different scope documented in `acq-vantage-retention`
