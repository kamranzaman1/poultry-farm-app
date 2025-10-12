import React from 'react';
import { AL_WATANIA_LOGO_BASE64 } from '../constants';
import FarmLogo from './FarmLogo';

interface SidebarProps {
  farms: string[];
  selectedFarm: string;
  onSelectFarm: (farm: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ farms, selectedFarm, onSelectFarm }) => {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="flex items-center justify-center h-20 border-b border-gray-200 px-4">
         <img src={AL_WATANIA_LOGO_BASE64} alt="Al Watania Poultry Logo" className="h-12" />
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        <p className="px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Farms</p>
        <ul>
          {farms.map((farm) => (
            <li key={farm}>
              <button
                onClick={() => onSelectFarm(farm)}
                className={`w-full text-left flex items-center px-4 py-2.5 my-1 rounded-lg transition-colors duration-200 ${
                  selectedFarm === farm
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="w-8 h-8 text-sm">
                  <FarmLogo farmName={farm} />
                </div>
                <span className="ml-3 font-medium">{farm}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 text-center text-xs text-gray-500">
        <p>&copy; 2024 Farm Solutions Inc.</p>
      </div>
    </div>
  );
};

export default Sidebar;