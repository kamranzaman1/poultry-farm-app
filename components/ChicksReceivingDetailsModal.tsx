import React, { useState, useEffect, useRef } from 'react';
import type { ChicksReceivingHouseData } from '../types';

interface ChicksReceivingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: Partial<ChicksReceivingHouseData>) => void;
  houseData: ChicksReceivingHouseData | null;
  houseNumber: number | null;
}

const ChicksReceivingDetailsModal: React.FC<ChicksReceivingDetailsModalProps> = ({ isOpen, onClose, onSave, houseData, houseNumber }) => {
  const [details, setDetails] = useState<Partial<ChicksReceivingHouseData>>({});
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (houseData) {
      setDetails({
        productionOrderNo: houseData.productionOrderNo || '',
        productionLine: houseData.productionLine || '',
        trialOrControl: houseData.trialOrControl || '',
        breed: houseData.breed || '',
        flock: houseData.flock || '',
        flockNo: houseData.flockNo || '',
        flockAge: houseData.flockAge || '',
        hatcheryNo: houseData.hatcheryNo || '',
      });
    }
  }, [houseData]);

  if (!isOpen || !houseData || houseNumber === null) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(details);
    onClose();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    
    const form = formRef.current;
    if (!form) return;

    const focusable = Array.from(form.querySelectorAll<HTMLElement>('input[type="text"], select'));
    const currentIndex = focusable.indexOf(e.currentTarget as HTMLElement);
    
    let nextIndex = -1;
    if (e.key === 'ArrowUp') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : focusable.length - 1;
    } else if (e.key === 'ArrowDown') {
      nextIndex = currentIndex < focusable.length - 1 ? currentIndex + 1 : 0;
    }

    if (nextIndex !== -1) {
      // Fix: Cast the focusable element to HTMLElement to access the focus method.
      (focusable[nextIndex] as HTMLElement).focus();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="details-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h3 id="details-modal-title" className="text-lg font-semibold text-gray-800">Additional Details for House {houseNumber}</h3>
        <div ref={formRef} className="mt-4 space-y-4">
          <div>
            <label htmlFor="productionOrderNo" className="block text-sm font-medium text-gray-700">Production Order No.</label>
            <input type="text" name="productionOrderNo" id="productionOrderNo" value={details.productionOrderNo} onChange={handleChange} onKeyDown={handleKeyDown} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label htmlFor="productionLine" className="block text-sm font-medium text-gray-700">Production Line</label>
            <input type="text" name="productionLine" id="productionLine" value={details.productionLine} readOnly disabled className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
          </div>
           <div>
            <label htmlFor="trialOrControl" className="block text-sm font-medium text-gray-700">Trial / Control</label>
            <select name="trialOrControl" id="trialOrControl" value={details.trialOrControl} onChange={handleChange} onKeyDown={handleKeyDown} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="">Select...</option>
                <option value="Trial">Trial</option>
                <option value="Control">Control</option>
            </select>
          </div>
          <div>
            <label htmlFor="breed" className="block text-sm font-medium text-gray-700">Breed</label>
            <input type="text" name="breed" id="breed" value={details.breed} onChange={handleChange} onKeyDown={handleKeyDown} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label htmlFor="flock" className="block text-sm font-medium text-gray-700">Flock</label>
            <input type="text" name="flock" id="flock" value={details.flock} onChange={handleChange} onKeyDown={handleKeyDown} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label htmlFor="flockNo" className="block text-sm font-medium text-gray-700">Flock No.</label>
            <input type="text" name="flockNo" id="flockNo" value={details.flockNo} onChange={handleChange} onKeyDown={handleKeyDown} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label htmlFor="flockAge" className="block text-sm font-medium text-gray-700">Flock Age</label>
            <input type="text" name="flockAge" id="flockAge" value={details.flockAge} onChange={handleChange} onKeyDown={handleKeyDown} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label htmlFor="hatcheryNo" className="block text-sm font-medium text-gray-700">Hatchery No.</label>
            <input type="text" name="hatcheryNo" id="hatcheryNo" value={details.hatcheryNo} onChange={handleChange} onKeyDown={handleKeyDown} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg">Cancel</button>
          <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg">Save Details</button>
        </div>
      </div>
    </div>
  );
};

export default ChicksReceivingDetailsModal;