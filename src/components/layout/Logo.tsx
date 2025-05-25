
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
        return 'h-8';
      case 'large':
        return 'h-14';
      case 'auto':
        return 'h-full';
      case 'medium':
      default:
        return 'h-10';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 'text-lg';
      case 'large':
        return 'text-3xl';
      case 'auto':
        return 'text-2xl';
      case 'medium':
      default:
        return 'text-2xl';
    }
  };

  return (
    <div
      className={cn(
        'w-full flex items-center justify-center px-2 py-2',
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
          <span className="ml-2" style={{ color: theme === 'dark' ? '#e5e7eb' : '#000000' }}>Mail</span>
        </div>
      </Link>
    </div>
  );
};
