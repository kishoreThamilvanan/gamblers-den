import React from 'react';
import { Card as CardType } from '@/types/poker';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  card?: CardType;
  hidden?: boolean;
  variant?: 'community' | 'hero' | 'opponent';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  theme?: string;
}

const suitSymbols: Record<string, { char: string; color: string }> = {
  s: { char: '♠', color: '#18181b' },
  h: { char: '♥', color: '#dc2626' },
  d: { char: '♦', color: '#2563eb' },
  c: { char: '♣', color: '#16a34a' },
};

export function Card({
  card,
  hidden = false,
  variant,
  size,
  className = '',
}: CardProps) {
  // Determine size classes per Section 3:
  // Community Cards: w-10 h-14 sm:w-12 sm:h-18 md:w-14 md:h-20
  // Hero Hole Cards: w-11 h-16 sm:w-14 sm:h-20
  // Opponent Folded/Down Cards: w-6 h-9 sm:w-7 sm:h-10
  let sizeClass = 'w-10 h-14 sm:w-12 sm:h-18 md:w-14 md:h-20 text-xs sm:text-sm md:text-base';

  if (variant === 'hero' || size === 'xl' || size === 'lg') {
    sizeClass = 'w-11 h-16 sm:w-14 sm:h-20 text-xs sm:text-sm md:text-base';
  } else if (variant === 'opponent' || size === 'xs' || size === 'sm') {
    sizeClass = 'w-6 h-9 sm:w-7 sm:h-10 text-[8px]';
  } else if (variant === 'community' || size === 'md') {
    sizeClass = 'w-10 h-14 sm:w-12 sm:h-18 md:w-14 md:h-20 text-xs sm:text-sm md:text-base';
  }

  // Face-down card back
  if (hidden || !card) {
    return (
      <div
        className={twMerge(
          'relative rounded-md border border-zinc-700 bg-gradient-to-br from-red-700 via-red-800 to-red-950 shadow-md flex items-center justify-center p-0.5 overflow-hidden select-none',
          sizeClass,
          className
        )}
      >
        <div className="w-full h-full border border-red-400/30 rounded-[2px] flex items-center justify-center bg-[radial-gradient(#ffffff25_1px,transparent_1px)] [background-size:4px_4px]">
          <span className="text-white/60 font-serif font-black italic text-[9px] sm:text-[11px] tracking-tighter">
            FS
          </span>
        </div>
      </div>
    );
  }

  const suit = suitSymbols[card.suit] || { char: '♠', color: '#18181b' };

  return (
    <div
      className={twMerge(
        'relative bg-[#ffffff] rounded-md border border-zinc-300 shadow-md flex flex-col justify-between p-1 font-bold font-sans select-none',
        sizeClass,
        className
      )}
      style={{ color: suit.color }}
    >
      {/* Top Left Rank & Suit */}
      <div className="leading-none self-start flex flex-col items-center">
        <span className="font-extrabold tracking-tighter">{card.rank}</span>
        <span className="text-[0.8em] leading-none -mt-0.5">{suit.char}</span>
      </div>

      {/* Center Suit Symbol */}
      <div className="self-center flex-1 flex items-center justify-center text-[1.4em] sm:text-[1.6em] leading-none drop-shadow-sm">
        {suit.char}
      </div>

      {/* Bottom Right Rank & Suit (Inverted) */}
      <div className="leading-none self-end rotate-180 flex flex-col items-center">
        <span className="font-extrabold tracking-tighter">{card.rank}</span>
        <span className="text-[0.8em] leading-none -mt-0.5">{suit.char}</span>
      </div>
    </div>
  );
}
