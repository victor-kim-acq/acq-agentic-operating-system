'use client';

interface StatCardProps {
  label: string;
  value: string;
  trend?: { value: string; positive: boolean } | null;
  accentColor?: string;
}

export default function StatCard({ label, value, trend, accentColor }: StatCardProps) {
  return (
    <div
      className="rounded-xl border p-6 relative overflow-hidden"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
          style={{ background: `linear-gradient(to right, ${accentColor}, transparent)` }}
        />
      )}
      <p
        className="text-xs font-medium uppercase mb-2"
        style={{ color: 'var(--neutral-400)', letterSpacing: '0.1em' }}
      >
        {label}
      </p>
      <p
        className="text-3xl font-extrabold"
        style={{ color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}
      >
        {value}
      </p>
      {trend && (
        <p
          className="text-xs font-medium mt-2"
          style={{ color: trend.positive ? 'var(--color-success)' : 'var(--color-danger)' }}
        >
          {trend.value}
        </p>
      )}
    </div>
  );
}
