import React from 'react';
import { AL_WATANIA_LOGO_BASE64 } from '../constants';

// Wrench Icon
const WrenchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-blue-500">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
    </svg>
);


interface MaintenanceScreenProps {
  onLogout: () => void;
}

const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onLogout }) => {
  return (
    <div className="flex items-center justify-center min-h-screen poultry-background">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-8 text-center border border-gray-200">
        <div className="flex justify-center mb-4">
          <img src={AL_WATANIA_LOGO_BASE64} alt="Al Watania Poultry Logo" className="h-20" />
        </div>
        <div className="flex justify-center my-6">
            <WrenchIcon />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">System Under Maintenance</h1>
        <p className="mt-2 text-gray-600">
          The application is currently undergoing scheduled maintenance to improve your experience.
        </p>
        <p className="mt-1 text-gray-600">
          Please check back again later. We appreciate your patience.
        </p>
        <div className="mt-8">
            <button
                onClick={onLogout}
                className="w-full max-w-xs mx-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                Log Out
            </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceScreen;