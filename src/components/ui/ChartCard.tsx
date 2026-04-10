'use client';

import { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  height?: number;
  loading?: boolean;
}

export default function ChartCard({ title, actions, children, height = 350, loading }: ChartCardProps) {
  return (
    <div
      className="rounded-xl border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--neutral-800)' }}>{title}</h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="px-6 pb-6" style={{ minHeight: height }}>
        {loading ? (
          <div className="flex items-center justify-center text-sm" style={{ height, color: 'var(--neutral-400)' }}>
            Loading...
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
