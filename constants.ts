

import type { VehicleMovementLog } from './types';

export const FARM_NAMES: string[] = [
  'B2/3', 'B2/4', 'B2/2', 'B2/1', 
  'B3/4', 'B3/1', 'B3/3', 'B3/2', 
  'She/1', 'She/2', 'She/3'
];

// The maximum number of houses any farm has. Used for consistent UI layout.
export const MAX_HOUSE_COUNT = 12;

/**
 * Gets the number of houses for a specific farm.
 * B2/1 and B3/4 have 10 houses, all others have 12.
 * @param farmName The name of the farm.
 * @returns The number of houses for the farm.
 */
export const getHouseCountForFarm = (farmName: string): number => {
  if (farmName === 'B2/1' || farmName === 'B3/4') {
    return 10;
  }
  return 12;
};

export const PRODUCTION_LINE_MAP: { [key: string]: string } = {
  'B2/3': 'B084',
  'B2/4': 'B085',
  'B2/2': 'B086',
  'B2/1': 'B087',
  'B3/4': 'B088',
  'B3/1': 'B089',
  'B3/3': 'B090',
  'B3/2': 'B091',
  'She/1': 'B092',
  'She/2': 'B093',
  'She/3': 'B094',
};

export const VEHICLE_DEPARTMENTS: string[] = [
    'VP (Productions)',
    'Parent Stock Dept.',
    'Hatcheries Dept.',
    'Broiler BR.',
    'Broiler BCT.',
    'Processing Plants Dept.',
    'Further Processing Dept.',
    'Commercial Layers Dept.',
    'Administrative Services Dept. (Catering, A.S.D.)',
    'Agriculture Dept. (Honey bee, Green)',
    'AWP Transport Co.',
    'Electricity & water Services Dept.',
    'Environment & Recycling Dept.',
    'Expansion & Project Development Dept.',
    'Feed Mills Dept.',
    'Fleet Central Services Dept.',
    'Heavy Equipment Dept.',
    'Information Technical Dept.',
    'Maintenance Dept.',
    'Quality Assurance Dept. (Quality)',
    'Transport & Supportive Services Dept.',
    'Warehouse Dept. (All Stores)',
    'Outside Company',
    'NPC Hayat Pest Control',
    'Poultry Heath Department',
    'Other',
];

export const VEHICLE_TYPES: VehicleMovementLog['vehicleType'][] = [
    'Car / P-ups / SUV',
    'Trucks',
    'Trailers (Feed bulkers, diesel tanker,..)',
    'Bus / Coasters',
    'Scooter / Cycles',
    'Others 1',
];

export const FEED_TYPES = [
  'Broiler Starter',
  'Broiler Grower CR',
  'Broiler Grower PL',
  'Broiler Finisher',
];


export const AL_WATANIA_LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARQAAAC/CAMAAAA37sVzAAAAaVBMVEX////wSTXwRzT3urr6+vrwSjjuPizwQDD//Pz8+PjvNy/xWkbvOC/50M3yZFLyl5L4t7Tyb1v/+/z1m5b1jIn0fHjxYVPxV0L5x8j4v7z3sLD2qKT0goH2qaT4zs7xUD/wQiz85+f1i4gAh3/8AAAFxElEQVR4nO2d7XqqMBCGp0QEREVFLChotXrbvf//F2/NTCfJJAn2G02+z85Yk4Ekc865kwwDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGB1yqVyyqVSSK8W0/l6pVLs7fVatVL0f/o6pVIk82qVSiGeKqf/6qXwqt1fT6VyyuWyXC7L5VKZTCP5aTgcLpfL5Xq9Wq3yGkymcrlc77dDfg2Hw81m0+v1GgwG/YI+4uMR/56/X6/XbrdjGMYwDAaDwWAwDAA+DofDA/5Tz/s/P/F4PN7wV/I8Ho83GAz6y/i/85dMJsPD4TAej79e7zKZTDabzWw2k8lkv1+bzcYYhg3DAJ/Ld3e73W63Ww/L6ZlMp1KpVCoVEiW/hMNh/3m53W632+12u91ut9vtVqvVarVarVYL8Pl+v2+3W/L9i5L/g/s/cK1Wi8VisVgsFovFYrFarb/w9y/e/Uu/3+/3+/2+/5d+v9/v9/s9Ho/f77e/eL/f7w+HQ34Mh8PhcDgcDofFYqHRaDQazGaz2WwymUwmk0qlUqlUKpVcLn97e7vbbT/9/Pnz58+fP3/+vN1uPz+/W63WZrO9vLy8vb3NZrOZTIbDwfl8Hg6HIAiCID8+Pj4+Pj4+Pj4+Pi5JkiRJkiRJkiRJunfu3Llzd+vWbdsgCH6/n81mN5tNLcsbL+l02+v1aLHY6zVYrTaaDTqdRq1GpdKIlEp0KpVKlQKhQA4HYzAYcTgcPz48/OfPz4ODg9lsls1iFwulw2FjNpvFYvHY2JhMJhQKodVq1Wo1m83FYlGr1ev1erPZ7Ha73+/X6XQSiQQmk0m1WiVRiGaz+fXrVyqV8vl8Pp9vNpt9Pp8H/H77e/v44cMPHz58+PDhzs5uNpuVSoVOp5VKoVgsVqvVKpVCp9OVSqVS6ePjo7l/uPfvf0aD4Xg8msVi/d7b27vdbv/r9e3vH47H4/V6/V6v/87D4bh/6P31erFYjMfj8/PzcDgsFotOp7/9/W9+fhqNRqFQMBh0Op3e3t4mk0mlUslk8vT09PDw8P7+fhAEQUH283A4lMvlfr83m83pdFqv12q1msFg0Ov1Wq1Wq9Xqdrvl45Fz3hGJRJxOJ4/Hk0qlkUqlxGLx06dPOZ1OKpVqtRqPxxMMBhwORywWSywWi8Vi/fPnPz/+OJFInE4nn8/n8/lUKpXJZDKZTBKJdDqdTqdzuVwqlSoWiw8fPhgMBrPZ/Pjx49bWXq/X6/X28/MbjUYmk+Xz+Wg0ulqt/r///d/+9rfZbFYqlUwmk0qlVqvV6XSKxWIymVwuVywWSyQS5+fncrn827dPHz9eKBQwGAyDwSCXy/X7/Wg02m63W61WAwA8GAwyGAyGYVgmk4ZhGAzDMBiGYRgMwzAMg2EYhu/Xy8Xi0d6efr/fbrd7PB6DwSBCodxuN5vNBoOh3W43m41EooRi0Wg0GoVCIhGJRCIRiUQikQDAoVAIpVKpVAIAgEqlEgAAoFKpAAAAlUolAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAID/4g8uWvHwK7l/wAAAAABJRU5kJggg==';