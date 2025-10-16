import type { User } from './types';
import { FARM_NAMES, GATE_NAMES } from './constants';

const SUPERVISOR_AND_ADMIN_USERS: User[] = [
  { 
    id: 'user1', 
    name: 'B2 Area Supervisor', 
    username: 'b2sup',
    password: '123',
    role: 'Supervisor',
    authorizedFarms: ['B2/3', 'B2/4', 'B2/2', 'B2/1'],
    contactNumber: '0501234567' 
  },
  { 
    id: 'user2', 
    name: 'B3 Area Supervisor', 
    username: 'b3sup',
    password: '123',
    role: 'Supervisor',
    authorizedFarms: ['B3/4', 'B3/1', 'B3/3', 'B3/2'],
    contactNumber: '0501234568'
  },
  { 
    id: 'user3', 
    name: 'She Area Supervisor',
    username: 'shesup',
    password: '123',
    role: 'Supervisor',
    authorizedFarms: ['She/1', 'She/2', 'She/3'],
    contactNumber: '0501234569'
  },
  { 
    id: 'admin', 
    name: 'Admin', 
    username: 'admin',
    password: 'admin',
    role: 'Admin',
    authorizedFarms: FARM_NAMES,
    contactNumber: '0500000000'
  },
];

const LEADMAN_USERS: User[] = FARM_NAMES.map((farmName, index) => {
    const safeFarmName = farmName.toLowerCase().replace('/', '');
    return {
      id: `leadman${index + 1}`,
      name: `Leadman for ${farmName}`,
      username: `${safeFarmName}lead`,
      password: '123',
      role: 'Leadman',
      authorizedFarms: [farmName],
      contactNumber: `051${String(index).padStart(7, '0')}` // Dummy numbers
    }
});


export const INITIAL_USERS: User[] = [
  ...SUPERVISOR_AND_ADMIN_USERS,
  ...LEADMAN_USERS,
  {
    id: 'sitemanager1',
    name: 'Site Manager',
    username: 'sitemanager',
    password: '123',
    role: 'Site Manager',
    authorizedFarms: FARM_NAMES,
    contactNumber: '0511112222'
  },
  {
    id: 'gatekeeper1',
    name: 'Gate Keeper B2',
    username: 'gateb2',
    password: '123',
    role: 'Gate Keeper',
    authorizedFarms: [],
    gateName: 'Butain 2 Gate',
    contactNumber: '0598765432',
  },
  {
    id: 'gatekeeper2',
    name: 'Gate Keeper B3',
    username: 'gateb3',
    password: '123',
    role: 'Gate Keeper',
    authorizedFarms: [],
    gateName: 'Butain 3 Gate',
    contactNumber: '0598765433',
  },
  {
    id: 'gatekeeper3',
    name: 'Gate Keeper Shemalia',
    username: 'gateshe',
    password: '123',
    role: 'Gate Keeper',
    authorizedFarms: [],
    gateName: 'Shemalia Gate',
    contactNumber: '0598765434',
  },
];