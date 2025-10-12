import React, { useState, useMemo, useEffect } from 'react';
import type { Cycle, AllFarmsData, AllFarmsChicksReceivingData, AllFarmsWeeklyWeightData, AllFarmsFeedDeliveryData, AllFarmsCatchingDetailsData } from '../types';

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const safeNum = (val: any) => Number(val) || 0;

interface ReportProps {
    cycles: Cycle[];
    allFarmsData: AllFarmsData;
    allFarmsChicksReceivingData: AllFarmsChicksReceivingData;
    allFarmsWeeklyWeightData: AllFarmsWeeklyWeightData;
    allFarmsFeedDeliveryData: AllFarmsFeedDeliveryData;
    allFarmsCatchingDetailsData: AllFarmsCatchingDetailsData;
    onBack: () => void;
}

const TrialAndControlReport: React.FC<ReportProps> = ({ 
    cycles, 
    allFarmsData, 
    allFarmsChicksReceivingData, 
    allFarmsFeedDeliveryData, 
    allFarmsCatchingDetailsData,
    onBack 
}) => {

    const [selectedCycleIds, setSelectedCycleIds] = useState<string[]>([]);
    const [selectedFarms, setSelectedFarms] = useState<string[]>([]);
    const [selectedHouses, setSelectedHouses] = useState<number[]>([]);


    const cyclesWithTrialControl = useMemo(() => {
        return cycles.filter(cycle => {
            return cycle.farms.some(farm => {
                const chicksData = (allFarmsChicksReceivingData[farm.farmName] || []).find(d => d.cycleId === cycle.id);
                if (!chicksData) return false;
                const hasTrial = chicksData.houses.some(h => h.trialOrControl === 'Trial');
                const hasControl = chicksData.houses.some(h => h.trialOrControl === 'Control');
                return hasTrial && hasControl;
            });
        }).sort((a,b) => b.id.localeCompare(a.id));
    }, [cycles, allFarmsChicksReceivingData]);

    const availableFarms = useMemo(() => {
        if (selectedCycleIds.length === 0) return [];
        const farmSet = new Set<string>();
        selectedCycleIds.forEach(cycleId => {
            const cycle = cycles.find(c => c.id === cycleId);
            cycle?.farms.forEach(farm => farmSet.add(farm.farmName));
        });
        return Array.from(farmSet).sort();
    }, [selectedCycleIds, cycles]);
    
    useEffect(() => {
        // When available farms change, filter out any selected farms that are no longer valid.
        setSelectedFarms(prev => prev.filter(f => availableFarms.includes(f)));
    }, [availableFarms]);


    const reportData = useMemo(() => {
        if (selectedCycleIds.length === 0) return null;

        const initialStats = () => ({
            houseCount: 0,
            chicksPlaced: 0,
            totalMortality: 0,
            totalFeed: 0,
            totalWeightKg: 0,
            totalBirdsCaught: 0,
            cumulativeAge: 0,
        });

        let trialStats = initialStats();
        let controlStats = initialStats();
        let isAnyFarmActive = false;

        selectedCycleIds.forEach(cycleId => {
            const cycle = cycles.find(c => c.id === cycleId);
            if (!cycle) return;

            cycle.farms.forEach(farm => {
                // Filter by selected farms
                if (selectedFarms.length > 0 && !selectedFarms.includes(farm.farmName)) {
                    return;
                }

                const chicksData = (allFarmsChicksReceivingData[farm.farmName] || []).find(d => d.cycleId === cycleId);
                if (!chicksData) return;
                
                const dailyData = allFarmsData[farm.farmName] || [];
                const feedData = allFarmsFeedDeliveryData[farm.farmName] || [];
                const catchingData = (allFarmsCatchingDetailsData[farm.farmName] || []).find(d => d.cycleId === cycleId);

                let farmContributesData = false;

                chicksData.houses.forEach((house, index) => {
                    const houseNo = index + 1;
                    // Filter by selected houses
                    if (selectedHouses.length > 0 && !selectedHouses.includes(houseNo)) {
                        return;
                    }
                    
                    if (house.trialOrControl !== 'Trial' && house.trialOrControl !== 'Control') return;
                    
                    farmContributesData = true;
                    const stats = house.trialOrControl === 'Trial' ? trialStats : controlStats;
                    
                    const placed = safeNum(house.netChicksPlaced);
                    if (placed === 0) return;

                    stats.houseCount++;
                    stats.chicksPlaced += placed;
                    
                    // Mortality
                    const startDate = new Date(farm.startDate.replace(/-/g, '/'));
                    const finishDate = farm.finishDate ? new Date(farm.finishDate.replace(/-/g, '/')) : new Date();
                    dailyData.forEach(day => {
                        const reportDate = new Date(day.date.replace(/-/g, '/'));
                        if (reportDate >= startDate && reportDate <= finishDate) {
                            stats.totalMortality += safeNum(day.houses[index]?.mortality) + safeNum(day.houses[index]?.culls);
                        }
                    });

                    // Feed
                    feedData.forEach(delivery => {
                        if (delivery.cycleId === cycleId) {
                            const houseFeed = delivery.houses[index];
                            if(houseFeed) {
                                stats.totalFeed += safeNum(houseFeed.starter) + safeNum(houseFeed.growerCR) + safeNum(houseFeed.growerPL) + safeNum(houseFeed.finisher);
                            }
                        }
                    });

                    // Age calculation
                    if (house.placementDate) {
                        const pDate = new Date(house.placementDate.replace(/-/g, '/'));
                        const fDate = farm.finishDate ? new Date(farm.finishDate.replace(/-/g, '/')) : new Date();
                        const ageInDays = Math.floor((fDate.getTime() - pDate.getTime()) / (1000 * 3600 * 24));
                        if (ageInDays >= 0) {
                            stats.cumulativeAge += ageInDays;
                        }
                    }
                    
                    // Catching Data
                    if (catchingData && catchingData.houses[index]) {
                        const houseCatch = catchingData.houses[index];
                        stats.totalBirdsCaught += safeNum(houseCatch.electricCounter);
                        stats.totalWeightKg += safeNum(houseCatch.scaleWtP) + safeNum(houseCatch.catchLoss);
                    }
                });
                
                if (farmContributesData && !farm.finishDate) {
                    isAnyFarmActive = true;
                }
            });
        });

        const calculateMetrics = (stats: ReturnType<typeof initialStats>) => {
            if (stats.houseCount === 0) return { livability: 0, avgAge: 0, totalFeed: 0, avgWeight: 0, fcr: 0, pi: 0, ...stats };
            const livability = stats.chicksPlaced > 0 ? ((stats.chicksPlaced - stats.totalMortality) / stats.chicksPlaced) * 100 : 0;
            const avgAge = stats.cumulativeAge / stats.houseCount;
            const avgWeight = stats.totalBirdsCaught > 0 ? stats.totalWeightKg / stats.totalBirdsCaught : 0;
            const fcr = stats.totalWeightKg > 0 ? stats.totalFeed / stats.totalWeightKg : 0;
            const pi = (avgAge > 0 && fcr > 0) ? (livability * avgWeight) / (fcr * avgAge) : 0;
            return { livability, avgAge, totalFeed: stats.totalFeed, avgWeight, fcr, pi, ...stats };
        };
        
        const trialResults = calculateMetrics(trialStats);
        const controlResults = calculateMetrics(controlStats);

        return { trial: trialResults, control: controlResults, isAnyFarmActive };
    }, [selectedCycleIds, selectedFarms, selectedHouses, cycles, allFarmsChicksReceivingData, allFarmsData, allFarmsFeedDeliveryData, allFarmsCatchingDetailsData]);
    
    const handleCycleSelection = (cycleId: string) => {
        setSelectedCycleIds(prev =>
            prev.includes(cycleId) ? prev.filter(id => id !== cycleId) : [...prev, cycleId]
        );
    };
    
    const handleFarmSelection = (farmName: string) => {
        setSelectedFarms(prev =>
            prev.includes(farmName) ? prev.filter(name => name !== farmName) : [...prev, farmName]
        );
    };

    const handleHouseSelection = (houseNo: number) => {
        setSelectedHouses(prev =>
            prev.includes(houseNo) ? prev.filter(num => num !== houseNo) : [...prev, houseNo]
        );
    };


    const renderMetricRow = (label: string, trialValue: number, controlValue: number, toFixed = 2, unit = '') => {
        const diff = trialValue - controlValue;
        const diffColor = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-600';
        return (
            <tr className="border-b">
                <td className="py-2 px-4 font-semibold text-gray-700">{label}</td>
                <td className="py-2 px-4 text-center">{trialValue.toFixed(toFixed)}{unit}</td>
                <td className="py-2 px-4 text-center">{controlValue.toFixed(toFixed)}{unit}</td>
                <td className={`py-2 px-4 text-center font-bold ${diffColor}`}>{diff.toFixed(toFixed)}{unit}</td>
            </tr>
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6 border-b pb-4">
                <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                    <BackArrowIcon />
                </button>
                <h3 className="text-xl font-semibold text-gray-800">Trial & Control Performance Report</h3>
            </div>
            
            {cyclesWithTrialControl.length === 0 ? (
                 <p className="text-gray-600">No cycles with both Trial and Control houses were found.</p>
            ) : (
                <>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">1. Select Cycles to Compare (Active and Finished)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                            {cyclesWithTrialControl.map(cycle => (
                                <label key={cycle.id} className="flex items-center text-sm p-1 rounded-md hover:bg-gray-100 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedCycleIds.includes(cycle.id)}
                                        onChange={() => handleCycleSelection(cycle.id)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-gray-800">Cycle {cycle.cycleNo}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">2. Select Farms (Optional - leave blank to include all)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                            {availableFarms.map(farmName => (
                                <label key={farmName} className="flex items-center text-sm p-1 rounded-md hover:bg-gray-100 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedFarms.includes(farmName)}
                                        onChange={() => handleFarmSelection(farmName)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-gray-800">{farmName}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">3. Select Houses (Optional - leave blank to include all)</label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 p-3 border rounded-md">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(houseNo => (
                                <label key={houseNo} className="flex items-center text-sm p-1 rounded-md hover:bg-gray-100 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedHouses.includes(houseNo)}
                                        onChange={() => handleHouseSelection(houseNo)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-gray-800">{houseNo}</span>
                                </label>
                            ))}
                        </div>
                    </div>


                    {reportData ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="py-2 px-4 text-left font-bold text-gray-600">Metric</th>
                                        <th className="py-2 px-4 text-center font-bold text-blue-600">Trial</th>
                                        <th className="py-2 px-4 text-center font-bold text-green-600">Control</th>
                                        <th className="py-2 px-4 text-center font-bold text-gray-600">Difference (T-C)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b"><td className="py-2 px-4 font-semibold text-gray-700">No. of Houses</td><td className="py-2 px-4 text-center">{reportData.trial.houseCount}</td><td className="py-2 px-4 text-center">{reportData.control.houseCount}</td><td className="py-2 px-4 text-center font-bold">{reportData.trial.houseCount - reportData.control.houseCount}</td></tr>
                                    <tr className="border-b"><td className="py-2 px-4 font-semibold text-gray-700">Total Chicks Placed</td><td className="py-2 px-4 text-center">{reportData.trial.chicksPlaced.toLocaleString()}</td><td className="py-2 px-4 text-center">{reportData.control.chicksPlaced.toLocaleString()}</td><td className="py-2 px-4 text-center font-bold">{(reportData.trial.chicksPlaced - reportData.control.chicksPlaced).toLocaleString()}</td></tr>
                                    <tr className="border-b"><td className="py-2 px-4 font-semibold text-gray-700">Total Mortality</td><td className="py-2 px-4 text-center">{reportData.trial.totalMortality.toLocaleString()}</td><td className="py-2 px-4 text-center">{reportData.control.totalMortality.toLocaleString()}</td><td className="py-2 px-4 text-center font-bold">{(reportData.trial.totalMortality - reportData.control.totalMortality).toLocaleString()}</td></tr>
                                    {renderMetricRow('Livability', reportData.trial.livability, reportData.control.livability, 2, '%')}
                                    {renderMetricRow(reportData.isAnyFarmActive ? 'Avg. Current Age' : 'Avg. Catching Age', reportData.trial.avgAge, reportData.control.avgAge, 2)}
                                    {renderMetricRow('Total Feed Consumed', reportData.trial.totalFeed, reportData.control.totalFeed, 2, ' Kg')}
                                    {renderMetricRow('Total Live Weight', reportData.trial.totalWeightKg, reportData.control.totalWeightKg, 2, ' Kg')}
                                    {renderMetricRow('Avg. Live Weight', reportData.trial.avgWeight, reportData.control.avgWeight, 3, ' Kg')}
                                    {renderMetricRow('F.C.R', reportData.trial.fcr, reportData.control.fcr, 3)}
                                    {renderMetricRow('Production Index', reportData.trial.pi, reportData.control.pi, 2)}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg">
                            <p className="text-sm text-gray-500 mt-2">Please select one or more cycles to generate the report.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TrialAndControlReport;
