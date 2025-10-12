import React, { useState, useMemo } from 'react';
import type { SubmittedFeedOrder, Cycle, AllFarmsChicksReceivingData } from '../types';
import { PRODUCTION_LINE_MAP } from '../constants';
import * as XLSX from 'xlsx';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Label } from 'recharts';

interface DailyFeedPlanReportProps {
    submittedFeedOrders: SubmittedFeedOrder[];
    cycles: Cycle[];
    allFarmsChicksReceivingData: AllFarmsChicksReceivingData;
    onBack: () => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const formatHouseNumbers = (numbers: number[]): string => {
    if (numbers.length === 0) return '';
    if (numbers.length === 1) return numbers[0].toString();

    numbers.sort((a, b) => a - b);

    const ranges: (string | number)[] = [];
    let startOfRange = numbers[0];

    for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] !== numbers[i - 1] + 1) {
            if (startOfRange === numbers[i - 1]) {
                ranges.push(startOfRange);
            } else {
                ranges.push(`${startOfRange} To ${numbers[i - 1]}`);
            }
            startOfRange = numbers[i];
        }
    }
    
    if (startOfRange === numbers[numbers.length - 1]) {
        ranges.push(startOfRange);
    } else {
        ranges.push(`${startOfRange} To ${numbers[numbers.length - 1]}`);
    }

    return ranges.join(', ');
};

interface ProcessedOrderItem {
    farmName: string;
    purchGroup: string;
    stoNo: string;
    feedType: string;
    quantity: number;
    cycleNo: string;
    remarks: string;
    houseNo: number;
}
interface ReportRow extends Omit<ProcessedOrderItem, 'houseNo' | 'quantity'>{
    houseNos: number[];
    houseNoDisplay: string;
    totalQuantity: number;
}

const DailyFeedPlanReport: React.FC<DailyFeedPlanReportProps> = ({ submittedFeedOrders, cycles, allFarmsChicksReceivingData, onBack }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const reportData = useMemo(() => {
        // 1. Get all individual order items for the selected date.
        const allItems: ProcessedOrderItem[] = [];
        const ordersForDate = submittedFeedOrders.filter(order => order.items.some(item => item.deliveryDate === selectedDate));

        for (const order of ordersForDate) {
            const cycle = cycles.find(c => c.id === order.cycleId);
            const chicksData = (allFarmsChicksReceivingData[order.farmName] || []).find(d => d.cycleId === order.cycleId);

            for (const item of order.items) {
                if(item.deliveryDate !== selectedDate) continue;

                const quantity = parseFloat(item.quantity);
                if (!quantity || quantity <= 0) continue;

                const houseChicks = chicksData?.houses[item.houseNo - 1];
                allItems.push({
                    farmName: order.farmName,
                    purchGroup: PRODUCTION_LINE_MAP[order.farmName] || '',
                    stoNo: item.stoNo || order.feedMillNo,
                    feedType: item.feedType,
                    quantity: quantity,
                    cycleNo: cycle?.cycleNo || '',
                    remarks: houseChicks?.trialOrControl || '',
                    houseNo: item.houseNo,
                });
            }
        }
        
        // 2. Group items to consolidate rows
        const grouped = allItems.reduce((acc, item) => {
            // Group by everything except per-house quantity and house number
            const key = `${item.farmName}|${item.purchGroup}|${item.stoNo}|${item.feedType}|${item.cycleNo}|${item.remarks}`;
            
            if (!acc[key]) {
                const { houseNo, quantity, ...rest } = item;
                acc[key] = {
                    ...rest,
                    houseNos: [],
                    totalQuantity: 0,
                    houseNoDisplay: '',
                };
            }
            acc[key].houseNos.push(item.houseNo);
            acc[key].totalQuantity += item.quantity; // Sum quantities
            
            return acc;
        }, {} as Record<string, ReportRow>);

        // 3. Finalize data for rendering
        const flattenedItems = Object.values(grouped).map(group => {
            group.houseNoDisplay = formatHouseNumbers(group.houseNos);
            return group;
        }).sort((a,b) => a.purchGroup.localeCompare(b.purchGroup) || a.farmName.localeCompare(b.farmName) || a.stoNo.localeCompare(b.stoNo) || (a.houseNos[0] - b.houseNos[0]));


        // 4. Calculate summary
        const feedSummary: Record<string, number> = {
            'Broiler Starter Feed': 0,
            'Broiler Grower Feed CR': 0,
            'Broiler Grower feed PL': 0,
            'Broiler Finisher Feed': 0,
        };
        flattenedItems.forEach(item => {
            if (item.feedType.includes('Starter')) feedSummary['Broiler Starter Feed'] += item.totalQuantity;
            else if (item.feedType.includes('Grower CR')) feedSummary['Broiler Grower Feed CR'] += item.totalQuantity;
            else if (item.feedType.includes('Grower PL') || item.feedType.includes('Grower feed PL')) feedSummary['Broiler Grower feed PL'] += item.totalQuantity;
            else if (item.feedType.includes('Finisher')) feedSummary['Broiler Finisher Feed'] += item.totalQuantity;
        });
        
        const grandTotal = flattenedItems.reduce((sum, item) => sum + item.totalQuantity, 0);

        // 5. Prepare data for charts
        const farmBreakdown = flattenedItems.reduce((acc, item) => {
            acc[item.farmName] = (acc[item.farmName] || 0) + item.totalQuantity;
            return acc;
        }, {} as Record<string, number>);

        const farmChartData = Object.entries(farmBreakdown).map(([name, quantity]) => ({
            name,
            quantity: parseFloat(quantity.toFixed(3))
        })).sort((a,b) => b.quantity - a.quantity);

        const feedTypeChartData = Object.entries(feedSummary)
            .filter(([_, total]) => total > 0)
            .map(([name, quantity]) => ({
                name: name.replace(' Feed', '').replace('Broiler ', '').replace(' feed', ''),
                quantity: parseFloat((quantity as number).toFixed(3))
            }));


        return { flattenedItems, feedSummary, grandTotal, farmChartData, feedTypeChartData };
    }, [selectedDate, submittedFeedOrders, cycles, allFarmsChicksReceivingData]);
    
    const handlePrint = () => window.print();

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const ws_data = [
            ["FEED DELIVERY DATE", "FARM NO.", "PURCH. GROUP", "STO NO.", "TYPE OF FEED", "FEED CONSUMED", "CYCLE NO", "FEED (TONS)", "Remarks"],
            ...reportData.flattenedItems.map(item => [
                selectedDate,
                item.farmName,
                item.purchGroup,
                item.stoNo,
                item.feedType,
                item.houseNoDisplay,
                item.cycleNo,
                item.totalQuantity.toFixed(3),
                item.remarks
            ]),
            ["", "", "", "", "", "", "TOTAL QTY.", reportData.grandTotal.toFixed(3), ""],
            [], // spacer
            ...Object.entries(reportData.feedSummary).map(([feedType, total]) => [feedType, (total as number).toFixed(3)]),
            ["Grand Total", reportData.grandTotal.toFixed(3)]
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, "Daily Feed Plan");
        XLSX.writeFile(wb, `DailyFeedPlan_${selectedDate}.xlsx`);
    };

    return (
        <>
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible; }
                    .print-container { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                    @page { size: landscape; }
                }
            `}</style>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="print-container">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 no-print">
                        <div className="flex items-center gap-4">
                            <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                                <BackArrowIcon />
                            </button>
                            <h3 className="text-xl font-semibold text-gray-800">Daily Feed Plan Report</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="p-2 border border-gray-300 rounded-md" />
                            <button onClick={handleExportExcel} className="px-4 py-2 bg-green-600 text-white rounded-md">Export</button>
                            <button onClick={handlePrint} className="px-4 py-2 bg-gray-600 text-white rounded-md">Print</button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-sm">
                            <thead className="text-left">
                                <tr className="bg-yellow-300 font-bold">
                                    <th className="border p-2">FEED DELIVERY DATE</th>
                                    <th className="border p-2">FARM NO.</th>
                                    <th className="border p-2">PURCH. GROUP</th>
                                    <th className="border p-2">STO NO.</th>
                                    <th className="border p-2">TYPE OF FEED</th>
                                    <th className="border p-2">FEED CONSUMED</th>
                                    <th className="border p-2">CYCLE NO</th>
                                    <th className="border p-2">FEED (TONS)</th>
                                    <th className="border p-2">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.flattenedItems.map((item, index) => (
                                    <tr key={index} className="border">
                                        <td className="border p-2">{selectedDate}</td>
                                        <td className="border p-2">{item.farmName}</td>
                                        <td className="border p-2">{item.purchGroup}</td>
                                        <td className="border p-2">{item.stoNo}</td>
                                        <td className="border p-2">{item.feedType}</td>
                                        <td className="border p-2">{item.houseNoDisplay}</td>
                                        <td className="border p-2">{item.cycleNo}</td>
                                        <td className="border p-2">{item.totalQuantity.toFixed(3)}</td>
                                        <td className={`border p-2 font-semibold ${item.remarks ? 'text-red-600' : ''}`}>{item.remarks}</td>
                                    </tr>
                                ))}
                                <tr className="font-bold bg-gray-100">
                                    <td colSpan={7} className="text-right p-2">TOTAL QTY.</td>
                                    <td className="p-2">{reportData.grandTotal.toFixed(3)}</td>
                                    <td className="p-2"></td>
                                </tr>
                            </tbody>
                        </table>

                        <table className="mt-8 w-full max-w-sm border-collapse text-sm">
                            <tbody>
                                {Object.entries(reportData.feedSummary).map(([feedType, total]) => (
                                    <tr key={feedType} className="border">
                                        <td className="border p-2 font-medium">{feedType}</td>
                                        <td className="border p-2 text-right">{(total as number).toFixed(3)}</td>
                                    </tr>
                                ))}
                                <tr className="border bg-gray-100 font-bold">
                                    <td className="border p-2">Grand Total</td>
                                    <td className="border p-2 text-right">{reportData.grandTotal.toFixed(3)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-12 no-print">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Daily Summary Charts</h3>
                    {reportData.flattenedItems.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-lg font-medium text-gray-700 text-center mb-2">Feed Distribution by Farm (Tons)</h4>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={reportData.farmChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis>
                                            <Label value="Tons" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                                        </YAxis>
                                        <Tooltip formatter={(value: number) => `${value.toFixed(3)} Tons`} />
                                        <Bar dataKey="quantity" fill="#3b82f6" name="Total Feed" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div>
                                <h4 className="text-lg font-medium text-gray-700 text-center mb-2">Feed Distribution by Type (Tons)</h4>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={reportData.feedTypeChartData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis>
                                            <Label value="Tons" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                                        </YAxis>
                                        <Tooltip formatter={(value: number) => `${value.toFixed(3)} Tons`} />
                                        <Bar dataKey="quantity" fill="#22c55e" name="Total Feed" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center">No data for selected date to display charts.</p>
                    )}
                </div>
            </div>
        </>
    );
};

export default DailyFeedPlanReport;