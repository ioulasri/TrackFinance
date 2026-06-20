import React from 'react';
import { X } from 'lucide-react';
import { C, FONT } from './ds';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const maxWidthPx = { sm: 448, md: 512, lg: 672 }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ fontFamily: FONT }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(26,24,21,0.4)' }}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative w-full animate-in zoom-in-95 duration-200"
        style={{
          maxWidth: maxWidthPx,
          background: C.card,
          borderRadius: 14,
          border: `1px solid ${C.border}`,
          boxShadow: '0 8px 24px rgba(26,24,21,0.12)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}
        >
          <h4 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: C.ink, letterSpacing: '-0.01em' }}>
            {title}
          </h4>
          <button
            onClick={onClose}
            className="modal-close-btn inline-flex items-center justify-center"
            style={{
              border: 0,
              background: 'transparent',
              color: C.muted,
              borderRadius: 8,
              padding: 6,
              cursor: 'pointer',
              transition: 'background 150ms, color 150ms',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 22 }}>{children}</div>
      </div>

      <style>{`
        .modal-close-btn:hover { background: ${C.divider}; color: ${C.ink2}; }
      `}</style>
    </div>
  );
}
