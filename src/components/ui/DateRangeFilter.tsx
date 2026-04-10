'use client';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onReset: () => void;
}

export default function DateRangeFilter({ startDate, endDate, onStartChange, onEndChange, onReset }: DateRangeFilterProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--neutral-600)' }}>Date Range</span>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
        style={{ borderColor: 'var(--neutral-200)' }}
      />
      <span className="text-sm" style={{ color: 'var(--neutral-400)' }}>to</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
        style={{ borderColor: 'var(--neutral-200)' }}
      />
      <button
        onClick={onReset}
        className="text-xs underline ml-1 transition-colors hover:opacity-80"
        style={{ color: 'var(--neutral-500)' }}
      >
        Reset
      </button>
    </div>
  );
}
