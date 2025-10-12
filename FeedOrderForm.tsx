import React, { useState, useMemo, useEffect } from 'react';
import type { FeedOrderData, ChicksReceivingData, SelectedFarmCycleDetails } from '../types';
import PreviewModal from './PreviewModal';
import { parsePastedText } from '../utils/dataHelper';

interface FeedOrderFormProps {
  farmName: string;
  initialData: FeedOrderData;
  onAddSubmittedFeedOrder: (farmName: string, data: FeedOrderData) => void;
  chicksReceivingData: ChicksReceivingData;
  onBack: () => void;
  selectedFarmCycleDetails: SelectedFarmCycleDetails | null;
  editingOrderId: string | null;
  onUpdateSubmittedFeedOrder: (orderId: string, farmName: string, data: FeedOrderData) => void;
  onCancelEdit: () => void;
}

const feedTypes = [
  { value: '', label: 'Select type...' },
  { value: 'Broiler Starter', label: 'Broiler Starter' },
  { value: 'Broiler Grower CR', label: 'Broiler Grower CR' },
  { value: 'Broiler Grower PL', label: 'Broiler Grower PL' },
  { value: 'Broiler Finisher', label: 'Broiler Finisher' },
];

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const FeedOrderForm: React.FC<FeedOrderFormProps> = ({ 
    farmName, 
    initialData, 
    onAddSubmittedFeedOrder, 
    chicksReceivingData, 
    onBack, 
    selectedFarmCycleDetails,
    editingOrderId,
    onUpdateSubmittedFeedOrder,
    onCancelEdit,
}) => {
  const [data, setData] = useState<FeedOrderData>(() => ({
    ...initialData,
    orderDate: initialData.orderDate || new Date().toISOString().split('T')[0]
  }));
  const [isSaved, setIsSaved] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState('');

  const isEditing = !!editingOrderId;

  useEffect(() => {
    if (selectedFarmCycleDetails?.finishDate) {
        const finishDate = new Date(selectedFarmCycleDetails.finishDate.replace(/-/g, '/'));
        finishDate.setHours(23, 59, 59, 999);

        // Check if any delivery date in the items is after the finish date
        const isAnyDateInvalid = data.items.some(item => {
            if (!item.deliveryDate) return false;
            const deliveryDate = new Date(item.deliveryDate.replace(/-/g, '/'));
            return deliveryDate > finishDate;
        });

        if (isAnyDateInvalid) {
            setIsLocked(true);
            setLockMessage(`One or more delivery dates are after the cycle finish date of ${selectedFarmCycleDetails.finishDate}.`);
        } else {
            setIsLocked(false);
            setLockMessage('');
        }
    } else {
        setIsLocked(false);
        setLockMessage('');
    }
  }, [data.items, selectedFarmCycleDetails]);


  useEffect(() => {
    setData({
        ...initialData,
        orderDate: initialData.orderDate || new Date().toISOString().split('T')[0]
    });
  }, [initialData]);


  // Create a string representation of all dates that influence the age calculation.
  // This creates a stable, primitive dependency for the useEffect hook, preventing infinite loops.
  const dateDependencies = useMemo(() => {
    const placementDates = chicksReceivingData.houses.map(h => h.placementDate);
    const deliveryDates = data.items.map(i => i.deliveryDate);
    return JSON.stringify({ placementDates, deliveryDates });
  }, [chicksReceivingData.houses, data.items]);

  useEffect(() => {
    const placementDates = chicksReceivingData.houses;
    let hasChanged = false;
    
    const updatedItems = data.items.map((item, index) => {
        const deliveryDateStr = item.deliveryDate;
        const placementDateStr = placementDates[index]?.placementDate;
        let newAge = item.age; // Default to existing age to avoid flicker

        if (placementDateStr && deliveryDateStr) {
            try {
                // Use .replace to ensure dates are parsed in the local timezone
                const placementDate = new Date(placementDateStr.replace(/-/g, '/'));
                const deliveryDate = new Date(deliveryDateStr.replace(/-/g, '/'));
                
                if (!isNaN(placementDate.getTime()) && !isNaN(deliveryDate.getTime()) && deliveryDate >= placementDate) {
                    const diffTime = deliveryDate.getTime() - placementDate.getTime();
                    // Age is inclusive of the placement day
                    const ageInDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    const calculatedAge = ageInDays.toString();
                    
                    if (calculatedAge !== item.age) {
                        newAge = calculatedAge;
                        hasChanged = true;
                    }
                } else if (item.age !== '') { // Dates are invalid, clear the age if it was set
                    newAge = '';
                    hasChanged = true;
                }
            } catch (error) {
                console.error("Error calculating age:", error);
                if (item.age !== '') {
                    newAge = '';
                    hasChanged = true;
                }
            }
        } else if (item.age !== '') { // A date is missing, clear the age if it was set
            newAge = '';
            hasChanged = true;
        }

        return { ...item, age: newAge };
    });
    
    // Only update state if an age has actually changed to prevent re-render loops
    if (hasChanged) {
        setData(currentData => ({ ...currentData, items: updatedItems }));
    }
  }, [dateDependencies]); // This effect now reliably runs only when relevant dates change.


  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'deliveryDate') {
        setData(prevData => {
            const updatedItems = prevData.items.map(item => ({
                ...item,
                deliveryDate: value,
            }));
            return {
                ...prevData,
                deliveryDate: value,
                items: updatedItems
            };
        });
    } else {
        setData(prevData => ({ ...prevData, [name]: value }));
    }
  };

  const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData(prevData => {
        let newItems;
        if (name === 'feedType' && index === 0) {
            // If feed type of the first row is changed, apply it to all rows
            newItems = prevData.items.map(item => ({
                ...item,
                feedType: value,
            }));
        } else {
            // Otherwise, update only the specific item
            newItems = prevData.items.map((item, i) => {
                if (i === index) {
                    return { ...item, [name]: value };
                }
                return item;
            });
        }
        return { ...prevData, items: newItems };
    });
  };
  
  const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setData({ ...data, remarks: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (isEditing) {
        onUpdateSubmittedFeedOrder(editingOrderId, farmName, data);
    } else {
        onAddSubmittedFeedOrder(farmName, data);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    }
  };
  
  const grandTotal = useMemo(() => {
    return data.items.reduce((total, item) => total + (parseFloat(item.quantity) || 0), 0);
  }, [data.items]);
  
  const itemsWithQuantity = useMemo(() => {
      return data.items.filter(item => item.quantity && parseFloat(item.quantity) > 0);
  }, [data.items]);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();

    const tableBody = (e.currentTarget as HTMLElement).closest('tbody');
    if (!tableBody) return;

    const inputs = Array.from(tableBody.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[data-row-index], select[data-row-index]'));
    const currentInput = e.currentTarget;
    const currentRow = parseInt(currentInput.getAttribute('data-row-index')!, 10);
    const currentCol = parseInt(currentInput.getAttribute('data-col-index')!, 10);
    const totalRows = data.items.length;
    const totalCols = 3; // deliveryDate, feedType, quantity

    let nextRow = currentRow;
    let nextCol = currentCol;

    if (e.key === 'ArrowUp') nextRow = Math.max(0, currentRow - 1);
    if (e.key === 'ArrowDown') nextRow = Math.min(totalRows - 1, currentRow + 1);
    if (e.key === 'ArrowLeft') nextCol = Math.max(0, currentCol - 1);
    if (e.key === 'ArrowRight') nextCol = Math.min(totalCols - 1, currentCol + 1);
    
    const nextInput = inputs.find(input => 
      parseInt(input.getAttribute('data-row-index')!, 10) === nextRow &&
      parseInt(input.getAttribute('data-col-index')!, 10) === nextCol
    ) as HTMLElement | null;
    
    if (nextInput) {
      nextInput.focus();
      if (nextInput.tagName === 'INPUT') (nextInput as HTMLInputElement).select();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTableSectionElement>) => {
    if (isLocked) return;

    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const pastedRows = parsePastedText(text);
    
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const startRow = parseInt(target.getAttribute('data-row-index')!, 10);
    const startCol = parseInt(target.getAttribute('data-col-index')!, 10);

    if (isNaN(startRow) || isNaN(startCol)) return;
    
    const colMap = ['deliveryDate', 'feedType', 'quantity'];

    // Transpose paste for a single row of data
    if (pastedRows.length === 1 && pastedRows[0].length > 1) {
        const pastedData = pastedRows[0];
        setData(prevData => {
            const newItems = prevData.items.map(item => ({...item}));
            pastedData.forEach((cellValue, index) => {
                const targetRow = startRow + index;
                if (targetRow < newItems.length) {
                    // col-index 0 is deliveryDate
                    if (startCol === 0) {
                        newItems[targetRow].deliveryDate = cellValue;
                    }
                    // col-index 1 is feedType
                    if (startCol === 1) {
                        const matchingOption = feedTypes.find(opt => opt.label.toLowerCase() === cellValue.trim().toLowerCase());
                        newItems[targetRow].feedType = matchingOption ? matchingOption.value : '';
                    }
                    // col-index 2 is quantity
                    if (startCol === 2) {
                        newItems[targetRow].quantity = cellValue;
                    }
                }
            });
            return { ...prevData, items: newItems };
        });
        return;
    }

    // Standard block paste
    setData(prevData => {
        const newItems = prevData.items.map(item => ({...item}));
        
        pastedRows.forEach((pastedRow, rowIndex) => {
            const targetRow = startRow + rowIndex;
            if (targetRow < newItems.length) {
                pastedRow.forEach((pastedCell, colIndex) => {
                    const targetCol = startCol + colIndex;
                    
                    if (targetCol >= colMap.length) return;
                    const fieldName = colMap[targetCol];

                    if (fieldName === 'feedType') {
                        const matchingOption = feedTypes.find(opt => opt.label.toLowerCase() === pastedCell.trim().toLowerCase());
                        const valueToSet = matchingOption ? matchingOption.value : '';
                        
                        if (targetRow === 0) {
                            newItems.forEach(item => item.feedType = valueToSet);
                        } else {
                            (newItems[targetRow] as any)[fieldName] = valueToSet;
                        }
                    } else {
                        (newItems[targetRow] as any)[fieldName] = pastedCell;
                    }
                });
            }
        });
        
        return { ...prevData, items: newItems };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
       <div className="flex items-center gap-4 mb-4">
           <button type="button" onClick={isEditing ? onCancelEdit : onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back">
                <BackArrowIcon />
            </button>
            <div className="text-center flex-grow">
                <h2 className="text-xl font-bold text-gray-800">AL-Watania Poultry Company</h2>
                <p className="text-sm text-gray-600">Broiler Production Dep.</p>
                <h3 className="text-lg font-semibold text-gray-800 mt-2 border-y-2 border-black py-1 inline-block tracking-widest">
                    {isEditing ? 'EDIT FEED ORDER' : 'FEED ORDER FORM'}
                </h3>
            </div>
      </div>

      {isLocked && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 text-sm rounded-md" role="alert">
            <p><span className="font-bold">Form Locked:</span> {lockMessage}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4 border-y py-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Farm No.:</label>
          <input type="text" value={farmName} disabled className="mt-1 w-full px-3 py-2 border bg-gray-100 border-gray-300 rounded-md shadow-sm" />
        </div>
         <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Priority:</label>
          <select id="priority" name="priority" value={data.priority} onChange={handleHeaderChange} disabled={isLocked} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100">
              <option value="Normal">Normal</option>
              <option value="Emergency">Emergency</option>
          </select>
        </div>
        <div>
          <label htmlFor="orderDate" className="block text-sm font-medium text-gray-700">Order Date:</label>
          <input type="date" id="orderDate" name="orderDate" value={data.orderDate} onChange={handleHeaderChange} disabled={isLocked} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" />
        </div>
        <div>
          <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700">DELIVERY DATE (all houses):</label>
          <input type="date" id="deliveryDate" name="deliveryDate" value={data.deliveryDate} onChange={handleHeaderChange} disabled={isLocked} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" />
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="feedMillNo" className="block text-sm font-medium text-gray-700">Feed Mill No.:</label>
          <input type="text" id="feedMillNo" name="feedMillNo" value={data.feedMillNo} onChange={handleHeaderChange} disabled={isLocked} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" />
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">Tip: You can copy a block of cells (rows and columns) or a single row of data from Excel and paste it into the table.</p>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">House No.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Delivery Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Age</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Type of Feed Required</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty in (Tons)</th>
            </tr>
          </thead>
          <tbody className={`bg-white divide-y divide-gray-200 ${isLocked ? 'bg-gray-50' : ''}`} onPaste={handlePaste}>
            {data.items.map((item, i) => (
              <tr key={i}>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-r">{item.houseNo}</td>
                <td className="px-2 py-1 whitespace-nowrap border-r">
                  <input type="date" name="deliveryDate" value={item.deliveryDate} disabled={isLocked} onChange={(e) => handleItemChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={0} className="w-full border-none focus:ring-0 bg-transparent disabled:bg-transparent" />
                </td>
                <td className="px-2 py-1 whitespace-nowrap border-r">
                  <input type="number" name="age" value={item.age} readOnly disabled className="w-full border-none focus:ring-0 bg-gray-100" />
                </td>
                <td className="px-2 py-1 whitespace-nowrap border-r">
                   <select name="feedType" value={item.feedType} disabled={isLocked} onChange={(e) => handleItemChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={1} className="w-full border-none focus:ring-0 disabled:bg-transparent">
                    {feedTypes.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                   </select>
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  <input type="number" step="0.01" name="quantity" value={item.quantity} disabled={isLocked} onChange={(e) => handleItemChange(i, e)} onKeyDown={handleKeyDown} data-row-index={i} data-col-index={2} className="w-full border-none focus:ring-0 disabled:bg-transparent" />
                </td>
              </tr>
            ))}
          </tbody>
           <tfoot className="bg-gray-50">
                <tr>
                    <td colSpan={4} className="px-4 py-2 text-right font-bold text-gray-700 border-t-2 border-b">Grand Total:</td>
                    <td className="px-4 py-2 font-bold text-gray-900">{grandTotal.toFixed(3)}</td>
                </tr>
            </tfoot>
        </table>
      </div>
      
       <div className="mt-6">
        <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">Remarks:</label>
        <textarea id="remarks" name="remarks" value={data.remarks} onChange={handleRemarksChange} rows={3} disabled={isLocked} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" />
      </div>

      <div className="mt-8 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 text-sm text-gray-700">
        <p className="border-b border-gray-400 border-dotted pb-1">Ordered By:</p>
        <p className="border-b border-gray-400 border-dotted pb-1">L. Man Sign:</p>
        <p className="border-b border-gray-400 border-dotted pb-1">Ordered By:</p>
        <p className="border-b border-gray-400 border-dotted pb-1">I / C. Sign:</p>
      </div>
      
      <div className="mt-6 flex justify-end items-center gap-4">
         {isSaved && !isEditing && <span className="text-green-600 text-sm mr-auto">Submitted Successfully</span>}
        {isEditing && (
            <button type="button" onClick={onCancelEdit} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300">
                Cancel
            </button>
        )}
        <button type="button" onClick={() => setIsPreviewOpen(true)} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">
          Preview
        </button>
        <button type="submit" disabled={isLocked} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {isEditing ? 'Update Order' : 'Submit Feed Order'}
        </button>
      </div>
      <PreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title={`Feed Order: ${farmName}`}>
        <div className="space-y-6 text-sm">
            <div className="space-y-2">
                <h4 className="font-bold text-base text-gray-800 border-b pb-2 mb-2">Order Details</h4>
                <div className="flex justify-between"><span className="text-gray-600">Priority:</span> <span className={`font-medium ${data.priority === 'Emergency' ? 'text-red-600' : 'text-gray-900'}`}>{data.priority}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Order Date:</span> <span className="font-medium text-gray-900">{data.orderDate || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Delivery Date:</span> <span className="font-medium text-gray-900">{data.deliveryDate || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Feed Mill No:</span> <span className="font-medium text-gray-900">{data.feedMillNo || 'N/A'}</span></div>
            </div>

            <div>
                <h4 className="font-bold text-base text-gray-800 border-b pb-2 mb-2">Order Items</h4>
                {itemsWithQuantity.length > 0 ? (
                    <div className="space-y-3">
                        {itemsWithQuantity.map((item, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-md border">
                                <p className="font-semibold text-gray-800">House {item.houseNo}</p>
                                <div className="mt-1 text-xs space-y-1">
                                    <div className="flex justify-between"><span className="text-gray-600">Age:</span> <span className="font-medium text-gray-900">{item.age || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-600">Delivery:</span> <span className="font-medium text-gray-900">{item.deliveryDate || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-600">Feed Type:</span> <span className="font-medium text-gray-900 text-right">{item.feedType || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-600">Quantity:</span> <span className="font-bold text-blue-600">{item.quantity} Tons</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No items with quantity entered.</p>
                )}
            </div>
            
            <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-base">
                    <span className="text-gray-800">Grand Total:</span>
                    <span className="text-blue-700">{grandTotal.toFixed(3)} Tons</span>
                </div>
            </div>

            {data.remarks && (
                 <div>
                    <h4 className="font-bold text-base text-gray-800 border-b pb-2 mb-2">Remarks</h4>
                    <p className="p-2 bg-gray-50 rounded-md text-gray-700">{data.remarks}</p>
                </div>
            )}
        </div>
      </PreviewModal>
    </form>
  );
};

export default FeedOrderForm;
