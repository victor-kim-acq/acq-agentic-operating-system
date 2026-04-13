'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Canvas' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/mits', label: 'MITs' },
  { href: '/members', label: 'Members' },
  { href: '/agents', label: 'Agents' },
];

export default function NavBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: '#fff',
        borderBottom: '1px solid var(--card-border)',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = mounted
            ? item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
            : false;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                position: 'relative',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--neutral-900)' : 'var(--neutral-400)',
                padding: '14px 16px',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
            >
              {item.label}
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 16,
                    right: 16,
                    height: 2,
                    background: 'var(--neutral-900)',
                    borderRadius: 1,
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--neutral-300)',
        }}
      >
        ACQ Agentic OS
      </span>
    </nav>
  );
}
