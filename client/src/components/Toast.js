import React, { createContext, useContext, useState } from 'react';

// CORRECTED: Now exporting ToastContext to be used by the hook
export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ ...toast, visible: false });
    }, 3000); // Hide after 3 seconds
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast toast={toast} />
    </ToastContext.Provider>
  );
};

export const Toast = ({ toast }) => {
  const bgColor = toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-gray-800';
  const yPosition = toast.visible ? 'translate-y-0' : 'translate-y-20';

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl text-white shadow-lg transition-transform duration-300 ${bgColor} ${yPosition}`}
    >
      {toast.message}
    </div>
  );
};

// The default export is no longer needed since the hook will be in its own file
// No changes here