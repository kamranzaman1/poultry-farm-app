import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Employee } from '../types';
import * as XLSX from 'xlsx';

interface ManpowerManagementProps {
    employees: Employee[];
    onBack: () => void;
    onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
    onUpdateEmployee: (employee: Employee) => void;
    onDeleteEmployee: (employeeId: string) => void;
    onBulkDeleteEmployees: (employeeIds: string[]) => void;
    onBulkImportEmployees: (csvData: string) => Promise<{ success: boolean; message: string }>;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const calculateYearsOfService = (joiningDate: string): string => {
    if (!joiningDate) return 'N/A';
    try {
        const start = new Date(joiningDate);
        const now = new Date();
        if (isNaN(start.getTime())) return 'N/A';
        
        const diff = now.getTime() - start.getTime();
        const years = diff / (1000 * 60 * 60 * 24 * 365.25);
        return years.toFixed(1);
    } catch (e) {
        return 'N/A';
    }
};

const EmployeeFormModal = ({ isOpen, onClose, onSubmit, existingEmployee, allEmployees }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (employee: Employee | Omit<Employee, 'id'>) => void;
    existingEmployee: Employee | null;
    allEmployees: Employee[];
}) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState<Partial<Employee>>({});
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (isOpen) {
            const employeeTemplate: Partial<Employee> = {
                sN: allEmployees.length > 0 ? Math.max(...allEmployees.map(e => e.sN)) + 1 : 1,
                name: '', sapNo: '', compNo: '', designation: '', farmNo: '', area: '',
                gumboot: '', uniform: '', jacket: '', cost: '', sponsor: '', grade: '',
                nationality: '', joiningDate: '', iqamaNo: '', iqamaExpiry: '',
                passportNo: '', passportExpiry: '', religion: '', mobileNo: '',
                vacationStartDate: '', vacationEndDate: '', resumingDate: '', isArchived: false,
            };
            
            const initialFormState = existingEmployee
                ? { ...employeeTemplate, ...existingEmployee }
                : employeeTemplate;

            setFormData(initialFormState);
            setErrors({});
        }
    }, [existingEmployee, isOpen, allEmployees]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setFormData(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.name?.trim()) newErrors.name = "Name is required";
        if (!formData.sapNo?.trim()) {
            newErrors.sapNo = "SAP # is required";
        } else {
            const isSapTaken = allEmployees.some(
                e => e.sapNo === formData.sapNo && e.id !== existingEmployee?.id
            );
            if (isSapTaken) newErrors.sapNo = "SAP # is already in use.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        onSubmit(existingEmployee ? { ...existingEmployee, ...formData } : formData as Omit<Employee, 'id'>);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-800">{existingEmployee ? 'Edit Employee' : 'Add New Employee'}</h3>
                <form onSubmit={handleSubmit} className="mt-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        {Object.keys(formData).filter(key => key !== 'isArchived').map(key => {
                             if (key === 'id') return null;
                             const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                             
                             if (key.toLowerCase().includes('date') || key.toLowerCase().includes('expiry')) {
                                return <div key={key}><label className="block font-medium">{label}</label><input type="date" name={key} value={formData[key as keyof Employee] as string || ''} onChange={handleChange} className={`mt-1 w-full p-2 border rounded-md ${errors[key] ? 'border-red-500' : 'border-gray-300'}`} />{errors[key] && <p className="text-xs text-red-600">{errors[key]}</p>}</div>
                             }
                             return <div key={key}><label className="block font-medium">{label}</label><input type={key === 'sN' ? 'number' : 'text'} name={key} value={formData[key as keyof Employee] as string | number || ''} onChange={handleChange} className={`mt-1 w-full p-2 border rounded-md ${errors[key] ? 'border-red-500' : 'border-gray-300'}`} />{errors[key] && <p className="text-xs text-red-600">{errors[key]}</p>}</div>
                        })}
                    </div>
                    <div className="mt-4 col-span-1 md:col-span-2 lg:col-span-3 pt-4 border-t">
                        <label className="flex items-center">
                            <input type="checkbox" name="isArchived" checked={!!formData.isArchived} onChange={handleChange} className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"/>
                            <span className="ml-2 text-sm font-medium text-gray-700">Employee not returned from vacation (Archive)</span>
                        </label>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg">{existingEmployee ? 'Save Changes' : 'Add Employee'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const ManpowerManagement: React.FC<ManpowerManagementProps> = ({ employees, onBack, onAddEmployee, onUpdateEmployee, onDeleteEmployee, onBulkDeleteEmployees, onBulkImportEmployees }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    const filteredEmployees = useMemo(() => {
        const activeOrArchived = employees.filter(emp => !!emp.isArchived === showArchived);
        if (!searchTerm) return activeOrArchived;
        const lowercasedTerm = searchTerm.toLowerCase();
        return activeOrArchived.filter(emp =>
            Object.values(emp).some(val =>
                String(val).toLowerCase().includes(lowercasedTerm)
            )
        );
    }, [employees, searchTerm, showArchived]);

    useEffect(() => {
        setSelectedEmployeeIds([]);
    }, [searchTerm, showArchived]);

    const handleOpenModal = (employee: Employee | null = null) => {
        setEditingEmployee(employee);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEmployee(null);
    };

    const handleSubmit = (employee: Employee | Omit<Employee, 'id'>) => {
        if ('id' in employee) {
            onUpdateEmployee(employee);
        } else {
            onAddEmployee(employee);
        }
        handleCloseModal();
    };

    const handleDelete = () => {
        if (deletingEmployee) {
            onDeleteEmployee(deletingEmployee.id);
            setDeletingEmployee(null);
        }
    };

    const handleBulkDelete = () => {
        onBulkDeleteEmployees(selectedEmployeeIds);
        setSelectedEmployeeIds([]);
        setIsBulkDeleteConfirmOpen(false);
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportStatus({ type: 'info', message: 'Processing Excel file...' });
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const csvData = XLSX.utils.sheet_to_csv(worksheet);
                
                const result = await onBulkImportEmployees(csvData);
                setImportStatus({ type: result.success ? 'success' : 'error', message: result.message });

            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to process Excel file.";
                setImportStatus({ type: 'error', message });
            } finally {
                 if(fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.onerror = () => {
            setImportStatus({ type: 'error', message: 'Failed to read the file.' });
            if(fileInputRef.current) fileInputRef.current.value = '';
        };

        reader.readAsArrayBuffer(file);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedEmployeeIds(filteredEmployees.map(emp => emp.id));
        } else {
            setSelectedEmployeeIds([]);
        }
    };

    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, employeeId: string) => {
        if (e.target.checked) {
            setSelectedEmployeeIds(prev => [...prev, employeeId]);
        } else {
            setSelectedEmployeeIds(prev => prev.filter(id => id !== employeeId));
        }
    };

    const isAllFilteredSelected = filteredEmployees.length > 0 && selectedEmployeeIds.length === filteredEmployees.length;


    const headerStyles = {
        default: { backgroundColor: '#E1C4C4', color: '#000' },
        green: { backgroundColor: '#A8D08D', color: '#000' },
        orange: { backgroundColor: '#FADCB3', color: '#000' },
    };

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b pb-4">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                            <BackArrowIcon />
                        </button>
                        <h3 className="text-xl font-semibold text-gray-800">Manpower Management</h3>
                    </div>
                    <div className="flex gap-2">
                        {selectedEmployeeIds.length > 0 && (
                            <button onClick={() => setIsBulkDeleteConfirmOpen(true)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700 text-sm">
                                Delete Selected ({selectedEmployeeIds.length})
                            </button>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-sm hover:bg-teal-700 text-sm">Import Excel Spreadsheet</button>
                        <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 text-sm">Add New Employee</button>
                    </div>
                </div>

                 <div className="flex justify-between items-center mb-4">
                    <input
                        type="text"
                        placeholder="Search employees (by name, SAP #, farm, etc.)..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full max-w-lg p-2 border border-gray-300 rounded-md"
                    />
                     <label className="flex items-center text-sm font-medium text-gray-700">
                        <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"/>
                        Show Archived Employees
                    </label>
                </div>

                {importStatus && (
                    <div className={`mb-4 text-sm p-3 rounded-md ${
                        importStatus.type === 'success' ? 'bg-green-100 text-green-800' :
                        importStatus.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                        {importStatus.message}
                    </div>
                )}


                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-xs">
                        <thead>
                            <tr>
                                <th style={headerStyles.default} className="border p-1">
                                    <input
                                        type="checkbox"
                                        checked={isAllFilteredSelected}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                </th>
                                <th style={headerStyles.default} className="border p-1">S.N</th>
                                <th style={headerStyles.default} className="border p-1">Gumboot</th>
                                <th style={headerStyles.default} className="border p-1">Uniform</th>
                                <th style={headerStyles.default} className="border p-1">Jacket</th>
                                <th style={headerStyles.default} className="border p-1">Cost</th>
                                <th style={headerStyles.default} className="border p-1">Comp #</th>
                                <th style={headerStyles.green} className="border p-1">Sap #</th>
                                <th style={headerStyles.orange} className="border p-1 min-w-[150px]">Name</th>
                                <th style={headerStyles.default} className="border p-1">Designation</th>
                                <th style={headerStyles.default} className="border p-1">Sponsor</th>
                                <th style={headerStyles.default} className="border p-1">Grade</th>
                                <th style={headerStyles.default} className="border p-1">Nationality</th>
                                <th style={headerStyles.default} className="border p-1">Joining Date</th>
                                <th style={headerStyles.default} className="border p-1">Y.O.S</th>
                                <th style={headerStyles.default} className="border p-1">Farm #</th>
                                <th style={headerStyles.default} className="border p-1">Area</th>
                                <th style={headerStyles.default} className="border p-1">Iqama No.</th>
                                <th style={headerStyles.default} className="border p-1">Iqama Expiry</th>
                                <th style={headerStyles.default} className="border p-1">Passport No</th>
                                <th style={headerStyles.default} className="border p-1">Passport Expiry</th>
                                <th style={headerStyles.default} className="border p-1">Religion</th>
                                <th style={headerStyles.default} className="border p-1">Mobile No</th>
                                <th style={headerStyles.default} className="border p-1">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.map(emp => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const isOnVacation = emp.vacationStartDate && emp.vacationEndDate &&
                                    today >= new Date(emp.vacationStartDate.replace(/-/g, '/')) &&
                                    today <= new Date(emp.vacationEndDate.replace(/-/g, '/'));
                                
                                const isOverdue = emp.vacationEndDate && new Date(emp.vacationEndDate.replace(/-/g, '/')) < today && !emp.resumingDate && !emp.isArchived;

                                let rowClass = '';
                                if (isOverdue) rowClass = 'bg-red-100';
                                else if (isOnVacation) rowClass = 'bg-yellow-100';

                                if (emp.isArchived) rowClass += ' opacity-60';

                                return (
                                <tr key={emp.id} className={`text-center ${rowClass}`}>
                                    <td className="border p-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployeeIds.includes(emp.id)}
                                            onChange={e => handleSelectOne(e, emp.id)}
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="border p-1">{emp.sN}</td>
                                    <td className="border p-1">{emp.gumboot || '-'}</td>
                                    <td className="border p-1">{emp.uniform || '-'}</td>
                                    <td className="border p-1">{emp.jacket || '-'}</td>
                                    <td className="border p-1">{emp.cost}</td>
                                    <td className="border p-1">{emp.compNo}</td>
                                    <td className="border p-1">{emp.sapNo}</td>
                                    <td className={`border p-1 text-left ${emp.isArchived ? 'line-through' : ''}`}>
                                        {emp.name}
                                        {isOverdue && <span className="ml-2 text-xs font-semibold text-red-800">(Overdue)</span>}
                                        {isOnVacation && !isOverdue && <span className="ml-2 text-xs font-semibold text-yellow-800">(On Leave)</span>}
                                        {emp.isArchived && <span className="ml-2 text-xs font-semibold text-gray-600">(Archived)</span>}
                                    </td>
                                    <td className="border p-1 text-left">{emp.designation}</td>
                                    <td className="border p-1 text-left">{emp.sponsor}</td>
                                    <td className="border p-1">{emp.grade}</td>
                                    <td className="border p-1 text-left">{emp.nationality}</td>
                                    <td className="border p-1">{emp.joiningDate}</td>
                                    <td className="border p-1">{calculateYearsOfService(emp.joiningDate)}</td>
                                    <td className="border p-1">{emp.farmNo}</td>
                                    <td className="border p-1">{emp.area}</td>
                                    <td className="border p-1">{emp.iqamaNo}</td>
                                    <td className="border p-1">{emp.iqamaExpiry}</td>
                                    <td className="border p-1">{emp.passportNo}</td>
                                    <td className="border p-1">{emp.passportExpiry}</td>
                                    <td className="border p-1">{emp.religion}</td>
                                    <td className="border p-1">{emp.mobileNo}</td>
                                    <td className="border p-1">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleOpenModal(emp)} className="text-blue-600 hover:text-blue-800">Edit</button>
                                            <button onClick={() => setDeletingEmployee(emp)} className="text-red-600 hover:text-red-800">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            <EmployeeFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmit}
                existingEmployee={editingEmployee}
                allEmployees={employees}
            />

            {deletingEmployee && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={() => setDeletingEmployee(null)}>
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-800">Confirm Deletion</h3>
                        <p className="mt-2 text-gray-700">Are you sure you want to delete <span className="font-bold">{deletingEmployee.name}</span>? This action cannot be undone.</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setDeletingEmployee(null)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg">Cancel</button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg">Delete</button>
                        </div>
                    </div>
                </div>
            )}
            
            {isBulkDeleteConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={() => setIsBulkDeleteConfirmOpen(false)}>
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-800">Confirm Bulk Deletion</h3>
                        <p className="mt-2 text-gray-700">Are you sure you want to delete the selected <span className="font-bold">{selectedEmployeeIds.length}</span> employees? This action cannot be undone.</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setIsBulkDeleteConfirmOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg">Cancel</button>
                            <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ManpowerManagement;