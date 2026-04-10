'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, subtitle, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl max-w-6xl w-full mx-4 max-h-[85vh] flex flex-col"
        style={{
          background: 'var(--card-bg)',
          boxShadow: 'var(--shadow-xl)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0 border-b"
          style={{ borderColor: 'var(--neutral-200)' }}
        >
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--neutral-900)' }}>
              {title}
            </h3>
            {subtitle && (
              <span className="text-sm font-normal" style={{ color: 'var(--neutral-400)' }}>{subtitle}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--neutral-100)]"
          >
            <X className="w-5 h-5" style={{ color: 'var(--neutral-400)' }} />
          </button>
        </div>
        <div className="overflow-auto px-6 py-4 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
