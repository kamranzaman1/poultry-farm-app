import React, { useState, useEffect } from 'react';

interface FinishCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (finishDate: string) => void;
  farmName: string;
  cycleNo: string;
  initialDate?: string | null;
}

const FinishCycleModal: React.FC<FinishCycleModalProps> = ({ isOpen, onClose, onConfirm, farmName, cycleNo, initialDate }) => {
  const [finishDate, setFinishDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Set date to initialDate if provided (for editing), otherwise default to today
      setFinishDate(initialDate || new Date().toISOString().split('T')[0]);
      setError('');
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!finishDate) {
      setError('A date is required to finish the cycle.');
      return;
    }
    onConfirm(finishDate);
  };
  
  const isEditing = !!initialDate;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-cycle-title"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 id="finish-cycle-title" className="text-lg font-semibold text-gray-800">
          {isEditing ? 'Edit Finish Date' : 'Finish Farm Cycle'}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          For <span className="font-bold">{farmName}</span> in Cycle <span className="font-mono">{cycleNo}</span>.
        </p>
        <div className="mt-4">
          <label htmlFor="finishDate" className="block text-sm font-medium text-gray-700 mb-1">
            Last Catching Date (Finish Date)
          </label>
          <input
            id="finishDate"
            type="date"
            value={finishDate}
            onChange={(e) => {
              setFinishDate(e.target.value);
              if (error) setError('');
            }}
            className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
            aria-invalid={!!error}
            aria-describedby={error ? "date-error" : undefined}
          />
          {error && <p id="date-error" className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className={`px-4 py-2 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              isEditing 
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }`}
          >
            {isEditing ? 'Save Changes' : 'Confirm Finish'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinishCycleModal;