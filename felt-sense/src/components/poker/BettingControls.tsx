'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePokerStore } from '@/lib/store';
import { sound } from '@/lib/sound/soundSystem';

export function BettingControls() {
  const {
    players,
    activePlayerIndex,
    heroSeatIndex,
    currentBet,
    minRaise,
    pot,
    playerAction,
    phase,
    dealNextHand,
  } = usePokerStore();

  const isHeroActive = activePlayerIndex === heroSeatIndex && phase !== 'SHOWDOWN';
  const hero = players[heroSeatIndex];

  const toCall = hero ? Math.max(0, currentBet - hero.currentBet) : 0;
  const canCheck = toCall === 0;

  const maxBet = hero ? hero.stack + hero.currentBet : 200;
  const minPossibleBet = currentBet === 0 ? minRaise : currentBet + minRaise;

  const [customBet, setCustomBet] = useState<number | null>(null);
  const currentRaiseAmount = Math.max(minPossibleBet, Math.min(maxBet, customBet ?? minPossibleBet));

  const handleAction = useCallback(
    (action: 'fold' | 'check' | 'call' | 'bet' | 'raise', amount?: number) => {
      if (!isHeroActive) return;
      playerAction(action, amount);
    },
    [isHeroActive, playerAction]
  );

  // Keyboard Hotkeys: F = Fold, C = Check/Call, R = Raise, Space = Next Hand
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toUpperCase();

      if (phase === 'SHOWDOWN' && e.code === 'Space') {
        e.preventDefault();
        dealNextHand();
        return;
      }

      if (!isHeroActive) return;

      if (key === 'F') {
        e.preventDefault();
        handleAction('fold');
      } else if (key === 'C') {
        e.preventDefault();
        handleAction(canCheck ? 'check' : 'call');
      } else if (key === 'R') {
        e.preventDefault();
        handleAction(currentBet === 0 ? 'bet' : 'raise', currentRaiseAmount);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHeroActive, phase, canCheck, currentBet, currentRaiseAmount, handleAction, dealNextHand]);

  if (!hero) return null;

  return (
    <div className="w-full bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur-md px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 w-full max-w-5xl mx-auto select-none rounded-b-2xl shadow-2xl">
      
      {/* Sizing Controls: Presets, Range Slider, & Dollar Input */}
      <div className={`flex flex-col gap-2 w-full md:w-auto flex-1 max-w-lg transition-opacity ${!isHeroActive ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Presets Row: MIN, 1/2 POT, 3/4 POT, POT, MAX */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              sound.playChipSound();
              setCustomBet(minPossibleBet);
            }}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded text-zinc-300 transition-colors cursor-pointer"
          >
            MIN
          </button>
          <button
            onClick={() => {
              sound.playChipSound();
              setCustomBet(Math.max(minPossibleBet, Math.round(pot * 0.5)));
            }}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded text-zinc-300 transition-colors cursor-pointer"
          >
            1/2 POT
          </button>
          <button
            onClick={() => {
              sound.playChipSound();
              setCustomBet(Math.max(minPossibleBet, Math.round(pot * 0.75)));
            }}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded text-zinc-300 transition-colors cursor-pointer"
          >
            3/4 POT
          </button>
          <button
            onClick={() => {
              sound.playChipSound();
              setCustomBet(Math.max(minPossibleBet, Math.round(pot)));
            }}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded text-zinc-300 transition-colors cursor-pointer"
          >
            POT
          </button>
          <button
            onClick={() => {
              sound.playChipSound();
              setCustomBet(maxBet);
            }}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded text-amber-400 transition-colors cursor-pointer"
          >
            MAX
          </button>
        </div>

        {/* Range Slider & Direct Numeric Dollar Input */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={minPossibleBet}
            max={maxBet}
            step={1}
            value={currentRaiseAmount}
            onChange={(e) => setCustomBet(Number(e.target.value))}
            className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />

          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-white font-mono text-sm">
            <span className="text-zinc-400">$</span>
            <input
              type="number"
              min={minPossibleBet}
              max={maxBet}
              value={currentRaiseAmount}
              onChange={(e) => setCustomBet(Number(e.target.value))}
              className="w-16 bg-transparent text-white font-bold focus:outline-none text-right font-mono text-sm"
            />
          </div>
        </div>

      </div>

      {/* Primary Action Buttons: FOLD, CHECK / CALL, RAISE TO $[X] */}
      <div className={`flex items-center gap-2 shrink-0 transition-opacity ${!isHeroActive ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        {/* FOLD Button */}
        <button
          onClick={() => handleAction('fold')}
          disabled={!isHeroActive}
          className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-6 rounded-lg text-sm shadow-lg transform active:scale-95 transition-all cursor-pointer flex flex-col items-center leading-none"
        >
          <span>FOLD</span>
          <span className="text-[9px] text-white/50 font-mono mt-0.5 font-normal">[F]</span>
        </button>

        {/* CHECK / CALL Button */}
        <button
          onClick={() => handleAction(canCheck ? 'check' : 'call')}
          disabled={!isHeroActive}
          className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-6 rounded-lg text-sm shadow-lg transform active:scale-95 transition-all cursor-pointer flex flex-col items-center leading-none"
        >
          <span>{canCheck ? 'CHECK' : `CALL $${toCall}`}</span>
          <span className="text-[9px] text-white/50 font-mono mt-0.5 font-normal">[C]</span>
        </button>

        {/* RAISE TO $[X] Button */}
        <button
          onClick={() => handleAction(currentBet === 0 ? 'bet' : 'raise', currentRaiseAmount)}
          disabled={!isHeroActive}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-lg text-sm shadow-lg transform active:scale-95 transition-all cursor-pointer flex flex-col items-center leading-none"
        >
          <span>
            {currentBet === 0 ? 'BET' : 'RAISE TO'} ${currentRaiseAmount}
          </span>
          <span className="text-[9px] text-white/50 font-mono mt-0.5 font-normal">[R]</span>
        </button>
      </div>

    </div>
  );
}
