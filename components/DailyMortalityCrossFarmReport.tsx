

import React, { useState, useMemo } from 'react';
import type { AllFarmsData, AllFarmsChicksReceivingData, Cycle } from '../types';
import { FARM_NAMES, MAX_HOUSE_COUNT, getHouseCountForFarm } from '../constants';

interface ReportProps {
    allFarmsData: AllFarmsData;
    allFarmsChicksReceivingData: AllFarmsChicksReceivingData;
    cycles: Cycle[];
}

const DailyMortalityCrossFarmReport: React.FC<ReportProps> = ({ allFarmsData, allFarmsChicksReceivingData, cycles }) => {
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedFarmFilter, setSelectedFarmFilter] = useState<string>('All');
    
    const formatDate = (dateStr: string) => {
      const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: '2-digit' };
      return new Date(dateStr.replace(/-/g, '/')).toLocaleDateString('en-GB', options).replace(/ /g, '-');
    }
    const formatPercent = (val: number) => val.toFixed(2);

    const reportData = useMemo(() => {
        const selectedDateObj = new Date(date.replace(/-/g, '/'));
        selectedDateObj.setHours(0,0,0,0);
        
        const farmsToProcess = selectedFarmFilter === 'All' ? FARM_NAMES : [selectedFarmFilter];
        
        const farmRows = farmsToProcess.map(farmName => {
            // New Cycle Selection Logic: Find the cycle that is active for the selected report date.
            const validCyclesForDate = cycles
                .map(c => ({ ...c, farmDetails: c.farms.find(f => f.farmName === farmName) }))
                .filter(c => {
                    if (!c.farmDetails) return false;
                    const start = new Date(c.farmDetails.startDate.replace(/-/g, '/'));
                    start.setHours(0,0,0,0);
                    if (selectedDateObj < start) return false;

                    // A cycle without a finish date is considered ongoing.
                    if (c.farmDetails.finishDate) {
                        const end = new Date(c.farmDetails.finishDate.replace(/-/g, '/'));
                        end.setHours(0,0,0,0);
                        if (selectedDateObj > end) return false;
                    }
                    return true;
                });
            
            // From the valid cycles, pick the one that started most recently.
            const currentCycleForFarm = validCyclesForDate.sort((a, b) => 
                new Date(b.farmDetails!.startDate.replace(/-/g, '/')).getTime() - new Date(a.farmDetails!.startDate.replace(/-/g, '/')).getTime()
            )[0];

            if (!currentCycleForFarm) {
                return { isDataAvailable: false, farmName };
            }

            const farmChicksData = (allFarmsChicksReceivingData[farmName] || []).find(d => d.cycleId === currentCycleForFarm.id);
            const farmDailyData = allFarmsData[farmName] || [];

            if (!farmChicksData) return { isDataAvailable: false, farmName };

            const totalChicksPlaced = farmChicksData.houses.reduce((sum, h) => sum + (parseInt(h.netChicksPlaced, 10) || 0), 0);
            if (totalChicksPlaced === 0) return { isDataAvailable: false, farmName };
            
            // Updated Average Age Calculation Logic
            const houseCountWithPlacement = farmChicksData.houses.filter(h => h.placementDate).length;
            let cumulativeAgeDays = 0;
            farmChicksData.houses.forEach(house => {
                if (house.placementDate) {
                    const placementDate = new Date(house.placementDate.replace(/-/g, '/'));
                    placementDate.setHours(0,0,0,0);
                    if (selectedDateObj >= placementDate) {
                        const diffTime = selectedDateObj.getTime() - placementDate.getTime();
                        const age = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        cumulativeAgeDays += age;
                    }
                }
            });
            const aveAge = houseCountWithPlacement > 0 ? cumulativeAgeDays / houseCountWithPlacement : 0;
            
            const placementDates = farmChicksData.houses.map(h => h.placementDate).filter(Boolean).map(d => new Date(d.replace(/-/g, '/')).getTime());
            const earliestPlacement = placementDates.length > 0 ? new Date(Math.min(...placementDates)) : null;

            const reportForDate = farmDailyData.find(r => r.date === date);

            const dailyHouseData = Array.from({ length: MAX_HOUSE_COUNT }, (_, i) => ({
                mort: parseInt(reportForDate?.houses[i]?.mortality || '0', 10),
                culls: parseInt(reportForDate?.houses[i]?.culls || '0', 10),
            }));
            
            const houseDetails = Array.from({ length: MAX_HOUSE_COUNT }, (_, i) => {
                const houseChicks = farmChicksData?.houses[i];
                if (!houseChicks || !houseChicks.placementDate) return '';

                const breed = houseChicks.breed || '';
                const breedInitial = breed.toLowerCase().startsWith('cobb') ? 'C' : breed.toLowerCase().startsWith('ross') ? 'R' : (breed ? breed.charAt(0).toUpperCase() : '');
                
                const flock = houseChicks.flock || '';
                const flockNo = houseChicks.flockNo || '';
                const hatcheryNo = houseChicks.hatcheryNo || '';
                const flockAge = houseChicks.flockAge || '';

                if (!breedInitial && !flock && !flockNo && !flockAge && !hatcheryNo) {
                    return '';
                }
                
                const flockAndNo = [flock, flockNo].filter(Boolean).join('-');
                return `${breedInitial}/${flockAndNo}/${flockAge}/${hatcheryNo}`;
            });

            const totalMortToday = dailyHouseData.reduce((sum, h) => sum + h.mort, 0);
            const totalCullsToday = dailyHouseData.reduce((sum, h) => sum + h.culls, 0);

            const relevantReports = farmDailyData.filter(r => {
                const reportDate = new Date(r.date.replace(/-/g, '/'));
                return earliestPlacement && reportDate >= earliestPlacement && reportDate <= selectedDateObj;
            });

            let cumMort = 0;
            let cumCulls = 0; 
            relevantReports.forEach(report => {
                report.houses.forEach(house => {
                    cumMort += parseInt(house.mortality || '0', 10);
                    cumCulls += parseInt(house.culls || '0', 10);
                });
            });

            const cumTotal = cumMort + cumCulls;
            const balanceChicks = totalChicksPlaced - cumTotal;

            return {
                isDataAvailable: true,
                farmName,
                cycleNo: farmChicksData.cycleNo,
                // Fix: Storing aveAge as a number to prevent potential type mismatches. Formatting is now done at the point of display.
                aveAge: aveAge,
                chicksPlaced: totalChicksPlaced,
                dailyHouseData,
                houseDetails,
                totalMortToday,
                totalCullsToday,
                totalMortPercent: totalChicksPlaced > 0 ? (totalMortToday / totalChicksPlaced) * 100 : 0,
                totalCullsPercent: totalChicksPlaced > 0 ? (totalCullsToday / totalChicksPlaced) * 100 : 0,
                totalToday: totalMortToday + totalCullsToday,
                totalTodayPercent: totalChicksPlaced > 0 ? ((totalMortToday + totalCullsToday) / totalChicksPlaced) * 100 : 0,
                cumTotal: cumTotal,
                cumTotalPercent: totalChicksPlaced > 0 ? (cumTotal / totalChicksPlaced) * 100 : 0,
                balanceChicks,
            };
        });
        
        const firstAvailableFarmRow = farmRows.find(farm => farm.isDataAvailable);
        const cycleNo = firstAvailableFarmRow ? firstAvailableFarmRow.cycleNo : '';

        const grandTotal = farmRows.reduce((acc, farm) => {
            if (farm.isDataAvailable) {
                acc.chicksPlaced += farm.chicksPlaced;
                acc.cumTotal += farm.cumTotal;
                acc.balanceChicks += farm.balanceChicks;
                farm.dailyHouseData.forEach((house, i) => {
                    acc.dailyHouseData[i].mort += house.mort;
                    acc.dailyHouseData[i].culls += house.culls;
                });
            }
            return acc;
        }, {
            chicksPlaced: 0,
            cumTotal: 0,
            balanceChicks: 0,
            dailyHouseData: Array.from({ length: MAX_HOUSE_COUNT }, () => ({ mort: 0, culls: 0 })),
        });

        return { farmRows, grandTotal, cycleNo };
    }, [date, selectedFarmFilter, allFarmsData, allFarmsChicksReceivingData, cycles]);
    
    const handleExportCSV = () => {
        const reportTitle = selectedFarmFilter === 'All'
            ? 'DAILY MORT. REPORT OF BUTAIN 2,3 & SHEMALIA'
            : `DAILY MORT. REPORT OF ${selectedFarmFilter}`;
            
        const highlightStyle = 'background-color:#FFFF00;'; // Yellow highlight

        let tableHTML = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/><x:PageSetup><x:Layout x:Orientation="Landscape"/></x:PageSetup></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
            <body>
        `;
        
        // Report Title Headers
        tableHTML += `
            <table width="100%">
                <tr>
                    <td colspan="3" style="text-align:left;">Sulaiman A. Al Rajhi Est,<br/>Broiler Department</td>
                    <td colspan="${(MAX_HOUSE_COUNT * 2) - 3}" style="text-align:center; font-weight:bold; font-size: 16px;">${reportTitle}</td>
                    <td colspan="9" style="text-align:right;">Al-Watania Poultry<br/>Cycle No: ${reportData.cycleNo}</td>
                </tr>
                <tr>
                    <td colspan="3" style="text-align:left;">Date: ${formatDate(date)}</td>
                </tr>
                <tr><td colspan="${3 + (MAX_HOUSE_COUNT * 2) + 9}">&nbsp;</td></tr>
            </table>
        `;
        
        // Main Table
        tableHTML += `<table border="1">`;

        // Table Header
        tableHTML += `
            <thead>
                <tr style="background-color:#f3f4f6; font-weight:bold; text-align:center;">
                    <th rowspan="3">FARM NO</th>
                    <th rowspan="3">AVE. AGE</th>
                    <th rowspan="3">CHICK PLACED</th>
                    <th colspan="${MAX_HOUSE_COUNT * 2}">HOUSE NO</th>
                    <th rowspan="2">MORT.</th>
                    <th rowspan="2">MORT.%</th>
                    <th rowspan="2">CULLS</th>
                    <th rowspan="2">CULLS%</th>
                    <th rowspan="2">TOTAL MORT.</th>
                    <th rowspan="2">TOTAL MORT.%</th>
                    <th rowspan="2">CUM. MORT.</th>
                    <th rowspan="2">CUM. MORT.%</th>
                    <th rowspan="2">BAL. OF CHICKS</th>
                </tr>
                <tr style="background-color:#f3f4f6; font-weight:bold; text-align:center;">
                    ${Array.from({ length: MAX_HOUSE_COUNT }, (_, i) => `<th colspan="2">${i + 1}</th>`).join('')}
                </tr>
                 <tr style="background-color:#f3f4f6; font-weight:bold; text-align:center;">
                    ${Array.from({ length: MAX_HOUSE_COUNT }, () => `<th>Mort.</th><th>Culls</th>`).join('')}
                    <th colspan="9"></th>
                </tr>
            </thead>
        `;
        
        // Table Body
        tableHTML += '<tbody>';
        reportData.farmRows.forEach(farm => {
            if (!farm.isDataAvailable) {
                tableHTML += `
                    <tr style="text-align:center;">
                        <td style="font-weight:bold;">${farm.farmName}</td>
                        <td colspan="${MAX_HOUSE_COUNT * 2 + 11}">UNDER PREPARATION</td>
                    </tr>
                `;
            } else {
                // Flock Details Row (labeled Flock No. as per image)
                tableHTML += `<tr style="font-size:0.8em; text-align:center;">
                    <td>Flock No.</td>
                    <td></td>
                    <td></td>
                    ${farm.houseDetails.map(detail => `<td colspan="2">${detail || '-'}</td>`).join('')}
                    <td colspan="9"></td>
                </tr>`;

                // Data Row
                let dataRowHTML = `<tr style="font-weight:bold; text-align:center;">
                    <td>${farm.farmName}</td>
                    <td>${farm.aveAge.toFixed(2)}</td>
                    <td>${farm.chicksPlaced.toLocaleString()}</td>`;
                
                farm.dailyHouseData.forEach(house => {
                    const shouldHighlight = house.mort >= 100 && house.culls < 100;
                    const style = shouldHighlight ? highlightStyle : '';
                    dataRowHTML += `<td style="${style}">${house.mort || ''}</td>`;
                    dataRowHTML += `<td style="${style}">${house.culls || ''}</td>`;
                });
                
                dataRowHTML += `
                    <td>${farm.totalMortToday.toLocaleString()}</td>
                    <td>${formatPercent(farm.totalMortPercent)}</td>
                    <td>${farm.totalCullsToday.toLocaleString()}</td>
                    <td>${formatPercent(farm.totalCullsPercent)}</td>
                    <td>${farm.totalToday.toLocaleString()}</td>
                    <td>${formatPercent(farm.totalTodayPercent)}</td>
                    <td>${farm.cumTotal.toLocaleString()}</td>
                    <td>${formatPercent(farm.cumTotalPercent)}</td>
                    <td>${farm.balanceChicks.toLocaleString()}</td>
                </tr>`;
                tableHTML += dataRowHTML;
            }
        });
        tableHTML += '</tbody>';

        // Table Footer
        const grandTotal = reportData.grandTotal;
        const grandTotalCumPercent = grandTotal.chicksPlaced > 0 ? (grandTotal.cumTotal / grandTotal.chicksPlaced) * 100 : 0;
        tableHTML += `<tfoot style="font-weight:bold; background-color:#f3f4f6; text-align:center;">
            <tr>
                <td colspan="2">TOTAL</td>
                <td>${grandTotal.chicksPlaced.toLocaleString()}</td>
                ${grandTotal.dailyHouseData.map(house => `<td>${house.mort || ''}</td><td>${house.culls || ''}</td>`).join('')}
                <td colspan="6"></td>
                <td>${grandTotal.cumTotal.toLocaleString()}</td>
                <td>${formatPercent(grandTotalCumPercent)}</td>
                <td>${grandTotal.balanceChicks.toLocaleString()}</td>
            </tr>
        </tfoot>`;

        tableHTML += '</table></body></html>';
        
        const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `DailyMortalityCrossFarm_${date}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => { window.print(); };
    
    const reportTitle = selectedFarmFilter === 'All'
        ? 'DAILY MORT. REPORT OF BUTAIN 2,3 & SHEMALIA'
        : `DAILY MORT. REPORT OF ${selectedFarmFilter}`;

    return (
    <>
      <style>{`
        @media print {
            body > * { display: none; }
            .print-container, .print-container * { display: block; }
            .print-container { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none; }
            @page { size: landscape; margin: 0.5in; }
            table { font-size: 8pt !important; }
        }
      `}</style>
      <div className="bg-white p-6 rounded-lg shadow-md print-container">
        <div className="flex justify-between items-center mb-4 no-print">
            <h3 className="text-xl font-semibold text-gray-800">Daily Mortality Cross-Farm Report</h3>
            <div className="flex items-center gap-4">
                <select
                    value={selectedFarmFilter}
                    onChange={e => setSelectedFarmFilter(e.target.value)}
                    className="block px-3 py-1.5 border border-gray-300 rounded-md shadow-sm"
                    aria-label="Filter report by farm"
                >
                    <option value="All">All Farms</option>
                    {FARM_NAMES.map(farm => <option key={farm} value={farm}>{farm}</option>)}
                </select>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="block px-3 py-1.5 border border-gray-300 rounded-md shadow-sm" />
                <button onClick={handleExportCSV} className="px-3 py-1.5 bg-teal-600 text-white font-semibold rounded-lg shadow-sm hover:bg-teal-700">Export XLS</button>
                <button onClick={handlePrint} className="px-3 py-1.5 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300">Print</button>
            </div>
        </div>
        
        <div className="mb-2">
            <div className="flex justify-between text-sm font-semibold">
                <div className="text-left">
                    <p>Sulaiman A. Al Rajhi Est,</p>
                    <p>Broiler Department</p>
                    <p className="mt-2">Date: {formatDate(date)}</p>
                </div>
                <div className="text-right">
                    <p>Al-Watania Poultry Co.</p>
                    <p className="mt-4">Cycle No: {reportData.cycleNo}</p>
                </div>
            </div>
            <h4 className="font-bold text-lg text-center mt-2">{reportTitle}</h4>
        </div>

        <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-black">
                <thead className="bg-gray-100 text-xs">
                    <tr>
                        <th rowSpan={3} className="border border-black p-1">FARM NO</th>
                        <th rowSpan={3} className="border border-black p-1">AVE. AGE</th>
                        <th rowSpan={3} className="border border-black p-1">CHICK PLACED</th>
                        <th colSpan={MAX_HOUSE_COUNT * 2} className="border border-black p-1">HOUSE NO</th>
                        <th rowSpan={2} className="border border-black p-1">MORT.</th>
                        <th rowSpan={2} className="border border-black p-1">MORT.%</th>
                        <th rowSpan={2} className="border border-black p-1">CULLS</th>
                        <th rowSpan={2} className="border border-black p-1">CULLS%</th>
                        <th rowSpan={2} className="border border-black p-1">TOTAL MORT.</th>
                        <th rowSpan={2} className="border border-black p-1">TOTAL MORT.%</th>
                        <th rowSpan={2} className="border border-black p-1">CUM. MORT.</th>
                        <th rowSpan={2} className="border border-black p-1">CUM. MORT.%</th>
                        <th rowSpan={2} className="border border-black p-1">BAL. OF CHICK</th>
                    </tr>
                    <tr>
                        {Array.from({ length: MAX_HOUSE_COUNT }, (_, i) => <th key={i} colSpan={2} className="border border-black p-1">{i + 1}</th>)}
                    </tr>
                    <tr>
                        {Array.from({ length: MAX_HOUSE_COUNT }, (_, i) => <React.Fragment key={i}><th className="border border-black p-1">Mort.</th><th className="border border-black p-1">Culls</th></React.Fragment>)}
                        <th colSpan={9} className="border-t border-black"></th>
                    </tr>
                </thead>
                <tbody className="bg-white text-xs divide-y divide-gray-200">
                    {reportData.farmRows.map(farm => {
                        if (!farm.isDataAvailable) {
                            return (
                                <tr key={farm.farmName} className="text-center">
                                    <td className="border p-1 font-bold">{farm.farmName}</td>
                                    <td colSpan={MAX_HOUSE_COUNT * 2 + 11} className="border p-1 text-gray-500">UNDER PREPARATION</td>
                                </tr>
                            );
                        }
                        return (
                            <React.Fragment key={farm.farmName}>
                                <tr className="text-center bg-gray-50" style={{ fontSize: '0.65rem' }}>
                                    <td className="border p-1 font-semibold">Flock No.</td>
                                    <td className="border p-1"></td>
                                    <td className="border p-1"></td>
                                    {farm.houseDetails.map((detail, i) => (
                                        <td key={i} colSpan={2} className="border px-1 py-0.5 font-mono">{detail || '-'}</td>
                                    ))}
                                    <td colSpan={9}></td>
                                </tr>
                                <tr className="text-center font-bold">
                                    <td className="border p-1">{farm.farmName}</td>
                                    <td className="border p-1">{farm.aveAge.toFixed(2)}</td>
                                    <td className="border p-1">{farm.chicksPlaced.toLocaleString()}</td>
                                    {farm.dailyHouseData.map((house, i) => (
                                        <React.Fragment key={i}>
                                            <td className="border p-1">{house.mort || ''}</td>
                                            <td className="border p-1">{house.culls || ''}</td>
                                        </React.Fragment>
                                    ))}
                                    <td className="border p-1">{farm.totalMortToday.toLocaleString()}</td>
                                    <td className="border p-1">{formatPercent(farm.totalMortPercent)}</td>
                                    <td className="border p-1">{farm.totalCullsToday.toLocaleString()}</td>
                                    <td className="border p-1">{formatPercent(farm.totalCullsPercent)}</td>
                                    <td className="border p-1">{farm.totalToday.toLocaleString()}</td>
                                    <td className="border p-1">{formatPercent(farm.totalTodayPercent)}</td>
                                    <td className="border p-1">{farm.cumTotal.toLocaleString()}</td>
                                    <td className="border p-1">{formatPercent(farm.cumTotalPercent)}</td>
                                    <td className="border p-1">{farm.balanceChicks.toLocaleString()}</td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
                <tfoot className="bg-gray-100 font-bold text-xs">
                    <tr className="text-center">
                        <td colSpan={2} className="border p-1">TOTAL</td>
                        <td className="border p-1">{reportData.grandTotal.chicksPlaced.toLocaleString()}</td>
                        {reportData.grandTotal.dailyHouseData.map((house, i) => (
                            <React.Fragment key={i}>
                                <td className="border p-1">{house.mort || ''}</td>
                                <td className="border p-1">{house.culls || ''}</td>
                            </React.Fragment>
                        ))}
                        <td colSpan="6"></td>
                        <td className="border p-1">{reportData.grandTotal.cumTotal.toLocaleString()}</td>
                        <td className="border p-1">{formatPercent(reportData.grandTotal.chicksPlaced > 0 ? (reportData.grandTotal.cumTotal / reportData.grandTotal.chicksPlaced) * 100 : 0)}</td>
                        <td className="border p-1">{reportData.grandTotal.balanceChicks.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
      </div>
    </>
    );
};

export default DailyMortalityCrossFarmReport;