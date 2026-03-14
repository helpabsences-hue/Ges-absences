// components/shared/LogoIcon.tsx
import React from 'react';

interface LogoIconProps {
  className?: string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ className = "w-10 h-10" }) => {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* This is the "Glow" effect behind your logo. 
        It's subtle in light mode and brighter in dark mode 
        to make the blue logo stand out.
      */}
      <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/20 blur-xl rounded-full" />
      
      {/* Your Logo Image
        We use object-contain to ensure the logo doesn't stretch.
      */}
      <img
        src="/logo/logo_Attendefy.png"
        alt="Attendefy Logo icon"
        className="relative w-full h-full object-contain filter drop-shadow-sm dark:brightness-110 transition-all duration-300"
      />
    </div>
  );
};