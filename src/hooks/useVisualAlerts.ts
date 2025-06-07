
import { useState, useCallback } from 'react';

interface AlertData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description: string;
  show: boolean;
}

export function useVisualAlerts() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  const showAlert = useCallback((
    type: AlertData['type'], 
    title: string, 
    description: string
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newAlert: AlertData = {
      id,
      type,
      title,
      description,
      show: true
    };

    setAlerts(prev => [...prev, newAlert]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      removeAlert(id);
    }, 5000);

    return id;
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, description: string) => {
    return showAlert('success', title, description);
  }, [showAlert]);

  const showError = useCallback((title: string, description: string) => {
    return showAlert('error', title, description);
  }, [showAlert]);

  const showWarning = useCallback((title: string, description: string) => {
    return showAlert('warning', title, description);
  }, [showAlert]);

  const showInfo = useCallback((title: string, description: string) => {
    return showAlert('info', title, description);
  }, [showAlert]);

  return {
    alerts,
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeAlert
  };
}
