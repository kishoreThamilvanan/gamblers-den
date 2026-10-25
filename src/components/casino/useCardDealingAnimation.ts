'use client';

import { useState, useCallback, useRef } from 'react';
import { FlyingCardData } from './CardDealingTypes';
import { sound } from '@/lib/sound/soundSystem';

export interface DealCardParams {
  card: { rank: string; suit: string; value?: number };
  faceDown?: boolean;
  origin: { x: number; y: number };
  target: { x: number; y: number };
  durationMs?: number;
  rotation?: number;
  flightRotation?: number;
  scale?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  targetSeatLabel?: string;
  onLanded?: () => void;
}

export function useCardDealingAnimation() {
  const [flyingCards, setFlyingCards] = useState<FlyingCardData[]>([]);
  const idCounter = useRef(0);
  const pendingTasksRef = useRef<Map<string, () => void>>(new Map());
  const isFastForwardingRef = useRef(false);

  const onCardLanded = useCallback((id: string) => {
    sound.playCardSnap();
    setFlyingCards((prev) => prev.filter((c) => c.id !== id));
    const resolver = pendingTasksRef.current.get(id);
    if (resolver) {
      pendingTasksRef.current.delete(id);
      resolver();
    }
  }, []);

  /**
   * Launch a single physical card flight across the table.
   */
  const dealSingleCard = useCallback(
    (params: DealCardParams): Promise<void> => {
      if (isFastForwardingRef.current) {
        // If skipping, land immediately
        params.onLanded?.();
        sound.playCardSnap();
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        idCounter.current += 1;
        const id = `flying-card-${Date.now()}-${idCounter.current}`;

        const task: FlyingCardData = {
          ...params,
          id,
          onLanded: () => {
            params.onLanded?.();
          },
        };

        pendingTasksRef.current.set(id, resolve);
        sound.playCardSlide();
        setFlyingCards((prev) => [...prev, task]);
      });
    },
    []
  );

  /**
   * Fast-forward / skip dealing: instantly resolves all active flights.
   */
  const fastForward = useCallback(() => {
    isFastForwardingRef.current = true;
    setFlyingCards((current) => {
      current.forEach((task) => {
        task.onLanded?.();
        const resolver = pendingTasksRef.current.get(task.id);
        if (resolver) {
          pendingTasksRef.current.delete(task.id);
          resolver();
        }
      });
      return [];
    });
    sound.playCardSnap();
    setTimeout(() => {
      isFastForwardingRef.current = false;
    }, 100);
  }, []);

  return {
    flyingCards,
    isDealing: flyingCards.length > 0,
    dealSingleCard,
    fastForward,
    onCardLanded,
  };
}
