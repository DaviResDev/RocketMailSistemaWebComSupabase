
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
        return 'h-16';
      case 'auto':
        return 'h-full';
      case 'medium':
      default:
        return 'h-12';
    }
  };

  const getSvgSize = () => {
    switch (size) {
      case 'small':
        return { width: '125', height: '50' };
      case 'large':
        return { width: '200', height: '80' };
      case 'auto':
        return { width: '150', height: '60' };
      case 'medium':
      default:
        return { width: '150', height: '60' };
    }
  };

  const svgSize = getSvgSize();

  return (
    <div
      className={cn(
        'w-full flex items-center justify-center px-2 py-2 mb-6',
        getContainerSize(),
        className
      )}
      style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
    >
      <Link 
        to="/dashboard" 
        className="flex items-center hover:opacity-80 transition-all duration-200"
      >
        <svg 
          width={svgSize.width} 
          height={svgSize.height} 
          viewBox="0 0 500 200" 
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0"
        >
          <defs>
            <clipPath id="diagonalSplit">
              <polygon points="0,200 0,0 200,0 0,200" />
            </clipPath>
            <clipPath id="diagonalSplitRight">
              <polygon points="200,0 200,200 0,200 200,0" />
            </clipPath>
          </defs>

          <rect x="0" y="0" width="200" height="200" rx="30" fill="#F7632D" clipPath="url(#diagonalSplit)" />
          <rect x="0" y="0" width="200" height="200" rx="30" fill="#2267D8" clipPath="url(#diagonalSplitRight)" />

          <path d="M50 60 L70 60 L70 100 L90 100 L60 140 Z" fill="white" />
          <path d="M150 140 L130 60 L170 60 Z M150 100 L150 140 Z" fill="white" />

          <line x1="220" y1="30" x2="220" y2="170" stroke="#2267D8" strokeWidth="4"/>

          <text x="240" y="95" fontFamily="Inter, sans-serif" fontSize="36" fontWeight="bold" fill="currentColor">
            Rocket Mail
          </text>
          <text x="240" y="135" fontFamily="Inter, sans-serif" fontSize="20" letterSpacing="4" fill="currentColor">
            SYSTEM
          </text>
        </svg>
      </Link>
    </div>
  );
};
