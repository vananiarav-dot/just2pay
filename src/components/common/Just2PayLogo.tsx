import React from 'react';

interface Just2PayLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export const Just2PayLogo: React.FC<Just2PayLogoProps> = ({ 
  variant = 'light', 
  size = 'md',
  className = '',
  showTagline = false
}) => {
  const isDark = variant === 'dark';

  const sizeClasses = {
    sm: 'h-7 sm:h-8',
    md: 'h-9 sm:h-11',
    lg: 'h-12 sm:h-14',
    xl: 'h-14 sm:h-16',
  };

  const logoImage = (
    <img 
      src="/just2pay-logo.png" 
      alt="Just2Pay • Fast Secure Reliable" 
      className={`${sizeClasses[size]} w-auto object-contain select-none`}
    />
  );

  if (isDark) {
    return (
      <div className={`inline-flex items-center bg-white/95 rounded-2xl px-4 py-2 shadow-xl backdrop-blur-md border border-white/50 hover:scale-105 transition-all duration-300 ${className}`}>
        {logoImage}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center select-none hover:scale-105 transition-all duration-300 ${className}`}>
      {logoImage}
    </div>
  );
};
