import React from 'react';
import { Player, Phase } from '@/types/poker';
import { Card } from './Card';
import { clsx } from 'clsx';

interface SeatConfig {
  id: number;
  pos: string;
  top: string;
  left: string;
  isHero?: boolean;
}

interface PlayerPodProps {
  player: Player;
  seat: SeatConfig;
  isActive: boolean;
  isDealer: boolean;
  phase: Phase;
}

export function PlayerPod({
  player,
  seat,
  isActive,
  isDealer,
  phase,
}: PlayerPodProps) {
  const isHero = seat.isHero || player.archetype === 'Hero';

  return (
    <div
      style={{ top: seat.top, left: seat.left }}
      className={clsx(
        'absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10 w-24 sm:w-28 transition-all duration-200',
        player.hasFolded ? 'opacity-40 grayscale' : 'opacity-100',
        isActive ? 'z-30' : ''
      )}
    >
      {/* Hole Cards Standing Upright */}
      {!player.hasFolded && player.holeCards && player.holeCards.length > 0 && (
        <div className="flex items-center -space-x-1.5 mb-1 filter drop-shadow-md">
          {isHero ? (
            <>
              <Card
                card={player.holeCards[0]}
                variant="hero"
                className="transform -rotate-2"
              />
              <Card
                card={player.holeCards[1]}
                variant="hero"
                className="transform rotate-2"
              />
            </>
          ) : (
            <>
              <Card
                card={player.holeCards[0]}
                hidden={phase !== 'SHOWDOWN'}
                variant="opponent"
                className="transform -rotate-1"
              />
              <Card
                card={player.holeCards[1]}
                hidden={phase !== 'SHOWDOWN'}
                variant="opponent"
                className="transform rotate-1"
              />
            </>
          )}
        </div>
      )}

      {/* Folded state label */}
      {player.hasFolded && (
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">
          Folded
        </span>
      )}

      {/* Chips in Play Badge (Current Bet) */}
      {player.currentBet > 0 && !player.hasFolded && (
        <div className="bg-black/75 border border-amber-500/30 text-amber-300 font-bold text-[10px] sm:text-xs px-2 py-0.5 rounded-full shadow-md mb-1 animate-in fade-in">
          ${player.currentBet}
        </div>
      )}

      {/* Avatar Container with Active Highlight */}
      <div className="relative">
        <div
          className={clsx(
            'w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-zinc-700 bg-zinc-800 shadow-md shrink-0 flex items-center justify-center text-xs font-bold text-white overflow-hidden',
            isActive ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-105' : '',
            isHero ? 'border-amber-400/80 bg-zinc-900' : ''
          )}
        >
          {isHero ? (
            <span className="text-amber-300 font-black">YOU</span>
          ) : (
            <span className="text-zinc-300 uppercase">
              {player.name.slice(0, 2)}
            </span>
          )}
        </div>

        {/* Dealer Button Badge */}
        {isDealer && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-zinc-950 font-black text-[9px] flex items-center justify-center border border-zinc-900 shadow-md">
            D
          </div>
        )}

        {/* Position Tag */}
        <div className="absolute -bottom-1 -left-1 bg-zinc-950 text-zinc-400 border border-zinc-800 text-[8px] font-bold px-1 rounded">
          {seat.pos.replace('Hero (BTN)', 'BTN')}
        </div>
      </div>

      {/* Player Pill Badge */}
      <div className="bg-zinc-950/90 border border-zinc-800 px-2 py-0.5 rounded-md text-center w-full mt-1 shadow-lg leading-tight">
        <div className="text-[11px] font-semibold text-zinc-200 truncate">
          {player.name}
        </div>
        <div className="text-[10px] sm:text-[11px] font-bold text-emerald-400 font-mono">
          ${player.stack.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
