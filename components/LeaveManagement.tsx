import React, { useState, useMemo } from 'react';
import type { User, LeaveRequest } from '../types';

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

interface LeaveManagementProps {
    currentUser: User;
    allUsers: User[];
    leaveRequests: LeaveRequest[];
    onAddLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'status' | 'requestedAt' | 'userId' | 'username'>) => void;
    onUpdateLeaveRequestStatus: (requestId: string, status: 'Approved' | 'Rejected', rejectionReason?: string) => void;
    onBack: () => void;
}

const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
        case 'Pending': return 'bg-yellow-100 text-yellow-800';
        case 'Approved': return 'bg-green-100 text-green-800';
        case 'Rejected': return 'bg-red-100 text-red-800';
    }
};

const RejectionModal = ({ request, onConfirm, onCancel }: { request: LeaveRequest; onConfirm: (reason: string) => void; onCancel: () => void; }) => {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onCancel}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-red-800">Confirm Rejection</h3>
                <p className="mt-2 text-gray-700">Please provide a reason for rejecting the leave request from <span className="font-bold">{request.username}</span>.</p>
                <textarea value={reason} onChange={e => setReason(e.target.value)} className="mt-4 w-full p-2 border border-gray-300 rounded-md" rows={3} placeholder="Optional reason..."></textarea>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg">Cancel</button>
                    <button onClick={() => onConfirm(reason)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg">Confirm Reject</button>
                </div>
            </div>
        </div>
    );
};

const LeaveManagement: React.FC<LeaveManagementProps> = ({ currentUser, allUsers, leaveRequests, onAddLeaveRequest, onUpdateLeaveRequestStatus, onBack }) => {
    const [leaveType, setLeaveType] = useState<'Annual Leave' | 'Sick Leave' | 'Emergency Leave' | 'Day In Lieu'>('Annual Leave');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [formSubmitted, setFormSubmitted] = useState(false);

    const [adminTab, setAdminTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [rejectingRequest, setRejectingRequest] = useState<LeaveRequest | null>(null);

    const myRequests = useMemo(() => leaveRequests.filter(r => r.userId === currentUser.id), [leaveRequests, currentUser.id]);
    const pendingRequests = useMemo(() => leaveRequests.filter(r => r.status === 'Pending'), [leaveRequests]);
    const approvedRequests = useMemo(() => leaveRequests.filter(r => r.status === 'Approved'), [leaveRequests]);
    const rejectedRequests = useMemo(() => leaveRequests.filter(r => r.status === 'Rejected'), [leaveRequests]);

    const handleRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!startDate || !endDate) {
            setError('Start and End dates are required.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setError('End date cannot be before the start date.');
            return;
        }
        if (!reason.trim()) {
            setError('A reason for the leave is required.');
            return;
        }

        onAddLeaveRequest({ leaveType, startDate, endDate, reason });
        
        // Reset form
        setLeaveType('Annual Leave');
        setStartDate('');
        setEndDate('');
        setReason('');
        setFormSubmitted(true);
        setTimeout(() => setFormSubmitted(false), 3000);
    };

    const handleApprove = (requestId: string) => {
        onUpdateLeaveRequestStatus(requestId, 'Approved');
    };
    
    const handleReject = (request: LeaveRequest) => {
        setRejectingRequest(request);
    };

    const confirmReject = (rejectionReason: string) => {
        if (rejectingRequest) {
            onUpdateLeaveRequestStatus(rejectingRequest.id, 'Rejected', rejectionReason);
            setRejectingRequest(null);
        }
    };

    const renderRequestList = (requests: LeaveRequest[], title: string, forAdmin: boolean) => (
        <div>
            <h4 className="text-lg font-semibold text-gray-700 mb-2">{title}</h4>
            {requests.length === 0 ? <p className="text-sm text-gray-500">No requests in this category.</p> : (
                <ul className="space-y-3">
                    {requests.map(req => {
                        const user = allUsers.find(u => u.id === req.userId);
                        return (
                            <li key={req.id} className="p-3 border rounded-lg bg-gray-50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        {forAdmin && <p className="font-bold text-gray-800">{user?.name || req.username}</p>}
                                        <p className="text-sm font-semibold">{req.leaveType}</p>
                                        <p className="text-sm text-gray-600 font-mono">{req.startDate} to {req.endDate}</p>
                                        <p className="text-xs text-gray-500 mt-1">Requested: {new Date(req.requestedAt).toLocaleString()}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusBadge(req.status)}`}>{req.status}</span>
                                </div>
                                <p className="text-sm text-gray-800 mt-2 p-2 bg-white border rounded-md">{req.reason}</p>
                                {req.status !== 'Pending' && (
                                    <div className="text-xs text-gray-500 mt-2 border-t pt-2">
                                        Reviewed by {req.reviewedBy} on {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : 'N/A'}
                                        {req.status === 'Rejected' && req.rejectionReason && <p className="text-red-700 italic">Reason: {req.rejectionReason}</p>}
                                    </div>
                                )}
                                {forAdmin && req.status === 'Pending' && (
                                    <div className="flex justify-end gap-2 mt-3">
                                        <button onClick={() => handleReject(req)} className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200">Reject</button>
                                        <button onClick={() => handleApprove(req.id)} className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200">Approve</button>
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-4 mb-6 border-b pb-4">
                    <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                        <BackArrowIcon />
                    </button>
                    <h3 className="text-xl font-semibold text-gray-800">Leave Management</h3>
                </div>
                
                <details className="mb-8" open>
                    <summary className="text-lg font-semibold text-gray-700 cursor-pointer">Submit a New Leave Request</summary>
                    <form onSubmit={handleRequestSubmit} className="mt-4 p-4 border rounded-md bg-gray-50 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Leave Type</label>
                                <select value={leaveType} onChange={e => setLeaveType(e.target.value as any)} className="mt-1 w-full p-2 border border-gray-300 rounded-md">
                                    <option>Annual Leave</option>
                                    <option>Sick Leave</option>
                                    <option>Emergency Leave</option>
                                    <option>Day In Lieu</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">End Date</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Reason</label>
                            <textarea value={reason} onChange={e => setReason(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" rows={3}></textarea>
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <div className="flex justify-end items-center gap-4">
                            {formSubmitted && <span className="text-green-600 text-sm mr-auto">Request submitted successfully!</span>}
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">Submit Request</button>
                        </div>
                    </form>
                </details>

                <div className="mb-8">
                    {renderRequestList(myRequests, "My Requests", false)}
                </div>

                {currentUser.role === 'Admin' && (
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 border-t pt-6">Admin Dashboard</h3>
                        <div className="flex border-b mb-4">
                            <button onClick={() => setAdminTab('pending')} className={`py-2 px-4 text-sm font-medium ${adminTab === 'pending' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Pending ({pendingRequests.length})</button>
                            <button onClick={() => setAdminTab('approved')} className={`py-2 px-4 text-sm font-medium ${adminTab === 'approved' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Approved</button>
                            <button onClick={() => setAdminTab('rejected')} className={`py-2 px-4 text-sm font-medium ${adminTab === 'rejected' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Rejected</button>
                        </div>
                        {adminTab === 'pending' && renderRequestList(pendingRequests, 'Pending Requests', true)}
                        {adminTab === 'approved' && renderRequestList(approvedRequests, 'Approved Requests', true)}
                        {adminTab === 'rejected' && renderRequestList(rejectedRequests, 'Rejected Requests', true)}
                    </div>
                )}
            </div>

            {rejectingRequest && (
                <RejectionModal 
                    request={rejectingRequest}
                    onCancel={() => setRejectingRequest(null)}
                    onConfirm={confirmReject}
                />
            )}
        </div>
    );
};

export default LeaveManagement;