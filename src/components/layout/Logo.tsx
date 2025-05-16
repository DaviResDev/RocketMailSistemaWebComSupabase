
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
        return 'h-7'; // Reduzido de h-8
      case 'large':
        return 'h-20'; // Reduzido de h-24
      case 'medium':
      default:
        return 'h-14'; // Reduzido de h-16
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex items-center justify-center">
        {/* Sophisticated glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-700 blur-[6px] opacity-80" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 blur-[4px] opacity-70" />
        
        {/* More professional icon with 3D effect */}
        <div className="relative bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-2 rounded-full shadow-xl border border-blue-500/30">
          <Rocket 
            size={size === 'large' ? 30 : size === 'medium' ? 22 : 18} 
            className="text-white" 
            strokeWidth={2}
          />
        </div>
      </div>
      
      <div className="flex flex-col">
        {/* More professional logo text */}
        <div className="relative">
          <span className={cn(
            "font-sans tracking-tight text-foreground font-bold", 
            size === 'large' ? 'text-3xl' : size === 'medium' ? 'text-xl' : 'text-base'
          )}>
            Rocket Mail
          </span>
          <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-indigo-600 to-transparent rounded-full"></div>
        </div>
        
        <span className={cn(
          "text-muted-foreground leading-tight mt-0.5", 
          size === 'large' ? 'text-sm' : size === 'medium' ? 'text-xs' : 'text-[10px]'
        )}>
          Disparo Automático
        </span>
      </div>
    </div>
  );
};
