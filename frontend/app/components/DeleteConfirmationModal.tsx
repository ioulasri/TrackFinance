import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
}

export function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName, 
  itemType 
}: DeleteConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Deletion" maxWidth="sm">
      <div className="text-center space-y-4">
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-red-50 rounded-full">
            <AlertCircle size={48} className="text-red-600" />
          </div>
        </div>

        {/* Message */}
        <div>
          <h4 className="text-gray-900 mb-2">Are you sure?</h4>
          <p className="text-gray-600">
            You're about to delete the {itemType}{' '}
            <span className="font-semibold text-gray-900">"{itemName}"</span>.
            This action cannot be undone.
          </p>
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
