'use client';

import React from 'react';

interface DealingShoeProps {
  remainingCards: number;
  totalDecks?: number;
  isDealing?: boolean;
  className?: string;
}

export function DealingShoe({
  remainingCards,
  totalDecks = 6,
  isDealing = false,
  className = '',
}: DealingShoeProps) {
  const totalCards = totalDecks * 52;
  const fillPercent = Math.max(10, Math.min(100, (remainingCards / totalCards) * 100));

  return (
    <div
      className={`relative select-none pointer-events-none ${className}`}
      title={`Dealing Shoe (${remainingCards}/${totalCards} cards)`}
    >
      {/* 3D Acrylic Angled Shoe Body */}
      <div className="relative w-24 sm:w-28 h-20 sm:h-24 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black rounded-lg border-2 border-zinc-700/80 shadow-[0_15px_30px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.2)] transform -rotate-12 flex flex-col justify-between p-1.5 overflow-hidden">
        {/* Top Rim & Stainless Heavy Roller Weight */}
        <div className="flex items-center justify-between px-1">
          <div className="w-10 sm:w-12 h-2 rounded bg-gradient-to-r from-zinc-300 via-zinc-100 to-zinc-400 border border-zinc-400 shadow-sm" />
          <span className="text-[8px] font-mono font-black text-amber-400/90 tracking-tighter">
            {totalDecks}D
          </span>
        </div>

        {/* Transparent Window with Stacked Card Backs */}
        <div className="relative flex-1 my-1 rounded bg-zinc-950/90 border border-zinc-700/60 p-1 flex items-center justify-center overflow-hidden">
          {/* Deck Cards Stack (height scales with remaining cards) */}
          <div
            className="w-full rounded bg-gradient-to-r from-red-800 via-red-900 to-red-950 border border-red-500/40 shadow-inner flex flex-col justify-center items-center relative transition-all duration-500"
            style={{ height: `${fillPercent}%` }}
          >
            {/* Diamond Lattice Pattern */}
            <div className="w-full h-full bg-[radial-gradient(#ffffff20_1px,transparent_1px)] [background-size:4px_4px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10" />
          </div>

          {/* Glare Sheen Reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
        </div>

        {/* Dealing Exit Throat (Slot where card emerges) */}
        <div className="relative w-full h-3 bg-zinc-950 rounded-b border-t border-zinc-700 flex items-center justify-between px-1">
          <div className="w-2 h-1 bg-amber-400/80 rounded-full animate-pulse" />
          <span className="text-[7px] font-mono text-zinc-400 tracking-widest uppercase">
            SHOE
          </span>
          <div className="w-2 h-1 bg-amber-400/80 rounded-full animate-pulse" />
        </div>

        {/* Dealing Active Card Slide Animation Indicator */}
        {isDealing && (
          <div className="absolute -bottom-2 -left-3 w-8 h-12 bg-red-700 rounded border border-white/40 shadow-lg transform -rotate-45 animate-pulse" />
        )}
      </div>

      {/* Card Count Pill Badge */}
      <div className="absolute -bottom-2 right-2 bg-zinc-900/90 border border-amber-500/40 rounded-full px-2 py-0.5 text-[8px] font-mono font-bold text-amber-300 shadow">
        {remainingCards} cards
      </div>
    </div>
  );
}
