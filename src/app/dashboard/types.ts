export interface Summary {
  collected_revenue: number;
  annual_run_rate: number;
  churned_revenue: number;
}

export interface TierRow {
  tier: string;
  usd_mrr: number;
  non_usd_mrr: number;
  total_mrr: number;
  pct_of_total: number;
}

export interface SourceRow {
  billing_source: string;
  usd_mrr: number;
  non_usd_mrr: number;
  total_mrr: number;
  pct_of_total: number;
}

export interface MoMRow {
  month_label: string;
  sort_month: string;
  billing_source: string;
  total_mrr: number;
}

export interface SoldRow {
  close_month: string;
  sort_month: string;
  closed_mrr: number;
  collected_mrr: number;
  cancelled_mrr: number;
  payment_failed_mrr: number;
  no_billing_mrr: number;
  deal_count: number;
}

export interface ChurnRow {
  close_month_cohort: string;
  sort_month: string;
  active_mrr: number;
  cancellation_mrr: number;
  churn_rate_pct: number;
}

export interface RevenueChurnRow {
  period: string;
  active_mrr: number;
  cancelled_mrr: number;
  churn_rate_pct: number;
}

export interface NewDealsRow {
  period: string;
  deal_count: number;
  sold_mrr: number;
}

export interface SoldCollectedChartRow {
  period: string;
  closed_mrr: number;
  collected_mrr: number;
  cancelled_mrr: number;
}

export interface ChatMessage {
  id: string;
  question: string;
  summary: string | null;
  sql: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[] | null;
  row_count: number;
  error: string | null;
  loading: boolean;
}
