
import React from 'react';
import { Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  size = 'medium' 
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-8';
      case 'large':
        return 'h-24';
      case 'medium':
      default:
        return 'h-16';
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 blur-[6px] opacity-75" />
        <div className="relative bg-gradient-to-br from-indigo-500 to-blue-600 text-white p-2 rounded-full shadow-lg">
          <Rocket 
            size={size === 'large' ? 32 : size === 'medium' ? 24 : 18} 
            className="text-white" 
            strokeWidth={2} 
          />
        </div>
      </div>
      <div className="flex flex-col">
        <span className={cn(
          "font-sans tracking-tight text-foreground font-bold", 
          size === 'large' ? 'text-3xl' : size === 'medium' ? 'text-xl' : 'text-lg'
        )}>
          Rocket Mail
        </span>
        <span className={cn(
          "text-muted-foreground leading-tight font-light", 
          size === 'large' ? 'text-sm' : size === 'medium' ? 'text-xs' : 'text-[10px]'
        )}>
          Email marketing
        </span>
      </div>
    </div>
  );
};
