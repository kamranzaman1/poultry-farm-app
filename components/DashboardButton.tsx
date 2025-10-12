
import React from 'react';

interface DashboardButtonProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  colorClasses: {
    bg: string;
    text: string;
    hoverBg: string;
  };
}

const DashboardButton: React.FC<DashboardButtonProps> = ({ title, description, icon, onClick, colorClasses }) => {
  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-lg shadow-md flex flex-col items-start text-left h-full transition-all duration-300 transform hover:-translate-y-1 ${colorClasses.bg} ${colorClasses.text} ${colorClasses.hoverBg}`}
    >
      <div className="mb-3 p-3 bg-white/50 rounded-full">
        {icon}
      </div>
      <h4 className="text-lg font-bold mb-1">{title}</h4>
      <p className="text-sm opacity-90">{description}</p>
    </button>
  );
};

export default DashboardButton;
