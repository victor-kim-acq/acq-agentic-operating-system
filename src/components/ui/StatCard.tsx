'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  trend?: { value: string; positive: boolean; context?: string } | null;
}

export default function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Label row with icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        {icon && (
          <span style={{ color: 'var(--neutral-400)', display: 'flex' }}>
            {icon}
          </span>
        )}
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--neutral-400)',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color: 'var(--neutral-900)',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>

      {/* Trend badge */}
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: '12px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 20,
              background: trend.positive ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              color: trend.positive ? 'var(--color-success)' : 'var(--color-danger)',
            }}
          >
            <span style={{ fontSize: '10px' }}>{trend.positive ? '▲' : '▼'}</span>
            {trend.value}
          </span>
          {trend.context && (
            <span style={{ fontSize: '12px', color: 'var(--neutral-400)' }}>
              {trend.context}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
