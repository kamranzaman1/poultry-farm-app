import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { ChicksReceivingData, User, SelectedFarmCycleDetails, ChicksReceivingHouseData } from '../types';
import { getHouseCountForFarm, PRODUCTION_LINE_MAP } from '../constants';
import PreviewModal from './PreviewModal';
import { parsePastedText } from '../utils/dataHelper';
import ChicksReceivingDetailsModal from './ChicksReceivingDetailsModal';

interface ChicksReceivingFormProps {
  farmName: string;
  initialData: ChicksReceivingData;
  onUpdate: (farmName: string, data: ChicksReceivingData) => void;
  currentUser: User;
  selectedFarmCycleDetails: SelectedFarmCycleDetails | null;
  onBack: () => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const HelpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-400"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

const AlertTriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-yellow-500">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const ChicksReceivingForm: React.FC<ChicksReceivingFormProps> = ({ farmName, initialData, onUpdate, currentUser, selectedFarmCycleDetails, onBack }) => {
  const [data, setData] = useState<ChicksReceivingData>(initialData);
  const [isSaved, setIsSaved] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const houseCount = useMemo(() => getHouseCountForFarm(farmName), [farmName]);
  const [lockMessage, setLockMessage] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'restored'>('idle');
  const [editingHouseIndex, setEditingHouseIndex] = useState<number | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoSaveKey = useMemo(() => `autosave-chicksReceiving-${farmName}`, [farmName]);

  const isInitialDataEmpty = useMemo(() => {
    return !initialData.cropNo && !initialData.cycleNo && initialData.houses.every(h => parseFloat(h.netChicksPlaced) === 0 && !h.placementDate);
  }, [initialData]);

  // Effect to load data from localStorage on mount
  useEffect(() => {
    // Only load from draft if the official data is empty
    if (isInitialDataEmpty) {
        try {
            const savedDraft = localStorage.getItem(autoSaveKey);
            if (savedDraft) {
                setData(JSON.parse(savedDraft));
                setAutoSaveStatus('restored');
                setTimeout(() => setAutoSaveStatus('idle'), 3000);
            }
        } catch (error) {
            console.error("Failed to load auto-saved draft for chicks receiving:", error);
        }
    }
  }, [autoSaveKey, isInitialDataEmpty]);

  // Effect to auto-save data on change
  useEffect(() => {
    // Don't save if it's the same as the initial data from props
    if (JSON.stringify(data) === JSON.stringify(initialData)) {
      return;
    }
    
    setAutoSaveStatus('saving');
    const handler = setTimeout(() => {
        try {
            localStorage.setItem(autoSaveKey, JSON.stringify(data));
            setAutoSaveStatus('saved');
        } catch (error) {
            console.error("Failed to auto-save draft:", error);
        }
    }, 2000); // Debounce time: 2 seconds

    return () => clearTimeout(handler);
  }, [data, autoSaveKey, initialData]);

  useEffect(() => {
    // Auto-populate cycle details and production line
    const productionLine = PRODUCTION_LINE_MAP[farmName] || '';
    setData(prevData => ({
      ...prevData,
      cycleNo: selectedFarmCycleDetails?.cycleNo || prevData.cycleNo,
      cropNo: selectedFarmCycleDetails?.cropNo || prevData.cropNo,
      houses: prevData.houses.map(h => ({ ...h, productionLine }))
    }));
  }, [selectedFarmCycleDetails, farmName]);

  const isFormLocked = useMemo(() => {
    if (currentUser.role === 'Admin') {
      setLockMessage('');
      return false;
    }
    if (selectedFarmCycleDetails?.finishDate) {
      setLockMessage(`The cycle for this farm finished on ${selectedFarmCycleDetails.finishDate}. This form is now read-only.`);
      return true;
    }
    // Lock the form if any house has a net placement greater than 0, indicating data has been saved.
    const isDataEntered = initialData.houses.some(h => parseFloat(h.netChicksPlaced) > 0);
    if (isDataEntered) {
        setLockMessage('Chicks receiving details have been submitted and can now only be edited by an Admin.');
        return true;
    }
    setLockMessage('');
    return false;
  }, [currentUser.role, initialData.houses, selectedFarmCycleDetails]);

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData(prevData => ({ ...prevData, [e.target.name]: e.target.value }));
  };

  const handleHouseLevelChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newHouses = [...data.houses];
    const updatedHouse = { ...newHouses[index], [name]: value };

    if (name !== 'placementDate') {
        const noOfBox = parseFloat(updatedHouse.noOfBox) || 0;
        const perBoxChicks = parseFloat(updatedHouse.perBoxChicks) || 0;
        const extraChicks = parseFloat(updatedHouse.extraChicks) || 0;
        const doa = parseFloat(updatedHouse.doa) || 0;

        const gross = (noOfBox * perBoxChicks) + extraChicks;
        const net = gross - doa;

        updatedHouse.grossChicksPlaced = isNaN(gross) ? '0' : gross.toString();
        updatedHouse.netChicksPlaced = isNaN(net) ? '0' : net.toString();
    }
    
    newHouses[index] = updatedHouse;
    setData({ ...data, houses: newHouses });
  };
  
  const handleSaveDetails = (updatedDetails: Partial<ChicksReceivingHouseData>) => {
    if (editingHouseIndex === null) return;
    
    setData(prevData => {
        const newHouses = [...prevData.houses];
        newHouses[editingHouseIndex] = { ...newHouses[editingHouseIndex], ...updatedDetails };
        return { ...prevData, houses: newHouses };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormLocked) return;
    onUpdate(farmName, data);
    setIsSaved(true);
    try {
        localStorage.removeItem(autoSaveKey);
    } catch (error) {
        console.error("Failed to remove auto-saved draft:", error);
    }
    setAutoSaveStatus('idle');
    setTimeout(() => setIsSaved(false), 3000);
  };
  
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ type: 'info', message: 'Processing file...' });

    try {
        const text = await file.text();
        const lines = text.trim().replace(/\r\n/g, '\n').split('\n');
        const headerLine = lines.shift()?.trim().toLowerCase();
        if (!headerLine) throw new Error('CSV is empty or has no header.');
        
        const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

        const headerMap: { [key: string]: keyof ChicksReceivingHouseData } = {
            'house': 'houseNo' as any, // Special case
            'placementdate': 'placementDate',
            'noofbox': 'noOfBox',
            'perboxchicks': 'perBoxChicks',
            'extrachicks': 'extraChicks',
            'doa': 'doa',
            '0dayweightg': 'zeroDayWeight',
            'uniformity': 'uniformityPercent',
            'breed': 'breed',
            'flock': 'flock',
            'flockno': 'flockNo',
            'flockage': 'flockAge',
            'hatcheryno': 'hatcheryNo',
            'productionorderno': 'productionOrderNo',
            'trialorcontrol': 'trialOrControl',
        };

        const indices: { [key in keyof ChicksReceivingHouseData]?: number } = {};
        let houseColIndex = -1;

        Object.entries(headerMap).forEach(([csvHeader, dataKey]) => {
            const index = headers.indexOf(csvHeader);
            if (index !== -1) {
                if (dataKey === 'houseNo' as any) {
                    houseColIndex = index;
                } else {
                    indices[dataKey] = index;
                }
            }
        });
        
        if (houseColIndex === -1) {
            throw new Error("CSV must contain a 'House' column.");
        }

        const newHouses = [...data.houses].map(h => ({...h})); // Create a deep enough copy
        let rowsProcessed = 0;

        for (const line of lines) {
            if (!line.trim()) continue;
            const values = line.split(',');
            const houseNum = parseInt(values[houseColIndex]?.trim(), 10);
            
            if (isNaN(houseNum) || houseNum < 1 || houseNum > houseCount) continue;

            const targetHouseIndex = houseNum - 1;
            const updatedHouse = newHouses[targetHouseIndex];

            Object.entries(indices).forEach(([key, index]) => {
                if (index !== undefined && values[index] !== undefined) {
                    (updatedHouse as any)[key] = values[index].trim();
                }
            });

            const noOfBox = parseFloat(updatedHouse.noOfBox) || 0;
            const perBoxChicks = parseFloat(updatedHouse.perBoxChicks) || 0;
            const extraChicks = parseFloat(updatedHouse.extraChicks) || 0;
            const doa = parseFloat(updatedHouse.doa) || 0;
            updatedHouse.grossChicksPlaced = ((noOfBox * perBoxChicks) + extraChicks).toString();
            updatedHouse.netChicksPlaced = (((noOfBox * perBoxChicks) + extraChicks) - doa).toString();

            newHouses[targetHouseIndex] = updatedHouse;
            rowsProcessed++;
        }

        if (rowsProcessed === 0) throw new Error('No valid data rows found in the CSV file.');

        setData(prev => ({...prev, houses: newHouses}));
        setImportStatus({ type: 'success', message: `Successfully imported data for ${rowsProcessed} houses. Please review and click "Save Details".` });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during import.';
        setImportStatus({ type: 'error', message: errorMessage });
    } finally {
        if (e.target) e.target.value = ''; // Reset file input
    }
  };

  const totals = useMemo(() => {
    return data.houses.reduce((acc, house) => {
        acc.noOfBox += parseFloat(house.noOfBox) || 0;
        acc.extraChicks += parseFloat(house.extraChicks) || 0;
        acc.doa += parseFloat(house.doa) || 0;
        acc.grossChicksPlaced += parseFloat(house.grossChicksPlaced) || 0;
        acc.netChicksPlaced += parseFloat(house.netChicksPlaced) || 0;
        return acc;
    }, {
        noOfBox: 0,
        extraChicks: 0,
        doa: 0,
        grossChicksPlaced: 0,
        netChicksPlaced: 0,
    });
  }, [data.houses]);

  const hasHouseData = (house: typeof data.houses[0]) => {
      return house.placementDate || house.noOfBox || house.perBoxChicks || house.extraChicks || house.doa || house.zeroDayWeight || house.uniformityPercent;
  }
  
  const hasAdditionalDetails = (house: ChicksReceivingHouseData) => {
      return house.breed || house.flock || house.flockNo || house.flockAge || house.hatcheryNo || house.productionOrderNo || house.trialOrControl;
  }

  // Fix: Changed e: React.KeyboardEvent<HTMLInputElement> to e: React.KeyboardEvent to make explicit cast necessary.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();

    const tableBody = (e.currentTarget as HTMLElement).closest('tbody');
    if (!tableBody) return;
    
    const inputs = Array.from(tableBody.querySelectorAll<HTMLInputElement>('input[data-row-index]'));
    const currentInput = e.currentTarget as HTMLInputElement;
    const currentRow = parseInt(currentInput.getAttribute('data-row-index')!, 10);
    const currentCol = parseInt(currentInput.getAttribute('data-col-index')!, 10);
    const totalRows = houseCount;
    const totalCols = 7; // placementDate, noOfBox, perBoxChicks, extraChicks, doa, zeroDayWeight, uniformityPercent

    let nextRow = currentRow;
    let nextCol = currentCol;

    if (e.key === 'ArrowUp') nextRow = Math.max(0, currentRow - 1);
    if (e.key === 'ArrowDown') nextRow = Math.min(totalRows - 1, currentRow + 1);
    if (e.key === 'ArrowLeft') nextCol = Math.max(0, currentCol - 1);
    if (e.key === 'ArrowRight') nextCol = Math.min(totalCols - 1, currentCol + 1);

    const nextInput = inputs.find(input => 
        parseInt(input.getAttribute('data-row-index')!, 10) === nextRow &&
        parseInt(input.getAttribute('data-col-index')!, 10) === nextCol
    );

    if (nextInput) {
        (nextInput as HTMLInputElement).focus();
        (nextInput as HTMLInputElement).select();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTableSectionElement>) => {
    if (isFormLocked) return;

    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const pastedRows = parsePastedText(text);

    const target = e.target as HTMLInputElement;
    const startRow = parseInt(target.getAttribute('data-row-index')!, 10);
    const startCol = parseInt(target.getAttribute('data-col-index')!, 10);

    if (isNaN(startRow) || isNaN(startCol)) return;

    const colMap: (keyof Omit<ChicksReceivingHouseData, 'grossChicksPlaced' | 'netChicksPlaced'>)[] = [
      'placementDate', 'noOfBox', 'perBoxChicks', 'extraChicks', 'doa', 'zeroDayWeight', 'uniformityPercent'
    ];
    
    const recalculateDerived = (house: ChicksReceivingHouseData) => {
        const noOfBox = parseFloat(house.noOfBox) || 0;
        const perBoxChicks = parseFloat(house.perBoxChicks) || 0;
        const extraChicks = parseFloat(house.extraChicks) || 0;
        const doa = parseFloat(house.doa) || 0;
        const gross = (noOfBox * perBoxChicks) + extraChicks;
        const net = gross - doa;
        house.grossChicksPlaced = isNaN(gross) ? '0' : gross.toString();
        house.netChicksPlaced = isNaN(net) ? '0' : net.toString();
        return house;
    };

    // Transpose paste for a single row of data
    if (pastedRows.length === 1 && pastedRows[0].length > 1) {
        const fieldName = colMap[startCol];
        if (!fieldName) return;
        
        const pastedData = pastedRows[0];
        setData(prevData => {
            const newHouses = prevData.houses.map(h => ({ ...h }));
            pastedData.forEach((cellValue, index) => {
                const targetRow = startRow + index;
                if (targetRow < newHouses.length) {
                    const updatedHouse = newHouses[targetRow];
                    (updatedHouse as any)[fieldName] = cellValue;
                    newHouses[targetRow] = recalculateDerived(updatedHouse);
                }
            });
            return { ...prevData, houses: newHouses };
        });
        return;
    }

    // Standard block paste
    setData(prevData => {
        const newHouses = prevData.houses.map(h => ({ ...h }));

        pastedRows.forEach((pastedRow, rowIndex) => {
            const targetRow = startRow + rowIndex;
            if (targetRow < newHouses.length) {
                const updatedHouse = { ...newHouses[targetRow] };

                pastedRow.forEach((pastedCell, colIndex) => {
                    const targetCol = startCol + colIndex;
                    if (targetCol < colMap.length) {
                        const fieldName = colMap[targetCol];
                        (updatedHouse as any)[fieldName] = pastedCell;
                    }
                });
                
                newHouses[targetRow] = recalculateDerived(updatedHouse);
            }
        });
        
        return { ...prevData, houses: newHouses };
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-4 mb-6 border-b pb-4">
            <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                  <BackArrowIcon />
              </button>
              <h3 className="text-xl font-semibold text-gray-800">Chicks Receiving Details</h3>
          </div>

        {isFormLocked && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm rounded-md" role="alert">
            <p><span className="font-bold">Notice:</span> {lockMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
          <div>
            <label htmlFor="cropNo" className="block text-sm font-medium text-gray-700">Crop No.:</label>
            <input 
              type="text" 
              id="cropNo" 
              name="cropNo" 
              value={data.cropNo} 
              disabled
              className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm bg-gray-100 border-gray-300"
            />
          </div>
          <div>
            <label htmlFor="cycleNo" className="block text-sm font-medium text-gray-700">Cycle No.:</label>
            <input 
              type="text" 
              id="cycleNo" 
              name="cycleNo" 
              value={data.cycleNo} 
              disabled
              className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm bg-gray-100 border-gray-300"
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4">Tip: You can copy a block of cells (rows and columns) or a single row of data from Excel and paste it into the table.</p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">House</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placement Date</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. of Box</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Per Box Chicks</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Extra Chicks</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOA (Pcs)</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">0-Day Weight (g)</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uniformity %</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chicks Placed (Gross)</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chicks Placed (Net)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200" onPaste={handlePaste}>
              {data.houses.map((house, i) => {
                const hasError = (parseFloat(house.doa) || 0) > (parseFloat(house.grossChicksPlaced) || 0);
                return (
                <tr key={i}>
                  <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{i + 1}</td>
                  <td className="px-1 py-1 text-center">
                      <button 
                          type="button" 
                          onClick={() => setEditingHouseIndex(i)}
                          disabled={isFormLocked}
                          className="p-1.5 rounded-md text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Edit details for house ${i+1}`}
                      >
                          {hasAdditionalDetails(house) ? <CheckCircleIcon /> : <EditIcon />}
                      </button>
                  </td>
                  <td className="px-1 py-1"><input type="date" name="placementDate" disabled={isFormLocked} value={house.placementDate} onChange={(e) => handleHouseLevelChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={0} className={`w-full px-2 py-1 border rounded-md ${isFormLocked ? 'bg-gray-100' : 'border-gray-300'}`} /></td>
                  <td className="px-1 py-1"><input type="number" name="noOfBox" disabled={isFormLocked} value={house.noOfBox} onChange={(e) => handleHouseLevelChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={1} className={`w-full px-2 py-1 border rounded-md ${isFormLocked ? 'bg-gray-100' : 'border-gray-300'}`} /></td>
                  <td className="px-1 py-1"><input type="number" name="perBoxChicks" disabled={isFormLocked} value={house.perBoxChicks} onChange={(e) => handleHouseLevelChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={2} className={`w-full px-2 py-1 border rounded-md ${isFormLocked ? 'bg-gray-100' : 'border-gray-300'}`} /></td>
                  <td className="px-1 py-1"><input type="number" name="extraChicks" disabled={isFormLocked} value={house.extraChicks} onChange={(e) => handleHouseLevelChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={3} className={`w-full px-2 py-1 border rounded-md ${isFormLocked ? 'bg-gray-100' : 'border-gray-300'}`} /></td>
                  <td className="px-1 py-1"><input type="number" name="doa" disabled={isFormLocked} value={house.doa} onChange={(e) => handleHouseLevelChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={4} className={`w-full px-2 py-1 border rounded-md ${isFormLocked ? 'bg-gray-100' : 'border-gray-300'}`} /></td>
                  <td className="px-1 py-1"><input type="number" step="0.01" name="zeroDayWeight" disabled={isFormLocked} value={house.zeroDayWeight} onChange={(e) => handleHouseLevelChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={5} className={`w-full px-2 py-1 border rounded-md ${isFormLocked ? 'bg-gray-100' : 'border-gray-300'}`} /></td>
                  <td className="px-1 py-1"><input type="number" step="0.01" name="uniformityPercent" disabled={isFormLocked} value={house.uniformityPercent} onChange={(e) => handleHouseLevelChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={6} className={`w-full px-2 py-1 border rounded-md ${isFormLocked ? 'bg-gray-100' : 'border-gray-300'}`} /></td>
                  <td className="px-1 py-1"><input type="number" name="grossChicksPlaced" value={house.grossChicksPlaced} readOnly disabled className="w-full px-2 py-1 bg-gray-100 border-gray-300 rounded-md" /></td>
                  <td className="px-1 py-1">
                    <div className="relative">
                        <input 
                            type="number" 
                            name="netChicksPlaced" 
                            value={house.netChicksPlaced} 
                            readOnly 
                            disabled 
                            className={`w-full px-2 py-1 bg-gray-100 border-gray-300 rounded-md ${hasError ? 'text-red-600 font-bold' : ''}`} 
                        />
                        {hasError && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2" title="Warning: DOA is greater than Gross Chicks Placed, resulting in negative net placement.">
                                <AlertTriangleIcon />
                            </div>
                        )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
            <tfoot className="bg-gray-100">
                  <tr className="font-bold text-gray-800">
                      <td className="px-2 py-2 text-sm" colSpan={2}>Total</td>
                      <td className="px-2 py-2 text-sm"></td>
                      <td className="px-2 py-2 text-sm">{totals.noOfBox}</td>
                      <td className="px-2 py-2 text-sm"></td>
                      <td className="px-2 py-2 text-sm">{totals.extraChicks}</td>
                      <td className="px-2 py-2 text-sm">{totals.doa}</td>
                      <td className="px-2 py-2 text-sm"></td>
                      <td className="px-2 py-2 text-sm"></td>
                      <td className="px-2 py-2 text-sm">{totals.grossChicksPlaced}</td>
                      <td className="px-2 py-2 text-sm">{totals.netChicksPlaced}</td>
                  </tr>
              </tfoot>
          </table>
        </div>

        {importStatus && (
            <div className={`mt-4 text-sm p-3 rounded-md ${
                importStatus.type === 'success' ? 'bg-green-100 text-green-800' :
                importStatus.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }`}>
                {importStatus.message}
            </div>
        )}
        
        <div className="mt-6 flex justify-end items-center gap-4">
          <div className="text-sm mr-auto transition-opacity duration-300 h-5">
              {isSaved && <span className="text-green-600">Submitted Successfully</span>}
              {!isSaved && autoSaveStatus === 'saving' && <span className="text-gray-500">Saving draft...</span>}
              {!isSaved && autoSaveStatus === 'saved' && <span className="text-gray-500">Draft saved.</span>}
              {!isSaved && autoSaveStatus === 'restored' && <span className="text-blue-600">Restored unsaved draft.</span>}
          </div>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv" className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isFormLocked} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50">
                Import CSV
            </button>
             <div className="relative group cursor-pointer">
                <HelpIcon />
                <div className="absolute bottom-full right-0 mb-2 w-72 p-2 bg-gray-700 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                    CSV must have a 'House' column, plus any of the following (case-insensitive): Placement Date, No of Box, Per Box Chicks, Extra Chicks, DOA, 0-Day Weight (g), Uniformity %, Breed, Flock, Flock No, Flock Age, Hatchery No, Production Order No, Trial or Control.
                    <div className="absolute top-full right-3 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700"></div>
                </div>
            </div>
          </div>
          <button type="button" onClick={() => setIsPreviewOpen(true)} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">
            Preview
          </button>
          <button 
            type="submit" 
            disabled={isFormLocked}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Details
          </button>
        </div>

        <PreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title={`Chicks Receiving: ${farmName}`}>
          <div className="space-y-6 text-sm">
              <div>
                  <h4 className="font-bold text-base text-gray-800 border-b pb-2 mb-2">Header Details</h4>
                  <div className="flex justify-between"><span className="text-gray-600">Crop No:</span> <span className="font-medium text-gray-900">{data.cropNo || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Cycle No:</span> <span className="font-medium text-gray-900">{data.cycleNo || 'N/A'}</span></div>
              </div>
              <div>
                  <h4 className="font-bold text-base text-gray-800 border-b pb-2 mb-2">House Data Summary</h4>
                  <div className="space-y-2">
                      {data.houses.map((house, index) => {
                          if (hasHouseData(house)) {
                              return (
                                  <div key={index} className="p-3 bg-gray-50 rounded-md border">
                                      <p className="font-semibold text-gray-800">House {index + 1}</p>
                                      <div className="mt-1 text-xs space-y-1 pl-2">
                                          <div className="flex justify-between"><span className="text-gray-600">Placement Date:</span> <span className="font-medium text-gray-900">{house.placementDate || 'N/A'}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-600">Boxes:</span> <span className="font-medium text-gray-900">{house.noOfBox || 0} @ {house.perBoxChicks || 0}/box</span></div>
                                          <div className="flex justify-between"><span className="text-gray-600">Extra Chicks:</span> <span className="font-medium text-gray-900">{house.extraChicks || 0}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-600">DOA:</span> <span className="font-medium text-red-600">{house.doa || 0}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-600">0-Day Weight (g):</span> <span className="font-medium text-gray-900">{house.zeroDayWeight || 'N/A'}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-600">Uniformity %:</span> <span className="font-medium text-gray-900">{house.uniformityPercent || 'N/A'}</span></div>
                                          <div className="flex justify-between pt-1 border-t mt-1"><span className="text-gray-600">Gross Placed:</span> <span className="font-semibold text-gray-900">{house.grossChicksPlaced}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-600">Net Placed:</span> <span className="font-bold text-blue-600">{house.netChicksPlaced}</span></div>
                                           {hasAdditionalDetails(house) && (
                                              <div className="pt-1 border-t mt-1">
                                                  {house.productionOrderNo && <div className="flex justify-between"><span className="text-gray-600">Prod. Order No:</span> <span className="font-medium text-gray-900">{house.productionOrderNo}</span></div>}
                                                  {house.productionLine && <div className="flex justify-between"><span className="text-gray-600">Prod. Line:</span> <span className="font-medium text-gray-900">{house.productionLine}</span></div>}
                                                  {house.trialOrControl && <div className="flex justify-between"><span className="text-gray-600">Trial/Control:</span> <span className="font-medium text-gray-900">{house.trialOrControl}</span></div>}
                                                  {house.breed && <div className="flex justify-between"><span className="text-gray-600">Breed:</span> <span className="font-medium text-gray-900">{house.breed}</span></div>}
                                                  {house.flock && <div className="flex justify-between"><span className="text-gray-600">Flock:</span> <span className="font-medium text-gray-900">{house.flock}</span></div>}
                                                  {house.flockNo && <div className="flex justify-between"><span className="text-gray-600">Flock No:</span> <span className="font-medium text-gray-900">{house.flockNo}</span></div>}
                                                  {house.flockAge && <div className="flex justify-between"><span className="text-gray-600">Flock Age:</span> <span className="font-medium text-gray-900">{house.flockAge}</span></div>}
                                                  {house.hatcheryNo && <div className="flex justify-between"><span className="text-gray-600">Hatchery No:</span> <span className="font-medium text-gray-900">{house.hatcheryNo}</span></div>}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          }
                          return null;
                      })}
                  </div>
              </div>
              <div className="border-t pt-4 space-y-2 font-medium">
                  <h4 className="font-bold text-base text-gray-800 border-b pb-2 mb-2">Grand Totals</h4>
                  <div className="flex justify-between"><span className="text-gray-600">Total Boxes:</span><span className="text-gray-900">{totals.noOfBox}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Total Extra Chicks:</span><span className="text-gray-900">{totals.extraChicks}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Total DOA:</span><span className="text-red-600">{totals.doa}</span></div>
                  <div className="flex justify-between text-base"><span className="text-gray-600 font-bold">Total Gross Placed:</span><span className="text-gray-900 font-bold">{totals.grossChicksPlaced}</span></div>
                  <div className="flex justify-between text-base"><span className="text-gray-600 font-bold">Total Net Placed:</span><span className="text-blue-700 font-bold">{totals.netChicksPlaced}</span></div>
              </div>
          </div>
        </PreviewModal>
      </form>

      <ChicksReceivingDetailsModal
        isOpen={editingHouseIndex !== null}
        onClose={() => setEditingHouseIndex(null)}
        onSave={handleSaveDetails}
        houseData={editingHouseIndex !== null ? data.houses[editingHouseIndex] : null}
        houseNumber={editingHouseIndex !== null ? editingHouseIndex + 1 : null}
      />
    </>
  );
};

export default ChicksReceivingForm;