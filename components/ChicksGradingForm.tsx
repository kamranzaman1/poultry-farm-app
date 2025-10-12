import React, { useState, useMemo, useEffect } from 'react';
import type { ChicksGradingData, SelectedFarmCycleDetails } from '../types';
import { getHouseCountForFarm } from '../constants';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Label } from 'recharts';

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const AlertTriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-yellow-500">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const SAMPLE_SIZE = 160;
const safeNum = (val: string) => Number(val) || 0;

interface ChicksGradingFormProps {
  farmName: string;
  initialData: ChicksGradingData;
  onUpdate: (farmName: string, data: ChicksGradingData) => void;
  onBack: () => void;
  selectedFarmCycleDetails: SelectedFarmCycleDetails | null;
}

const ChicksGradingForm: React.FC<ChicksGradingFormProps> = ({ farmName, initialData, onUpdate, onBack, selectedFarmCycleDetails }) => {
    const [data, setData] = useState(initialData);
    const [selectedHouses, setSelectedHouses] = useState<number[]>([]);
    const [isSaved, setIsSaved] = useState(false);
    const houseCount = useMemo(() => getHouseCountForFarm(farmName), [farmName]);

    useEffect(() => {
        const adjustedHouses = Array.from({ length: houseCount }, (_, i) => 
            initialData.houses[i] || { gradeA: '', gradeB: '', gradeC: '' }
        );
        setData({ ...initialData, houses: adjustedHouses });
    }, [initialData, houseCount]);

    const isLocked = !selectedFarmCycleDetails || !!selectedFarmCycleDetails.finishDate;
    const lockMessage = !selectedFarmCycleDetails 
        ? "An active cycle is required to enter grading data."
        : `The cycle for this farm finished on ${selectedFarmCycleDetails.finishDate}. This form is read-only.`;

    const handleInputChange = (originalIndex: number, field: 'gradeA' | 'gradeB' | 'gradeC', value: string) => {
        setData(prev => {
            const newHouses = [...prev.houses];
            newHouses[originalIndex] = { ...newHouses[originalIndex], [field]: value };
            return { ...prev, houses: newHouses };
        });
    };

    const handleHouseSelection = (houseNum: number) => {
        setSelectedHouses(prev =>
            prev.includes(houseNum)
                ? prev.filter(h => h !== houseNum)
                : [...prev, houseNum].sort((a, b) => a - b)
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedHouses(Array.from({ length: houseCount }, (_, i) => i + 1));
        } else {
            setSelectedHouses([]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLocked) return;
        onUpdate(farmName, data);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        e.preventDefault();
        
        const form = (e.currentTarget as HTMLElement).closest('form');
        if (!form) return;

        const currentInput = e.currentTarget as HTMLInputElement;
        const currentVisualRow = parseInt(currentInput.getAttribute('data-visual-index')!, 10);
        const currentCol = parseInt(currentInput.getAttribute('data-col-index')!, 10);
        const totalVisualRows = selectedHouses.length;
        const totalCols = 3;

        let nextVisualRow = currentVisualRow;
        let nextCol = currentCol;

        if (e.key === 'ArrowUp') nextVisualRow = Math.max(0, currentVisualRow - 1);
        if (e.key === 'ArrowDown') nextVisualRow = Math.min(totalVisualRows - 1, currentVisualRow + 1);
        if (e.key === 'ArrowLeft') nextCol = Math.max(0, currentCol - 1);
        if (e.key === 'ArrowRight') nextCol = Math.min(totalCols - 1, currentCol + 1);

        const nextInput = form.querySelector<HTMLInputElement>(`input[data-visual-index="${nextVisualRow}"][data-col-index="${nextCol}"]`);

        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
    };
    
    const calculatedData = useMemo(() => {
        return data.houses.map(house => {
            const gradeA = safeNum(house.gradeA);
            const gradeB = safeNum(house.gradeB);
            const gradeC = safeNum(house.gradeC);
            const total = gradeA + gradeB + gradeC;
            return {
                total,
                percentA: total > 0 ? (gradeA / SAMPLE_SIZE) * 100 : 0,
                percentB: total > 0 ? (gradeB / SAMPLE_SIZE) * 100 : 0,
                percentC: total > 0 ? (gradeC / SAMPLE_SIZE) * 100 : 0,
            };
        });
    }, [data.houses]);

    const chartData = useMemo(() => {
        return selectedHouses.map(houseNum => {
            const index = houseNum - 1;
            const calcs = calculatedData[index];
            if (calcs.total === 0) return null;
            return {
                name: `H${houseNum}`,
                'A Grade': calcs.percentA,
                'B Grade': calcs.percentB,
                'C Grade': calcs.percentC,
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null);
    }, [selectedHouses, calculatedData]);

    return (
        <div className="space-y-8">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-4 mb-6 border-b pb-4">
                    <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                        <BackArrowIcon />
                    </button>
                    <h3 className="text-xl font-semibold text-gray-800">Chicks Grading</h3>
                </div>

                {isLocked && (
                    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm rounded-md" role="alert">
                        <p><span className="font-bold">Notice:</span> {lockMessage}</p>
                    </div>
                )}

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Houses for Grading</label>
                    <div className="p-3 border rounded-md bg-gray-50">
                        <div className="flex justify-end mb-2">
                            <label className="flex items-center text-sm font-medium">
                                <input
                                    type="checkbox"
                                    checked={selectedHouses.length === houseCount}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2">Select All</span>
                            </label>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                            {Array.from({ length: houseCount }, (_, i) => i + 1).map(houseNum => (
                                <label key={houseNum} className="flex items-center text-sm p-1 rounded-md hover:bg-gray-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedHouses.includes(houseNum)}
                                        onChange={() => handleHouseSelection(houseNum)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-gray-800 font-medium">{houseNum}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>


                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-md">
                    Enter the number of chicks for each grade based on a sample size of <span className="font-bold">{SAMPLE_SIZE}</span> chicks per house.
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border">
                        <thead className="bg-gray-50 text-xs">
                            <tr>
                                <th className="px-2 py-2 text-left font-medium text-gray-500">House</th>
                                <th className="px-2 py-2 text-left font-medium text-gray-500">A Grade (Count)</th>
                                <th className="px-2 py-2 text-left font-medium text-gray-500">B Grade (Count)</th>
                                <th className="px-2 py-2 text-left font-medium text-gray-500">C Grade (Count)</th>
                                <th className="px-2 py-2 text-left font-medium text-gray-500">Total</th>
                                <th className="px-2 py-2 text-left font-medium text-gray-500">A%</th>
                                <th className="px-2 py-2 text-left font-medium text-gray-500">B%</th>
                                <th className="px-2 py-2 text-left font-medium text-gray-500">C%</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {selectedHouses.length > 0 ? (
                                selectedHouses.map((houseNum, visualIndex) => {
                                    const originalIndex = houseNum - 1;
                                    const house = data.houses[originalIndex];
                                    if (!house) return null;

                                    return (
                                        <tr key={originalIndex} className={isLocked ? 'bg-gray-50' : ''}>
                                            <td className="px-2 py-1 font-medium text-gray-800">{houseNum}</td>
                                            <td className="p-1"><input type="number" value={house.gradeA} disabled={isLocked} onChange={e => handleInputChange(originalIndex, 'gradeA', e.target.value)} onKeyDown={handleKeyDown} data-visual-index={visualIndex} data-col-index={0} className="w-full p-1 border-gray-300 rounded-md"/></td>
                                            <td className="p-1"><input type="number" value={house.gradeB} disabled={isLocked} onChange={e => handleInputChange(originalIndex, 'gradeB', e.target.value)} onKeyDown={handleKeyDown} data-visual-index={visualIndex} data-col-index={1} className="w-full p-1 border-gray-300 rounded-md"/></td>
                                            <td className="p-1"><input type="number" value={house.gradeC} disabled={isLocked} onChange={e => handleInputChange(originalIndex, 'gradeC', e.target.value)} onKeyDown={handleKeyDown} data-visual-index={visualIndex} data-col-index={2} className="w-full p-1 border-gray-300 rounded-md"/></td>
                                            <td className={`px-2 py-1 font-medium ${calculatedData[originalIndex].total !== SAMPLE_SIZE && calculatedData[originalIndex].total > 0 ? 'text-red-600' : ''}`}>
                                                <div className="flex items-center gap-1">
                                                    {calculatedData[originalIndex].total}
                                                    {calculatedData[originalIndex].total !== SAMPLE_SIZE && calculatedData[originalIndex].total > 0 && <AlertTriangleIcon />}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1 font-mono">{calculatedData[originalIndex].percentA.toFixed(2)}</td>
                                            <td className="px-2 py-1 font-mono">{calculatedData[originalIndex].percentB.toFixed(2)}</td>
                                            <td className="px-2 py-1 font-mono">{calculatedData[originalIndex].percentC.toFixed(2)}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="text-center text-gray-500 py-4">
                                        Please select one or more houses to begin grading.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex justify-end items-center gap-4">
                    {isSaved && <span className="text-green-600 text-sm mr-auto">Saved Successfully</span>}
                    <button type="submit" disabled={isLocked} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50">
                        Save Grading Data
                    </button>
                </div>
            </form>

            <div className="bg-white p-6 rounded-lg shadow-md mt-8">
                <h4 className="text-xl font-semibold text-gray-800 mb-4">Chicks Grading Chart (Selected Houses)</h4>
                {chartData.length > 0 ? (
                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 100]}>
                                    <Label value="Percentage (%)" offset={-5} position="insideBottom" />
                                </XAxis>
                                <YAxis type="category" dataKey="name" width={40} />
                                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                                <Legend />
                                <Bar dataKey="A Grade" stackId="a" fill="#22c55e" />
                                <Bar dataKey="B Grade" stackId="a" fill="#f97316" />
                                <Bar dataKey="C Grade" stackId="a" fill="#ef4444" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-48 bg-gray-50 rounded-md border-2 border-dashed">
                        <p className="text-gray-500">Select houses and enter grading data to see the chart.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChicksGradingForm;