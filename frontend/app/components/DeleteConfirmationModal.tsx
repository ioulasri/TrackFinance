import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

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
      <div className="text-center space-y-4">
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-red-50 rounded-full">
            <AlertCircle size={48} className="text-red-600" />
          </div>
        </div>

        {/* Message */}
        <div>
          <p className="text-gray-600">{modalMessage}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" size="large" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" size="large" className="flex-1" onClick={handleConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
