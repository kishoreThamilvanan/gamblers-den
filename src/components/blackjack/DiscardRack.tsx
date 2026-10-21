'use client';

import React from 'react';

interface DiscardRackProps {
  discardCount: number;
  isMucking?: boolean;
  className?: string;
}

export function DiscardRack({
  discardCount,
  isMucking = false,
  className = '',
}: DiscardRackProps) {
  const stackHeight = Math.min(100, Math.max(10, (discardCount / 312) * 100));

  return (
    <div
      className={`relative select-none pointer-events-none ${className}`}
      title={`Discard Rack (${discardCount} played cards)`}
    >
      {/* Acrylic Discard Rack Body */}
      <div className="relative w-20 sm:w-24 h-22 sm:h-26 bg-gradient-to-br from-white/10 via-white/5 to-white/0 backdrop-blur-sm rounded-lg border-2 border-white/20 shadow-[0_15px_30px_rgba(0,0,0,0.8),inset_0_1px_3px_rgba(255,255,255,0.4)] transform rotate-6 flex flex-col justify-end p-1.5 overflow-hidden">
        {/* Top Rim Lip */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-white/20 border-b border-white/30" />

        {/* Angled Divider Fin */}
        <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-0.5 bg-white/20" />

        {/* Stacked Discarded Cards */}
        <div
          className="relative w-full rounded bg-gradient-to-t from-zinc-900 via-red-950 to-red-900/80 border border-red-500/30 shadow-inner flex flex-col-reverse justify-start overflow-hidden transition-all duration-500"
          style={{ height: `${stackHeight}%` }}
        >
          {/* Card Edges Striping */}
          <div className="w-full h-full bg-[repeating-linear-gradient(0deg,#ffffff15,#ffffff15_1px,transparent_1px,transparent_3px)]" />
        </div>

        {/* Mucking Sweep Animation Overlay */}
        {isMucking && (
          <div className="absolute inset-0 bg-amber-400/20 border border-amber-400/60 rounded-lg animate-pulse" />
        )}

        {/* Base Plate */}
        <div className="w-full h-2 bg-zinc-900/90 rounded-b border-t border-white/20 mt-1 flex items-center justify-center">
          <span className="text-[7px] font-mono text-zinc-400 tracking-wider uppercase">
            DISCARD
          </span>
        </div>
      </div>

      {/* Discard Count Pill Badge */}
      <div className="absolute -bottom-2 left-2 bg-zinc-900/90 border border-white/20 rounded-full px-2 py-0.5 text-[8px] font-mono font-bold text-zinc-300 shadow">
        {discardCount} mucked
      </div>
    </div>
  );
}
