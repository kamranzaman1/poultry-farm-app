
import React, { useState, useMemo, useEffect } from 'react';
import type { Cycle, User } from '../types';
import { FARM_NAMES } from '../constants';
import FinishCycleModal from './FinishCycleModal';

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

// Define a local type for the form state
interface FarmSelection {
    farmName: string;
    cropNo: string;
    startDate: string;
    isSelected: boolean;
}

const initializeFarms = (): FarmSelection[] => FARM_NAMES.map(farmName => ({ 
    farmName, 
    cropNo: '', 
    startDate: new Date().toISOString().split('T')[0],
    isSelected: false,
}));

interface CycleManagementFormProps {
  cycles: Cycle[];
  activeCycle: Cycle | null;
  currentUser: User;
  onStartNewCycle: (cycleData: Omit<Cycle, 'id'>) => void;
  onUpdateFarmCycleDetails: (cycleId: string, farmName: string, details: { cropNo: string; startDate: string }) => void;
  onFinishFarmCycle: (cycleId: string, farmName: string, finishDate: string) => void;
  onReopenFarmCycle: (cycleId: string, farmName: string) => void;
  onVerifyAdminPassword: (password: string) => boolean;
  onBack: () => void;
}

const EditCycleFarmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (details: { cropNo: string; startDate: string }) => void;
    farmDetails: { cycleId: string; farmName: string; cropNo: string; startDate: string; cycleNo: string; } | null;
}> = ({ isOpen, onClose, onConfirm, farmDetails }) => {
  const [details, setDetails] = useState({ cropNo: '', startDate: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (farmDetails) {
      setDetails({ cropNo: farmDetails.cropNo, startDate: farmDetails.startDate });
      setError('');
    }
  }, [farmDetails]);

  if (!isOpen || !farmDetails) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = () => {
    if (!details.cropNo.trim() || !details.startDate) {
      setError('Crop No. and Start Date are required.');
      return;
    }
    onConfirm(details);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-cycle-farm-title"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 id="edit-cycle-farm-title" className="text-lg font-semibold text-gray-800">
          Edit Farm Details
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          For <span className="font-bold">{farmDetails.farmName}</span> in Cycle <span className="font-mono">{farmDetails.cycleNo}</span>.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="cropNo" className="block text-sm font-medium text-gray-700 mb-1">
              Crop No.
            </label>
            <input
              id="cropNo"
              name="cropNo"
              type="text"
              value={details.cropNo}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${error && !details.cropNo.trim() ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={details.startDate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${error && !details.startDate ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};


const CycleManagementForm: React.FC<CycleManagementFormProps> = ({ cycles, activeCycle, currentUser, onStartNewCycle, onUpdateFarmCycleDetails, onFinishFarmCycle, onReopenFarmCycle, onVerifyAdminPassword, onBack }) => {
  const [cycleNo, setCycleNo] = useState('');
  const [farms, setFarms] = useState<FarmSelection[]>(initializeFarms());
  const [error, setError] = useState('');

  // State for the finish modal
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [finishingFarm, setFinishingFarm] = useState<{ cycleId: string; farmName: string; cycleNo: string; initialDate?: string | null } | null>(null);

  // State for the edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFarm, setEditingFarm] = useState<{ cycleId: string; cycleNo: string; farmName: string; cropNo: string; startDate: string; } | null>(null);

  // State for the unlock modal
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockingFarm, setUnlockingFarm] = useState<{ cycleId: string; farmName: string } | null>(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const handleFarmDetailChange = (farmName: string, field: 'cropNo' | 'startDate', value: string) => {
    setFarms(prev => prev.map(f => f.farmName === farmName ? { ...f, [field]: value } : f));
  };

  const handleFarmSelectionChange = (farmName: string) => {
      setFarms(prev => prev.map(f => f.farmName === farmName ? { ...f, isSelected: !f.isSelected } : f));
  };
  
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { checked } = e.target;
      setFarms(prev => prev.map(f => ({ ...f, isSelected: checked })));
  };

  const areAllSelected = useMemo(() => farms.every(f => f.isSelected), [farms]);

  const handleStartCycle = () => {
    setError(''); // Clear previous errors

    if (!cycleNo.trim()) {
        setError('Cycle No. is required.');
        return;
    }

    if (activeCycle) {
        setError('An active cycle is already running. Please finish all farms in the active cycle to start a new one.');
        return;
    }

    const selectedFarms = farms.filter(f => f.isSelected);

    if (selectedFarms.length === 0) {
        setError('Please select at least one farm to start the cycle.');
        return;
    }

    if (selectedFarms.some(f => !f.startDate || !f.cropNo.trim())) {
        setError('A Start Date and Crop No. are required for every selected farm.');
        return;
    }
    
    // Prepare data for submission by removing the isSelected flag
    const farmsToSubmit = selectedFarms.map(({ isSelected, ...rest }) => rest);

    onStartNewCycle({
        cycleNo,
        farms: farmsToSubmit,
    });
    
    // Reset form
    setCycleNo('');
    setFarms(initializeFarms());
  };

  const handleOpenFinishModal = (cycleId: string, cycleNo: string, farmName: string, initialDate?: string | null) => {
    setFinishingFarm({ cycleId, cycleNo, farmName, initialDate });
    setIsFinishModalOpen(true);
  };
  
  const handleConfirmFinish = (finishDate: string) => {
    if (finishingFarm) {
        onFinishFarmCycle(finishingFarm.cycleId, finishingFarm.farmName, finishDate);
    }
    setIsFinishModalOpen(false);
    setFinishingFarm(null);
  };

  const handleOpenEditModal = (cycleId: string, cycleNo: string, farm: { farmName: string; cropNo: string; startDate: string; }) => {
    setEditingFarm({ cycleId, cycleNo, ...farm });
    setIsEditModalOpen(true);
  };
  
  const handleConfirmEdit = (details: { cropNo: string; startDate: string }) => {
    if (editingFarm) {
        onUpdateFarmCycleDetails(editingFarm.cycleId, editingFarm.farmName, details);
    }
    setIsEditModalOpen(false);
    setEditingFarm(null);
  };

  const handleOpenUnlockModal = (cycleId: string, farmName: string) => {
    setUnlockingFarm({ cycleId, farmName });
    setUnlockPassword('');
    setUnlockError('');
    setIsUnlockModalOpen(true);
  };
  
  const handleConfirmUnlock = () => {
    const isValid = onVerifyAdminPassword(unlockPassword);
    if (isValid && unlockingFarm) {
        onReopenFarmCycle(unlockingFarm.cycleId, unlockingFarm.farmName);
        setIsUnlockModalOpen(false);
    } else {
        setUnlockError('Incorrect password. Please try again.');
    }
  };
  
  const sortedCycles = [...cycles].sort((a,b) => b.id.localeCompare(a.id));

  return (
    <>
      <div className="space-y-8">
        {/* Form to start a new cycle */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-4 mb-6 border-b pb-4">
             <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                  <BackArrowIcon />
              </button>
              <h3 className="text-xl font-semibold text-gray-800">Cycle Management</h3>
          </div>
          
          <h4 className="text-lg font-semibold text-gray-700 mb-4">Start New Cycle</h4>
          
          {activeCycle && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm rounded-md" role="alert">
                  <p><span className="font-bold">Active Cycle Running:</span> Cycle <span className="font-mono">{activeCycle.cycleNo}</span> has active farms. Please finish all farms in the active cycle to start a new one.</p>
              </div>
          )}
          
          <div className="mb-4">
              <label htmlFor="cycleNo" className="block text-sm font-medium text-gray-700">Cycle No.</label>
              <input id="cycleNo" type="text" value={cycleNo} onChange={e => setCycleNo(e.target.value)} disabled={!!activeCycle} className="mt-1 w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"/>
          </div>

          <div>
              <div className="flex justify-between items-center mb-2">
                  <h5 className="text-md font-semibold text-gray-600">Farm Details</h5>
                  <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={areAllSelected} onChange={handleSelectAll} disabled={!!activeCycle} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"/>
                      Select All
                  </label>
              </div>
              <div className="space-y-2 p-4 border rounded-md max-h-80 overflow-y-auto">
                  {farms.map(({ farmName, cropNo, startDate, isSelected }) => (
                      <div key={farmName} className={`p-3 rounded-md transition-colors ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}>
                          <label className="flex items-center font-medium text-gray-800 cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  checked={isSelected} 
                                  onChange={() => handleFarmSelectionChange(farmName)} 
                                  disabled={!!activeCycle} 
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                              />
                              {farmName}
                          </label>
                          {isSelected && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end mt-2 pl-7">
                                  <div>
                                      <label htmlFor={`cropNo-${farmName}`} className="block text-xs font-medium text-gray-600">Crop No.</label>
                                      <input id={`cropNo-${farmName}`} type="text" value={cropNo} onChange={e => handleFarmDetailChange(farmName, 'cropNo', e.target.value)} disabled={!!activeCycle} className="mt-1 w-full px-2 py-1 border border-gray-300 rounded-md disabled:bg-gray-100"/>
                                  </div>
                                  <div>
                                      <label htmlFor={`startDate-${farmName}`} className="block text-xs font-medium text-gray-600">Start Date</label>
                                      <input id={`startDate-${farmName}`} type="date" value={startDate} onChange={e => handleFarmDetailChange(farmName, 'startDate', e.target.value)} disabled={!!activeCycle} className="mt-1 w-full px-2 py-1 border border-gray-300 rounded-md disabled:bg-gray-100"/>
                                  </div>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
          
          {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
          
          <div className="mt-6 flex justify-end">
              <button onClick={handleStartCycle} disabled={!!activeCycle} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  Start Cycle
              </button>
          </div>
        </div>

        {/* List of existing cycles */}
        <div className="bg-white p-6 rounded-lg shadow-md">
           <h4 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Cycle History</h4>
           {sortedCycles.length === 0 ? (
               <p className="text-gray-500">No cycles have been started yet.</p>
           ) : (
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                  {sortedCycles.map(cycle => (
                      <li key={cycle.id} className="p-4 border rounded-md bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                               <p className="font-bold text-gray-800">Cycle No: <span className="font-mono">{cycle.cycleNo}</span></p>
                               <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cycle.id === activeCycle?.id ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {cycle.id === activeCycle?.id ? 'Active' : 'Finished'}
                              </span>
                          </div>
                          <details className="mt-2 text-sm">
                              <summary className="cursor-pointer text-blue-600">View Farm Details</summary>
                              <div className="overflow-x-auto mt-2">
                                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                                      <thead className="bg-gray-100">
                                          <tr>
                                              <th className="px-2 py-2 text-left font-medium text-gray-600">Farm</th>
                                              <th className="px-2 py-2 text-left font-medium text-gray-600">Crop No.</th>
                                              <th className="px-2 py-2 text-left font-medium text-gray-600">Start Date</th>
                                              <th className="px-2 py-2 text-left font-medium text-gray-600">Finish Date</th>
                                              <th className="px-2 py-2 text-left font-medium text-gray-600">Status</th>
                                          </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                          {cycle.farms.map(farm => (
                                              <tr key={farm.farmName}>
                                                  <td className="px-2 py-2 font-semibold">{farm.farmName}</td>
                                                  <td className="px-2 py-2">{farm.cropNo}</td>
                                                  <td className="px-2 py-2">{farm.startDate}</td>
                                                  <td className="px-2 py-2 flex items-center gap-2">
                                                      {farm.finishDate || 'N/A'}
                                                      {farm.finishDate && currentUser.role === 'Admin' && (
                                                          <button onClick={() => handleOpenFinishModal(cycle.id, cycle.cycleNo, farm.farmName, farm.finishDate)} className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                                                              Edit
                                                          </button>
                                                      )}
                                                  </td>
                                                  <td className="px-2 py-2">
                                                      {!farm.finishDate ? (
                                                          <div className="flex items-center gap-2">
                                                              <span className="text-green-700 font-bold">Active</span>
                                                              <button onClick={() => handleOpenFinishModal(cycle.id, cycle.cycleNo, farm.farmName)} className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                                                                  Finish
                                                              </button>
                                                              {currentUser.role === 'Admin' && (
                                                                <button onClick={() => handleOpenEditModal(cycle.id, cycle.cycleNo, farm)} className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                                                                    Edit
                                                                </button>
                                                              )}
                                                          </div>
                                                      ) : (
                                                          <div className="flex items-center gap-2">
                                                            <span className="text-red-700 font-bold">Finished</span>
                                                            {currentUser.role === 'Admin' && (
                                                                <button onClick={() => handleOpenUnlockModal(cycle.id, farm.farmName)} className="px-2 py-0.5 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600">
                                                                    Unlock
                                                                </button>
                                                            )}
                                                          </div>
                                                      )}
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </details>
                      </li>
                  ))}
              </ul>
           )}
        </div>
      </div>

      {finishingFarm && (
        <FinishCycleModal
            isOpen={isFinishModalOpen}
            onClose={() => setIsFinishModalOpen(false)}
            onConfirm={handleConfirmFinish}
            farmName={finishingFarm.farmName}
            cycleNo={finishingFarm.cycleNo}
            initialDate={finishingFarm.initialDate}
        />
      )}

      {editingFarm && (
        <EditCycleFarmModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onConfirm={handleConfirmEdit}
            farmDetails={editingFarm}
        />
      )}

      {isUnlockModalOpen && unlockingFarm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
          onClick={() => setIsUnlockModalOpen(false)}
        >
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800">Admin Confirmation</h3>
            <p className="text-sm text-gray-600 mt-1">
              Please enter your password to unlock the cycle for <span className="font-bold">{unlockingFarm.farmName}</span>. This will allow new data to be entered.
            </p>
            <div className="mt-4">
              <label htmlFor="unlockPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Password
              </label>
              <input
                id="unlockPassword"
                type="password"
                value={unlockPassword}
                onChange={(e) => {
                  setUnlockPassword(e.target.value);
                  if (unlockError) setUnlockError('');
                }}
                className={`w-full px-3 py-2 border ${unlockError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
              />
              {unlockError && <p className="mt-1 text-sm text-red-600">{unlockError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setIsUnlockModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg">Cancel</button>
              <button onClick={handleConfirmUnlock} className="px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg">Confirm Unlock</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CycleManagementForm;
