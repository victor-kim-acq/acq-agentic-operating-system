'use client';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onReset: () => void;
}

export default function DateRangeFilter({ startDate, endDate, onStartChange, onEndChange, onReset }: DateRangeFilterProps) {
  const inputStyle: React.CSSProperties = {
    border: '1px solid var(--neutral-200)',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: '13px',
    color: 'var(--neutral-700)',
    background: 'var(--card-bg)',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid var(--neutral-200)',
          borderRadius: 8,
          padding: '4px 12px',
          background: 'var(--card-bg)',
          fontSize: '13px',
          color: 'var(--neutral-600)',
          fontWeight: 500,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Date Range
      </div>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        style={inputStyle}
      />
      <span style={{ fontSize: '13px', color: 'var(--neutral-300)' }}>→</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        style={inputStyle}
      />
      <button
        onClick={onReset}
        style={{
          fontSize: '12px',
          color: 'var(--neutral-400)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: 2,
        }}
      >
        Reset
      </button>
    </div>
  );
}
