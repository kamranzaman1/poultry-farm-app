
import React, { useState, useEffect, useMemo } from 'react';
import type { SalmonellaData, SalmonellaHouseStatus, SelectedFarmCycleDetails, User } from '../types';
import { getHouseCountForFarm } from '../constants';

interface SalmonellaReportFormProps {
  farmName: string;
  initialData: SalmonellaData;
  onUpdate: (farmName: string, data: SalmonellaData) => void;
  selectedFarmCycleDetails: SelectedFarmCycleDetails | null;
  currentUser: User;
  onBack: () => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const SalmonellaReportForm: React.FC<SalmonellaReportFormProps> = ({ farmName, initialData, onUpdate, selectedFarmCycleDetails, currentUser, onBack }) => {
  const [data, setData] = useState<SalmonellaData>(initialData);
  const [isSaved, setIsSaved] = useState(false);
  const houseCount = getHouseCountForFarm(farmName);
  
  const isFormLocked = useMemo(() => {
    if (currentUser.role !== 'Admin') {
      return true;
    }
    return !selectedFarmCycleDetails || !!selectedFarmCycleDetails.finishDate;
  }, [currentUser, selectedFarmCycleDetails]);

  const lockMessage = useMemo(() => {
    if (currentUser.role !== 'Admin') {
      return "This form can only be edited by an Admin.";
    }
    if (!selectedFarmCycleDetails) {
      return "An active cycle is required to enter data.";
    }
    if (selectedFarmCycleDetails.finishDate) {
      return `The cycle for this farm finished on ${selectedFarmCycleDetails.finishDate}. This form is read-only.`;
    }
    return "";
  }, [currentUser, selectedFarmCycleDetails]);


  useEffect(() => {
    // Ensure data structure matches current house count
    const adjustedHouses = Array.from({ length: houseCount }, (_, i) => 
      initialData.houses[i] || { hasSalmonella: false }
    );
    setData({ cycleId: initialData.cycleId, houses: adjustedHouses });
  }, [initialData, houseCount]);

  const handleCheckboxChange = (index: number) => {
    if (isFormLocked) return;
    setData(prevData => {
        const newHouses = [...prevData.houses];
        newHouses[index] = { ...newHouses[index], hasSalmonella: !newHouses[index].hasSalmonella };
        return { ...prevData, houses: newHouses };
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormLocked) return;
    onUpdate(farmName, data);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center gap-4 mb-4 border-b pb-4">
          <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
              <BackArrowIcon />
          </button>
          <div className="flex-grow">
              <h3 className="text-xl font-semibold text-gray-800">Salmonella Report</h3>
              {selectedFarmCycleDetails && <p className="text-sm text-gray-500">For Cycle No: {selectedFarmCycleDetails.cycleNo}</p>}
          </div>
      </div>

      {isFormLocked && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm rounded-md" role="alert">
          <p><span className="font-bold">Notice:</span> {lockMessage}</p>
        </div>
      )}
      
      <div className="space-y-3">
        {data.houses.map((house, i) => (
          <div key={i} className={`p-3 rounded-md flex items-center justify-between transition-colors ${house.hasSalmonella ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border`}>
            <span className={`font-medium ${house.hasSalmonella ? 'text-red-800' : 'text-gray-800'}`}>House {i + 1}</span>
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={house.hasSalmonella}
                disabled={isFormLocked}
                onChange={() => handleCheckboxChange(i)}
                className="h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Positive</span>
            </label>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end items-center gap-4">
        {isSaved && <span className="text-green-600 text-sm mr-auto">Saved Successfully</span>}
        <button type="submit" disabled={isFormLocked} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Save Report
        </button>
      </div>
    </form>
  );
};

export default SalmonellaReportForm;