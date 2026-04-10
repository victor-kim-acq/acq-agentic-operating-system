'use client';

export type ChartView = 'mom' | 'wow';

interface ViewToggleProps {
  view: ChartView;
  onChange: (v: ChartView) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  const base = 'px-3 py-1 text-xs font-medium rounded-md';
  return (
    <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--neutral-100)' }}>
      <button
        className={base}
        style={{
          background: view === 'mom' ? 'var(--neutral-800)' : 'transparent',
          color: view === 'mom' ? '#fff' : 'var(--neutral-500)',
          transition: 'background-color 150ms ease, color 150ms ease',
        }}
        onClick={() => onChange('mom')}
      >
        MoM
      </button>
      <button
        className={base}
        style={{
          background: view === 'wow' ? 'var(--neutral-800)' : 'transparent',
          color: view === 'wow' ? '#fff' : 'var(--neutral-500)',
          transition: 'background-color 150ms ease, color 150ms ease',
        }}
        onClick={() => onChange('wow')}
      >
        WoW
      </button>
    </div>
  );
}
