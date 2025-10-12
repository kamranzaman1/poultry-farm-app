import React, { useState } from 'react';
import type { DieselOrder, User } from '../types';

interface DieselOrdersListProps {
  orders: DieselOrder[];
  onUpdateStatus: (orderId: string, status: 'Completed', receivedDate: string) => void;
  onAddReservation: (orderId: string, reservationNumber: string) => void;
  currentUser: User;
  onBack: () => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-500"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

const DieselOrdersList: React.FC<DieselOrdersListProps> = ({ orders, onUpdateStatus, onAddReservation, currentUser, onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DieselOrder | null>(null);
  const [receivedDate, setReceivedDate] = useState('');
  const [error, setError] = useState('');
  const [reservationInputs, setReservationInputs] = useState<Record<string, string>>({});

  const handleOpenModal = (order: DieselOrder) => {
    setSelectedOrder(order);
    setReceivedDate(new Date().toISOString().split('T')[0]); // Default to today
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleSubmit = () => {
    if (!receivedDate) {
      setError('Received date is required.');
      return;
    }
   
    if (selectedOrder) {
      onUpdateStatus(selectedOrder.id, 'Completed', receivedDate);
      handleCloseModal();
    }
  };
  
  const handleReservationChange = (orderId: string, value: string) => {
    setReservationInputs(prev => ({ ...prev, [orderId]: value }));
  };

  const handleSaveReservation = (orderId: string) => {
    const reservationNumber = reservationInputs[orderId];
    if (reservationNumber && reservationNumber.trim() !== '') {
      onAddReservation(orderId, reservationNumber.trim());
    }
  };

  const handleExportCSV = () => {
    const headers = ['Farm Name', 'Tank Type', 'Quantity (Liters)', 'Status', 'Required Date', 'Received Date', 'Reservation No', 'Requester Name', 'Requester Contact'];
    
    const rows = orders.map(order => {
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
    link.setAttribute("download", `RecentDieselOrders.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 border-b pb-4">
            <div className="flex items-center gap-4">
                <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                        <BackArrowIcon />
                </button>
                <h3 className="text-xl font-semibold text-gray-800">Recent Diesel Orders</h3>
            </div>
            <button onClick={handleExportCSV} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors self-start sm:self-center">
                Export CSV
            </button>
        </div>
        {orders.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent orders.</p>
        ) : (
          <ul className="space-y-4 max-h-96 overflow-y-auto">
            {orders.map((order) => {
              const isCompleteDisabled = currentUser.role !== 'Admin' && !order.reservationNumber;
              return (
              <li key={order.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">
                        {order.farmName}{order.tankType ? ` (${order.tankType})` : ''} - {order.quantity} Liters
                        </p>
                        {currentUser.role === 'Admin' && order.meta && (
                            <div className="relative group">
                                <ClockIcon />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 whitespace-nowrap">
                                    Created by: <strong>{order.meta.createdBy}</strong> at {new Date(order.meta.createdAt).toLocaleString()}
                                    <br/>
                                    Last updated by: <strong>{order.meta.updatedBy}</strong> at {new Date(order.meta.updatedAt).toLocaleString()}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Required by: {order.requiredDate}
                    </p>
                     <p className="text-sm text-gray-500">
                      Requested by: {order.requesterName || 'N/A'} {order.requesterContact && `(${order.requesterContact})`}
                    </p>
                    {order.status === 'Completed' && order.receivedDate && (
                      <p className="text-sm text-green-700 font-medium mt-1">
                          Received on: {order.receivedDate}
                      </p>
                    )}
                     {order.reservationNumber && (
                      <p className="text-sm text-gray-600 font-mono mt-1" aria-label="Reservation Number">
                          RV#: {order.reservationNumber}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      order.status === 'Pending' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {order.status}
                    </span>
                    {order.status === 'Pending' && currentUser.role !== 'Admin' && (
                      <button
                        onClick={() => handleOpenModal(order)}
                        disabled={isCompleteDisabled}
                        className={`px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-md transition-colors ${isCompleteDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500'}`}
                        aria-label={isCompleteDisabled ? `Complete button disabled until reservation number is added` : `Mark order for ${order.farmName} as completed`}
                        title={isCompleteDisabled ? "Awaiting reservation number from admin." : "Mark as completed"}
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>

                {currentUser.role === 'Admin' && order.status === 'Pending' && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter Reservation No."
                      value={reservationInputs[order.id] ?? order.reservationNumber ?? ''}
                      onChange={(e) => handleReservationChange(order.id, e.target.value)}
                      className="flex-grow px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      aria-label={`Reservation number for order ${order.id}`}
                    />
                    <button
                      onClick={() => handleSaveReservation(order.id)}
                      className="px-2 py-1 text-xs font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
                      disabled={!reservationInputs[order.id] || reservationInputs[order.id].trim() === '' || reservationInputs[order.id].trim() === order.reservationNumber}
                    >
                      Save
                    </button>
                  </div>
                )}
              </li>
            )})}
          </ul>
        )}
      </div>

      {isModalOpen && selectedOrder && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-order-title"
        >
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 id="complete-order-title" className="text-lg font-semibold text-gray-800">Complete Order</h3>
            <p className="text-sm text-gray-600 mt-1">
              For <span className="font-bold">{selectedOrder.farmName}{selectedOrder.tankType ? ` (${selectedOrder.tankType})` : ''}</span> ({selectedOrder.quantity} Liters).
            </p>
            <div className="mt-4">
              <label htmlFor="receivedDate" className="block text-sm font-medium text-gray-700 mb-1">
                Received Date
              </label>
              <input
                id="receivedDate"
                type="date"
                value={receivedDate}
                onChange={(e) => {
                  setReceivedDate(e.target.value);
                  if (error) setError('');
                }}
                className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
                aria-invalid={!!error}
                aria-describedby={error ? "date-error" : undefined}
              />
              {error && <p id="date-error" className="mt-1 text-sm text-red-600">{error}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DieselOrdersList;