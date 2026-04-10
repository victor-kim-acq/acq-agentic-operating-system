import type { ChartView } from '@/components/ui/ViewToggle';
import type { ColumnDef } from '@/components/ui/DataTable';

export const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fmtLabel: any = (v: unknown) => { const n = Number(v); return n > 0 ? fmt(n) : ''; };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pctLabel: any = (v: unknown) => { const n = Number(v); return n > 0 ? `${n.toFixed(1)}%` : ''; };

export const fmtShort = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  if (n > 0) return `$${n.toFixed(0)}`;
  return '';
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fmtShortLabel: any = (v: unknown) => fmtShort(Number(v));

export const today = () => new Date().toISOString().slice(0, 10);
export const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const sourceLabel: Record<string, string> = {
  recharge: 'Recharge',
  skool: 'Skool',
  stripe: 'ACE',
  Total: 'Total',
};
export const displaySource = (s: string) => sourceLabel[s] ?? s;

export function formatPeriodLabel(period: string, view: ChartView): string {
  if (view === 'wow') {
    const d = new Date(period + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  const [y, m] = period.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

export const DETAIL_COLUMNS: Record<string, ColumnDef[]> = {
  'revenue-by-tier': [
    { key: 'membership_id', label: 'ID' },
    { key: 'membership_name', label: 'Name' },
    { key: 'tier', label: 'Tier' },
    { key: 'billing_source', label: 'Source' },
    { key: 'mrr', label: 'Raw MRR', align: 'right', format: fmt },
    { key: 'normalized_mrr', label: 'Normalized MRR', align: 'right', format: fmt },
    { key: 'currency', label: 'Currency' },
    { key: 'billing_date', label: 'Billing Date' },
  ],
  'revenue-by-source': [
    { key: 'membership_id', label: 'ID' },
    { key: 'membership_name', label: 'Name' },
    { key: 'tier', label: 'Tier' },
    { key: 'billing_source', label: 'Source' },
    { key: 'mrr', label: 'Raw MRR', align: 'right', format: fmt },
    { key: 'normalized_mrr', label: 'Normalized MRR', align: 'right', format: fmt },
    { key: 'currency', label: 'Currency' },
    { key: 'billing_date', label: 'Billing Date' },
  ],
  'mom-revenue': [
    { key: 'membership_id', label: 'ID' },
    { key: 'membership_name', label: 'Name' },
    { key: 'billing_month', label: 'Month' },
    { key: 'tier', label: 'Tier' },
    { key: 'billing_source', label: 'Source' },
    { key: 'normalized_mrr', label: 'Normalized MRR', align: 'right', format: fmt },
    { key: 'currency', label: 'Currency' },
    { key: 'billing_date', label: 'Billing Date' },
  ],
  'sold-vs-collected': [
    { key: 'deal_id', label: 'Deal ID' },
    { key: 'dealname', label: 'Deal Name' },
    { key: 'close_month', label: 'Close Month' },
    { key: 'firstname', label: 'First Name' },
    { key: 'lastname', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'tier', label: 'Tier' },
    { key: 'normalized_mrr', label: 'MRR', align: 'right', format: fmt },
    {
      key: 'deal_status', label: 'Status',
      colorFn: () => '',
    },
  ],
  'churn-cohort': [
    { key: 'membership_id', label: 'ID' },
    { key: 'membership_name', label: 'Name' },
    {
      key: 'status', label: 'Status',
      colorFn: () => '',
    },
    { key: 'close_month', label: 'Deal Close Month' },
    { key: 'dealname', label: 'Deal Name' },
    { key: 'tier', label: 'Tier' },
    { key: 'billing_source', label: 'Source' },
    { key: 'normalized_mrr', label: 'Normalized MRR', align: 'right', format: fmt },
    { key: 'billing_date', label: 'Billing Date' },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div
      className="rounded-lg p-3 text-sm border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--neutral-200)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <p className="font-medium mb-1" style={{ color: 'var(--neutral-900)' }}>{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.name === 'Churn Rate %' ? `${Number(entry.value).toFixed(1)}%` : entry.name === 'Deal Count' ? Number(entry.value).toLocaleString() : fmt(entry.value)}
        </p>
      ))}
    </div>
  );
};
