
import React from 'react';
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

  const getHeight = () => {
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

  const logoPath =
    theme === 'dark'
      ? '/lovable-uploads/44375c36-9040-4942-a6c1-8a31b5412922.png'
      : '/lovable-uploads/a0c5b66f-2722-40b9-a042-eacfc9c6fdad.png';

  return (
    <div
      className={cn(
        'w-full flex items-center justify-center px-4 py-6',
        className
      )}
      style={size === 'auto' ? { height: '100%' } : undefined}
    >
      <img
        src={logoPath}
        alt="Rocket Mail Logo"
        className={cn('w-full object-contain', getHeight())}
      />
    </div>
  );
};
