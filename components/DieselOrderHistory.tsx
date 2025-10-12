
import React, { useState, useMemo } from 'react';
import type { DieselOrder } from '../types';

interface DieselOrderHistoryProps {
    orders: DieselOrder[];
    onBack: () => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

// Simple sort icon
const SortIcon = ({ direction }: { direction: 'ascending' | 'descending' | 'none' }) => {
    if (direction === 'ascending') return <span className="ml-1">▲</span>;
    if (direction === 'descending') return <span className="ml-1">▼</span>;
    return <span className="ml-1 text-gray-400">↕</span>;
};

const DieselOrderHistory: React.FC<DieselOrderHistoryProps> = ({ orders, onBack }) => {
    const [sortConfig, setSortConfig] = useState<{ key: keyof DieselOrder; direction: 'ascending' | 'descending' } | null>({ key: 'requiredDate', direction: 'descending' });

    const sortedOrders = useMemo(() => {
        let sortableItems = [...orders];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const key = sortConfig.key;
                
                if (key === 'quantity') {
                    const valA = parseFloat(a.quantity) || 0;
                    const valB = parseFloat(b.quantity) || 0;
                    if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }
                
                const valA = a[key] ?? '';
                const valB = b[key] ?? '';
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [orders, sortConfig]);

    const requestSort = (key: keyof DieselOrder) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortDirection = (key: keyof DieselOrder) => {
        if (!sortConfig || sortConfig.key !== key) return 'none';
        return sortConfig.direction;
    }
    
    const handleExportCSV = () => {
        const headers = ['Farm Name', 'Tank Type', 'Quantity (Liters)', 'Status', 'Required Date', 'Received Date', 'Reservation No', 'Requester Name', 'Requester Contact'];
        
        const rows = sortedOrders.map(order => {
            const rowData = [
                order.farmName,
                order.tankType || 'N/A',
                order.quantity,
                order.status,
                order.requiredDate,
                order.receivedDate || '',
                order.reservationNumber || '',
                order.requesterName || '',
                order.requesterContact || ''
            ];
            return rowData.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `DieselOrderHistory.csv`);
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
                    <h3 className="text-xl font-semibold text-gray-800">Diesel Order History</h3>
                </div>
                 <button onClick={handleExportCSV} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors self-start sm:self-center">
                    Export CSV
                </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
                {orders.length === 0 ? (
                    <p className="text-gray-500 text-sm">No order history available.</p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button onClick={() => requestSort('farmName')} className="flex items-center">
                                        Farm <SortIcon direction={getSortDirection('farmName')} />
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button onClick={() => requestSort('quantity')} className="flex items-center">
                                        Qty (L) <SortIcon direction={getSortDirection('quantity')} />
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button onClick={() => requestSort('status')} className="flex items-center">
                                        Status <SortIcon direction={getSortDirection('status')} />
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button onClick={() => requestSort('requiredDate')} className="flex items-center">
                                        Required <SortIcon direction={getSortDirection('requiredDate')} />
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button onClick={() => requestSort('receivedDate')} className="flex items-center">
                                        Received <SortIcon direction={getSortDirection('receivedDate')} />
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reservation #
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Requester
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedOrders.map((order) => (
                                <tr key={order.id}>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <p className="font-medium text-gray-900">{order.farmName}</p>
                                        <p className="text-sm text-gray-500">{order.tankType || 'Farm Tank'}</p>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                        {parseInt(order.quantity, 10).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">
                                        {order.requiredDate}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">
                                        {order.receivedDate || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">
                                        {order.reservationNumber || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                        <p>{order.requesterName}</p>
                                        <p className="text-xs text-gray-500">{order.requesterContact}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default DieselOrderHistory;
