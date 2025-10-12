import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Label } from 'recharts';
import type { DailyReport } from '../types';

interface WeeklyWaterConsumptionReportProps {
    farmName: string;
    dailyReports: DailyReport[];
    onBack: () => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const formatDate = (dateStr: string) => {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  // Use .replace to create date in local timezone, avoiding UTC conversion issues
  return new Date(dateStr.replace(/-/g, '/')).toLocaleDateString('en-GB', options);
}

const WeeklyWaterConsumptionReport: React.FC<WeeklyWaterConsumptionReportProps> = ({ farmName, dailyReports, onBack }) => {

    const chartData = useMemo(() => {
        // Daily reports are already sorted by date. Get the last 7 available.
        const lastSevenReports = dailyReports.slice(-7);

        return lastSevenReports.map(report => {
            const totals = report.houses.reduce((acc, house) => {
                acc.dayWater += parseFloat(house.dayWater) || 0;
                acc.nightWater += parseFloat(house.nightWater) || 0;
                return acc;
            }, { dayWater: 0, nightWater: 0 });
            
            return {
                date: formatDate(report.date),
                rawDate: report.date,
                ...totals,
            };
        });
    }, [dailyReports]);
    
    const handleExportCSV = () => {
        const headers = ['Date', 'Day Water (Liters)', 'Night Water (Liters)', 'Total Water (Liters)'];
        const rows = chartData.map(item => [
            item.rawDate,
            item.dayWater.toFixed(2),
            item.nightWater.toFixed(2),
            (item.dayWater + item.nightWater).toFixed(2),
        ].join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `WeeklyWaterConsumption_${farmName.replace('/','-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b pb-4">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                        <BackArrowIcon />
                    </button>
                    <h3 className="text-xl font-semibold text-gray-800">Weekly Water Consumption for {farmName}</h3>
                </div>
                <button onClick={handleExportCSV} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors self-start sm:self-center">
                    Export CSV
                </button>
            </div>

            {chartData.length < 1 ? (
                <p className="text-gray-500 text-sm py-4 text-center">Not enough data to display the report. Please enter at least one daily report.</p>
            ) : (
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <BarChart
                            data={chartData}
                            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                            aria-label={`Bar chart showing daily water consumption for farm ${farmName} over the last seven reporting days.`}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis>
                                <Label value="Consumption (Liters)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                            </YAxis>
                            <Tooltip
                                formatter={(value: number) => `${value.toLocaleString()} L`}
                                cursor={{fill: 'rgba(206, 212, 218, 0.4)'}}
                            />
                            <Legend />
                            <Bar dataKey="dayWater" name="Day Water" fill="#3b82f6" />
                            <Bar dataKey="nightWater" name="Night Water" fill="#14b8a6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default WeeklyWaterConsumptionReport;