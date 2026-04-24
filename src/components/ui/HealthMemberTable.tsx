'use client';

import { useMemo } from 'react';
import { Download } from 'lucide-react';

export interface HealthMember {
  skool_user_id: string;
  email: string;
  full_name: string;
  source: string;
  tier: string;
  member_status: string;
  joined_at: string;
  band: string;
  composite_score: number;
  days_since_join: number | null;
  days_since_last_post: number | null;
  ai_activated: boolean;
  ai_total_chats: number;
  total_posts: number;
  total_comments: number;
  total_upvotes_received: number;
  courses_started: number;
  courses_completed: number;
  has_completed_onboarding: boolean;
  revenue_verified: boolean;
}

export type ColumnKey =
  | 'email'
  | 'source'
  | 'tier'
  | 'band'
  | 'score'
  | 'joined'
  | 'days_silent'
  | 'cohort_month'
  | 'ai_flag'
  | 'post_flag'
  | 'onboard_flag'
  | 'verify_flag'
  | 'course_flag';

interface Column {
  key: ColumnKey;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: number;
}

interface Props {
  rows: HealthMember[];
  columns: Column[];
  filename: string;
  emptyHint?: string;
}

const BAND_BADGE: Record<string, { bg: string; fg: string }> = {
  at_risk:  { bg: '#fef2f2', fg: '#b91c1c' },
  steady:   { bg: '#fffbeb', fg: '#b45309' },
  champion: { bg: '#f0fdf4', fg: '#15803d' },
};

const BAND_LABEL: Record<string, string> = {
  at_risk: 'At Risk',
  steady: 'Steady',
  champion: 'Champion',
};

function formatTier(t: string): string {
  if (!t || t === 'Unknown') return t || '—';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function cohortMonth(joined: string): string {
  if (!joined) return '—';
  const d = new Date(joined + 'T00:00:00Z');
  if (isNaN(d.getTime())) return joined;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function BandBadge({ band }: { band: string }) {
  const c = BAND_BADGE[band] ?? { bg: 'var(--neutral-100)', fg: 'var(--neutral-600)' };
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 4,
        background: c.bg,
        color: c.fg,
      }}
    >
      {BAND_LABEL[band] ?? band}
    </span>
  );
}

function YesNo({ yes }: { yes: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 4,
        background: yes ? 'var(--color-success-bg)' : '#fef2f2',
        color: yes ? 'var(--color-success)' : '#b91c1c',
      }}
    >
      {yes ? 'Yes' : 'No'}
    </span>
  );
}

function cellValue(m: HealthMember, k: ColumnKey): string {
  switch (k) {
    case 'email':
      return m.email || m.full_name || m.skool_user_id.slice(0, 8);
    case 'source':
      return m.source;
    case 'tier':
      return formatTier(m.tier);
    case 'band':
      return BAND_LABEL[m.band] ?? m.band;
    case 'score':
      return String(m.composite_score);
    case 'joined':
      return m.joined_at || '';
    case 'days_silent':
      return m.days_since_last_post == null ? '—' : `${m.days_since_last_post}`;
    case 'cohort_month':
      return cohortMonth(m.joined_at);
    case 'ai_flag':
      return m.ai_activated ? 'Yes' : 'No';
    case 'post_flag':
      // action trigger is "zero posts + comments"
      return m.total_posts + m.total_comments === 0 ? 'Needs' : '—';
    case 'onboard_flag':
      return m.has_completed_onboarding ? '—' : 'Needs';
    case 'verify_flag':
      if (m.source !== 'ACE' && m.source !== 'Recharge') return 'n/a';
      return m.revenue_verified ? '—' : 'Needs';
    case 'course_flag':
      return m.courses_started === 0 ? 'Needs' : '—';
  }
}

function exportCsv(rows: HealthMember[], columns: Column[], filename: string) {
  const esc = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const header = columns.map((c) => esc(c.label)).join(',');
  const body = rows
    .map((m) => columns.map((c) => esc(cellValue(m, c.key))).join(','))
    .join('\n');
  const csv = header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function HealthMemberTable({ rows, columns, filename, emptyHint }: Props) {
  const sortedRows = useMemo(() => rows, [rows]);

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          color: 'var(--neutral-400)',
          fontSize: 13,
        }}
      >
        {emptyHint ?? 'No members match the current filters.'}
      </div>
    );
  }

  const thBase: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--neutral-400)',
    borderBottom: '1px solid var(--neutral-200)',
    padding: '8px 12px',
    whiteSpace: 'nowrap',
    background: 'var(--card-bg)',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  };
  const tdBase: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid var(--neutral-100)',
    fontSize: 13,
    whiteSpace: 'nowrap',
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          fontSize: 12,
          color: 'var(--neutral-500)',
        }}
      >
        <span>
          {rows.length.toLocaleString()} member{rows.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={() => exportCsv(sortedRows, columns, filename)}
          className="flex items-center gap-1 text-xs transition-colors hover:opacity-70"
          style={{ color: 'var(--neutral-500)' }}
          title="Download CSV"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>
      <div
        className="overflow-auto"
        style={{
          maxHeight: 440,
          border: '1px solid var(--neutral-100)',
          borderRadius: 6,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{
                    ...thBase,
                    textAlign: c.align ?? 'left',
                    minWidth: c.width,
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((m) => (
              <tr
                key={m.skool_user_id}
                className="hover:bg-[var(--neutral-50)]"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    style={{ ...tdBase, textAlign: c.align ?? 'left' }}
                  >
                    {renderCell(m, c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderCell(m: HealthMember, c: Column): React.ReactNode {
  switch (c.key) {
    case 'email':
      return (
        <span style={{ color: 'var(--neutral-700)' }}>
          {m.email || m.full_name || m.skool_user_id.slice(0, 8)}
          {m.member_status === 'cancelled' && (
            <span
              style={{
                fontSize: 10,
                marginLeft: 6,
                color: 'var(--color-danger)',
              }}
            >
              churned
            </span>
          )}
        </span>
      );
    case 'source':
      return <span style={{ color: 'var(--neutral-500)' }}>{m.source}</span>;
    case 'tier':
      return formatTier(m.tier);
    case 'band':
      return <BandBadge band={m.band} />;
    case 'score':
      return <span style={{ fontWeight: 600 }}>{m.composite_score}</span>;
    case 'joined':
      return <span style={{ color: 'var(--neutral-500)' }}>{m.joined_at || '—'}</span>;
    case 'days_silent':
      return m.days_since_last_post == null ? (
        <span style={{ color: 'var(--neutral-400)' }}>—</span>
      ) : (
        <span style={{ color: 'var(--neutral-500)' }}>
          {m.days_since_last_post}d
        </span>
      );
    case 'cohort_month':
      return (
        <span style={{ color: 'var(--neutral-500)' }}>
          {cohortMonth(m.joined_at)}
        </span>
      );
    case 'ai_flag':
      return <YesNo yes={m.ai_activated} />;
    case 'post_flag':
      return m.total_posts + m.total_comments === 0 ? (
        <Needs />
      ) : (
        <Dash />
      );
    case 'onboard_flag':
      return m.has_completed_onboarding ? <Dash /> : <Needs />;
    case 'verify_flag':
      if (m.source !== 'ACE' && m.source !== 'Recharge') {
        return <span style={{ color: 'var(--neutral-300)', fontSize: 11 }}>n/a</span>;
      }
      return m.revenue_verified ? <Dash /> : <Needs />;
    case 'course_flag':
      return m.courses_started === 0 ? <Needs /> : <Dash />;
  }
}

function Needs() {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 4,
        background: '#fef2f2',
        color: '#b91c1c',
      }}
    >
      Needs
    </span>
  );
}

function Dash() {
  return <span style={{ color: 'var(--neutral-300)', fontSize: 12 }}>—</span>;
}
