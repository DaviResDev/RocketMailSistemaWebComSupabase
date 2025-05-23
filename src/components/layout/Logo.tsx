
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  size = 'medium' 
}) => {
  const { theme } = useTheme();
  
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-7';
      case 'large':
        return 'h-20';
      case 'medium':
      default:
        return 'h-14';
    }
  };

  const logoPath = theme === 'dark'
    ? '/lovable-uploads/44375c36-9040-4942-a6c1-8a31b5412922.png'  // Logo com texto branco para tema escuro
    : '/lovable-uploads/a0c5b66f-2722-40b9-a042-eacfc9c6fdad.png'; // Logo com texto preto para tema claro

  return (
    <div className={cn('flex items-center', className)}>
      <img 
        src={logoPath} 
        alt="Rocket Mail Logo" 
        className={cn('object-contain', getSizeClasses())}
      />
    </div>
  );
};
