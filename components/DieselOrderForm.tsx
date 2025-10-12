import React, { useState } from 'react';
import type { DieselOrder, SelectedFarmCycleDetails, User } from '../types';
import PreviewModal from './PreviewModal';

interface DieselOrderFormProps {
  farmName: string;
  onAddOrder: (order: Omit<DieselOrder, 'id' | 'status'>) => void;
  onBack: () => void;
  selectedFarmCycleDetails: SelectedFarmCycleDetails | null;
  currentUser: User;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const DieselOrderForm: React.FC<DieselOrderFormProps> = ({ farmName, onAddOrder, onBack, selectedFarmCycleDetails, currentUser }) => {
  const [quantity, setQuantity] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [tankType, setTankType] = useState<'Generator' | 'Farm' | ''>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [errors, setErrors] = useState<{ quantity?: string; requiredDate?: string; tankType?: string; }>({});

  const isSheFarm = farmName.startsWith('She');

  const validate = () => {
    const newErrors: { quantity?: string; requiredDate?: string; tankType?: string } = {};

    // Quantity validation
    if (!quantity) {
      newErrors.quantity = 'Quantity is required.';
    } else if (parseFloat(quantity) <= 0) {
      newErrors.quantity = 'Quantity must be a positive number.';
    }

    // Date validation
    if (!requiredDate) {
      newErrors.requiredDate = 'Required date is required.';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of today for accurate comparison
      // The replace method avoids timezone issues where 'YYYY-MM-DD' might be interpreted as UTC midnight
      const selectedDate = new Date(requiredDate.replace(/-/g, '/'));
      
      if (selectedDate < today) {
        newErrors.requiredDate = 'Required date cannot be in the past.';
      }
    }

    if (isSheFarm && !tankType) {
      newErrors.tankType = 'Tank type is required for She area farms.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    const orderPayload: Omit<DieselOrder, 'id' | 'status'> = {
      farmName,
      quantity,
      requiredDate,
      requesterName: currentUser.name,
      requesterContact: currentUser.contactNumber,
    };

    if (isSheFarm && tankType) {
      orderPayload.tankType = tankType;
    }

    onAddOrder(orderPayload);
    setQuantity('');
    setRequiredDate('');
    setTankType('');
    setErrors({});
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
  };
  
  // Fix: Changed e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement> to e: React.KeyboardEvent to make explicit cast necessary.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();

    const form = (e.currentTarget as HTMLElement).closest('form');
    if (!form) return;
    
    const focusable = Array.from(form.querySelectorAll<HTMLElement>('input:not([disabled]), select:not([disabled])'));
    const currentIndex = focusable.indexOf(e.currentTarget as HTMLElement);

    let nextIndex = -1;
    if (e.key === 'ArrowUp') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : focusable.length - 1;
    }
    if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < focusable.length - 1 ? currentIndex + 1 : 0;
    }
    
    if (nextIndex !== -1) {
        focusable[nextIndex]?.focus();
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
       <div className="flex items-center gap-4 mb-6 border-b pb-4">
           <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                <BackArrowIcon />
            </button>
            <h3 className="text-xl font-semibold text-gray-800">Diesel Order Request</h3>
        </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Farm</label>
          <input type="text" value={farmName} disabled className="w-full px-3 py-2 border bg-gray-100 border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Requester Name</label>
          <input type="text" value={currentUser.name} disabled className="w-full px-3 py-2 border bg-gray-100 border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity (Liters)</label>
          <input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-full px-3 py-2 border ${errors.quantity ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm`}
            placeholder="e.g., 2000"
          />
          {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
        </div>
        <div>
          <label htmlFor="requiredDate" className="block text-sm font-medium text-gray-700 mb-1">Required Date</label>
          <input
            id="requiredDate"
            type="date"
            value={requiredDate}
            onChange={(e) => setRequiredDate(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-full px-3 py-2 border ${errors.requiredDate ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm`}
          />
          {errors.requiredDate && <p className="mt-1 text-sm text-red-600">{errors.requiredDate}</p>}
        </div>

        {isSheFarm && (
            <div>
                <label htmlFor="tankType" className="block text-sm font-medium text-gray-700 mb-1">Tank Type</label>
                <select 
                    id="tankType" 
                    value={tankType} 
                    onChange={(e) => setTankType(e.target.value as 'Generator' | 'Farm' | '')}
                    onKeyDown={handleKeyDown}
                    className={`w-full px-3 py-2 border ${errors.tankType ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm`}
                >
                    <option value="">Select a tank...</option>
                    <option value="Generator">Generator</option>
                    <option value="Farm">Farm</option>
                </select>
                 {errors.tankType && <p className="mt-1 text-sm text-red-600">{errors.tankType}</p>}
            </div>
        )}
      </div>
      
      <div className="mt-6 flex justify-end items-center gap-4">
        {isSubmitted && <span className="text-green-600 text-sm mr-auto">Order submitted successfully!</span>}
        <button type="button" onClick={() => setIsPreviewOpen(true)} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">
          Preview
        </button>
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
          Submit Order
        </button>
      </div>
    </form>
    <PreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title={`Diesel Order: ${farmName}`}>
        <div className="space-y-4 text-sm">
             <div>
                <span className="text-gray-600">Farm:</span> <span className="font-medium text-gray-900 float-right">{farmName}</span>
            </div>
            <div>
                <span className="text-gray-600">Quantity:</span> <span className="font-bold text-blue-600 float-right">{quantity ? `${parseFloat(quantity).toLocaleString()} Liters` : 'N/A'}</span>
            </div>
            <div>
                <span className="text-gray-600">Required Date:</span> <span className="font-medium text-gray-900 float-right">{requiredDate || 'N/A'}</span>
            </div>
            {isSheFarm && (
                <div>
                    <span className="text-gray-600">Tank Type:</span> <span className="font-medium text-gray-900 float-right">{tankType || 'N/A'}</span>
                </div>
            )}
             <div>
                <span className="text-gray-600">Requested By:</span> <span className="font-medium text-gray-900 float-right">{currentUser.name}</span>
            </div>
            {currentUser.contactNumber && (
                 <div>
                    <span className="text-gray-600">Contact:</span> <span className="font-medium text-gray-900 float-right">{currentUser.contactNumber}</span>
                </div>
            )}
        </div>
    </PreviewModal>
    </>
  );
};

export default DieselOrderForm;