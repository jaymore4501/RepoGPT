'use client';

import React from 'react';

export default function MagicRings() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Ambient background glows */}
      <div className="absolute top-[20%] left-[10%] w-[40rem] h-[40rem] rounded-full bg-violet-600/10 blur-[150px] animate-pulse duration-10000" />
      <div className="absolute bottom-[20%] right-[10%] w-[35rem] h-[35rem] rounded-full bg-cyan-500/10 blur-[130px] animate-pulse duration-[8000ms]" />

      <div className="absolute inset-0 flex items-center justify-center opacity-60">
        <div className="relative w-[600px] h-[600px]">
          {/* Central Core Glow */}
          <div className="absolute inset-0 m-auto w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl animate-pulse" />

          {/* Outer Ring 1 */}
          <div className="absolute inset-0 border border-violet-500/20 rounded-full animate-[spin_40s_linear_infinite]" 
               style={{ transform: 'rotateX(60deg) rotateY(15deg)' }}>
            <div className="absolute -top-1 left-1/2 w-2 h-2 bg-violet-400 rounded-full shadow-[0_0_8px_#8b5cf6]" />
            <div className="absolute -bottom-1 left-1/2 w-1.5 h-1.5 bg-violet-400/50 rounded-full" />
          </div>

          {/* Middle Ring 2 */}
          <div className="absolute inset-[50px] border border-cyan-500/15 rounded-full animate-[spin_30s_linear_infinite_reverse]"
               style={{ transform: 'rotateX(45deg) rotateY(-20deg)' }}>
            <div className="absolute top-1/2 -left-1 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_#06b6d4]" />
            <div className="absolute top-1/2 -right-1 w-1.5 h-1.5 bg-cyan-300/60 rounded-full" />
          </div>

          {/* Inner Ring 3 */}
          <div className="absolute inset-[100px] border border-indigo-400/20 rounded-full animate-[spin_20s_linear_infinite]"
               style={{ transform: 'rotateX(30deg) rotateY(10deg)' }}>
            <div className="absolute -top-1 left-1/3 w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_6px_#818cf8]" />
            <div className="absolute -bottom-1 right-1/3 w-1 h-1 bg-indigo-300/40 rounded-full" />
          </div>

          {/* Ring 4 (Dashed, slow tilt) */}
          <div className="absolute inset-[160px] border border-dashed border-violet-400/10 rounded-full animate-[spin_60s_linear_infinite]"
               style={{ transform: 'rotateX(70deg) rotateY(30deg)' }} />
        </div>
      </div>
    </div>
  );
}
