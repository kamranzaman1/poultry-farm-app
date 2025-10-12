import React, { useState, useMemo, useEffect } from 'react';
import type { SubmittedFeedOrder, FeedDeliveryRecordData } from '../types';
import { getHouseCountForFarm } from '../constants';
import { createEmptyFeedDeliveryRecord, parsePastedText } from '../utils/dataHelper';

interface FeedDeliveryConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deliveryDate: string, deliveryData: FeedDeliveryRecordData) => void;
  order: SubmittedFeedOrder;
}

const feedTypes: (keyof FeedDeliveryRecordData['houses'][0])[] = ['starter', 'growerCR', 'growerPL', 'finisher'];

const feedLabels: Record<keyof FeedDeliveryRecordData['houses'][0], string> = {
  starter: 'Starter (Kg)',
  growerCR: 'Grower CR (Kg)',
  growerPL: 'Grower PL (Kg)',
  finisher: 'Finisher (Kg)',
};

const FeedDeliveryConfirmationModal: React.FC<FeedDeliveryConfirmationModalProps> = ({ isOpen, onClose, onConfirm, order }) => {
  const houseCount = useMemo(() => getHouseCountForFarm(order.farmName), [order.farmName]);
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryData, setDeliveryData] = useState<FeedDeliveryRecordData>(() => createEmptyFeedDeliveryRecord(houseCount));
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      // If editing, use the actual delivery date. If new, use requested date, fallback to today.
      setDeliveryDate(order.actualDeliveryDate || order.deliveryDate || new Date().toISOString().split('T')[0]);

      // If editing an existing delivery (order has deliveredQuantities), use that data.
      // Otherwise, calculate from the original order items.
      if (order.deliveredQuantities) {
          const adjustedHouses = Array.from({ length: houseCount }, (_, i) => 
              order.deliveredQuantities.houses[i] || createEmptyFeedDeliveryRecord(1).houses[0]
          );
          setDeliveryData({ houses: adjustedHouses });
      } else {
        const newDeliveryData = createEmptyFeedDeliveryRecord(houseCount);
        order.items.forEach(item => {
          if (!item.quantity) return;
          const quantityInTons = parseFloat(item.quantity);
          if (isNaN(quantityInTons) || quantityInTons <= 0) return;
          const quantityInKg = (quantityInTons * 1000).toString();
          const houseIndex = item.houseNo - 1;
          if (houseIndex >= 0 && houseIndex < houseCount) {
            switch (item.feedType) {
              case 'Broiler Starter': newDeliveryData.houses[houseIndex].starter = quantityInKg; break;
              case 'Broiler Grower CR': newDeliveryData.houses[houseIndex].growerCR = quantityInKg; break;
              case 'Broiler Grower PL': newDeliveryData.houses[houseIndex].growerPL = quantityInKg; break;
              case 'Broiler Finisher': newDeliveryData.houses[houseIndex].finisher = quantityInKg; break;
              default: break;
            }
          }
        });
        setDeliveryData(newDeliveryData);
      }
      setError('');
    }
  }, [isOpen, order, houseCount]);


  const handleInputChange = (houseIndex: number, feedType: keyof FeedDeliveryRecordData['houses'][0], value: string) => {
    setDeliveryData(prev => {
        const newHouses = [...prev.houses];
        newHouses[houseIndex] = { ...newHouses[houseIndex], [feedType]: value };
        return { ...prev, houses: newHouses };
    });
  };
  
  const totals = useMemo(() => {
    return deliveryData.houses.reduce((acc, house) => {
        feedTypes.forEach(ft => {
            acc[ft] = (acc[ft] || 0) + (parseFloat(house[ft]) || 0);
        });
        return acc;
    }, {} as Record<keyof FeedDeliveryRecordData['houses'][0], number>);
  }, [deliveryData]);

  const handleSubmit = () => {
    if (!deliveryDate) {
      setError('Delivery date is required.');
      return;
    }
    setError('');
    onConfirm(deliveryDate, deliveryData);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();

    const currentInput = e.currentTarget as HTMLElement;
    const container = currentInput.closest('.max-h-80.overflow-y-auto');
    if (!container) return;

    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[data-row-index]'));
    
    const currentInputElement = e.currentTarget as HTMLInputElement;
    const currentRow = parseInt(currentInputElement.getAttribute('data-row-index')!, 10);
    const currentCol = parseInt(currentInputElement.getAttribute('data-col-index')!, 10);

    const totalRows = houseCount;
    const totalCols = feedTypes.length;

    let nextRow = currentRow;
    let nextCol = currentCol;

    switch (e.key) {
        case 'ArrowUp':
            nextRow = Math.max(0, currentRow - 1);
            break;
        case 'ArrowDown':
            nextRow = Math.min(totalRows - 1, currentRow + 1);
            break;
        case 'ArrowLeft':
            nextCol = Math.max(0, currentCol - 1);
            break;
        case 'ArrowRight':
            nextCol = Math.min(totalCols - 1, currentCol + 1);
            break;
    }

    const nextInput = inputs.find(input =>
        parseInt(input.getAttribute('data-row-index')!, 10) === nextRow &&
        parseInt(input.getAttribute('data-col-index')!, 10) === nextCol
    );

    if (nextInput) {
        nextInput.focus();
        nextInput.select();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTableSectionElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const pastedRows = parsePastedText(text);

    const target = e.target as HTMLInputElement;
    const startRow = parseInt(target.getAttribute('data-row-index')!, 10);
    const startCol = parseInt(target.getAttribute('data-col-index')!, 10);

    if (isNaN(startRow) || isNaN(startCol)) return;
    
    setDeliveryData(prevData => {
        const newHouses = prevData.houses.map(h => ({ ...h }));

        pastedRows.forEach((pastedRow, rowIndex) => {
            const targetRow = startRow + rowIndex;
            if (targetRow < newHouses.length) {
                pastedRow.forEach((pastedCell, colIndex) => {
                    const targetCol = startCol + colIndex;
                    if (targetCol < feedTypes.length) {
                        const fieldName = feedTypes[targetCol];
                        (newHouses[targetRow] as any)[fieldName] = pastedCell;
                    }
                });
            }
        });
        
        return { ...prevData, houses: newHouses };
    });
};
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-confirmation-title"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 id="delivery-confirmation-title" className="text-lg font-semibold text-gray-800">Confirm Feed Delivery</h3>
        <p className="text-sm text-gray-600 mt-1">
          Enter the actual quantities delivered in <span className="font-bold">Kilograms (Kg)</span> to <span className="font-bold">{order.farmName}</span>. This will automatically create a feed delivery record.
        </p>

        <div className="mt-4">
          <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700 mb-1">
            Actual Delivery Date
          </label>
          <input
            id="deliveryDate"
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className={`w-full max-w-xs px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
            aria-invalid={!!error}
            aria-describedby={error ? "date-error" : undefined}
          />
          {error && <p id="date-error" className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-4 max-h-80 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-2 py-2 text-left font-medium text-gray-500">House</th>
                        {feedTypes.map(ft => <th key={ft} className="px-2 py-2 text-left font-medium text-gray-500">{feedLabels[ft]}</th>)}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200" onPaste={handlePaste}>
                    {deliveryData.houses.map((house, houseIndex) => (
                        <tr key={houseIndex}>
                            <td className="px-2 py-1 font-medium text-gray-800">{houseIndex + 1}</td>
                            {feedTypes.map((ft, feedIndex) => (
                                <td key={ft} className="px-1 py-1">
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="Kg"
                                        value={house[ft]}
                                        onChange={(e) => handleInputChange(houseIndex, ft, e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        data-row-index={houseIndex}
                                        data-col-index={feedIndex}
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold sticky bottom-0">
                    <tr>
                        <td className="px-2 py-2 text-left">Total</td>
                        {feedTypes.map(ft => (
                            <td key={ft} className="px-2 py-2 text-left">
                                {totals[ft]?.toLocaleString() || '0'}
                            </td>
                        ))}
                    </tr>
                </tfoot>
            </table>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
            Confirm Delivery
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedDeliveryConfirmationModal;
