'use client';

import React, { useEffect, useState } from 'react';
import { FlyingCardData } from './CardDealingTypes';
import { Card } from '@/components/poker/Card';
import { Rank, Suit } from '@/types/poker';

interface FlyingCardProps {
  data: FlyingCardData;
  onComplete: (id: string) => void;
}

export function FlyingCard({ data, onComplete }: FlyingCardProps) {
  const [isLanded, setIsLanded] = useState(false);
  const duration = data.durationMs ?? 380;

  // Compute flight rotation based on trajectory angle
  const deltaX = data.target.x - data.origin.x;
  const naturalTilt = deltaX < 0 ? -10 : 10;
  const flightRot = data.flightRotation ?? naturalTilt;
  const targetRot = data.rotation ?? 0;

  useEffect(() => {
    // Trigger transition to target immediately after initial paint
    const animFrame = requestAnimationFrame(() => {
      setIsLanded(true);
    });

    const timer = setTimeout(() => {
      data.onLanded?.();
      onComplete(data.id);
    }, duration);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(timer);
    };
  }, [data, duration, onComplete]);

  const currentX = isLanded ? data.target.x : data.origin.x;
  const currentY = isLanded ? data.target.y : data.origin.y;
  const currentRot = isLanded ? targetRot : flightRot;

  return (
    <div
      className="absolute pointer-events-none select-none z-50 will-change-transform"
      style={{
        left: `${currentX}%`,
        top: `${currentY}%`,
        transform: `translate(-50%, -50%) rotate(${currentRot}deg) scale(${data.scale ?? 1})`,
        transition: isLanded
          ? `left ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), top ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`
          : 'none',
      }}
    >
      <div
        className="transition-shadow duration-300 rounded-md"
        style={{
          boxShadow: isLanded
            ? '0 3px 8px rgba(0, 0, 0, 0.65)'
            : '0 16px 30px rgba(0, 0, 0, 0.5), 0 0 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Card
          card={{
            rank: data.card.rank as Rank,
            suit: data.card.suit as Suit,
          }}
          hidden={data.faceDown}
          size={data.size ?? 'md'}
        />
      </div>
    </div>
  );
}
