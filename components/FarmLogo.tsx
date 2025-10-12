import React from 'react';

interface FarmLogoProps {
  farmName: string;
}

const getLogoDetails = (farmName: string) => {
    const name = farmName.toUpperCase();
    let initials = name.split('/')[0];
    let bgColor = '#EBF8FF'; // Corresponds to Tailwind's blue-100
    let textColor = '#2B6CB0'; // Corresponds to Tailwind's blue-800

    if (name.startsWith('B3')) {
        bgColor = '#F0FFF4'; // green-100
        textColor = '#276749'; // green-800
    } else if (name.startsWith('SHE')) {
        initials = 'SH';
        bgColor = '#FFFFF0'; // yellow-100
        textColor = '#975A16'; // yellow-800
    } else if (!name.startsWith('B2')) {
        // Default for any other case
        bgColor = '#E2E8F0'; // gray-300
        textColor = '#2D3748'; // gray-700
    }
    
    return { initials, bgColor, textColor };
};

const FarmLogo: React.FC<FarmLogoProps> = ({ farmName }) => {
    const { initials, bgColor, textColor } = getLogoDetails(farmName);
    
    return (
        <div 
            className="w-full h-full rounded-full flex items-center justify-center shrink-0" 
            style={{ backgroundColor: bgColor }}
        >
            <span 
                className="font-bold" 
                style={{ color: textColor, fontSize: 'inherit' }}
            >
                {initials}
            </span>
        </div>
    );
};

export default FarmLogo;
