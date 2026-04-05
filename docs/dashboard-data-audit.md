# Dashboard Data Audit
Generated: 2026-04-05T19:16:20.709Z

## Data Overview

### Distinct Column Values

**status:** `Active`, `Cancellation`, `Downgrade`, `Payment Failed`, `Refund`, `Upsell`

**membership_type:** `Business Partner Member`, `Paying Member`, `NULL`

**billing_source:** `ACE`, `Recharge`, `Skool`, `NULL`

**tier:** `Premium`, `Premium + Scale Workshop`, `Standard`, `VIP`, `VIP (Yearly)`, `NULL`

**currency:** `AED`, `AUD`, `BRL`, `CAD`, `COP`, `EUR`, `GBP`, `HKD`, `ILS`, `MAD`, `MXN`, `NZD`, `THB`, `USD`, `NULL`

### Date Ranges

**billing_date (Active Paying):** Sat Feb 21 2026 00:00:00 GMT-0300 (Brasilia Standard Time) to Sun Apr 05 2026 00:00:00 GMT-0300 (Brasilia Standard Time)

**close_date (deals):** Wed Feb 11 2026 05:00:00 GMT-0300 (Brasilia Standard Time) to Sun Apr 05 2026 09:00:00 GMT-0300 (Brasilia Standard Time)

### Bridge Table Coverage

| tbl | cnt |
| --- | --- |
| contact_membership | 1094 |
| contact_deal | 821 |
| deal_membership | 1067 |

### Orphan Records

- **Orphan memberships** (no contact link): 3
- **Orphan deals** (no contact link): 1

## Panel 1: Current Month Collected Revenue

### Query Logic
Sums normalized MRR from the `memberships` table where `status = 'Active'`, `membership_type = 'Paying Member'`, and `billing_date` falls in the current calendar month (LA timezone). Non-USD records use tier-based normalization: Standard=$1,000, VIP=$3,000, VIP (Yearly)=$36,000, Premium=$8,000.

### Filter Funnel
| Step | Filter | Row Count |
| --- | --- | --- |
| 1 | All memberships | 1097 |
| 2 | status = 'Active' | 845 |
| 3 | + membership_type = 'Paying Member' | 821 |
| 4 | + billing_date >= current month | 81 |

### Result
**$200,000**

### Sample Rows (5)
| membership_id | membership_name | status | membership_type | billing_date | mrr | currency | tier |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 50814557529 | Nick Esquivel - Active - 2026/04/01 | Active | Paying Member | 2026-04-01 | 1000 | USD | Standard |
| 50828205935 | Jack Pacella - Standard - 2026/04/01 | Active | Paying Member | 2026-04-01 | 1000 | USD | Standard |
| 50824510632 | Douglas Adams - VIP - 2026/04/01 | Active | Paying Member | 2026-04-01 | 3000 | USD | VIP |
| 50831974070 | Richard Ulloa - Premium - 2026/04/01 | Active | Paying Member | 2026-04-01 | 8000 | USD | Premium |
| 50830587661 | Hanafi Rashid - Standard - 2026/04/01 | Active | Paying Member | 2026-04-01 | 1000 | USD | Standard |

## Panel 2: Annual Run Rate

### Query Logic
Same base as Panel 1 but joins through contact_membership -> contacts (where contacts.membership_type = 'Paying Member'), then multiplies total by 12. This additional join can drop rows if bridge table or contact is missing.

### Filter Funnel
| Step | Filter | Row Count |
| --- | --- | --- |
| 1 | Active Paying + current month (from Panel 1) | 81 |
| 2 | + JOIN contact_membership | 81 |
| 3 | + JOIN contacts (membership_type = 'Paying Member') | 75 |

### Result
**$2,388,000**

## Panel 3: Current Month Churned Revenue

### Query Logic
Same as Panel 1 but filters on `status = 'Cancellation'` instead of `Active`.

### Filter Funnel
| Step | Filter | Row Count |
| --- | --- | --- |
| 1 | status = 'Cancellation' | 100 |
| 2 | + membership_type = 'Paying Member' | 98 |
| 3 | + billing_date >= current month | 19 |

### Result
**$33,000**

### Sample Rows (5)
| membership_id | membership_name | status | membership_type | billing_date | mrr | currency | tier |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 50571725447 | George Elossais - Cancellation - 2026/03/27 | Cancellation | Paying Member | 2027-03-24 | 1000 | USD | Standard |
| 50806130704 |   - Cancellation - 2026/04/01 | Cancellation | Paying Member | 2026-04-01 | 1000 | USD | Standard |
| 50861558300 | Ridhwan Luthra - Cancellation - 2026/04/01 | Cancellation | Paying Member | 2026-04-01 | 8000 | USD | Premium |
| 50917996453 | Quentin Leks - Cancellation - 2026/04/02 | Cancellation | Paying Member | 2026-04-02 | 1000 | USD | Standard |
| 50891883171 | Firat Bayram bakir - Cancellation - 2026/04/02 | Cancellation | Paying Member | 2026-04-02 | 1000 | USD | Standard |

## Panel 4: Revenue by Tier

### Query Logic
Groups Active Paying members (current month) by tier, computing USD MRR, non-USD normalized MRR, total MRR, and percent of total. Includes a Total summary row.

### Filter Funnel (row counts by tier)
| tier | cnt |
| --- | --- |
| Premium | 5 |
| Premium + Scale Workshop | 5 |
| Standard | 45 |
| VIP | 25 |
| VIP (Yearly) | 1 |

### Result (actual query)
| tier | usd_mrr | non_usd_mrr | total_mrr | pct_of_total |
| --- | --- | --- | --- | --- |
| Total | 178000 | 22000 | 200000 | 100 |
| Standard | 48000 | 3000 | 51000 | 25.5 |
| Premium | 24000 | 16000 | 40000 | 20.0 |
| VIP | 70000 | 3000 | 73000 | 36.5 |
| VIP (Yearly) | 36000 | 0 | 36000 | 18.0 |
| Premium + Scale Workshop | 0 | 0 | 0 | 0.0 |

## Panel 5: Revenue by Source

### Query Logic
Same as Panel 4 but grouped by `billing_source` instead of `tier`.

### Filter Funnel (row counts by billing_source)
| billing_source | cnt |
| --- | --- |
| ACE | 12 |
| Recharge | 36 |
| Skool | 33 |

### Result (actual query)
| billing_source | usd_mrr | non_usd_mrr | total_mrr | pct_of_total |
| --- | --- | --- | --- | --- |
| Total | 178000 | 22000 | 200000 | 100 |
| Recharge | 115000 | 22000 | 137000 | 68.5 |
| Skool | 45000 | 0 | 45000 | 22.5 |
| ACE | 18000 | 0 | 18000 | 9.0 |

## Panel 6: Month-over-Month Revenue

### Query Logic
Groups Active Paying members by month (from billing_date) and billing_source, starting from 2026-02-01. Shows normalized MRR per month/source.

### Filter Funnel (row counts by month)
| month | cnt |
| --- | --- |
| Feb 2026 | 6 |
| Mar 2026 | 734 |
| Apr 2026 | 81 |

### Result (actual query)
| month_label | billing_source | total_mrr |
| --- | --- | --- |
| Feb 2026 | ACE | 6000 |
| Mar 2026 | ACE | 102000 |
| Mar 2026 | Recharge | 1790000.00 |
| Mar 2026 | Skool | 385000 |
| Apr 2026 | Recharge | 137000 |
| Apr 2026 | ACE | 18000 |
| Apr 2026 | Skool | 45000 |

## Panel 7: Sold vs Collected

### Query Logic
Starts from deals (where mrr IS NOT NULL and != 0, close_date >= 2026-02-01), joins through contact_deal -> contacts (Paying Member), then LEFT JOINs deal_membership -> memberships to classify each deal as Collected, Cancelled, Payment Failed, or No Billing Yet. Groups by close_date month.

### Filter Funnel
| Step | Filter | Row Count |
| --- | --- | --- |
| 1 | deals with mrr IS NOT NULL and != 0 | 798 |
| 2 | + close_date >= 2026-02-01 | 798 |
| 3 | + JOIN contact_deal + contacts (Paying Member) | 762 |

### Result (actual query)
| close_month | closed_mrr | collected_mrr | cancelled_mrr | payment_failed_mrr | no_billing_mrr | deal_count |
| --- | --- | --- | --- | --- | --- | --- |
| Feb 2026 | 1633000.0 | 1504000.0 | 79000.0 | 37000.0 | 13000.0 | 488 |
| Mar 2026 | 692859.62 | 685859.62 | 1000 | 0 | 6000 | 244 |
| Apr 2026 | 92000 | 92000 | 0 | 0 | 0 | 30 |

## Panel 8: Churn Cohort

### Query Logic
Starts from memberships (Active or Cancellation, Paying Member, billing_date >= 2026-02-01), LEFT JOINs deal_membership -> deals, groups by deal close_date month. Shows active MRR, cancellation MRR, and churn rate percentage per cohort. Note: the LEFT JOIN to deals plus a WHERE filter on close_date effectively makes it an INNER JOIN.

### Filter Funnel
| Step | Filter | Row Count |
| --- | --- | --- |
| 1 | Memberships: Active or Cancellation, Paying, billing_date >= 2026-02-01 | 919 |
| 2 | + LEFT JOIN deals with close_date >= 2026-02-01 | 912 |

### Result (actual query)
| close_month_cohort | active_mrr | cancellation_mrr | churn_rate_pct |
| --- | --- | --- | --- |
| Feb 2026 | 1523000.00 | 121000 | 7.94 |
| Mar 2026 | 862000.00 | 96000 | 11.14 |
| Apr 2026 | 93000 | 0 | 0.00 |

## Potential Issues Found

- Column `membership_type` contains NULL values.
- Column `billing_source` contains NULL values.
- Column `tier` contains NULL values.
- Column `currency` contains NULL values.
- 3 memberships have no contact link via contact_membership.
- 1 deals have no contact link via contact_deal.
- Panel 2 (ARR): 6 memberships dropped by contact_membership/contacts join (81 -> 75). ARR is under-counted vs collected revenue.
- Panel 7 (Sold vs Collected): 36 deals dropped by contact_deal/contacts join (798 -> 762).
- Panel 8 (Churn Cohort): 7 memberships dropped because LEFT JOIN to deals + close_date filter acts as INNER JOIN (919 -> 912).
