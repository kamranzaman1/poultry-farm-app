// Fix: Defining and exporting all necessary types for the application.

export type User = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: 'Admin' | 'Site Manager' | 'Supervisor' | 'Leadman' | 'Gate Keeper';
  authorizedFarms: string[];
  contactNumber?: string;
};

export interface AuditInfo {
  updatedBy: string;
  updatedAt: string;
}

export interface CreationAuditInfo extends AuditInfo {
  createdBy: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  sN: number;
  gumboot: string;
  uniform: string;
  jacket: string;
  cost: string;
  compNo: string;
  sapNo: string;
  name: string;
  designation: string;
  sponsor: string;
  grade: string;
  nationality: string;
  joiningDate: string;
  farmNo: string;
  area: string;
  iqamaNo: string;
  iqamaExpiry: string;
  passportNo: string;
  passportExpiry: string;
  religion: string;
  mobileNo: string;
  vacationStartDate?: string;
  vacationEndDate?: string;
  resumingDate?: string;
  isArchived?: boolean;
  meta?: CreationAuditInfo;
}

export interface HouseData {
  mortality: string;
  culls: string;
  dayWater: string;
  nightWater: string;
  minTemp: string;
  maxTemp: string;
}

export interface FarmDailyData {
  houses: HouseData[];
}

export interface DailyReport extends FarmDailyData {
  date: string;
  meta?: AuditInfo;
}

export interface AllFarmsData {
  [farmName: string]: DailyReport[];
}

export interface FeedOrderItem {
  houseNo: number;
  deliveryDate: string;
  age: string;
  feedType: string;
  quantity: string;
  stoNo?: string;
}

export interface FeedOrderData {
  orderDate: string;
  deliveryDate: string;
  feedMillNo: string;
  items: FeedOrderItem[];
  remarks: string;
  priority: 'Normal' | 'Emergency';
}

export interface AllFarmsFeedOrders {
  [farmName: string]: FeedOrderData;
}

export interface SubmittedFeedOrder extends FeedOrderData {
  id: string;
  farmName: string;
  status: 'Submitted' | 'Delivered';
  cycleId: string;
  actualDeliveryDate?: string;
  deliveredQuantities?: FeedDeliveryRecordData;
  meta?: CreationAuditInfo;
}

export interface ChicksReceivingHouseData {
  placementDate: string;
  noOfBox: string;
  perBoxChicks: string;
  extraChicks: string;
  doa: string;
  zeroDayWeight: string;
  uniformityPercent: string;
  grossChicksPlaced: string;
  netChicksPlaced: string;
  breed: string;
  flock: string;
  flockNo: string;
  flockAge: string;
  hatcheryNo: string;
  productionOrderNo: string;
  productionLine: string;
  trialOrControl: 'Trial' | 'Control' | '';
}

export interface ChicksReceivingData {
  cycleId: string;
  cropNo: string;
  cycleNo: string;
  houses: ChicksReceivingHouseData[];
  meta?: AuditInfo;
}

export interface AllFarmsChicksReceivingData {
  [farmName: string]: ChicksReceivingData[];
}

export interface WeeklyWeightHouseData {
  breed: string;
  flock: string;
  fourDays: { standard: string; actual: string };
  sevenDays: { standard: string; actual: string };
  fourteenDays: { standard: string; actual: string };
  twentyOneDays: { standard: string; actual: string };
}

export interface WeeklyWeightData {
  cycleId: string;
  cropNo: string;
  cycleNo: string;
  houses: WeeklyWeightHouseData[];
  meta?: AuditInfo;
}

export interface AllFarmsWeeklyWeightData {
  [farmName: string]: WeeklyWeightData[];
}

export interface FeedDeliveryHouseRecord {
  starter: string;
  growerCR: string;
  growerPL: string;
  finisher: string;
}

export interface FeedDeliveryRecordData {
  houses: FeedDeliveryHouseRecord[];
}

export interface FeedDeliveryRecord extends FeedDeliveryRecordData {
  date: string;
  cycleId?: string;
  meta?: AuditInfo;
}

export interface AllFarmsFeedDeliveryData {
  [farmName: string]: FeedDeliveryRecord[];
}

export interface CatchingDetailsHouseData {
  electricCounter: string;
  catchCulls: string;
  doa: string;
  catchLoss: string;
  scaleWtP: string;
}

export interface CatchingDetailsData {
  cycleId: string;
  houses: CatchingDetailsHouseData[];
  meta?: AuditInfo;
}

export interface AllFarmsCatchingDetailsData {
  [farmName: string]: CatchingDetailsData[];
}


export interface DieselOrder {
  id: string;
  farmName: string;
  quantity: string;
  requiredDate: string;
  status: 'Pending' | 'Completed';
  tankType?: 'Generator' | 'Farm';
  receivedDate?: string;
  reservationNumber?: string;
  requesterName: string;
  requesterContact?: string;
  meta?: CreationAuditInfo;
}

export interface SepticTankRequest {
  id: string;
  farmName: string;
  department: string;
  requestedBy: string;
  requesterContact?: string;
  requestDate: string;
  trips: string;
  status: 'Pending' | 'Completed';
  submittedAt: string;
  meta?: CreationAuditInfo;
}


export interface Cycle {
  id: string;
  cycleNo: string;
  farms: {
    farmName: string;
    cropNo: string;
    startDate: string;
    finishDate?: string;
    meta?: CreationAuditInfo;
  }[];
}

export interface SelectedFarmCycleDetails {
  cycleId: string;
  cycleNo: string;
  farmName: string;
  cropNo: string;
  startDate: string;
  finishDate?: string;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  timestamp: string;
  targetRoles?: ('Admin' | 'Site Manager' | 'Supervisor' | 'Leadman')[];
  targetFarms?: string[];
}

export interface BroilerPerformanceDataRow {
  houseNo: number;
  flockNo: string;
  flockAge: number;
  breed: string;
  chickPlaced: number;
  totalMortality: number;
  deviation: number;
  livabilityP: number;
  catchingAge: number;
  totalFeed: number;
  electricCounter: string;
  catchCulls: string;
  doa: string;
  catchLoss: string;
  scaleWtP: string;
  avgLiveWtP: number;
  livabilityB: number;
  scaleWtB: string;
  avgLiveWtB: number;
  fcrB: number;
  prodNoB: number;
}

export interface SalmonellaHouseStatus {
  hasSalmonella: boolean;
}

export interface SalmonellaData {
  cycleId: string;
  houses: SalmonellaHouseStatus[];
  meta?: AuditInfo;
}

export interface AllFarmsSalmonellaData {
  [farmName: string]: SalmonellaData[];
}

export interface CatchingProgramEntry {
  id: string; // Unique ID for each entry, e.g., a timestamp
  farmName: string;
  houseNo: number;
  catchingDate: string;
  expectedBirds: string;
  projectedWt: string;
  cycleId: string;
  meta?: AuditInfo;
}

export interface ChicksGradingHouseData {
  gradeA: string;
  gradeB: string;
  gradeC: string;
}

export interface ChicksGradingData {
  cycleId: string;
  houses: ChicksGradingHouseData[];
  meta?: AuditInfo;
}

export interface AllFarmsChicksGradingData {
  [farmName: string]: ChicksGradingData[];
}

export interface LeaveRequest {
  id: string;
  userId: string;
  username: string;
  leaveType: 'Annual Leave' | 'Sick Leave' | 'Emergency Leave' | 'Day In Lieu';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface FeedBulkerRecord {
  id: string;
  date: string;
  farm: string;
  farmAge: string;
  typeOfFeed: string;
  driverName: string;
  truckPlateNo: string;
  sideNo: string;
  bulkerNo: string;
  entryTime: string;
  exitTime: string;
  meta?: CreationAuditInfo;
}

export interface VehicleMovementLog {
  id: string;
  date: string;
  department: string;
  vehicleType: 'Car / P-ups / SUV' | 'Trucks' | 'Trailers (Feed bulkers, diesel tanker,..)' | 'Bus / Coasters' | 'Scooter / Cycles' | 'Others 1';
  direction: 'In' | 'Out';
  timestamp: string;
  meta?: CreationAuditInfo;
}

export interface InChargeTimeLog {
  id: string;
  date: string;
  inchargeId: string;
  inchargeName: string;
  inTime: string;
  outTime: string;
  meta?: CreationAuditInfo;
}
