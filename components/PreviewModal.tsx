import React from 'react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ height: 'clamp(400px, 80vh, 700px)' }}
      >
        {/* Modal Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200">
          <h2 id="preview-modal-title" className="text-lg font-semibold text-gray-800">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Close preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="flex-grow overflow-y-auto p-6">
          {children}
        </div>
        
        {/* Modal Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
           <button 
            onClick={onClose} 
            className="w-full px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
