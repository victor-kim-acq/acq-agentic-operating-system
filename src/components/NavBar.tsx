'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Canvas' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/mits', label: 'MITs' },
  { href: '/members', label: 'Members' },
  { href: '/agents', label: 'Agents' },
];

export default function NavBar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md px-6 py-0 flex items-center justify-between"
      style={{
        background: 'rgba(255,255,255,0.85)',
        borderBottom: '1px solid var(--card-border)',
      }}
    >
      <div className="flex items-center gap-1">
        {NAV_LINKS.map(({ href, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="relative text-sm font-medium px-3 py-3 transition-colors"
              style={{
                color: active ? 'var(--neutral-900)' : 'var(--neutral-400)',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.color = 'var(--neutral-700)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = 'var(--neutral-400)';
              }}
            >
              {label}
              {active && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                  style={{ background: 'var(--neutral-900)' }}
                />
              )}
            </Link>
          );
        })}
      </div>
      <span
        className="text-xs font-semibold tracking-wide uppercase"
        style={{ color: 'var(--neutral-300)', letterSpacing: '0.08em' }}
      >
        ACQ Agentic OS
      </span>
    </nav>
  );
}
