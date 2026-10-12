'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePokerStore } from '@/lib/store';
import { sound } from '@/lib/sound/soundSystem';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

export function ActionBar() {
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
  const [showRaisePopover, setShowRaisePopover] = useState(false);

  const sliderVal = Math.max(minPossibleBet, Math.min(maxBet, customBet ?? minPossibleBet));

  const handleAction = useCallback(
    (action: 'fold' | 'check' | 'call' | 'bet' | 'raise', amount?: number) => {
      if (!isHeroActive) return;
      setShowRaisePopover(false);
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
        if (!showRaisePopover) {
          setShowRaisePopover(true);
        } else {
          handleAction(currentBet === 0 ? 'bet' : 'raise', sliderVal);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHeroActive, phase, canCheck, currentBet, sliderVal, showRaisePopover, handleAction, dealNextHand]);

  if (!hero) return null;

  return (
    <div className="relative flex flex-col items-center z-40 select-none">
      
      {/* Expandable Raise Popover / Drawer (Sample 2 style) */}
      {showRaisePopover && isHeroActive && (
        <div className="mb-2 bg-[#18181c]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-3 shadow-[0_15px_35px_rgba(0,0,0,0.9)] flex flex-col gap-2.5 animate-in slide-in-from-bottom-2 fade-in duration-200 text-white min-w-[320px]">
          
          {/* Quick Presets Row */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => {
                sound.playChipSound();
                setCustomBet(minPossibleBet);
              }}
              className="py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer"
            >
              MIN (${minPossibleBet})
            </button>
            <button
              onClick={() => {
                sound.playChipSound();
                setCustomBet(Math.max(minPossibleBet, Math.round(pot * 0.5)));
              }}
              className="py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer"
            >
              1/2 (${Math.max(minPossibleBet, Math.round(pot * 0.5))})
            </button>
            <button
              onClick={() => {
                sound.playChipSound();
                setCustomBet(Math.max(minPossibleBet, Math.round(pot)));
              }}
              className="py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer"
            >
              POT (${Math.max(minPossibleBet, Math.round(pot))})
            </button>
            <button
              onClick={() => {
                sound.playChipSound();
                setCustomBet(maxBet);
              }}
              className="py-1 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-black transition-colors cursor-pointer"
            >
              MAX
            </button>
          </div>

          {/* Slider & Direct Number Input */}
          <div className="flex items-center gap-3 px-1">
            <input
              type="range"
              min={minPossibleBet}
              max={maxBet}
              step={1}
              value={sliderVal}
              onChange={(e) => setCustomBet(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex items-center gap-1 bg-black/80 px-2.5 py-1 rounded-lg border border-white/20">
              <span className="text-white/40 text-xs">$</span>
              <input
                type="number"
                min={minPossibleBet}
                max={maxBet}
                value={sliderVal}
                onChange={(e) => setCustomBet(Number(e.target.value))}
                className="w-14 bg-transparent text-white font-mono font-black text-sm focus:outline-none text-right"
              />
            </div>
          </div>

          {/* Confirm Bet / Raise Button */}
          <button
            onClick={() => handleAction(currentBet === 0 ? 'bet' : 'raise', sliderVal)}
            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
          >
            Confirm {currentBet === 0 ? 'Bet' : 'Raise'} to ${sliderVal}
          </button>
        </div>
      )}

      {/* Sleek Floating Action Dock (Sample 2 Style) */}
      <div
        className={clsx(
          'flex items-center gap-2.5 bg-[#141518]/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] transition-all',
          !isHeroActive && 'opacity-35 pointer-events-none'
        )}
      >
        {/* FOLD Button [F] */}
        <button
          onClick={() => handleAction('fold')}
          disabled={!isHeroActive}
          className="px-5 py-2.5 rounded-xl bg-[#27272a] hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/40 text-white hover:text-rose-300 font-black text-xs uppercase tracking-wider transition-all transform active:scale-95 cursor-pointer flex flex-col items-center leading-tight min-w-[75px]"
        >
          <span>Fold</span>
          <span className="text-[8px] text-white/40 font-mono font-normal">[F]</span>
        </button>

        {/* CHECK / CALL Button [C] */}
        <button
          onClick={() => handleAction(canCheck ? 'check' : 'call')}
          disabled={!isHeroActive}
          className="px-6 py-2.5 rounded-xl bg-[#15803d] hover:bg-[#16a34a] border border-emerald-400/30 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all transform active:scale-95 cursor-pointer flex flex-col items-center leading-tight min-w-[90px]"
        >
          <span>{canCheck ? 'Check' : `Call $${toCall}`}</span>
          <span className="text-[8px] text-white/60 font-mono font-normal">[C]</span>
        </button>

        {/* BET / RAISE Button [R] */}
        <button
          onClick={() => {
            if (!showRaisePopover) {
              setShowRaisePopover(true);
            } else {
              handleAction(currentBet === 0 ? 'bet' : 'raise', sliderVal);
            }
          }}
          disabled={!isHeroActive}
          className="px-6 py-2.5 rounded-xl bg-[#dc2626] hover:bg-[#ef4444] border border-rose-400/30 text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_12px_rgba(220,38,38,0.4)] transition-all transform active:scale-95 cursor-pointer flex items-center gap-1.5 leading-tight min-w-[105px]"
        >
          <div className="flex flex-col items-center">
            <span>{currentBet === 0 ? 'Bet' : 'Raise'}</span>
            <span className="text-[8px] text-white/60 font-mono font-normal">[R]</span>
          </div>
          {showRaisePopover ? (
            <ChevronDown className="w-3.5 h-3.5 text-white/70" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-white/70" />
          )}
        </button>
      </div>

    </div>
  );
}
