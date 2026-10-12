'use client';

import React, { useState } from 'react';
import { Card as CardType } from '@/lib/poker/types';
import { Card } from './Card';
import { sound } from '@/lib/sound/soundSystem';

interface PeelableCardProps {
  card: CardType;
  index: number;
  alwaysReveal: boolean;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
}

export function PeelableCard({
  card,
  index,
  alwaysReveal,
  size = 'lg',
  className = '',
}: PeelableCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const isRevealed = alwaysReveal || isPinned || isHovered;

  const handleMouseEnter = () => {
    if (!alwaysReveal && !isPinned && !isHovered) {
      sound.playCardPeel();
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsHovered(false);
    }
  };

  const handleClick = () => {
    if (!alwaysReveal) {
      sound.playCardPeel();
      setIsPinned((prev) => !prev);
    }
  };

  return (
    <div
      className={`relative cursor-pointer select-none group perspective-[800px] ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      title={alwaysReveal ? '' : 'Hover or click to peel card'}
    >
      <div
        className="relative transition-transform duration-300 ease-out preserve-3d"
        style={{
          transformStyle: 'preserve-3d',
          transform: isRevealed
            ? 'rotateY(0deg) translateY(-4px)'
            : 'rotateY(180deg)',
        }}
      >
        {/* Front Face (Face-Up Card) */}
        <div
          className="backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <Card card={card} size={size} />
        </div>

        {/* Back Face (Face-Down Card) */}
        <div
          className="absolute inset-0 backface-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <Card hidden size={size} theme="classic-green" />

          {/* Interactive Peeling Corner Hint */}
          {!alwaysReveal && !isRevealed && (
            <div className="absolute bottom-0 right-0 w-5 h-5 overflow-hidden pointer-events-none">
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-amber-400/80 transform rotate-45 translate-x-3 translate-y-3 shadow-md border-t border-l border-white/60 animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* Peel Cue Badge for beginners */}
      {!alwaysReveal && !isPinned && index === 0 && !isHovered && (
        <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-black/80 text-amber-300 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap border border-amber-500/30">
          Peel
        </div>
      )}
    </div>
  );
}
