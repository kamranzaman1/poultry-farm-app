
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LoginScreen from './components/LoginScreen';
import MaintenanceScreen from './components/MaintenanceScreen';
import { INITIAL_USERS } from './users';
import { INITIAL_EMPLOYEES } from './employees';
import type { AllFarmsData, DieselOrder, FarmDailyData, AllFarmsFeedOrders, FeedOrderData, User, AllFarmsChicksReceivingData, ChicksReceivingData, DailyReport, SubmittedFeedOrder, FeedOrderItem, AllFarmsWeeklyWeightData, WeeklyWeightData, AllFarmsFeedDeliveryData, FeedDeliveryRecord, FeedDeliveryRecordData, Cycle, SelectedFarmCycleDetails, Notification, AllFarmsCatchingDetailsData, CatchingDetailsData, AllFarmsSalmonellaData, SalmonellaData, CatchingProgramEntry, ChicksReceivingHouseData, AllFarmsChicksGradingData, ChicksGradingData, LeaveRequest, Employee, SepticTankRequest, FeedBulkerRecord, VehicleMovementLog, InChargeTimeLog, CreationAuditInfo } from './types';
import { getInitialData, getInitialFeedOrderData, getInitialChicksReceivingData, getInitialWeeklyWeightData, getInitialFeedDeliveryData, getInitialCatchingDetailsData, getInitialSalmonellaData, createEmptyChicksReceivingDataForFarm, createEmptyWeeklyWeightDataForFarm, createEmptyCatchingDetailsDataForFarm, createEmptySalmonellaDataForFarm, createEmptyFeedDeliveryRecord, getInitialChicksGradingData, createEmptyChicksGradingDataForFarm } from './utils/dataHelper';
import { getHouseCountForFarm, PRODUCTION_LINE_MAP } from './constants';

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
        isMaintenanceMode,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
    } catch (error) {
      console.error("Failed to save state to localStorage:", error);
    }
  }, [
    users,
    allFarmsData,
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
    return cycles
        .filter(cycle => cycle.farms.some(f => f.farmName === selectedFarm))
        .sort((a, b) => {
            const aFarm = a.farms.find(f => f.farmName === selectedFarm)!;
            const bFarm = b.farms.find(f => f.farmName === selectedFarm)!;
            return new Date(bFarm.startDate).getTime() - new Date(aFarm.startDate).getTime();
        });
  }, [cycles, selectedFarm]);

  // Effect to manage the selectedCycleId when the farm changes or cycles load
  useEffect(() => {
    if (cyclesForSelectedFarm.length > 0) {
        // If the current selectedCycleId is not valid for the new farm, reset it.
        const isCurrentCycleValid = cyclesForSelectedFarm.some(c => c.id === selectedCycleId);
        if (!isCurrentCycleValid) {
            setSelectedCycleId(cyclesForSelectedFarm[0].id); // Default to the latest one
        }
    } else {
        setSelectedCycleId(null);
    }
  }, [cyclesForSelectedFarm, selectedCycleId]);

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
  }, [cycles, selectedFarm, selectedCycleId]);

  const handleStartNewCycle = useCallback((cycleData: Omit<Cycle, 'id'>) => {
      const newCycle: Cycle = {
          ...cycleData,
          id: new Date().toISOString(),
      };
      setCycles(prevCycles => [...prevCycles, newCycle]);
      sendDataToGoogleSheet('Cycle_Start', { cycle: newCycle });
  }, []);

  const handleUpdateFarmCycleDetails = useCallback((cycleId: string, farmName: string, details: { cropNo: string; startDate: string }) => {
    setCycles(prevCycles =>
        prevCycles.map(cycle => {
            if (cycle.id !== cycleId) return cycle;
            return {
                ...cycle,
                farms: cycle.farms.map(farm =>
                    farm.farmName === farmName ? { ...farm, ...details } : farm
                ),
            };
        })
    );
    sendDataToGoogleSheet('Cycle_UpdateFarmDetails', { cycleId, farmName, details, user: currentUser?.username });
  }, [currentUser]);

  const handleFinishFarmCycle = useCallback((cycleId: string, farmName: string, finishDate: string) => {
      setCycles(prevCycles =>
          prevCycles.map(cycle => {
              if (cycle.id !== cycleId) return cycle;
              return {
                  ...cycle,
                  farms: cycle.farms.map(farm =>
                      farm.farmName === farmName ? { ...farm, finishDate } : farm
                  ),
              };
          })
      );
      sendDataToGoogleSheet('Cycle_FinishFarm', { cycleId, farmName, finishDate });
  }, []);

  const handleReopenFarmCycle = useCallback((cycleId: string, farmName: string) => {
    setCycles(prevCycles =>
        prevCycles.map(cycle => {
            if (cycle.id !== cycleId) return cycle;
            const { finishDate, ...rest } = cycle.farms.find(f => f.farmName === farmName)!;
            return {
                ...cycle,
                farms: cycle.farms.map(farm =>
                    farm.farmName === farmName ? rest : farm
                ),
            };
        })
    );
    sendDataToGoogleSheet('Cycle_ReopenFarm', { cycleId, farmName, user: currentUser?.username });
  }, [currentUser]);

  const verifyAdminPassword = useCallback((password: string): boolean => {
    if (currentUser?.role !== 'Admin') return false;
    return currentUser.password === password;
  }, [currentUser]);

  const handleLogin = useCallback((username: string, password: string): boolean => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      if (user.authorizedFarms.length > 0) {
        setSelectedFarm(user.authorizedFarms[0]);
      } else {
        setSelectedFarm('');
      }
      return true;
    }
    return false;
  }, [users]);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setSelectedFarm('');
  }, []);

  // User management functions
  const handleAddUser = useCallback((newUser: Omit<User, 'id'>) => {
    const userWithId = { ...newUser, id: new Date().toISOString() };
    setUsers(prevUsers => [...prevUsers, userWithId]);
    // Log to Google Sheet without password
    const { password, ...userToLog } = userWithId;
    sendDataToGoogleSheet('User_Add', { user: userToLog });
  }, []);

  const handleUpdateUser = useCallback((updatedUser: User) => {
    setUsers(prevUsers => prevUsers.map(user => user.id === updatedUser.id ? updatedUser : user));
    // Log to Google Sheet without password
    const { password, ...userToLog } = updatedUser;
    sendDataToGoogleSheet('User_Update', { user: userToLog });
  }, []);

  const handleDeleteUser = useCallback((userId: string) => {
    setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    sendDataToGoogleSheet('User_Delete', { userId });
  }, []);

  // Employee management functions
  const handleAddEmployee = useCallback((newEmployee: Omit<Employee, 'id'>) => {
    const employeeWithId = { ...newEmployee, id: new Date().toISOString() + Math.random() };
    setEmployees(prev => [...prev, employeeWithId].sort((a, b) => a.sN - b.sN));
    sendDataToGoogleSheet('Employee_Add', { employee: employeeWithId });
  }, []);

  const handleUpdateEmployee = useCallback((updatedEmployee: Employee) => {
    const oldEmployee = employees.find(emp => emp.id === updatedEmployee.id);
    
    if (currentUser?.role === 'Admin' && oldEmployee && oldEmployee.id !== currentUser.id) {
        const hasChanged = Object.keys(updatedEmployee).some(key => {
            if (key === 'id') return false;
            const oldValue = oldEmployee[key as keyof Employee];
            const newValue = updatedEmployee[key as keyof Employee];
            const oldIsEmpty = oldValue === null || oldValue === undefined || oldValue === '';
            const newIsEmpty = newValue === null || newValue === undefined || newValue === '';
            if (oldIsEmpty && newIsEmpty) return false;
            return oldValue !== newValue;
        });

        if (hasChanged) {
            const newNotification: Notification = {
                id: new Date().toISOString() + Math.random(),
                message: `Admin updated details for employee: ${updatedEmployee.name} (Farm: ${updatedEmployee.farmNo}).`,
                read: false,
                timestamp: new Date().toISOString(),
                targetRoles: ['Leadman', 'Supervisor'],
                targetFarms: [updatedEmployee.farmNo],
            };
            setNotifications(prev => [newNotification, ...prev].slice(0, 20));
        }
    }

    setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp).sort((a, b) => a.sN - b.sN));
    sendDataToGoogleSheet('Employee_Update', { employee: updatedEmployee });
  }, [currentUser, employees]);

  const handleDeleteEmployee = useCallback((employeeId: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    sendDataToGoogleSheet('Employee_Delete', { employeeId });
  }, []);

  const handleBulkDeleteEmployees = useCallback((employeeIds: string[]) => {
    setEmployees(prev => prev.filter(emp => !employeeIds.includes(emp.id)));
    sendDataToGoogleSheet('Employee_BulkDelete', { employeeIds, user: currentUser?.username });
  }, [currentUser]);
  
  const handleBulkImportEmployees = useCallback(async (csvData: string): Promise<{ success: boolean; message: string }> => {
    try {
        const lines = csvData.trim().replace(/\r\n/g, '\n').split('\n');
        if (lines.length < 2) {
            throw new Error("CSV file must have a header and at least one data row.");
        }

        const headerLine = lines.shift()!.trim().toLowerCase();
        const headers = headerLine.split(',').map(h => h.trim().replace(/[^a-z0-9]/gi, ''));

        const headerMap: { [key: string]: keyof Employee } = {
            'sn': 'sN',
            'gumboot': 'gumboot',
            'uniform': 'uniform',
            'jacket': 'jacket',
            'cost': 'cost',
            'comp': 'compNo',
            'compno': 'compNo',
            'sap': 'sapNo',
            'sapno': 'sapNo',
            'nameofthestaff': 'name',
            'name': 'name',
            'designation': 'designation',
            'sponsor': 'sponsor',
            'grade': 'grade',
            'nationality': 'nationality',
            'joiningdate': 'joiningDate',
            'farm': 'farmNo',
            'farmno': 'farmNo',
            'area': 'area',
            'iqamano': 'iqamaNo',
            'iqamaexpiry': 'iqamaExpiry',
            'passportno': 'passportNo',
            'passportexpiry': 'passportExpiry',
            'religion': 'religion',
            'mobileno': 'mobileNo',
        };
        
        const indices: { [key: string]: number } = {};
        for(const key in headerMap) {
            const index = headers.indexOf(key);
            if (index !== -1) {
                indices[headerMap[key]] = index;
            }
        }

        if (indices['sapNo'] === undefined && indices['compNo'] === undefined) {
            throw new Error("CSV must contain 'Sap #' or 'Comp #' column to identify employees.");
        }

        const existingSapNos = new Set(employees.map(e => e.sapNo));
        const newEmployees: Employee[] = [];
        let processedRows = 0;
        let skippedRows = 0;

        for (const line of lines) {
            if (!line.trim()) continue;
            const values = line.split(',');
            
            const sapNo = values[indices['sapNo']]?.trim();
            if (!sapNo) {
                console.warn(`Skipping row without SAP #: ${line}`);
                skippedRows++;
                continue;
            }

            if (existingSapNos.has(sapNo)) {
                 console.warn(`Skipping duplicate employee with SAP #: ${sapNo}`);
                 skippedRows++;
                 continue;
            }

            const newEmployee: Partial<Employee> = { id: new Date().toISOString() + Math.random() };

            for (const key in indices) {
                const csvIndex = indices[key as keyof Employee];
                if (values[csvIndex] !== undefined) {
                    let value: string | number = values[csvIndex].trim();
                    if (key === 'joiningDate' || key === 'iqamaExpiry' || key === 'passportExpiry') {
                        value = formatDateToYMD(value as string);
                    } else if (key === 'sN') {
                        value = parseInt(value as string, 10) || 0;
                    }
                    (newEmployee as any)[key] = value;
                }
            }
            
            newEmployees.push(newEmployee as Employee);
            existingSapNos.add(sapNo); // Add to set to handle duplicates within the same file
            processedRows++;
        }

        if (processedRows === 0) {
            throw new Error("No new, valid employee data found to import.");
        }

        setEmployees(prev => [...prev, ...newEmployees].sort((a,b) => a.sN - b.sN));
        
        const message = `Successfully imported ${processedRows} new employees. Skipped ${skippedRows} rows (duplicates or invalid).`;
        return { success: true, message };

    } catch (error) {
        console.error("Bulk import failed:", error);
        return { success: false, message: error instanceof Error ? error.message : "An unknown error occurred." };
    }
  }, [employees]);

  // Data Import/Export
  const handleExportData = useCallback(() => {
    const appState = {
        users,
        allFarmsData,
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
        isMaintenanceMode,
      };
    const dataStr = JSON.stringify(appState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `poultry-farm-data-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [
    users,
    allFarmsData,
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
    isMaintenanceMode,
  ]);

  const handleImportData = useCallback(async (jsonData: string): Promise<boolean> => {
    try {
        const importedState = JSON.parse(jsonData);
        
        if (!importedState || typeof importedState !== 'object') {
            throw new Error("Invalid file format.");
        }
        
        // Merge imported users with the initial users to ensure new roles are always present.
        const importedUsers: User[] = importedState.users || [];
        // Create a map of the default users for easy lookup and update, using username as the key.
        const mergedUserMap = new Map(INITIAL_USERS.map(u => [u.username, u]));

        // Iterate through imported users. Update existing ones or add new ones.
        for (const importedUser of importedUsers) {
            // Use the username as the unique key for merging.
            // This will overwrite defaults with imported data if usernames match,
            // and add any new users from the import file.
            mergedUserMap.set(importedUser.username, { ...(mergedUserMap.get(importedUser.username) || {}), ...importedUser });
        }
        
        setUsers(Array.from(mergedUserMap.values()));
        
        const importedCycles = importedState.cycles || [];

        // Apply non-migratable data
        setAllFarmsData(importedState.allFarmsData || getInitialData());
        setAllFarmsFeedOrders(importedState.allFarmsFeedOrders || getInitialFeedOrderData());
        setAllFarmsFeedDeliveryData(importedState.allFarmsFeedDeliveryData || getInitialFeedDeliveryData());
        setCatchingProgramEntries(importedState.catchingProgramEntries || []);
        setDieselOrders(importedState.dieselOrders || []);
        setSubmittedFeedOrders(importedState.submittedFeedOrders || []);
        setCycles(importedCycles);
        setNotifications(importedState.notifications || []);
        setLeaveRequests(importedState.leaveRequests || []);
        setSepticTankRequests(importedState.septicTankRequests || []);
        setEmployees(importedState.employees || INITIAL_EMPLOYEES);
        setFeedBulkerRecords(importedState.feedBulkerRecords || []);
        setVehicleMovementLogs(importedState.vehicleMovementLogs || []);
        setInChargeTimeLogs(importedState.inChargeTimeLogs || []);
        setIsMaintenanceMode(importedState.isMaintenanceMode || false);

        // Apply migratable data with checks
        const chicksData = needsMigration(importedState.allFarmsChicksReceivingData)
            ? migratePerCycleData(importedState.allFarmsChicksReceivingData, importedCycles)
            : importedState.allFarmsChicksReceivingData;
        setAllFarmsChicksReceivingData(chicksData || getInitialChicksReceivingData());

        const weeklyWeightData = needsMigration(importedState.allFarmsWeeklyWeightData)
            ? migratePerCycleData(importedState.allFarmsWeeklyWeightData, importedCycles)
            : importedState.allFarmsWeeklyWeightData;
        setAllFarmsWeeklyWeightData(weeklyWeightData || getInitialWeeklyWeightData());

        const chicksGradingData = needsMigration(importedState.allFarmsChicksGradingData)
            ? migratePerCycleData(importedState.allFarmsChicksGradingData, importedCycles)
            : importedState.allFarmsChicksGradingData;
        setAllFarmsChicksGradingData(chicksGradingData || getInitialChicksGradingData());

        const catchingData = needsMigration(importedState.allFarmsCatchingDetailsData)
            ? migratePerCycleData(importedState.allFarmsCatchingDetailsData, importedCycles)
            : importedState.allFarmsCatchingDetailsData;
        setAllFarmsCatchingDetailsData(catchingData || getInitialCatchingDetailsData());

        const salmonellaData = needsMigration(importedState.allFarmsSalmonellaData)
            ? migratePerCycleData(importedState.allFarmsSalmonellaData, importedCycles)
            : importedState.allFarmsSalmonellaData;
        setAllFarmsSalmonellaData(salmonellaData || getInitialSalmonellaData());

        return true;
    } catch (error) {
        console.error("Failed to import data:", error);
        return false;
    }
  }, []);
  
  const handleBulkImportChicksReceiving = useCallback(async (csvData: string): Promise<{ success: boolean; message: string }> => {
    try {
        const lines = csvData.trim().replace(/\r\n/g, '\n').split('\n');
        if (lines.length < 2) {
            throw new Error("CSV file must have a header and at least one data row.");
        }

        const headerLine = lines.shift()!.trim().toLowerCase();
        const headers = headerLine.split(',').map(h => h.trim().replace(/[^a-z0-9]/gi, ''));

        const headerMap: { [key: string]: keyof ChicksReceivingHouseData | 'farm' | 'houseNo' } = {
            'farm': 'farm',
            'house': 'houseNo',
            'flock': 'flock',
            'breed': 'breed',
            'flockno': 'flockNo',
            'flockage': 'flockAge',
            'hatcheryno': 'hatcheryNo',
            'productionorderno': 'productionOrderNo',
            'placementdate': 'placementDate',
            'noofbox': 'noOfBox',
            'perboxchicks': 'perBoxChicks',
            'extrachicks': 'extraChicks',
            'doa': 'doa',
            'trialorcontrol': 'trialOrControl',
            '0dayweightg': 'zeroDayWeight',
            'zerodayweight': 'zeroDayWeight',
            'uniformity': 'uniformityPercent',
            'uniformitypercent': 'uniformityPercent',
        };
        
        const indices: { [key: string]: number } = {};
        for(const key in headerMap) {
            const index = headers.indexOf(key);
            if (index !== -1) {
                indices[headerMap[key]] = index;
            }
        }
        
        // If 'house' header was not found, but 'flock' was, use 'flock' for the house number.
        if (indices['houseNo'] === undefined && indices['flock'] !== undefined) {
            indices['houseNo'] = indices['flock'];
            // Unset flock property mapping since the header is now used for house number.
            delete indices['flock'];
        }

        if (indices['farm'] === undefined || indices['houseNo'] === undefined) {
            throw new Error("CSV must contain 'Farm' and 'House' (or 'Flock') columns.");
        }

        const newAllFarmsChicksReceivingData = JSON.parse(JSON.stringify(allFarmsChicksReceivingData));
        
        let processedRows = 0;
        const affectedFarms = new Set<string>();

        for (const line of lines) {
            if (!line.trim()) continue;
            const values = line.split(',');

            const farmName = values[indices['farm']].trim();
            const houseNo = parseInt(values[indices['houseNo']].trim(), 10);

            if (!farmName || isNaN(houseNo) || houseNo < 1) {
                console.warn(`Skipping invalid row: ${line}`);
                continue;
            }
            
            const activeFarmCycle = cycles
                .filter(c => c.farms.some(f => f.farmName === farmName && !f.finishDate))
                .sort((a, b) => b.id.localeCompare(a.id))[0];

            if (!activeFarmCycle) {
                console.warn(`Skipping row for farm ${farmName} as no active cycle was found.`);
                continue;
            }
            const cycleId = activeFarmCycle.id;
            const houseIndex = houseNo - 1;
            const houseCount = getHouseCountForFarm(farmName);
            if (houseIndex >= houseCount) {
                 console.warn(`Skipping row for farm ${farmName}, house ${houseNo} exceeds max house count of ${houseCount}.`);
                 continue;
            }

            if (!newAllFarmsChicksReceivingData[farmName]) {
                newAllFarmsChicksReceivingData[farmName] = [];
            }
            let cycleRecord = newAllFarmsChicksReceivingData[farmName].find((d: ChicksReceivingData) => d.cycleId === cycleId);
            if (!cycleRecord) {
                const farmCycleDetails = activeFarmCycle.farms.find(f => f.farmName === farmName)!;
                cycleRecord = createEmptyChicksReceivingDataForFarm(farmName, cycleId);
                cycleRecord.cycleNo = activeFarmCycle.cycleNo;
                cycleRecord.cropNo = farmCycleDetails.cropNo;
                newAllFarmsChicksReceivingData[farmName].push(cycleRecord);
            }
            
            const updatedHouse = cycleRecord.houses[houseIndex];

            for (const key in indices) {
                if (key !== 'farm' && key !== 'houseNo') {
                    const csvIndex = indices[key];
                    if (values[csvIndex] !== undefined) {
                        let value = values[csvIndex].trim();
                        if (key === 'placementDate') {
                            value = formatDateToYMD(value);
                        }
                        (updatedHouse as any)[key] = value;
                    }
                }
            }
            
            const noOfBox = parseFloat(updatedHouse.noOfBox) || 0;
            const perBoxChicks = parseFloat(updatedHouse.perBoxChicks) || 0;
            const extraChicks = parseFloat(updatedHouse.extraChicks) || 0;
            const doa = parseFloat(updatedHouse.doa) || 0;
            updatedHouse.grossChicksPlaced = ((noOfBox * perBoxChicks) + extraChicks).toString();
            updatedHouse.netChicksPlaced = (((noOfBox * perBoxChicks) + extraChicks) - doa).toString();
            updatedHouse.productionLine = PRODUCTION_LINE_MAP[farmName] || '';

            processedRows++;
            affectedFarms.add(farmName);
        }

        if (processedRows === 0) {
            throw new Error("No valid data rows found to import.");
        }

        setAllFarmsChicksReceivingData(newAllFarmsChicksReceivingData);
        
        return { success: true, message: `Successfully imported ${processedRows} records for farms: ${Array.from(affectedFarms).join(', ')}.` };

    } catch (error) {
        console.error("Bulk import failed:", error);
        return { success: false, message: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}, [allFarmsChicksReceivingData, cycles]);


  const handleToggleMaintenanceMode = useCallback((password: string): { success: boolean, message: string } => {
    if (currentUser?.role !== 'Admin' || !verifyAdminPassword(password)) {
      return { success: false, message: 'Invalid admin password.' };
    }
    const newMode = !isMaintenanceMode;
    setIsMaintenanceMode(newMode);
    sendDataToGoogleSheet('MaintenanceMode_Toggle', { enabled: newMode, user: currentUser.username });
    return { success: true, message: `Maintenance mode has been ${newMode ? 'enabled' : 'disabled'}.` };
  }, [isMaintenanceMode, currentUser, verifyAdminPassword]);


  // When user changes, if the current selected farm is not in their new list, select the first one.
  useEffect(() => {
    if (currentUser && currentUser.role !== 'Gate Keeper' && !currentUser.authorizedFarms.includes(selectedFarm)) {
      if (currentUser.authorizedFarms.length > 0) {
        setSelectedFarm(currentUser.authorizedFarms[0]);
      } else {
        setSelectedFarm('');
      }
    }
  }, [currentUser, selectedFarm]);

  const handleDataUpdate = useCallback((farmName: string, date: string, updatedData: FarmDailyData) => {
    const meta = {
      updatedBy: currentUser?.username || 'system',
      updatedAt: new Date().toISOString()
    };
    
    setAllFarmsData(prevData => {
      const farmReports = prevData[farmName] ? [...prevData[farmName]] : [];
      const reportIndex = farmReports.findIndex(report => report.date === date);
      
      const reportWithMeta: DailyReport = { ...updatedData, date, meta };

      if (reportIndex > -1) {
        // Update existing report
        farmReports[reportIndex] = reportWithMeta;
      } else {
        // Add new report
        farmReports.push(reportWithMeta);
        // Keep it sorted by date
        farmReports.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
      
      return {
        ...prevData,
        [farmName]: farmReports,
      };
    });
    sendDataToGoogleSheet('DailyReport_Update', { farmName, date, data: updatedData, meta, user: currentUser?.username });
  }, [currentUser]);

  const handleBulkUpdateDailyReports = useCallback((farmName: string, updates: { [date: string]: FarmDailyData }) => {
    const meta = {
      updatedBy: currentUser?.username || 'system',
      updatedAt: new Date().toISOString()
    };

    setAllFarmsData(prevData => {
      const farmReports = prevData[farmName] ? [...prevData[farmName]] : [];
      const reportsMap = new Map(farmReports.map(r => [r.date, r]));

      for (const [date, updatedData] of Object.entries(updates)) {
        reportsMap.set(date, { ...updatedData, date, meta });
        // Also send individual updates to the backend
        sendDataToGoogleSheet('DailyReport_Update', { farmName, date, data: updatedData, meta, user: currentUser?.username });
      }

      const newFarmReports = Array.from(reportsMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        ...prevData,
        [farmName]: newFarmReports,
      };
    });
  }, [currentUser]);

  const handleFeedDeliveryUpdate = useCallback((farmName: string, date: string, updatedData: FeedDeliveryRecordData, cycleId: string) => {
    setAllFarmsFeedDeliveryData(prevData => {
        const farmRecords = prevData[farmName] ? [...prevData[farmName]] : [];
        const recordIndex = farmRecords.findIndex(record => record.date === date);

        if (recordIndex > -1) {
            // Merge new data with existing data for the day
            const existingRecord = farmRecords[recordIndex];
            const mergedHouses = existingRecord.houses.map((house, index) => {
                const newHouseData = updatedData.houses[index];
                if (!newHouseData) return house;

                return {
                    starter: String(Number(house.starter || 0) + Number(newHouseData.starter || 0)),
                    growerCR: String(Number(house.growerCR || 0) + Number(newHouseData.growerCR || 0)),
                    growerPL: String(Number(house.growerPL || 0) + Number(newHouseData.growerPL || 0)),
                    finisher: String(Number(house.finisher || 0) + Number(newHouseData.finisher || 0)),
                };
            });
            farmRecords[recordIndex] = { ...existingRecord, houses: mergedHouses, cycleId: existingRecord.cycleId || cycleId };
        } else {
            farmRecords.push({ ...updatedData, date, cycleId });
            farmRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        return {
            ...prevData,
            [farmName]: farmRecords,
        };
    });
    sendDataToGoogleSheet('FeedDelivery_Update', { farmName, date, data: updatedData, user: currentUser?.username, cycleId });
  }, [currentUser]);
  
  const handleAddSubmittedFeedOrder = useCallback((farmName: string, orderData: FeedOrderData) => {
    if (!selectedFarmCycleDetails) {
        console.error("Cannot submit feed order: no cycle selected.");
        return;
    }
    const newOrder: SubmittedFeedOrder = {
        ...orderData,
        id: new Date().toISOString() + Math.random(),
        farmName,
        status: 'Submitted',
        cycleId: selectedFarmCycleDetails.cycleId,
    };
    setSubmittedFeedOrders(prevOrders => [newOrder, ...prevOrders]);

    // Reset the form for that farm after submission
    const houseCount = getHouseCountForFarm(farmName);
    const emptyFeedOrderItems: FeedOrderItem[] = Array.from({ length: houseCount }, (_, i) => ({
        houseNo: i + 1,
        deliveryDate: '',
        age: '',
        feedType: '',
        quantity: '',
    }));
    const emptyFeedOrder: FeedOrderData = {
        orderDate: '',
        deliveryDate: '',
        feedMillNo: '',
        items: emptyFeedOrderItems,
        remarks: '',
        priority: 'Normal',
    };

    setAllFarmsFeedOrders(prevData => ({
        ...prevData,
        [farmName]: emptyFeedOrder
    }));
    
    // Add notification for admin/supervisors
    const newNotification: Notification = {
      id: new Date().toISOString(),
      message: `Feed order received from ${farmName}.`,
      read: false,
      timestamp: new Date().toISOString(),
      targetRoles: ['Admin', 'Supervisor'],
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 20)); // Keep last 20

    sendDataToGoogleSheet('FeedOrder_Submit', { order: newOrder, user: currentUser?.username });

  }, [currentUser, selectedFarmCycleDetails]);

  const handleUpdateSubmittedFeedOrder = useCallback((orderId: string, farmName: string, data: FeedOrderData) => {
    setSubmittedFeedOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id !== orderId) return order;

        if (currentUser?.role === 'Admin') {
            const oldItems = order.items || [];
            const newItems = data.items || [];
            const addedStoNumbers: { houseNo: number; stoNo: string }[] = [];

            newItems.forEach((newItem, index) => {
                const oldItem = oldItems[index];
                if (newItem.stoNo && (!oldItem || !oldItem.stoNo)) {
                    if (newItem.quantity && parseFloat(newItem.quantity) > 0) {
                        addedStoNumbers.push({ houseNo: newItem.houseNo, stoNo: newItem.stoNo });
                    }
                }
            });

            if (addedStoNumbers.length > 0) {
                const stoDetails = addedStoNumbers.map(s => `H${s.houseNo}: ${s.stoNo}`).join(', ');
                const newNotification: Notification = {
                    id: new Date().toISOString() + Math.random(),
                    message: `STO Number added for ${farmName} feed order: ${stoDetails}.`,
                    read: false,
                    timestamp: new Date().toISOString(),
                    targetRoles: ['Leadman', 'Supervisor'],
                    targetFarms: [farmName],
                };
                setNotifications(prev => [newNotification, ...prev].slice(0, 20));
            }
        }

        const updatedOrderPayload: SubmittedFeedOrder = {
          ...order, // preserve original cycleId, deliveredQuantities, etc.
          ...data, // apply changes from form
          status: 'Submitted', // status is always 'Submitted' on an edit
        };

        // If after merging, there's still no cycleId (it was an old order), assign the current cycle.
        if (!updatedOrderPayload.cycleId && selectedFarmCycleDetails) {
            updatedOrderPayload.cycleId = selectedFarmCycleDetails.cycleId;
        }
        
        sendDataToGoogleSheet('FeedOrder_Update', { order: updatedOrderPayload, user: currentUser?.username });
        return updatedOrderPayload;
      })
    );
  }, [currentUser, selectedFarmCycleDetails]);

  const handleStartEditingFeedOrder = useCallback((order: SubmittedFeedOrder) => {
    const { id, farmName, status, cycleId, actualDeliveryDate, deliveredQuantities, ...orderData } = order;

    setAllFarmsFeedOrders(prev => ({
        ...prev,
        [farmName]: orderData as FeedOrderData
    }));

    setEditingFeedOrderId(id);
  }, []);

  const handleCancelEditingFeedOrder = useCallback(() => {
    if (!editingFeedOrderId) return;
    
    const orderBeingEdited = submittedFeedOrders.find(o => o.id === editingFeedOrderId);
    const farmName = orderBeingEdited?.farmName;

    if (farmName) {
        const houseCount = getHouseCountForFarm(farmName);
        const emptyFeedOrderItems: FeedOrderItem[] = Array.from({ length: houseCount }, (_, i) => ({
            houseNo: i + 1, deliveryDate: '', age: '', feedType: '', quantity: '',
        }));
        const emptyFeedOrder: FeedOrderData = {
            orderDate: '', deliveryDate: '', feedMillNo: '', items: emptyFeedOrderItems, remarks: '', priority: 'Normal',
        };
        setAllFarmsFeedOrders(prevData => ({ ...prevData, [farmName]: emptyFeedOrder }));
    }
    
    setEditingFeedOrderId(null);
  }, [editingFeedOrderId, submittedFeedOrders]);


  const handleConfirmFeedDelivery = useCallback((
    orderId: string,
    actualDeliveryDate: string,
    deliveryData: FeedDeliveryRecordData
  ) => {
    const orderToUpdate = submittedFeedOrders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    // 1. Update the order status and store delivered quantities
    setSubmittedFeedOrders(prevOrders =>
        prevOrders.map(order =>
            order.id === orderId ? { 
                ...order, 
                status: 'Delivered', 
                actualDeliveryDate,
                deliveredQuantities: deliveryData 
            } : order
        )
    );
    sendDataToGoogleSheet('FeedOrder_Confirm', { orderId, farmName: orderToUpdate.farmName, actualDeliveryDate, deliveredQuantities: deliveryData, user: currentUser?.username });

    // 2. Add/update the feed delivery record
    handleFeedDeliveryUpdate(orderToUpdate.farmName, actualDeliveryDate, deliveryData, orderToUpdate.cycleId);
  }, [submittedFeedOrders, handleFeedDeliveryUpdate, currentUser]);

  const handleUpdateConfirmedFeedDelivery = useCallback((
    orderId: string,
    newActualDeliveryDate: string,
    newDeliveryData: FeedDeliveryRecordData
  ) => {
    const orderToUpdate = submittedFeedOrders.find(o => o.id === orderId);
    if (!orderToUpdate || !orderToUpdate.actualDeliveryDate || !orderToUpdate.deliveredQuantities) {
      console.error("Cannot update delivery for an order without existing delivery data.");
      return;
    }
    
    const { farmName, actualDeliveryDate: oldActualDeliveryDate, deliveredQuantities: oldDeliveryData, cycleId } = orderToUpdate;

    // Update allFarmsFeedDeliveryData by subtracting old and adding new
    setAllFarmsFeedDeliveryData(prevData => {
      const allRecords = { ...prevData };
      const farmRecords = [...(allRecords[farmName] || [])];
      
      const recordsMap = new Map(farmRecords.map(r => [r.date, JSON.parse(JSON.stringify(r))]));

      // Subtract old data
      if (recordsMap.has(oldActualDeliveryDate)) {
          const record = recordsMap.get(oldActualDeliveryDate)!;
          record.houses = record.houses.map((house, index) => {
              const oldHouseData = oldDeliveryData.houses[index];
              return {
                  starter: String(Number(house.starter || 0) - Number(oldHouseData?.starter || 0)),
                  growerCR: String(Number(house.growerCR || 0) - Number(oldHouseData?.growerCR || 0)),
                  growerPL: String(Number(house.growerPL || 0) - Number(oldHouseData?.growerPL || 0)),
                  finisher: String(Number(house.finisher || 0) - Number(oldHouseData?.finisher || 0)),
              };
          });
      }
      
      // Add new data
      let newRecord = recordsMap.get(newActualDeliveryDate);
      if (newRecord) {
        newRecord.cycleId = newRecord.cycleId || cycleId;
      } else {
        newRecord = { date: newActualDeliveryDate, cycleId, ...createEmptyFeedDeliveryRecord(getHouseCountForFarm(farmName)) };
      }

      newRecord.houses = newRecord.houses.map((house, index) => {
          const newHouseData = newDeliveryData.houses[index];
          return {
              starter: String(Number(house.starter || 0) + Number(newHouseData?.starter || 0)),
              growerCR: String(Number(house.growerCR || 0) + Number(newHouseData?.growerCR || 0)),
              growerPL: String(Number(house.growerPL || 0) + Number(newHouseData?.growerPL || 0)),
              finisher: String(Number(house.finisher || 0) + Number(newHouseData?.finisher || 0)),
          };
      });
      recordsMap.set(newActualDeliveryDate, newRecord);

      const newFarmReports = Array.from(recordsMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      allRecords[farmName] = newFarmReports;
      return allRecords;
    });
    
    // Update the submitted order itself
    setSubmittedFeedOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { 
            ...order, 
            actualDeliveryDate: newActualDeliveryDate,
            deliveredQuantities: newDeliveryData
        } : order
      )
    );
    
    sendDataToGoogleSheet('FeedOrder_UpdateDelivery', { orderId, farmName, newActualDeliveryDate, newDeliveryData, user: currentUser?.username });

  }, [submittedFeedOrders, currentUser]);

  const handleChicksReceivingUpdate = useCallback((farmName: string, updatedData: ChicksReceivingData) => {
    if (!selectedFarmCycleDetails) return;
    const { cycleId } = selectedFarmCycleDetails;
    
    setAllFarmsChicksReceivingData(prevData => {
        const farmArray = prevData[farmName] ? [...prevData[farmName]] : [];
        const recordIndex = farmArray.findIndex(r => r.cycleId === cycleId);
        const oldRecord = recordIndex > -1 ? farmArray[recordIndex] : null;

        if (currentUser?.role === 'Admin' && oldRecord) {
            const additionalDetailFields: (keyof ChicksReceivingHouseData)[] = ['breed', 'flock', 'flockNo', 'flockAge', 'hatcheryNo', 'productionOrderNo', 'trialOrControl'];
            const newlyAddedDetails: { houseNo: number; details: string[] }[] = [];

            updatedData.houses.forEach((newHouse, index) => {
                const oldHouse = oldRecord.houses[index];
                const added: string[] = [];
                if (oldHouse) {
                    additionalDetailFields.forEach(field => {
                        if (newHouse[field] && !oldHouse[field]) {
                            added.push(field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
                        }
                    });
                }
                if (added.length > 0) {
                    newlyAddedDetails.push({ houseNo: index + 1, details: added });
                }
            });

            if (newlyAddedDetails.length > 0) {
                const detailsSummary = newlyAddedDetails.map(d => `H${d.houseNo}`).join(', ');
                const newNotification: Notification = {
                    id: new Date().toISOString() + Math.random(),
                    message: `Admin added additional chicks receiving details for ${farmName} (Houses: ${detailsSummary}).`,
                    read: false,
                    timestamp: new Date().toISOString(),
                    targetRoles: ['Leadman', 'Supervisor'],
                    targetFarms: [farmName],
                };
                setNotifications(prev => [newNotification, ...prev].slice(0, 20));
            }
        }

        const dataWithCorrectCycleId = { ...updatedData, cycleId };
        if (recordIndex > -1) {
            farmArray[recordIndex] = dataWithCorrectCycleId;
        } else {
            farmArray.push(dataWithCorrectCycleId);
        }
        return { ...prevData, [farmName]: farmArray };
    });

    const { cycleId: _cycleId, ...dataToSend } = updatedData;
    sendDataToGoogleSheet('ChicksReceiving_Update', { farmName, cycleId, data: dataToSend, user: currentUser?.username });
  }, [currentUser, selectedFarmCycleDetails]);

  const handleWeeklyWeightUpdate = useCallback((farmName: string, updatedData: WeeklyWeightData) => {
    if (!selectedFarmCycleDetails) return;
    const { cycleId } = selectedFarmCycleDetails;

    setAllFarmsWeeklyWeightData(prevData => {
        const farmArray = prevData[farmName] ? [...prevData[farmName]] : [];
        const recordIndex = farmArray.findIndex(r => r.cycleId === cycleId);
        const dataWithCorrectCycleId = { ...updatedData, cycleId };

        if (recordIndex > -1) {
            farmArray[recordIndex] = dataWithCorrectCycleId;
        } else {
            farmArray.push(dataWithCorrectCycleId);
        }
        return { ...prevData, [farmName]: farmArray };
    });
    
    const { cycleId: _cycleId, ...dataToSend } = updatedData;
    sendDataToGoogleSheet('WeeklyWeight_Update', { farmName, cycleId, data: dataToSend, user: currentUser?.username });
  }, [currentUser, selectedFarmCycleDetails]);

  const handleChicksGradingUpdate = useCallback((farmName: string, updatedData: ChicksGradingData) => {
    if (!selectedFarmCycleDetails) return;
    const { cycleId } = selectedFarmCycleDetails;
    
    setAllFarmsChicksGradingData(prevData => {
        const farmArray = prevData[farmName] ? [...prevData[farmName]] : [];
        const recordIndex = farmArray.findIndex(r => r.cycleId === cycleId);
        const dataWithCorrectCycleId = { ...updatedData, cycleId };

        if (recordIndex > -1) {
            farmArray[recordIndex] = dataWithCorrectCycleId;
        } else {
            farmArray.push(dataWithCorrectCycleId);
        }
        return { ...prevData, [farmName]: farmArray };
    });

    const { cycleId: _cycleId, ...dataToSend } = updatedData;
    sendDataToGoogleSheet('ChicksGrading_Update', { farmName, cycleId, data: dataToSend, user: currentUser?.username });
  }, [currentUser, selectedFarmCycleDetails]);

  const handleUpdateCatchingDetails = useCallback((farmName: string, updatedData: CatchingDetailsData) => {
    if (!selectedFarmCycleDetails) return;
    const { cycleId } = selectedFarmCycleDetails;

    setAllFarmsCatchingDetailsData(prevData => {
        const farmArray = prevData[farmName] ? [...prevData[farmName]] : [];
        const recordIndex = farmArray.findIndex(r => r.cycleId === cycleId);
        const dataWithCorrectCycleId = { ...updatedData, cycleId };
        
        if (recordIndex > -1) {
            farmArray[recordIndex] = dataWithCorrectCycleId;
        } else {
            farmArray.push(dataWithCorrectCycleId);
        }
        return { ...prevData, [farmName]: farmArray };
    });
    
    const { cycleId: _cycleId, ...dataToSend } = updatedData;
    sendDataToGoogleSheet('CatchingDetails_Update', { farmName, cycleId, data: dataToSend, user: currentUser?.username });
  }, [currentUser, selectedFarmCycleDetails]);

  const handleSalmonellaUpdate = useCallback((farmName: string, updatedData: SalmonellaData) => {
    if (!selectedFarmCycleDetails) return;
    const { cycleId } = selectedFarmCycleDetails;

    setAllFarmsSalmonellaData(prevData => {
        const farmArray = prevData[farmName] ? [...prevData[farmName]] : [];
        const recordIndex = farmArray.findIndex(r => r.cycleId === cycleId);
        const dataWithCorrectCycleId = { ...updatedData, cycleId };

        if (recordIndex > -1) {
            farmArray[recordIndex] = dataWithCorrectCycleId;
        } else {
            farmArray.push(dataWithCorrectCycleId);
        }
        return { ...prevData, [farmName]: farmArray };
    });
    
    const { cycleId: _cycleId, ...dataToSend } = updatedData;
    sendDataToGoogleSheet('Salmonella_Update', { farmName, cycleId, data: dataToSend, user: currentUser?.username });
  }, [currentUser, selectedFarmCycleDetails]);
  
  const handleUpdateCatchingProgramEntries = useCallback((entriesForActiveCycle: CatchingProgramEntry[]) => {
    if (!activeCycle) return;
    const activeCycleId = activeCycle.id;

    setCatchingProgramEntries(prevGlobalEntries => {
        const otherEntries = prevGlobalEntries.filter(e => e.cycleId !== activeCycleId);
        const newGlobalEntries = [...otherEntries, ...entriesForActiveCycle];
        // Send the complete updated list to Google Sheets
        sendDataToGoogleSheet('CatchingProgram_UpdateAll', { entries: newGlobalEntries, user: currentUser?.username });
        return newGlobalEntries;
    });
  }, [currentUser, activeCycle]);

  const handleAddDieselOrder = useCallback((order: Omit<DieselOrder, 'id' | 'status'>) => {
    const newOrder: DieselOrder = {
      ...order,
      id: new Date().toISOString() + Math.random(),
      status: 'Pending',
    };
    setDieselOrders(prevOrders => [newOrder, ...prevOrders]);
    
    // Add notification for admin/supervisors
    const newNotification: Notification = {
      id: new Date().toISOString(),
      message: `Diesel order received from ${newOrder.farmName} for ${newOrder.quantity} Liters.`,
      read: false,
      timestamp: new Date().toISOString(),
      targetRoles: ['Admin', 'Supervisor'],
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 20)); // Keep last 20
    
    sendDataToGoogleSheet('DieselOrder_Add', { order: newOrder, user: currentUser?.username });
  }, [currentUser]);

  const handleUpdateDieselOrderStatus = useCallback((orderId: string, status: 'Completed', receivedDate: string) => {
    setDieselOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status, receivedDate } : order
      )
    );
    sendDataToGoogleSheet('DieselOrder_UpdateStatus', { orderId, status, receivedDate, user: currentUser?.username });
  }, [currentUser]);

  const handleAddDieselOrderReservation = useCallback((orderId: string, reservationNumber: string) => {
    let orderFarmName = '';
    setDieselOrders(prevOrders =>
        prevOrders.map(order => {
            if (order.id === orderId) {
                orderFarmName = order.farmName;
                return { ...order, reservationNumber };
            }
            return order;
        })
    );
    
    if (currentUser?.role === 'Admin' && orderFarmName) {
        const newNotification: Notification = {
            id: new Date().toISOString() + Math.random(),
            message: `Reservation no. ${reservationNumber} added for diesel order from ${orderFarmName}.`,
            read: false,
            timestamp: new Date().toISOString(),
            targetRoles: ['Leadman', 'Supervisor'],
            targetFarms: [orderFarmName],
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 20));
    }

    sendDataToGoogleSheet('DieselOrder_AddReservation', { orderId, reservationNumber, user: currentUser?.username });
  }, [currentUser]);
  
  const handleMarkNotificationsAsRead = useCallback(() => {
    // This only marks the event-based notifications as read
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const handleAddLeaveRequest = useCallback((request: Omit<LeaveRequest, 'id' | 'status' | 'requestedAt' | 'userId' | 'username'>) => {
    if (!currentUser) return;
    const newRequest: LeaveRequest = {
        ...request,
        id: new Date().toISOString() + Math.random(),
        userId: currentUser.id,
        username: currentUser.username,
        status: 'Pending',
        requestedAt: new Date().toISOString(),
    };
    setLeaveRequests(prev => [newRequest, ...prev].sort((a,b) => b.requestedAt.localeCompare(a.requestedAt)));
    sendDataToGoogleSheet('LeaveRequest_Add', { request: newRequest, user: currentUser.username });

    const newNotification: Notification = {
      id: new Date().toISOString(),
      message: `Leave request received from ${currentUser.name}.`,
      read: false,
      timestamp: new Date().toISOString(),
      targetRoles: ['Admin'],
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 20));

  }, [currentUser]);

  const handleUpdateLeaveRequestStatus = useCallback((requestId: string, status: 'Approved' | 'Rejected', rejectionReason?: string) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    setLeaveRequests(prev => prev.map(req => {
        if (req.id === requestId) {
            const updatedRequest = {
                ...req,
                status,
                reviewedBy: currentUser.username,
                reviewedAt: new Date().toISOString(),
                rejectionReason: status === 'Rejected' ? rejectionReason : undefined,
            };
            sendDataToGoogleSheet('LeaveRequest_UpdateStatus', { request: updatedRequest, user: currentUser.username });
            return updatedRequest;
        }
        return req;
    }));
  }, [currentUser]);
  
  const handleAddSepticTankRequest = useCallback((request: Omit<SepticTankRequest, 'id' | 'status' | 'submittedAt'>) => {
    if (!currentUser) return;
    const newRequest: SepticTankRequest = {
        ...request,
        id: new Date().toISOString() + Math.random(),
        status: 'Pending',
        submittedAt: new Date().toISOString(),
    };
    setSepticTankRequests(prev => [newRequest, ...prev]);
    sendDataToGoogleSheet('SepticTankRequest_Add', { request: newRequest, user: currentUser.username });

    const newNotification: Notification = {
      id: new Date().toISOString(),
      message: `Septic Tank service requested by ${request.requestedBy} for ${request.farmName}.`,
      read: false,
      timestamp: new Date().toISOString(),
      targetRoles: ['Admin', 'Supervisor'],
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 20));

  }, [currentUser]);
  
  const handleUpdateSepticTankRequestStatus = useCallback((requestId: string, status: 'Completed') => {
    setSepticTankRequests(prev => prev.map(req => {
        if (req.id === requestId) {
            const updatedRequest = { ...req, status };
            sendDataToGoogleSheet('SepticTankRequest_UpdateStatus', { requestId, status, user: currentUser?.username });
            return updatedRequest;
        }
        return req;
    }));
  }, [currentUser]);

  const handleAddFeedBulkerRecord = useCallback((record: Omit<FeedBulkerRecord, 'id' | 'meta'>) => {
    if (!currentUser) return;
    const newRecord: FeedBulkerRecord = {
        ...record,
        id: new Date().toISOString() + Math.random(),
        meta: { createdBy: currentUser.username, createdAt: new Date().toISOString(), updatedBy: currentUser.username, updatedAt: new Date().toISOString() }
    };
    setFeedBulkerRecords(prev => [...prev, newRecord].sort((a, b) => b.date.localeCompare(a.date) || b.entryTime.localeCompare(a.entryTime)));
    sendDataToGoogleSheet('FeedBulker_Add', { record: newRecord, user: currentUser.username });
  }, [currentUser]);

  // Fix: Explicitly construct the meta object to ensure it conforms to the CreationAuditInfo type,
  // which requires createdBy and createdAt properties. This resolves a TypeScript error when rec.meta is potentially undefined,
  // and fixes a potential runtime error.
  const handleUpdateFeedBulkerRecord = useCallback((updatedRecord: FeedBulkerRecord) => {
    if (!currentUser) return;
    setFeedBulkerRecords(prev =>
        prev.map(rec => {
            if (rec.id === updatedRecord.id) {
                const newMeta: CreationAuditInfo = {
                    createdBy: rec.meta?.createdBy || 'system',
                    createdAt: rec.meta?.createdAt || new Date().toISOString(),
                    updatedBy: currentUser.username,
                    updatedAt: new Date().toISOString()
                };
                return { ...updatedRecord, meta: newMeta };
            }
            return rec;
        }
        ).sort((a, b) => b.date.localeCompare(a.date) || (b.entryTime || '').localeCompare(a.entryTime || ''))
    );
    sendDataToGoogleSheet('FeedBulker_Update', { record: updatedRecord, user: currentUser.username });
  }, [currentUser]);

  const handleAddVehicleMovementLog = useCallback((log: Omit<VehicleMovementLog, 'id' | 'meta' | 'timestamp'>) => {
    if (!currentUser) return;
    const newLog: VehicleMovementLog = {
        ...log,
        id: new Date().toISOString() + Math.random(),
        timestamp: new Date().toISOString(),
        meta: { createdBy: currentUser.username, createdAt: new Date().toISOString(), updatedBy: currentUser.username, updatedAt: new Date().toISOString() }
    };
    setVehicleMovementLogs(prev => [newLog, ...prev]);
    sendDataToGoogleSheet('VehicleMovement_Add', { log: newLog, user: currentUser.username });
  }, [currentUser]);

  // Fix: Explicitly construct the meta object to prevent a potential runtime error if meta is undefined
  // and to ensure the object conforms to the CreationAuditInfo type.
  const handleAddOrUpdateInChargeTimeLog = useCallback((log: Omit<InChargeTimeLog, 'id' | 'meta'> & { id?: string }) => {
    if (!currentUser) return;
    setInChargeTimeLogs(prev => {
        const existingIndex = prev.findIndex(l => l.date === log.date && l.inchargeId === log.inchargeId);
        if (existingIndex > -1) {
            // Update
            const updatedLogs = [...prev];
            const existingLog = updatedLogs[existingIndex];
            const newMeta: CreationAuditInfo = {
                createdBy: existingLog.meta?.createdBy || 'system',
                createdAt: existingLog.meta?.createdAt || new Date().toISOString(),
                updatedBy: currentUser.username,
                updatedAt: new Date().toISOString()
            };
            const updatedLog = { ...existingLog, ...log, meta: newMeta };
            updatedLogs[existingIndex] = updatedLog;
            sendDataToGoogleSheet('InChargeTimeLog_Update', { log: updatedLog, user: currentUser.username });
            return updatedLogs;
        } else {
            // Add
            const newLog: InChargeTimeLog = {
                ...log,
                id: new Date().toISOString() + Math.random(),
                meta: { createdBy: currentUser.username, createdAt: new Date().toISOString(), updatedBy: currentUser.username, updatedAt: new Date().toISOString() }
            };
            sendDataToGoogleSheet('InChargeTimeLog_Add', { log: newLog, user: currentUser.username });
            return [newLog, ...prev];
        }
    });
  }, [currentUser]);


  // Filter all data based on the current user's authorized farms
  const authorizedFarmsData = useMemo(() => {
    if (!currentUser || currentUser.role === 'Gate Keeper') return allFarmsData;
    const filteredData: AllFarmsData = {};
    for (const farm of currentUser.authorizedFarms) {
      if (allFarmsData[farm]) {
        filteredData[farm] = allFarmsData[farm];
      }
    }
    return filteredData;
  }, [allFarmsData, currentUser]);

  const authorizedFarmsFeedOrders = useMemo(() => {
    if (!currentUser || currentUser.role === 'Gate Keeper') return allFarmsFeedOrders;
    const filteredData: AllFarmsFeedOrders = {};
    for (const farm of currentUser.authorizedFarms) {
      if (allFarmsFeedOrders[farm]) {
        filteredData[farm] = allFarmsFeedOrders[farm];
      }
    }
    return filteredData;
  }, [allFarmsFeedOrders, currentUser]);

  const authorizedFarmsChicksReceivingData = useMemo(() => {
    if (!currentUser || currentUser.role === 'Gate Keeper') return allFarmsChicksReceivingData;
    const filteredData: AllFarmsChicksReceivingData = {};
    for (const farm of currentUser.authorizedFarms) {
      if (allFarmsChicksReceivingData[farm]) {
        filteredData[farm] = allFarmsChicksReceivingData[farm];
      }
    }
    return filteredData;
  }, [allFarmsChicksReceivingData, currentUser]);

  const authorizedFarmsWeeklyWeightData = useMemo(() => {
    if (!currentUser || currentUser.role === 'Gate Keeper') return allFarmsWeeklyWeightData;
    const filteredData: AllFarmsWeeklyWeightData = {};
    for (const farm of currentUser.authorizedFarms) {
        if (allFarmsWeeklyWeightData[farm]) {
            filteredData[farm] = allFarmsWeeklyWeightData[farm];
        }
    }
    return filteredData;
  }, [allFarmsWeeklyWeightData, currentUser]);

  const authorizedFarmsChicksGradingData = useMemo(() => {
    if (!currentUser || currentUser.role === 'Gate Keeper') return allFarmsChicksGradingData;
    const filteredData: AllFarmsChicksGradingData = {};
    for (const farm of currentUser.authorizedFarms) {
        if (allFarmsChicksGradingData[farm]) {
            filteredData[farm] = allFarmsChicksGradingData[farm];
        }
    }
    return filteredData;
  }, [allFarmsChicksGradingData, currentUser]);

  const authorizedFarmsFeedDeliveryData = useMemo(() => {
    if (!currentUser || currentUser.role === 'Gate Keeper') return allFarmsFeedDeliveryData;
    const filteredData: AllFarmsFeedDeliveryData = {};
    for (const farm of currentUser.authorizedFarms) {
        if (allFarmsFeedDeliveryData[farm]) {
            filteredData[farm] = allFarmsFeedDeliveryData[farm];
        }
    }
    return filteredData;
  }, [allFarmsFeedDeliveryData, currentUser]);
  
  const authorizedFarmsCatchingDetailsData = useMemo(() => {
    if (!currentUser || currentUser.role === 'Gate Keeper') return allFarmsCatchingDetailsData;
    const filteredData: AllFarmsCatchingDetailsData = {};
    for (const farm of currentUser.authorizedFarms) {
        if (allFarmsCatchingDetailsData[farm]) {
            filteredData[farm] = allFarmsCatchingDetailsData[farm];
        }
    }
    return filteredData;
  }, [allFarmsCatchingDetailsData, currentUser]);

  const authorizedFarmsSalmonellaData = useMemo(() => {
    if (!currentUser || currentUser.role === 'Gate Keeper') return allFarmsSalmonellaData;
    const filteredData: AllFarmsSalmonellaData = {};
    for (const farm of currentUser.authorizedFarms) {
        if (allFarmsSalmonellaData[farm]) {
            filteredData[farm] = allFarmsSalmonellaData[farm];
        }
    }
    return filteredData;
  }, [allFarmsSalmonellaData, currentUser]);
  

  // Derive data for the selected farm from the authorized subset, FILTERED BY CYCLE
  const selectedFarmDailyReports = useMemo(() => {
    if (!selectedFarm || !selectedFarmCycleDetails?.startDate) return [];
    
    const farmData = authorizedFarmsData[selectedFarm] || [];
    const startDate = new Date(selectedFarmCycleDetails.startDate.replace(/-/g, '/'));
    // Set end of day for finishDate to include all reports on that day
    const finishDate = selectedFarmCycleDetails.finishDate 
      ? new Date(new Date(selectedFarmCycleDetails.finishDate.replace(/-/g, '/')).setHours(23, 59, 59, 999))
      : new Date('9999-12-31');

    return farmData.filter(report => {
        const reportDate = new Date(report.date.replace(/-/g, '/'));
        return reportDate >= startDate && reportDate <= finishDate;
    });
  }, [authorizedFarmsData, selectedFarm, selectedFarmCycleDetails]);
  
  const selectedFarmFeedOrderData = useMemo(() => {
    if (!selectedFarm) return null;
    return authorizedFarmsFeedOrders[selectedFarm];
  }, [authorizedFarmsFeedOrders, selectedFarm]);

  const selectedFarmChicksReceivingData = useMemo(() => {
    if (!selectedFarm || !selectedFarmCycleDetails) {
      return createEmptyChicksReceivingDataForFarm(selectedFarm, '');
    }
    const farmData = authorizedFarmsChicksReceivingData[selectedFarm];
    const farmDataArray = Array.isArray(farmData) ? farmData : [];
    const cycleData = farmDataArray.find(d => d.cycleId === selectedFarmCycleDetails.cycleId);
    
    return cycleData || createEmptyChicksReceivingDataForFarm(selectedFarm, selectedFarmCycleDetails.cycleId);
  }, [authorizedFarmsChicksReceivingData, selectedFarm, selectedFarmCycleDetails]);

  const selectedFarmWeeklyWeightData = useMemo(() => {
    if (!selectedFarm || !selectedFarmCycleDetails) {
        return createEmptyWeeklyWeightDataForFarm(selectedFarm, '');
    }
    const farmData = authorizedFarmsWeeklyWeightData[selectedFarm];
    const farmDataArray = Array.isArray(farmData) ? farmData : [];
    const cycleData = farmDataArray.find(d => d.cycleId === selectedFarmCycleDetails.cycleId);
    
    return cycleData || createEmptyWeeklyWeightDataForFarm(selectedFarm, selectedFarmCycleDetails.cycleId);
  }, [authorizedFarmsWeeklyWeightData, selectedFarm, selectedFarmCycleDetails]);

  const selectedFarmChicksGradingData = useMemo(() => {
    if (!selectedFarm || !selectedFarmCycleDetails) {
        return createEmptyChicksGradingDataForFarm(selectedFarm, '');
    }
    const farmData = authorizedFarmsChicksGradingData[selectedFarm];
    const farmDataArray = Array.isArray(farmData) ? farmData : [];
    const cycleData = farmDataArray.find(d => d.cycleId === selectedFarmCycleDetails.cycleId);
    
    return cycleData || createEmptyChicksGradingDataForFarm(selectedFarm, selectedFarmCycleDetails.cycleId);
  }, [allFarmsChicksGradingData, selectedFarm, selectedFarmCycleDetails]);

  const selectedFarmFeedDeliveryRecords = useMemo(() => {
    if (!selectedFarm || !selectedFarmCycleDetails) return [];
    
    const farmData = authorizedFarmsFeedDeliveryData[selectedFarm] || [];
    const { cycleId } = selectedFarmCycleDetails;
      
    // Filter strictly by cycleId to prevent data from other cycles from appearing.
    return farmData.filter(record => record.cycleId === cycleId);
  }, [authorizedFarmsFeedDeliveryData, selectedFarm, selectedFarmCycleDetails]);

  const selectedFarmCatchingDetailsData = useMemo(() => {
    if (!selectedFarm || !selectedFarmCycleDetails) {
        return createEmptyCatchingDetailsDataForFarm(selectedFarm, '');
    }
    const farmData = authorizedFarmsCatchingDetailsData[selectedFarm];
    const farmDataArray = Array.isArray(farmData) ? farmData : [];
    const cycleData = farmDataArray.find(d => d.cycleId === selectedFarmCycleDetails.cycleId);
    
    return cycleData || createEmptyCatchingDetailsDataForFarm(selectedFarm, selectedFarmCycleDetails.cycleId);
  }, [authorizedFarmsCatchingDetailsData, selectedFarm, selectedFarmCycleDetails]);
  
  const selectedFarmSalmonellaData = useMemo(() => {
    if (!selectedFarm || !selectedFarmCycleDetails) {
        return createEmptySalmonellaDataForFarm(selectedFarm, '');
    }
    const farmData = authorizedFarmsSalmonellaData[selectedFarm];
    const farmDataArray = Array.isArray(farmData) ? farmData : [];
    const cycleData = farmDataArray.find(d => d.cycleId === selectedFarmCycleDetails.cycleId);
    
    return cycleData || createEmptySalmonellaDataForFarm(selectedFarm, selectedFarmCycleDetails.cycleId);
  }, [authorizedFarmsSalmonellaData, selectedFarm, selectedFarmCycleDetails]);

  // Filter diesel orders for list/report views
  const visibleDieselOrders = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    if (currentUser.role === 'Gate Keeper') {
        return dieselOrders;
    }
    return dieselOrders.filter(order => 
      currentUser.authorizedFarms.includes(order.farmName)
    );
  }, [dieselOrders, currentUser]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen poultry-background">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800">Loading Application Data...</h2>
            <p className="text-gray-600 mt-2">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  if (isMaintenanceMode && currentUser && currentUser.role !== 'Admin') {
      return <MaintenanceScreen onLogout={handleLogout} />;
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} isMaintenanceMode={isMaintenanceMode} />;
  }

  if (currentUser.role !== 'Gate Keeper' && currentUser.authorizedFarms.length === 0) {
      return (
          <div className="flex items-center justify-center min-h-screen poultry-background">
              <div className="text-center p-8 bg-white rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold text-gray-800">No Farms Assigned</h2>
                  <p className="text-gray-600 mt-2">You do not have any farms assigned to your profile.</p>
                  <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Log Out
                  </button>
              </div>
          </div>
      );
  }

  if (currentUser.role !== 'Gate Keeper' && (!selectedFarm || !selectedFarmFeedOrderData || !selectedFarmChicksReceivingData || !selectedFarmWeeklyWeightData || !selectedFarmChicksGradingData || !selectedFarmCatchingDetailsData || !selectedFarmSalmonellaData)) {
      return (
           <div className="flex items-center justify-center min-h-screen poultry-background">
              <div className="text-center p-8 bg-white rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold text-gray-800">Loading Farm Data...</h2>
                  <p className="text-gray-600 mt-2">Please wait a moment.</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen poultry-background font-sans">
      <main className="w-full max-w-screen-2xl mx-auto p-4 sm:p-6 md:p-8">
          <Dashboard
              key={selectedFarm + selectedCycleId}
              currentUser={currentUser}
              onLogout={handleLogout}
              farms={currentUser.authorizedFarms}
              selectedFarm={selectedFarm}
              onSelectFarm={setSelectedFarm}
              cyclesForSelectedFarm={cyclesForSelectedFarm}
              selectedCycleId={selectedCycleId}
              onSelectCycle={setSelectedCycleId}
              dailyReports={selectedFarmDailyReports}
              feedOrderData={selectedFarmFeedOrderData}
              chicksReceivingData={selectedFarmChicksReceivingData}
              weeklyWeightData={selectedFarmWeeklyWeightData}
              chicksGradingData={selectedFarmChicksGradingData}
              feedDeliveryRecords={selectedFarmFeedDeliveryRecords}
              catchingDetailsData={selectedFarmCatchingDetailsData}
              salmonellaData={selectedFarmSalmonellaData}
              catchingProgramEntries={catchingProgramEntries}
              dieselOrders={visibleDieselOrders}
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
              editingFeedOrderId={editingFeedOrderId}
              onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
              onStartNewCycle={handleStartNewCycle}
              onUpdateFarmCycleDetails={handleUpdateFarmCycleDetails}
              onFinishFarmCycle={handleFinishFarmCycle}
              onReopenFarmCycle={handleReopenFarmCycle}
              onVerifyAdminPassword={verifyAdminPassword}
              onUpdateData={handleDataUpdate}
              onBulkUpdateDailyReports={handleBulkUpdateDailyReports}
              onAddSubmittedFeedOrder={handleAddSubmittedFeedOrder}
              onUpdateSubmittedFeedOrder={handleUpdateSubmittedFeedOrder}
              onStartEditingFeedOrder={handleStartEditingFeedOrder}
              onCancelEditingFeedOrder={handleCancelEditingFeedOrder}
              onConfirmFeedDelivery={handleConfirmFeedDelivery}
              onUpdateConfirmedFeedDelivery={handleUpdateConfirmedFeedDelivery}
              onUpdateChicksReceiving={handleChicksReceivingUpdate}
              onUpdateWeeklyWeight={handleWeeklyWeightUpdate}
              onUpdateChicksGrading={handleChicksGradingUpdate}
              onUpdateCatchingDetails={handleUpdateCatchingDetails}
              onUpdateSalmonella={handleSalmonellaUpdate}
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
              allAuthorizedFarmsData={authorizedFarmsData}
              allAuthorizedFarmsChicksReceivingData={authorizedFarmsChicksReceivingData}
              allAuthorizedFarmsWeeklyWeightData={authorizedFarmsWeeklyWeightData}
              allAuthorizedFarmsChicksGradingData={authorizedFarmsChicksGradingData}
              allAuthorizedFarmsFeedDeliveryData={authorizedFarmsFeedDeliveryData}
              allAuthorizedFarmsCatchingDetailsData={authorizedFarmsCatchingDetailsData}
              allAuthorizedFarmsSalmonellaData={authorizedFarmsSalmonellaData}
              users={users}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
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
