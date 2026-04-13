'use client';

export type ChartView = 'mom' | 'wow';

interface ViewToggleProps {
  view: ChartView;
  onChange: (v: ChartView) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  const pill = (label: string, val: ChartView) => ({
    fontSize: '12px',
    fontWeight: view === val ? 600 : 500,
    padding: '4px 12px',
    borderRadius: 6,
    border: view === val ? '1px solid var(--neutral-900)' : '1px solid var(--neutral-200)',
    background: view === val ? 'var(--neutral-900)' : 'transparent',
    color: view === val ? '#fff' : 'var(--neutral-500)',
    cursor: 'pointer' as const,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button style={pill('MoM', 'mom')} onClick={() => onChange('mom')}>MoM</button>
      <button style={pill('WoW', 'wow')} onClick={() => onChange('wow')}>WoW</button>
    </div>
  );
}
