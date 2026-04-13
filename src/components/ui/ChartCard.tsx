'use client';

import { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  height?: number;
  loading?: boolean;
}

export default function ChartCard({ title, subtitle, actions, children, height = 350, loading }: ChartCardProps) {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '20px 24px 16px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--neutral-900)',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                fontSize: '12px',
                color: 'var(--neutral-400)',
                margin: '4px 0 0',
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>
      <div style={{ padding: '0 24px 24px', minHeight: height }}>
        {loading ? (
          <div
            style={{
              height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--neutral-300)',
              fontSize: '13px',
            }}
          >
            Loading...
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
