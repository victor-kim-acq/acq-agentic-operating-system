---
name: acq-vantage-retention
description: Framework for ACQ Vantage member retention and activation analysis. Use this skill whenever someone asks about churn, retention, activation signals, onboarding effectiveness, billing source performance, community engagement metrics, or member lifecycle. Also trigger when asked to build, update, or explain a retention/activation report or artifact, verify retention math, explain metric definitions, or investigate churn anomalies. This skill defines how Victor and the team reason about retention — always use it before answering any question involving churn rates, activation rates, or cohort analysis, even if the question seems simple.
---

## Exact Metric Definitions — Quote These Verbatim

**AI Activation:** Member used ACQ AI on 2 or more distinct days within their first 7 days of joining. Source: acq_ai_usage.active_days_week1 >= 2.

**Community Engagement:** Member made 3 or more posts or comments within their first 15 days of joining. Source: skool_posts + skool_comments, created_at BETWEEN joined_at AND joined_at + 15 days.

**Churn Rate:** Cancelled members in segment ÷ total members in segment × 100. Cancellations after lockedDate do not count.

**Onboarding Completed:** Member has at least one engagement_meeting with outcome = 'COMPLETED' and title ILIKE '%onboard%', linked via engagement_meeting_contacts → contact_emails.

---

# ACQ Vantage Retention Analysis Framework

This skill captures how ACQ Vantage reasons about member retention, activation, and churn. It is the authoritative source for metric definitions, signal logic, cohort methodology, and analytical standards. Read this fully before answering any retention question or building any retention artifact.

---

## Core Philosophy

**Five signals predict retention.** In order of measurability and volume:
1. ACQ AI activation (2+ active days in week 1)
2. Community engagement (3+ posts or comments in first 15 days)
3. Membership tier (Premium > VIP > Standard)
4. Onboarding call completion (strongest rescue lever — 11.1% churn for completers vs 32.3% never booked)
5. Verified revenue (strong for ACE/Recharge, irrelevant for Skool-native)

**Billing source is the most important segmentation lens.** Skool-native members behave fundamentally differently from ACE/Recharge members. Signals 1 and 2 are strong predictors for ACE/Recharge and essentially useless for Skool-native. Never report activation or engagement churn rates in aggregate without breaking them out by billing source — the aggregate number masks a completely different story underneath.

**The rescue signals.** Onboarding call completion and verified revenue are secondary levers. Completion drops churn to 11.1% vs 32.3% for never-booked. For CS outreach prioritization, the real target list is: not activated AND never booked the onboarding call — that population churns at the highest rate across all segments. Verified revenue is a strong signal for ACE/Recharge (0% churn when verified) but irrelevant for Skool-native.

---

## Metric Definitions

### AI Activation
- **Definition:** Member used ACQ AI on 2 or more distinct days within their first 7 days of joining
- **Source:** `acq_ai_usage` table, `active_days_week1` column
- **Matching:** Bidirectional email↔contact_id via `contact_emails` (members often use different emails across systems)
- **Key insight:** Activation rates are roughly equal across Skool (70%), ACE (71%), and Recharge (67%) — the *difference* isn't in who activates, it's in whether activation *predicts churn*. For Skool it doesn't. For ACE/Recharge the gap is 14-19pp.

### Community Engagement
- **Definition:** Member made 3 or more posts or comments within their first 15 days of joining
- **Source:** `skool_posts` + `skool_comments` tables, filtered by `created_at BETWEEN joined_at AND joined_at + INTERVAL '15 days'`
- **Key insight:** Only ~12% of members hit this threshold. For Skool-native, engagement doesn't predict churn (23.1% engaged vs 21.3% not — noise). For ACE/Recharge, engaged members churn at 0% — but these are small samples (n=5, n=10) and shouldn't be over-indexed until more cohorts confirm.

### Combined Activation (Both Signals)
- **Definition:** Member hit BOTH 2+ AI days in week 1 AND 3+ posts/comments in 15 days
- **Community only:** Hit community signal but NOT AI signal — this bucket is 0 for Skool-native (the 32 Skool members who didn't activate AI also didn't post enough to qualify; we know this because if any had, they'd appear in this bucket)

### Membership Tier
- **Values:** Standard, VIP, Premium, VIP (Yearly)
- **Source:** `contacts.membership_tier` via `contact_emails` join
- **Key watch:** Non-activated VIPs churn worse than Standard members overall (~27%). VIPs who neither activated nor engaged are the highest-value at-risk segment.
- **Note:** ~15-18 members per cohort typically have no tier assignment — report as "missing" not zero.

### Billing Source
- **Values:** Skool, ACE, Recharge, Unknown
- **Source:** Most recent deal's `billing_source` via `contact_deal` → `deals` join, ordered by `close_date DESC`
- **Key behavioral differences:**
  - **Skool-native:** Signals don't predict churn. Baseline churn ~21-24% regardless of activation, engagement, or tier. Needs a separate playbook — likely pricing, onboarding friction, or expectation mismatch.
  - **ACE/Recharge:** Signals work strongly. Non-activated churn at 25-28%, activated at 8-14%.
  - **Unknown:** Consistently high churn (~37-46%). Worth tracking separately.

### Verified Revenue
- **Definition:** `contacts.revenue_verification_status = 'Verification Successful'`
- **Key insight:** Strong predictor for ACE/Recharge (0% churn when verified) but irrelevant for Skool-native (23.5% vs 23.9% — no difference). Same Skool/ACE split as all other signals.

### Onboarding Call

Three distinct states (not a single boolean):
- **onboarding_completed:** at least one `engagement_meeting` with `meeting_outcome = 'COMPLETED'` and `meeting_title ILIKE '%onboard%'`, linked via `engagement_meeting_contacts` → `contact_emails` (bidirectional email↔contact_id match)
- **onboarding_no_show:** booked (any outcome) but never completed
- **onboarding_never_booked:** no meeting record at all

**Key insight:** Completion matters more than booking. March 2026 gradient: completed 11.1% → no_show 18.5% → never_booked 32.3%. Skool never-booked is a crisis (50% churn, n=20). ACE/Recharge completion = 0% churn.

---

## Cohort Methodology

### Denominator — fixed by start/end date, lockedDate does NOT gate it

The denominator is built from a UNION of two sources:
- `skool_members` rows where `join_date` is in the cohort window
- `skool_cancellations` rows where `approved_at` is in the cohort window

Deduplicated via `DISTINCT ON (LOWER(email)) ORDER BY joined_at ASC` — one row per email, picking the earliest date across both sources. This captures fast-churners who cancelled before the active scraper ran and never landed in `skool_members` at all. Without the union, those members disappear from the denominator entirely and churn is understated.

### Status — lockedDate gates this only

For each cohort member, `status = 'cancelled'` if an `EXISTS` check finds any `skool_cancellations` row for that email with `cancelled_at < lockedDate + 1 day`. No match → `'active'`.

**Key property — reproducibility:** `total_members` is fixed by `start`/`end` date only and never changes when `lockedDate` changes. `lockedDate` moves members between `active` and `cancelled` only. The same `(startDate, endDate, lockedDate)` triple always returns the same numbers regardless of when you query — snapshots are reproducible. Ingestion-pipeline timing no longer affects the result.

### Exclusions and edge cases
- Exclude list: load from `exclude.csv`, normalize to lowercase and trim whitespace on both JS and SQL sides — mismatches cause cohort drift (learned the hard way)
- VIP (Yearly) members can be included or excluded depending on analysis purpose — document which in every report header

### Churn Rate Calculation
- Churn % = churned members in segment / total members in segment × 100
- Always show raw counts (churned/total) alongside percentages — this lets readers verify the math instantly and surfaces thin-sample cells
- Flag any cell where n < 5 as "directional only"

---

## Analytical Standards

### Math Verification (Required in Every Report)
Before publishing any breakdown table, verify:
1. **Row totals sum to cohort total:** e.g., Skool + ACE + Recharge + Unknown = total members
2. **Sub-segment totals sum to parent:** e.g., verified + not verified per source = source total
3. **Churn counts are consistent:** churned/total should equal the reported churn_pct ± 0.5%

If numbers don't reconcile, find the gap before reporting. Common causes: different cohort snapshots, Unknown source members excluded from a breakdown but included in the total, yearly members handled inconsistently.

### Anomaly Callouts (Required in Every Report)
When a number is surprising or seems to contradict the narrative, **call it out explicitly in the artifact** — don't leave it unexplained. This builds trust by showing the analysis was reviewed, not just generated.

Examples of things to surface:
- Skool ai_and_community churning at 23.1% (same as "neither") — signals don't work for Skool regardless of combination
- Community only = 0 for Skool — the 32 non-activated Skool members also didn't post enough to qualify; we know this because if any had, they'd appear in this bucket
- Recharge-Standard churning at 33.3% on small n (n=9) — directional only, don't over-index
- Verified Skool members churning at 23.5% vs 23.9% not verified — zero difference, consistent with broader Skool pattern
- Skool never-booked onboarding = 50% churn (n=20) — highest-risk identifiable segment
- ACE/Recharge onboarding completed = 0% churn — strong signal but small n, directional until more cohorts confirm

### Small Sample Handling
- n < 5: show the cell but label "directional only" in the footnote
- n < 3: consider showing "—" rather than a number that will mislead
- Never suppress a surprising result just because n is small — surface it with appropriate caveats

---

## Report Structure

Every retention report should follow this structure:

1. **Header:** Cohort definition (date range, n=total, query date, any exclusions)
2. **TL;DR callout:** The 1-2 sentence takeaway — what's the single most actionable finding?
3. **Headline metrics:** New members, churned, churn rate, AI activation rate, community engagement rate
4. **The signals:** Each signal as its own section with overall chart + billing source breakdown
5. **Combined retention:** How signals interact, full matrix (segment × tier + segment × billing source)
6. **Rescue signals:** Onboarding call, verified revenue — secondary levers for CS prioritization
7. **Daily KPIs:** Each KPI tagged to the signal it tracks, showing raw current number + goal
8. **Methodology footnote:** Query date, cohort size, exclusions, any data caveats

---

## Reference Files

- `references/march-2026-baseline.md` — March 2026 cohort (n=208 unique members, union-based denominator, lockedDate 2026-04-16). Churn rate is now `lockedDate`-dependent — at lockedDate 2026-04-16: 43 churned, 20.7%. Prior session references to n=208 / 22.6% / 47 churned used an older query version (pre-union denominator, lockedDate not yet implemented). Use as the reference cohort for all future comparisons. Read this when answering questions about specific numbers from the March analysis.

---

## Agent Scope (for retention chat agent)

This agent answers questions about:
- Any metric, number, or chart in the retention artifact
- Metric definitions and how they're measured
- Why a number looks the way it does (anomaly explanation)
- Which members are in a specific segment (member-level drill-down via DB)
- How to interpret a signal or compare cohorts

This agent does not answer questions about:
- Overall revenue, MRR, or deal metrics → direct to the Dashboard page
- Marketing attribution or UTM performance → direct to the Dashboard page
- Billing or subscription management → direct to Caio or the ops team

When redirecting, name the destination specifically. Don't just say "I can't answer that."
