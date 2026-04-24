'use client';

import { useState } from 'react';

export interface Note {
  title: string;
  bullets: string[];
  checkmarks?: boolean;
  footer?: string;
}

interface CollapsibleNotesProps {
  notes: Note[];
  header?: string;
  previewHeight?: number;
  fadeColor?: string;
}

export default function CollapsibleNotes({
  notes,
  header,
  previewHeight = 180,
  fadeColor = 'var(--page-bg)',
}: CollapsibleNotesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <section>
      {header && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--neutral-400)',
            padding: '0 0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>{header}</span>
          <span style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            maxHeight: isExpanded ? 2000 : previewHeight,
            overflow: 'hidden',
            transition: 'max-height 0.4s ease',
          }}
        >
          {notes.map((note) => (
            <div key={note.title} style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--neutral-900)',
                  marginBottom: 8,
                }}
              >
                {note.title}
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  fontSize: 13,
                  color: 'var(--neutral-600)',
                  lineHeight: 1.6,
                }}
              >
                {note.bullets.map((b, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                    <span
                      aria-hidden
                      style={{
                        flexShrink: 0,
                        width: 14,
                        color: note.checkmarks
                          ? 'var(--color-success, #16a34a)'
                          : 'var(--neutral-400)',
                      }}
                    >
                      {note.checkmarks ? '✓' : '•'}
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {note.footer && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--neutral-400)',
                    marginTop: 10,
                    fontStyle: 'italic',
                  }}
                >
                  {note.footer}
                </div>
              )}
            </div>
          ))}
        </div>
        {!isExpanded && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 80,
              background: `linear-gradient(to bottom, transparent, ${fadeColor})`,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        className="hover:text-[var(--neutral-900)] transition-colors"
        style={{
          width: '100%',
          textAlign: 'center',
          padding: '10px 0',
          marginTop: 8,
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--neutral-600)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {isExpanded ? 'Show less' : 'Show more'}
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            marginLeft: 6,
            transition: 'transform 0.2s ease',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
          }}
        >
          {'▾'}
        </span>
      </button>
    </section>
  );
}
