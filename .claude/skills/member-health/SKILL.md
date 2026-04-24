---
name: member-health
description: Page-specific guide for /agents/health — what the composite health score is, how the four bands (Dormant / Lukewarm / Engaged / Champion) are defined, what filters do, what the two charts + at-risk table show, and how the on-page chatbot should answer. Use this skill whenever someone asks about "the health page", the composite score, the bands, or wants to build/modify anything on /agents/health. Also loaded into the system prompt of the page's in-app chatbot. For the underlying retention framework (why signals matter), defer to `acq-vantage-retention`. For cohort-over-time AI adoption questions, defer to `activation-dashboard`.
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
- derived: `composite_score` (0–100 integer), `band` (`dormant | lukewarm | engaged | champion`)
- `refreshed_at` — when the underlying row was last refreshed

## Composite score formula (v1)

Each component is capped, then weighted. Weights sum to 100.

| Component | Signal | Cap | Weight contribution |
|---|---|---:|---:|
| Engagement | `total_posts + total_comments` | 20 | `min(x, 20) × 1.5` → up to 30 |
| Upvotes received | `total_upvotes_received` | 50 | `min(x, 50) × 0.3` → up to 15 |
| Learning | `courses_started × 10 + courses_completed × 20` | 100 | `min(x, 100) × 0.2` → up to 20 |
| AI adoption | `ai_activated ? 100 : ai_total_chats` | 100 | `min(x, 100) × 0.25` → up to 25 |
| Recency | `max(0, 100 − min(days_since_last_post, 30) × 3.33)` | — | `× 0.1` → up to 10 |
| **Total** | | | **0–100** |

Rationale:
- **Engagement** and **AI adoption** are the biggest weights because they are the two signals the retention framework (see `acq-vantage-retention`) has shown most strongly separate retained from churned members.
- **Learning** gets 20% because courses are a strong proxy for product depth, but low-volume — most members haven't started one.
- **Upvotes** (15%) proxies perceived value-add: members whose posts resonate are almost always healthy.
- **Recency** (10%) is the lightest — a one-week gap shouldn't crater a champion's score, but 30+ days of silence should visibly pull it down.

v1 weights are **gut-feel, not empirically tuned**. A future iteration should run `scripts/health-score-correlation.mjs` (TBD) to regress weights against observed churn.

## Bands

| Band | Score range | Typical distribution (Apr 2026, active members) |
|---|---|---|
| Dormant | 0–25 | ~74% |
| Lukewarm | 26–50 | ~19% |
| Engaged | 51–75 | ~5% |
| Champion | 76–100 | ~2% |

The dormant majority is normal for a community — most members are lurkers. "At risk" = dormant + active (below).

## Page anatomy

Top to bottom:
1. **PageHeader** — title, refresh button, last-refreshed-at indicator (from `MAX(refreshed_at)`)
2. **Cohort summary line** — `{active_members} active · avg score {N} · {at_risk} at risk`
3. **ChatPanel** — same component as `/agents/activation`, new API route + system prompt
4. **Filter card** — member_status, billing_source, tier, join-date range
5. **Chart 1: Health Score Distribution** — stacked bar of the four bands (count + %)
6. **Chart 2: Health by Join-Month Cohort** — stacked bar per cohort month (MoM/WoW toggle) + avg score line
7. **Chart 3: At-Risk Members** — drill-down table of dormant + active members, sorted by days_since_last_post desc (longest silence first). Columns: email, joined, tier, billing_source, score, days_since_last_post, AI activated yes/no.

## Filters

Unlike the activation page, there's **no "locked-as-of" filter** — the snapshot table is a single point-in-time rebuild. Use the refresh indicator instead.

- **Member status** — active / cancelled / all (default: active)
- **Billing source** — ACE / Recharge / Skool / all (default: all)
- **Tier** — Standard / VIP / Premium / all (default: all)
- **Join-date range** — Start / End (default: last 12 months)

All filters compose via SQL `WHERE` clauses on the `member_health_scored` view. `exclude.csv` filtering is **inherited from `unified_skool_cohort`** — already handled upstream, no action needed here.

## API endpoints

- `GET /api/dashboard/health-distribution?{filters}` — returns `{ buckets: [{band, count, pct, avg_score}], total, avg_score, as_of }`
- `GET /api/dashboard/health-by-cohort?{filters}&view={mom|wow}` — returns `{ rows: [{period, period_key, dormant, lukewarm, engaged, champion, total, avg_score}] }`
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
