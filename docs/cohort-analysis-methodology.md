# Member Acquisition & Churn Cohort Analysis

> How to calculate monthly member acquisition counts, churn rates by tier, and reconcile Skool vs HubSpot data.

## Quick Reference

| What you need | Which approach | Tables used |
|---|---|---|
| Monthly acquired/churned counts | Tier 1: Skool-only | `skool_members`, `skool_cancellations` |
| Tier breakdown + churn by tier | Tier 2: HubSpot-enriched | Above + `contact_emails`, `contacts` |
| Validate numbers / find gaps | Tier 3: QA cross-check | Above + `deals`, `contact_deal` |

**Always apply `exclude.csv`** (repo root, ~127 rows) to remove internal/test accounts before any analysis.

---

## Tier 1: Skool-Only (Fast Cohort Counts)

The two Skool tables are **mutually exclusive** — active members are only in `skool_members`, cancelled members are only in `skool_cancellations`. Union them to get total acquisitions.

```sql
WITH exclude_list AS (
  -- Load exclude.csv emails here
),
all_joiners AS (
  SELECT email, join_date AS joined_at, 'active' AS source
  FROM skool_members
  WHERE LOWER(email) NOT IN (SELECT email FROM exclude_list)
  UNION ALL
  SELECT email, approved_at AS joined_at, 'cancelled' AS source
  FROM skool_cancellations
  WHERE LOWER(email) NOT IN (SELECT email FROM exclude_list)
)
SELECT
  TO_CHAR(DATE_TRUNC('month', joined_at), 'Mon YYYY') AS cohort_month,
  COUNT(*) AS acquired,
  SUM(CASE WHEN source = 'cancelled' THEN 1 ELSE 0 END) AS churned,
  ROUND(
    SUM(CASE WHEN source = 'cancelled' THEN 1 ELSE 0 END)::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS churn_rate_pct
FROM all_joiners
WHERE joined_at >= '2026-03-01'  -- adjust as needed
GROUP BY DATE_TRUNC('month', joined_at), 1
ORDER BY DATE_TRUNC('month', joined_at)
```

**Column reference:**
- `skool_members.join_date` — when the active member joined
- `skool_cancellations.approved_at` — when the cancelled member originally joined (not when they cancelled)

---

## Tier 2: HubSpot-Enriched (Tier Breakdown)

### Join path

```
skool_members.email / skool_cancellations.email
  → contact_emails.email              ← MIDDLEWARE (1 HubSpot contact has many emails)
    → contacts.contact_id
      → contacts.membership_tier      ← Standard, VIP, Premium, VIP (Yearly)
      → contacts.membership_status    ← Active, Cancellation, Payment Failed, Refund
```

**Why `contact_emails` is required:** Members often use a different email for Skool than what's on their HubSpot contact. In March 2026, direct email matching missed ~30% of matches. The `contact_emails` table bridges this by mapping all known emails to a single `contact_id`.

### Query

```sql
WITH exclude_list AS (
  -- Load exclude.csv emails here
),
march_joiners AS (
  SELECT email FROM skool_members
  WHERE join_date >= '2026-03-02' AND join_date < '2026-04-01'
    AND LOWER(email) NOT IN (SELECT email FROM exclude_list)
  UNION
  SELECT email FROM skool_cancellations
  WHERE approved_at >= '2026-03-02' AND approved_at < '2026-04-01'
    AND LOWER(email) NOT IN (SELECT email FROM exclude_list)
)
SELECT
  c.membership_tier,
  COUNT(DISTINCT mj.email) AS total,
  SUM(CASE WHEN c.membership_status = 'Active' THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN c.membership_status != 'Active' OR c.membership_status IS NULL THEN 1 ELSE 0 END) AS churned
FROM march_joiners mj
JOIN contact_emails ce ON LOWER(mj.email) = LOWER(ce.email)
JOIN contacts c ON ce.contact_id = c.contact_id
GROUP BY c.membership_tier
ORDER BY total DESC
```

### Churn definition

- `membership_status = 'Active'` → retained
- Anything else → churned (Cancellation, Payment Failed, Refund, null)
- Churn % = churned / total

### Two ways to look at tier

| Perspective | Column | Use when |
|---|---|---|
| **What they bought** | `deals.tier` | Acquisition analysis — "how many Premiums did we sell?" |
| **Where they are now** | `contacts.membership_tier` | Current state — "how many Premiums do we have?" |

These frequently mismatch due to upgrades/downgrades. In March 2026, 21 out of 261 contacts had a different deal tier vs contact tier.

### March 2026 baseline

| Tier | Total | Active | Churned | Churn % |
|---|---|---|---|---|
| Standard | 152 | 131 | 21 | 13.8% |
| VIP | 72 | 64 | 8 | 11.1% |
| Premium | 34 | 31 | 3 | 8.8% |
| VIP (Yearly) | 3 | 3 | 0 | 0.0% |
| **Total** | **261** | **229** | **32** | **12.3%** |

Pattern: **higher tier = lower churn**.

---

## Tier 3: QA Cross-Check (Deals Reconciliation)

### When to use

Run this when numbers look off, or periodically to audit data quality. It compares Skool-based acquisition counts against HubSpot deals closed in the same period.

### Deals join path

```
deals (filter by close_date)
  → contact_deal (deal_id → contact_id)
    → contacts (email, tier, status)
    → contact_emails (all associated emails for bridging)
```

**Important:** Use `DISTINCT contact_id`, not deal count. One contact can have multiple deals in the same month (upgrades). March 2026: 274 deals but only 261 unique contacts.

### The gap audit process

Skool said 222 new members in March. HubSpot deals said 261 unique contacts. Here's how we traced the ~39 gap:

**Step 1 — Find people in Skool March with no March deal:**

Bridge Skool emails through `contact_emails` to `contact_id`, then check if that `contact_id` has any deal with `close_date` in March.

| Category | Count | How to identify |
|---|---|---|
| Business Partners | 4 | `contacts.membership_type = 'Business Partner Member'` — joined under someone else's membership |
| No HubSpot contact | 10 | Email not in `contact_emails` at all |
| Deal in different month | 5 | Have a contact but deal `close_date` outside March |
| Edge cases | 2 | `membership_type = 'Edge Cases/Investigate'` |
| **Subtotal** | **21** | |

**Step 2 — Find people with March deals not in Skool March:**

For each March deal contact, get ALL their emails from `contact_emails`, and check if any appear in the Skool March union.

Then for the unmatched 77, check if they appear in Skool at ANY date:

| Category | Count | How to identify |
|---|---|---|
| Existing members (renewal/upgrade) | 51 | `skool_members.join_date` is before March — their deal is NOT a new acquisition |
| Late Skool joiners | 8 | `skool_members.join_date` is in April — paid in March, joined community later |
| Never joined Skool | 18 | No match in either Skool table at any date |
| **Subtotal** | **77** | |

**Step 3 — Reconcile:**

After removing 51 renewals/upgrades from HubSpot: 261 - 51 = **210 net new**, close to Skool's **222**. The remaining ~12 gap = the 21 Skool-only minus late joiners that overlap.

### Membership types in HubSpot (`contacts.membership_type`)

| Type | Meaning |
|---|---|
| Paying Member | Has their own deal/payment |
| Business Partner Member | Joined under someone else's membership (no deal in their name) |
| Pending Member | Invite sent, not yet activated |
| Test/Employee/Invitee | Internal — should also be in exclude.csv |
| Edge Cases/Investigate | Needs manual review |

---

## Normalizing HubSpot Deals to Net-New Acquisitions

When comparing HubSpot deal counts to Skool acquisition counts, filter to **first-deal contacts only** (`MIN(close_date)` per `contact_id` falls within the target month). This removes renewals and upgrades that inflate the raw deal count.

After normalizing, expect a residual gap of ~10–15% between the two systems. This is accounted for by two known categories:

| Category | Direction | Typical count (March 2026) | Explanation |
|---|---|---|---|
| **Paid but never joined Skool** | In HubSpot, not in Skool | ~18 | Member purchased a membership but hasn't activated in the Skool community yet (missed invite email, hasn't gotten around to it, etc.). Acceptable gap — they may join later. |
| **Business Partner members in Skool** | In Skool, not in HubSpot | ~10 | Invited directly to the Skool community under someone else's membership. No deal in their name — the paying Business Partner's deal covers them. |

**March 2026 normalization example:**
- HubSpot all deals: 264 unique contacts
- HubSpot net-new (first deal): 248
- Skool acquired: 223
- True overlap (same person, same month): ~205

---

## Key Rules

1. **`exclude.csv` always applied first** — case-insensitive email match, Email column (3rd)
2. **`contact_emails` is required middleware** for any Skool ↔ HubSpot crossing — never match on `contacts.email` alone
3. **The two Skool tables are mutually exclusive** — safe to union without deduplication
4. **Skool tables are canonical for join dates** — not HubSpot
5. **Always use `LOWER()` for email matching**
6. **Deal tier ≠ contact tier** — deal tier = what was purchased, contact tier = current state after upgrades/downgrades
7. **HubSpot deals include renewals/upgrades** — use `MIN(close_date)` per contact to isolate net-new acquisitions
8. **~18 HubSpot members may not be in Skool** — paid but haven't joined the community yet (acceptable lag)
9. **~10 Skool members may not be in HubSpot** — Business Partner members invited under someone else's membership (no deal in their name)

---

## Activation & Churn Risk Analysis

### Overview

This analysis answers: **which behaviors in a new member's first days/weeks predict whether they'll retain or churn?** Run this on each monthly cohort to track activation rates and identify at-risk segments.

### How the analysis was built (step by step)

**Step 1 — Establish the acquisition base.**
Union `skool_members` + `skool_cancellations` with `UNION ALL`, filter by `join_date`/`approved_at` in target month, exclude `exclude.csv`. This gives total acquired and churned per month. March 2026: 224 acquired, 39 churned (17.4%).

**Step 2 — Cross-check against HubSpot deals.**
Compared Skool 224 vs HubSpot 264 March deals (292 total deals, 264 unique contacts). Traced the gap: 58 renewals/upgrades, 18 never joined Skool, 8 late joiners. After normalizing to first-deal-only: 248 net-new, with a residual ~25 gap explained by paid-but-not-joined and Business Partner members.

**Step 3 — Cross with ACQ AI usage.**
Joined Skool members to `acq_ai_usage` via `contact_emails` bridge (because members often use different emails on Skool vs ACQ AI). 80% of March members used ACQ AI at least once. Tested multiple thresholds for `msgs_week1` and `active_days_week1`. **`active_days_week1 >= 2` was the strongest signal** — active days > message count because someone can send 20 messages in one session and still churn, but coming back on a second day shows real engagement.

**Step 4 — Cross with community engagement.**
Counted posts + comments within 30 days of join via `skool_posts.author_id` + `skool_comments.author_id` matched on `user_id`/`skool_user_id`. Most members don't post at all (median = 0). Week 1 was too sparse. **3+ posts/comments in month 1** was the best threshold — strong signal but small sample (only 17% of members hit it).

**Step 5 — Layer in tier.**
Joined to `contacts.membership_tier` via `contact_emails`. Higher tier = lower churn: Standard 17.6% → VIP 13.3% → Premium 6.3%. But non-activated VIPs churn at 27.3% — worse than Standard overall.

**Step 6 — Exclude yearly plans.**
VIP (Yearly), Premium, and Premium + Scale Workshop members are locked in by contract — they won't churn even if dissatisfied. Excluding them sharpens the activation signal: activated 12.2% vs not activated 26.9% churn (monthly plans only).

**Step 7 — Combined activation segments.**
Crossed AI activation × community engagement. Members with both signals: 9.4% churn. Neither signal: 26.8% churn. Nearly 3x difference.

**Step 8 — Add billing source dimension.**
Determined billing source by joining Skool members → `contact_emails` → `contact_deal` → `deals.billing_source`. **Important:** do NOT filter deals by `close_date` to match the Skool join month — deal close dates and Skool join dates don't always align (especially for Recharge, where 12 of 41 members had deals closed outside March). Use the most recent deal for each contact regardless of close date.

Found that activation works very differently by source: strong lever for ACE/Recharge members, weak for Skool-native members.

### Data sources

| Signal | Table | Join path | Time window |
|---|---|---|---|
| ACQ AI usage | `acq_ai_usage` | `skool email → contact_emails → contact_id → contact_emails → acq_ai_usage.email` | Week 1 (`active_days_week1`) |
| Community engagement | `skool_posts`, `skool_comments` | `skool_members.user_id` / `skool_cancellations.skool_user_id` → `author_id` | Month 1 (posts + comments within 30 days of `join_date`) |
| Tier | `contacts.membership_tier` | `skool email → contact_emails → contacts` | Current state |
| Billing source | `deals.billing_source` | `skool email → contact_emails → contact_deal → deals` | Most recent deal (no date filter) |

**ACQ AI join path:** Members may use different emails for Skool vs ACQ AI. Always bridge through `contact_emails`: get the member's `contact_id`, then get ALL emails for that `contact_id`, then match any against `acq_ai_usage.email`.

**Community engagement join path:** Use `skool_members.user_id` or `skool_cancellations.skool_user_id` to match against `skool_posts.author_id` and `skool_comments.author_id`. Count posts + comments created between `join_date` and `join_date + 30 days`.

**Billing source join path:** `skool email → contact_emails → contact_id → contact_deal → deals.billing_source`. Use the **most recent deal** (`ORDER BY close_date DESC LIMIT 1`), not restricted to the join month. Deal close dates frequently differ from Skool join dates — Recharge members in particular often have deals closed in the month before or after they join the community.

**Note on `acq_ai_usage`:** This table is refreshed manually from a Metabase CSV export. Check `MAX(last_message_at)` before running analysis — if stale by more than a few days, refresh first by replacing `acq_ai_usage.csv` at repo root and running `node scripts/activation-analysis.mjs`.

### Activation definitions

| Signal | Threshold | Why this threshold |
|---|---|---|
| **ACQ AI activated** | 2+ active days in week 1 | Strongest churn separation among all thresholds tested. Active days > message count because someone can send 20 messages in one session and still churn — coming back on a second day shows real engagement. |
| **Community engaged** | 3+ posts or comments in month 1 | Best balance of signal strength and sample size. Week 1 is too sparse (median = 0 for both groups). |

### Yearly plan exclusion

When analyzing churn driven by satisfaction/value (not contract lock-in), **exclude yearly plans**: VIP (Yearly), Premium, Premium + Scale Workshop. These members won't churn even if dissatisfied because they've prepaid for the year. Including them dilutes the signal.

- **All plans:** use for reporting total acquisition/churn numbers
- **Monthly plans only (Standard + VIP):** use for activation analysis and churn risk segmentation

### March 2026 baseline findings

**Overall (all plans, n=224):**

| Metric | Value |
|---|---|
| Acquired | 224 |
| Churned | 39 (17.4%) |
| ACQ AI adoption (any usage) | 80% |
| ACQ AI activated (2+ days week 1) | 65% |
| Community engaged (3+ actions month 1) | 17% |

**Churn by tier (all plans):**

| Tier | Total | Churned | Churn % |
|---|---|---|---|
| Standard | 148 | 26 | 17.6% |
| VIP | 45 | 6 | 13.3% |
| Premium | 16 | 1 | 6.3% |
| VIP (Yearly) | 1 | 0 | 0.0% |
| Unknown (no HubSpot match) | 13 | 6 | 46.2% |

Pattern: **higher tier = lower churn**.

**ACQ AI activation (monthly plans only, n=190):**

| Group | Total | Churned | Churn % |
|---|---|---|---|
| Activated (2+ days week 1) | 123 | 15 | 12.2% |
| Not activated | 67 | 18 | 26.9% |

**Activated members churn at half the rate of non-activated members.**

**Community engagement (monthly plans only, n=206):**

| Group | Total | Churned | Churn % |
|---|---|---|---|
| Engaged (3+ actions month 1) | 35 | 3 | 8.6% |
| Not engaged | 171 | 35 | 20.5% |

Stronger signal but smaller sample — most members don't post or comment at all.

**Combined activation segments (all plans, n=224):**

| Segment | Total | Churned | Churn % |
|---|---|---|---|
| AI + Community | 31 | 3 | 9.7% |
| AI only | 116 | 17 | 14.7% |
| Community only | 6 | 0 | 0.0% |
| Neither | 71 | 19 | 26.8% |

**Tier × AI activation (all plans):**

| Tier | Activated Churn | Not Activated Churn | Gap |
|---|---|---|---|
| Standard | 16.5% | 20.9% | 4.4pp |
| VIP | 7.1% | 27.3% | 20.2pp |
| Premium | 0.0% | 16.7% | 16.7pp |

### Churn by billing source (all plans, n=224)

Billing source determined by joining Skool member → `contact_emails` → `contact_deal` → `deals.billing_source` (most recent deal, no date restriction).

| Source | Total | Churned | Churn % | AI Activated | Community 3+ | Both Signals |
|---|---|---|---|---|---|---|
| **Skool** | 105 | 21 | **20.0%** | 70.5% | 13.3% | 13.3% |
| **ACE** | 62 | 7 | **11.3%** | 71.0% | 14.5% | 11.3% |
| **Recharge** | 41 | 5 | **12.2%** | 65.9% | 31.7% | 24.4% |
| No deal match | 16 | 6 | **37.5%** | 12.5% | 6.3% | 0.0% |

**Activation effect by source:**

| Source | AI Activated Churn | Not Activated Churn | Gap |
|---|---|---|---|
| **Skool** | 18.9% | 22.6% | 3.7pp (weak) |
| **ACE** | 9.1% | 16.7% | 7.6pp |
| **Recharge** | 7.4% | 21.4% | 14.0pp (strongest) |

**Community engagement effect by source:**

| Source | Community 3+ Churn | Not Engaged Churn | Gap |
|---|---|---|---|
| **Skool** | 14.3% | 20.9% | 6.6pp |
| **ACE** | 11.1% | 11.3% | 0.2pp (flat) |
| **Recharge** | 0.0% | 17.9% | 17.9pp (strongest) |

**Key source findings:**
- **Skool-native churns the most (20.0%)** and AI activation barely helps (18.9% vs 22.6%). The churn driver for Skool-native members is something other than product engagement — possibly price sensitivity or different expectations from buying directly on Skool.
- **ACE churns at 11.3%** — AI activation helps (9.1% vs 16.7%) but community engagement makes almost no difference.
- **Recharge churns at 12.2%** — both activation signals are strong levers. Recharge members who hit both signals: 0% churn. Recharge members with neither signal: 27.3% churn.
- **No deal match = highest risk (37.5%)** — only 12.5% AI activated, essentially disconnected from the ecosystem.

### Highest churn risk segments

1. **No deal match members** — 37.5% churn, 87.5% not activated. These 16 members have no HubSpot deal and almost no product engagement. Data quality issue or Business Partner members.
2. **Non-activated Recharge members** — 21.4% churn (14 members). Strongest activation lever: if activated, drops to 7.4%.
3. **Non-activated VIP members** — 27.3% churn, worse than Standard overall (17.6%). Highest-value members to lose.
4. **Skool-native Standard members** — 22.7% churn, largest at-risk group. Activation alone doesn't solve this — needs different intervention.

### Key activation insights

- **ACQ AI activation is the broadest lever** — 65% of members activate, moves churn from 26.8% → 14.7%
- **Community engagement is the strongest signal** — but only 17% of members engage, moves churn from ~19% → ~8%
- **Both signals together** — 9.7% churn (best), nearly 3x better than neither signal (26.8%)
- **Activation works differently by source** — strong lever for ACE/Recharge, weak for Skool-native
- **The biggest single win is getting ACE/Recharge members to use ACQ AI on 2+ days in their first week**
- **Skool-native churn needs a different diagnosis** — activation alone doesn't move the needle for this group

---

## Activation KPIs

Track these metrics for each monthly cohort. Each one is framed as a gap to close — the goal is to move every number toward 100% (or 0 for risk counts). These give the team clear actions to work on.

### 1. ACQ AI Activation Rate
- **Question:** How many new members used ACQ AI for 2+ days in their first week?
- **Formula:** Members with `active_days_week1 >= 2` in `acq_ai_usage` ÷ total acquired (monthly plans only)
- **March 2026 baseline:** 123 / 190 = **64.7%**
- **Goal:** 100% — every new member should use ACQ AI on at least 2 separate days in week 1
- **Why it matters:** Activated members churn at half the rate (12.2% vs 26.9%)
- **Team action:** Improve onboarding flow, send nudges to members who haven't used ACQ AI by day 3

### 2. Community Engagement Gap
- **Question:** How many new members did NOT post or comment 3+ times in their first 30 days?
- **Formula:** Total acquired − members with 3+ posts/comments in month 1
- **March 2026 baseline:** 171 / 206 = **83% did NOT engage** (only 35 did)
- **Goal:** 0 — every member should have 3+ community interactions in month 1
- **Why it matters:** Engaged members churn at 8.6% vs 20.5% for non-engaged
- **Team action:** Create prompts for introductions, encourage replies, run engagement challenges in first 30 days

### 3. At-Risk VIP Count
- **Question:** How many VIP members have NOT activated on ACQ AI yet?
- **Formula:** VIP members with `active_days_week1 < 2` (or no `acq_ai_usage` match)
- **March 2026 baseline:** **14 VIP members** not activated, 3 churned (21.4%)
- **Goal:** 0 — every VIP should be activated
- **Why it matters:** Non-activated VIPs churn at 27.3% — worse than Standard overall (17.6%). These are the highest-value members to lose.
- **Team action:** Personal outreach from community team within 48 hours of join if no ACQ AI usage detected

### 4. Fully Activated Rate (Both Signals)
- **Question:** What % of new members hit BOTH activation thresholds (2+ AI days week 1 AND 3+ community actions month 1)?
- **Formula:** Members with both signals ÷ total acquired
- **March 2026 baseline:** 31 / 224 = **13.8%**
- **Goal:** > 50% — at least half of new members should be fully activated
- **Why it matters:** Fully activated members churn at 9.7% vs 26.8% for members with neither signal — nearly 3x difference
- **Team action:** This is the north star metric. Improvements to KPIs 1 and 2 compound here.

### 5. Monthly Churn Rate (monthly plans only)
- **Question:** What % of this month's new members have churned?
- **Formula:** Members in `skool_cancellations` with `approved_at` in target month ÷ total acquired in same month
- **Exclude:** Yearly plans (VIP Yearly, Premium, Premium + Scale Workshop) and `exclude.csv`
- **March 2026 baseline:** 33 / 190 = **17.4%**
- **Goal:** < 10% — this is the lagging outcome metric that the other KPIs drive
- **Why it matters:** This is the result. If activation rates improve, this number follows.

### 6. Churn by Billing Source
- **Question:** What is the churn rate for each billing source this month?
- **Formula:** Churned ÷ acquired per source. Source = most recent `deals.billing_source` via `contact_emails` bridge (no date restriction on deal).
- **March 2026 baseline:**

| Source | Total | Churned | Churn % | AI Activated Churn | Not Activated Churn |
|---|---|---|---|---|---|
| **Skool** | 105 | 21 | 20.0% | 18.9% | 22.6% |
| **ACE** | 62 | 7 | 11.3% | 9.1% | 16.7% |
| **Recharge** | 41 | 5 | 12.2% | 7.4% | 21.4% |
| **No deal** | 16 | 6 | 37.5% | 0.0% | 42.9% |

- **Goal:** Skool < 15%, ACE < 10%, Recharge < 10%, No deal < 20%
- **Why it matters:** Activation is a strong lever for ACE/Recharge but weak for Skool-native. Different sources need different interventions.
- **Team action:** Focus AI activation nudges on ACE/Recharge members. Investigate Skool-native churn separately (price sensitivity? onboarding gap? different expectations?).

---

## Table Schema Quick Reference

| Table | Key columns | Role |
|---|---|---|
| `skool_members` | `email`, `join_date`, `full_name`, `tier` | Active community members |
| `skool_cancellations` | `email`, `approved_at`, `first_name`, `last_name` | Cancelled members (join date = `approved_at`) |
| `contact_emails` | `contact_id`, `email`, `is_primary` | Middleware: maps many emails → one HubSpot contact |
| `contacts` | `contact_id`, `email`, `membership_tier`, `membership_status`, `membership_type` | HubSpot contact record |
| `deals` | `deal_id`, `close_date`, `tier`, `mrr` | HubSpot deals |
| `contact_deal` | `contact_id`, `deal_id` | Links contacts to deals |
| `exclude.csv` | `Email` (3rd column) | Internal/test accounts to exclude |
