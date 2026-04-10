'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import DataTable from '@/components/ui/DataTable';
import { DETAIL_COLUMNS } from './helpers';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  panel: string;
}

export default function DetailModal({ open, onClose, title, panel }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows, setRows] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !panel) return;
    setLoading(true);
    setError(null);
    setRows([]);
    fetch(`/api/dashboard/detail?panel=${panel}&t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setRows(data.rows ?? []);
          setRowCount(data.row_count ?? 0);
        }
      })
      .catch(() => setError('Failed to fetch detail data'))
      .finally(() => setLoading(false));
  }, [open, panel]);

  const columns = DETAIL_COLUMNS[panel] ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={!loading && rowCount > 0 ? `${rowCount} records` : undefined}
    >
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--neutral-400)' }} />
        </div>
      )}
      {error && (
        <div className="text-sm py-4" style={{ color: 'var(--color-danger)' }}>{error}</div>
      )}
      {!loading && !error && rows.length > 0 && (
        <DataTable rows={rows} columns={columns} maxRows={200} totalCount={rowCount} />
      )}
      {!loading && !error && rows.length === 0 && (
        <p className="text-sm py-4" style={{ color: 'var(--neutral-400)' }}>No records found.</p>
      )}
    </Modal>
  );
}
