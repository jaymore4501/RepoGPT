'use client';

import React from 'react';

interface BorderGlowProps {
  children: React.ReactNode;
  className?: string;
  glowColors?: string; // CSS style or tailwind color classes
}

export default function BorderGlow({ 
  children, 
  className = '', 
  glowColors = 'from-violet-600 via-cyan-400 to-indigo-600' 
}: BorderGlowProps) {
  return (
    <div className={`relative group rounded-xl p-[1px] overflow-hidden ${className}`}>
      {/* Background rotating gradient */}
      <div className={`absolute -inset-[100%] bg-gradient-to-r ${glowColors} animate-[spin_5s_linear_infinite] opacity-50 group-hover:opacity-100 transition-opacity duration-300 blur-[1px]`} 
           style={{ transformOrigin: 'center center' }} />
      
      {/* Inner card content */}
      <div className="relative w-full h-full bg-slate-950/90 backdrop-blur-xl rounded-[11px] p-6 text-slate-100 flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}
