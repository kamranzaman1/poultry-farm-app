import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, LineChart, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Line, Area, Label } from 'recharts';
import type { AllFarmsData, Cycle } from '../types';
import { FARM_NAMES } from '../constants';

interface CrossFarmMortalityChartProps {
    allFarmsData: AllFarmsData;
    cycles: Cycle[];
}

const COLORS = [
    '#3b82f6', // blue-500
    '#22c55e', // green-500
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#64748b', // slate-500
    '#eab308', // yellow-500
    '#0ea5e9', // sky-500
    '#d946ef', // fuchsia-500
];

const formatDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return new Date(dateStr.replace(/-/g, '/')).toLocaleDateString('en-GB', options);
}

type ChartType = 'stacked' | 'grouped' | 'line' | 'stackedArea';

const CrossFarmMortalityChart: React.FC<CrossFarmMortalityChartProps> = ({ allFarmsData, cycles }) => {
    const [selectedFarmFilter, setSelectedFarmFilter] = useState<string>('All');
    const [chartType, setChartType] = useState<ChartType>('stacked');
    
    const { chartData, farmNames } = useMemo(() => {
        const dataByDate = new Map<string, Record<string, number>>();
        const farmNamesWithData = new Set<string>();

        // Find running cycles for each farm
        const runningCycles: Record<string, { startDate: string }> = {};
        for (const farmName of FARM_NAMES) {
            const activeFarmCycle = cycles
                .map(c => ({...c, farmDetails: c.farms.find(f => f.farmName === farmName && !f.finishDate)}))
                .filter(c => c.farmDetails)
                .sort((a,b) => new Date(b.farmDetails!.startDate.replace(/-/g, '/')).getTime() - new Date(a.farmDetails!.startDate.replace(/-/g, '/')).getTime())[0];
            
            if (activeFarmCycle && activeFarmCycle.farmDetails) {
                runningCycles[farmName] = { startDate: activeFarmCycle.farmDetails.startDate };
            }
        }

        for (const farmName in allFarmsData) {
            if (selectedFarmFilter !== 'All' && farmName !== selectedFarmFilter) {
                continue; // Skip farms if a specific one is selected and this is not it
            }

            const runningCycle = runningCycles[farmName];
            if (!runningCycle) {
                continue; // Skip farms with no running cycle
            }

            const startDate = new Date(runningCycle.startDate.replace(/-/g, '/'));
            const dailyReports = allFarmsData[farmName].filter(report => {
                const reportDate = new Date(report.date.replace(/-/g, '/'));
                return reportDate >= startDate;
            });

            if (dailyReports.length > 0) {
                farmNamesWithData.add(farmName);
            }

            for (const report of dailyReports) {
                const date = report.date;
                const totalMortality = report.houses.reduce((sum, house) => {
                    return sum + (parseInt(house.mortality, 10) || 0) + (parseInt(house.culls, 10) || 0);
                }, 0);

                if (!dataByDate.has(date)) {
                    dataByDate.set(date, {});
                }
                const dayData = dataByDate.get(date)!;
                dayData[farmName] = (dayData[farmName] || 0) + totalMortality;
            }
        }
        
        const sortedEntries = Array.from(dataByDate.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

        const processedChartData = sortedEntries.map(([date, values]) => ({
            date,
            ...values
        }));

        return { chartData: processedChartData, farmNames: Array.from(farmNamesWithData) };
    }, [allFarmsData, cycles, selectedFarmFilter]);

    if (chartData.length === 0) {
        return (
            <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Daily Mortality Across Farms (Running Cycle)</h3>
                <p className="text-gray-500">No mortality data available to display the chart for active cycles.</p>
            </div>
        );
    }
    
    const renderChart = () => {
        const commonProps = {
            data: chartData,
            margin: { top: 5, right: 20, left: 20, bottom: 5 },
        };

        const commonComponents = [
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#e0e0e0" />,
            <XAxis key="xaxis" dataKey="date" tickFormatter={formatDate} angle={-45} textAnchor="end" height={60} />,
            <YAxis key="yaxis">
                <Label value="Total Mortality (Birds)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
            </YAxis>,
            <Tooltip 
                key="tooltip"
                cursor={{fill: 'rgba(206, 212, 218, 0.4)'}}
                formatter={(value: number) => `${value.toLocaleString()} birds`}
            />,
            <Legend key="legend" />
        ];

        switch(chartType) {
            case 'stackedArea':
                return (
                    <AreaChart {...commonProps} aria-label="Stacked area chart showing cumulative daily mortality over time.">
                        {commonComponents}
                        {farmNames.map((farmName, index) => (
                            <Area 
                                key={farmName}
                                type="monotone"
                                dataKey={farmName}
                                stackId="1"
                                stroke={COLORS[FARM_NAMES.indexOf(farmName) % COLORS.length]}
                                fill={COLORS[FARM_NAMES.indexOf(farmName) % COLORS.length]}
                                name={farmName}
                            />
                        ))}
                    </AreaChart>
                );
            case 'line':
                return (
                    <LineChart {...commonProps} aria-label="Line chart showing daily mortality trends for each farm.">
                        {commonComponents}
                        {farmNames.map((farmName, index) => (
                            <Line 
                                key={farmName} 
                                type="monotone"
                                dataKey={farmName} 
                                stroke={COLORS[FARM_NAMES.indexOf(farmName) % COLORS.length]} 
                                name={farmName}
                                strokeWidth={2}
                                dot={false}
                            />
                        ))}
                    </LineChart>
                );
            case 'grouped':
                 return (
                    <BarChart {...commonProps} aria-label="Grouped bar chart comparing daily mortality for each farm side-by-side.">
                        {commonComponents}
                        {farmNames.map((farmName, index) => (
                            <Bar 
                                key={farmName} 
                                dataKey={farmName} 
                                fill={COLORS[FARM_NAMES.indexOf(farmName) % COLORS.length]} 
                                name={farmName}
                            />
                        ))}
                    </BarChart>
                );
            case 'stacked':
            default:
                return (
                    <BarChart {...commonProps} aria-label="Stacked bar chart showing daily mortality contributions from each farm.">
                        {commonComponents}
                        {farmNames.map((farmName, index) => (
                            <Bar 
                                key={farmName} 
                                dataKey={farmName} 
                                stackId="a" 
                                fill={COLORS[FARM_NAMES.indexOf(farmName) % COLORS.length]} 
                                name={farmName}
                            />
                        ))}
                    </BarChart>
                );
        }
    };

    const chartTypes: { id: ChartType, label: string }[] = [
        { id: 'stacked', label: 'Stacked Bar' },
        { id: 'grouped', label: 'Grouped Bar' },
        { id: 'line', label: 'Line' },
        { id: 'stackedArea', label: 'Stacked Area' },
    ];

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-xl font-semibold text-gray-800">Daily Mortality Across Farms (Running Cycle)</h3>
                <div className="flex items-center gap-4">
                     <div>
                        <label htmlFor="chart-type-selector" className="text-sm font-medium text-gray-700 mr-2">Chart Type:</label>
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                             {chartTypes.map((type, index) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setChartType(type.id)}
                                    className={`px-3 py-1 text-sm font-medium transition-colors
                                        ${index === 0 ? 'rounded-l-lg' : ''}
                                        ${index === chartTypes.length - 1 ? 'rounded-r-lg' : ''}
                                        ${chartType === type.id 
                                            ? 'bg-blue-600 text-white z-10 ring-2 ring-blue-500' 
                                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 -ml-px'
                                        }
                                    `}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="farm-chart-filter" className="text-sm font-medium text-gray-700 mr-2">Filter by Farm:</label>
                        <select
                            id="farm-chart-filter"
                            value={selectedFarmFilter}
                            onChange={e => setSelectedFarmFilter(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md shadow-sm text-sm"
                        >
                            <option value="All">All Farms</option>
                            {FARM_NAMES.map(farm => <option key={farm} value={farm}>{farm}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default CrossFarmMortalityChart;