
import React, { useState, useMemo, useEffect } from 'react';
import type { FeedDeliveryRecord, FeedDeliveryRecordData, FeedDeliveryHouseRecord, SelectedFarmCycleDetails, User } from '../types';
import { getHouseCountForFarm } from '../constants';
import { createEmptyFeedDeliveryRecord } from '../utils/dataHelper';

interface FeedDeliveryRecordFormProps {
  farmName: string;
  feedDeliveryRecords: FeedDeliveryRecord[];
  onBack: () => void;
  selectedFarmCycleDetails: SelectedFarmCycleDetails | null;
  currentUser: User;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

type FeedType = keyof FeedDeliveryHouseRecord;
const feedTypes: FeedType[] = ['starter', 'growerCR', 'growerPL', 'finisher'];
const feedLabels: Record<FeedType, string> = {
  starter: 'Starter (Kg)',
  growerCR: 'Grower CR (Kg)',
  growerPL: 'Grower PL (Kg)',
  finisher: 'Finisher (Kg)',
};

// FIX: Added explicit prop types for the modal component to prevent type inference issues.
interface ReportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  records: FeedDeliveryRecord[];
}

const ReportHistoryModal: React.FC<ReportHistoryModalProps> = ({ isOpen, onClose, onSelectDate, records }) => {
    const historyData = useMemo(() => {
        const enteredDates = new Set(records.map(r => r.date));
        if (enteredDates.size === 0) return [];
        return Array.from(enteredDates)
            .sort((a: string, b: string) => b.localeCompare(a));
    }, [records]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col h-[80vh]" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-800 p-4 border-b">Delivery History</h3>
                <div className="flex-grow overflow-y-auto p-4">
                    {historyData.length === 0 ? (
                        <p className="text-gray-500 text-center">No delivery records found for this cycle.</p>
                    ) : (
                        <ul className="space-y-2">
                            {historyData.map(date => (
                                <li key={date} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
                                    <div className="flex items-center gap-3">
                                        <CheckCircleIcon />
                                        <span className="font-mono text-sm">{date}</span>
                                    </div>
                                    <button onClick={() => onSelectDate(date)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                        View
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="p-4 border-t bg-gray-50">
                    <button onClick={onClose} className="w-full px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const FeedDeliveryRecordForm: React.FC<FeedDeliveryRecordFormProps> = ({ farmName, feedDeliveryRecords, onBack, selectedFarmCycleDetails, currentUser }) => {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const houseCount = useMemo(() => getHouseCountForFarm(farmName), [farmName]);
  
  const emptyRecord = useMemo(() => createEmptyFeedDeliveryRecord(houseCount), [houseCount]);
  
  const recordForDate = useMemo(() => {
    const record = feedDeliveryRecords.find(r => r.date === date);
    if (!record) return emptyRecord;
    const adjustedHouses = Array.from({ length: houseCount }, (_, i) => record.houses[i] || createEmptyFeedDeliveryRecord(1).houses[0]);
    return { ...record, houses: adjustedHouses };
  }, [date, feedDeliveryRecords, houseCount, emptyRecord]);

  const data: FeedDeliveryRecordData = recordForDate.houses ? { houses: recordForDate.houses } : emptyRecord;

  const totals = useMemo(() => {
    return data.houses.reduce((acc, house) => {
        feedTypes.forEach(ft => acc[ft] += parseFloat(house[ft]) || 0);
        return acc;
    }, { starter: 0, growerCR: 0, growerPL: 0, finisher: 0 });
  }, [data]);

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-4 mb-4">
           <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                <BackArrowIcon />
            </button>
            <h3 className="text-xl font-semibold text-gray-800">Feed Delivery Record</h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:items-end mb-4 p-4 border rounded-md bg-gray-50">
            <div>
                <label htmlFor="record-date" className="block text-sm font-medium text-gray-700">Date</label>
                <input type="date" id="record-date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
            <button type="button" onClick={() => setIsHistoryModalOpen(true)} className="px-4 py-2 bg-white text-gray-800 font-semibold rounded-lg border border-gray-300 shadow-sm hover:bg-gray-100">
              History
            </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-md">
          Note: This is a read-only view. Records are created and updated automatically when a feed order delivery is confirmed in the "Feed Order Mgt." section.
        </div>

        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">House No.</th>
                        {feedTypes.map(ft => <th key={ft} className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">{feedLabels[ft]}</th>)}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.houses.map((house, houseIndex) => (
                        <tr key={houseIndex} className="bg-gray-50">
                            <td className="px-2 py-2 font-medium">{houseIndex + 1}</td>
                            {feedTypes.map(ft => (
                                <td key={ft} className="px-1 py-1">
                                    <input
                                        type="text"
                                        value={house[ft] || '0'}
                                        readOnly
                                        className="w-full px-2 py-1 border-0 bg-transparent"
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                    <tr>
                        <td className="px-2 py-2 text-sm">Total</td>
                        {feedTypes.map(ft => <td key={ft} className="px-2 py-2 text-sm">{totals[ft].toLocaleString()}</td>)}
                    </tr>
                </tfoot>
            </table>
        </div>
      </div>
      <ReportHistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        onSelectDate={(selectedDate) => { setDate(selectedDate); setIsHistoryModalOpen(false); }}
        records={feedDeliveryRecords}
      />
    </>
  );
};

export default FeedDeliveryRecordForm;
