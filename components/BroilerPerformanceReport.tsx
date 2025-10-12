import React, { useState, useMemo, useEffect } from 'react';
import type { Cycle, AllFarmsData, AllFarmsChicksReceivingData, AllFarmsWeeklyWeightData, BroilerPerformanceDataRow, AllFarmsFeedDeliveryData, AllFarmsCatchingDetailsData } from '../types';
import { getHouseCountForFarm } from '../constants';

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const getSiteName = (farmName: string) => {
    if (farmName.startsWith('B2')) return 'Butain 2';
    if (farmName.startsWith('B3')) return 'Butain 3';
    if (farmName.startsWith('She')) return 'Shemalia';
    return 'N/A';
};

interface ReportProps {
    selectedFarm: string;
    cycles: Cycle[];
    allFarmsData: AllFarmsData;
    allFarmsChicksReceivingData: AllFarmsChicksReceivingData;
    allFarmsWeeklyWeightData: AllFarmsWeeklyWeightData;
    allFarmsFeedDeliveryData: AllFarmsFeedDeliveryData;
    allFarmsCatchingDetailsData: AllFarmsCatchingDetailsData;
    onBack: () => void;
}

const BroilerPerformanceReport: React.FC<ReportProps> = ({ selectedFarm, cycles, allFarmsData, allFarmsChicksReceivingData, allFarmsWeeklyWeightData, allFarmsFeedDeliveryData, allFarmsCatchingDetailsData, onBack }) => {
    const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
    
    const finishedCyclesForFarm = useMemo(() => {
        return cycles
            .map(c => ({
                ...c,
                farmDetails: c.farms.find(f => f.farmName === selectedFarm)
            }))
            .filter(c => c.farmDetails && c.farmDetails.finishDate)
            .sort((a, b) => new Date(b.farmDetails!.finishDate!).getTime() - new Date(a.farmDetails!.finishDate!).getTime());
    }, [cycles, selectedFarm]);

    useEffect(() => {
        if (finishedCyclesForFarm.length > 0) {
            const isCurrentCycleValid = finishedCyclesForFarm.some(c => c.id === selectedCycleId);
            if (!isCurrentCycleValid) {
                setSelectedCycleId(finishedCyclesForFarm[0].id);
            }
        } else {
            setSelectedCycleId(null);
        }
    }, [finishedCyclesForFarm, selectedCycleId]);

    const reportData = useMemo(() => {
        if (!selectedCycleId) return null;

        const selectedCycle = finishedCyclesForFarm.find(c => c.id === selectedCycleId);
        if (!selectedCycle || !selectedCycle.farmDetails) return null;

        const { farmDetails, cycleNo, id: cycleId } = selectedCycle;
        const { farmName, startDate, finishDate } = farmDetails;

        if (!startDate || !finishDate) return null;
        
        const startDateObj = new Date(startDate.replace(/-/g, '/'));
        const finishDateObj = new Date(finishDate.replace(/-/g, '/'));
        
        const houseCount = getHouseCountForFarm(farmName);
        const chicksData = (allFarmsChicksReceivingData[farmName] || []).find(d => d.cycleId === cycleId);
        const weeklyData = (allFarmsWeeklyWeightData[farmName] || []).find(d => d.cycleId === cycleId);
        const catchingData = (allFarmsCatchingDetailsData[farmName] || []).find(d => d.cycleId === cycleId);
        
        const dailyData = (allFarmsData[farmName] || []).filter(r => {
            const reportDate = new Date(r.date.replace(/-/g, '/'));
            return reportDate >= startDateObj && reportDate <= finishDateObj;
        });
        
        const feedData = (allFarmsFeedDeliveryData[farmName] || []).filter(r => r.cycleId === cycleId);

        if (!chicksData) return null;
        
        const rows: BroilerPerformanceDataRow[] = [];
        
        for (let i = 0; i < houseCount; i++) {
            const houseChicks = chicksData.houses[i];
            const houseWeekly = weeklyData?.houses[i];
            const houseCatching = catchingData?.houses[i];

            const chickPlaced = parseInt(houseChicks?.netChicksPlaced || '0', 10);
            
            let totalMortality = 0;
            dailyData.forEach(day => {
                totalMortality += parseInt(day.houses[i]?.mortality || '0', 10);
                totalMortality += parseInt(day.houses[i]?.culls || '0', 10);
            });

            let totalFeed = 0;
            feedData.forEach(day => {
                totalFeed += (parseFloat(day.houses[i]?.starter || '0')
                           + parseFloat(day.houses[i]?.growerCR || '0')
                           + parseFloat(day.houses[i]?.growerPL || '0')
                           + parseFloat(day.houses[i]?.finisher || '0'));
            });
            
            const placementDateStr = houseChicks?.placementDate;
            const catchingAge = (placementDateStr && finishDate)
                ? Math.floor((finishDateObj.getTime() - new Date(placementDateStr.replace(/-/g, '/')).getTime()) / (1000 * 3600 * 24))
                : 0;

            const deviation = chickPlaced - totalMortality;
            const livabilityP = chickPlaced > 0 ? (deviation / chickPlaced) * 100 : 0;

            const flockNo = houseChicks?.flockNo || '';
            const flockType = houseChicks?.flock || '';
            const flockDisplay = [flockType, flockNo].filter(Boolean).join(' ') || '-';

            // Catching data and calculations
            const electricCounter = parseFloat(houseCatching?.electricCounter || '0');
            const catchCulls = parseFloat(houseCatching?.catchCulls || '0');
            const doa = parseFloat(houseCatching?.doa || '0');
            const catchLoss = parseFloat(houseCatching?.catchLoss || '0');
            const scaleWtP = parseFloat(houseCatching?.scaleWtP || '0');

            const avgLiveWtP = electricCounter > 0 ? (scaleWtP / electricCounter) : 0;
            const livabilityB = deviation > 0 ? (electricCounter / deviation) * 100 : 0;
            const scaleWtB = scaleWtP + catchLoss;
            const avgLiveWtB = electricCounter > 0 ? (scaleWtB / electricCounter) : 0;
            const fcrB = scaleWtB > 0 ? (totalFeed / scaleWtB) : 0;
            const prodNoB = (fcrB > 0 && catchingAge > 0) ? ((avgLiveWtB * livabilityB) / (fcrB * catchingAge)) : 0;


            rows.push({
                houseNo: i + 1,
                flockNo: flockDisplay,
                flockAge: catchingAge > 0 ? catchingAge : 0,
                breed: houseChicks?.breed || houseWeekly?.breed || 'N/A',
                chickPlaced,
                totalMortality,
                deviation: deviation > 0 ? deviation : 0,
                livabilityP,
                catchingAge: catchingAge > 0 ? catchingAge : 0,
                totalFeed: totalFeed,
                
                electricCounter: houseCatching?.electricCounter || '-',
                catchCulls: houseCatching?.catchCulls || '-',
                doa: houseCatching?.doa || '-',
                catchLoss: houseCatching?.catchLoss || '-',
                scaleWtP: houseCatching?.scaleWtP || '-',
                avgLiveWtP: avgLiveWtP,
                livabilityB: livabilityB,
                scaleWtB: scaleWtB.toFixed(2),
                avgLiveWtB: avgLiveWtB,
                fcrB: fcrB,
                prodNoB: prodNoB,
            });
        }
        
        return { rows, cycleDetails: { ...farmDetails, cycleNo } };
    }, [selectedCycleId, finishedCyclesForFarm, allFarmsData, allFarmsChicksReceivingData, allFarmsWeeklyWeightData, allFarmsFeedDeliveryData, allFarmsCatchingDetailsData]);

    const totals = useMemo(() => {
        if (!reportData) return null;
        return reportData.rows.reduce((acc, row) => {
            acc.chickPlaced += row.chickPlaced;
            acc.totalMortality += row.totalMortality;
            acc.deviation += row.deviation;
            acc.totalFeed += row.totalFeed;
            return acc;
        }, {
            chickPlaced: 0,
            totalMortality: 0,
            deviation: 0,
            totalFeed: 0,
        });
    }, [reportData]);
    
    const handlePrint = () => window.print();
    
    if (finishedCyclesForFarm.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <div className="flex items-center gap-4 mb-4">
                    <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                        <BackArrowIcon />
                    </button>
                    <h3 className="text-xl font-semibold text-gray-800">Broiler Performance Report</h3>
                 </div>
                <p className="text-gray-600">No finished cycles found for farm <span className="font-semibold">{selectedFarm}</span>. This report is only available for cycles that have been marked as complete.</p>
            </div>
        );
    }
    
    if (!reportData || !totals) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-4 mb-4">
                    <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                        <BackArrowIcon />
                    </button>
                    <h3 className="text-xl font-semibold text-gray-800">Broiler Performance Report</h3>
                </div>
                <p className="text-gray-600">Loading report data...</p>
            </div>
        );
    }


    const { rows, cycleDetails } = reportData;
    const rowsWithAge = rows.filter(r => r.catchingAge > 0);
    const avgCatchingAge = rowsWithAge.length > 0 ? rowsWithAge.reduce((sum, row) => sum + row.catchingAge, 0) / rowsWithAge.length : 0;
    
    return (
        <>
        <style>{`
            @media print {
                body * { visibility: hidden; }
                .print-container, .print-container * { visibility: visible; }
                .print-container { position: absolute; left: 0; top: 0; width: 100%; }
                .no-print { display: none !important; }
                @page { size: A4 landscape; margin: 0.5cm; }
                table { font-size: 7pt !important; border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid black; padding: 1px 2px; text-align: center; }
            }
        `}</style>
         <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 no-print">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                        <BackArrowIcon />
                    </button>
                    <h3 className="text-xl font-semibold text-gray-800">Broiler Performance Report</h3>
                </div>
                 <div className="flex items-center gap-4">
                    <div>
                        <label htmlFor="cycle-selector" className="block text-sm font-medium text-gray-700">Select Cycle</label>
                        <select
                            id="cycle-selector"
                            value={selectedCycleId || ''}
                            onChange={(e) => setSelectedCycleId(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            {finishedCyclesForFarm.map(cycle => (
                                <option key={cycle.id} value={cycle.id}>
                                    Cycle {cycle.cycleNo} (Finished: {cycle.farmDetails?.finishDate})
                                </option>
                            ))}
                        </select>
                    </div>
                    <button onClick={handlePrint} className="self-end px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                        Print Report
                    </button>
                </div>
            </div>
            
            <div className="print-container">
                <div className="text-xs p-2">
                    {/* Header */}
                    <div className="grid grid-cols-8 gap-1 font-bold text-center mb-1">
                        <div className="bg-yellow-300 p-1 border border-black col-span-1">{selectedFarm}</div>
                        <div className="border border-black p-1 flex items-center justify-center">Cycle No: {cycleDetails.cycleNo}</div>
                        <div className="border border-black p-1 flex items-center justify-center">Crop No: {cycleDetails.cropNo}</div>
                        <div className="border border-black p-1 flex items-center justify-center">Date Crop Start: {cycleDetails.startDate}</div>
                        <div className="border border-black p-1 flex items-center justify-center">Date Crop Finished: {cycleDetails.finishDate}</div>
                        <div className="border border-black p-1 col-span-2 flex items-center justify-center">Site: {getSiteName(selectedFarm)}</div>
                        <div className="border border-black p-1 flex items-center justify-center">Sheet No: 1</div>
                    </div>

                    {/* Table */}
                    <table className="min-w-full border-collapse border border-black text-xs">
                        <thead>
                            <tr className="bg-green-200 font-bold">
                                <th colSpan={5} className="border border-black p-1">AS PER HATCHERY</th>
                                <th colSpan={3} className="border border-black p-1">BR.</th>
                                <th colSpan={7} className="border border-black p-1">AS PER PROCESSING.</th>
                                <th colSpan={6} className="border border-black p-1">AS PER BROILER.</th>
                            </tr>
                            <tr className="bg-gray-100 font-semibold">
                                {/* HATCHERY */}
                                <th className="border border-black p-1">House No.</th>
                                <th className="border border-black p-1">Flock No</th>
                                <th className="border border-black p-1">Flock Age</th>
                                <th className="border border-black p-1">Breed</th>
                                <th className="border border-black p-1">Chick Placed</th>
                                {/* BR. */}
                                <th className="border border-black p-1">Total Mortality</th>
                                <th className="border border-black p-1">Deviation</th>
                                <th className="border border-black p-1">Livability %(P)</th>
                                {/* PROCESSING */}
                                <th className="border border-black p-1">Electric Counter</th>
                                <th className="border border-black p-1">Catch Culls</th>
                                <th className="border border-black p-1">D.O.A.</th>
                                <th className="border border-black p-1">Catch Loss</th>
                                <th className="border border-black p-1">Scale Wt.(P)</th>
                                <th className="border border-black p-1">Avg. Live Wt.(P)</th>
                                <th className="border border-black p-1">Livability %(B)</th>
                                {/* BROILER */}
                                <th className="border border-black p-1">Scale Wt.+ C.L.Wt.(B)</th>
                                <th className="border border-black p-1">Avg. Live Wt.(B)</th>
                                <th className="border border-black p-1">Total Feed (Kg)</th>
                                <th className="border border-black p-1">F.C.R.(B)</th>
                                <th className="border border-black p-1">Prod. No.(B)</th>
                                <th className="border border-black p-1">Catching Age</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <tr key={row.houseNo}>
                                    <td>{row.houseNo}</td><td>{row.flockNo}</td><td>{row.flockAge}</td><td>{row.breed}</td><td>{row.chickPlaced.toLocaleString()}</td>
                                    <td>{row.totalMortality.toLocaleString()}</td><td>{row.deviation.toLocaleString()}</td><td>{row.livabilityP.toFixed(2)}</td>
                                    <td>{row.electricCounter}</td><td>{row.catchCulls}</td><td>{row.doa}</td><td>{row.catchLoss}</td><td>{row.scaleWtP}</td><td>{row.avgLiveWtP === 0 ? '#DIV/0!' : row.avgLiveWtP.toFixed(3)}</td><td>{row.livabilityB === 0 ? '#DIV/0!' : row.livabilityB.toFixed(2)}</td>
                                    <td>{row.scaleWtB}</td><td>{row.avgLiveWtB === 0 ? '#DIV/0!' : row.avgLiveWtB.toFixed(3)}</td><td>{row.totalFeed.toFixed(2)}</td><td>{row.fcrB === 0 ? '#DIV/0!' : row.fcrB.toFixed(3)}</td><td>{row.prodNoB.toFixed(3)}</td><td>{row.catchingAge.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold bg-gray-100">
                                <td colSpan={4}>Total:</td>
                                <td>{totals.chickPlaced.toLocaleString()}</td>
                                <td>{totals.totalMortality.toLocaleString()}</td>
                                <td>{totals.deviation.toLocaleString()}</td>
                                <td>{ (totals.chickPlaced > 0 ? (totals.deviation / totals.chickPlaced) * 100 : 0).toFixed(2) }</td>
                                <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>#DIV/0!</td><td>#DIV/0!</td>
                                <td>-</td><td>#DIV/0!</td><td>{totals.totalFeed.toFixed(2)}</td><td>#DIV/0!</td><td>-</td><td>{avgCatchingAge > 0 ? avgCatchingAge.toFixed(2) : '-'}</td>
                            </tr>
                        </tfoot>
                    </table>
                     {/* Summary & Signatures */}
                    <div className="mt-2 grid grid-cols-3 gap-2">
                        <div className="border border-black p-1 space-y-1">
                            <div>Total feed (Kgs): <span className="font-bold float-right">{totals.totalFeed.toFixed(2)}</span></div>
                            <div>Total Weight: <span className="font-bold float-right">#DIV/0!</span></div>
                            <div>F.C.R.: <span className="font-bold float-right">#DIV/0!</span></div>
                            <div>Livability: <span className="font-bold float-right">{(totals.chickPlaced > 0 ? (totals.deviation / totals.chickPlaced) * 100 : 0).toFixed(2)}</span></div>
                            <div className="text-xs">Leadman Name: <span className="font-bold"></span></div>
                        </div>
                        <div className="border border-black p-1 space-y-1">
                             <div>Avg. Live Weight: <span className="font-bold float-right">#DIV/0!</span></div>
                             <div>Avg. Catching Age: <span className="font-bold float-right">{avgCatchingAge > 0 ? avgCatchingAge.toFixed(2) : '-'}</span></div>
                             <div>Deviation %: <span className="font-bold float-right">-</span></div>
                             <div>Production No.: <span className="font-bold float-right">#DIV/0!</span></div>
                        </div>
                        <div className="border border-black p-1 space-y-1">
                            <div>Trial Houses: <span className="font-bold float-right">-</span></div>
                            <div>Control Houses: <span className="font-bold float-right">-</span></div>
                        </div>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-2" style={{minHeight: '60px'}}>
                         <div className="border border-black p-1">
                            <p>Verified by Farm I/C.:</p>
                            <p className="mt-4">Sign. & Date:</p>
                        </div>
                        <div className="border border-black p-1">
                            <p>Attested by :</p>
                        </div>
                         <div className="border border-black p-1 flex flex-col justify-between">
                            <p></p>
                            <p className="bg-gray-200 text-center font-bold">Broiler Dept., Site Manager</p>
                        </div>
                    </div>
                     <div className="mt-1 grid grid-cols-3 gap-2">
                         <div className="text-xs p-1 col-span-2">
                            <p>CC.: Production Manager, Poultry Health Dept. Manager, Feed Lab (Nutritionist), Broiler Dept. Manager, Broiler Site Manager's, Concerned Farm In-Charge & File.</p>
                        </div>
                        <div className="border border-black p-1 flex flex-col justify-between" style={{minHeight: '40px'}}>
                            <p></p>
                            <p className="bg-green-200 text-center font-bold">Broiler Dept., Manager</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default BroilerPerformanceReport;