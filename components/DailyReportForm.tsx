import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { FarmDailyData, DailyReport, HouseData, SelectedFarmCycleDetails, ChicksReceivingData, User } from '../types';
import { getHouseCountForFarm } from '../constants';
import PreviewModal from './PreviewModal';
import { parsePastedText } from '../utils/dataHelper';

interface DailyReportFormProps {
  farmName: string;
  dailyReports: DailyReport[];
  onUpdate: (farmName: string, date: string, data: FarmDailyData) => void;
  onBulkUpdate: (farmName: string, updates: { [date: string]: FarmDailyData }) => void;
  onBack: () => void;
  selectedFarmCycleDetails: SelectedFarmCycleDetails | null;
  chicksReceivingData: ChicksReceivingData;
  currentUser: User;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

const XCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-600"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
);

const HelpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-400"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);

const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-500"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

const BulkEditModal = ({ isOpen, onClose, onSave, reports: allReports, houseCount, cycleDetails }) => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(cycleDetails?.startDate || sevenDaysAgo);
    const [endDate, setEndDate] = useState(cycleDetails?.finishDate || today);
    const [editableReports, setEditableReports] = useState<DailyReport[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        const start = new Date(startDate.replace(/-/g, '/'));
        const end = new Date(endDate.replace(/-/g, '/'));
        
        const dateMap = new Map<string, DailyReport>();
        allReports.forEach(r => dateMap.set(r.date, r));

        const reportsInRange: DailyReport[] = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if (dateMap.has(dateStr)) {
                reportsInRange.push(dateMap.get(dateStr)!);
            } else {
                 reportsInRange.push({
                    date: dateStr,
                    houses: Array(houseCount).fill(null).map(() => ({ mortality: '', culls: '', dayWater: '', nightWater: '', minTemp: '', maxTemp: '' })),
                });
            }
        }
        setEditableReports(reportsInRange);

    }, [isOpen, startDate, endDate, allReports, houseCount]);

    const handleDataChange = (date: string, houseIndex: number, field: keyof HouseData, value: string) => {
        setEditableReports(prev => 
            prev.map(report => {
                if (report.date === date) {
                    const newHouses = [...report.houses];
                    newHouses[houseIndex] = { ...newHouses[houseIndex], [field]: value };
                    return { ...report, houses: newHouses };
                }
                return report;
            })
        );
    };

    const handleSave = () => {
        const updates = editableReports.reduce((acc, report) => {
            acc[report.date] = { houses: report.houses };
            return acc;
        }, {} as { [date: string]: FarmDailyData });
        onSave(updates);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-800 p-4 border-b">Bulk Edit Daily Reports</h3>
                <div className="p-4 flex gap-4 items-center">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="ml-2 p-1 border rounded" />
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-700">End Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="ml-2 p-1 border rounded" />
                    </div>
                </div>
                <div className="flex-grow overflow-auto p-4">
                    <table className="min-w-full text-xs border-collapse">
                        <thead className="sticky top-0 bg-gray-100 z-10">
                            <tr>
                                <th className="border p-1 sticky left-0 bg-gray-100">Date</th>
                                {Array.from({ length: houseCount }, (_, i) => (
                                    <React.Fragment key={i}>
                                        <th className="border p-1">H{i+1} Mort</th>
                                        <th className="border p-1">H{i+1} Culls</th>
                                        <th className="border p-1">H{i+1} Water D</th>
                                        <th className="border p-1">H{i+1} Water N</th>
                                        <th className="border p-1">H{i+1} Min T</th>
                                        <th className="border p-1">H{i+1} Max T</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {editableReports.map(report => (
                                <tr key={report.date}>
                                    <td className="border p-1 sticky left-0 bg-white font-mono">{report.date}</td>
                                    {Array.from({ length: houseCount }, (_, i) => {
                                        const house = report.houses[i] || { mortality: '', culls: '', dayWater: '', nightWater: '', minTemp: '', maxTemp: '' };
                                        return (
                                            <React.Fragment key={i}>
                                                <td className="border p-0"><input type="number" value={house.mortality} onChange={e => handleDataChange(report.date, i, 'mortality', e.target.value)} className="w-16 p-1 text-center border-none focus:ring-1 ring-blue-500" /></td>
                                                <td className="border p-0"><input type="number" value={house.culls} onChange={e => handleDataChange(report.date, i, 'culls', e.target.value)} className="w-16 p-1 text-center border-none focus:ring-1 ring-blue-500" /></td>
                                                <td className="border p-0"><input type="number" value={house.dayWater} onChange={e => handleDataChange(report.date, i, 'dayWater', e.target.value)} className="w-16 p-1 text-center border-none focus:ring-1 ring-blue-500" /></td>
                                                <td className="border p-0"><input type="number" value={house.nightWater} onChange={e => handleDataChange(report.date, i, 'nightWater', e.target.value)} className="w-16 p-1 text-center border-none focus:ring-1 ring-blue-500" /></td>
                                                <td className="border p-0"><input type="number" value={house.minTemp} onChange={e => handleDataChange(report.date, i, 'minTemp', e.target.value)} className="w-16 p-1 text-center border-none focus:ring-1 ring-blue-500" /></td>
                                                <td className="border p-0"><input type="number" value={house.maxTemp} onChange={e => handleDataChange(report.date, i, 'maxTemp', e.target.value)} className="w-16 p-1 text-center border-none focus:ring-1 ring-blue-500" /></td>
                                            </React.Fragment>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const ReportHistoryModal = ({
    isOpen,
    onClose,
    onSelectDate,
    dailyReports,
    cycleDetails
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelectDate: (date: string) => void;
    dailyReports: DailyReport[];
    cycleDetails: SelectedFarmCycleDetails | null;
}) => {
    const historyData = useMemo(() => {
        const allDates = new Set<string>();
        const enteredDates = new Set(dailyReports.map(r => r.date));

        // Add all dates that have an entry
        enteredDates.forEach(date => allDates.add(date));

        // Add all dates from the current cycle range, if a cycle is active
        if (cycleDetails && cycleDetails.startDate) {
            const startDate = new Date(cycleDetails.startDate.replace(/-/g, '/'));
            const endDate = cycleDetails.finishDate ? new Date(cycleDetails.finishDate.replace(/-/g, '/')) : new Date();
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                allDates.add(d.toISOString().split('T')[0]);
            }
        }
        
        if (allDates.size === 0) return [];

        const dateList = Array.from(allDates)
            .sort((a, b) => b.localeCompare(a)) // Sort descending (newest first)
            .map(dateStr => ({
                date: dateStr,
                status: enteredDates.has(dateStr) ? 'Entered' : 'Missing',
            }));
        
        return dateList;
    }, [dailyReports, cycleDetails]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-modal-title"
        >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col" style={{ height: 'clamp(400px, 80vh, 600px)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex-shrink-0 flex justify-between items-center p-4 border-b">
                    <h3 id="history-modal-title" className="text-lg font-semibold text-gray-800">Daily Entry History</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <div className="flex-grow overflow-y-auto p-4">
                    {historyData.length === 0 ? (
                        <p className="text-gray-500 text-center">No cycle data available.</p>
                    ) : (
                        <ul className="space-y-2">
                            {historyData.map(({ date, status }) => (
                                <li key={date} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
                                    <div className="flex items-center gap-3">
                                        {status === 'Entered' ? <CheckCircleIcon /> : <XCircleIcon />}
                                        <span className="font-mono text-sm">{date}</span>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status === 'Entered' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {status}
                                        </span>
                                    </div>
                                    <button onClick={() => onSelectDate(date)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                        View
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                 <div className="flex-shrink-0 p-4 border-t bg-gray-50">
                    <button onClick={onClose} className="w-full px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};


const DailyReportForm: React.FC<DailyReportFormProps> = ({ farmName, dailyReports, onUpdate, onBulkUpdate, onBack, selectedFarmCycleDetails, chicksReceivingData, currentUser }) => {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSaved, setIsSaved] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const houseCount = useMemo(() => getHouseCountForFarm(farmName), [farmName]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'restored'>('idle');
  const [importStatus, setImportStatus] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  const autoSaveKey = useMemo(() => `autosave-dailyReport-${farmName}-${date}`, [farmName, date]);

  useEffect(() => {
    if (selectedFarmCycleDetails?.finishDate) {
        const finishDate = new Date(selectedFarmCycleDetails.finishDate.replace(/-/g, '/'));
        finishDate.setHours(23, 59, 59, 999); // Allow entries on the finish day itself
        const selectedDate = new Date(date.replace(/-/g, '/'));

        if (selectedDate > finishDate) {
            setIsLocked(true);
            setLockMessage(`The cycle for this farm finished on ${selectedFarmCycleDetails.finishDate}. Data cannot be entered for a later date.`);
        } else {
            setIsLocked(false);
            setLockMessage('');
        }
    } else {
        setIsLocked(false);
        setLockMessage('');
    }
  }, [date, selectedFarmCycleDetails]);


  const emptyFarmData = useMemo<FarmDailyData>(() => ({
    houses: Array(houseCount).fill(null).map(() => ({
      mortality: '',
      culls: '',
      dayWater: '',
      nightWater: '',
      minTemp: '',
      maxTemp: '',
    })),
  }), [houseCount]);

  const reportForDate = useMemo(() => {
    const report = dailyReports.find(r => r.date === date);
    if (!report) return null;
    // Pad or truncate house data to match the farm's actual house count.
    const adjustedHouses = Array.from({ length: houseCount }, (_, i) =>
      report.houses[i] || { mortality: '', culls: '', dayWater: '', nightWater: '', minTemp: '', maxTemp: '' }
    );
    return { ...report, houses: adjustedHouses };
  }, [dailyReports, date, houseCount]);

  const [data, setData] = useState<FarmDailyData>(reportForDate || emptyFarmData);

  // Effect to load data from localStorage or reset form when date changes
  useEffect(() => {
    const reportForSelectedDate = dailyReports.find(r => r.date === date);

    if (reportForSelectedDate) {
      // Existing report found, use it. Pad or truncate house data
      const adjustedHouses = Array.from({ length: houseCount }, (_, i) =>
        reportForSelectedDate.houses[i] || { mortality: '', culls: '', dayWater: '', nightWater: '', minTemp: '', maxTemp: '' }
      );
      setData({ houses: adjustedHouses });
      setAutoSaveStatus('idle'); // We've loaded official data, so no need for draft status
    } else {
      // No report for this date, try to load a draft from localStorage
      try {
        const savedDraft = localStorage.getItem(autoSaveKey);
        if (savedDraft) {
          setData(JSON.parse(savedDraft));
          setAutoSaveStatus('restored');
          setTimeout(() => setAutoSaveStatus('idle'), 3000);
        } else {
          setData(emptyFarmData);
          setAutoSaveStatus('idle');
        }
      } catch (error) {
        console.error("Failed to load auto-saved draft:", error);
        setData(emptyFarmData);
        setAutoSaveStatus('idle');
      }
    }
  }, [date, dailyReports, emptyFarmData, autoSaveKey, houseCount]);

  // Effect to auto-save data on change
  useEffect(() => {
    const isDataEmpty = data.houses.every(h => Object.values(h).every(val => val === ''));
    if (isDataEmpty || JSON.stringify(data) === JSON.stringify(reportForDate)) {
      return; // Don't save if form is empty or unchanged from official data
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
  }, [data, autoSaveKey, reportForDate]);

  const houseAges = useMemo(() => {
      if (!chicksReceivingData?.houses?.length || !date) return [];
      const currentDate = new Date(date.replace(/-/g, '/'));
      if (isNaN(currentDate.getTime())) return [];

      return chicksReceivingData.houses.map(house => {
          if (house.placementDate) {
              const placementDate = new Date(house.placementDate.replace(/-/g, '/'));
              if (!isNaN(placementDate.getTime()) && currentDate >= placementDate) {
                  const diffTime = currentDate.getTime() - placementDate.getTime();
                  const ageInDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                  return ageInDays;
              }
          }
          return null; // Return null for houses with no placement date or invalid dates
      });
  }, [chicksReceivingData, date]);

  const reportSummary = useMemo(() => {
      const totals = data.houses.reduce((acc, house) => {
          acc.mortality += parseInt(house.mortality, 10) || 0;
          acc.culls += parseInt(house.culls, 10) || 0;
          acc.dayWater += parseInt(house.dayWater, 10) || 0;
          acc.nightWater += parseInt(house.nightWater, 10) || 0;
          return acc;
      }, { mortality: 0, culls: 0, dayWater: 0, nightWater: 0 });

      const validAges = houseAges.filter(age => age !== null && age > 0) as number[];
      const averageAge = validAges.length > 0
          ? (validAges.reduce((sum, age) => sum + age, 0) / validAges.length).toFixed(1)
          : '0.0';

      return { totals, averageAge };
  }, [data.houses, houseAges]);


  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData(prevData => {
      const newHouses = [...prevData.houses];
      newHouses[index] = { ...newHouses[index], [name]: value };
      return { ...newHouses, houses: newHouses };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    onUpdate(farmName, date, data);
    setIsSaved(true);
    try {
        localStorage.removeItem(autoSaveKey);
    } catch (error) {
        console.error("Failed to remove auto-saved draft:", error);
    }
    setAutoSaveStatus('idle');
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleBulkSave = (updates: { [date: string]: FarmDailyData }) => {
    onBulkUpdate(farmName, updates);
    setIsBulkEditOpen(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    
    const form = (e.currentTarget as HTMLElement).closest('form');
    if (!form) return;

    const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[data-row-index]:not([disabled])'));
    const currentInput = e.currentTarget;
    const currentRow = parseInt(currentInput.getAttribute('data-row-index')!, 10);
    const currentCol = parseInt(currentInput.getAttribute('data-col-index')!, 10);
    const totalRows = houseCount;
    const totalCols = 6; // mortality, culls, dayWater, nightWater, minTemp, maxTemp

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

  const handlePaste = (e: React.ClipboardEvent<HTMLTableSectionElement>) => {
    if (isLocked) return;

    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const pastedRows = parsePastedText(text);

    const target = e.target as HTMLInputElement;
    const startRow = parseInt(target.getAttribute('data-row-index')!, 10);
    const startCol = parseInt(target.getAttribute('data-col-index')!, 10);

    if (isNaN(startRow) || isNaN(startCol)) return;

    const colMap: (keyof HouseData)[] = ['mortality', 'culls', 'dayWater', 'nightWater', 'minTemp', 'maxTemp'];

    setData(prevData => {
        const newHouses = prevData.houses.map(h => ({...h})); // Create a copy

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
    <>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-4 mb-4">
          <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
              <BackArrowIcon />
          </button>
          <div className="flex-grow">
              <h3 className="text-xl font-semibold text-gray-800">Daily Farm Report</h3>
              <p className="text-sm text-gray-500">For farm: {farmName}</p>
          </div>
        </div>

        {isLocked && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 text-sm rounded-md" role="alert">
              <p><span className="font-bold">Form Locked:</span> {lockMessage}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 sm:items-end mb-4 p-4 border rounded-md bg-gray-50">
          <div className="flex-grow">
            <label htmlFor="report-date" className="block text-sm font-medium text-gray-700">Date</label>
            <div className="flex items-center gap-2">
                <input type="date" id="report-date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                {currentUser.role === 'Admin' && reportForDate?.meta && (
                    <div className="relative group mt-1">
                        <ClockIcon />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 whitespace-nowrap">
                            Last updated by: <strong>{reportForDate.meta.updatedBy}</strong>
                            <br />
                            At: {new Date(reportForDate.meta.updatedAt).toLocaleString()}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                        </div>
                    </div>
                )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsHistoryModalOpen(true)} className="px-4 py-2 bg-white text-gray-800 font-semibold rounded-lg border border-gray-300 shadow-sm hover:bg-gray-100">
              History
            </button>
             <button type="button" onClick={() => setIsBulkEditOpen(true)} className="px-4 py-2 bg-white text-gray-800 font-semibold rounded-lg border border-gray-300 shadow-sm hover:bg-gray-100">
              Bulk Edit
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4">Tip: You can copy and paste a block of cells from Excel into the table.</p>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">House No.</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mortality</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Culls</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day Water</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Night Water</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Temp</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Temp</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200" onPaste={handlePaste}>
              {data.houses.map((house, i) => (
                <tr key={i} className={isLocked ? 'bg-gray-50' : ''}>
                  <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{i + 1}</td>
                  <td className="px-1 py-1"><input type="text" value={houseAges[i] !== null && houseAges[i]! > 0 ? houseAges[i] : ''} readOnly disabled className="w-16 text-center px-2 py-1 bg-gray-100 border-gray-200 rounded-md" /></td>
                  <td className="px-1 py-1"><input type="number" name="mortality" value={house.mortality} disabled={isLocked} onChange={(e) => handleInputChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={0} className="w-full px-2 py-1 border-gray-200 rounded-md disabled:bg-gray-100" /></td>
                  <td className="px-1 py-1"><input type="number" name="culls" value={house.culls} disabled={isLocked} onChange={(e) => handleInputChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={1} className="w-full px-2 py-1 border-gray-200 rounded-md disabled:bg-gray-100" /></td>
                  <td className="px-1 py-1"><input type="number" name="dayWater" value={house.dayWater} disabled={isLocked} onChange={(e) => handleInputChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={2} className="w-full px-2 py-1 border-gray-200 rounded-md disabled:bg-gray-100" /></td>
                  <td className="px-1 py-1"><input type="number" name="nightWater" value={house.nightWater} disabled={isLocked} onChange={(e) => handleInputChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={3} className="w-full px-2 py-1 border-gray-200 rounded-md disabled:bg-gray-100" /></td>
                  <td className="px-1 py-1"><input type="number" name="minTemp" value={house.minTemp} disabled={isLocked} onChange={(e) => handleInputChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={4} className="w-full px-2 py-1 border-gray-200 rounded-md disabled:bg-gray-100" /></td>
                  <td className="px-1 py-1"><input type="number" name="maxTemp" value={house.maxTemp} disabled={isLocked} onChange={(e) => handleInputChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={5} className="w-full px-2 py-1 border-gray-200 rounded-md disabled:bg-gray-100" /></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
                <tr className="font-bold text-gray-700">
                    <td className="px-2 py-2 text-sm">Total / Avg</td>
                    <td className="px-2 py-2 text-sm text-center">{reportSummary.averageAge}</td>
                    <td className="px-2 py-2 text-sm">{reportSummary.totals.mortality}</td>
                    <td className="px-2 py-2 text-sm">{reportSummary.totals.culls}</td>
                    <td className="px-2 py-2 text-sm">{reportSummary.totals.dayWater}</td>
                    <td className="px-2 py-2 text-sm">{reportSummary.totals.nightWater}</td>
                    <td className="px-2 py-2 text-sm" colSpan={2}></td>
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
          <button type="button" onClick={() => setIsPreviewOpen(true)} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">
            Preview
          </button>
          <button type="submit" disabled={isLocked} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Submit Report
          </button>
        </div>
      </form>

      <PreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title={`Daily Report Preview: ${farmName} on ${date}`}>
        <div className="space-y-4 text-sm">
            <div>
                <h4 className="font-bold text-base text-gray-800 border-b pb-2 mb-2">Totals for {date}</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-gray-600">Average Age:</span> <span className="font-medium text-gray-900">{reportSummary.averageAge}</span>
                    <span className="text-gray-600">Total Mortality:</span> <span className="font-medium text-gray-900">{reportSummary.totals.mortality}</span>
                    <span className="text-gray-600">Total Culls:</span> <span className="font-medium text-gray-900">{reportSummary.totals.culls}</span>
                    <span className="text-gray-600">Total Day Water:</span> <span className="font-medium text-gray-900">{reportSummary.totals.dayWater.toLocaleString()} L</span>
                    <span className="text-gray-600">Total Night Water:</span> <span className="font-medium text-gray-900">{reportSummary.totals.nightWater.toLocaleString()} L</span>
                </div>
            </div>
            <div>
                <h4 className="font-bold text-base text-gray-800 border-b pb-2 mb-2">House Breakdown</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {data.houses.map((house, index) => {
                        const hasData = Object.values(house).some(val => val && val !== '0');
                        if (!hasData) return null;
                        return (
                            <div key={index} className="p-2 bg-gray-50 rounded-md border text-xs">
                                <p className="font-semibold text-gray-800">House {index + 1} (Age: {houseAges[index] || 'N/A'})</p>
                                <div className="grid grid-cols-2 gap-x-2 mt-1">
                                    <span className="text-gray-600">Mortality:</span> <span className="text-gray-900">{house.mortality || '0'}</span>
                                    <span className="text-gray-600">Culls:</span> <span className="text-gray-900">{house.culls || '0'}</span>
                                    <span className="text-gray-600">Day Water:</span> <span className="text-gray-900">{house.dayWater || '0'} L</span>
                                    <span className="text-gray-600">Night Water:</span> <span className="text-gray-900">{house.nightWater || '0'} L</span>
                                    <span className="text-gray-600">Min Temp:</span> <span className="text-gray-900">{house.minTemp || 'N/A'} °C</span>
                                    <span className="text-gray-600">Max Temp:</span> <span className="text-gray-900">{house.maxTemp || 'N/A'} °C</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </PreviewModal>
      
      <ReportHistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        onSelectDate={(selectedDate) => {
            setDate(selectedDate);
            setIsHistoryModalOpen(false);
        }}
        dailyReports={dailyReports}
        cycleDetails={selectedFarmCycleDetails}
      />

      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        onSave={handleBulkSave}
        reports={dailyReports}
        houseCount={houseCount}
        cycleDetails={selectedFarmCycleDetails}
      />
    </>
  );
};

export default DailyReportForm;