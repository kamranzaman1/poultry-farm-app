
import React, { useState, useMemo } from 'react';
import type { SubmittedFeedOrder } from '../types';

interface FeedConsumptionReportProps {
  orders: SubmittedFeedOrder[];
  onBack: () => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

// Feed Icon
const FeedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-400">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
        <path d="m9 12 2 2 4-4"/>
    </svg>
);

const getISODateString = (date: Date) => date.toISOString().split('T')[0];

const FeedConsumptionReport: React.FC<FeedConsumptionReportProps> = ({ orders, onBack }) => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(getISODateString(firstDayOfMonth));
    const [endDate, setEndDate] = useState(getISODateString(lastDayOfMonth));

    const consumptionData = useMemo(() => {
        if (!startDate || !endDate) return [];
        
        const start = new Date(startDate.replace(/-/g, '/'));
        const end = new Date(endDate.replace(/-/g, '/'));
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

        const filteredOrders = orders.filter(order => {
            if (order.status !== 'Delivered' || !order.actualDeliveryDate) return false;
            
            const deliveryDate = new Date(order.actualDeliveryDate.replace(/-/g, '/'));
            return deliveryDate >= start && deliveryDate <= end;
        });

        const consumption = filteredOrders.reduce((acc, order) => {
                const totalQuantity = order.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
                acc[order.farmName] = (acc[order.farmName] || 0) + totalQuantity;
                return acc;
            }, {} as { [farmName: string]: number });

        return Object.entries(consumption)
            .map(([farmName, total]) => ({ farmName, total }))
            .sort((a, b) => a.farmName.localeCompare(b.farmName));
            
    }, [orders, startDate, endDate]);

    const handleExportCSV = () => {
        const headers = ['Farm Name', 'Total Consumption (Tons)'];
        const rows = consumptionData.map(item => 
            `"${item.farmName}",${item.total.toFixed(3)}`
        );

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `FeedConsumption_${startDate}_to_${endDate}.csv`);
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
                    <h3 className="text-xl font-semibold text-gray-800">Feed Consumption Report</h3>
                </div>
                 <button onClick={handleExportCSV} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors self-start sm:self-center">
                    Export CSV
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor="feed-start-date" className="block text-sm font-medium text-gray-700">From Date</label>
                    <input
                        id="feed-start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    />
                </div>
                 <div>
                    <label htmlFor="feed-end-date" className="block text-sm font-medium text-gray-700">To Date</label>
                    <input
                        id="feed-end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    />
                </div>
            </div>

            {consumptionData.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">No feed consumption recorded for this period.</p>
            ) : (
                <ul className="space-y-3 pt-2">
                    {consumptionData.map(({ farmName, total }) => (
                        <li key={farmName} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border">
                            <div className="flex items-center gap-3">
                                <FeedIcon />
                                <span className="font-semibold text-gray-800">{farmName}</span>
                            </div>
                            <span className="font-bold text-green-600">{total.toFixed(3)} Tons</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default FeedConsumptionReport;
