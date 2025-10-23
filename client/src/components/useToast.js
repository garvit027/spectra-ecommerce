// src/components/useToast.js
import { useContext } from 'react';
// CORRECTED: The path is now relative to the same directory
import { ToastContext } from './Toast';

const useToast = () => useContext(ToastContext);

export default useToast;