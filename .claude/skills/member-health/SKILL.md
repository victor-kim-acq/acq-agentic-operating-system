---
name: member-health
description: Page-specific guide for /agents/health — what the composite health score is, how the three bands (At Risk / Steady / Champion) are defined, what filters do, what the two charts + at-risk table show, and how the on-page chatbot should answer. Use this skill whenever someone asks about "the health page", the composite score, the bands, or wants to build/modify anything on /agents/health. Also loaded into the system prompt of the page's in-app chatbot. For the underlying retention framework (why signals matter), defer to `acq-vantage-retention`. For cohort-over-time AI adoption questions, defer to `activation-dashboard`.
---

# Member Health dashboard

## Purpose

`/agents/health` answers: "right now, how engaged is each member — and how does that vary by cohort, tier, or billing source?" It's a **snapshot** dashboard, not a time-series one. Data refreshes daily from `member_health_scores` (n8n workflow `WrZW4BJlt5AVQj4h`).

Contrast with `/agents/activation`: that page is cohort-over-time AI adoption. This page is every-member-right-now holistic engagement.

## Source of truth

Postgres view: `member_health_scored` (joins `member_health_scores` + `unified_skool_cohort` on `skool_user_id`, picking the `skool_login` email row).

Columns:
- `skool_user_id, email, full_name, tier, member_status, billing_source, join_date`
- raw signals: `total_posts, total_comments, total_upvotes_received, courses_started, courses_completed, ai_active_days_week1, ai_activated, ai_total_chats, days_since_join, days_since_last_post`
- derived: `composite_score` (0–100 integer), `band` (`at_risk | steady | champion`)
- `refreshed_at` — when the underlying row was last refreshed

## Composite score formula (v2 — per-source weights)

Each component is capped, then weighted by billing source. Weights sum to 100 per formula. **Unknown billing source uses the Skool formula** — 95% of `Unknown` cancellations are founding-era (pre-Feb 2026) Skool-native members who never got a billing-source attribution.

### Component definitions (same for all sources)

| Component | Signal | Cap |
|---|---|---:|
| Engagement | `total_posts + total_comments` | 20 |
| Upvotes received | `total_upvotes_received` | 50 |
| Learning | `courses_started × 10 + courses_completed × 20` | 100 |
| AI adoption | `ai_activated ? 100 : ai_total_chats` | 100 |
| Recency | `max(0, 100 − min(days_since_last_post, 30) × 3.33)` | — |

### Weights per billing source

| Component | ACE / Recharge | Skool / Unknown |
|---|---:|---:|
| Engagement | 30% | 35% |
| Learning | 25% | 30% |
| Upvotes | 15% | 20% |
| AI adoption | 20% | 0% |
| Recency | 10% | 15% |
| **Total** | **100** | **100** |

### Why per-source

v1 used one pooled formula with AI at 25%. Profiling active vs cancelled members (tenure ≥ 30 days) showed:

- **AI separates active from cancelled for ACE/Recharge but inverts for Skool-native.** Cancelled Skool members were actually *more* likely to have AI-activated than active ones (−16pp gap). Keeping AI in the Skool formula would have inflated scores for members who are at risk.
- **Learning was underweighted.** It's the most consistent separator across every source (5.9–14.6× ratio, active÷cancelled means) and has a dramatic %zero gap (ACE: 40→89%, Recharge: 34→95%).
- **Engagement separates cleanly everywhere** and is unchanged in weight for ACE/Recharge.

Full profiling data is the rationale for v2 — see the Apr 2026 profiling run in the commit message / conversation log.

### Known limitations of v2

- **Small samples for cancelled cohorts:** ACE=9, Skool=22 (tenure ≥30). Directional, not firm.
- **No historical snapshots** — cancelled members are scored with their frozen metrics + current `days_since_last_post`. The recency component is circularly correlated with churn for cancelled members, which is partly why recency gets a light weight everywhere.
- **Founding-era bias.** Pre-Feb 2026 members are a different product cohort. If tuning later, consider filtering to post-launch (Feb 2026+) joiners.

Future iteration should run `scripts/health-score-correlation.mjs` (TBD) to regress weights against observed churn once we have daily historical snapshots.

## Bands

Three bands, mapped to distinct operational actions (not four — the middle-two split was a distinction without an action-difference).

| Band | Score range | Color | Action |
|---|---|---|---|
| At Risk | 0–25 | red | Prioritize for CS outreach. This is what the At-Risk Members card surfaces. |
| Steady | 26–75 | amber | Light-touch nurture. Don't over-invest; these are fine. |
| Champion | 76–100 | green | Celebrate, use as advocates, leave alone. |

Typical distribution (Apr 2026, active members, per-source v2 scoring): ~78% At Risk / ~21% Steady / ~1.5% Champion. The huge at-risk share reflects that most community members are lurkers by nature — only ~25% of active members post anything at all. The chart tells you where the distribution *shifts over time*, not that 78% will churn.

## Page anatomy

Top to bottom:
1. **PageHeader** — title, refresh button, last-refreshed-at indicator (from `MAX(refreshed_at)`)
2. **Cohort summary line** — `{active_members} active · avg score {N} · {at_risk} at risk`
3. **ChatPanel** — same component as `/agents/activation`, new API route + system prompt
4. **Filter card** — member_status, billing_source, tier, join-date range
5. **Chart 1: Health Score Distribution** — stacked bar of the four bands (count + %)
6. **Chart 2: Health by Join-Month Cohort** — stacked bar per cohort month (MoM/WoW toggle) + avg score line
7. **Chart 3: Recommended Actions** — prescriptive matrix of at_risk counts × action. Rows are billing sources (ACE, Recharge, Skool, Unknown), columns are specific CS actions. Cells count the at_risk members eligible for that action. Cells overlap by design — a member with zero posts AND zero courses counts in two columns.
8. **Chart 4: At-Risk Members** — drill-down table of at_risk members matching current filters, sorted by days_since_last_post desc (longest silence first). Columns: email, joined, tier, billing_source, score, days_since_last_post, AI activated yes/no.

### Recommended Actions — trigger definitions (v2)

Five actions, ordered by retention-framework priority (with learning appended from empirical profiling). All at_risk-scoped.

| # | Action | Trigger (per at_risk member) | Applies to | Rationale |
|---|---|---|---|---|
| 1 | Nudge AI usage | `ai_activated = false` (didn't hit 2+ distinct AI days in first 7) | all sources | Framework's #1 retention signal. For Skool the signal doesn't *predict* churn, but nudging is still the top lever across the community and operational cost is zero. |
| 2 | Incentive to post | `total_posts + total_comments = 0` | all sources | Framework's #2 signal. First-post is the highest-leverage flip for lurkers. |
| 3 | Book onboarding call | `has_completed_onboarding = false` | all sources | Framework's **strongest rescue lever** — completers churn at 11.1% vs never-booked at 32.3%. |
| 4 | Complete revenue verification | `revenue_verified = false` | **ACE / Recharge only** | Framework says 0% churn when verified for ACE/Recharge; irrelevant for Skool-native. |
| 5 | Send course to watch | `courses_started = 0` | all sources | Not in framework's top 5 — included because profiling showed learning as the cleanest active-vs-cancelled separator (8–15× ratio). |

**Why AI applies to all sources even though the score weights it 0 for Skool:** The composite score is **predictive** — AI doesn't correlate with Skool churn so it carries no predictive weight there. The action matrix is **operational** — nudging AI usage is the top retention lever across the whole community regardless of predictive strength. Don't conflate the two.

**The matrix is prescriptive, not ranked.** It tells CS who's eligible for each action, not which action has the highest expected response rate. Cells overlap by design — a member can need multiple actions.

Triggers and thresholds will iterate as we learn which campaigns actually move scores. For now, thresholds match the retention framework definitions exactly where possible.

## Filters

Unlike the activation page, there's **no "locked-as-of" filter** — the snapshot table is a single point-in-time rebuild. Use the refresh indicator instead.

- **Member status** — active / cancelled / all (default: active)
- **Billing source** — ACE / Recharge / Skool / all (default: all)
- **Tier** — Standard / VIP / Premium / all (default: all)
- **Join-date range** — Start / End (default: last 12 months)

All filters compose via SQL `WHERE` clauses on the `member_health_scored` view. `exclude.csv` filtering is **inherited from `unified_skool_cohort`** — already handled upstream, no action needed here.

## API endpoints

- `GET /api/dashboard/health-distribution?{filters}` — returns `{ buckets: [{band, count, pct, avg_score}], total, avg_score, as_of }`
- `GET /api/dashboard/health-by-cohort?{filters}&view={mom|wow}` — returns `{ rows: [{period, period_key, at_risk, steady, champion, total, avg_score}] }`
- `GET /api/dashboard/health-actions?{filters}` — returns `{ actions: [{key, label, rationale}], rows: [{source, at_risk_total, post, course, ai}], totals }` — used by the Recommended Actions matrix.
- `GET /api/dashboard/at-risk-members?{filters}&limit=100` — returns `{ rows: [{skool_user_id, email, full_name, tier, billing_source, joined_at, composite_score, days_since_last_post, ai_activated, member_status}], total }`
- `POST /api/agents/health/chat` — body `{ question, history, cohort }` where `cohort` is the distribution response above. Loads `acq-vantage-retention` + `member-health` skills into the system prompt.

All GET routes must include `fetchCache = 'force-no-store'` and `dynamic = 'force-dynamic'` (see the Next.js 14 fetch-caching note in root `CLAUDE.md`).

## Chat scope (what the on-page agent answers)

**In scope:**
- "What does the composite score mean? How is it computed?"
- "Which segment has the most at-risk members right now?"
- "Did April joiners end up healthier than March joiners?"
- "Who are our champions and what do they have in common?"
- "Explain the formula."

**Defer to other pages:**
- Cohort churn rates over time → "See `/agents/retention` for churn-over-time breakdowns."
- AI activation details (2+ days, first 7 days) → "See `/agents/activation` for the full cohort-over-time activation view."
- Revenue, deals, billing ops → "That's outside my scope."

**Principles:**
- Always surface the math. "16 champions / 802 active = 2.0%" not "about 2%."
- When quoting a band count, also quote the denominator filter state so numbers are reproducible.
- Flag `n < 5` cells as directional only.
- If the data shows a counterintuitive result (e.g. April joiners healthier than March), explain it proactively — don't leave the user to figure out why.

## Things to keep in mind when using the page

- The snapshot is daily. Any member who signed up in the last 24 hours probably hasn't been scored yet — check `refreshed_at`.
- Low-sample cohort buckets (join week with n<5) are directional. The chart should label those explicitly.
- The composite score is a **heuristic**, not a churn prediction. It was designed before we had churn-labeled training data. Trust it directionally, not for individual member targeting, until the correlation analysis is done.
- `days_since_join` uses `EXTRACT(DAY FROM NOW() - join_date)` — this is total days, not day-of-month.
- Members in `member_health_scores` with no `skool_login` row in `unified_skool_cohort` appear with NULL tier/billing_source. They're rare (edge cases where the cohort rebuild and the health rebuild disagree by a few minutes).
