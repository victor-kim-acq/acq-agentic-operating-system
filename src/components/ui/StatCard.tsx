'use client';

interface StatCardProps {
  label: string;
  value: string;
  trend?: { value: string; positive: boolean } | null;
  accentColor?: string;
}

export default function StatCard({ label, value, trend, accentColor }: StatCardProps) {
  const tintBg = accentColor
    ? `color-mix(in srgb, ${accentColor} 5%, var(--card-bg))`
    : 'var(--card-bg)';

  return (
    <div
      className="rounded-2xl border p-6"
      style={{
        background: tintBg,
        borderColor: 'var(--card-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        {accentColor && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: accentColor }}
          />
        )}
        <p
          className="text-xs font-medium uppercase"
          style={{ color: 'var(--neutral-400)', letterSpacing: '0.08em' }}
        >
          {label}
        </p>
      </div>
      <p
        className="text-4xl font-black"
        style={{ color: 'var(--neutral-900)', letterSpacing: '-0.03em' }}
      >
        {value}
      </p>
      {trend && (
        <p
          className="text-xs font-semibold mt-2"
          style={{ color: trend.positive ? 'var(--color-success)' : 'var(--color-danger)' }}
        >
          {trend.value}
        </p>
      )}
    </div>
  );
}
