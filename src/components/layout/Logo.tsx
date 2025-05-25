
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'auto';
}

export const Logo: React.FC<LogoProps> = ({
  className,
  size = 'medium',
}) => {
  const { theme } = useTheme();

  const getContainerSize = () => {
    switch (size) {
      case 'small':
        return 'h-6';
      case 'large':
        return 'h-10';
      case 'auto':
        return 'h-full';
      case 'medium':
      default:
        return 'h-8';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 'text-sm';
      case 'large':
        return 'text-xl';
      case 'auto':
        return 'text-lg';
      case 'medium':
      default:
        return 'text-lg';
    }
  };

  return (
    <div
      className={cn(
        'w-full flex items-center justify-start px-4 py-1',
        getContainerSize(),
        className
      )}
    >
      <Link 
        to="/dashboard" 
        className="flex items-center hover:opacity-80 transition-all duration-200"
      >
        <div className={cn('font-bold tracking-tight leading-none', getFontSize())} style={{ fontFamily: 'Inter, sans-serif' }}>
          <span style={{ color: '#2267D8' }}>Rocket</span>
          <span className="ml-1" style={{ color: theme === 'dark' ? '#d1d5db' : '#000000' }}>Mail</span>
        </div>
      </Link>
    </div>
  );
};
