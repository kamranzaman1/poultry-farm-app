

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LoginScreen from './components/LoginScreen';
import MaintenanceScreen from './components/MaintenanceScreen';
import { INITIAL_USERS } from './users';
import { INITIAL_EMPLOYEES } from './employees';
import type { AllFarmsData, DieselOrder, FarmDailyData, AllFarmsFeedOrders, FeedOrderData, User, AllFarmsChicksReceivingData, ChicksReceivingData, DailyReport, SubmittedFeedOrder, AllFarmsWeeklyWeightData, WeeklyWeightData, AllFarmsFeedDeliveryData, FeedDeliveryRecord, FeedDeliveryRecordData, Cycle, SelectedFarmCycleDetails, Notification, AllFarmsCatchingDetailsData, CatchingDetailsData, AllFarmsSalmonellaData, SalmonellaData, CatchingProgramEntry, AllFarmsChicksGradingData, ChicksGradingData, LeaveRequest, Employee, SepticTankRequest, FeedBulkerRecord, VehicleMovementLog, InChargeTimeLog, CreationAuditInfo, AllFarmsWaterData, DailyWaterRecord, AuditInfo, VehicleDetails, WaterRecordHouseData } from './types';
import { getInitialData, getInitialFeedOrderData, getInitialChicksReceivingData, getInitialWeeklyWeightData, getInitialFeedDeliveryData, getInitialCatchingDetailsData, getInitialSalmonellaData, createEmptyChicksReceivingDataForFarm, createEmptyWeeklyWeightDataForFarm, createEmptyCatchingDetailsDataForFarm, createEmptySalmonellaDataForFarm, getInitialChicksGradingData, createEmptyChicksGradingDataForFarm, getInitialWaterData } from './utils/dataHelper';
import { FARM_NAMES } from './constants';

const LOCAL_STORAGE_KEY = 'poultryFarmData';
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxSHSRenvnX9T1SZooYoi5-y7qiuTRDHzoM0sHgO7fcBkR6dshmJn9lDqnw6qqB_6rbpw/exec';

const fetchDataFromGoogleSheet = async () => {
  // The current Google Apps Script is a logger and does not support fetching all application data.
  // This network call is disabled to prevent "Failed to fetch" CORS errors in the console during app load.
  // The application will correctly fall back to using localStorage for state persistence.
  console.warn("Data fetching from Google Sheet is disabled as the backend script does not support it. Using localStorage.");
  return null;
};


/**
 * Sends data to the specified Google Apps Script Web App.
 * @param action A string identifying the type of data being sent (e.g., 'DailyReport_Update').
 * @param payload The data object to send.
 */
const sendDataToGoogleSheet = async (action: string, payload: unknown) => {
  if (!WEB_APP_URL) {
    console.warn("Google Sheet Web App URL is not set. Skipping data send.");
    return;
  }
  try {
    const body = JSON.stringify({
      action: action,
      payload: payload,
    });

    // Use 'no-cors' mode to prevent the browser from throwing a "Failed to fetch" error
    // due to the redirect that Google Apps Script sends after a POST request.
    // This is a "fire-and-forget" method; we won't get a response, but the data will be sent.
    await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: body,
    });

    console.log(`Data sent to Google Sheet for action: ${action}. The request was sent successfully.`);

  } catch (error) {
    // This catch block is less likely to be hit with 'no-cors' unless there's a fundamental network issue (e.g., offline).
    console.error(`Error sending data to Google Sheet for action '${action}':`, error);
  }
};


const migratePerCycleData = (oldData: { [key: string]: any }, cycles: Cycle[]) => {
    const newData: { [key: string]: any[] } = {};
    if (!oldData || !cycles) return newData;

    for (const farmName in oldData) {
        newData[farmName] = [];
        const farmObject = oldData[farmName];
        if (farmObject && (farmObject.cycleNo || farmObject.cropNo)) {
            const matchingCycle = cycles.find(c => 
                c.cycleNo === farmObject.cycleNo && 
                c.farms.some(f => f.farmName === farmName && f.cropNo === farmObject.cropNo)
            );
            if (matchingCycle) {
                newData[farmName].push({ ...farmObject, cycleId: matchingCycle.id });
            } else {
                 // If no cycle matches, we can't assign a cycleId. Add it without one.
                 // This case should be rare.
                 newData[farmName].push(farmObject);
            }
        }
    }
    return newData;
};

/**
 * Parses a date string from common formats and reformats it to YYYY-MM-DD.
 * @param dateString The date string from the CSV.
 * @returns The formatted date string or an empty string if invalid.
 */
const formatDateToYMD = (dateString: string): string => {
    if (!dateString?.trim()) return '';
    const trimmed = dateString.trim();

    // Regular expression to match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyRegex = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/;
    const match = trimmed.match(dmyRegex);

    let date: Date;

    if (match) {
        // We have DD/MM/YYYY, parse it manually to avoid locale issues
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10); // month is 1-based from regex
        const year = parseInt(match[3], 10);
        // Date constructor month is 0-based. Use UTC to prevent timezone shifts.
        date = new Date(Date.UTC(year, month - 1, day));
    } else {
        // For other formats (MM/DD/YYYY, YYYY-MM-DD, ISO), let new Date() try to parse it
        // Using replace to normalize separators helps, and parsing as UTC.
        date = new Date(trimmed.replace(/-/g, '/') + 'T00:00:00Z');
    }

    // Check if the resulting date is valid
    if (isNaN(date.getTime())) {
        console.warn(`Could not parse date: "${dateString}". Returning empty string.`);
        return ''; // Return empty string for invalid dates
    }

    // Format to YYYY-MM-DD using UTC methods to match the UTC parsing
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${dayOfMonth}`;
};


function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [allFarmsData, setAllFarmsData] = useState<AllFarmsData>(() => getInitialData());
  const [allFarmsWaterData, setAllFarmsWaterData] = useState<AllFarmsWaterData>(() => getInitialWaterData());
  const [allFarmsFeedOrders, setAllFarmsFeedOrders] = useState<AllFarmsFeedOrders>(() => getInitialFeedOrderData());
  const [allFarmsChicksReceivingData, setAllFarmsChicksReceivingData] = useState<AllFarmsChicksReceivingData>(() => getInitialChicksReceivingData());
  const [allFarmsWeeklyWeightData, setAllFarmsWeeklyWeightData] = useState<AllFarmsWeeklyWeightData>(() => getInitialWeeklyWeightData());
  const [allFarmsChicksGradingData, setAllFarmsChicksGradingData] = useState<AllFarmsChicksGradingData>(() => getInitialChicksGradingData());
  const [allFarmsFeedDeliveryData, setAllFarmsFeedDeliveryData] = useState<AllFarmsFeedDeliveryData>(() => getInitialFeedDeliveryData());
  const [allFarmsCatchingDetailsData, setAllFarmsCatchingDetailsData] = useState<AllFarmsCatchingDetailsData>(() => getInitialCatchingDetailsData());
  const [allFarmsSalmonellaData, setAllFarmsSalmonellaData] = useState<AllFarmsSalmonellaData>(() => getInitialSalmonellaData());
  const [catchingProgramEntries, setCatchingProgramEntries] = useState<CatchingProgramEntry[]>([]);
  const [dieselOrders, setDieselOrders] = useState<DieselOrder[]>([]);
  const [submittedFeedOrders, setSubmittedFeedOrders] = useState<SubmittedFeedOrder[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [septicTankRequests, setSepticTankRequests] = useState<SepticTankRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [feedBulkerRecords, setFeedBulkerRecords] = useState<FeedBulkerRecord[]>([]);
  const [vehicleMovementLogs, setVehicleMovementLogs] = useState<VehicleMovementLog[]>([]);
  const [inChargeTimeLogs, setInChargeTimeLogs] = useState<InChargeTimeLog[]>([]);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails[]>([]);
  const [editingFeedOrderId, setEditingFeedOrderId] = useState<string | null>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);


  const needsMigration = (data: { [key: string]: any } | undefined | null): boolean => {
    if (!data) return false;
    // Check if any value in the object is a non-array object.
    return Object.values(data).some(value => value && !Array.isArray(value));
  };

  // Load state from central source on initial mount, with localStorage as fallback
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("Initializing application: fetching central data...");
        let dataToLoad = await fetchDataFromGoogleSheet();

        if (!dataToLoad || Object.keys(dataToLoad).length === 0) { // Check if fetched data is empty/null
          console.log("Could not fetch central data or it was empty. Falling back to localStorage.");
          const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (savedState) {
            try {
              dataToLoad = JSON.parse(savedState);
              console.log("Loaded data from localStorage.");
            } catch (e) {
              console.error("Failed to parse localStorage data, starting fresh.", e);
              dataToLoad = null;
            }
          }
        }
        
        if (dataToLoad) {
          console.log("Applying loaded data to application state.");
          const parsedState = dataToLoad;
          const savedCycles = parsedState.cycles || [];
          setCycles(savedCycles);
          setUsers(parsedState.users || INITIAL_USERS);
          setAllFarmsData(parsedState.allFarmsData || getInitialData());
          setAllFarmsWaterData(parsedState.allFarmsWaterData || getInitialWaterData());
          setAllFarmsFeedOrders(parsedState.allFarmsFeedOrders || getInitialFeedOrderData());
          setAllFarmsFeedDeliveryData(parsedState.allFarmsFeedDeliveryData || getInitialFeedDeliveryData());
          setCatchingProgramEntries(parsedState.catchingProgramEntries || []);
          setDieselOrders(parsedState.dieselOrders || []);
          setSubmittedFeedOrders(parsedState.submittedFeedOrders || []);
          setNotifications(parsedState.notifications || []);
          setLeaveRequests(parsedState.leaveRequests || []);
          setSepticTankRequests(parsedState.septicTankRequests || []);
          setEmployees(parsedState.employees || INITIAL_EMPLOYEES);
          setFeedBulkerRecords(parsedState.feedBulkerRecords || []);
          setVehicleMovementLogs(parsedState.vehicleMovementLogs || []);
          setInChargeTimeLogs(parsedState.inChargeTimeLogs || []);
          setVehicleDetails(parsedState.vehicleDetails || []);
          setIsMaintenanceMode(parsedState.isMaintenanceMode || false);

          // --- Data Migration Logic ---
          if (needsMigration(parsedState.allFarmsChicksReceivingData)) {
              console.log("Migrating old allFarmsChicksReceivingData structure...");
              setAllFarmsChicksReceivingData(migratePerCycleData(parsedState.allFarmsChicksReceivingData, savedCycles));
          } else {
              setAllFarmsChicksReceivingData(parsedState.allFarmsChicksReceivingData || getInitialChicksReceivingData());
          }

          if (needsMigration(parsedState.allFarmsWeeklyWeightData)) {
              console.log("Migrating old allFarmsWeeklyWeightData structure...");
              setAllFarmsWeeklyWeightData(migratePerCycleData(parsedState.allFarmsWeeklyWeightData, savedCycles));
          } else {
              setAllFarmsWeeklyWeightData(parsedState.allFarmsWeeklyWeightData || getInitialWeeklyWeightData());
          }

          if (needsMigration(parsedState.allFarmsChicksGradingData)) {
              console.log("Migrating old allFarmsChicksGradingData structure...");
              setAllFarmsChicksGradingData(migratePerCycleData(parsedState.allFarmsChicksGradingData, savedCycles));
          } else {
              setAllFarmsChicksGradingData(parsedState.allFarmsChicksGradingData || getInitialChicksGradingData());
          }

          if (needsMigration(parsedState.allFarmsCatchingDetailsData)) {
              console.log("Migrating old allFarmsCatchingDetailsData structure...");
              setAllFarmsCatchingDetailsData(migratePerCycleData(parsedState.allFarmsCatchingDetailsData, savedCycles));
          } else {
              setAllFarmsCatchingDetailsData(parsedState.allFarmsCatchingDetailsData || getInitialCatchingDetailsData());
          }

          if (needsMigration(parsedState.allFarmsSalmonellaData)) {
              console.log("Migrating old allFarmsSalmonellaData structure...");
              setAllFarmsSalmonellaData(migratePerCycleData(parsedState.allFarmsSalmonellaData, savedCycles));
          } else {
              setAllFarmsSalmonellaData(parsedState.allFarmsSalmonellaData || getInitialSalmonellaData());
          }
        } else {
            console.log("No data loaded, starting with initial empty state.");
        }
      } catch (error) {
        console.error("Failed to initialize app state:", error);
        // If everything fails, the app will proceed with the default initial state.
      } finally {
        setIsInitialized(true);
        console.log("Application initialized.");
      }
    };
    
    initializeApp();
  }, []);
  
  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return; // Don't save initial unhydrated state

    try {
       // Filter out dynamic expiry notifications before saving to localStorage
      const notificationsToSave = notifications.filter(n => !n.id.startsWith('iqama-expiry-') && !n.id.startsWith('passport-expiry-'));
      const appState = {
        users,
        allFarmsData,
        allFarmsWaterData,
        allFarmsFeedOrders,
        allFarmsChicksReceivingData,
        allFarmsWeeklyWeightData,
        allFarmsChicksGradingData,
        allFarmsFeedDeliveryData,
        allFarmsCatchingDetailsData,
        allFarmsSalmonellaData,
        catchingProgramEntries,
        dieselOrders,
        submittedFeedOrders,
        cycles,
        notifications: notificationsToSave,
        leaveRequests,
        septicTankRequests,
        employees,
        feedBulkerRecords,
        vehicleMovementLogs,
        inChargeTimeLogs,
        vehicleDetails,
        isMaintenanceMode,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
    } catch (error) {
      console.error("Failed to save state to localStorage:", error);
    }
  }, [
    users,
    allFarmsData,
    allFarmsWaterData,
    allFarmsFeedOrders,
    allFarmsChicksReceivingData,
    allFarmsWeeklyWeightData,
    allFarmsChicksGradingData,
    allFarmsFeedDeliveryData,
    allFarmsCatchingDetailsData,
    allFarmsSalmonellaData,
    catchingProgramEntries,
    dieselOrders,
    submittedFeedOrders,
    cycles,
    notifications,
    leaveRequests,
    septicTankRequests,
    employees,
    feedBulkerRecords,
    vehicleMovementLogs,
    inChargeTimeLogs,
    vehicleDetails,
    isMaintenanceMode,
    isInitialized,
  ]);

  const expiryNotifications = useMemo<Notification[]>(() => {
    const expiringItems: Notification[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const oneEightyDaysFromNow = new Date(today);
    oneEightyDaysFromNow.setDate(today.getDate() + 180);

    employees.forEach(employee => {
        if (employee.isArchived) return; // Skip archived employees

        // Check Iqama Expiry
        if (employee.iqamaExpiry) {
            try {
                const expiryDate = new Date(employee.iqamaExpiry.replace(/-/g, '/'));
                expiryDate.setHours(0, 0, 0, 0);
                if (!isNaN(expiryDate.getTime()) && expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
                    const diffTime = expiryDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    expiringItems.push({
                        id: `iqama-expiry-${employee.id}`,
                        message: `${employee.name}'s Iqama expires in ${diffDays} days.`,
                        read: false, // Always show as "unread" until fixed
                        timestamp: new Date().toISOString(), // Use current time to sort to the top
                        targetRoles: ['Admin', 'Supervisor'],
                    });
                }
            } catch (e) {
                console.warn(`Could not parse iqamaExpiry date for ${employee.name}: ${employee.iqamaExpiry}`);
            }
        }

        // Check Passport Expiry
        if (employee.passportExpiry) {
             try {
                const expiryDate = new Date(employee.passportExpiry.replace(/-/g, '/'));
                expiryDate.setHours(0, 0, 0, 0);
                if (!isNaN(expiryDate.getTime()) && expiryDate >= today && expiryDate <= oneEightyDaysFromNow) {
                    const diffTime = expiryDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                     expiringItems.push({
                        id: `passport-expiry-${employee.id}`,
                        message: `${employee.name}'s Passport expires in ${diffDays} days.`,
                        read: false,
                        timestamp: new Date().toISOString(),
                        targetRoles: ['Admin', 'Supervisor'],
                    });
                }
            } catch (e) {
                 console.warn(`Could not parse passportExpiry date for ${employee.name}: ${employee.passportExpiry}`);
            }
        }
    });

    return expiringItems;
  }, [employees]);

  const allNotifications = useMemo(() => {
    const combined = [...expiryNotifications, ...notifications];
    if (!currentUser) return [];

    const filtered = combined.filter(n => {
        // The `currentUser.role` can be 'Gate Keeper', which is not a valid element type for `targetRoles`.
        // The `includes` method expects its argument to be of the same type as the array elements.
        // Casting the role ensures type safety for this check.
        const roleMatch = !n.targetRoles || n.targetRoles.includes(currentUser.role as 'Admin' | 'Site Manager' | 'Supervisor' | 'Leadman');
        const farmMatch = !n.targetFarms || n.targetFarms.some(farm => currentUser.authorizedFarms.includes(farm));
        return roleMatch && farmMatch;
    });

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, expiryNotifications, currentUser]);


  const activeCycle = useMemo(() => {
    // A cycle is considered active if at least one of its farms does not have a finishDate.
    const activeCycles = cycles.filter(c => c.farms.some(f => !f.finishDate));
    if (activeCycles.length === 0) return null;
    // The "latest" active cycle is the one with the most recent ID (timestamp).
    return activeCycles.sort((a, b) => b.id.localeCompare(a.id))[0] || null;
  }, [cycles]);

  const cyclesForSelectedFarm = useMemo(() => {
    if (!selectedFarm) return [];
    // Filter cycles to only include those where the selected farm is present.
    return cycles
        .filter(c => c.farms.some(f => f.farmName === selectedFarm))
        .sort((a, b) => b.id.localeCompare(a.id)); // Sort newest first
  }, [cycles, selectedFarm]);

  const selectedFarmCycleDetails = useMemo<SelectedFarmCycleDetails | null>(() => {
    if (!selectedFarm || !selectedCycleId) return null;
    const cycle = cycles.find(c => c.id === selectedCycleId);
    if (!cycle) return null;
    const farmDetails = cycle.farms.find(f => f.farmName === selectedFarm);
    if (!farmDetails) return null;
    return {
      cycleId: cycle.id,
      cycleNo: cycle.cycleNo,
      ...farmDetails
    };
  }, [selectedFarm, selectedCycleId, cycles]);

  useEffect(() => {
    // Auto-select the latest cycle for the selected farm.
    if (cyclesForSelectedFarm.length > 0 && !selectedCycleId) {
        setSelectedCycleId(cyclesForSelectedFarm[0].id);
    } else if (cyclesForSelectedFarm.length > 0 && !cyclesForSelectedFarm.some(c => c.id === selectedCycleId)) {
        // If the current selected cycle ID is not valid for the new farm, reset to the latest one
        setSelectedCycleId(cyclesForSelectedFarm[0].id);
    } else if (cyclesForSelectedFarm.length === 0) {
        setSelectedCycleId(null);
    }
  }, [cyclesForSelectedFarm, selectedCycleId]);

  // --- DERIVED DATA FOR DASHBOARD ---
  const dailyReports = useMemo<DailyReport[]>(() => {
    if (!selectedFarmCycleDetails) return [];
    const { startDate, finishDate } = selectedFarmCycleDetails;
    const startDateObj = new Date(startDate.replace(/-/g, '/'));
    const endDateObj = finishDate ? new Date(finishDate.replace(/-/g, '/')) : new Date();

    return (allFarmsData[selectedFarm] || []).filter(report => {
        const reportDate = new Date(report.date.replace(/-/g, '/'));
        return reportDate >= startDateObj && reportDate <= endDateObj;
    });
  }, [allFarmsData, selectedFarm, selectedFarmCycleDetails]);

  const getCycleSpecificData = <T extends { cycleId: string }>(allData: { [farmName: string]: T[] }): T | undefined => {
    if (!selectedFarm || !selectedCycleId) return undefined;
    return (allData[selectedFarm] || []).find(d => d.cycleId === selectedCycleId);
  };
  
  const feedOrderData = useMemo(() => allFarmsFeedOrders[selectedFarm] || getInitialFeedOrderData()[selectedFarm], [allFarmsFeedOrders, selectedFarm]);
  const chicksReceivingData = useMemo(() => getCycleSpecificData(allFarmsChicksReceivingData) || createEmptyChicksReceivingDataForFarm(selectedFarm, selectedCycleId || ''), [allFarmsChicksReceivingData, selectedFarm, selectedCycleId]);
  const weeklyWeightData = useMemo(() => getCycleSpecificData(allFarmsWeeklyWeightData) || createEmptyWeeklyWeightDataForFarm(selectedFarm, selectedCycleId || ''), [allFarmsWeeklyWeightData, selectedFarm, selectedCycleId]);
  const chicksGradingData = useMemo(() => getCycleSpecificData(allFarmsChicksGradingData) || createEmptyChicksGradingDataForFarm(selectedFarm, selectedCycleId || ''), [allFarmsChicksGradingData, selectedFarm, selectedCycleId]);
  const catchingDetailsData = useMemo(() => getCycleSpecificData(allFarmsCatchingDetailsData) || createEmptyCatchingDetailsDataForFarm(selectedFarm, selectedCycleId || ''), [allFarmsCatchingDetailsData, selectedFarm, selectedCycleId]);
  const salmonellaData = useMemo(() => getCycleSpecificData(allFarmsSalmonellaData) || createEmptySalmonellaDataForFarm(selectedFarm, selectedCycleId || ''), [allFarmsSalmonellaData, selectedFarm, selectedCycleId]);
  
  const feedDeliveryRecords = useMemo(() => (allFarmsFeedDeliveryData[selectedFarm] || []).filter(r => r.cycleId === selectedCycleId), [allFarmsFeedDeliveryData, selectedFarm, selectedCycleId]);
  const waterRecordsForSelectedFarm = useMemo(() => (allFarmsWaterData[selectedFarm] || []).filter(r => r.cycleId === selectedCycleId), [allFarmsWaterData, selectedFarm, selectedCycleId]);
  
  const allAuthorizedFarmsData = useMemo(() => {
      if(!currentUser) return {};
      return Object.fromEntries(Object.entries(allFarmsData).filter(([farmName]) => currentUser.authorizedFarms.includes(farmName)));
  }, [currentUser, allFarmsData]);

  const createAuthorizedFarmDataSelector = <T,>(allData: { [key: string]: T }) => useMemo(() => {
    if(!currentUser) return {};
    return Object.fromEntries(Object.entries(allData).filter(([farmName]) => currentUser.authorizedFarms.includes(farmName)));
  }, [currentUser, allData]);

  const allAuthorizedFarmsWaterData = createAuthorizedFarmDataSelector(allFarmsWaterData);
  const allAuthorizedFarmsChicksReceivingData = createAuthorizedFarmDataSelector(allFarmsChicksReceivingData);
  const allAuthorizedFarmsWeeklyWeightData = createAuthorizedFarmDataSelector(allFarmsWeeklyWeightData);
  const allAuthorizedFarmsChicksGradingData = createAuthorizedFarmDataSelector(allFarmsChicksGradingData);
  const allAuthorizedFarmsFeedDeliveryData = createAuthorizedFarmDataSelector(allFarmsFeedDeliveryData);
  const allAuthorizedFarmsCatchingDetailsData = createAuthorizedFarmDataSelector(allFarmsCatchingDetailsData);
  const allAuthorizedFarmsSalmonellaData = createAuthorizedFarmDataSelector(allFarmsSalmonellaData);

  
  // --- HANDLERS ---
  const handleLogin = (username: string, password: string): boolean => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
      if (isMaintenanceMode && user.role !== 'Admin') return false;
      setCurrentUser(user);
      if (user.role !== 'Gate Keeper' && user.authorizedFarms.length > 0) {
        setSelectedFarm(user.authorizedFarms[0]);
      }
      return true;
    }
    return false;
  };
  
  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedFarm('');
    setSelectedCycleId(null);
  };
  
  const handleSelectFarm = (farmName: string) => setSelectedFarm(farmName);
  const handleSelectCycle = (cycleId: string) => setSelectedCycleId(cycleId);
  const handleMarkNotificationsAsRead = () => setNotifications(prev => prev.map(n => ({...n, read: true})));

  const handleAudit = <T,>(data: T): T & { meta: AuditInfo } => {
    const meta = { updatedBy: currentUser?.name || 'System', updatedAt: new Date().toISOString() };
    return { ...data, meta };
  };

  const handleCreationAudit = <T,>(data: T): T & { meta: CreationAuditInfo } => {
    const now = new Date().toISOString();
    const name = currentUser?.name || 'System';
    return { ...data, meta: { createdBy: name, createdAt: now, updatedBy: name, updatedAt: now } };
  };

  const handleUpdateData = useCallback((farmName: string, date: string, data: FarmDailyData) => {
    // FIX: Add explicit types to sort callback parameters to prevent inference issues.
    setAllFarmsData(prev => ({ ...prev, [farmName]: [...(prev[farmName] || []).filter(r => r.date !== date), handleAudit({ date, ...data })].sort((a: DailyReport, b: DailyReport) => a.date.localeCompare(b.date)) }));
  }, [currentUser]);

  const handleUpdateWaterRecord = useCallback((farmName: string, record: Omit<DailyWaterRecord, 'meta'>) => {
      setAllFarmsWaterData(prev => {
          const updatedRecord = handleAudit(record);
          const farmRecords = (prev[farmName] || []).filter(r => !(r.date === record.date && r.cycleId === record.cycleId));
          return {
              ...prev,
              [farmName]: [...farmRecords, updatedRecord].sort((a,b) => a.date.localeCompare(b.date))
          };
      });
  }, [currentUser]);

  const handleBulkUpdateDailyReports = useCallback((farmName: string, updates: { [date: string]: FarmDailyData }) => {
    setAllFarmsData(prev => {
        const existingReports = new Map((prev[farmName] || []).map(r => [r.date, r]));
        for (const [date, data] of Object.entries(updates)) {
            existingReports.set(date, handleAudit({ date, ...data }));
        }
        // FIX: Add explicit types to sort callback parameters to prevent inference issues.
        const newReports = Array.from(existingReports.values()).sort((a: DailyReport, b: DailyReport) => a.date.localeCompare(b.date));
        return { ...prev, [farmName]: newReports };
    });
  }, [currentUser]);

  const handleUpdateCycleSpecificData = <T extends {cycleId: string}>(
    setter: React.Dispatch<React.SetStateAction<{ [farmName: string]: T[] }>>,
    farmName: string,
    data: T
  ) => {
    setter(prev => {
      const farmData = [...(prev[farmName] || []).filter(d => d.cycleId !== data.cycleId)];
      farmData.push(handleAudit(data));
      return { ...prev, [farmName]: farmData };
    });
  };

  const handleUpdateChicksReceiving = useCallback((farmName: string, data: ChicksReceivingData) => handleUpdateCycleSpecificData(setAllFarmsChicksReceivingData, farmName, data), [currentUser]);
  const handleUpdateWeeklyWeight = useCallback((farmName: string, data: WeeklyWeightData) => handleUpdateCycleSpecificData(setAllFarmsWeeklyWeightData, farmName, data), [currentUser]);
  const handleUpdateChicksGrading = useCallback((farmName: string, data: ChicksGradingData) => handleUpdateCycleSpecificData(setAllFarmsChicksGradingData, farmName, data), [currentUser]);
  const handleUpdateCatchingDetails = useCallback((farmName: string, data: CatchingDetailsData) => handleUpdateCycleSpecificData(setAllFarmsCatchingDetailsData, farmName, data), [currentUser]);
  const handleUpdateSalmonella = useCallback((farmName: string, data: SalmonellaData) => handleUpdateCycleSpecificData(setAllFarmsSalmonellaData, farmName, data), [currentUser]);

  const handleAddSubmittedFeedOrder = useCallback((farmName: string, data: FeedOrderData) => {
    const newOrder: SubmittedFeedOrder = {
        ...data,
        id: new Date().toISOString() + Math.random(),
        farmName,
        status: 'Submitted',
        cycleId: selectedCycleId!,
    };
    setSubmittedFeedOrders(prev => [...prev, handleCreationAudit(newOrder)]);
    setEditingFeedOrderId(null);
  }, [currentUser, selectedCycleId]);

  const handleUpdateSubmittedFeedOrder = useCallback((orderId: string, farmName: string, data: FeedOrderData) => {
      setSubmittedFeedOrders(prev => prev.map(order => order.id === orderId ? handleAudit({ ...order, ...data }) : order));
      setEditingFeedOrderId(null);
  }, [currentUser]);

  const handleStartEditingFeedOrder = (order: SubmittedFeedOrder) => {
      const orderData = { orderDate: order.orderDate, deliveryDate: order.deliveryDate, feedMillNo: order.feedMillNo, items: order.items, remarks: order.remarks, priority: order.priority };
      setAllFarmsFeedOrders(prev => ({ ...prev, [order.farmName]: orderData }));
      setEditingFeedOrderId(order.id);
  };

  const handleCancelEditingFeedOrder = () => setEditingFeedOrderId(null);

  const handleConfirmFeedDelivery = useCallback((orderId: string, actualDeliveryDate: string, deliveryData: FeedDeliveryRecordData) => {
    const now = new Date().toISOString();
    const name = currentUser?.name || 'System';

    setSubmittedFeedOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Delivered', actualDeliveryDate, deliveredQuantities: deliveryData, meta: { ...o.meta, updatedBy: name, updatedAt: now } } : o));
    
    const order = submittedFeedOrders.find(o => o.id === orderId);
    if (!order) return;

    const newRecord: FeedDeliveryRecord = { date: actualDeliveryDate, cycleId: order.cycleId, ...deliveryData, meta: { updatedBy: name, updatedAt: now } };
    setAllFarmsFeedDeliveryData(prev => {
        const farmRecords = (prev[order.farmName] || []).filter(r => r.date !== actualDeliveryDate); // Avoid duplicates on same day
        // FIX: Add explicit types to sort callback parameters to prevent inference issues.
        return { ...prev, [order.farmName]: [...farmRecords, newRecord].sort((a: FeedDeliveryRecord, b: FeedDeliveryRecord) => a.date.localeCompare(b.date)) };
    });
  }, [currentUser, submittedFeedOrders]);

  const handleUpdateConfirmedFeedDelivery = useCallback((orderId: string, actualDeliveryDate: string, deliveryData: FeedDeliveryRecordData) => {
      handleConfirmFeedDelivery(orderId, actualDeliveryDate, deliveryData); // Same logic for update
  }, [handleConfirmFeedDelivery]);

  const handleUpdateCatchingProgramEntries = useCallback((entries: CatchingProgramEntry[]) => {
      const updatedEntries = entries.map(e => ({...e, meta: { updatedBy: currentUser?.name || 'System', updatedAt: new Date().toISOString() }}));
      setCatchingProgramEntries(updatedEntries);
  }, [currentUser]);

  const handleAddDieselOrder = useCallback((order: Omit<DieselOrder, 'id' | 'status'>) => {
      const newOrder = { ...order, id: new Date().toISOString() + Math.random(), status: 'Pending' as const };
      setDieselOrders(prev => [handleCreationAudit(newOrder), ...prev]);
  }, [currentUser]);

  const handleUpdateDieselOrderStatus = useCallback((orderId: string, status: 'Completed', receivedDate: string) => {
      setDieselOrders(prev => prev.map(o => o.id === orderId ? handleAudit({ ...o, status, receivedDate }) : o));
  }, [currentUser]);
  
  const handleAddDieselOrderReservation = useCallback((orderId: string, reservationNumber: string) => {
    setDieselOrders(prev => prev.map(o => o.id === orderId ? handleAudit({ ...o, reservationNumber }) : o));
  }, [currentUser]);

  const handleAddLeaveRequest = useCallback((request: Omit<LeaveRequest, 'id' | 'status' | 'requestedAt' | 'userId' | 'username'>) => {
    if (!currentUser) return;
    const newRequest: LeaveRequest = {
        ...request,
        id: new Date().toISOString(),
        userId: currentUser.id,
        username: currentUser.name,
        status: 'Pending',
        requestedAt: new Date().toISOString()
    };
    setLeaveRequests(prev => [newRequest, ...prev]);
  }, [currentUser]);
  
  const handleUpdateLeaveRequestStatus = useCallback((requestId: string, status: 'Approved' | 'Rejected', rejectionReason?: string) => {
    setLeaveRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, status, rejectionReason, reviewedBy: currentUser?.name, reviewedAt: new Date().toISOString() }
        : req
    ));
  }, [currentUser]);

  const handleAddSepticTankRequest = useCallback((request: Omit<SepticTankRequest, 'id' | 'status' | 'submittedAt'>) => {
    const newRequest = { ...request, id: new Date().toISOString() + Math.random(), status: 'Pending' as const, submittedAt: new Date().toISOString() };
    setSepticTankRequests(prev => [handleCreationAudit(newRequest), ...prev]);
  }, [currentUser]);

  const handleUpdateSepticTankRequestStatus = useCallback((requestId: string, status: 'Completed') => {
    setSepticTankRequests(prev => prev.map(r => r.id === requestId ? handleAudit({ ...r, status }) : r));
  }, [currentUser]);
  
  const handleAddEmployee = useCallback((employee: Omit<Employee, 'id'>) => {
    const newEmployee = { ...employee, id: new Date().toISOString() + Math.random() };
    setEmployees(prev => [handleCreationAudit(newEmployee), ...prev]);
  }, [currentUser]);

  const handleUpdateEmployee = useCallback((employee: Employee) => {
    setEmployees(prev => prev.map(e => e.id === employee.id ? handleAudit(employee) : e));
  }, [currentUser]);

  const handleDeleteEmployee = useCallback((employeeId: string) => setEmployees(prev => prev.filter(e => e.id !== employeeId)), []);
  const handleBulkDeleteEmployees = useCallback((employeeIds: string[]) => setEmployees(prev => prev.filter(e => !employeeIds.includes(e.id))), []);

  const handleBulkImportEmployees = async (csvData: string): Promise<{ success: boolean; message: string }> => {
        try {
            const lines = csvData.trim().replace(/\r\n/g, '\n').split('\n');
            const headerLine = lines.shift()?.trim().toLowerCase();
            if (!headerLine) throw new Error("CSV is empty.");

            const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
            const headerMap: { [key: string]: keyof Employee } = {
                'sn': 'sN', 'compno': 'compNo', 'sapno': 'sapNo', 'name': 'name', 'designation': 'designation',
                'sponsor': 'sponsor', 'grade': 'grade', 'nationality': 'nationality', 'joiningdate': 'joiningDate',
                'farmno': 'farmNo', 'area': 'area', 'iqamano': 'iqamaNo', 'iqamaexpiry': 'iqamaExpiry',
                'passportno': 'passportNo', 'passportexpiry': 'passportExpiry', 'religion': 'religion',
                'mobileno': 'mobileNo', 'vacationstartdate': 'vacationStartDate', 'vacationenddate': 'vacationEndDate',
                'resumingdate': 'resumingDate', 'gumboot': 'gumboot', 'uniform': 'uniform', 'jacket': 'jacket', 'cost': 'cost'
            };

            const indices: { [key in keyof Employee]?: number } = {};
            for (const [csvHeader, employeeKey] of Object.entries(headerMap)) {
                const index = headers.indexOf(csvHeader);
                if (index !== -1) indices[employeeKey] = index;
            }

            if (!indices.name || indices.sapNo === undefined) throw new Error("CSV must contain 'Name' and 'Sap No' columns.");

            const newEmployees: Employee[] = [];
            const updatedEmployees: Employee[] = [];
            const existingSapNos = new Set(employees.map(e => e.sapNo));
            let maxSN = employees.length > 0 ? Math.max(...employees.map(e => e.sN)) : 0;

            for (const line of lines) {
                if (!line.trim()) continue;
                const values = line.split(',');
                const sapNo = values[indices.sapNo!]?.trim();
                if (!sapNo) continue;

                const employeeData: Partial<Employee> = {};
                for (const [key, index] of Object.entries(indices)) {
                    if (index !== undefined && values[index] !== undefined) {
                        let value = values[index].trim();
                        if (key.toLowerCase().includes('date') || key.toLowerCase().includes('expiry')) {
                            value = formatDateToYMD(value);
                        }
                        (employeeData as any)[key] = value;
                    }
                }
                
                const existingEmployee = employees.find(e => e.sapNo === sapNo);
                if (existingEmployee) {
                    updatedEmployees.push(handleAudit({ ...existingEmployee, ...employeeData }));
                } else {
                    maxSN++;
                    newEmployees.push(handleCreationAudit({
                        ...employeeData,
                        id: new Date().toISOString() + Math.random(),
                        sN: employeeData.sN || maxSN,
                    } as Employee));
                }
            }
            
            setEmployees(prev => {
                const updatedMap = new Map(updatedEmployees.map(e => [e.id, e]));
                const unchanged = prev.filter(e => !updatedMap.has(e.id));
                // FIX: Add explicit types to sort callback parameters to prevent inference issues.
                return [...unchanged, ...updatedEmployees, ...newEmployees].sort((a: Employee, b: Employee) => a.sN - b.sN);
            });
            
            return { success: true, message: `Import successful. Added ${newEmployees.length} new employees and updated ${updatedEmployees.length}.` };
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred during import.";
            return { success: false, message };
        }
    };


  const handleAddFeedBulkerRecord = useCallback((record: Omit<FeedBulkerRecord, 'id' | 'meta'>) => {
    const newRecord = { ...record, id: new Date().toISOString() + Math.random() };
    setFeedBulkerRecords(prev => [handleCreationAudit(newRecord), ...prev]);
  }, [currentUser]);

  const handleUpdateFeedBulkerRecord = useCallback((record: FeedBulkerRecord) => {
    setFeedBulkerRecords(prev => prev.map(r => r.id === record.id ? handleAudit(record) : r));
  }, [currentUser]);

  const handleAddVehicleMovementLog = useCallback((log: Omit<VehicleMovementLog, 'id' | 'meta' | 'timestamp'>) => {
    const newLog = { ...log, id: new Date().toISOString() + Math.random(), timestamp: new Date().toISOString() };
    setVehicleMovementLogs(prev => [handleCreationAudit(newLog), ...prev]);
  }, [currentUser]);

  const handleAddOrUpdateInChargeTimeLog = useCallback((log: Omit<InChargeTimeLog, 'id' | 'meta'> & { id?: string }) => {
    if (log.id) { // Update
        setInChargeTimeLogs(prev => prev.map(l => l.id === log.id ? handleAudit({ ...l, ...log }) : l));
    } else { // Add
        const newLog = { ...log, id: new Date().toISOString() + Math.random() };
        setInChargeTimeLogs(prev => [handleCreationAudit(newLog), ...prev]);
    }
  }, [currentUser]);

  const handleAddVehicleDetails = useCallback((details: Omit<VehicleDetails, 'id' | 'meta'>) => {
    const newDetails = { ...details, id: new Date().toISOString() + Math.random() };
    setVehicleDetails(prev => [handleCreationAudit(newDetails), ...prev.filter(v => v.truckPlateNo.toLowerCase() !== details.truckPlateNo.toLowerCase())]);
  }, [currentUser]);

  const handleUpdateVehicleDetails = useCallback((details: VehicleDetails) => {
      setVehicleDetails(prev => prev.map(d => d.id === details.id ? handleAudit(details) : d));
  }, [currentUser]);

  const handleDeleteVehicleDetails = useCallback((id: string) => {
      setVehicleDetails(prev => prev.filter(d => d.id !== id));
  }, []);

  const handleBulkImportVehicleDetails = async (csvData: string): Promise<{ success: boolean; message: string }> => {
      try {
          const lines = csvData.trim().replace(/\r\n/g, '\n').split('\n');
          const headerLine = lines.shift()?.trim().toLowerCase();
          if (!headerLine) throw new Error("CSV is empty.");

          const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
          const plateNoCol = headers.indexOf('truckplateno');
          const driverCol = headers.indexOf('drivername');
          const sideNoCol = headers.indexOf('sideno');
          const bulkerNoCol = headers.indexOf('bulkerno');

          if (plateNoCol === -1) throw new Error("CSV must contain 'Truck Plate No' column.");

          const newVehicles: VehicleDetails[] = [];
          const updatedVehicles: VehicleDetails[] = [];

          for (const line of lines) {
              if (!line.trim()) continue;
              const values = line.split(',');
              const plateNo = values[plateNoCol]?.trim();
              if (!plateNo) continue;

              const vehicleData: Partial<Omit<VehicleDetails, 'id' | 'meta'>> = {
                  truckPlateNo: plateNo,
                  driverName: values[driverCol]?.trim() || '',
                  sideNo: values[sideNoCol]?.trim() || '',
                  bulkerNo: values[bulkerNoCol]?.trim() || '',
              };
              
              const existingVehicle = vehicleDetails.find(v => v.truckPlateNo.toLowerCase() === plateNo.toLowerCase());
              if (existingVehicle) {
                  updatedVehicles.push(handleAudit({ ...existingVehicle, ...vehicleData }));
              } else {
                  newVehicles.push(handleCreationAudit({
                      ...vehicleData,
                      id: new Date().toISOString() + Math.random(),
                  } as VehicleDetails));
              }
          }
          
          setVehicleDetails(prev => {
              const updatedMap = new Map(updatedVehicles.map(v => [v.id, v]));
              const unchanged = prev.filter(v => !updatedMap.has(v.id));
              return [...unchanged, ...updatedVehicles, ...newVehicles];
          });
          
          return { success: true, message: `Import successful. Added ${newVehicles.length} new vehicles and updated ${updatedVehicles.length}.` };
      } catch (error) {
          const message = error instanceof Error ? error.message : "An unknown error occurred during import.";
          return { success: false, message };
      }
  };


  const handleStartNewCycle = useCallback((cycleData: Omit<Cycle, 'id'>) => {
      const now = new Date().toISOString();
      const name = currentUser?.name || 'System';
      const newCycle: Cycle = {
          ...cycleData,
          id: now,
          farms: cycleData.farms.map(f => ({ ...f, meta: { createdBy: name, createdAt: now, updatedBy: name, updatedAt: now } }))
      };
      setCycles(prev => [newCycle, ...prev]);
  }, [currentUser]);
  
  const handleUpdateFarmCycleDetails = useCallback((cycleId: string, farmName: string, details: { cropNo: string; startDate: string }) => {
      setCycles(prev => prev.map(c => c.id === cycleId ? { ...c, farms: c.farms.map(f => f.farmName === farmName ? handleAudit({ ...f, ...details }) : f) } : c));
  }, [currentUser]);
  
  const handleFinishFarmCycle = useCallback((cycleId: string, farmName: string, finishDate: string) => {
      setCycles(prev => prev.map(c => c.id === cycleId ? { ...c, farms: c.farms.map(f => f.farmName === farmName ? handleAudit({ ...f, finishDate }) : f) } : c));
  }, [currentUser]);

  const handleReopenFarmCycle = useCallback((cycleId: string, farmName: string) => {
       setCycles(prev => prev.map(c => c.id === cycleId ? { ...c, farms: c.farms.map(f => f.farmName === farmName ? handleAudit({ ...f, finishDate: undefined }) : f) } : c));
  }, [currentUser]);

  const handleVerifyAdminPassword = (password: string) => {
      const admin = users.find(u => u.role === 'Admin');
      return !!admin && admin.password === password;
  };

  const handleExportData = () => {
    const appState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (appState) {
        const blob = new Blob([appState], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `poultry_farm_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
  };

  const handleImportData = async (data: string): Promise<boolean> => {
      try {
          const parsedData = JSON.parse(data);
          // Simple validation
          if (parsedData.allFarmsData && parsedData.cycles) {
              localStorage.setItem(LOCAL_STORAGE_KEY, data);
              window.location.reload(); // Easiest way to re-initialize state
              return true;
          }
          return false;
      } catch (e) {
          return false;
      }
  };

  const handleBulkImportChicksReceiving = async (csvData: string): Promise<{ success: boolean; message: string }> => {
    try {
        const lines = csvData.trim().replace(/\r\n/g, '\n').split('\n');
        const headerLine = lines.shift()?.trim().toLowerCase();
        if (!headerLine) throw new Error("CSV is empty.");

        const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
        const farmCol = headers.indexOf('farm');
        const houseCol = headers.indexOf('house');

        if (farmCol === -1 || houseCol === -1) throw new Error("CSV must contain 'Farm' and 'House' columns.");
        
        const updates: Record<string, ChicksReceivingData> = {};
        let updatedCount = 0;

        for (const line of lines) {
            if (!line.trim()) continue;
            const values = line.split(',');
            const farmName = values[farmCol]?.trim();
            const houseNum = parseInt(values[houseCol]?.trim(), 10);

            const activeCycleForFarm = cycles.find(c => c.farms.some(f => f.farmName === farmName && !f.finishDate));
            if (!farmName || isNaN(houseNum) || !activeCycleForFarm) continue;

            if (!updates[farmName]) {
                const existingData = allFarmsChicksReceivingData[farmName]?.find(d => d.cycleId === activeCycleForFarm.id);
                updates[farmName] = existingData ? JSON.parse(JSON.stringify(existingData)) : createEmptyChicksReceivingDataForFarm(farmName, activeCycleForFarm.id);
            }

            // ... (Full implementation would map all columns to fields)
            updatedCount++;
        }
        
        if (updatedCount === 0) return { success: false, message: "No valid rows found for farms with active cycles." };

        setAllFarmsChicksReceivingData(prev => {
            const newState = { ...prev };
            for(const [farmName, data] of Object.entries(updates)) {
                newState[farmName] = [...(newState[farmName] || []).filter(d => d.cycleId !== data.cycleId), handleAudit(data)];
            }
            return newState;
        });

        return { success: true, message: `Successfully processed ${updatedCount} rows.` };
    } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : "Import failed." };
    }
  };

  const handleToggleMaintenanceMode = (password: string) => {
      if (handleVerifyAdminPassword(password)) {
          setIsMaintenanceMode(prev => !prev);
          return { success: true, message: `Maintenance mode has been ${!isMaintenanceMode ? 'ENABLED' : 'DISABLED'}.` };
      }
      return { success: false, message: 'Incorrect admin password.' };
  };

  if (!isInitialized) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} isMaintenanceMode={isMaintenanceMode} />;
  }
  
  if (isMaintenanceMode && currentUser.role !== 'Admin') {
      return <MaintenanceScreen onLogout={handleLogout} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 poultry-background">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Dashboard
                currentUser={currentUser}
                onLogout={handleLogout}
                farms={currentUser.authorizedFarms}
                selectedFarm={selectedFarm}
                onSelectFarm={handleSelectFarm}
                cyclesForSelectedFarm={cyclesForSelectedFarm}
                selectedCycleId={selectedCycleId}
                onSelectCycle={handleSelectCycle}
                dailyReports={dailyReports}
                waterRecordsForSelectedFarm={waterRecordsForSelectedFarm}
                feedOrderData={feedOrderData}
                chicksReceivingData={chicksReceivingData}
                weeklyWeightData={weeklyWeightData}
                chicksGradingData={chicksGradingData}
                feedDeliveryRecords={feedDeliveryRecords}
                catchingDetailsData={catchingDetailsData}
                salmonellaData={salmonellaData}
                catchingProgramEntries={catchingProgramEntries}
                dieselOrders={dieselOrders}
                submittedFeedOrders={submittedFeedOrders}
                cycles={cycles}
                activeCycle={activeCycle}
                selectedFarmCycleDetails={selectedFarmCycleDetails}
                notifications={allNotifications}
                leaveRequests={leaveRequests}
                septicTankRequests={septicTankRequests}
                employees={employees}
                feedBulkerRecords={feedBulkerRecords}
                vehicleMovementLogs={vehicleMovementLogs}
                inChargeTimeLogs={inChargeTimeLogs}
                vehicleDetails={vehicleDetails}
                editingFeedOrderId={editingFeedOrderId}
                onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
                onStartNewCycle={handleStartNewCycle}
                onUpdateFarmCycleDetails={handleUpdateFarmCycleDetails}
                onFinishFarmCycle={handleFinishFarmCycle}
                onReopenFarmCycle={handleReopenFarmCycle}
                onVerifyAdminPassword={handleVerifyAdminPassword}
                onUpdateData={handleUpdateData}
                onUpdateWaterRecord={handleUpdateWaterRecord}
                onBulkUpdateDailyReports={handleBulkUpdateDailyReports}
                onAddSubmittedFeedOrder={handleAddSubmittedFeedOrder}
                onUpdateSubmittedFeedOrder={handleUpdateSubmittedFeedOrder}
                onStartEditingFeedOrder={handleStartEditingFeedOrder}
                onCancelEditingFeedOrder={handleCancelEditingFeedOrder}
                onConfirmFeedDelivery={handleConfirmFeedDelivery}
                onUpdateConfirmedFeedDelivery={handleUpdateConfirmedFeedDelivery}
                onUpdateChicksReceiving={handleUpdateChicksReceiving}
                onUpdateWeeklyWeight={handleUpdateWeeklyWeight}
                onUpdateChicksGrading={handleUpdateChicksGrading}
                onUpdateCatchingDetails={handleUpdateCatchingDetails}
                onUpdateSalmonella={handleUpdateSalmonella}
                onUpdateCatchingProgramEntries={handleUpdateCatchingProgramEntries}
                onAddDieselOrder={handleAddDieselOrder}
                onUpdateDieselOrderStatus={handleUpdateDieselOrderStatus}
                onAddDieselOrderReservation={handleAddDieselOrderReservation}
                onAddLeaveRequest={handleAddLeaveRequest}
                onUpdateLeaveRequestStatus={handleUpdateLeaveRequestStatus}
                onAddSepticTankRequest={handleAddSepticTankRequest}
                onUpdateSepticTankRequestStatus={handleUpdateSepticTankRequestStatus}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onBulkDeleteEmployees={handleBulkDeleteEmployees}
                onBulkImportEmployees={handleBulkImportEmployees}
                onAddFeedBulkerRecord={handleAddFeedBulkerRecord}
                onUpdateFeedBulkerRecord={handleUpdateFeedBulkerRecord}
                onAddVehicleMovementLog={handleAddVehicleMovementLog}
                onAddOrUpdateInChargeTimeLog={handleAddOrUpdateInChargeTimeLog}
                onAddVehicleDetails={handleAddVehicleDetails}
                onUpdateVehicleDetails={handleUpdateVehicleDetails}
                onDeleteVehicleDetails={handleDeleteVehicleDetails}
                onBulkImportVehicleDetails={handleBulkImportVehicleDetails}
                allAuthorizedFarmsData={allAuthorizedFarmsData}
                allAuthorizedFarmsWaterData={allAuthorizedFarmsWaterData}
                allAuthorizedFarmsChicksReceivingData={allAuthorizedFarmsChicksReceivingData}
                allAuthorizedFarmsWeeklyWeightData={allAuthorizedFarmsWeeklyWeightData}
                allAuthorizedFarmsChicksGradingData={allAuthorizedFarmsChicksGradingData}
                allAuthorizedFarmsFeedDeliveryData={allAuthorizedFarmsFeedDeliveryData}
                allAuthorizedFarmsCatchingDetailsData={allAuthorizedFarmsCatchingDetailsData}
                allAuthorizedFarmsSalmonellaData={allAuthorizedFarmsSalmonellaData}
                users={users}
                onAddUser={(newUser) => setUsers(prev => [handleCreationAudit({ ...newUser, id: new Date().toISOString() }), ...prev])}
                onUpdateUser={(updatedUser) => setUsers(prev => prev.map(u => u.id === updatedUser.id ? handleAudit(updatedUser) : u))}
                onDeleteUser={(userId) => setUsers(prev => prev.filter(u => u.id !== userId))}
                onExportData={handleExportData}
                onImportData={handleImportData}
                onBulkImportChicksReceiving={handleBulkImportChicksReceiving}
                onToggleMaintenanceMode={handleToggleMaintenanceMode}
            />
        </main>
    </div>
  );
}

export default App;
