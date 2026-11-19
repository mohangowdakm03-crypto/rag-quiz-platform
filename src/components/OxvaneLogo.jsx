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
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20'
  };

  const currentSizeClass = sizeMap[size] || sizeMap.md;

  const logoNode = (
    <img 
      src={logoImg} 
      alt="Oxvane" 
      className={`shrink-0 object-contain select-none pointer-events-none drop-shadow-[0_4px_12px_rgba(0,113,227,0.25)] hover:scale-105 transition-transform duration-200 ${currentSizeClass} ${className}`} 
    />
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
