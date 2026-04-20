# March 2026 Baseline Cohort

> **Corrected April 20, 2026** — prior counts of 224/227/232 reflected pipeline drift and cross-table duplicates. **208** is the true unique March cohort as of the dedup fix in commit `c132de0`. Per-signal breakdown numbers below this header are stale and need to be re-pulled from the corrected API in a new session.

**Query date:** April 20, 2026  
**Cohort:** Members whose `join_date` (active) or `approved_at` (cancelled) falls in 2026-03-01 to 2026-03-31  
**n=208 unique | 47 churned | 22.6% churn rate**  
**Exclusions:** 127-row exclude.csv (internal/test accounts), normalized to lowercase. Plus dedup against `skool_cancellations` and `DISTINCT ON email` within `skool_members` — see SKILL.md "Source-table dedup" section.

---

## Headline Metrics

| Metric | Value |
|---|---|
| New members | 208 |
| Churned | 47 |
| Churn rate | 22.6% |
| ACQ AI adoption (any use) | 80% (stale — re-pull) |
| AI activated (2+ days week 1) | 65.6% (n=149) (stale — re-pull) |
| Community engaged (3+ posts/comments 15d) | 12.3% (n=28) (stale — re-pull) |
| Verified revenue | 17.6% (n=40) (stale — re-pull) |

---

## Signal 1 — AI Activation

| Segment | n | Churned | Churn % |
|---|---|---|---|
| Activated | 149 | ~22 | 14.8% |
| Not activated | 78 | ~20 | 25.6% |

### By billing source × activation

| Source | Overall | AI activated | Not activated |
|---|---|---|---|
| Skool (n=107) | 18.4% (19/103) | 18.4% (14/76) | 18.5% (5/27) |
| ACE/Recharge (n=121) | 16.5% (20/121) | 8.5% (6/71) | 28.0% (14/50) |

### AI activation rate by source

| Source | Activated | Not activated | Rate |
|---|---|---|---|
| Skool (n=107) | 75 (70%) | 32 (30%) | 70.1% |
| ACE (n=62) | 44 (71%) | 18 (29%) | 71.0% |
| Recharge (n=42) | 28 (67%) | 14 (33%) | 66.7% |

**Key anomaly to call out:** Activation rates are nearly identical across sources (~67-71%). The difference isn't who activates — it's whether activation predicts churn. For Skool it doesn't (0.1pp gap). For ACE/Recharge it's a 19.5pp gap.

---

## Signal 2 — Community Engagement

| Segment | n | Churned | Churn % |
|---|---|---|---|
| Engaged | 28 | 3 | 10.7% |
| Not engaged | 199 | 39 | 19.6% |

### By billing source × engagement

| Source | Engaged | Not engaged |
|---|---|---|
| Skool (n=107) | 23.1% (3/13) | 21.3% (20/94) |
| ACE (n=62) | 0.0% (0/5) | 12.3% (7/57) |
| Recharge (n=42) | 0.0% (0/10) | 18.2% (6/33) |

**Key anomaly:** Skool engaged vs not engaged is noise (23.1% vs 21.3%). ACE/Recharge engaged = 0% but n=5 and n=10 — directional only, needs more cohorts to confirm.

**Community only = 0 for Skool:** The 32 Skool members who didn't activate AI also didn't post 3+ times in 15 days. We know this definitively because if any had, they'd appear in the community_only bucket. They don't.

---

## Signal 3 — Tier

| Tier | n | Churn % |
|---|---|---|
| Standard | 142 | 19.0% |
| VIP | 50 | 16.0% |
| Premium | 19 | 5.3% |
| Missing tier | 18 | — |

### By billing source × tier

| Tier | Skool | ACE | Recharge |
|---|---|---|---|
| Standard | 24.3% (17/70) | 11.5% (7/61) | 33.3% (3/9)† |
| VIP | 21.7% (5/23) | — (no VIP) | 11.1% (3/27) |
| Premium | 7.1% (1/14) | 0.0% (0/1)† | 0.0% (0/4)† |

† Directional only, n<5

**Key anomaly:** Recharge-Standard churns at 33.3% — but n=9. Don't over-index. Also: non-activated VIPs churn at 27.3% — worse than Standard overall, making them the highest-value at-risk segment by tier.

---

## Combined Retention

### Signal segments overall

| Segment | n | Churn % |
|---|---|---|
| AI + community | 22 | 13.6% |
| AI only | 127 | 15.0% |
| Community only | 6 | 0.0%† |
| Neither | 72 | 27.8% |

### By billing source × segment

| Segment | Skool | ACE | Recharge |
|---|---|---|---|
| AI + community | 23.1% (3/13) | 0.0% (0/3)† | 0.0% (0/6)† |
| AI only | 19.4% (12/62) | 9.8% (4/41) | 13.6% (3/22) |
| Community only | — (0 members) | 0.0% (0/2)† | 0.0% (0/3)† |
| Neither | 25.0% (8/32) | 18.8% (3/16) | 27.3% (3/11) |

**Key anomaly:** Skool ai_and_community churns at 23.1% — same as "neither" (25%). Both signals together don't help Skool-native members. This is consistent with Signal 1 and Signal 2 findings — Skool churn is driven by something the current signal framework doesn't capture.

### Full matrix — segment × tier (original Metabase pull)

| Segment | Standard | VIP | Premium |
|---|---|---|---|
| AI + community | 12.5% | 7.1% | 0.0% |
| AI only | 17.2% | 11.1% | 0.0% |
| Community only | — | — | — |
| Neither | 20.9% | 27.3% | 16.7% |
| Baseline | 17.6% | 13.3% | 6.3% |

---

## Rescue Signal — Onboarding Call

Data from HubSpot engagement meetings (any meeting with "onboard" in title).

| Segment | Booked | Did not book |
|---|---|---|
| AI activated (n=147) | 13.9% | 15.6% |
| Not AI activated (n=78) | 12.5% | 39.5% |
| Both signals (n=32) | 12.5% | 12.5% |
| Neither signal (n=72) | 13.5% | 42.9% |

**Key insight:** The call nearly eliminates churn for non-activated members (12.5% vs 39.5%). For activated members, the call makes almost no difference. CS priority list = not activated AND didn't book the call (~38 members/month at ~40% churn risk).

---

## Verified Revenue

| Segment | n | Churn % |
|---|---|---|
| Verified | 40 | 5.4% |
| Not verified | 187 | 20.7% |

### By billing source

| Source | Verified | Not verified |
|---|---|---|
| ACE (n=62) | 0.0% (0/17) | 15.6% (7/45) |
| Recharge (n=43) | 0.0% (0/6)† | 16.2% (6/37) |
| Skool (n=109) | 23.5% (4/17) | 23.9% (22/92) |
| Unknown (n=13) | — | 46.2% (6/13) |

Math check: 17+6+17+0=40 verified ✓ | 45+37+92+13=187 not verified ✓

**Key anomaly:** Verification is a strong signal for ACE/Recharge (0% churn) but completely irrelevant for Skool (23.5% vs 23.9%). Consistent with every other signal. Whether verification causes retention or engaged members are more likely to verify is unknown — treat as CS prioritization tag, not causal lever.

---

## Skool Playbook Gap

Every signal in this analysis shows the same pattern: works for ACE/Recharge, doesn't work for Skool. Skool baseline churn is 21-24% regardless of activation, engagement, tier, or verified revenue. This suggests the driver is something not captured by these signals — likely one or more of: price sensitivity, onboarding friction, expectation mismatch at acquisition, or product-market fit gap for the Skool acquisition channel. This needs a dedicated investigation using qualitative data (cancellation survey responses, onboarding call notes) rather than behavioral metrics.

---

## Math Verification Checklist

When building or reviewing any retention report:
- [ ] Billing source breakdown sums to cohort total (or explain the gap — usually Unknown source)
- [ ] Verified + not verified per source sums to source total
- [ ] Churn counts are consistent with churn_pct ± 0.5%
- [ ] Cells with n<5 are flagged as directional only
- [ ] Any surprising number has an explicit callout explaining it
- [ ] Report header states cohort size, query date, and exclusion logic
