---
name: acq-vantage-retention
description: Framework for ACQ Vantage member retention and activation analysis. Use this skill whenever someone asks about churn, retention, activation signals, onboarding effectiveness, billing source performance, community engagement metrics, or member lifecycle. Also trigger when asked to build, update, or explain a retention/activation report or artifact, verify retention math, explain metric definitions, or investigate churn anomalies. This skill defines how Victor and the team reason about retention — always use it before answering any question involving churn rates, activation rates, or cohort analysis, even if the question seems simple.
---

# ACQ Vantage Retention Analysis Framework

This skill captures how ACQ Vantage reasons about member retention, activation, and churn. It is the authoritative source for metric definitions, signal logic, cohort methodology, and analytical standards. Read this fully before answering any retention question or building any retention artifact.

---

## Core Philosophy

**Three signals predict retention.** In order of measurability and volume:
1. ACQ AI activation (2+ active days in week 1)
2. Community engagement (3+ posts or comments in first 15 days)
3. Membership tier (Premium > VIP > Standard)

**Billing source is the most important segmentation lens.** Skool-native members behave fundamentally differently from ACE/Recharge members. Signals 1 and 2 are strong predictors for ACE/Recharge and essentially useless for Skool-native. Never report activation or engagement churn rates in aggregate without breaking them out by billing source — the aggregate number masks a completely different story underneath.

**The rescue signal.** Onboarding call completion is a secondary lever — it can rescue non-activated members from ~40% churn down to ~12.5%. For CS outreach prioritization, the real target list is: not activated AND didn't book the onboarding call.

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
- **Definition:** Any `engagement_meeting` with "onboard" in the title linked via `engagement_meeting_contacts`
- **Key insight:** Booking the call drops non-activated churn from ~40% → ~12.5%. For activated members, the call makes little difference.

---

## Cohort Methodology

### Building a Cohort
```sql
-- Active members who joined in period
SELECT LOWER(email), join_date AS joined_at, 'active' AS status, user_id
FROM skool_members
WHERE join_date >= '{start}' AND join_date < ('{end}'::date + INTERVAL '1 day')
  AND LOWER(email) NOT IN (SELECT email FROM exclude_list)

UNION ALL

-- Cancelled members whose Skool approval was in the same period
SELECT LOWER(email), approved_at, 'cancelled', skool_user_id
FROM skool_cancellations
WHERE approved_at >= '{start}' AND approved_at < ('{end}'::date + INTERVAL '1 day')
  AND LOWER(email) NOT IN (SELECT email FROM exclude_list)
```

**Critical details:**
- Use `approved_at` (not `cancelled_at` or `churned_at`) for `skool_cancellations` date filter — this anchors the cohort to when the member joined, not when they left
- Exclude list: load from `exclude.csv`, normalize to lowercase and trim whitespace on both JS and SQL sides — a mismatch here causes cohort drift (learned the hard way)
- VIP (Yearly) members can be included or excluded depending on analysis purpose — document which in every report header
- The pipeline continues ingesting for ~48h after month end; run cohort queries on a fixed date and note it in the report

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

### Small Sample Handling
- n < 5: show the cell but label "directional only" in the footnote
- n < 3: consider showing "—" rather than a number that will mislead
- Never suppress a surprising result just because n is small — surface it with appropriate caveats

### Cohort Drift
- The DB ingestion pipeline settles ~48h after month end — early queries will undercount
- Always note the query date and cohort count in the report footer
- If a number has moved since the last report, explain why (pipeline catch-up vs real new data)

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

- `references/march-2026-baseline.md` — March 2026 cohort numbers (n=227, queried April 15 2026). Use as the reference cohort for all future comparisons. Read this when answering questions about specific numbers from the March analysis.

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
