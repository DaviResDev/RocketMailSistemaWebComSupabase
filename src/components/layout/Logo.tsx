
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
        return { width: '180', height: '72' };
      case 'large':
        return { width: '240', height: '96' };
      case 'auto':
        return { width: '200', height: '80' };
      case 'medium':
      default:
        return { width: '200', height: '80' };
    }
  };

  const svgSize = getSvgSize();

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
        <svg 
          width={svgSize.width} 
          height={svgSize.height} 
          viewBox="0 0 500 200" 
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0"
        >
          {/* Fundo escuro */}
          <rect width="500" height="200" fill={theme === 'dark' ? '#0E1621' : '#F8F9FA'} />

          {/* Ícone com divisão diagonal */}
          <defs>
            <clipPath id="left-half">
              <polygon points="0,0 0,200 200,200" />
            </clipPath>
            <clipPath id="right-half">
              <polygon points="0,0 200,0 200,200" />
            </clipPath>
          </defs>

          {/* Base do ícone */}
          <rect x="30" y="30" width="140" height="140" rx="25" fill={theme === 'dark' ? '#1B1F27' : '#E5E7EB'}/>

          {/* Parte vermelha esquerda */}
          <rect x="30" y="30" width="140" height="140" rx="25" fill="#A33226" clipPath="url(#left-half)" />

          {/* Parte azul direita */}
          <rect x="30" y="30" width="140" height="140" rx="25" fill="#2C58A5" clipPath="url(#right-half)" />

          {/* R estilizado */}
          <path d="M50 70 L70 70 Q85 70 85 85 Q85 95 75 100 L90 130 L75 130 L65 105 L65 130 L50 130 Z M65 80 L65 95 L70 95 Q75 95 75 87.5 Q75 80 70 80 Z" fill="#E6E6E6" />

          {/* M estilizado */}
          <path d="M105 70 L120 70 L130 105 L140 70 L155 70 L155 130 L145 130 L145 85 L137.5 115 L122.5 115 L115 85 L115 130 L105 130 Z" fill="#E6E6E6" />

          {/* Linha divisora */}
          <line x1="180" y1="50" x2="180" y2="150" stroke="#2C58A5" strokeWidth="3"/>

          {/* Texto */}
          <text x="200" y="95" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="bold" fill={theme === 'dark' ? '#FFFFFF' : '#1F2937'}>
            Rocket Mail
          </text>
          <text x="200" y="125" fontFamily="Arial, sans-serif" fontSize="14" letterSpacing="4" fill={theme === 'dark' ? '#BBBBBB' : '#6B7280'}>
            SYSTEM
          </text>
        </svg>
      </Link>
    </div>
  );
};
