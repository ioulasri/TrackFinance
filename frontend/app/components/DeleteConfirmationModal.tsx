import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';
import { C, FONT, GhostButton } from './ds';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  itemType?: string;
}

export function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title,
  message,
  itemName, 
  itemType 
}: DeleteConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const modalTitle = title || 'Confirm Deletion';
  const modalMessage = message || 
    (itemName && itemType 
      ? `You're about to delete the ${itemType} "${itemName}". This action cannot be undone.`
      : 'Are you sure you want to proceed with this deletion? This action cannot be undone.'
    );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="sm">
      <div className="text-center space-y-4" style={{ fontFamily: FONT }}>
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div style={{ padding: 16, background: C.overSoft, borderRadius: '9999px' }}>
            <AlertCircle size={48} color={C.over} />
          </div>
        </div>

        {/* Message */}
        <div>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>{modalMessage}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <GhostButton onClick={onClose} style={{ flex: 1, justifyContent: 'center', padding: '10px 15px', fontSize: 13 }}>
            Cancel
          </GhostButton>
          <button
            type="button"
            onClick={handleConfirm}
            className="delete-confirm-btn inline-flex items-center justify-center"
            style={{
              flex: 1,
              border: 0,
              borderRadius: 8,
              padding: '10px 15px',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: FONT,
              color: '#fff',
              background: C.over,
              cursor: 'pointer',
              transition: 'background 150ms',
            }}
          >
            Delete
          </button>
        </div>
      </div>
      <style>{`.delete-confirm-btn:hover{background:#A93A3A;}`}</style>
    </Modal>
  );
}
