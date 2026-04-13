'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function Card({ children, title, subtitle, actions, className = '', noPadding }: CardProps) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {(title || actions) && (
        <div className={`flex items-center justify-between ${noPadding ? 'px-6 pt-6 pb-4' : 'mb-4'}`}
          style={noPadding ? undefined : { padding: '1.5rem 1.5rem 0' }}
        >
          <div>
            {title && <h2 className="text-sm font-semibold" style={{ color: 'var(--neutral-800)' }}>{title}</h2>}
            {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--neutral-400)' }}>{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6 pt-0'}
        style={title || actions ? undefined : { padding: noPadding ? undefined : '1.5rem' }}
      >
        {children}
      </div>
    </div>
  );
}
