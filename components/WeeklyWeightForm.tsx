import React, { useState, useMemo, useEffect } from 'react';
import type { WeeklyWeightData, ChicksReceivingData, SelectedFarmCycleDetails } from '../types';
import { getHouseCountForFarm } from '../constants';
import PreviewModal from './PreviewModal';
import { parsePastedText } from '../utils/dataHelper';

interface WeeklyWeightFormProps {
  farmName: string;
  initialData: WeeklyWeightData;
  onUpdate: (farmName: string, data: WeeklyWeightData) => void;
  chicksReceivingData: ChicksReceivingData;
  selectedFarmCycleDetails: SelectedFarmCycleDetails | null;
  onBack: () => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const periods = ['fourDays', 'sevenDays', 'fourteenDays', 'twentyOneDays'] as const;

const WeeklyWeightForm: React.FC<WeeklyWeightFormProps> = ({ farmName, initialData, onUpdate, chicksReceivingData, selectedFarmCycleDetails, onBack }) => {
  const [data, setData] = useState<WeeklyWeightData>(initialData);
  const [isSaved, setIsSaved] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const houseCount = useMemo(() => getHouseCountForFarm(farmName), [farmName]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'restored'>('idle');

  const autoSaveKey = useMemo(() => `autosave-weeklyWeight-${farmName}`, [farmName]);

  const isInitialDataEmpty = useMemo(() => {
    return !initialData.cropNo && !initialData.cycleNo && initialData.houses.every(h => !h.breed && !h.flock && !h.fourDays.actual && !h.sevenDays.actual && !h.fourteenDays.actual && !h.twentyOneDays.actual);
  }, [initialData]);

  // Effect to load data from localStorage on mount
  useEffect(() => {
    if (isInitialDataEmpty) {
        try {
            const savedDraft = localStorage.getItem(autoSaveKey);
            if (savedDraft) {
                setData(JSON.parse(savedDraft));
                setAutoSaveStatus('restored');
                setTimeout(() => setAutoSaveStatus('idle'), 3000);
            }
        } catch (error) {
            console.error("Failed to load auto-saved draft for weekly weight:", error);
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

  const isLocked = !!selectedFarmCycleDetails?.finishDate;
  const lockMessage = isLocked ? `The cycle for this farm finished on ${selectedFarmCycleDetails.finishDate}. This form is now read-only.` : '';

  useEffect(() => {
    if (selectedFarmCycleDetails) {
      setData(prevData => ({
        ...prevData,
        cycleNo: selectedFarmCycleDetails.cycleNo,
        cropNo: selectedFarmCycleDetails.cropNo,
      }));
    } else {
        // Fallback to chicksReceivingData if no active cycle (e.g., for historical data viewing)
        setData(prevData => ({
            ...prevData,
            cropNo: chicksReceivingData.cropNo || prevData.cropNo,
            cycleNo: chicksReceivingData.cycleNo || prevData.cycleNo,
        }));
    }
  }, [selectedFarmCycleDetails, chicksReceivingData.cropNo, chicksReceivingData.cycleNo]);

  useEffect(() => {
    if (!chicksReceivingData || !chicksReceivingData.houses) {
      return;
    }

    let hasChanged = false;
    const updatedHouses = data.houses.map((house, index) => {
      const newHouse = { 
          ...house,
          fourDays: { ...house.fourDays },
          sevenDays: { ...house.sevenDays },
          fourteenDays: { ...house.fourteenDays },
          twentyOneDays: { ...house.twentyOneDays },
      };

      const chicksHouseData = chicksReceivingData.houses[index];
      if (!chicksHouseData || !chicksHouseData.zeroDayWeight) {
        return house;
      }

      const zeroDayWeight = parseFloat(chicksHouseData.zeroDayWeight);
      if (isNaN(zeroDayWeight) || zeroDayWeight <= 0) {
        return house;
      }
      
      const newFourDaysStd = Math.round(zeroDayWeight * 2.6).toString();
      const newSevenDaysStd = Math.round(zeroDayWeight * 4.3).toString();
      const newFourteenDaysStd = Math.round(zeroDayWeight * 11.3).toString();
      const newTwentyOneDaysStd = Math.round(zeroDayWeight * 21.7).toString();

      if (newHouse.fourDays.standard !== newFourDaysStd) {
        newHouse.fourDays.standard = newFourDaysStd;
        hasChanged = true;
      }
      if (newHouse.sevenDays.standard !== newSevenDaysStd) {
        newHouse.sevenDays.standard = newSevenDaysStd;
        hasChanged = true;
      }
      if (newHouse.fourteenDays.standard !== newFourteenDaysStd) {
        newHouse.fourteenDays.standard = newFourteenDaysStd;
        hasChanged = true;
      }
      if (newHouse.twentyOneDays.standard !== newTwentyOneDaysStd) {
        newHouse.twentyOneDays.standard = newTwentyOneDaysStd;
        hasChanged = true;
      }

      return newHouse;
    });

    if (hasChanged) {
      setData(prevData => ({ ...prevData, houses: updatedHouses }));
    }
  }, [chicksReceivingData, data.houses]);

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData(prevData => ({ ...prevData, [e.target.name]: e.target.value }));
  };
  
  const handleHouseLevelChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const [period, field] = name.split('.');
    
    const newHouses = [...data.houses];
    if (period && field) {
        newHouses[index] = {
            ...newHouses[index],
            [period]: {
                ...newHouses[index][period as typeof periods[number]],
                [field]: value
            }
        };
    } else {
        newHouses[index] = { ...newHouses[index], [name]: value };
    }

    setData({ ...data, houses: newHouses });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
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
    const totalCols = 4; // 4d-act, 7d-act, 14d-act, 21d-act

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
      nextInput.focus();
      nextInput.select();
    }
  };

  const calculatedValues = useMemo(() => {
    return data.houses.map((house, i) => {
        const d0_wt = parseFloat(chicksReceivingData.houses[i]?.zeroDayWeight) || 0;
        const d4_act = parseFloat(house.fourDays.actual) || 0;
        const d7_act = parseFloat(house.sevenDays.actual) || 0;
        const d14_act = parseFloat(house.fourteenDays.actual) || 0;
        const d21_act = parseFloat(house.twentyOneDays.actual) || 0;

        const d4_std = parseFloat(house.fourDays.standard) || 0;
        const d7_std = parseFloat(house.sevenDays.standard) || 0;
        const d14_std = parseFloat(house.fourteenDays.standard) || 0;
        const d21_std = parseFloat(house.twentyOneDays.standard) || 0;

        const placementDate = chicksReceivingData.houses[i]?.placementDate;
        const endDate = selectedFarmCycleDetails?.finishDate ? new Date(selectedFarmCycleDetails.finishDate.replace(/-/g, '/')) : new Date();
        const age = placementDate 
            ? Math.floor((endDate.getTime() - new Date(placementDate.replace(/-/g, '/')).getTime()) / (1000 * 3600 * 24)) + 1 
            : null;

        return {
            age: age && age > 0 ? age : '',
            fourDays: {
                percent: d4_std > 0 ? Math.round((d4_act / d4_std) * 100).toString() : '0',
                gain: d4_act > 0 && d0_wt > 0 ? Math.round((d4_act - d0_wt) / 4).toString() : '0'
            },
            sevenDays: {
                percent: d7_std > 0 ? Math.round((d7_act / d7_std) * 100).toString() : '0',
                gain: d7_act > 0 && d4_act > 0 ? Math.round((d7_act - d4_act) / 3).toString() : '0'
            },
            fourteenDays: {
                percent: d14_std > 0 ? Math.round((d14_act / d14_std) * 100).toString() : '0',
                gain: d14_act > 0 && d7_act > 0 ? Math.round((d14_act - d7_act) / 7).toString() : '0'
            },
            twentyOneDays: {
                percent: d21_std > 0 ? Math.round((d21_act / d21_std) * 100).toString() : '0',
                gain: d21_act > 0 && d14_act > 0 ? Math.round((d21_act - d14_act) / 7).toString() : '0'
            },
        };
    });
  }, [data.houses, chicksReceivingData.houses, selectedFarmCycleDetails]);

  const averages = useMemo(() => {
    const totals = {
      zeroDayWeight: 0,
      uniformityPercent: 0,
      fourDays: { standard: 0, actual: 0, percent: 0, gain: 0 },
      sevenDays: { standard: 0, actual: 0, percent: 0, gain: 0 },
      fourteenDays: { standard: 0, actual: 0, percent: 0, gain: 0 },
      twentyOneDays: { standard: 0, actual: 0, percent: 0, gain: 0 },
    };

    const counts = {
      zeroDayWeight: 0,
      uniformityPercent: 0,
      fourDays: { standard: 0, actual: 0, percent: 0, gain: 0 },
      sevenDays: { standard: 0, actual: 0, percent: 0, gain: 0 },
      fourteenDays: { standard: 0, actual: 0, percent: 0, gain: 0 },
      twentyOneDays: { standard: 0, actual: 0, percent: 0, gain: 0 },
    };
    
    data.houses.forEach((house, i) => {
      // From chicksReceivingData
      const zeroDayWeight = parseFloat(chicksReceivingData.houses[i]?.zeroDayWeight);
      if (!isNaN(zeroDayWeight) && zeroDayWeight > 0) {
        totals.zeroDayWeight += zeroDayWeight;
        counts.zeroDayWeight++;
      }
      const uniformityPercent = parseFloat(chicksReceivingData.houses[i]?.uniformityPercent);
      if (!isNaN(uniformityPercent) && uniformityPercent > 0) {
        totals.uniformityPercent += uniformityPercent;
        counts.uniformityPercent++;
      }

      // Weights and derived values
      const d0_wt = parseFloat(chicksReceivingData.houses[i]?.zeroDayWeight) || 0;
      const d4_act = parseFloat(house.fourDays.actual) || 0;
      const d7_act = parseFloat(house.sevenDays.actual) || 0;
      const d14_act = parseFloat(house.fourteenDays.actual) || 0;
      const d21_act = parseFloat(house.twentyOneDays.actual) || 0;

      const d4_std = parseFloat(house.fourDays.standard) || 0;
      const d7_std = parseFloat(house.sevenDays.standard) || 0;
      const d14_std = parseFloat(house.fourteenDays.standard) || 0;
      const d21_std = parseFloat(house.twentyOneDays.standard) || 0;
      
      // Standard Wt
      if (d4_std > 0) { totals.fourDays.standard += d4_std; counts.fourDays.standard++; }
      if (d7_std > 0) { totals.sevenDays.standard += d7_std; counts.sevenDays.standard++; }
      if (d14_std > 0) { totals.fourteenDays.standard += d14_std; counts.fourteenDays.standard++; }
      if (d21_std > 0) { totals.twentyOneDays.standard += d21_std; counts.twentyOneDays.standard++; }

      // Actual Wt
      if (d4_act > 0) { totals.fourDays.actual += d4_act; counts.fourDays.actual++; }
      if (d7_act > 0) { totals.sevenDays.actual += d7_act; counts.sevenDays.actual++; }
      if (d14_act > 0) { totals.fourteenDays.actual += d14_act; counts.fourteenDays.actual++; }
      if (d21_act > 0) { totals.twentyOneDays.actual += d21_act; counts.twentyOneDays.actual++; }

      // Percentages
      if (d4_act > 0 && d4_std > 0) { totals.fourDays.percent += (d4_act / d4_std) * 100; counts.fourDays.percent++; }
      if (d7_act > 0 && d7_std > 0) { totals.sevenDays.percent += (d7_act / d7_std) * 100; counts.sevenDays.percent++; }
      if (d14_act > 0 && d14_std > 0) { totals.fourteenDays.percent += (d14_act / d14_std) * 100; counts.fourteenDays.percent++; }
      if (d21_act > 0 && d21_std > 0) { totals.twentyOneDays.percent += (d21_act / d21_std) * 100; counts.twentyOneDays.percent++; }

      // Gains
      if (d4_act > 0 && d0_wt > 0) { totals.fourDays.gain += (d4_act - d0_wt) / 4; counts.fourDays.gain++; }
      if (d7_act > 0 && d4_act > 0) { totals.sevenDays.gain += (d7_act - d4_act) / 3; counts.sevenDays.gain++; }
      if (d14_act > 0 && d7_act > 0) { totals.fourteenDays.gain += (d14_act - d7_act) / 7; counts.fourteenDays.gain++; }
      if (d21_act > 0 && d14_act > 0) { totals.twentyOneDays.gain += (d21_act - d14_act) / 7; counts.twentyOneDays.gain++; }
    });

    const calcAvg = (total: number, count: number, round: boolean = true) => {
      if (count === 0) return round ? '0' : '0.00';
      const avg = total / count;
      return round ? Math.round(avg).toString() : avg.toFixed(2);
    };

    const calcAvgPercent = (total: number, count: number) => {
      if (count === 0) return '0%';
      const avg = total / count;
      return Math.round(avg).toString() + '%';
    };

    return {
      zeroDayWeight: calcAvg(totals.zeroDayWeight, counts.zeroDayWeight, false),
      uniformityPercent: calcAvg(totals.uniformityPercent, counts.uniformityPercent, false),
      fourDays: {
        standard: calcAvg(totals.fourDays.standard, counts.fourDays.standard),
        actual: calcAvg(totals.fourDays.actual, counts.fourDays.actual),
        percent: calcAvgPercent(totals.fourDays.percent, counts.fourDays.percent),
        gain: calcAvg(totals.fourDays.gain, counts.fourDays.gain),
      },
      sevenDays: {
        standard: calcAvg(totals.sevenDays.standard, counts.sevenDays.standard),
        actual: calcAvg(totals.sevenDays.actual, counts.sevenDays.actual),
        percent: calcAvgPercent(totals.sevenDays.percent, counts.sevenDays.percent),
        gain: calcAvg(totals.sevenDays.gain, counts.sevenDays.gain),
      },
      fourteenDays: {
        standard: calcAvg(totals.fourteenDays.standard, counts.fourteenDays.standard),
        actual: calcAvg(totals.fourteenDays.actual, counts.fourteenDays.actual),
        percent: calcAvgPercent(totals.fourteenDays.percent, counts.fourteenDays.percent),
        gain: calcAvg(totals.fourteenDays.gain, counts.fourteenDays.gain),
      },
      twentyOneDays: {
        standard: calcAvg(totals.twentyOneDays.standard, counts.twentyOneDays.standard),
        actual: calcAvg(totals.twentyOneDays.actual, counts.twentyOneDays.actual),
        percent: calcAvgPercent(totals.twentyOneDays.percent, counts.twentyOneDays.percent),
        gain: calcAvg(totals.twentyOneDays.gain, counts.twentyOneDays.gain),
      },
    };
  }, [data.houses, chicksReceivingData.houses]);
  
  const hasHouseData = (house: typeof data.houses[0]) => {
      return house.breed || house.flock || periods.some(p => house[p].standard || house[p].actual);
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTableSectionElement>) => {
    if (isLocked) return;

    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const pastedRows = parsePastedText(text);

    const target = e.target as HTMLInputElement;
    const startRow = parseInt(target.getAttribute('data-row-index')!, 10);
    const startCol = parseInt(target.getAttribute('data-col-index')!, 10);

    if (isNaN(startRow) || isNaN(startCol)) return;

    const colMap = ['fourDays.actual', 'sevenDays.actual', 'fourteenDays.actual', 'twentyOneDays.actual'];

    // Transpose paste for a single row of data
    if (pastedRows.length === 1 && pastedRows[0].length > 1) {
        const fieldPath = colMap[startCol];
        if (!fieldPath) return;

        const pastedData = pastedRows[0];
        setData(prevData => {
            const newHouses = prevData.houses.map(h => JSON.parse(JSON.stringify(h))); // Deep copy
            pastedData.forEach((cellValue, index) => {
                const targetRow = startRow + index;
                if (targetRow < newHouses.length) {
                    const [period, field] = fieldPath.split('.');
                    if (newHouses[targetRow][period as keyof typeof newHouses[number]]) {
                        (newHouses[targetRow] as any)[period][field] = cellValue;
                    }
                }
            });
            return { ...prevData, houses: newHouses };
        });
        return;
    }
    
    // Standard block paste
    setData(prevData => {
        const newHouses = prevData.houses.map(h => JSON.parse(JSON.stringify(h))); // Deep copy for nested objects

        pastedRows.forEach((pastedRow, rowIndex) => {
            const targetRow = startRow + rowIndex;
            if (targetRow < newHouses.length) {
                pastedRow.forEach((pastedCell, colIndex) => {
                    const targetCol = startCol + colIndex;
                    if (targetCol < colMap.length) {
                        const fieldPath = colMap[targetCol];
                        const [period, field] = fieldPath.split('.');
                        if (newHouses[targetRow][period as keyof typeof newHouses[number]]) {
                            (newHouses[targetRow] as any)[period][field] = pastedCell;
                        }
                    }
                });
            }
        });

        return { ...prevData, houses: newHouses };
    });
  };

  const handleExportCSV = () => {
    const headers = [
      'House No', 'Breed', 'Flock No.', 'Flock Age', '0 Day Wt.', 'Uniformity %',
      ...periods.flatMap(p => [
        `${p.replace('Days', ' Days')} Standard Wt.`,
        `${p.replace('Days', ' Days')} Actual Wt.`,
        `${p.replace('Days', ' Days')} % From Stndr.`,
        `${p.replace('Days', ' Days')} Daily Gain`
      ])
    ];

    const rows = data.houses.map((house, index) => {
      const chicksHouse = chicksReceivingData.houses[index];
      const calcs = calculatedValues[index];
      
      const rowData = [
        index + 1,
        chicksHouse?.breed || '',
        chicksHouse?.flockNo || '',
        calcs.age,
        chicksHouse?.zeroDayWeight || '0',
        chicksHouse?.uniformityPercent || '0',
        ...periods.flatMap(p => [
          house[p].standard,
          house[p].actual,
          calcs[p].percent,
          calcs[p].gain,
        ])
      ];
      return rowData.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `WeeklyWeight_${farmName.replace('/','-')}_${data.cropNo}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center gap-4 mb-4 border-b pb-4">
          <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
              <BackArrowIcon />
          </button>
          <div className="text-center flex-grow">
              <h3 className="text-lg font-semibold text-gray-800">WEEKLY AVERAGE WEIGHT & DAILY GAIN DETAILS</h3>
          </div>
      </div>

      {isLocked && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm rounded-md" role="alert">
          <p><span className="font-bold">Notice:</span> {lockMessage}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Farm No.:</label>
          <input type="text" value={farmName} disabled className="mt-1 w-full px-3 py-2 border bg-gray-100 border-gray-300 rounded-md" />
        </div>
        <div>
          <label htmlFor="cycleNo" className="block text-sm font-medium text-gray-700">Cycle No.:</label>
          <input type="text" id="cycleNo" name="cycleNo" value={data.cycleNo} disabled className="mt-1 w-full px-3 py-2 border bg-gray-100 border-gray-300 rounded-md" />
        </div>
        <div>
          <label htmlFor="cropNo" className="block text-sm font-medium text-gray-700">Crop No.:</label>
          <input type="text" id="cropNo" name="cropNo" value={data.cropNo} disabled className="mt-1 w-full px-3 py-2 border bg-gray-100 border-gray-300 rounded-md" />
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">Tip: You can copy a block of cells (rows and columns) or a single row of data from Excel and paste it into the table.</p>
      
      <div className="overflow-x-auto text-xs">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead className="bg-gray-50 text-center">
            <tr>
              <th rowSpan={2} className="border p-1">H. No.</th>
              <th rowSpan={2} className="border p-1">Breed</th>
              <th rowSpan={2} className="border p-1">Flock No.</th>
              <th rowSpan={2} className="border p-1">Flock Age</th>
              <th rowSpan={2} className="border p-1">0 Day Wt.</th>
              <th rowSpan={2} className="border p-1">Uniformity %</th>
              <th colSpan={4} className="border p-1">4 DAYS WEIGHT</th>
              <th colSpan={4} className="border p-1">7 DAYS WEIGHT</th>
              <th colSpan={4} className="border p-1">14 DAYS WEIGHT</th>
              <th colSpan={4} className="border p-1">21 DAYS WEIGHT</th>
            </tr>
            <tr>
              {[...Array(4)].map((_, i) => (
                <React.Fragment key={i}>
                  <th className="border p-1 font-medium">Standard Wt.</th>
                  <th className="border p-1 font-medium">Actual Wt.</th>
                  <th className="border p-1 font-medium">% From Stndr. Wt</th>
                  <th className="border p-1 font-medium">Daily Gain</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody onPaste={handlePaste}>
            {data.houses.map((house, i) => {
              const zeroDayWeightStr = chicksReceivingData.houses[i]?.zeroDayWeight;
              const zeroDayWeight = parseFloat(zeroDayWeightStr || '0');
              const uniformityStr = chicksReceivingData.houses[i]?.uniformityPercent;
              const uniformity = parseFloat(uniformityStr || '0');
              return (
              <tr key={i} className={isLocked ? 'bg-gray-50' : ''}>
                <td className="border p-1 text-center font-medium">{i + 1}</td>
                <td className="border p-1"><input type="text" value={chicksReceivingData.houses[i]?.breed || ''} readOnly disabled className="w-full px-1 py-1 bg-gray-100 border-gray-200 rounded-md" /></td>
                <td className="border p-1"><input type="text" value={chicksReceivingData.houses[i]?.flockNo || ''} readOnly disabled className="w-full px-1 py-1 bg-gray-100 border-gray-200 rounded-md" /></td>
                <td className="border p-1 text-center"><input type="text" value={calculatedValues[i].age} readOnly disabled className="w-full bg-gray-100 text-center" /></td>
                <td className="border p-1 text-center"><input type="text" value={zeroDayWeight > 0 ? zeroDayWeight.toFixed(2) : ''} readOnly disabled className="w-full bg-gray-100 text-center" /></td>
                <td className="border p-1 text-center"><input type="text" value={uniformity > 0 ? uniformity.toFixed(2) : ''} readOnly disabled className="w-full bg-gray-100 text-center" /></td>
                
                {/* 4 Days */}
                <td className="border p-1"><input type="number" name="fourDays.standard" value={house.fourDays.standard} disabled readOnly className="w-full px-1 py-1 border-gray-200 rounded-md bg-gray-100" /></td>
                <td className="border p-1"><input type="number" name="fourDays.actual" value={house.fourDays.actual} disabled={isLocked} onChange={(e) => handleHouseLevelChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={0} className="w-full px-1 py-1 border-gray-200 rounded-md disabled:bg-gray-100" /></td>
                <td className="border p-1 text-center"><input type="text" value={calculatedValues[i].fourDays.percent + '%'} readOnly disabled className="w-full bg-gray-100 text-center" /></td>
                <td className="border p-1 text-center"><input type="text" value={calculatedValues[i].fourDays.gain} readOnly disabled className="w-full bg-gray-100 text-center" /></td>
                
                {/* 7 Days */}
                <td className="border p-1"><input type="number" name="sevenDays.standard" value={house.sevenDays.standard} disabled readOnly className="w-full px-1 py-1 border-gray-200 rounded-md bg-gray-100" /></td>
                <td className="border p-1"><input type="number" name="sevenDays.actual" value={house.sevenDays.actual} disabled={isLocked} onChange={(e) => handleHouseLevelChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={1} className="w-full px-1 py-1 border-gray-200 rounded-md disabled:bg-gray-100" /></td>
                <td className="border p-1 text-center"><input type="text" value={calculatedValues[i].sevenDays.percent + '%'} readOnly disabled className="w-full bg-gray-100 text-center" /></td>
                <td className="border p-1 text-center"><input type="text" value={calculatedValues[i].sevenDays.gain} readOnly disabled className="w-full bg-gray-100 text-center" /></td>

                {/* 14 Days */}
                <td className="border p-1"><input type="number" name="fourteenDays.standard" value={house.fourteenDays.standard} disabled readOnly className="w-full px-1 py-1 border-gray-200 rounded-md bg-gray-100" /></td>
                <td className="border p-1"><input type="number" name="fourteenDays.actual" value={house.fourteenDays.actual} disabled={isLocked} onChange={(e) => handleHouseLevelChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={2} className="w-full px-1 py-1 border-gray-200 rounded-md disabled:bg-gray-100" /></td>
                <td className="border p-1 text-center"><input type="text" value={calculatedValues[i].fourteenDays.percent + '%'} readOnly disabled className="w-full bg-gray-100 text-center" /></td>
                <td className="border p-1 text-center"><input type="text" value={calculatedValues[i].fourteenDays.gain} readOnly disabled className="w-full bg-gray-100 text-center" /></td>

                {/* 21 Days */}
                <td className="border p-1"><input type="number" name="twentyOneDays.standard" value={house.twentyOneDays.standard} disabled readOnly className="w-full px-1 py-1 border-gray-200 rounded-md bg-gray-100" /></td>
                <td className="border p-1"><input type="number" name="twentyOneDays.actual" value={house.twentyOneDays.actual} disabled={isLocked} onChange={(e) => handleHouseLevelChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={3} className="w-full px-1 py-1 border-gray-200 rounded-md disabled:bg-gray-100" /></td>
                <td className="border p-1 text-center"><input type="text" value={calculatedValues[i].twentyOneDays.percent + '%'} readOnly disabled className="w-full bg-gray-100 text-center" /></td>
                <td className="border p-1 text-center"><input type="text" value={calculatedValues[i].twentyOneDays.gain} readOnly disabled className="w-full bg-gray-100 text-center" /></td>
              </tr>
              )})}
          </tbody>
          <tfoot className="bg-gray-50 font-bold text-center">
            <tr>
                <td className="border p-1" colSpan={4}>AVE.</td>
                <td className="border p-1">{averages.zeroDayWeight}</td>
                <td className="border p-1">{averages.uniformityPercent}</td>
                
                <td className="border p-1">{averages.fourDays.standard}</td>
                <td className="border p-1">{averages.fourDays.actual}</td>
                <td className="border p-1">{averages.fourDays.percent}</td>
                <td className="border p-1">{averages.fourDays.gain}</td>
                
                <td className="border p-1">{averages.sevenDays.standard}</td>
                <td className="border p-1">{averages.sevenDays.actual}</td>
                <td className="border p-1">{averages.sevenDays.percent}</td>
                <td className="border p-1">{averages.sevenDays.gain}</td>

                <td className="border p-1">{averages.fourteenDays.standard}</td>
                <td className="border p-1">{averages.fourteenDays.actual}</td>
                <td className="border p-1">{averages.fourteenDays.percent}</td>
                <td className="border p-1">{averages.fourteenDays.gain}</td>

                <td className="border p-1">{averages.twentyOneDays.standard}</td>
                <td className="border p-1">{averages.twentyOneDays.actual}</td>
                <td className="border p-1">{averages.twentyOneDays.percent}</td>
                <td className="border p-1">{averages.twentyOneDays.gain}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 flex justify-end items-center gap-4">
        <div className="text-sm mr-auto transition-opacity duration-300 h-5">
            {isSaved && <span className="text-green-600">Submitted Successfully</span>}
            {!isSaved && autoSaveStatus === 'saving' && <span className="text-gray-500">Saving draft...</span>}
            {!isSaved && autoSaveStatus === 'saved' && <span className="text-gray-500">Draft saved.</span>}
            {!isSaved && autoSaveStatus === 'restored' && <span className="text-blue-600">Restored unsaved draft.</span>}
        </div>
        <button type="button" onClick={handleExportCSV} className="px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors">
          Export CSV
        </button>
        <button type="button" onClick={() => setIsPreviewOpen(true)} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">
          Preview
        </button>
        <button type="submit" disabled={isLocked} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Save Details
        </button>
      </div>
      
      <PreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title={`Weekly Weight Preview: ${farmName}`}>
        {/* Preview content can be added here */}
        <p>Preview for Weekly Weight form.</p>
      </PreviewModal>
    </form>
  );
};

export default WeeklyWeightForm;
