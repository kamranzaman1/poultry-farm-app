import React, { useMemo } from 'react';
import type { Employee } from '../types';
import { getHouseCountForFarm, FARM_NAMES } from '../constants';

interface ManpowerSummaryProps {
    employees: Employee[];
    onBack: () => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const ManpowerSummary: React.FC<ManpowerSummaryProps> = ({ employees, onBack }) => {

    const summaryData = useMemo(() => {
        const activeEmployees = employees.filter(emp => !emp.isArchived);

        const designations = {
            leadman: 'Farm Leadman',
            actLeadman: 'Acting Leadman',
            nightman: 'Farm Night Man',
            actNightman: 'Acting Nightman',
            worker: 'Farm Worker',
        };

        const employeesByFarm = activeEmployees.reduce((acc: Record<string, Employee[]>, emp: Employee) => {
            const farm = String(emp.farmNo) || 'Unassigned';
            if (!acc[farm]) acc[farm] = [];
            acc[farm].push(emp);
            return acc;
        }, {} as Record<string, Employee[]>);
        
        const farmData = FARM_NAMES.map(farmName => {
            const farmEmployees = employeesByFarm[farmName] || [];
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const employeesOnVacation = farmEmployees.filter(emp =>
                emp.vacationStartDate && emp.vacationEndDate &&
                today >= new Date(emp.vacationStartDate.replace(/-/g, '/')) &&
                today <= new Date(emp.vacationEndDate.replace(/-/g, '/'))
            ).length;

            const counts = {
                leadman: farmEmployees.filter(e => e.designation === designations.leadman).length,
                actLeadman: farmEmployees.filter(e => e.designation === designations.actLeadman).length,
                nightman: farmEmployees.filter(e => e.designation === designations.nightman).length,
                actNightman: farmEmployees.filter(e => e.designation === designations.actNightman).length,
                worker: farmEmployees.filter(e => e.designation === designations.worker).length,
            };

            const totalHouse = getHouseCountForFarm(farmName);
            const standardHM = totalHouse / 2;
            const currentHM = counts.leadman + counts.actLeadman + counts.nightman + counts.actNightman + counts.worker;
            const workersAsOfToday = currentHM - employeesOnVacation;
            const shortage = standardHM - currentHM;

            return { farmName, totalHouse, standardHM, ...counts, currentHM, shortage, workersAsOfToday };
        });

        const totals = farmData.reduce((acc, farm) => {
            acc.totalHouse += farm.totalHouse;
            acc.standardHM += farm.standardHM;
            acc.leadman += farm.leadman;
            acc.actLeadman += farm.actLeadman;
            acc.nightman += farm.nightman;
            acc.actNightman += farm.actNightman;
            acc.worker += farm.worker;
            acc.currentHM += farm.currentHM;
            acc.shortage += farm.shortage;
            acc.workersAsOfToday += farm.workersAsOfToday;
            return acc;
        }, { totalHouse: 0, standardHM: 0, leadman: 0, actLeadman: 0, nightman: 0, actNightman: 0, worker: 0, currentHM: 0, shortage: 0, workersAsOfToday: 0 });

        return { farmData, totals };

    }, [employees]);

    const todayFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

    const handleExportCSV = () => {
        const headers = ['FARM IN SERIAL', 'FARM', 'Total house', 'Standard H.M', 'Farm Leadman', 'Act. Leadman', 'Farm Night Man', 'Act. Nightman', 'Farm Worker', 'Current H.M', 'Shortage house man', `Workers as of ${todayFormatted}`];
        
        const rows = summaryData.farmData.map((farm, index) => {
            let displayName = farm.farmName;
            if (displayName.startsWith('She/')) {
                displayName = `Shemalia-0${displayName.split('/')[1]}`;
            }
            return [
                index + 1,
                displayName,
                farm.totalHouse,
                farm.standardHM,
                farm.leadman || '',
                farm.actLeadman || '',
                farm.nightman || '',
                farm.actNightman || '',
                farm.worker || '',
                farm.currentHM,
                farm.shortage,
                farm.workersAsOfToday,
            ].join(',');
        });
        
        const totals = summaryData.totals;
        const totalRow = [
            'TOTAL', '',
            totals.totalHouse, totals.standardHM, totals.leadman, totals.actLeadman,
            totals.nightman, totals.actNightman, totals.worker, totals.currentHM, totals.shortage, totals.workersAsOfToday
        ].join(',');

        const csvContent = [headers.join(','), ...rows, totalRow].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `ManpowerSummary_${todayFormatted}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                        <BackArrowIcon />
                    </button>
                    <h3 className="text-xl font-semibold text-gray-800">Manpower Summary</h3>
                </div>
                <button onClick={handleExportCSV} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-sm hover:bg-teal-700 text-sm">
                    Export CSV
                </button>
            </div>
            
            {/* Manpower Breakdown Table */}
            <div>
                <h4 className="text-lg font-semibold text-gray-700 mb-2">Manpower Breakdown by Farm</h4>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-400 text-sm">
                        <thead className="bg-gray-100 text-center font-bold">
                            <tr>
                                <th className="border border-gray-400 p-1">FARM IN SERIAL</th>
                                <th className="border border-gray-400 p-1">FARM</th>
                                <th className="border border-gray-400 p-1">Total house</th>
                                <th className="border border-gray-400 p-1">Standard H.M</th>
                                <th className="border border-gray-400 p-1">Farm Leadman</th>
                                <th className="border border-gray-400 p-1">Act. Leadman</th>
                                <th className="border border-gray-400 p-1">Farm Night Man</th>
                                <th className="border border-gray-400 p-1">Act. Nightman</th>
                                <th className="border border-gray-400 p-1">Farm Worker</th>
                                <th className="border border-gray-400 p-1">Current H.M</th>
                                <th className="border border-gray-400 p-1">Shortage house man</th>
                                <th className="border border-gray-400 p-1">Workers as of<br/>{todayFormatted}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summaryData.farmData.map((farm, index) => {
                                let displayName = farm.farmName;
                                if (displayName.startsWith('She/')) {
                                    displayName = `Shemalia-0${displayName.split('/')[1]}`;
                                }
                                return (
                                <tr key={farm.farmName} className="text-center">
                                    <td className="border border-gray-400 p-1">{index + 1}</td>
                                    <td className="border border-gray-400 p-1 font-semibold">{displayName}</td>
                                    <td className="border border-gray-400 p-1">{farm.totalHouse}</td>
                                    <td className="border border-gray-400 p-1">{farm.standardHM}</td>
                                    <td className="border border-gray-400 p-1">{farm.leadman || ''}</td>
                                    <td className="border border-gray-400 p-1">{farm.actLeadman || ''}</td>
                                    <td className="border border-gray-400 p-1">{farm.nightman || ''}</td>
                                    <td className="border border-gray-400 p-1">{farm.actNightman || ''}</td>
                                    <td className="border border-gray-400 p-1">{farm.worker || ''}</td>
                                    <td className="border border-gray-400 p-1">{farm.currentHM}</td>
                                    <td className="border border-gray-400 p-1">{farm.shortage}</td>
                                    <td className="border border-gray-400 p-1">{farm.workersAsOfToday}</td>
                                </tr>
                            )})}
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold text-center">
                            <tr>
                                <td colSpan={2} className="border border-gray-400 p-1">TOTAL</td>
                                <td className="border border-gray-400 p-1">{summaryData.totals.totalHouse}</td>
                                <td className="border border-gray-400 p-1">{summaryData.totals.standardHM}</td>
                                <td className="border border-gray-400 p-1">{summaryData.totals.leadman}</td>
                                <td className="border border-gray-400 p-1">{summaryData.totals.actLeadman}</td>
                                <td className="border border-gray-400 p-1">{summaryData.totals.nightman}</td>
                                <td className="border border-gray-400 p-1">{summaryData.totals.actNightman}</td>
                                <td className="border border-gray-400 p-1">{summaryData.totals.worker}</td>
                                <td className="border border-gray-400 p-1">{summaryData.totals.currentHM}</td>
                                <td className="border border-gray-400 p-1">{summaryData.totals.shortage}</td>
                                <td className="border border-gray-400 p-1">{summaryData.totals.workersAsOfToday}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManpowerSummary;