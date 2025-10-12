import React, { useState, useRef } from 'react';

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
);

const HelpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-400"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);

interface DataManagementProps {
    onBack: () => void;
    onExportData: () => void;
    onImportData: (data: string) => Promise<boolean>;
    onBulkImportChicksReceiving: (csvData: string) => Promise<{ success: boolean; message: string }>;
    onToggleMaintenanceMode: (password: string) => { success: boolean; message: string };
}

const DataManagement: React.FC<DataManagementProps> = ({ onBack, onExportData, onImportData, onBulkImportChicksReceiving, onToggleMaintenanceMode }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const chicksFileInputRef = useRef<HTMLInputElement>(null);
    const [chicksFile, setChicksFile] = useState<File | null>(null);
    const [isChicksConfirmOpen, setIsChicksConfirmOpen] = useState(false);
    const [chicksImportStatus, setChicksImportStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [maintenanceStatus, setMaintenanceStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
            setImportStatus(null);
        }
    };

    const handleImportClick = () => {
        if (selectedFile) {
            setIsConfirmModalOpen(true);
        }
    };

    const confirmImport = () => {
        if (!selectedFile) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result;
            if (typeof content === 'string') {
                const success = await onImportData(content);
                if (success) {
                    setImportStatus({ type: 'success', message: 'Data imported successfully! The application will now use the new data.' });
                } else {
                    setImportStatus({ type: 'error', message: 'Import failed. The file may be corrupted or in an invalid format.' });
                }
            } else {
                setImportStatus({ type: 'error', message: 'Could not read the file.' });
            }
            setSelectedFile(null);
            if(fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };
        reader.readAsText(selectedFile);
        setIsConfirmModalOpen(false);
    };

    const handleChicksFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setChicksFile(event.target.files[0]);
            setChicksImportStatus(null);
        }
    };

    const handleChicksImportClick = () => {
        if (chicksFile) {
            setIsChicksConfirmOpen(true);
        }
    };

    const confirmChicksImport = () => {
        if (!chicksFile) return;

        setChicksImportStatus({ type: 'info', message: 'Processing...' });
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result;
            if (typeof content === 'string') {
                const result = await onBulkImportChicksReceiving(content);
                setChicksImportStatus({ type: result.success ? 'success' : 'error', message: result.message });
            } else {
                setChicksImportStatus({ type: 'error', message: 'Could not read the file.' });
            }
            setChicksFile(null);
            if(chicksFileInputRef.current) {
                chicksFileInputRef.current.value = '';
            }
        };
        reader.readAsText(chicksFile);
        setIsChicksConfirmOpen(false);
    };

    const handleToggleClick = () => {
        setMaintenanceStatus(null);
        setAdminPassword('');
        setIsMaintenanceModalOpen(true);
    };
    
    const confirmToggleMaintenance = () => {
        const result = onToggleMaintenanceMode(adminPassword);
        setMaintenanceStatus({ type: result.success ? 'success' : 'error', message: result.message });
        setIsMaintenanceModalOpen(false);
    };


    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-4 mb-6 border-b pb-4">
                    <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                        <BackArrowIcon />
                    </button>
                    <h3 className="text-xl font-semibold text-gray-800">Data Management</h3>
                </div>
                
                {/* Export Section */}
                <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-gray-700">Export Application Data</h4>
                    <p className="text-sm text-gray-600 mt-1">Download all application data (users, reports, orders, etc.) into a single JSON file. This is useful for creating backups.</p>
                    <div className="mt-4">
                        <button onClick={onExportData} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                           <DownloadIcon /> Export Data to File
                        </button>
                    </div>
                </div>

                 {/* Chicks Receiving Import Section */}
                <div className="p-4 border border-green-300 bg-green-50 rounded-lg mt-6">
                    <h4 className="font-semibold text-green-800">Bulk Import Chicks Receiving Data</h4>
                    <p className="text-sm text-green-700 mt-1">Import a single CSV file containing chicks receiving data for multiple farms. This will only update data for farms with an active cycle.</p>
                    <div className="mt-4">
                        <input type="file" accept=".csv" onChange={handleChicksFileChange} ref={chicksFileInputRef} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"/>
                        <div className="flex items-center gap-2 mt-3">
                            <button onClick={handleChicksImportClick} disabled={!chicksFile} className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                <UploadIcon /> Import Chicks Data
                            </button>
                             <div className="relative group cursor-pointer">
                                <HelpIcon />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-2 bg-gray-700 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                    CSV must have 'Farm' and 'House' (or 'Flock') columns. Other optional columns include (case-insensitive): Breed, Flock No, Flock Age, Hatchery No, Production Order No, Placement Date, No of Box, Per Box Chicks, Extra Chicks, DOA, Trial or Control, 0-Day Weight (g), Uniformity %.
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {chicksImportStatus && (
                        <div className={`mt-4 text-sm p-3 rounded-md ${
                            chicksImportStatus.type === 'success' ? 'bg-green-100 text-green-800' :
                            chicksImportStatus.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                            {chicksImportStatus.message}
                        </div>
                    )}
                </div>

                {/* Import Section */}
                <div className="p-4 border border-red-300 bg-red-50 rounded-lg mt-6">
                     <h4 className="font-semibold text-red-800">Import Application Data</h4>
                     <div className="mt-2 p-3 bg-red-100 border border-red-200 text-red-900 text-sm rounded-md">
                        <p><strong className="font-bold">Warning:</strong> Importing a file will completely overwrite all current application data. This action cannot be undone. Please export your current data first if you wish to keep a backup.</p>
                     </div>
                     <div className="mt-4">
                        <input type="file" accept=".json" onChange={handleFileChange} ref={fileInputRef} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        <button onClick={handleImportClick} disabled={!selectedFile} className="inline-flex items-center mt-3 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                           <UploadIcon /> Import Data
                        </button>
                     </div>
                     {importStatus && (
                        <div className={`mt-4 text-sm p-3 rounded-md ${importStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                           {importStatus.message}
                        </div>
                     )}
                </div>

                {/* Maintenance Mode Section */}
                <div className="p-4 border border-orange-300 bg-orange-50 rounded-lg mt-6">
                    <h4 className="font-semibold text-orange-800">System Maintenance Mode</h4>
                    <p className="text-sm text-orange-700 mt-1">Enabling maintenance mode will prevent all non-admin users from accessing the application. Admins will still be able to log in to perform updates and disable maintenance mode.</p>
                    <div className="mt-4">
                        <button onClick={handleToggleClick} className="inline-flex items-center px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg shadow-sm hover:bg-orange-700">
                        Toggle Maintenance Mode
                        </button>
                    </div>
                    {maintenanceStatus && (
                        <div className={`mt-4 text-sm p-3 rounded-md ${maintenanceStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {maintenanceStatus.message}
                        </div>
                    )}
                </div>
            </div>

            {isConfirmModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={() => setIsConfirmModalOpen(false)}>
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-red-800">Confirm Data Import</h3>
                        <p className="mt-2 text-gray-700">
                            Are you sure you want to proceed? All existing data in the application will be permanently replaced by the data from the file <strong className="font-mono text-sm">{selectedFile?.name}</strong>.
                        </p>
                        <p className="mt-2 text-sm text-gray-700">This action cannot be undone.</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setIsConfirmModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
                                Cancel
                            </button>
                            <button onClick={confirmImport} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">
                                Confirm and Overwrite
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isChicksConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={() => setIsChicksConfirmOpen(false)}>
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-green-800">Confirm Chicks Data Import</h3>
                        <p className="mt-2 text-gray-700">
                            Are you sure you want to import this file? This will overwrite existing chicks receiving data for any matching farm and house in an active cycle.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setIsChicksConfirmOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
                                Cancel
                            </button>
                            <button onClick={confirmChicksImport} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">
                                Confirm and Import
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isMaintenanceModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={() => setIsMaintenanceModalOpen(false)}>
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-orange-800">Confirm Action</h3>
                        <p className="mt-2 text-gray-700">
                            To toggle maintenance mode, please enter your admin password. This is a security measure to prevent accidental changes.
                        </p>
                        <div className="mt-4">
                            <label htmlFor="admin-password-confirm" className="block text-sm font-medium text-gray-700">Admin Password</label>
                            <input
                                id="admin-password-confirm"
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setIsMaintenanceModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
                                Cancel
                            </button>
                            <button onClick={confirmToggleMaintenance} className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700">
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataManagement;