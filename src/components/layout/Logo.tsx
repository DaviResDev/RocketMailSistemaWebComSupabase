
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
        return 'w-8 h-8';
      case 'large':
        return 'w-12 h-12';
      case 'auto':
        return 'w-10 h-10';
      case 'medium':
      default:
        return 'w-10 h-10';
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
        return 'text-base';
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
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        {/* Logo Icon - Stylized M */}
        <div className={cn(
          'relative rounded-lg overflow-hidden flex-shrink-0',
          getIconSize()
        )}>
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-blue-600"></div>
          
          {/* Letter M */}
          <div className="relative w-full h-full flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 text-white"
              fill="currentColor"
            >
              <path d="M3 3h4l3 9 3-9h4v18h-3V9l-2.5 7h-3L6 9v12H3V3z"/>
            </svg>
          </div>
        </div>

        {/* Logo Text */}
        <div className="flex flex-col">
          <span className={cn(
            'font-bold leading-tight',
            getTextSize(),
            theme === 'dark' ? 'text-white' : 'text-black'
          )}>
            Rocket Mail
          </span>
          <span className={cn(
            'text-xs font-medium leading-tight',
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          )}>
            SYSTEM
          </span>
        </div>
      </Link>
    </div>
  );
};
