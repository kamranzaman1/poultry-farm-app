import React, { useMemo } from 'react';
import type { DailyReport, ChicksReceivingData, SelectedFarmCycleDetails } from '../types';
import { getHouseCountForFarm, AL_WATANIA_LOGO_BASE64 } from '../constants';

interface WeeklyMortalityReportProps {
    farmName: string;
    dailyReports: DailyReport[];
    chicksReceivingData: ChicksReceivingData;
    selectedFarmCycleDetails: SelectedFarmCycleDetails | null;
    onBack: () => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);


const WeeklyMortalityReport: React.FC<WeeklyMortalityReportProps> = ({ farmName, dailyReports, chicksReceivingData, selectedFarmCycleDetails, onBack }) => {
    const { cropNo, cycleNo, houses: chicksHouses } = chicksReceivingData;
    const houseCount = useMemo(() => getHouseCountForFarm(farmName), [farmName]);

    const reportData = useMemo(() => {
        const houseData = Array.from({ length: houseCount }, (_, i) => {
            const houseNumber = i + 1;
            const chicksHouse = chicksHouses[i];
            const placementDateStr = chicksHouse?.placementDate;
            const chicksPlaced = parseInt(chicksHouse?.netChicksPlaced || '0', 10);

            if (!placementDateStr || chicksPlaced === 0) {
                return {
                    houseNumber,
                    chicksPlaced: 0,
                    weeklyData: [],
                    grandTotal: {
                        mort: 0,
                        mortPercent: 0,
                        culls: 0,
                        cullsPercent: 0,
                        total: 0,
                        totalPercent: 0,
                    },
                    flock: {}
                };
            }
            
            const placementDate = new Date(placementDateStr.replace(/-/g, '/'));
            const endDate = selectedFarmCycleDetails?.finishDate ? new Date(selectedFarmCycleDetails.finishDate.replace(/-/g, '/')) : new Date();
            const currentAge = Math.floor((endDate.getTime() - placementDate.getTime()) / (1000 * 3600 * 24)) + 1;

            const relevantReports = dailyReports.filter(report => {
                const reportDate = new Date(report.date.replace(/-/g, '/'));
                return reportDate >= placementDate;
            });

            const weekRanges = [
                { label: '0-7 DAYS (FIRST WEEK)', start: 2, end: 8 },
                { label: '8-14 DAYS (SECOND WEEK)', start: 9, end: 15 },
                { label: '15-21 DAYS (THIRD WEEK)', start: 16, end: 22 },
                { label: '22-28 DAYS (FOURTH WEEK)', start: 23, end: 29 },
                { label: '29 DAYS TILL CATCHING', start: 30, end: Infinity },
            ];

            const weeklyData = weekRanges.map(range => {
                let weeklyMort = 0;
                let weeklyCulls = 0;
                
                relevantReports.forEach(report => {
                    const reportDate = new Date(report.date.replace(/-/g, '/'));
                    const dayOfCycle = Math.floor((reportDate.getTime() - placementDate.getTime()) / (1000 * 3600 * 24)) + 1;
                    
                    if (dayOfCycle >= range.start && dayOfCycle <= range.end) {
                        weeklyMort += parseInt(report.houses[i]?.mortality || '0', 10);
                        weeklyCulls += parseInt(report.houses[i]?.culls || '0', 10);
                    }
                });

                const totalWeekly = weeklyMort + weeklyCulls;
                return {
                    mort: weeklyMort,
                    mortPercent: chicksPlaced > 0 ? (weeklyMort / chicksPlaced) * 100 : 0,
                    culls: weeklyCulls,
                    cullsPercent: chicksPlaced > 0 ? (weeklyCulls / chicksPlaced) * 100 : 0,
                    total: totalWeekly,
                    totalPercent: chicksPlaced > 0 ? (totalWeekly / chicksPlaced) * 100 : 0,
                };
            });

            const grandTotalMort = weeklyData.reduce((sum, week) => sum + week.mort, 0);
            const grandTotalCulls = weeklyData.reduce((sum, week) => sum + week.culls, 0);
            const grandTotalAll = grandTotalMort + grandTotalCulls;

            const grandTotal = {
                mort: grandTotalMort,
                mortPercent: chicksPlaced > 0 ? (grandTotalMort / chicksPlaced) * 100 : 0,
                culls: grandTotalCulls,
                cullsPercent: chicksPlaced > 0 ? (grandTotalCulls / chicksPlaced) * 100 : 0,
                total: grandTotalAll,
                totalPercent: chicksPlaced > 0 ? (grandTotalAll / chicksPlaced) * 100 : 0,
            };

            return { 
                houseNumber, 
                chicksPlaced, 
                weeklyData, 
                grandTotal, 
                flock: { 
                    age: currentAge > 0 ? currentAge : '',
                    breed: chicksHouse?.breed || '',
                    flockNo: chicksHouse?.flockNo || ''
                } 
            };
        });

        const totals = {
            chicksPlaced: houseData.reduce((sum, d) => sum + d.chicksPlaced, 0),
            weekly: Array(5).fill(0).map((_, weekIndex) => ({
                mort: houseData.reduce((sum, d) => sum + (d.weeklyData[weekIndex]?.mort || 0), 0),
                culls: houseData.reduce((sum, d) => sum + (d.weeklyData[weekIndex]?.culls || 0), 0),
                total: houseData.reduce((sum, d) => sum + (d.weeklyData[weekIndex]?.total || 0), 0),
            })),
            grandTotal: {
                mort: houseData.reduce((sum, d) => sum + d.grandTotal.mort, 0),
                culls: houseData.reduce((sum, d) => sum + d.grandTotal.culls, 0),
                total: houseData.reduce((sum, d) => sum + d.grandTotal.total, 0),
            }
        }
        
        return { houseData, totals };

    }, [dailyReports, chicksReceivingData, farmName, houseCount, selectedFarmCycleDetails]);

    const handlePrint = () => {
        window.print();
    };
    
    const formatPercent = (val: number) => val.toFixed(2) + '%';
    const hasData = reportData.totals.chicksPlaced > 0;
    
    const handleExportCSV = () => {
        const formatCsvPercent = (val: number) => val.toFixed(2);

        const headers = [
            'House No', 'Chicks Placed',
            ...['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5+'].map(w => [`${w} Mort`, `${w} Mort %`, `${w} Culls`, `${w} Culls %`, `${w} Total`, `${w} Total %`]).flat(),
            'Grand Total Mort', 'Grand Total Mort %', 'Grand Total Culls', 'Grand Total Culls %', 'Grand Total All', 'Grand Total All %'
        ];

        const houseRows = reportData.houseData.map(house => {
            if (house.chicksPlaced === 0) return null;
            const weeklyCells = house.weeklyData.map(week => [
                week.mort, formatCsvPercent(week.mortPercent), week.culls, formatCsvPercent(week.cullsPercent), week.total, formatCsvPercent(week.totalPercent)
            ]).flat();
            const totalCells = [
                house.grandTotal.mort, formatCsvPercent(house.grandTotal.mortPercent),
                house.grandTotal.culls, formatCsvPercent(house.grandTotal.cullsPercent),
                house.grandTotal.total, formatCsvPercent(house.grandTotal.totalPercent)
            ];
            return [house.houseNumber, house.chicksPlaced, ...weeklyCells, ...totalCells].join(',');
        }).filter(Boolean);
        
        const totals = reportData.totals;
        const totalWeeklyCells = totals.weekly.map(week => {
            const mortPercent = totals.chicksPlaced > 0 ? (week.mort / totals.chicksPlaced) * 100 : 0;
            const cullsPercent = totals.chicksPlaced > 0 ? (week.culls / totals.chicksPlaced) * 100 : 0;
            const totalPercent = totals.chicksPlaced > 0 ? (week.total / totals.chicksPlaced) * 100 : 0;
            return [week.mort, formatCsvPercent(mortPercent), week.culls, formatCsvPercent(cullsPercent), week.total, formatCsvPercent(totalPercent)];
        }).flat();

        const grandTotalMortPercent = totals.chicksPlaced > 0 ? (totals.grandTotal.mort / totals.chicksPlaced) * 100 : 0;
        const grandTotalCullsPercent = totals.chicksPlaced > 0 ? (totals.grandTotal.culls / totals.chicksPlaced) * 100 : 0;
        const grandTotalAllPercent = totals.chicksPlaced > 0 ? (totals.grandTotal.total / totals.chicksPlaced) * 100 : 0;
        
        const totalGrandTotalCells = [
            totals.grandTotal.mort, formatCsvPercent(grandTotalMortPercent),
            totals.grandTotal.culls, formatCsvPercent(grandTotalCullsPercent),
            totals.grandTotal.total, formatCsvPercent(grandTotalAllPercent)
        ];
        
        const totalRow = ['TOTAL', totals.chicksPlaced, ...totalWeeklyCells, ...totalGrandTotalCells].join(',');

        const csvContent = [headers.join(','), ...houseRows, totalRow].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `WeeklyMortalityReport_${farmName.replace('/','-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    return (
        <>
            <style>
                {`
                @media print {
                    body > *:not(.print-container) { display: none; }
                    .print-container {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        overflow: visible;
                    }
                    .report-to-print {
                        box-shadow: none;
                        border: none;
                        margin: 0;
                        padding: 0;
                    }
                    .no-print { display: none; }
                }
                `}
            </style>
            <div className="bg-white p-6 rounded-lg shadow-md report-to-print">
                <div className="flex justify-between items-center mb-4 no-print">
                     <div className="flex items-center gap-4">
                        <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                            <BackArrowIcon />
                        </button>
                        <h3 className="text-xl font-semibold text-gray-800">Weekly Mortality Report</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleExportCSV} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-sm hover:bg-teal-700">
                            Export CSV
                        </button>
                        <button onClick={handlePrint} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300">
                            Print
                        </button>
                    </div>
                </div>

                {!hasData ? (
                    <p className="text-gray-500 text-sm py-4 text-center">No chicks placement data available to generate this report.</p>
                ) : (
                    <div className="overflow-x-auto text-xs">
                        {/* Report Header */}
                        <div className="text-center mb-2">
                             <img src={AL_WATANIA_LOGO_BASE64} alt="Al Watania Poultry Logo" className="h-12 mx-auto" />
                            <h4 className="font-bold text-sm">WEEKLY MORTALITY & CULLS REPORT</h4>
                        </div>
                        <div className="flex justify-between mb-2 border-y py-1">
                            <span><span className="font-bold">FARM NO.:</span> {farmName}</span>
                            <span><span className="font-bold">CROP NO.:</span> {cropNo}</span>
                            <span><span className="font-bold">CYCLE NO.:</span> {cycleNo}</span>
                        </div>
                        
                        {/* Report Table */}
                        <table className="min-w-full border-collapse border border-black">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th rowSpan={2} className="border border-black p-1">H. NO.</th>
                                    <th colSpan={3} className="border border-black p-1">FLOCK</th>
                                    <th rowSpan={2} className="border border-black p-1">CHICK PLACED</th>
                                    <th colSpan={6} className="border border-black p-1">0-7 DAYS (FIRST WEEK)</th>
                                    <th colSpan={6} className="border border-black p-1">8-14 DAYS (SECOND WEEK)</th>
                                    <th colSpan={6} className="border border-black p-1">15-21 DAYS (THIRD WEEK)</th>
                                    <th colSpan={6} className="border border-black p-1">22-28 DAYS (FOURTH WEEK)</th>
                                    <th colSpan={6} className="border border-black p-1">29 DAYS TILL CATCHING</th>
                                    <th colSpan={6} className="border border-black p-1">GRAND TOTAL</th>
                                </tr>
                                <tr className="bg-gray-100">
                                    <th className="border border-black p-1">BREED</th>
                                    <th className="border border-black p-1">NO.</th>
                                    <th className="border border-black p-1">AGE</th>
                                    {Array(6).fill(0).map((_, i) => (
                                       <React.Fragment key={i}>
                                            <th className="border border-black p-1">MORT.</th>
                                            <th className="border border-black p-1">%</th>
                                            <th className="border border-black p-1">CULLS</th>
                                            <th className="border border-black p-1">%</th>
                                            <th className="border border-black p-1">TOTAL</th>
                                            <th className="border border-black p-1">%</th>
                                       </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.houseData.map((data, i) => (
                                    <tr key={i} className="text-center">
                                        <td className="border border-black p-1">{data.houseNumber}</td>
                                        <td className="border border-black p-1">{data.flock.breed}</td>
                                        <td className="border border-black p-1">{data.flock.flockNo}</td>
                                        <td className="border border-black p-1">{data.flock.age}</td>
                                        <td className="border border-black p-1 font-bold">{data.chicksPlaced}</td>
                                        {data.weeklyData.map((week, j) => (
                                            <React.Fragment key={j}>
                                                <td className="border border-black p-1">{week.mort}</td>
                                                <td className="border border-black p-1">{formatPercent(week.mortPercent)}</td>
                                                <td className="border border-black p-1">{week.culls}</td>
                                                <td className="border border-black p-1">{formatPercent(week.cullsPercent)}</td>
                                                <td className="border border-black p-1">{week.total}</td>
                                                <td className="border border-black p-1">{formatPercent(week.totalPercent)}</td>
                                            </React.Fragment>
                                        ))}
                                        <td className="border border-black p-1">{data.grandTotal.mort}</td>
                                        <td className="border border-black p-1">{formatPercent(data.grandTotal.mortPercent)}</td>
                                        <td className="border border-black p-1">{data.grandTotal.culls}</td>
                                        <td className="border border-black p-1">{formatPercent(data.grandTotal.cullsPercent)}</td>
                                        <td className="border border-black p-1">{data.grandTotal.total}</td>
                                        <td className="border border-black p-1">{formatPercent(data.grandTotal.totalPercent)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold">
                                <tr className="text-center">
                                    <td colSpan={4} className="border border-black p-1 text-right pr-2">TOTAL</td>
                                    <td className="border border-black p-1">{reportData.totals.chicksPlaced}</td>
                                    {reportData.totals.weekly.map((week, i) => {
                                        const mortPercent = reportData.totals.chicksPlaced > 0 ? (week.mort / reportData.totals.chicksPlaced) * 100 : 0;
                                        const cullsPercent = reportData.totals.chicksPlaced > 0 ? (week.culls / reportData.totals.chicksPlaced) * 100 : 0;
                                        const totalPercent = reportData.totals.chicksPlaced > 0 ? (week.total / reportData.totals.chicksPlaced) * 100 : 0;
                                        return (
                                            <React.Fragment key={i}>
                                                <td className="border border-black p-1">{week.mort}</td>
                                                <td className="border border-black p-1">{formatPercent(mortPercent)}</td>
                                                <td className="border border-black p-1">{week.culls}</td>
                                                <td className="border border-black p-1">{formatPercent(cullsPercent)}</td>
                                                <td className="border border-black p-1">{week.total}</td>
                                                <td className="border border-black p-1">{formatPercent(totalPercent)}</td>
                                            </React.Fragment>
                                        )
                                    })}
                                    <td className="border border-black p-1">{reportData.totals.grandTotal.mort}</td>
                                    <td className="border border-black p-1">{formatPercent(reportData.totals.chicksPlaced > 0 ? (reportData.totals.grandTotal.mort / reportData.totals.chicksPlaced) * 100 : 0)}</td>
                                    <td className="border border-black p-1">{reportData.totals.grandTotal.culls}</td>
                                    <td className="border border-black p-1">{formatPercent(reportData.totals.chicksPlaced > 0 ? (reportData.totals.grandTotal.culls / reportData.totals.chicksPlaced) * 100 : 0)}</td>
                                    <td className="border border-black p-1">{reportData.totals.grandTotal.total}</td>
                                    <td className="border border-black p-1">{formatPercent(reportData.totals.chicksPlaced > 0 ? (reportData.totals.grandTotal.total / reportData.totals.chicksPlaced) * 100 : 0)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default WeeklyMortalityReport;