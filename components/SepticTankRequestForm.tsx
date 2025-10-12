import React, { useState } from 'react';
import type { SelectedFarmCycleDetails, User, SepticTankRequest } from '../types';

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);

interface SepticTankRequestFormProps {
  onBack: () => void;
  selectedFarmCycleDetails: SelectedFarmCycleDetails | null;
  currentUser: User;
  onAddRequest: (request: Omit<SepticTankRequest, 'id' | 'status' | 'submittedAt'>) => void;
}

const SepticTankRequestForm: React.FC<SepticTankRequestFormProps> = ({ onBack, selectedFarmCycleDetails, currentUser, onAddRequest }) => {
    const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
    const [trips, setTrips] = useState('1');
    const [error, setError] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!requestDate) {
            setError('Request date is required.');
            return;
        }
        const tripsNum = parseInt(trips, 10);
        if (isNaN(tripsNum) || tripsNum < 1) {
            setError('Number of trips must be at least 1.');
            return;
        }

        const requestPayload = {
            farmName: selectedFarmCycleDetails?.farmName || '',
            department: selectedFarmCycleDetails?.farmName || '',
            requestedBy: currentUser.name,
            requesterContact: currentUser.contactNumber,
            requestDate,
            trips,
        };
        onAddRequest(requestPayload);
        setIsSubmitted(true);
        setTimeout(() => {
            setIsSubmitted(false);
            onBack();
        }, 3000);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const form = (e.currentTarget as HTMLElement).closest('form');
            if (!form) return;

            const focusable = Array.from(form.querySelectorAll<HTMLElement>('input:not([disabled]), select:not([disabled])'));
            const currentIndex = focusable.indexOf(e.currentTarget as HTMLElement);
            
            let nextIndex = -1;
            if (e.key === 'ArrowDown') {
                nextIndex = (currentIndex + 1) % focusable.length;
            } else { // ArrowUp
                nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
            }

            if (nextIndex !== -1) {
                (focusable[nextIndex] as HTMLElement).focus();
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6 border-b pb-4">
                <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                    <BackArrowIcon />
                </button>
                <h3 className="text-xl font-semibold text-gray-800">Submit Septic Tank Request</h3>
            </div>
            
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department</label>
                    <input id="department" type="text" value={selectedFarmCycleDetails?.farmName || ''} readOnly className="mt-1 w-full p-2 border bg-gray-100 border-gray-300 rounded-md" />
                </div>
                <div>
                    <label htmlFor="requestedBy" className="block text-sm font-medium text-gray-700">Requested By</label>
                    <input id="requestedBy" type="text" value={currentUser.name} readOnly className="mt-1 w-full p-2 border bg-gray-100 border-gray-300 rounded-md" />
                </div>
                <div>
                    <label htmlFor="requestDate" className="block text-sm font-medium text-gray-700">Request Date</label>
                    <input id="requestDate" type="date" value={requestDate} onKeyDown={handleKeyDown} onChange={(e) => setRequestDate(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                    <label htmlFor="trips" className="block text-sm font-medium text-gray-700">Number of Trips</label>
                    <input id="trips" type="number" min="1" value={trips} onKeyDown={handleKeyDown} onChange={(e) => setTrips(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                </div>
            </div>

            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            
            <div className="mt-6 flex justify-end items-center gap-4">
                {isSubmitted && <span className="text-green-600 text-sm mr-auto">Request submitted successfully!</span>}
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                    Submit Request
                </button>
            </div>
        </form>
    );
};

export default SepticTankRequestForm;
