'use client';

export type ChartView = 'mom' | 'wow';

interface ViewToggleProps {
  view: ChartView;
  onChange: (v: ChartView) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex gap-0.5 p-0.5 rounded-full border" style={{ borderColor: 'var(--neutral-200)' }}>
      {(['mom', 'wow'] as const).map((v) => (
        <button
          key={v}
          className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full transition-all"
          style={{
            background: view === v ? 'var(--neutral-900)' : 'transparent',
            color: view === v ? '#fff' : 'var(--neutral-400)',
          }}
          onClick={() => onChange(v)}
        >
          {v === 'mom' ? 'MoM' : 'WoW'}
        </button>
      ))}
    </div>
  );
}
