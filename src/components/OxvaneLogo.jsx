import React from 'react';
import logoImg from '../assets/oxvane-logo.png';

/**
 * Apple-Grade Oxvane Brand Logo Component (Concept 1: Prismatic Orbit)
 */
export default function OxvaneLogo({ 
  size = 'md', 
  className = '', 
  withBadge = null,
  withWordmark = false,
  subtitle = '' 
}) {
  const sizeMap = {
    xs: 'w-6 h-6 rounded-[6px]',
    sm: 'w-8 h-8 rounded-[8px]',
    md: 'w-9 h-9 rounded-[10px]',
    lg: 'w-11 h-11 rounded-[12px]',
    xl: 'w-14 h-14 rounded-[16px]',
    '2xl': 'w-16 h-16 rounded-[18px]'
  };

  const currentSizeClass = sizeMap[size] || sizeMap.md;

  const logoNode = (
    <div 
      className={`relative inline-flex items-center justify-center overflow-hidden shrink-0 shadow-md shadow-blue-600/20 ring-1 ring-black/5 ${currentSizeClass} ${className}`}
    >
      <img 
        src={logoImg} 
        alt="Oxvane" 
        className="w-full h-full object-cover select-none pointer-events-none" 
      />
    </div>
  );

  if (!withWordmark) {
    return logoNode;
  }

  return (
    <div className="flex items-center space-x-3.5 group cursor-pointer select-none">
      {logoNode}
      <div>
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-lg tracking-tight apple-title-gradient">
            Oxvane
          </span>
          {withBadge && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0071e3] border border-blue-200/80">
              {withBadge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-[#86868b] tracking-tight hidden sm:block">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
