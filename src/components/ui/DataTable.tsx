'use client';

export interface ColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'right';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  format?: (v: any) => string;
  colorClass?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colorFn?: (v: any) => string;
}

interface DataTableProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[];
  columns: ColumnDef[];
  maxRows?: number;
  totalCount?: number;
}

export default function DataTable({ rows, columns, maxRows, totalCount }: DataTableProps) {
  const displayRows = maxRows ? rows.slice(0, maxRows) : rows;
  const count = totalCount ?? rows.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-xs font-medium uppercase tracking-wider py-2.5 px-3 border-b whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                style={{ color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)', background: 'var(--neutral-50)' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr
              key={i}
              className="transition-colors"
              style={{ '--hover-bg': '#f0f4ff' } as React.CSSProperties}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f4ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {columns.map((col) => {
                const raw = row[col.key];
                const display = col.format ? col.format(Number(raw)) : (raw == null ? '\u2014' : String(raw));
                const color = col.colorFn ? col.colorFn(raw) : (col.colorClass ?? '');
                return (
                  <td
                    key={col.key}
                    className={`py-2.5 px-3 border-b whitespace-nowrap ${col.align === 'right' ? 'text-right' : ''} ${color}`}
                    style={{ borderColor: 'var(--neutral-100)' }}
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {maxRows && count > maxRows && (
        <p className="text-xs mt-3" style={{ color: 'var(--neutral-400)' }}>
          Showing {maxRows} of {count} records
        </p>
      )}
    </div>
  );
}
