import { FARM_NAMES, getHouseCountForFarm, PRODUCTION_LINE_MAP } from '../constants';
import type { AllFarmsData, FeedOrderData, FeedOrderItem, AllFarmsChicksReceivingData, ChicksReceivingData, ChicksReceivingHouseData, AllFarmsWeeklyWeightData, WeeklyWeightData, WeeklyWeightHouseData, AllFarmsFeedDeliveryData, FeedDeliveryRecordData, AllFarmsCatchingDetailsData, CatchingDetailsData, CatchingDetailsHouseData, AllFarmsSalmonellaData, SalmonellaData, SalmonellaHouseStatus, AllFarmsFeedOrders, ChicksGradingData, ChicksGradingHouseData, AllFarmsChicksGradingData } from '../types';

export const getInitialData = (): AllFarmsData => {
  const initialData: AllFarmsData = {};
  
  FARM_NAMES.forEach(farmName => {
    initialData[farmName] = []; // Initialize with an empty array for daily reports
  });

  return initialData;
};


export const getInitialFeedOrderData = (): AllFarmsFeedOrders => {
  const initialData: AllFarmsFeedOrders = {};

  FARM_NAMES.forEach(farmName => {
      const houseCount = getHouseCountForFarm(farmName);
      const emptyFeedOrderItems: FeedOrderItem[] = Array.from({ length: houseCount }, (_, i) => ({
          houseNo: i + 1,
          deliveryDate: '',
          age: '',
          feedType: '',
          quantity: '',
          stoNo: '',
      }));

      const emptyFeedOrder: FeedOrderData = {
          orderDate: '',
          deliveryDate: '',
          feedMillNo: '',
          items: emptyFeedOrderItems,
          remarks: '',
          priority: 'Normal',
      };
      initialData[farmName] = emptyFeedOrder;
  });

  return initialData;
}

export const createEmptyChicksReceivingDataForFarm = (farmName: string, cycleId: string): ChicksReceivingData => {
  const houseCount = getHouseCountForFarm(farmName);
  const emptyHouseData: ChicksReceivingHouseData[] = Array(houseCount).fill(null).map(() => ({
    placementDate: '',
    noOfBox: '',
    perBoxChicks: '',
    extraChicks: '',
    doa: '',
    zeroDayWeight: '',
    uniformityPercent: '',
    grossChicksPlaced: '0',
    netChicksPlaced: '0',
    breed: '',
    flock: '',
    flockNo: '',
    flockAge: '',
    hatcheryNo: '',
    productionOrderNo: '',
    productionLine: PRODUCTION_LINE_MAP[farmName] || '',
    trialOrControl: '',
  }));

  return {
    cycleId,
    cropNo: '',
    cycleNo: '',
    houses: emptyHouseData,
  };
};

export const getInitialChicksReceivingData = (): AllFarmsChicksReceivingData => {
  const initialData: AllFarmsChicksReceivingData = {};
  FARM_NAMES.forEach(farmName => {
    initialData[farmName] = [];
  });
  return initialData;
};

export const createEmptyWeeklyWeightDataForFarm = (farmName: string, cycleId: string): WeeklyWeightData => {
    const houseCount = getHouseCountForFarm(farmName);
    const emptyHouseData: WeeklyWeightHouseData[] = Array(houseCount).fill(null).map(() => ({
      breed: '',
      flock: '',
      fourDays: { standard: '', actual: '' },
      sevenDays: { standard: '', actual: '' },
      fourteenDays: { standard: '', actual: '' },
      twentyOneDays: { standard: '', actual: '' },
    }));

    return {
        cycleId,
        cropNo: '',
        cycleNo: '',
        houses: emptyHouseData,
    };
};

export const getInitialWeeklyWeightData = (): AllFarmsWeeklyWeightData => {
  const initialData: AllFarmsWeeklyWeightData = {};
  FARM_NAMES.forEach(farmName => {
    initialData[farmName] = [];
  });
  return initialData;
};

export const createEmptyChicksGradingDataForFarm = (farmName: string, cycleId: string): ChicksGradingData => {
  const houseCount = getHouseCountForFarm(farmName);
  const emptyHouseData: ChicksGradingHouseData[] = Array(houseCount).fill(null).map(() => ({
    gradeA: '',
    gradeB: '',
    gradeC: '',
  }));

  return {
    cycleId,
    houses: emptyHouseData,
  };
};

export const getInitialChicksGradingData = (): AllFarmsChicksGradingData => {
  const initialData: AllFarmsChicksGradingData = {};
  FARM_NAMES.forEach(farmName => {
    initialData[farmName] = [];
  });
  return initialData;
};

export const getInitialFeedDeliveryData = (): AllFarmsFeedDeliveryData => {
    const initialData: AllFarmsFeedDeliveryData = {};
    FARM_NAMES.forEach(farmName => {
        initialData[farmName] = []; // Initialize with an empty array for records
    });
    return initialData;
};


export const createEmptyCatchingDetailsDataForFarm = (farmName: string, cycleId: string): CatchingDetailsData => {
    const houseCount = getHouseCountForFarm(farmName);
    const emptyHouseData: CatchingDetailsHouseData[] = Array(houseCount).fill(null).map(() => ({
      electricCounter: '',
      catchCulls: '',
      doa: '',
      catchLoss: '',
      scaleWtP: '',
    }));

    return {
        cycleId,
        houses: emptyHouseData,
    };
};

export const getInitialCatchingDetailsData = (): AllFarmsCatchingDetailsData => {
  const initialData: AllFarmsCatchingDetailsData = {};
  FARM_NAMES.forEach(farmName => {
    initialData[farmName] = [];
  });
  return initialData;
};

export const createEmptySalmonellaDataForFarm = (farmName: string, cycleId: string): SalmonellaData => {
    const houseCount = getHouseCountForFarm(farmName);
    const emptyHouseStatus: SalmonellaHouseStatus[] = Array(houseCount).fill(null).map(() => ({
        hasSalmonella: false,
    }));
    return {
        cycleId,
        houses: emptyHouseStatus,
    };
};

export const getInitialSalmonellaData = (): AllFarmsSalmonellaData => {
  const initialData: AllFarmsSalmonellaData = {};
  FARM_NAMES.forEach(farmName => {
      initialData[farmName] = [];
  });
  return initialData;
};

export const createEmptyFeedDeliveryRecord = (houseCount: number): FeedDeliveryRecordData => {
    return {
        houses: Array.from({ length: houseCount }, () => ({
            starter: '',
            growerCR: '',
            growerPL: '',
            finisher: '',
        })),
    };
};

/**
 * Parses tab-separated text from the clipboard, robustly handling different line endings.
 * @param text The string from the clipboard.
 * @returns A 2D array of strings representing the pasted data.
 */
export const parsePastedText = (text: string): string[][] => {
  // Normalize line endings to \n, then split
  const cleanedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
  return cleanedText.split('\n').map(row => row.split('\t'));
};