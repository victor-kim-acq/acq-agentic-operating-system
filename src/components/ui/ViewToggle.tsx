'use client';

export type ChartView = 'mom' | 'wow';

interface ViewToggleProps {
  view: ChartView;
  onChange: (v: ChartView) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  const base = 'px-3 py-1 text-xs font-medium rounded-md transition-colors';
  return (
    <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--neutral-100)' }}>
      <button
        className={base}
        style={view === 'mom'
          ? { background: 'var(--neutral-900)', color: '#fff' }
          : { color: 'var(--neutral-500)' }
        }
        onClick={() => onChange('mom')}
      >
        MoM
      </button>
      <button
        className={base}
        style={view === 'wow'
          ? { background: 'var(--neutral-900)', color: '#fff' }
          : { color: 'var(--neutral-500)' }
        }
        onClick={() => onChange('wow')}
      >
        WoW
      </button>
    </div>
  );
}
