import React, { useState, useMemo, useEffect } from 'react';
import type { CatchingDetailsData, Cycle, CatchingDetailsHouseData } from '../types';
import { getHouseCountForFarm } from '../constants';
import { parsePastedText } from '../utils/dataHelper';

interface CatchingDetailsFormProps {
  farmName: string;
  initialData: CatchingDetailsData;
  onUpdate: (farmName: string, data: CatchingDetailsData) => void;
  cycles: Cycle[];
  onBack: () => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const CatchingDetailsForm: React.FC<CatchingDetailsFormProps> = ({ farmName, initialData, onUpdate, cycles, onBack }) => {
  const [data, setData] = useState<CatchingDetailsData>(initialData);
  const [isSaved, setIsSaved] = useState(false);
  const houseCount = useMemo(() => getHouseCountForFarm(farmName), [farmName]);

  const finishedCycleForFarm = useMemo(() => {
    const farmCycles = cycles
        .map(c => ({
            ...c,
            farmDetails: c.farms.find(f => f.farmName === farmName)
        }))
        .filter(c => c.farmDetails && c.farmDetails.finishDate);

    if (farmCycles.length === 0) return null;

    // Sort by finish date descending to get the latest one
    farmCycles.sort((a, b) => new Date(b.farmDetails!.finishDate!).getTime() - new Date(a.farmDetails!.finishDate!).getTime());
    return farmCycles[0];
  }, [cycles, farmName]);

  useEffect(() => {
    // Ensure data structure matches current house count and initial data
    const adjustedHouses = Array.from({ length: houseCount }, (_, i) => 
      initialData.houses[i] || { electricCounter: '', catchCulls: '', doa: '', catchLoss: '', scaleWtP: '' }
    );
    setData({ cycleId: initialData.cycleId, houses: adjustedHouses });
  }, [initialData, houseCount]);


  if (!finishedCycleForFarm) {
      return (
          <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center gap-4 mb-4">
                  <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                      <BackArrowIcon />
                  </button>
                  <h3 className="text-xl font-semibold text-gray-800">Catching Details</h3>
              </div>
              <p className="text-gray-600">This form is only available for cycles that have been marked as finished.</p>
          </div>
      );
  }

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData(prevData => {
      const newHouses = [...prevData.houses];
      newHouses[index] = { ...newHouses[index], [name]: value };
      return { ...prevData, houses: newHouses };
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(farmName, data);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Fix: Changed e: React.KeyboardEvent<HTMLInputElement> to e: React.KeyboardEvent to make explicit cast necessary.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    
    const form = (e.currentTarget as HTMLElement).closest('form');
    if (!form) return;

    const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[data-row-index]:not([disabled])'));
    const currentInput = e.currentTarget as HTMLInputElement;
    const currentRow = parseInt(currentInput.getAttribute('data-row-index')!, 10);
    const currentCol = parseInt(currentInput.getAttribute('data-col-index')!, 10);
    const totalRows = houseCount;
    const totalCols = 5; // The number of input fields per row

    let nextRow = currentRow;
    let nextCol = currentCol;

    if (e.key === 'ArrowUp') nextRow = Math.max(0, currentRow - 1);
    if (e.key === 'ArrowDown') nextRow = Math.min(totalRows - 1, currentRow + 1);
    if (e.key === 'ArrowLeft') nextCol = Math.max(0, currentCol - 1);
    if (e.key === 'ArrowRight') nextCol = Math.min(totalCols - 1, currentCol + 1);

    const nextInput = inputs.find(input => 
      parseInt(input.getAttribute('data-row-index')!, 10) === nextRow &&
      parseInt(input.getAttribute('data-col-index')!, 10) === nextCol
    ) as HTMLInputElement;

    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTableSectionElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const pastedRows = parsePastedText(text);

    const target = e.target as HTMLInputElement;
    const startRow = parseInt(target.getAttribute('data-row-index')!, 10);
    const startCol = parseInt(target.getAttribute('data-col-index')!, 10);

    if (isNaN(startRow) || isNaN(startCol)) return;

    const colMap: (keyof CatchingDetailsHouseData)[] = ['electricCounter', 'catchCulls', 'doa', 'catchLoss', 'scaleWtP'];

    setData(prevData => {
        const newHouses = prevData.houses.map(h => ({...h}));

        pastedRows.forEach((pastedRow, rowIndex) => {
            const targetRow = startRow + rowIndex;
            if (targetRow < newHouses.length) {
                pastedRow.forEach((pastedCell, colIndex) => {
                    const targetCol = startCol + colIndex;
                    if (targetCol < colMap.length) {
                        const fieldName = colMap[targetCol];
                        (newHouses[targetRow] as any)[fieldName] = pastedCell;
                    }
                });
            }
        });
        
        return { ...prevData, houses: newHouses };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center gap-4 mb-4 border-b pb-4">
        <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
          <BackArrowIcon />
        </button>
        <div className="flex-grow">
          <h3 className="text-xl font-semibold text-gray-800">Catching Details</h3>
          <p className="text-sm text-gray-500">For farm: {farmName} - Cycle: {finishedCycleForFarm.cycleNo}</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">Tip: You can copy and paste a block of cells from Excel into the table.</p>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">House No.</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Electric Counter</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catch Culls</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">D.O.A</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catch Loss</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scale Wt.(P)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200" onPaste={handlePaste}>
            {data.houses.map((house, i) => (
              <tr key={i}>
                <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{i + 1}</td>
                <td className="px-1 py-1"><input type="number" name="electricCounter" value={house.electricCounter} onChange={(e) => handleInputChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={0} className="w-full px-2 py-1 border-gray-200 rounded-md" /></td>
                <td className="px-1 py-1"><input type="number" name="catchCulls" value={house.catchCulls} onChange={(e) => handleInputChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={1} className="w-full px-2 py-1 border-gray-200 rounded-md" /></td>
                <td className="px-1 py-1"><input type="number" name="doa" value={house.doa} onChange={(e) => handleInputChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={2} className="w-full px-2 py-1 border-gray-200 rounded-md" /></td>
                <td className="px-1 py-1"><input type="number" step="0.01" name="catchLoss" value={house.catchLoss} onChange={(e) => handleInputChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={3} className="w-full px-2 py-1 border-gray-200 rounded-md" /></td>
                <td className="px-1 py-1"><input type="number" step="0.01" name="scaleWtP" value={house.scaleWtP} onChange={(e) => handleInputChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={4} className="w-full px-2 py-1 border-gray-200 rounded-md" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 flex justify-end items-center gap-4">
        {isSaved && <span className="text-green-600 text-sm mr-auto">Saved Successfully</span>}
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
          Save Details
        </button>
      </div>
    </form>
  );
};
export default CatchingDetailsForm;