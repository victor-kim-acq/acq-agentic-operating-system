'use client';

import Link from 'next/link';

const NAV_LINKS = [
  { href: '/', label: 'Canvas' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/mits', label: 'MITs' },
  { href: '/members', label: 'Members' },
  { href: '/agents', label: 'Agents' },
];

export default function NavBar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm px-6 py-3 flex items-center justify-between border-b"
      style={{
        background: 'rgba(255,255,255,0.92)',
        borderColor: 'var(--neutral-200)',
      }}
    >
      <div className="flex items-center gap-6">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-sm transition-colors"
            style={{ color: 'var(--neutral-500)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--neutral-800)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--neutral-500)')}
          >
            {label}
          </Link>
        ))}
      </div>
      <span className="text-xs" style={{ color: 'var(--neutral-400)' }}>ACQ Agentic OS</span>
    </nav>
  );
}
