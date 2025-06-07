
import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedAlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description: string;
  show: boolean;
  onClose?: () => void;
  autoClose?: number; // ms
}

export function AnimatedAlert({ 
  type, 
  title, 
  description, 
  show, 
  onClose, 
  autoClose = 5000 
}: AnimatedAlertProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      if (autoClose && onClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoClose);
        return () => clearTimeout(timer);
      }
    }
  }, [show, autoClose, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5" />;
      case 'info':
        return <Clock className="h-5 w-5" />;
    }
  };

  const getAlertClass = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  if (!show && !isVisible) return null;

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 transition-all duration-300 transform",
      isVisible ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95"
    )}>
      <Alert 
        className={cn(
          "max-w-md shadow-lg animate-pulse",
          getAlertClass()
        )}
        onClick={handleClose}
      >
        {getIcon()}
        <AlertTitle className="font-semibold">{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </div>
  );
}
