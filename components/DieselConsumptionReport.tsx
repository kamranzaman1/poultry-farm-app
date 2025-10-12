
import React, { useState, useMemo } from 'react';
import type { DieselOrder } from '../types';

interface DieselConsumptionReportProps {
  orders: DieselOrder[];
  onBack: () => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);


// Gas Canister Icon for visual flair
const GasCanisterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-400">
        <path d="M3 21h18"></path>
        <path d="M4 14v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"></path>
        <path d="M4 11h16"></path>
        <path d="M5 14h.01"></path>
        <path d="M19 14h.01"></path>
        <path d="M8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3"></path>
    </svg>
);

const getISODateString = (date: Date) => date.toISOString().split('T')[0];

const DieselConsumptionReport: React.FC<DieselConsumptionReportProps> = ({ orders, onBack }) => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(getISODateString(firstDayOfMonth));
    const [endDate, setEndDate] = useState(getISODateString(lastDayOfMonth));
    const [tankFilter, setTankFilter] = useState<'All' | 'Generator' | 'Farm'>('All');

    const consumptionData = useMemo(() => {
        if (!startDate || !endDate) return [];
        
        const start = new Date(startDate.replace(/-/g, '/'));
        const end = new Date(endDate.replace(/-/g, '/'));
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

        const filteredOrders = orders.filter(order => {
            if (order.status !== 'Completed' || !order.receivedDate) return false;
            
            const receivedDate = new Date(order.receivedDate.replace(/-/g, '/'));
            const isInDateRange = receivedDate >= start && receivedDate <= end;
            if (!isInDateRange) return false;

            if (tankFilter === 'All') return true;
            // Treat orders without a tankType as 'Farm' for filtering
            const orderTankType = order.tankType || 'Farm';
            return orderTankType === tankFilter;
        });

        const consumption = filteredOrders.reduce((acc, order) => {
                const quantity = parseFloat(order.quantity) || 0;
                // Always group by the specific key to show "Farm Name - Tank Type" if it exists
                const key = order.tankType ? `${order.farmName} - ${order.tankType}` : order.farmName;
                acc[key] = (acc[key] || 0) + quantity;
                return acc;
            }, {} as { [farmName: string]: number });

        return Object.entries(consumption)
            .map(([farmName, total]) => ({ farmName, total }))
            .sort((a, b) => a.farmName.localeCompare(b.farmName));
            
    }, [orders, startDate, endDate, tankFilter]);
    
    const handleExportCSV = () => {
        const headers = ['Farm/Tank', 'Total Consumption (Liters)'];
        const rows = consumptionData.map(item => 
            `"${item.farmName}",${item.total}`
        );

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `DieselConsumption_${startDate}_to_${endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 border-b pb-4">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                        <BackArrowIcon />
                    </button>
                    <h3 className="text-xl font-semibold text-gray-800">Diesel Consumption Report</h3>
                </div>
                <button onClick={handleExportCSV} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors self-start sm:self-center">
                    Export CSV
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">From Date</label>
                    <input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    />
                </div>
                 <div>
                    <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">To Date</label>
                    <input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    />
                </div>
            </div>

            <div className="mb-4">
                <fieldset>
                    <legend className="block text-sm font-medium text-gray-700 mb-2">Tank Type</legend>
                    <div className="flex items-center space-x-4">
                        {(['All', 'Farm', 'Generator'] as const).map(type => (
                            <label key={type} className="flex items-center text-sm cursor-pointer">
                                <input
                                    type="radio"
                                    name="tankFilter"
                                    value={type}
                                    checked={tankFilter === type}
                                    onChange={() => setTankFilter(type)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-gray-700">{type}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            </div>

            {consumptionData.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">No diesel consumption recorded for this period.</p>
            ) : (
                <ul className="space-y-3 pt-2">
                    {consumptionData.map(({ farmName, total }) => (
                        <li key={farmName} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border">
                            <div className="flex items-center gap-3">
                                <GasCanisterIcon />
                                <span className="font-semibold text-gray-800">{farmName}</span>
                            </div>
                            <span className="font-bold text-blue-600">{total.toLocaleString()} Liters</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default DieselConsumptionReport;
