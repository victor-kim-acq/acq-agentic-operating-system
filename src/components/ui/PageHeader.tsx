'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--neutral-900)',
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '13px', color: 'var(--neutral-400)', margin: '4px 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{actions}</div>}
    </div>
  );
}
