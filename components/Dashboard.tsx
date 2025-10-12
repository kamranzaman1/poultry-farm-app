
import React, { useState, useEffect, useMemo, useRef } from 'react';
// FIX: Added SepticTankRequest to the import list.
import type { DailyReport, DieselOrder, FeedOrderData, User, ChicksReceivingData, FarmDailyData, AllFarmsData, AllFarmsChicksReceivingData, SubmittedFeedOrder, WeeklyWeightData, FeedDeliveryRecord, FeedDeliveryRecordData, Cycle, SelectedFarmCycleDetails, Notification, AllFarmsWeeklyWeightData, AllFarmsFeedDeliveryData, CatchingDetailsData, AllFarmsCatchingDetailsData, SalmonellaData, AllFarmsSalmonellaData, CatchingProgramEntry, Employee, LeaveRequest, AllFarmsChicksGradingData, ChicksGradingData, SepticTankRequest } from '../types';
import DailyReportForm from './DailyReportForm';
import DieselOrderForm from './DieselOrderForm';
import DieselOrdersList from './DieselOrdersList';
import FeedOrderForm from './FeedOrderForm';
import ChicksReceivingForm from './ChicksReceivingForm';
import WeeklyWeightForm from './WeeklyWeightForm';
import CatchingDetailsForm from './CatchingDetailsForm';
import DieselConsumptionReport from './DieselConsumptionReport';
import DieselOrderHistory from './DieselOrderHistory';
import FarmLogo from './FarmLogo';
import WeeklyMortalityReport from './WeeklyMortalityReport';
import DailyMortalityCrossFarmReport from './DailyMortalityCrossFarmReport';
import SubmittedFeedOrdersList from './SubmittedFeedOrdersList';
import FeedConsumptionReport from './FeedConsumptionReport';
import DashboardButton from './DashboardButton';
import SepticTankRequestForm from './SepticTankRequestForm';
import WeeklyWaterConsumptionReport from './WeeklyWaterConsumptionReport';
import UserManagement from './UserManagement';
import FeedDeliveryRecordForm from './FeedDeliveryRecordForm';
import CycleManagementForm from './CycleManagementForm';
import DataManagement from './DataManagement';
import BroilerPerformanceReport from './BroilerPerformanceReport';
import SalmonellaReportForm from './SalmonellaReportForm';
import CatchingProgramForm from './CatchingProgramForm';
import TrialAndControlReport from './TrialAndControlReport';
import CrossFarmMortalityChart from './CrossFarmMortalityChart';
import ChicksGradingForm from './ChicksGradingForm';
import LeaveManagement from './LeaveManagement';
import ManpowerManagement from './ManpowerManagement';
import ManpowerSummary from './ManpowerSummary';
import DailyFeedPlanReport from './DailyFeedPlanReport';
import SepticTankRequestsList from './SepticTankRequestsList';


const LogOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
);

const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
);

// Icons for Dashboard Buttons
const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);
const FeatherIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>
);
const BoxIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
);
const GasCanisterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"></path><path d="M4 14v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"></path><path d="M4 11h16"></path><path d="M5 14h.01"></path><path d="M19 14h.01"></path><path d="M8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3"></path></svg>
);
const ChartBarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20V16"/></svg>
);
const ClipboardListIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
);
const ClipboardCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="m9 14 2 2 4-4"/></svg>
);
const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
);
const SepticTruckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 6L5 6"/><path d="M10 10L5 10"/><path d="M10 14L5 14"/><path d="M10 18L5 18"/><path d="m18 12 4 0"/><path d="m18 18 4 0"/><path d="M14 6h8v12h-8z"/><path d="M5 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M17 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>
);
const WaterDropIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
);
const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const ScaleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M3 7l6 6"/><path d="M12 21V7"/><path d="m5 12 5-5"/><path d="M16 3.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M21 7l-6 6"/></svg>
);
const TruckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
);
const CycleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12c0-2.2-1.8-4-4-4s-4 1.8-4 4 1.8 4 4 4"/><path d="M20 12h2"/><path d="M12 20v2"/><path d="m4.9 19.1 1.4-1.4"/><path d="M4 12H2"/><path d="m4.9 4.9 1.4 1.4"/><path d="M12 4V2"/><path d="m19.1 4.9-1.4 1.4"/><path d="M16 12c0 2.2 1.8 4 4 4s4-1.8 4-4-1.8-4-4-4"/><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
);
const DatabaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
);
const BiohazardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 12a4.15 4.15 0 0 1-3.5-2"/><path d="M12 12a4.15 4.15 0 0 0-3.5-2"/><path d="M12 12a4.15 4.15 0 0 1 3.5-2"/><path d="M12 12a4.15 4.15 0 0 0 3.5-2"/><path d="M12 12a4.15 4.15 0 0 1-3.5 2"/><path d="M12 12a4.15 4.15 0 0 0-3.5 2"/><path d="M12 12a4.15 4.15 0 0 1 3.5 2"/><path d="M12 12a4.15 4.15 0 0 0 3.5 2"/></svg>
);
const ClipboardPlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M12 11v6"/><path d="M9 14h6"/></svg>
);
const BeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.2 2.2c-.3.2-.5.5-.6.9l-3 9c-.1.3-.1.6 0 .9.1.3.3.6.5.8.2.2.5.4.8.5l9 3c.3.1.6.1.9 0 .3-.1.6-.3.8-.5.2-.2.4-.5.5-.8.1-.3.1-.6 0-.9l-3-9c-.1-.3-.3-.6-.5-.8-.2-.2-.5-.4-.8-.5-.3-.1-.6-.1-.9 0l-9 3z"/><path d="m13.2 13.2 4.6 4.6"/><path d="M10.8 7.8 7 4"/></svg>
);
const BriefcaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
);
const FileTextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);
const ActivityIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);
const PercentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>
);


interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
  farms: string[];
  selectedFarm: string;
  onSelectFarm: (farm: string) => void;
  cyclesForSelectedFarm: Cycle[];
  selectedCycleId: string | null;
  onSelectCycle: (cycleId: string) => void;
  dailyReports: DailyReport[];
  feedOrderData: FeedOrderData;
  chicksReceivingData: ChicksReceivingData;
  weeklyWeightData: WeeklyWeightData;
  chicksGradingData: ChicksGradingData;
  feedDeliveryRecords: FeedDeliveryRecord[];
  catchingDetailsData: CatchingDetailsData;
  salmonellaData: SalmonellaData;
  catchingProgramEntries: CatchingProgramEntry[];
  dieselOrders: DieselOrder[];
  submittedFeedOrders: SubmittedFeedOrder[];
  cycles: Cycle[];
  activeCycle: Cycle | null;
  selectedFarmCycleDetails: SelectedFarmCycleDetails | null;
  notifications: Notification[];
  leaveRequests: LeaveRequest[];
  septicTankRequests: SepticTankRequest[];
  employees: Employee[];
  editingFeedOrderId: string | null;
  onMarkNotificationsAsRead: () => void;
  onStartNewCycle: (cycleData: Omit<Cycle, 'id'>) => void;
  onUpdateFarmCycleDetails: (cycleId: string, farmName: string, details: { cropNo: string; startDate: string }) => void;
  onFinishFarmCycle: (cycleId: string, farmName: string, finishDate: string) => void;
  onReopenFarmCycle: (cycleId: string, farmName: string) => void;
  onVerifyAdminPassword: (password: string) => boolean;
  onUpdateData: (farmName: string, date: string, data: FarmDailyData) => void;
  onBulkUpdateDailyReports: (farmName: string, updates: { [date: string]: FarmDailyData }) => void;
  onAddSubmittedFeedOrder: (farmName: string, data: FeedOrderData) => void;
  onUpdateSubmittedFeedOrder: (orderId: string, farmName: string, data: FeedOrderData) => void;
  onStartEditingFeedOrder: (order: SubmittedFeedOrder) => void;
  onCancelEditingFeedOrder: () => void;
  onConfirmFeedDelivery: (orderId: string, actualDeliveryDate: string, deliveryData: FeedDeliveryRecordData) => void;
  onUpdateConfirmedFeedDelivery: (orderId: string, actualDeliveryDate: string, deliveryData: FeedDeliveryRecordData) => void;
  onUpdateChicksReceiving: (farmName: string, data: ChicksReceivingData) => void;
  onUpdateWeeklyWeight: (farmName: string, data: WeeklyWeightData) => void;
  onUpdateChicksGrading: (farmName: string, data: ChicksGradingData) => void;
  onUpdateCatchingDetails: (farmName: string, data: CatchingDetailsData) => void;
  onUpdateSalmonella: (farmName: string, data: SalmonellaData) => void;
  onUpdateCatchingProgramEntries: (entries: CatchingProgramEntry[]) => void;
  onAddDieselOrder: (order: Omit<DieselOrder, 'id' | 'status'>) => void;
  onUpdateDieselOrderStatus: (orderId: string, status: 'Completed', receivedDate: string) => void;
  onAddDieselOrderReservation: (orderId: string, reservationNumber: string) => void;
  onAddLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'status' | 'requestedAt' | 'userId' | 'username'>) => void;
  onUpdateLeaveRequestStatus: (requestId: string, status: 'Approved' | 'Rejected', rejectionReason?: string) => void;
  onAddSepticTankRequest: (request: Omit<SepticTankRequest, 'id' | 'status' | 'submittedAt'>) => void;
  onUpdateSepticTankRequestStatus: (requestId: string, status: 'Completed') => void;
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onBulkDeleteEmployees: (employeeIds: string[]) => void;
  onBulkImportEmployees: (csvData: string) => Promise<{ success: boolean; message: string }>;
  allAuthorizedFarmsData: AllFarmsData;
  allAuthorizedFarmsChicksReceivingData: AllFarmsChicksReceivingData;
  allAuthorizedFarmsWeeklyWeightData: AllFarmsWeeklyWeightData;
  allAuthorizedFarmsChicksGradingData: AllFarmsChicksGradingData;
  allAuthorizedFarmsFeedDeliveryData: AllFarmsFeedDeliveryData;
  allAuthorizedFarmsCatchingDetailsData: AllFarmsCatchingDetailsData;
  allAuthorizedFarmsSalmonellaData: AllFarmsSalmonellaData;
  users: User[];
  onAddUser: (newUser: Omit<User, 'id'>) => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (userId: string) => void;
  onExportData: () => void;
  onImportData: (data: string) => Promise<boolean>;
  onBulkImportChicksReceiving: (csvData: string) => Promise<{ success: boolean; message: string }>;
  onToggleMaintenanceMode: (password: string) => { success: boolean, message: string };
}

type View = 
  | 'home'
  | 'dailyReport'
  | 'feedOrder'
  | 'chicksReceiving'
  | 'weeklyWeight'
  | 'chicksGrading'
  | 'catchingDetails'
  | 'salmonellaReport'
  | 'catchingProgram'
  | 'dieselOrder'
  | 'septicTankRequest'
  | 'septicTankRequestsList'
  | 'feedDeliveryRecord'
  | 'weeklyMortality'
  | 'dieselOrdersList'
  | 'feedOrdersList'
  | 'dailyFeedPlan'
  | 'dieselConsumption'
  | 'feedConsumption'
  | 'dieselHistory'
  | 'waterConsumption'
  | 'userManagement'
  | 'cycleManagement'
  | 'dataManagement'
  | 'broilerPerformance'
  | 'trialAndControlReport'
  | 'leaveManagement'
  | 'manpowerManagement'
  | 'manpowerSummary';

const Dashboard: React.FC<DashboardProps> = (props) => {
  const [activeView, setActiveView] = useState<View>('home');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const returnHashRef = useRef<string>('');
  
  const { 
    currentUser, onLogout, farms, selectedFarm, onSelectFarm, cyclesForSelectedFarm, selectedCycleId, onSelectCycle,
    dailyReports, feedOrderData, chicksReceivingData, weeklyWeightData, chicksGradingData, feedDeliveryRecords,
    catchingDetailsData, salmonellaData, catchingProgramEntries, dieselOrders, submittedFeedOrders, cycles, activeCycle,
    selectedFarmCycleDetails, notifications, leaveRequests, septicTankRequests, employees, editingFeedOrderId, onMarkNotificationsAsRead, 
    onStartNewCycle, onUpdateFarmCycleDetails, onFinishFarmCycle, onReopenFarmCycle, onVerifyAdminPassword, onUpdateData, onBulkUpdateDailyReports,
    onAddSubmittedFeedOrder, onUpdateSubmittedFeedOrder, onStartEditingFeedOrder, onCancelEditingFeedOrder,
    onConfirmFeedDelivery, onUpdateConfirmedFeedDelivery, onUpdateChicksReceiving, onUpdateWeeklyWeight,
    onUpdateChicksGrading, onUpdateCatchingDetails, onUpdateSalmonella, onUpdateCatchingProgramEntries,
    onAddDieselOrder, onUpdateDieselOrderStatus, onAddDieselOrderReservation,
    onAddLeaveRequest, onUpdateLeaveRequestStatus,
    onAddSepticTankRequest, onUpdateSepticTankRequestStatus,
    onAddEmployee, onUpdateEmployee, onDeleteEmployee, onBulkDeleteEmployees, onBulkImportEmployees,
    allAuthorizedFarmsData, allAuthorizedFarmsChicksReceivingData, allAuthorizedFarmsWeeklyWeightData,
    allAuthorizedFarmsChicksGradingData, allAuthorizedFarmsFeedDeliveryData, allAuthorizedFarmsCatchingDetailsData,
    allAuthorizedFarmsSalmonellaData, users, onAddUser, onUpdateUser, onDeleteUser, onExportData, onImportData,
    onBulkImportChicksReceiving, onToggleMaintenanceMode
  } = props;

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const selectedCycleCatchingProgramEntries = useMemo(() => {
    if (!selectedCycleId) return [];
    return catchingProgramEntries.filter(e => e.cycleId === selectedCycleId);
  }, [catchingProgramEntries, selectedCycleId]);

  const visibleSubmittedFeedOrders = useMemo(() => {
    if (!currentUser || !selectedCycleId) {
      return [];
    }
    return submittedFeedOrders.filter(order => 
      currentUser.authorizedFarms.includes(order.farmName) && order.cycleId === selectedCycleId
    );
  }, [submittedFeedOrders, currentUser, selectedCycleId]);

  const authorizedSubmittedFeedOrders = useMemo(() => {
    if (!currentUser) return [];
    return submittedFeedOrders.filter(order => currentUser.authorizedFarms.includes(order.farmName));
  }, [submittedFeedOrders, currentUser]);


  const handleNavigate = (view: View, hash: string) => {
    returnHashRef.current = hash;
    setActiveView(view);
    window.scrollTo(0, 0); // Scroll to top when showing a new form/report
  };

  const handleBackToHome = () => {
    const hash = returnHashRef.current;
    setActiveView('home');
    
    // Defer scrolling until after the 'home' view has rendered
    setTimeout(() => {
        if (hash) {
            const element = document.getElementById(hash);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 50); // Small delay to ensure render is complete
  };


  // When the selected farm changes (via dropdown), reset to the main dashboard view.
  useEffect(() => {
    setActiveView('home');
    returnHashRef.current = '';
  }, [selectedFarm, selectedCycleId]);

  const handleToggleNotifications = () => {
    setIsNotificationsOpen(prev => !prev);
    if (!isNotificationsOpen && unreadCount > 0) {
      // Mark as read when opening
      onMarkNotificationsAsRead();
    }
  };

  const handleEditOrder = (order: SubmittedFeedOrder) => {
    onStartEditingFeedOrder(order);
    if (selectedFarm !== order.farmName) {
        onSelectFarm(order.farmName);
    }
    handleNavigate('feedOrder', 'nav-feedOrdersList');
  };

  const handleUpdateAndNavigateBack = (orderId: string, farmName: string, data: FeedOrderData) => {
      onUpdateSubmittedFeedOrder(orderId, farmName, data);
      handleNavigate('feedOrdersList', 'nav-feedOrdersList');
  };

  const handleCancelEditAndNavigateBack = () => {
      onCancelEditingFeedOrder();
      handleBackToHome();
  };


  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-6">
            <div className="w-12 h-12 text-xl flex-shrink-0">
                <FarmLogo farmName={selectedFarm} />
            </div>
             <div className="flex items-end gap-6">
                <div>
                    <label htmlFor="farm-selector" className="text-sm font-medium text-gray-500">
                        Selected Farm
                    </label>
                    <select
                        id="farm-selector"
                        value={selectedFarm}
                        onChange={(e) => onSelectFarm(e.target.value)}
                        className="block w-full min-w-[150px] -mt-1 p-0 border-none focus:outline-none focus:ring-0 text-3xl font-bold text-gray-900 bg-transparent"
                    >
                        {farms.map((farm) => (
                        <option key={farm} value={farm}>
                            {farm}
                        </option>
                        ))}
                    </select>
                </div>
                 {cyclesForSelectedFarm.length > 0 && (
                    <div>
                        <label htmlFor="cycle-selector" className="text-sm font-medium text-gray-500">
                            Cycle No.
                        </label>
                        <select
                            id="cycle-selector"
                            value={selectedCycleId || ''}
                            onChange={(e) => onSelectCycle(e.target.value)}
                            className="block w-full min-w-[150px] -mt-1 p-0 border-none focus:outline-none focus:ring-0 text-3xl font-bold text-gray-900 bg-transparent"
                        >
                            {cyclesForSelectedFarm.map((cycle) => {
                                const farmDetails = cycle.farms.find(f => f.farmName === selectedFarm);
                                return (
                                    <option key={cycle.id} value={cycle.id}>
                                        {cycle.cycleNo} ({farmDetails?.cropNo})
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}
            </div>
        </div>
        <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={handleToggleNotifications}
                  className="p-2 rounded-full text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-colors"
                  aria-label={`Notifications (${unreadCount} unread)`}
                >
                  <BellIcon />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-20">
                    <div className="p-3 font-semibold text-gray-800 border-b">Notifications</div>
                    <ul className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(n => (
                          <li key={n.id} className="border-b last:border-b-0 p-3 text-sm text-gray-700 hover:bg-gray-50">
                            <p>{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                          </li>
                        ))
                      ) : (
                        <li className="p-3 text-sm text-gray-500 text-center">No new notifications.</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            <span className="text-gray-700 font-medium">Welcome, {currentUser.name}</span>
            <button
              onClick={onLogout}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              aria-label="Log out"
            >
              <LogOutIcon />
              Logout
            </button>
        </div>
      </header>

      <div>
          {activeView === 'home' && (
            <div className="space-y-8">
                <div id="data-entry" className="bg-white p-6 rounded-lg shadow-md scroll-mt-4">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-4">Data Entry & Service Forms</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <div id="nav-dailyReport">
                            <DashboardButton
                                title="Daily Farm Report"
                                description="Enter daily mortality, culls, water, and temperature data."
                                icon={<CalendarIcon />}
                                onClick={() => handleNavigate('dailyReport', 'nav-dailyReport')}
                                colorClasses={{ bg: 'bg-blue-100', text: 'text-blue-800', hoverBg: 'hover:bg-blue-200' }}
                            />
                        </div>
                        <div id="nav-chicksReceiving">
                            <DashboardButton
                                title="Chicks Receiving"
                                description="Record details of new chick placements for each house."
                                icon={<FeatherIcon />}
                                onClick={() => handleNavigate('chicksReceiving', 'nav-chicksReceiving')}
                                colorClasses={{ bg: 'bg-green-100', text: 'text-green-800', hoverBg: 'hover:bg-green-200' }}
                            />
                        </div>
                        <div id="nav-chicksGrading">
                           <DashboardButton
                                title="Chicks Grading"
                                description="Record chicks grading sample results for each house."
                                icon={<PercentIcon />}
                                onClick={() => handleNavigate('chicksGrading', 'nav-chicksGrading')}
                                colorClasses={{ bg: 'bg-yellow-100', text: 'text-yellow-800', hoverBg: 'hover:bg-yellow-200' }}
                           />
                        </div>
                        <div id="nav-weeklyWeight">
                            <DashboardButton
                                title="Weekly Weight Entry"
                                description="Record weekly average weight and daily gain for each house."
                                icon={<ScaleIcon />}
                                onClick={() => handleNavigate('weeklyWeight', 'nav-weeklyWeight')}
                                colorClasses={{ bg: 'bg-pink-100', text: 'text-pink-800', hoverBg: 'hover:bg-pink-200' }}
                            />
                        </div>
                        <div id="nav-catchingDetails">
                            <DashboardButton
                                title="Catching Details"
                                description="Enter final catching data after the cycle is finished."
                                icon={<ClipboardCheckIcon />}
                                onClick={() => handleNavigate('catchingDetails', 'nav-catchingDetails')}
                                colorClasses={{ bg: 'bg-cyan-100', text: 'text-cyan-800', hoverBg: 'hover:bg-cyan-200' }}
                            />
                        </div>
                        <div id="nav-feedOrder">
                            <DashboardButton
                                title="Feed Order Form"
                                description="Place new orders for feed delivery to the farm."
                                icon={<BoxIcon />}
                                onClick={() => handleNavigate('feedOrder', 'nav-feedOrder')}
                                colorClasses={{ bg: 'bg-yellow-100', text: 'text-yellow-800', hoverBg: 'hover:bg-yellow-200' }}
                            />
                        </div>
                        <div id="nav-feedDeliveryRecord">
                            <DashboardButton
                                title="Feed Delivery Record"
                                description="View records of daily feed deliveries for each house."
                                icon={<TruckIcon />}
                                onClick={() => handleNavigate('feedDeliveryRecord', 'nav-feedDeliveryRecord')}
                                colorClasses={{ bg: 'bg-orange-100', text: 'text-orange-800', hoverBg: 'hover:bg-orange-200' }}
                            />
                        </div>
                        <div id="nav-dieselOrder">
                            <DashboardButton
                                title="Diesel Order Request"
                                description="Request diesel for farm generators and tanks."
                                icon={<GasCanisterIcon />}
                                onClick={() => handleNavigate('dieselOrder', 'nav-dieselOrder')}
                                colorClasses={{ bg: 'bg-indigo-100', text: 'text-indigo-800', hoverBg: 'hover:bg-indigo-200' }}
                            />
                        </div>
                        <div id="nav-septicTankRequest">
                            <DashboardButton
                                title="Septic Tank Request"
                                description="Create and print a septic tank cleaning request form."
                                icon={<SepticTruckIcon />}
                                onClick={() => handleNavigate('septicTankRequest', 'nav-septicTankRequest')}
                                colorClasses={{ bg: 'bg-purple-100', text: 'text-purple-800', hoverBg: 'hover:bg-purple-200' }}
                            />
                        </div>
                        <div id="nav-salmonellaReport">
                            <DashboardButton
                                title="Salmonella Report"
                                description="Mark houses that have tested positive for Salmonella."
                                icon={<BiohazardIcon />}
                                onClick={() => handleNavigate('salmonellaReport', 'nav-salmonellaReport')}
                                colorClasses={{ bg: 'bg-red-100', text: 'text-red-800', hoverBg: 'hover:bg-red-200' }}
                            />
                        </div>
                         {currentUser.role === 'Admin' && (
                            <div id="nav-catchingProgram">
                                <DashboardButton
                                    title="Catching Program"
                                    description="Plan and record the catching schedule for all farms."
                                    icon={<ClipboardPlusIcon />}
                                    onClick={() => handleNavigate('catchingProgram', 'nav-catchingProgram')}
                                    colorClasses={{ bg: 'bg-teal-100', text: 'text-teal-800', hoverBg: 'hover:bg-teal-200' }}
                                />
                            </div>
                        )}
                    </div>
                </div>
                 <div id="hr-manpower" className="bg-white p-6 rounded-lg shadow-md scroll-mt-4">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-4">HR & Manpower</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <div id="nav-leaveManagement">
                            <DashboardButton
                                title="Leave Management"
                                description="Submit and review employee leave requests."
                                icon={<BriefcaseIcon />}
                                onClick={() => handleNavigate('leaveManagement', 'nav-leaveManagement')}
                                colorClasses={{ bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', hoverBg: 'hover:bg-fuchsia-200' }}
                            />
                        </div>
                        {currentUser.role === 'Admin' && (
                          <>
                            <div id="nav-manpowerManagement">
                                <DashboardButton
                                    title="Employee Directory"
                                    description="Manage employee information and personal details."
                                    icon={<UsersIcon />}
                                    onClick={() => handleNavigate('manpowerManagement', 'nav-manpowerManagement')}
                                    colorClasses={{ bg: 'bg-sky-100', text: 'text-sky-800', hoverBg: 'hover:bg-sky-200' }}
                                />
                            </div>
                            <div id="nav-manpowerSummary">
                                <DashboardButton
                                    title="Manpower Summary"
                                    description="View a summary of employees by area and farm."
                                    icon={<FileTextIcon />}
                                    onClick={() => handleNavigate('manpowerSummary', 'nav-manpowerSummary')}
                                    colorClasses={{ bg: 'bg-cyan-100', text: 'text-cyan-800', hoverBg: 'hover:bg-cyan-200' }}
                                />
                            </div>
                          </>
                        )}
                    </div>
                </div>
                <div id="reports-analytics" className="bg-white p-6 rounded-lg shadow-md scroll-mt-4">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-4">Reports & Analytics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <div id="nav-weeklyMortality">
                            <DashboardButton
                                title="Weekly Mortality"
                                description="Track weekly mortality and culls statistics per house."
                                icon={<ChartBarIcon />}
                                onClick={() => handleNavigate('weeklyMortality', 'nav-weeklyMortality')}
                                colorClasses={{ bg: 'bg-red-100', text: 'text-red-800', hoverBg: 'hover:bg-red-200' }}
                            />
                        </div>
                        {(currentUser.role === 'Admin' || currentUser.role === 'Supervisor') && (
                            <div id="nav-septicTankRequestsList">
                                <DashboardButton
                                    title="Septic Tank Mgt."
                                    description="View, print, and complete septic tank requests."
                                    icon={<SepticTruckIcon />}
                                    onClick={() => handleNavigate('septicTankRequestsList', 'nav-septicTankRequestsList')}
                                    colorClasses={{ bg: 'bg-purple-100', text: 'text-purple-800', hoverBg: 'hover:bg-purple-200' }}
                                />
                            </div>
                        )}
                        <div id="nav-dieselOrdersList">
                            <DashboardButton
                                title="Diesel Order Mgt."
                                description="View and manage recent diesel order requests."
                                icon={<ClipboardListIcon />}
                                onClick={() => handleNavigate('dieselOrdersList', 'nav-dieselOrdersList')}
                                colorClasses={{ bg: 'bg-gray-100', text: 'text-gray-800', hoverBg: 'hover:bg-gray-200' }}
                            />
                        </div>
                        <div id="nav-feedOrdersList">
                            <DashboardButton
                                title="Feed Order Mgt."
                                description="View and manage submitted feed order requests."
                                icon={<ClipboardListIcon />}
                                onClick={() => handleNavigate('feedOrdersList', 'nav-feedOrdersList')}
                                colorClasses={{ bg: 'bg-orange-100', text: 'text-orange-800', hoverBg: 'hover:bg-orange-200' }}
                            />
                        </div>
                        <div id="nav-dailyFeedPlan">
                           <DashboardButton
                                title="Daily Feed Plan"
                                description="View and print a consolidated feed delivery plan."
                                icon={<FileTextIcon />}
                                onClick={() => handleNavigate('dailyFeedPlan', 'nav-dailyFeedPlan')}
                                colorClasses={{ bg: 'bg-amber-100', text: 'text-amber-800', hoverBg: 'hover:bg-amber-200' }}
                           />
                        </div>
                        <div id="nav-dieselConsumption">
                            <DashboardButton
                                title="Diesel Consumption"
                                description="Analyze diesel consumption trends with date filters."
                                icon={<ChartBarIcon />}
                                onClick={() => handleNavigate('dieselConsumption', 'nav-dieselConsumption')}
                                colorClasses={{ bg: 'bg-slate-100', text: 'text-slate-800', hoverBg: 'hover:bg-slate-200' }}
                            />
                        </div>
                        <div id="nav-feedConsumption">
                            <DashboardButton
                                title="Feed Consumption"
                                description="Analyze feed consumption trends across farms."
                                icon={<ChartBarIcon />}
                                onClick={() => handleNavigate('feedConsumption', 'nav-feedConsumption')}
                                colorClasses={{ bg: 'bg-teal-100', text: 'text-teal-800', hoverBg: 'hover:bg-teal-200' }}
                            />
                        </div>
                        <div id="nav-waterConsumption">
                            <DashboardButton
                                title="Weekly Water Usage"
                                description="Visualize daily water consumption over the last week."
                                icon={<WaterDropIcon />}
                                onClick={() => handleNavigate('waterConsumption', 'nav-waterConsumption')}
                                colorClasses={{ bg: 'bg-sky-100', text: 'text-sky-800', hoverBg: 'hover:bg-sky-200' }}
                            />
                        </div>
                        <div id="nav-dieselHistory">
                            <DashboardButton
                                title="Diesel Order History"
                                description="Browse a complete history of all past diesel orders."
                                icon={<HistoryIcon />}
                                onClick={() => handleNavigate('dieselHistory', 'nav-dieselHistory')}
                                colorClasses={{ bg: 'bg-cyan-100', text: 'text-cyan-800', hoverBg: 'hover:bg-cyan-200' }}
                            />
                        </div>
                        {currentUser.role !== 'Leadman' && (
                             <div id="nav-trialAndControlReport">
                                <DashboardButton
                                    title="Trial & Control Report"
                                    description="Compare performance of trial vs. control houses across a cycle."
                                    icon={<BeakerIcon />}
                                    onClick={() => handleNavigate('trialAndControlReport', 'nav-trialAndControlReport')}
                                    colorClasses={{ bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', hoverBg: 'hover:bg-fuchsia-200' }}
                                />
                            </div>
                        )}
                        {currentUser.role === 'Admin' && (
                            <>
                                <div id="nav-broilerPerformance">
                                    <DashboardButton
                                        title="Broiler Performance"
                                        description="View end-of-cycle broiler performance report."
                                        icon={<ActivityIcon />}
                                        onClick={() => handleNavigate('broilerPerformance', 'nav-broilerPerformance')}
                                        colorClasses={{ bg: 'bg-lime-100', text: 'text-lime-800', hoverBg: 'hover:bg-lime-200' }}
                                    />
                                </div>
                                <div id="nav-cycleManagement">
                                    <DashboardButton
                                        title="Cycle Management"
                                        description="Start new farm cycles and manage crop numbers."
                                        icon={<CycleIcon />}
                                        onClick={() => handleNavigate('cycleManagement', 'nav-cycleManagement')}
                                        colorClasses={{ bg: 'bg-lime-100', text: 'text-lime-800', hoverBg: 'hover:bg-lime-200' }}
                                    />
                                </div>
                                <div id="nav-userManagement">
                                    <DashboardButton
                                        title="User Management"
                                        description="Create, edit, and manage user accounts and permissions."
                                        icon={<UsersIcon />}
                                        onClick={() => handleNavigate('userManagement', 'nav-userManagement')}
                                        colorClasses={{ bg: 'bg-gray-700', text: 'text-white', hoverBg: 'hover:bg-gray-800' }}
                                    />
                                </div>
                                <div id="nav-dataManagement">
                                    <DashboardButton
                                        title="Data Management"
                                        description="Export or import all application data for backup."
                                        icon={<DatabaseIcon />}
                                        onClick={() => handleNavigate('dataManagement', 'nav-dataManagement')}
                                        colorClasses={{ bg: 'bg-gray-700', text: 'text-white', hoverBg: 'hover:bg-gray-800' }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
                 {currentUser.role === 'Admin' && (
                    <div id="cross-farm-report" className="scroll-mt-4">
                        <DailyMortalityCrossFarmReport 
                          allFarmsData={allAuthorizedFarmsData}
                          allFarmsChicksReceivingData={allAuthorizedFarmsChicksReceivingData}
                          cycles={cycles}
                        />
                    </div>
                  )}
                {(currentUser.role === 'Admin' || currentUser.role === 'Supervisor') && (
                    <div id="cross-farm-mortality-graph" className="mt-8 bg-white p-6 rounded-lg shadow-md scroll-mt-4">
                        <CrossFarmMortalityChart allFarmsData={allAuthorizedFarmsData} cycles={cycles} />
                    </div>
                )}
            </div>
          )}

          {activeView === 'dailyReport' && (
            <DailyReportForm
                farmName={selectedFarm}
                dailyReports={dailyReports}
                onUpdate={onUpdateData}
                onBulkUpdate={onBulkUpdateDailyReports}
                onBack={handleBackToHome}
                selectedFarmCycleDetails={selectedFarmCycleDetails}
                chicksReceivingData={chicksReceivingData}
                currentUser={currentUser}
            />
          )}
          {activeView === 'chicksReceiving' && (
             <ChicksReceivingForm
                farmName={selectedFarm}
                initialData={chicksReceivingData}
                onUpdate={onUpdateChicksReceiving}
                currentUser={currentUser}
                selectedFarmCycleDetails={selectedFarmCycleDetails}
                onBack={handleBackToHome}
            />
          )}
           {activeView === 'chicksGrading' && (
             <ChicksGradingForm
                farmName={selectedFarm}
                initialData={chicksGradingData}
                onUpdate={onUpdateChicksGrading}
                onBack={handleBackToHome}
                selectedFarmCycleDetails={selectedFarmCycleDetails}
            />
          )}
          {activeView === 'weeklyWeight' && (
             <WeeklyWeightForm
                farmName={selectedFarm}
                initialData={weeklyWeightData}
                onUpdate={onUpdateWeeklyWeight}
                chicksReceivingData={chicksReceivingData}
                selectedFarmCycleDetails={selectedFarmCycleDetails}
                onBack={handleBackToHome}
            />
          )}
           {activeView === 'catchingDetails' && (
             <CatchingDetailsForm
                farmName={selectedFarm}
                initialData={catchingDetailsData}
                onUpdate={onUpdateCatchingDetails}
                cycles={cycles}
                onBack={handleBackToHome}
            />
          )}
          {activeView === 'salmonellaReport' && (
             <SalmonellaReportForm
                farmName={selectedFarm}
                initialData={salmonellaData}
                onUpdate={onUpdateSalmonella}
                selectedFarmCycleDetails={selectedFarmCycleDetails}
                onBack={handleBackToHome}
                currentUser={currentUser}
            />
          )}
          {activeView === 'catchingProgram' && (
             <CatchingProgramForm
                initialEntries={selectedCycleCatchingProgramEntries}
                onUpdate={onUpdateCatchingProgramEntries}
                allFarmsChicksReceivingData={allAuthorizedFarmsChicksReceivingData}
                allFarmsSalmonellaData={allAuthorizedFarmsSalmonellaData}
                allFarms={farms}
                cycles={cycles}
                activeCycle={activeCycle}
                selectedCycleId={selectedCycleId}
                onBack={handleBackToHome}
            />
          )}
          {activeView === 'feedOrder' && (
            <FeedOrderForm
                farmName={selectedFarm}
                initialData={feedOrderData}
                onAddSubmittedFeedOrder={onAddSubmittedFeedOrder}
                chicksReceivingData={chicksReceivingData}
                selectedFarmCycleDetails={selectedFarmCycleDetails}
                onBack={handleBackToHome}
                editingOrderId={editingFeedOrderId}
                onUpdateSubmittedFeedOrder={handleUpdateAndNavigateBack}
                onCancelEdit={handleCancelEditAndNavigateBack}
                currentUser={currentUser}
            />
          )}
          {activeView === 'feedDeliveryRecord' && (
            <FeedDeliveryRecordForm
                farmName={selectedFarm}
                feedDeliveryRecords={feedDeliveryRecords}
                selectedFarmCycleDetails={selectedFarmCycleDetails}
                onBack={handleBackToHome}
                currentUser={currentUser}
            />
          )}
          {activeView === 'dieselOrder' && (
            <DieselOrderForm
                farmName={selectedFarm}
                onAddOrder={onAddDieselOrder}
                selectedFarmCycleDetails={selectedFarmCycleDetails}
                onBack={handleBackToHome}
                currentUser={currentUser}
            />
          )}
          {activeView === 'septicTankRequest' && (
            <SepticTankRequestForm
                onBack={handleBackToHome}
                selectedFarmCycleDetails={selectedFarmCycleDetails}
                currentUser={currentUser}
                onAddRequest={onAddSepticTankRequest}
            />
          )}
           {activeView === 'leaveManagement' && (
             <LeaveManagement
                currentUser={currentUser}
                allUsers={users}
                leaveRequests={leaveRequests}
                onAddLeaveRequest={onAddLeaveRequest}
                onUpdateLeaveRequestStatus={onUpdateLeaveRequestStatus}
                onBack={handleBackToHome}
             />
           )}
           {activeView === 'manpowerManagement' && (
             <ManpowerManagement
                employees={employees}
                onBack={handleBackToHome}
                onAddEmployee={onAddEmployee}
                onUpdateEmployee={onUpdateEmployee}
                onDeleteEmployee={onDeleteEmployee}
                onBulkDeleteEmployees={onBulkDeleteEmployees}
                onBulkImportEmployees={onBulkImportEmployees}
             />
           )}
            {activeView === 'manpowerSummary' && (
             <ManpowerSummary
                employees={employees}
                onBack={handleBackToHome}
             />
           )}
          {activeView === 'weeklyMortality' && (
             <WeeklyMortalityReport
                farmName={selectedFarm}
                dailyReports={dailyReports}
                chicksReceivingData={chicksReceivingData}
                selectedFarmCycleDetails={selectedFarmCycleDetails}
                onBack={handleBackToHome}
            />
          )}
           {activeView === 'dieselOrdersList' && (
            <DieselOrdersList 
                orders={dieselOrders} 
                onUpdateStatus={onUpdateDieselOrderStatus} 
                currentUser={currentUser}
                onAddReservation={onAddDieselOrderReservation}
                onBack={handleBackToHome}
            />
           )}
           {activeView === 'septicTankRequestsList' && (
                <SepticTankRequestsList
                    requests={septicTankRequests}
                    onUpdateStatus={onUpdateSepticTankRequestStatus}
                    onBack={handleBackToHome}
                    currentUser={currentUser}
                />
            )}
            {activeView === 'feedOrdersList' && (
             <SubmittedFeedOrdersList
                orders={visibleSubmittedFeedOrders}
                onConfirmFeedDelivery={onConfirmFeedDelivery}
                onUpdateConfirmedFeedDelivery={onUpdateConfirmedFeedDelivery}
                currentUser={currentUser}
                onBack={handleBackToHome}
                onEdit={handleEditOrder}
            />
           )}
           {activeView === 'dailyFeedPlan' && (
            <DailyFeedPlanReport
                submittedFeedOrders={authorizedSubmittedFeedOrders}
                cycles={cycles}
                allFarmsChicksReceivingData={allAuthorizedFarmsChicksReceivingData}
                onBack={handleBackToHome}
            />
           )}
           {activeView === 'dieselConsumption' && (
            <DieselConsumptionReport 
              orders={dieselOrders} 
              onBack={handleBackToHome} 
            />
           )}
           {activeView === 'feedConsumption' && (
            <FeedConsumptionReport 
              orders={submittedFeedOrders} 
              onBack={handleBackToHome}
            />
           )}
           {activeView === 'dieselHistory' && (
             <DieselOrderHistory 
              orders={dieselOrders} 
              onBack={handleBackToHome}
            />
           )}
           {activeView === 'waterConsumption' && (
             <WeeklyWaterConsumptionReport
                farmName={selectedFarm}
                dailyReports={dailyReports}
                onBack={handleBackToHome}
             />
           )}
           {activeView === 'userManagement' && (
             <UserManagement
                users={users}
                onAddUser={onAddUser}
                onUpdateUser={onUpdateUser}
                onDeleteUser={onDeleteUser}
                onBack={handleBackToHome}
             />
           )}
           {activeView === 'cycleManagement' && (
                <CycleManagementForm
                    cycles={cycles}
                    activeCycle={activeCycle}
                    currentUser={currentUser}
                    onStartNewCycle={onStartNewCycle}
                    onUpdateFarmCycleDetails={onUpdateFarmCycleDetails}
                    onFinishFarmCycle={onFinishFarmCycle}
                    onReopenFarmCycle={onReopenFarmCycle}
                    onVerifyAdminPassword={onVerifyAdminPassword}
                    onBack={handleBackToHome}
                />
            )}
            {activeView === 'dataManagement' && (
                <DataManagement
                    onBack={handleBackToHome}
                    onExportData={onExportData}
                    onImportData={onImportData}
                    onBulkImportChicksReceiving={onBulkImportChicksReceiving}
                    onToggleMaintenanceMode={onToggleMaintenanceMode}
                />
            )}
            {activeView === 'broilerPerformance' && (
                <BroilerPerformanceReport
                    selectedFarm={selectedFarm}
                    cycles={cycles}
                    allFarmsData={allAuthorizedFarmsData}
                    allFarmsChicksReceivingData={allAuthorizedFarmsChicksReceivingData}
                    allFarmsWeeklyWeightData={allAuthorizedFarmsWeeklyWeightData}
                    allFarmsFeedDeliveryData={allAuthorizedFarmsFeedDeliveryData}
                    allFarmsCatchingDetailsData={allAuthorizedFarmsCatchingDetailsData}
                    onBack={handleBackToHome}
                />
            )}
            {activeView === 'trialAndControlReport' && (
                <TrialAndControlReport
                    cycles={cycles}
                    allFarmsData={allAuthorizedFarmsData}
                    allFarmsChicksReceivingData={allAuthorizedFarmsChicksReceivingData}
                    allFarmsWeeklyWeightData={allAuthorizedFarmsWeeklyWeightData}
                    allFarmsFeedDeliveryData={allAuthorizedFarmsFeedDeliveryData}
                    allFarmsCatchingDetailsData={allAuthorizedFarmsCatchingDetailsData}
                    onBack={handleBackToHome}
                />
            )}
      </div>
    </div>
  );
};

export default Dashboard;
