---
name: acq-vantage-db
description: Query the ACQ Vantage community database (Neon Postgres) for member
  metrics, engagement data, post/comment analytics, and churn analysis. Use this
  skill whenever someone asks about community members, posts, comments, engagement,
  churn, cancellations, member activity, topic breakdown, or any metric related to
  the ACQ Vantage Skool community. Also trigger when someone mentions "the database",
  "Neon", "community data", or wants to pull numbers on members, content, or cancellations.
---

# ACQ Vantage Community Database Skill

## Connection

```
postgresql://readonly_agent:f09nVfjksD7zPXuYfjW32Kx6EbrK87p@ep-jolly-wave-akvyz22m-pooler.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require
```

Read-only — INSERT, UPDATE, DELETE will be rejected. Always use parameterized queries.

---

## Mental Model: Raw Tables vs. Cohort Table

**Raw tables** (`skool_members`, `skool_cancellations`) are event-accurate — they
reflect what Skool's API returns at a point in time. A member who cancelled and
rejoined will appear in both.

**Cohort table** (`unified_skool_cohort`) is identity-accurate — one row per member ×
email combination, one `member_status` per member (active wins), all known emails
expanded. This is the single source of truth for cross-system matching.

Always query `unified_skool_cohort` for identity resolution and joins to other systems
(HubSpot, AI usage, deals, meetings). Use the raw tables only when you need lifecycle
history or direct member profile data.

---

## Schema

### `skool_members` — Active members (true mirror of Skool's current state)

Rebuilt via TRUNCATE + INSERT on every hourly scraper run (workflow `dMGH3qqkdp5HvW5E`).
Whoever is absent from the latest run is no longer active — there are no fossil rows.
Internal employees, test accounts, and staff are excluded via a hardcoded exclude list
in the scraper (~128 emails). This table is always clean; no further filtering needed.

| Column | Type | Notes |
|---|---|---|
| `user_id` | TEXT PK | Skool user ID |
| `email` | TEXT | Login email — canonical identity |
| `billing_email` | TEXT | Billing email from Skool (`memberMeta.mbme`) — null for active members (Skool's active API doesn't return this field) |
| `invite_email` | TEXT | Invite email — almost always equals login email, near-zero divergence |
| `full_name` | TEXT | Display name |
| `tier` | TEXT | `Standard`, `Premium`, `VIP`, `VIP Yearly` |
| `bio` | TEXT | Profile bio |
| `points` | INTEGER | Gamification points |
| `level` | INTEGER | Level derived from points |
| `ltv` | DOUBLE PRECISION | Lifetime value in **dollars** |
| `join_date` | TIMESTAMPTZ | When they joined |
| `onboarding_answers` | JSONB | Onboarding survey responses |
| `skool_profile` | TEXT | Profile URL |
| `location` | TEXT | Member's stated location |
| `stripe_sub_id` | TEXT | Stripe subscription ID |
| `billing_currency` | TEXT | Currency code |
| `billing_amount_cents` | INTEGER | Monthly billing in cents |
| `billing_interval` | TEXT | `month` or `year` |
| `attribution` | TEXT | How they found ACQ Vantage |
| `attribution_source` | TEXT | Source detail |
| `created_at` | TIMESTAMPTZ | Row creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

### `skool_cancellations` — Cancelled/churned members (append log, post-March 2026)

Upsert-only — never truncated. Captures post-March 2026 cancellations only; pre-March
history is a known gap (accepted ceiling — community launched at scale in March 2026).
Members who cancel and rejoin appear here AND in `skool_members`; the cohort table
resolves that conflict by prioritizing active.

| Column | Type | Notes |
|---|---|---|
| `skool_user_id` | TEXT PK | Skool user ID |
| `email` | TEXT | Login email — canonical |
| `billing_email` | TEXT | Billing email (populated here, unlike active members) |
| `invite_email` | TEXT | Invite email |
| `first_name` | TEXT | |
| `last_name` | TEXT | |
| `skool_profile` | TEXT | Profile URL |
| `bio` | TEXT | Bio at time of cancellation |
| `role` | TEXT | Role in community |
| `approved_at` | TIMESTAMPTZ | When approved into community |
| `churned_at` | TIMESTAMPTZ | When Skool marked them churned |
| `billing_canceled_at` | TIMESTAMPTZ | When billing subscription ended |
| `cancelled_at` | TIMESTAMPTZ | **Canonical cancellation date — always use this** |
| `last_offline` | TIMESTAMPTZ | Last seen offline |
| `stripe_sub_id` | TEXT | Stripe subscription ID |
| `billing_currency` | TEXT | |
| `billing_amount_cents` | INTEGER | Monthly billing in cents |
| `billing_interval` | TEXT | `month` or `year` |
| `billing_tier` | TEXT | Tier at time of cancellation |
| `lifetime_value_cents` | BIGINT | Total revenue in **cents** — divide by 100 for dollars |
| `cancellation_type` | TEXT | `churned` or `cancelling` |
| `attribution` | TEXT | |
| `attribution_source` | TEXT | |
| `points` | INTEGER | Points at cancellation |
| `level` | INTEGER | Level at cancellation |
| `survey_q1`–`survey_q3` | TEXT | Cancellation survey questions |
| `survey_a1`–`survey_a3` | TEXT | Cancellation survey answers |

### `unified_skool_cohort` — Identity-resolved member table (use this for joins)

One row per **(skool_user_id × email)**. A member with 3 known emails has 3 rows.
Rebuilt hourly via TRUNCATE + INSERT (workflow `nTWap7mGmwPGdkKz`).

It exists because Skool members and HubSpot contacts use different email addresses
~25% of the time. Naive join on `skool_members.email = contact_emails.email` missed
~30% of members. This table resolves every member to all their emails, achieving ~95%
match rate on post-Feb 2026 cohort (up from ~70%).

**Dedup rule:** if a `skool_user_id` exists in both `skool_members` and
`skool_cancellations` (rejoin case), `active` wins.

**CRITICAL: Always `COUNT(DISTINCT skool_user_id)`, never `COUNT(*)`.**
Current counts as of April 2026: ~1,047 distinct members, ~1,689 total rows.

| Column | Type | Notes |
|---|---|---|
| `skool_user_id` | TEXT | Same as `skool_members.user_id` / `skool_cancellations.skool_user_id` |
| `email` | TEXT | Lowercased, trimmed |
| `email_source` | TEXT | `skool_login` \| `skool_billing` \| `skool_invite` \| `hubspot` |
| `member_status` | TEXT | `active` or `cancelled` |
| `full_name` | TEXT | |
| `tier` | TEXT | From active tier or cancellation billing_tier |
| `join_date` | TIMESTAMPTZ | `join_date` for active, `approved_at` for cancelled |
| `created_at` | TIMESTAMPTZ | Row build time |

**email_source hierarchy** (earlier = higher priority):

1. **`skool_login`** — Skool login email. Canonical. Always present.
2. **`skool_billing`** — From `memberMeta.mbme`. Populated on cancellations only (~18%
   of cancellations, 0% of active members — Skool's active API doesn't return this).
3. **`skool_invite`** — From `member.inviteEmail`. Almost always equals login email
   (0 of 206 observed cases differed). Effectively decoration.
4. **`hubspot`** — Any email on the matched HubSpot contact. Covers work/personal splits,
   aliases, defunct addresses. ~40% of members have at least one HubSpot-only email.

When joining to another system by email, all four sources are valid bridge points —
don't filter by source.

### `skool_posts` — Community posts

| Column | Type | Notes |
|---|---|---|
| `post_id` | TEXT PK | |
| `title` | TEXT | |
| `content` | TEXT | |
| `category` | TEXT | Skool channel |
| `upvotes` | INTEGER | |
| `comments_count` | INTEGER | |
| `author_id` | TEXT | Skool user ID — **no FK constraint** (intentionally dropped, see below) |
| `created_at` | TIMESTAMPTZ | |
| `semantic_topic` | TEXT | AI-classified topic |
| `semantic_role` | TEXT | AI-classified intent |
| `classified_at` | TIMESTAMPTZ | |

### `skool_comments` — Comments on posts

| Column | Type | Notes |
|---|---|---|
| `comment_id` | TEXT PK | |
| `post_id` | TEXT | Parent post |
| `parent_comment_id` | TEXT | Parent comment if nested reply (nullable) |
| `content` | TEXT | |
| `upvotes` | INTEGER | |
| `author_id` | TEXT | Skool user ID — **no FK constraint** (intentionally dropped, see below) |
| `created_at` | TIMESTAMPTZ | |
| `semantic_topic` | TEXT | |
| `semantic_role` | TEXT | |
| `classified_at` | TIMESTAMPTZ | |

---

## Why FK Constraints Were Dropped

`skool_posts.author_id`, `skool_comments.author_id`, and
`skool_course_progress.user_id` previously had FK constraints pointing to
`skool_members.user_id`. They were dropped intentionally to allow the TRUNCATE-based
active member refresh. Posts and comments are historical event logs — their attribution
should not be coupled to whether someone is currently active.

To resolve author details for a churned member, join `author_id` to
`skool_cancellations.skool_user_id`. **Never re-add these FK constraints.**

---

## The Double-Counting Trap

`unified_skool_cohort` has multiple rows per member. A member with a login email,
a billing email, and 2 HubSpot alt emails is 4 rows. This creates silent errors.

```sql
-- WRONG: inflates member count by ~1.6×
SELECT member_status, COUNT(*) FROM unified_skool_cohort GROUP BY member_status;

-- WRONG: sums the same member's MRR multiple times
SELECT SUM(d.mrr)
FROM unified_skool_cohort u
JOIN deals d ON d.contact_email = u.email;

-- WRONG: join with HubSpot creates compound fan-out
SELECT COUNT(*) FROM unified_skool_cohort u
JOIN hubspot_contacts h ON h.email = u.email;
```

**Right pattern — dedup on `skool_user_id` first:**

```sql
-- Member counts
SELECT member_status, COUNT(DISTINCT skool_user_id)
FROM unified_skool_cohort
GROUP BY member_status;

-- Per-member aggregation
WITH members AS (
  SELECT DISTINCT ON (u.skool_user_id) u.skool_user_id, d.mrr
  FROM unified_skool_cohort u
  JOIN deals d ON d.contact_email = u.email
  ORDER BY u.skool_user_id, d.close_date DESC
)
SELECT SUM(mrr) FROM members;
```

Rule: **any aggregation must either `COUNT(DISTINCT skool_user_id)` or go through a
CTE that collapses to one row per member first.**

---

## When to Use This Table vs. Raw Tables

| Use case | Use `unified_skool_cohort`? |
|---|---|
| Any member↔other-system join by email (AI usage, deals, meetings, HubSpot) | **Yes** |
| Match rate against external tables | **Yes** |
| Counting members in a cohort | **Yes — with `COUNT(DISTINCT skool_user_id)`** |
| Filtering cohort by tier, status, join window | **Yes** |
| Direct member profile lookup (one member, full detail) | No — query `skool_members` / `skool_cancellations` directly |
| Raw Skool activity (posts, comments, points) | No — join `skool_posts` / `skool_comments` by `author_id`, then optionally join this table for email resolution |
| Per-member MRR / deal value | Use this table to find contact_ids, then aggregate on contact_id in deals — not on cohort rows directly |

---

## Common Queries

### Active member count
```sql
-- skool_members is already clean (excludes applied at scrape time)
SELECT COUNT(*) FROM skool_members;
```

### Active members by tier
```sql
SELECT tier, COUNT(*) AS members
FROM skool_members
GROUP BY tier ORDER BY members DESC;
```

### Unique members ever (active + cancelled)
```sql
SELECT COUNT(DISTINCT skool_user_id) FROM unified_skool_cohort;
```

### Unique members by status
```sql
SELECT member_status, COUNT(DISTINCT skool_user_id) AS members
FROM unified_skool_cohort
GROUP BY member_status;
```

### Cancellations this month
```sql
SELECT COUNT(*) FROM skool_cancellations
WHERE cancelled_at >= date_trunc('month', NOW());
```

### Churn rate (monthly approximation)
```sql
SELECT
  (SELECT COUNT(*) FROM skool_cancellations
   WHERE cancelled_at >= '2026-03-01' AND cancelled_at < '2026-04-01') AS churned,
  (SELECT COUNT(*) FROM skool_members) +
  (SELECT COUNT(*) FROM skool_cancellations
   WHERE cancelled_at >= '2026-03-01') AS approx_start_count;
```

### Post author resolution (handles churned members correctly)
```sql
SELECT
  p.title,
  p.created_at,
  COALESCE(sm.full_name, sc.first_name || ' ' || sc.last_name) AS author_name,
  COALESCE(sm.email, sc.email) AS author_email,
  CASE WHEN sm.user_id IS NOT NULL THEN 'active' ELSE 'cancelled' END AS author_status
FROM skool_posts p
LEFT JOIN skool_members sm ON sm.user_id = p.author_id
LEFT JOIN skool_cancellations sc ON sc.skool_user_id = p.author_id
ORDER BY p.created_at DESC
LIMIT 20;
```

### AI activation (live from acq_ai_messages)

This is the canonical "was this member activated on AI in their first 7 days?" query. **Do not use `acq_ai_usage.active_days_week1`** — that pre-computed field is anchored to each email's first-ever-message clock (not the Skool join date) and was retired.

```sql
WITH member_join AS (
  -- one canonical row per member with their join timestamp
  SELECT DISTINCT ON (skool_user_id)
    skool_user_id,
    join_date
  FROM unified_skool_cohort
  WHERE email_source = 'skool_login'
)
SELECT
  mj.skool_user_id,
  COUNT(DISTINCT DATE(aim.created_at))         AS ai_active_days_week1,
  (COUNT(DISTINCT DATE(aim.created_at)) >= 2)  AS ai_activated
FROM member_join mj
LEFT JOIN unified_skool_cohort u              -- join back to ALL of this member's emails
       ON u.skool_user_id = mj.skool_user_id
LEFT JOIN acq_ai_messages aim
       ON LOWER(TRIM(aim.email)) = u.email
      AND aim.created_at >= mj.join_date
      AND aim.created_at <  mj.join_date + INTERVAL '7 days'
GROUP BY mj.skool_user_id;
```

Why `COUNT(DISTINCT DATE(...))`: `unified_skool_cohort` has multiple rows per member (one per known email) by design. The join fans out if the member messaged from more than one email on the same day — `COUNT(DISTINCT DATE(...))` keeps the count honest. Never `COUNT(*)` here.

Match rate: ~68% of post-March 2026 Skool members resolve to at least one AI message via this bridge. The extra coverage over the retired `acq_ai_usage` path (~63%) comes from HubSpot-aliased and billing emails.

### Cross-system lookup by email
```sql
-- Find all rows for a member given any one of their emails
SELECT DISTINCT skool_user_id, email, email_source, member_status, full_name
FROM unified_skool_cohort
WHERE email = 'some.email@example.com';
-- Use the returned skool_user_id to get all their other emails
```

### Top posters (active members only)
```sql
SELECT m.full_name, m.tier, COUNT(p.post_id) AS post_count
FROM skool_members m
JOIN skool_posts p ON p.author_id = m.user_id
GROUP BY m.user_id, m.full_name, m.tier
ORDER BY post_count DESC
LIMIT 20;
```

### Engagement by topic
```sql
SELECT semantic_topic, COUNT(*) AS posts,
       SUM(upvotes) AS total_upvotes,
       SUM(comments_count) AS total_comments
FROM skool_posts
WHERE semantic_topic IS NOT NULL
GROUP BY semantic_topic
ORDER BY posts DESC;
```

### Members by cohort month
```sql
SELECT date_trunc('month', join_date) AS cohort, COUNT(*) AS members
FROM skool_members
GROUP BY cohort ORDER BY cohort DESC;
```

### Cancellation reasons breakdown
```sql
SELECT survey_a1 AS reason, COUNT(*) AS count
FROM skool_cancellations
WHERE survey_a1 IS NOT NULL
GROUP BY survey_a1 ORDER BY count DESC;
```

---

## Gotchas

1. **`unified_skool_cohort` has multiple rows per member.** Always
   `COUNT(DISTINCT skool_user_id)`. A plain `COUNT(*)` inflates by ~1.6×.

2. **Cancellation date — use `cancelled_at`.** Not `churned_at` or
   `billing_canceled_at`. Those can differ by days from actual processing date.

3. **LTV units differ by table.** `skool_members.ltv` is in **dollars**.
   `skool_cancellations.lifetime_value_cents` is in **cents**. Divide by 100 to compare.

4. **Tier labels differ by table.** `skool_members.tier` uses `Standard`, `Premium`,
   `VIP`, `VIP Yearly`. `skool_cancellations.billing_tier` may vary. Normalize before
   cross-table comparison.

5. **Pre-March 2026 churn is invisible.** `skool_cancellations` only covers post-March
   2026. Don't treat the cancelled count as complete historical churn.

6. **`billing_email` and `invite_email` are null for active members.** Skool's active
   API doesn't return those fields. Only `skool_login` and `hubspot` sources appear
   for active members in `unified_skool_cohort`.

7. **FK constraints are intentionally absent** on `author_id` in posts/comments and
   `user_id` in course_progress. Missing joins are not data errors — the member may
   be in `skool_cancellations` instead. Never re-add these constraints.

8. **AI classification coverage.** `semantic_topic` and `semantic_role` on posts/comments
   may be NULL for unclassified content. Use `WHERE semantic_topic IS NOT NULL` or
   `COALESCE(semantic_topic, 'Unclassified')`.

9. **Timestamps are UTC.** Convert to `America/Los_Angeles` for display if needed.

10. **`unified_skool_cohort` has a brief empty window during refresh.** The hourly
    TRUNCATE + INSERT takes seconds but queries mid-run will see zero rows. Avoid
    running heavy analytics reads at exactly :00 of the hour.

---

## Known Limitations

- **Exclude list is hardcoded in scraper workflow `dMGH3qqkdp5HvW5E`.** Editing
  `exclude.csv` does not propagate automatically — the workflow must be re-deployed
  via n8n API after any exclude list change.
- **~5% irreducible match gap on post-Feb 2026 cohort.** Members who were never
  created in HubSpot as contacts. Gap is larger (~24%) on all-time cohort due to
  historical members predating HubSpot sync.
- **Pre-March 2026 churn history is absent.** Known and accepted — community launched
  at scale in March 2026.
- **`skool_members.user_id` vs `skool_cancellations.skool_user_id`** — same concept,
  different column names. Join on those or match by email.

---

## Related

- Active members scraper workflow: `dMGH3qqkdp5HvW5E`
- Cancellations scraper workflow: `Q7PlBf2aRHTxlFOO`
- Unified cohort rebuild workflow: `nTWap7mGmwPGdkKz`
- Upstream tables: `skool_members`, `skool_cancellations`, `contact_emails`
- Retention methodology & metric definitions: `acq-vantage-retention` skill
- Activation dashboard page & chatbot scope (`/agents/activation`): `activation-dashboard` skill