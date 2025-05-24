
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
        return 'h-12';
      case 'large':
        return 'h-28';
      case 'auto':
        return 'h-full';
      case 'medium':
      default:
        return 'h-16';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'w-10 h-10';
      case 'large':
        return 'w-16 h-16';
      case 'auto':
        return 'w-12 h-12';
      case 'medium':
      default:
        return 'w-12 h-12';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 'text-sm';
      case 'large':
        return 'text-xl';
      case 'auto':
        return 'text-base';
      case 'medium':
      default:
        return 'text-lg';
    }
  };

  return (
    <div
      className={cn(
        'w-full flex items-center justify-center px-4 py-3',
        getContainerSize(),
        className
      )}
    >
      <Link 
        to="/dashboard" 
        className="flex items-center gap-3 hover:opacity-80 transition-all duration-200 group"
      >
        {/* Logo Icon - Professional RM */}
        <div className={cn(
          'relative rounded-xl overflow-hidden flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow duration-200',
          getIconSize()
        )}>
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-orange-500"></div>
          
          {/* RM Letters */}
          <div className="relative w-full h-full flex items-center justify-center">
            <svg
              viewBox="0 0 48 48"
              className="w-8 h-8 text-white font-bold"
              fill="currentColor"
            >
              {/* Letter R */}
              <path d="M6 6h12c3.3 0 6 2.7 6 6v2c0 2.2-1.2 4.1-3 5.2L24 24h-4l-2.5-4H10v4H6V6zm4 4v4h8c1.1 0 2-.9 2-2s-.9-2-2-2h-8z"/>
              
              {/* Letter M */}
              <path d="M26 6h4l4 12 4-12h4v18h-3V12l-3 9h-2l-3-9v12h-3V6z"/>
            </svg>
          </div>
        </div>

        {/* Logo Text */}
        <div className="flex flex-col">
          <span className={cn(
            'font-bold leading-tight tracking-tight',
            getTextSize(),
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            Rocket Mail
          </span>
          <span className={cn(
            'text-xs font-semibold leading-tight tracking-wider uppercase',
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          )}>
            System
          </span>
        </div>
      </Link>
    </div>
  );
};
