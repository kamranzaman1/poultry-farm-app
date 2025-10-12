

import React, { useState } from 'react';
import type { SepticTankRequest, User } from '../types';
import { AL_WATANIA_LOGO_BASE64 } from '../constants';

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-500"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

const getDayFromDate = (dateString: string) => {
    if (!dateString) return { arabic: '', english: '' };
    try {
        const date = new Date(dateString.replace(/-/g, '/'));
        if (isNaN(date.getTime())) return { arabic: '', english: '' };
        const arabicDay = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(date);
        const englishDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
        return { arabic: arabicDay, english: englishDay.toUpperCase() };
    } catch (e) {
        return { arabic: '', english: '' };
    }
};

const PrintableForm = ({ request }: { request: SepticTankRequest }) => {
    const todayDate = new Date().toISOString().split('T')[0];
    const requestDay = getDayFromDate(request.requestDate);
    return (
        <div className="p-4 border-[4px] border-black bg-white" style={{ fontFamily: "'Times New Roman', serif", fontSize: '11pt' }}>
            {/* ... (The full printable form HTML from SepticTankRequestForm.tsx is copied here) ... */}
            <div className="p-2 border-[1px] border-black" style={{ direction: 'rtl' }}>
        <header className="flex justify-between items-start mb-4">
          <div className="text-left w-1/4" style={{ direction: 'ltr' }}>
            <p className="font-bold text-base">A.S.D.</p><p className="font-bold text-base">HOUSING DIVISION</p>
            <div className="mt-8"><p className="font-bold">التاريخ</p><p className="font-bold">DATE : <span className="font-normal font-mono">{todayDate}</span></p></div>
          </div>
          <div className="text-center w-1/2">
            <div className="flex justify-center items-center -mt-4">
                <img src={AL_WATANIA_LOGO_BASE64} alt="Al Watania Logo" style={{ height: '60px' }} />
                <div className="mr-2 text-center"><h1 className="text-xl font-bold">دواجن الوطنية</h1><p className="text-sm">Al-Watania Poultry</p></div>
            </div>
            <div className="mt-2"><p className="text-lg font-bold">إدارة الخدمات الإدارية</p><p className="text-lg font-bold">قسم الإسكان</p></div>
          </div>
          <div className="w-1/4"></div>
        </header>
        <div className="text-center my-2">
            <div className="border-2 border-black rounded-md inline-block py-1 px-4"><p className="font-bold text-base">نموذج طلب سيارة صرف صحي</p><p className="font-bold text-sm" style={{ direction: 'ltr' }}>SEPTIC TANK REQUEST FORM</p></div>
            <p className="mt-2 text-right font-bold mr-8">الإدارة الطالبة</p><p className="text-right font-bold mr-8" style={{ direction: 'ltr' }}>DEPT: <span className="font-normal underline font-mono">{request.department}</span></p>
        </div>
        <div className="text-right my-2 px-4"><p>المكرم / رئيس قسم الإسكان الرجاء إرسال سيارة الصرف الصحي لسحب مياه الصرف الصحي.</p><p style={{ direction: 'ltr' }} className="text-sm">HEAD, HOUSING DIV. KINDLY ARRANGE TO SEND THE TANKER TO OUR SITE AS THE CESSPOOL TANK NEED TO EVACUATE.</p></div>
        <table className="w-full border-collapse border-2 border-black my-4 text-center">
            <thead><tr className="font-bold"><td className="border-2 border-black p-1">الموقع<br/>LOCATION</td><td className="border-2 border-black p-1">اليوم<br/>DAY</td><td className="border-2 border-black p-1">التاريخ<br/>DATE</td></tr></thead>
            <tbody>
                <tr><td className="border-2 border-black p-1 h-12"></td><td className="border-2 border-black p-1 font-bold">{requestDay.arabic}<br />{requestDay.english}</td><td className="border-2 border-black p-1 font-mono">{request.requestDate}</td></tr>
                 <tr><td colSpan={3} className="text-right p-2 font-bold">توقيع المسئول<span className="inline-block" style={{direction: 'ltr'}}>/ SIGN. INCH .............................</span></td></tr>
            </tbody>
        </table>
        <div className="text-right my-2 px-4 font-bold"><p>مقدم الطلب: <span className="font-normal underline">{request.requestedBy}</span></p><p style={{ direction: 'ltr' }}>Requested by: <span className="font-normal underline font-mono">{request.requestedBy}</span></p></div>
        <div className="flex justify-between items-start my-4 px-4 min-h-[200px]">
            <div className="text-left w-2/5" style={{ direction: 'ltr' }}>
                <p className="font-bold">Mobile- <span className="font-normal underline font-mono">{request.requesterContact || '........................'}</span></p>
                <div className="mt-8 text-center space-y-1"><p className="font-bold">غير موافق</p><p className="text-sm font-bold">DISAPPROVED</p><div className="w-8 h-8 border-2 border-black mx-auto mt-1"></div><p className="mt-2 text-xs font-bold">أسباب عدم الموافقة</p><p className="text-xs font-bold">REASON FOR DISAPPROVED: ......................</p></div>
            </div>
             <div className="text-right w-3/5 font-bold">
                <p>إلى مشرف النظافة<span className="inline-block" style={{direction: 'ltr'}}>/ TO : SUPERVISOR CLEANING</span></p>
                <div className="mt-16 text-center space-y-1">
                    <p className="font-bold">موافق</p><p className="text-sm font-bold">APPROVED</p><div className="w-8 h-8 border-2 border-black mx-auto mt-1"></div>
                    <div className="mt-8"><p>................................... رئيس قسم الإسكان</p><p style={{ direction: 'ltr' }} className="text-sm font-bold">HEAD, HOUSING DIVISION</p></div>
                </div>
            </div>
        </div>
        <div className="text-center mt-2 font-bold"><p>عدد الردود: <span className="font-normal underline font-mono">{request.trips}</span></p><p style={{ direction: 'ltr' }}>NO. OF TRIPS: <span className="font-normal underline font-mono">{request.trips}</span></p></div>
      </div>
    </div>
    );
};

interface PrintModalProps {
    request: SepticTankRequest | null;
    onClose: () => void;
}
const PrintModal: React.FC<PrintModalProps> = ({ request, onClose }) => {
    if (!request) return null;

    const handlePrint = () => {
        const printWindow = window.open('', '', 'height=800,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Print Request</title><style>@media print { @page { size: A4; margin: 0; } body { margin: 1cm; } }</style></head><body>');
            const printableElement = document.getElementById('printable-form-modal');
            if (printableElement) printWindow.document.write(printableElement.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl" onClick={e => e.stopPropagation()}>
                <div id="printable-form-modal"><PrintableForm request={request} /></div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                    <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Print</button>
                </div>
            </div>
        </div>
    );
};


interface SepticTankRequestsListProps {
  requests: SepticTankRequest[];
  onUpdateStatus: (requestId: string, status: 'Completed') => void;
  onBack: () => void;
  currentUser: User;
}

const SepticTankRequestsList: React.FC<SepticTankRequestsListProps> = ({ requests, onUpdateStatus, onBack, currentUser }) => {
    const [printingRequest, setPrintingRequest] = useState<SepticTankRequest | null>(null);

    const pendingRequests = requests.filter(r => r.status === 'Pending');

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-4 mb-6 border-b pb-4">
                    <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                        <BackArrowIcon />
                    </button>
                    <h3 className="text-xl font-semibold text-gray-800">Septic Tank Service Management</h3>
                </div>
                {pendingRequests.length === 0 ? (
                    <p className="text-gray-500">No pending requests.</p>
                ) : (
                    <ul className="space-y-4">
                        {pendingRequests.map(req => (
                            <li key={req.id} className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold">{req.farmName}</p>
                                        {currentUser.role === 'Admin' && req.meta && (
                                            <div className="relative group">
                                                <ClockIcon />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 whitespace-nowrap">
                                                    Created by: <strong>{req.meta.createdBy}</strong> at {new Date(req.meta.createdAt).toLocaleString()}
                                                    <br/>
                                                    Last updated by: <strong>{req.meta.updatedBy}</strong> at {new Date(req.meta.updatedAt).toLocaleString()}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600">Requested by: {req.requestedBy} on {new Date(req.submittedAt).toLocaleDateString()}</p>
                                    <p className="text-sm text-gray-600">Required Date: {req.requestDate} | Trips: {req.trips}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setPrintingRequest(req)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600">Print</button>
                                    <button onClick={() => onUpdateStatus(req.id, 'Completed')} className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600">Mark as Done</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <PrintModal request={printingRequest} onClose={() => setPrintingRequest(null)} />
        </>
    );
};

export default SepticTankRequestsList;