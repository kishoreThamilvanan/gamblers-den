'use client';

import React from 'react';
import { usePokerStore } from '@/lib/store';
import { calculatePotOdds, calculateMDF } from '@/lib/poker/coach';
import { evaluateHand } from '@/lib/poker/evaluator';
import { Activity, Gauge, HelpCircle, Target } from 'lucide-react';

export function GrindLabHUD() {
  const { players, heroSeatIndex, currentBet, pot, communityCards, phase } = usePokerStore();

  const hero = players[heroSeatIndex];
  if (!hero || hero.hasFolded) return null;

  const toCall = Math.max(0, currentBet - hero.currentBet);
  const potOdds = calculatePotOdds(toCall, pot);
  const mdf = calculateMDF(currentBet, pot);

  const heroEvaluation =
    hero.holeCards.length === 2 && communityCards.length >= 3
      ? evaluateHand([...hero.holeCards, ...communityCards])
      : null;

  return (
    <div className="w-full max-w-4xl mx-auto bg-black/90 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-white flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs select-none">
      
      {/* Hand Strength / Equity Snapshot */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Target className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-white/50 uppercase tracking-wider font-sans font-bold">
            Current Made Hand
          </span>
          <span className="text-sm font-black text-emerald-300 font-sans">
            {heroEvaluation ? heroEvaluation.name : phase === 'PREFLOP' ? 'Preflop Pocket' : 'Evaluating...'}
          </span>
        </div>
      </div>

      <div className="h-8 w-[1px] bg-white/10 hidden md:block" />

      {/* Pot Odds Display */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <Gauge className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider font-sans font-bold">
              Pot Odds Needed
            </span>
            <span title="The minimum equity your hand needs to profitably call this bet." className="text-white/30 cursor-help">
              <HelpCircle className="w-3 h-3" />
            </span>
          </div>
          <span className="text-sm font-black text-blue-300">
            {toCall > 0 ? `${potOdds}%` : '0% (Check Available)'}
          </span>
        </div>
      </div>

      <div className="h-8 w-[1px] bg-white/10 hidden md:block" />

      {/* MDF (Minimum Defense Frequency) */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
          <Activity className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider font-sans font-bold">
              MDF (Defense Freq)
            </span>
            <span title="Minimum percentage of your range you must defend to prevent opponent auto-profiting." className="text-white/30 cursor-help">
              <HelpCircle className="w-3 h-3" />
            </span>
          </div>
          <span className="text-sm font-black text-purple-300">
            {currentBet > 0 ? `${mdf}%` : '100%'}
          </span>
        </div>
      </div>

      <div className="h-8 w-[1px] bg-white/10 hidden md:block" />

      {/* Positional Badge & Stack Depth */}
      <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/5">
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-white/40 uppercase font-sans">Hero Position</span>
          <span className="text-xs font-black text-amber-400">{hero.position} (In Position)</span>
        </div>
      </div>

    </div>
  );
}
