import React from 'react';
import { Zap } from 'lucide-react';

interface Just2PayLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const Just2PayLogo: React.FC<Just2PayLogoProps> = ({ 
  variant = 'light', 
  size = 'md',
  showTagline = true 
}) => {
  const isDark = variant === 'dark';
  
  const iconSizes = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-11 h-11 rounded-2xl',
    lg: 'w-14 h-14 rounded-2xl',
  };

  const zapSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  };

  const titleSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className="flex items-center gap-3 select-none group cursor-pointer">
      {/* 3D Gradient Icon Squircle */}
      <div className={`relative ${iconSizes[size]} bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[2px] shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 group-hover:scale-105 transition-all duration-300`}>
        <div className={`w-full h-full ${isDark ? 'bg-slate-950' : 'bg-white'} rounded-[14px] flex items-center justify-center relative overflow-hidden`}>
          {/* Subtle sheen reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none"></div>
          <Zap className={`${zapSizes[size]} text-cyan-500 fill-cyan-400/20 group-hover:scale-110 transition duration-300 drop-shadow-sm`} />
        </div>
      </div>

      {/* Typography */}
      <div className="flex flex-col text-left">
        <div className="flex items-center tracking-tight leading-none">
          <span className={`${titleSizes[size]} font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-tight`}>
            Just
          </span>
          <span className={`${titleSizes[size]} font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500`}>
            2Pay
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">
            Next-Gen Fintech Portal
          </span>
        )}
      </div>
    </div>
  );
};
