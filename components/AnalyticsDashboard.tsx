import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, Label } from 'recharts';
// Fix: Import DailyReport to allow for explicit casting and fix type inference issue.
import type { Cycle, AllFarmsData, AllFarmsChicksReceivingData, AllFarmsFeedDeliveryData, AllFarmsCatchingDetailsData, AllFarmsWeeklyWeightData, ChicksReceivingData, DailyReport } from '../types';

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6'];

const METRICS = {
  mortalityRate: 'Cumulative Mortality Rate (%)',
  livability: 'Livability (%)',
  // avgWeight: 'Average Body Weight (g)',
  // fcr: 'Feed Conversion Ratio (FCR)',
};

type MetricKey = keyof typeof METRICS;

interface AnalyticsDashboardProps {
    selectedFarm: string;
    cycles: Cycle[];
    allFarmsData: AllFarmsData;
    allFarmsChicksReceivingData: AllFarmsChicksReceivingData;
    allFarmsFeedDeliveryData: AllFarmsFeedDeliveryData;
    allFarmsCatchingDetailsData: AllFarmsCatchingDetailsData;
    allFarmsWeeklyWeightData: AllFarmsWeeklyWeightData;
    onBack: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    selectedFarm,
    cycles,
    allFarmsData,
    allFarmsChicksReceivingData,
    allFarmsFeedDeliveryData,
    allFarmsCatchingDetailsData,
    allFarmsWeeklyWeightData,
    onBack,
}) => {
    const [selectedCycleIds, setSelectedCycleIds] = useState<string[]>([]);
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('mortalityRate');

    const finishedCyclesForFarm = useMemo(() => {
        return cycles
            .map(c => ({
                ...c,
                farmDetails: c.farms.find(f => f.farmName === selectedFarm)
            }))
            .filter(c => c.farmDetails && c.farmDetails.finishDate)
            .sort((a, b) => new Date(b.farmDetails!.finishDate!).getTime() - new Date(a.farmDetails!.finishDate!).getTime());
    }, [cycles, selectedFarm]);

    const handleCycleSelection = (cycleId: string) => {
        setSelectedCycleIds(prev =>
            prev.includes(cycleId) ? prev.filter(id => id !== cycleId) : [...prev, cycleId]
        );
    };

    const chartData = useMemo(() => {
        if (selectedCycleIds.length === 0) return { data: [], maxAge: 0 };

        const allCyclesData: Record<string, { age: number, value: number }[]> = {};
        let maxAge = 0;

        selectedCycleIds.forEach(cycleId => {
            const cycle = finishedCyclesForFarm.find(c => c.id === cycleId);
            if (!cycle || !cycle.farmDetails) return;

            const { startDate, finishDate } = cycle.farmDetails;
            if (!startDate || !finishDate) return;

            const startDateObj = new Date(startDate.replace(/-/g, '/'));
            const finishDateObj = new Date(finishDate.replace(/-/g, '/'));

            const cycleChicksData = (allFarmsChicksReceivingData[selectedFarm] || []).find((d: ChicksReceivingData) => d.cycleId === cycleId);
            const cycleDailyData = (allFarmsData[selectedFarm] || []).filter(r => {
                const reportDate = new Date(r.date.replace(/-/g, '/'));
                return reportDate >= startDateObj && reportDate <= finishDateObj;
            });

            if (!cycleChicksData) return;

            const totalChicksPlaced = cycleChicksData.houses.reduce((sum, h) => sum + (parseInt(h.netChicksPlaced, 10) || 0), 0);
            if (totalChicksPlaced === 0) return;
            
            const cycleLength = Math.ceil((finishDateObj.getTime() - startDateObj.getTime()) / (1000 * 3600 * 24));
            maxAge = Math.max(maxAge, cycleLength);

            const dailyDataMap = new Map(cycleDailyData.map(r => [r.date, r]));
            const cycleMetricData: { age: number, value: number }[] = [];
            let cumulativeMortality = 0;

            for (let i = 0; i <= cycleLength; i++) {
                const currentDate = new Date(startDateObj);
                currentDate.setDate(currentDate.getDate() + i);
                const dateString = currentDate.toISOString().split('T')[0];
                
                const report = dailyDataMap.get(dateString);
                if (report) {
                    // Fix: Explicitly cast 'report' to 'DailyReport' to fix TypeScript inference issue.
                    const dailyMortality = (report as DailyReport).houses.reduce((sum, h) => sum + (parseInt(h.mortality, 10) || 0) + (parseInt(h.culls, 10) || 0), 0);
                    cumulativeMortality += dailyMortality;
                }
                
                let value = 0;
                switch (selectedMetric) {
                    case 'mortalityRate':
                        value = (cumulativeMortality / totalChicksPlaced) * 100;
                        break;
                    case 'livability':
                        value = ((totalChicksPlaced - cumulativeMortality) / totalChicksPlaced) * 100;
                        break;
                }

                cycleMetricData.push({ age: i, value });
            }
            allCyclesData[cycle.cycleNo] = cycleMetricData;
        });
        
        const formattedData: { age: number, [key: string]: number | undefined }[] = [];
        for (let i = 0; i <= maxAge; i++) {
            const entry: { age: number, [key: string]: number | undefined } = { age: i };
            for (const cycleNo in allCyclesData) {
                const dayData = allCyclesData[cycleNo].find(d => d.age === i);
                entry[cycleNo] = dayData ? dayData.value : undefined;
            }
            formattedData.push(entry);
        }

        return { data: formattedData, maxAge };

    }, [selectedCycleIds, selectedMetric, finishedCyclesForFarm, allFarmsData, allFarmsChicksReceivingData, selectedFarm]);
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6 border-b pb-4">
                <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                    <BackArrowIcon />
                </button>
                <h3 className="text-xl font-semibold text-gray-800">Analytics Dashboard: {selectedFarm}</h3>
            </div>
            
            {finishedCyclesForFarm.length === 0 ? (
                <p className="text-gray-600">No finished cycles found for this farm to compare.</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Cycles to Compare</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                                {finishedCyclesForFarm.map(cycle => (
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
                        <div>
                            <label htmlFor="metric-selector" className="block text-sm font-medium text-gray-700 mb-2">Select Metric</label>
                            <select
                                id="metric-selector"
                                value={selectedMetric}
                                onChange={e => setSelectedMetric(e.target.value as MetricKey)}
                                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                                {Object.entries(METRICS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-2">Note: More metrics like FCR and Avg. Weight will be added soon.</p>
                        </div>
                    </div>
                    
                    <div style={{ width: '100%', height: 400 }}>
                        {selectedCycleIds.length > 0 ? (
                            <ResponsiveContainer>
                                <LineChart
                                    data={chartData.data}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="age" type="number" domain={[0, chartData.maxAge]}>
                                        <Label value="Age in Days" offset={-15} position="insideBottom" />
                                    </XAxis>
                                    <YAxis tickFormatter={(value) => value.toFixed(2)}>
                                        <Label value={METRICS[selectedMetric]} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                                    </YAxis>
                                    <Tooltip
                                        formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, `Cycle ${name}`]}
                                        labelFormatter={(label) => `Age: ${label}`}
                                    />
                                    <Legend />
                                    {selectedCycleIds.map((cycleId, index) => {
                                        const cycle = finishedCyclesForFarm.find(c => c.id === cycleId);
                                        if (!cycle) return null;
                                        return (
                                            <Line
                                                key={cycle.id}
                                                type="monotone"
                                                dataKey={cycle.cycleNo}
                                                stroke={COLORS[index % COLORS.length]}
                                                strokeWidth={2}
                                                dot={false}
                                                connectNulls
                                            />
                                        );
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full bg-gray-50 rounded-md border-2 border-dashed">
                                <p className="text-gray-500">Please select one or more cycles to view the chart.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
