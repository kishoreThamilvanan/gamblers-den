'use client';

import React from 'react';
import { FlyingCardData } from './CardDealingTypes';
import { FlyingCard } from './FlyingCard';

interface CardDealingOverlayProps {
  flyingCards: FlyingCardData[];
  onCardLanded: (id: string) => void;
  className?: string;
}

export function CardDealingOverlay({
  flyingCards,
  onCardLanded,
  className = '',
}: CardDealingOverlayProps) {
  if (flyingCards.length === 0) return null;

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden z-40 ${className}`}
      aria-hidden="true"
    >
      {flyingCards.map((task) => (
        <FlyingCard
          key={task.id}
          data={task}
          onComplete={onCardLanded}
        />
      ))}
    </div>
  );
}
