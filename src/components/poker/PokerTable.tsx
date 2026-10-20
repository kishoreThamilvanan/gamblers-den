'use client';

import React from 'react';
import { usePokerStore } from '@/lib/store';
import { PlayerPod } from './PlayerPod';
import { Card } from './Card';
import { evaluateHand } from '@/lib/poker/evaluator';

export const SEAT_POSITIONS = [
  { id: 0, pos: 'Hero (BTN)', top: '83%', left: '50%', isHero: true },
  { id: 1, pos: 'SB', top: '78%', left: '22%' },
  { id: 2, pos: 'BB', top: '50%', left: '8%' },
  { id: 3, pos: 'UTG', top: '22%', left: '16%' },
  { id: 4, pos: 'UTG+1', top: '10%', left: '35%' },
  { id: 5, pos: 'MP', top: '10%', left: '65%' },
  { id: 6, pos: 'LJ', top: '22%', left: '84%' },
  { id: 7, pos: 'HJ', top: '50%', left: '92%' },
  { id: 8, pos: 'CO', top: '78%', left: '78%' },
];

export function PokerTable() {
  const {
    players,
    activePlayerIndex,
    communityCards,
    pot,
    dealerIndex,
    phase,
    dealNextHand,
    heroSeatIndex,
  } = usePokerStore();

  const hero = players[heroSeatIndex];

  // Evaluate current hand for board banner
  const heroHandEval =
    hero && hero.holeCards && hero.holeCards.length === 2 && communityCards.length >= 3
      ? evaluateHand([...hero.holeCards, ...communityCards])
      : null;

  return (
    <div className="w-full max-w-5xl aspect-[16/9] relative flex items-center justify-center p-4 select-none">
      
      {/* Outer Rail: Strict geometry from Section 2 */}
      <div className="w-full h-full rounded-[140px] md:rounded-[180px] bg-gradient-to-b from-[#2b160c] via-[#432313] to-[#1c0d06] p-3 md:p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-amber-900/40 relative flex items-center justify-center">
        
        {/* Brass Trim */}
        <div className="w-full h-full rounded-[126px] md:rounded-[166px] p-1 bg-gradient-to-tr from-amber-700/50 via-amber-200/30 to-amber-900/60 shadow-inner flex items-center justify-center">
          
          {/* Inner Felt */}
          <div className="w-full h-full rounded-[122px] md:rounded-[162px] bg-radial-[at_center] from-[#1f663b] via-[#144f2b] to-[#0c311a] shadow-[inset_0_0_80px_rgba(0,0,0,0.85)] border border-emerald-950/60 relative overflow-hidden flex items-center justify-center">
            
            {/* Felt Subtle Pattern */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />

            {/* Subtle Brand Logo Watermark */}
            <div className="absolute flex flex-col items-center opacity-10 pointer-events-none">
              <span className="text-white font-serif font-black text-6xl md:text-8xl tracking-tighter italic">
                GD
              </span>
              <span className="text-white font-bold text-[9px] md:text-[11px] uppercase tracking-[0.35em]">
                Gambler&apos;s Den NLHE
              </span>
            </div>

            {/* Center Felt Board Area: Pot, Hand Rank, Community Cards */}
            <div className="relative z-10 flex flex-col items-center gap-1 sm:gap-2">
              
              {/* Active Pot Display */}
              <div className="flex flex-col items-center">
                <span className="text-emerald-300/70 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest">
                  Total Pot
                </span>
                <span className="text-white font-black text-sm sm:text-lg md:text-xl font-mono">
                  ${pot.toFixed(2)}
                </span>
              </div>

              {/* Live Hand Rank Badge */}
              <div className="h-5 flex items-center justify-center">
                {heroHandEval ? (
                  <div className="text-amber-300 font-bold text-[10px] sm:text-xs uppercase tracking-wider bg-black/50 px-2.5 py-0.5 rounded-full border border-amber-400/20 backdrop-blur-sm shadow-sm animate-in fade-in">
                    {heroHandEval.name}
                  </div>
                ) : (
                  phase !== 'PREFLOP' && communityCards.length > 0 && (
                    <div className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-wider font-mono">
                      Street: {phase}
                    </div>
                  )
                )}
              </div>

              {/* Community Cards */}
              <div className="flex items-center gap-1.5 sm:gap-2 filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)]">
                {communityCards.map((c, i) => (
                  <div key={i} className="animate-in slide-in-from-top-2 fade-in duration-200">
                    <Card card={c} variant="community" />
                  </div>
                ))}
                {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="w-10 h-14 sm:w-12 sm:h-18 md:w-14 md:h-20 border border-emerald-900/40 rounded-md bg-black/20 flex items-center justify-center"
                  >
                    <div className="w-1 h-1 rounded-full bg-emerald-800/40" />
                  </div>
                ))}
              </div>

            </div>

            {/* Showdown Result Overlay */}
            {phase === 'SHOWDOWN' && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 rounded-[122px] md:rounded-[162px] backdrop-blur-sm animate-in fade-in">
                <div className="bg-zinc-950/95 border border-amber-500/30 p-4 sm:p-5 rounded-2xl flex flex-col items-center shadow-2xl text-center max-w-xs">
                  <span className="text-amber-400 font-black text-[10px] uppercase tracking-widest">
                    Hand Complete
                  </span>
                  <h3 className="text-lg font-black text-white mt-0.5 mb-3">
                    Showdown
                  </h3>
                  <button
                    onClick={dealNextHand}
                    className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-lg transform active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Deal Next Hand</span>
                    <span className="text-[9px] text-white/50 font-mono">[Space]</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* 9 Strict Percentage Positioned Seats */}
        {SEAT_POSITIONS.map((seat, index) => {
          const player = players[index] || players[0];
          return (
            <PlayerPod
              key={seat.id}
              player={player}
              seat={seat}
              isActive={index === activePlayerIndex && phase !== 'SHOWDOWN'}
              isDealer={index === dealerIndex}
              phase={phase}
            />
          );
        })}

      </div>

    </div>
  );
}
