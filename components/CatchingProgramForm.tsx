
import React, { useState, useMemo, useEffect } from 'react';
import type { CatchingProgramEntry, AllFarmsChicksReceivingData, AllFarmsSalmonellaData, Cycle } from '../types';
import { getHouseCountForFarm, FARM_NAMES, PRODUCTION_LINE_MAP } from '../constants';

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);

interface CatchingProgramFormProps {
  initialEntries: CatchingProgramEntry[];
  onUpdate: (entries: CatchingProgramEntry[]) => void;
  allFarmsChicksReceivingData: AllFarmsChicksReceivingData;
  allFarmsSalmonellaData: AllFarmsSalmonellaData;
  allFarms: string[];
  cycles: Cycle[];
  activeCycle: Cycle | null;
  selectedCycleId: string | null;
  onBack: () => void;
}

const CatchingProgramForm: React.FC<CatchingProgramFormProps> = ({ 
    initialEntries, 
    onUpdate, 
    allFarmsChicksReceivingData, 
    allFarmsSalmonellaData, 
    allFarms, 
    cycles, 
    activeCycle,
    selectedCycleId,
    onBack 
}) => {
    const [entries, setEntries] = useState(initialEntries);
    const [isSaved, setIsSaved] = useState(false);
    
    const [headerData, setHeaderData] = useState({
        code: '',
        dayAndDate: new Date().toISOString().split('T')[0],
        cycleNo: '',
        plantNo: '',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    });
    
    const [formState, setFormState] = useState({
        farmName: '',
        catchingDate: new Date().toISOString().split('T')[0],
    });
    
    const [houseData, setHouseData] = useState<Record<number, { expectedBirds: string; projectedWt: string }>>({});
    const [selectedHouses, setSelectedHouses] = useState<Record<number, boolean>>({});

    const isLocked = !activeCycle || activeCycle.id !== selectedCycleId;

    useEffect(() => {
        setEntries(initialEntries);
    }, [initialEntries]);

    const enrichedEntries = useMemo(() => {
        if (!selectedCycleId) return [];

        return entries.map(entry => {
            const houseIndex = entry.houseNo - 1;

            const chicksData = (allFarmsChicksReceivingData[entry.farmName] || []).find(d => d.cycleId === selectedCycleId);
            const houseChicks = chicksData?.houses[houseIndex];
            const placementDateStr = houseChicks?.placementDate;
            const salmonellaData = (allFarmsSalmonellaData[entry.farmName] || []).find(d => d.cycleId === selectedCycleId);

            let age = 'N/A';
            if (placementDateStr && entry.catchingDate) {
                const pDate = new Date(placementDateStr.replace(/-/g, '/'));
                const cDate = new Date(entry.catchingDate.replace(/-/g, '/'));
                if (!isNaN(pDate.getTime()) && !isNaN(cDate.getTime())) {
                    age = Math.floor((cDate.getTime() - pDate.getTime()) / (1000 * 3600 * 24)).toString();
                }
            }
            
            return { 
                ...entry, 
                age, 
                productionLine: PRODUCTION_LINE_MAP[entry.farmName] || '',
                productionOrderNo: houseChicks?.productionOrderNo || '',
                breed: houseChicks?.breed || '',
                trialOrControl: houseChicks?.trialOrControl || '',
                hasSalmonella: salmonellaData?.houses[houseIndex]?.hasSalmonella || false,
            };
        }).sort((a, b) => a.catchingDate.localeCompare(b.catchingDate) || a.farmName.localeCompare(b.farmName) || a.houseNo - b.houseNo);
    }, [entries, selectedCycleId, allFarmsChicksReceivingData, allFarmsSalmonellaData]);
    
    useEffect(() => {
        const cycle = cycles.find(c => c.id === selectedCycleId);
        if (cycle) {
            setHeaderData(prev => ({ ...prev, cycleNo: cycle.cycleNo }));
        }
    }, [selectedCycleId, cycles]);

    const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setHeaderData(prev => ({...prev, [name]: value}));
    };

    const handleFormStateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
        if (name === 'farmName') {
            setSelectedHouses({});
            setHouseData({});
        }
    };

    const handleHouseSelectionChange = (houseNo: number) => {
        setSelectedHouses(prev => {
            const newSelection = { ...prev };
            if (newSelection[houseNo]) {
                delete newSelection[houseNo];
                setHouseData(prevData => {
                    const newData = { ...prevData };
                    delete newData[houseNo];
                    return newData;
                });
            } else {
                newSelection[houseNo] = true;
            }
            return newSelection;
        });
    };

    const handleHouseDataChange = (houseNo: number, field: 'expectedBirds' | 'projectedWt', value: string) => {
        setHouseData(prev => ({
            ...prev,
            [houseNo]: {
                ...(prev[houseNo] || { expectedBirds: '', projectedWt: '' }),
                [field]: value
            }
        }));
    };
    
    const handleAddEntry = () => {
        if (!activeCycle) {
            alert("Cannot add an entry: there is no active cycle.");
            return;
        }

        const housesToAdd = Object.keys(selectedHouses).map(Number);
        if (!formState.farmName || housesToAdd.length === 0 || !formState.catchingDate) {
            alert('Please select a farm, at least one house, and a catching date.');
            return;
        }

        const missingData = housesToAdd.some(houseNo => !houseData[houseNo]?.expectedBirds);
        if (missingData) {
            alert('Please enter "Expected Birds" for all selected houses.');
            return;
        }
    
        const newEntriesToAdd: CatchingProgramEntry[] = housesToAdd.map(houseNo => ({
            id: new Date().toISOString() + Math.random() + houseNo,
            farmName: formState.farmName,
            houseNo: houseNo,
            catchingDate: formState.catchingDate,
            expectedBirds: houseData[houseNo].expectedBirds,
            projectedWt: houseData[houseNo].projectedWt || '',
            cycleId: activeCycle.id,
        }));
    
        setEntries(prev => [...prev, ...newEntriesToAdd]);
    
        setSelectedHouses({});
        setHouseData({});
    };

    const handleDeleteEntry = (id: string) => {
        setEntries(prev => prev.filter(entry => entry.id !== id));
    };

    const handleSave = () => {
        onUpdate(entries);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    const handlePrint = () => window.print();

    const handleExportExcel = () => {
        let tableHTML = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Catching Program</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
            <body>
        `;

        tableHTML += `
            <table width="100%">
                <tr><td colspan="10" style="text-align:center; font-weight:bold; font-size: 16px;">AL-Watania Poultry</td></tr>
                <tr><td colspan="10" style="text-align:center; font-size: 12px;">Broiler Production Dep.</td></tr>
                <tr><td colspan="10" style="text-align:center; font-weight:bold; font-size: 14px; border-top: 1px solid black; border-bottom: 1px solid black;">CATCHING PROGRAM</td></tr>
                <tr><td colspan="10">&nbsp;</td></tr>
            </table>
        `;
    
        tableHTML += `
            <table width="100%" border="1">
                <tr>
                    <td><b>Code</b></td><td>${headerData.code}</td>
                    <td colspan="2"><b>Day & Date</b></td><td colspan="2">${headerData.dayAndDate}</td>
                    <td><b>Cycle No.</b></td><td>${headerData.cycleNo}</td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td><b>Plant No.</b></td><td>${headerData.plantNo}</td>
                    <td colspan="2"><b>Time</b></td><td colspan="6">${headerData.time}</td>
                </tr>
            </table>
            <br/>
        `;

        tableHTML += `<table border="1">`;
        tableHTML += `
            <thead style="background-color:#E2EFDA; font-weight:bold; text-align:center;">
                <tr>
                    <th>Production Line</th>
                    <th>Production Order No.</th>
                    <th>Farm No</th>
                    <th>House No</th>
                    <th>Expected Bird</th>
                    <th>Breed</th>
                    <th>Trial/ Control</th>
                    <th>Projected Wt. @ Kill</th>
                    <th>Total Chicken</th>
                    <th style="background-color:white;">Age</th>
                </tr>
            </thead>
        `;
    
        tableHTML += '<tbody>';
        enrichedEntries.forEach(entry => {
            const rowStyle = entry.hasSalmonella ? 'background-color:#fecaca;' : ''; // red-200
            tableHTML += `
                <tr style="text-align:center; ${rowStyle}">
                    <td>${entry.productionLine}</td>
                    <td>${entry.productionOrderNo}</td>
                    <td>${entry.farmName}</td>
                    <td>${entry.houseNo}</td>
                    <td>${entry.expectedBirds}</td>
                    <td>${entry.breed}</td>
                    <td>${entry.trialOrControl}</td>
                    <td>${entry.projectedWt}</td>
                    <td>${entry.expectedBirds}</td>
                    <td style="background-color:white;">${entry.age}</td>
                </tr>
            `;
        });
        tableHTML += '</tbody></table></body></html>';
    
        const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `CatchingProgram_${headerData.dayAndDate}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const availableHouses = formState.farmName ? getHouseCountForFarm(formState.farmName) : 0;
    
    const scheduledHouses = useMemo(() => {
        return new Set(
            entries.filter(e => e.farmName === formState.farmName).map(e => e.houseNo)
        );
    }, [entries, formState.farmName]);


    return (
        <>
        <style>{`
            @media print {
                body * { visibility: hidden; }
                .print-container, .print-container * { visibility: visible; }
                .print-container { position: absolute; left: 0; top: 0; width: 100%; padding: 1rem; }
                .no-print { display: none !important; }
                @page { size: landscape; }
                table { font-size: 10pt !important; }
                input.print-input { border-bottom: 1px dotted black !important; padding: 0 !important; }
                input.print-input[type="date"], input.print-input[type="time"] { border: none; }
            }
        `}</style>
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="no-print flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b pb-4">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                        <BackArrowIcon />
                    </button>
                    <h3 className="text-xl font-semibold text-gray-800">Catching Program</h3>
                </div>
            </div>
            
            {isLocked && (
                <div className="no-print mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm rounded-md" role="alert">
                    <p><span className="font-bold">Read-Only Mode:</span> You are viewing a historical or inactive cycle. The catching program cannot be edited.</p>
                </div>
            )}

            <div className="print-container">
                <div className="text-center mb-4">
                    <h2 className="text-xl font-bold">AL-Watania Poultry</h2>
                    <p className="text-sm">Broiler Production Dep.</p>
                    <h3 className="text-lg font-semibold mt-2 tracking-widest inline-block border-y-2 border-black py-1">CATCHING PROGRAM</h3>
                </div>

                <div className="grid grid-cols-6 gap-x-4 gap-y-2 text-sm mb-4 border border-black p-2">
                    <div className="flex items-center"><label className="font-bold mr-2">Code</label><input type="text" name="code" value={headerData.code} onChange={handleHeaderChange} className="p-1 border-b w-full bg-transparent print-input"/></div>
                    <div className="flex items-center col-span-2"><label className="font-bold mr-2">Day & Date</label><input type="date" name="dayAndDate" value={headerData.dayAndDate} onChange={handleHeaderChange} className="p-1 w-full bg-transparent print-input"/></div>
                    <div className="flex items-center"><label className="font-bold mr-2">Cycle No.</label><input type="text" name="cycleNo" value={headerData.cycleNo} readOnly className="p-1 border-b w-full bg-gray-100 print-input"/></div>
                    <div className="flex items-center col-span-2"><label className="font-bold mr-2">Plant No.</label><input type="text" name="plantNo" value={headerData.plantNo} onChange={handleHeaderChange} className="p-1 border-b w-full bg-transparent print-input"/></div>
                    <div className="flex items-center col-span-6"><label className="font-bold mr-2">Time</label><input type="time" name="time" value={headerData.time} onChange={handleHeaderChange} className="p-1 w-full bg-transparent print-input"/></div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-black text-sm">
                        <thead className="bg-green-100 text-black font-bold">
                            <tr>
                                <th className="border border-black p-1">Production Line</th>
                                <th className="border border-black p-1">Production Order No.</th>
                                <th className="border border-black p-1">Farm No</th>
                                <th className="border border-black p-1">House No</th>
                                <th className="border border-black p-1">Expected Bird</th>
                                <th className="border border-black p-1">Breed</th>
                                <th className="border border-black p-1">Trial/ Control</th>
                                <th className="border border-black p-1">Projected Wt. @ Kill</th>
                                <th className="border border-black p-1">Total Chicken</th>
                                <th className="border border-black p-1 bg-white">Age</th>
                                <th className="border border-black p-1 bg-white no-print">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {enrichedEntries.map(entry => (
                                <tr key={entry.id} className={`text-center ${entry.hasSalmonella ? 'bg-red-200' : ''}`}>
                                    <td className="border border-black p-1">{entry.productionLine}</td>
                                    <td className="border border-black p-1">{entry.productionOrderNo}</td>
                                    <td className="border border-black p-1">{entry.farmName}</td>
                                    <td className="border border-black p-1">{entry.houseNo}</td>
                                    <td className="border border-black p-1">{entry.expectedBirds}</td>
                                    <td className="border border-black p-1">{entry.breed}</td>
                                    <td className="border border-black p-1">{entry.trialOrControl}</td>
                                    <td className="border border-black p-1">{entry.projectedWt}</td>
                                    <td className="border border-black p-1">{entry.expectedBirds}</td>
                                    <td className="border border-black p-1">{entry.age}</td>
                                    <td className="border border-black p-1 no-print">
                                        <button onClick={() => handleDeleteEntry(entry.id)} disabled={isLocked} className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"><TrashIcon /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="no-print mt-6 flex justify-end items-center gap-4">
                {isSaved && <span className="text-green-600 text-sm mr-auto">Program saved successfully!</span>}
                <button onClick={handleExportExcel} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-sm hover:bg-teal-700">Export Excel</button>
                <button onClick={handlePrint} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-700">Print</button>
                <button onClick={handleSave} disabled={isLocked} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">Save Program</button>
            </div>

            <div className="no-print p-4 border rounded-lg bg-gray-50 my-6 space-y-4">
                <h4 className="font-semibold text-gray-700">Add New Entry</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600">Farm</label>
                        <select name="farmName" value={formState.farmName} onChange={handleFormStateChange} disabled={isLocked} className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-200">
                            <option value="">Select Farm...</option>
                            {allFarms.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600">Catching Date (for all selected)</label>
                        <input type="date" name="catchingDate" value={formState.catchingDate} onChange={handleFormStateChange} disabled={isLocked} className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-200"/>
                    </div>
                </div>
                
                {availableHouses > 0 && (
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Select Houses and Enter Details</label>
                        <div className="p-2 border rounded-md bg-white space-y-2 max-h-64 overflow-y-auto">
                            {Array.from({ length: availableHouses }, (_, i) => i + 1).map(h => (
                                <div key={h} className={`p-2 rounded-md transition-colors ${selectedHouses[h] ? 'bg-blue-50 border border-blue-200' : ''}`}>
                                    <label className="flex items-center space-x-2 cursor-pointer font-medium">
                                        <input
                                            type="checkbox"
                                            checked={!!selectedHouses[h]}
                                            onChange={() => handleHouseSelectionChange(h)}
                                            disabled={isLocked || scheduledHouses.has(h)}
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                                        />
                                        <span>House {h} {scheduledHouses.has(h) && <span className="text-xs text-red-500">(Already Scheduled)</span>}</span>
                                    </label>
                                    {selectedHouses[h] && (
                                        <div className="grid grid-cols-2 gap-2 mt-2 pl-6">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500">Expected Birds</label>
                                                <input
                                                    type="number"
                                                    placeholder="e.g., 25000"
                                                    value={houseData[h]?.expectedBirds || ''}
                                                    onChange={(e) => handleHouseDataChange(h, 'expectedBirds', e.target.value)}
                                                    className="mt-1 w-full p-1 border border-gray-300 rounded-md text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500">Projected Wt.</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="e.g., 2.1"
                                                    value={houseData[h]?.projectedWt || ''}
                                                    onChange={(e) => handleHouseDataChange(h, 'projectedWt', e.target.value)}
                                                    className="mt-1 w-full p-1 border border-gray-300 rounded-md text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="flex justify-end pt-2">
                    <button onClick={handleAddEntry} disabled={isLocked} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 text-sm h-10 disabled:opacity-50 disabled:cursor-not-allowed">
                        Add to Program
                    </button>
                </div>
            </div>
        </div>
        </>
    );
};

export default CatchingProgramForm;
