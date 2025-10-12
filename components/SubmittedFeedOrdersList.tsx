
import React, { useState, useMemo } from 'react';
import type { SubmittedFeedOrder, User, FeedDeliveryRecordData } from '../types';
import FeedDeliveryConfirmationModal from './FeedDeliveryConfirmationModal';

interface SubmittedFeedOrdersListProps {
  orders: SubmittedFeedOrder[];
  onConfirmFeedDelivery: (orderId: string, actualDeliveryDate: string, deliveryData: FeedDeliveryRecordData) => void;
  onUpdateConfirmedFeedDelivery: (orderId: string, actualDeliveryDate: string, deliveryData: FeedDeliveryRecordData) => void;
  currentUser: User;
  onBack: () => void;
  onEdit: (order: SubmittedFeedOrder) => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chevron transition-transform duration-200"><polyline points="6 9 12 15 18 9"></polyline></svg>
);

const SubmittedFeedOrdersList: React.FC<SubmittedFeedOrdersListProps> = ({ orders, onConfirmFeedDelivery, onUpdateConfirmedFeedDelivery, currentUser, onBack, onEdit }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SubmittedFeedOrder | null>(null);

  const canDeliver = currentUser.role === 'Admin' || currentUser.role === 'Supervisor' || currentUser.role === 'Leadman';

  const handleOpenModal = (order: SubmittedFeedOrder) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleConfirm = (deliveryDate: string, deliveryData: FeedDeliveryRecordData) => {
    if (selectedOrder) {
      if (selectedOrder.status === 'Delivered') {
        onUpdateConfirmedFeedDelivery(selectedOrder.id, deliveryDate, deliveryData);
      } else {
        onConfirmFeedDelivery(selectedOrder.id, deliveryDate, deliveryData);
      }
      handleCloseModal();
    }
  };
  
  const totalQuantity = (order: SubmittedFeedOrder) => {
    return order.items.reduce((total, item) => total + (parseFloat(item.quantity) || 0), 0).toFixed(3);
  };
  
  const handleExportCSV = () => {
    const headers = ['Farm Name', 'Priority', 'Order Date', 'Requested Delivery Date', 'Total Quantity (Tons)', 'Status', 'Actual Delivery Date'];
    
    const rows = orders.map(order => {
        const rowData = [
            order.farmName,
            order.priority || 'Normal',
            order.orderDate,
            order.deliveryDate,
            totalQuantity(order),
            order.status,
            order.actualDeliveryDate || ''
        ];
        return rowData.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `RecentFeedOrders.csv`);
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
                <h3 className="text-xl font-semibold text-gray-800">Recent Feed Orders</h3>
            </div>
            <button onClick={handleExportCSV} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors self-start sm:self-center">
                Export CSV
            </button>
        </div>
        {orders.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent orders.</p>
        ) : (
          <ul className="space-y-2">
            {orders.map((order) => (
              <li key={order.id} className="bg-gray-50 rounded-md border border-gray-200">
                <details className="p-3">
                  <summary className="flex justify-between items-center cursor-pointer list-none">
                    <div className="flex items-center gap-4">
                        <ChevronDownIcon />
                        <div>
                            <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-800">
                                {order.farmName} - {totalQuantity(order)} Tons
                            </p>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                order.priority === 'Emergency' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                                {order.priority || 'Normal'}
                            </span>
                            </div>
                            <p className="text-sm text-gray-500">
                            Ordered on: {order.orderDate}
                            </p>
                            {order.status === 'Delivered' && order.actualDeliveryDate && (
                            <p className="text-sm text-green-700 font-medium mt-1">
                                Delivered on: {order.actualDeliveryDate}
                            </p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        order.status === 'Submitted' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                        {order.status}
                        </span>
                        {order.status === 'Submitted' && canDeliver && (
                        <div className="flex items-center gap-2">
                            <button
                            onClick={(e) => { e.preventDefault(); onEdit(order); }}
                            className="px-2 py-1 text-xs font-semibold text-white bg-blue-500 rounded-md transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                            aria-label={`Edit order for ${order.farmName}`}
                            >
                            Edit
                            </button>
                            <button
                            onClick={(e) => { e.preventDefault(); handleOpenModal(order); }}
                            className="px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-md transition-colors hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500"
                            aria-label={`Mark order for ${order.farmName} as delivered`}
                            >
                            Deliver
                            </button>
                        </div>
                        )}
                        {order.status === 'Delivered' && canDeliver && (
                            <button
                                onClick={(e) => { e.preventDefault(); handleOpenModal(order); }}
                                className="px-2 py-1 text-xs font-semibold text-white bg-blue-500 rounded-md transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                                aria-label={`Edit delivery for ${order.farmName}`}
                            >
                                Edit Delivery
                            </button>
                        )}
                    </div>
                  </summary>
                  <div className="mt-4 pt-3 border-t">
                     <h4 className="text-sm font-semibold text-gray-700 mb-2">Order Breakdown:</h4>
                     <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="px-2 py-1 text-left">House</th>
                                    <th className="px-2 py-1 text-left">Delivery Date</th>
                                    <th className="px-2 py-1 text-left">Age</th>
                                    <th className="px-2 py-1 text-left">Feed Type</th>
                                    <th className="px-2 py-1 text-right">Quantity (Tons)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.filter(item => item.quantity && parseFloat(item.quantity) > 0).map((item, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="px-2 py-1">{item.houseNo}</td>
                                        <td className="px-2 py-1">{item.deliveryDate}</td>
                                        <td className="px-2 py-1">{item.age}</td>
                                        <td className="px-2 py-1">{item.feedType}</td>
                                        <td className="px-2 py-1 text-right font-medium">{parseFloat(item.quantity).toFixed(3)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                     {order.remarks && (
                         <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-600">Remarks:</p>
                            <p className="text-xs text-gray-800 bg-gray-100 p-2 rounded">{order.remarks}</p>
                         </div>
                     )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isModalOpen && selectedOrder && (
        <FeedDeliveryConfirmationModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onConfirm={handleConfirm}
            order={selectedOrder}
        />
      )}
    </>
  );
};

export default SubmittedFeedOrdersList;
