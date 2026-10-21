'use client';

import React from 'react';
import {
  Sparkles, TrendingUp, AlertTriangle, ShieldCheck,
  PanelLeftClose, PanelRightClose, ArrowDownToLine, X, BarChart2
} from 'lucide-react';
import {
  RouletteVariant,
  RouletteBet,
  RoulettePocket,
  EUROPEAN_WHEEL_ORDER,
  AMERICAN_WHEEL_ORDER,
} from '@/lib/roulette/rouletteEngine';
import { LogPosition } from '../blackjack/BlackjackDealerLog';
import { clsx } from 'clsx';

interface RouletteAICoachProps {
  variant: RouletteVariant;
  bets: Record<string, RouletteBet>;
  history: RoulettePocket[];
  bankroll: number;
  position: LogPosition;
  onPositionChange: (pos: LogPosition) => void;
  isStacked?: boolean;
  className?: string;
}

export function RouletteAICoach({
  variant,
  bets,
  history,
  bankroll,
  position,
  onPositionChange,
  isStacked = false,
  className = '',
}: RouletteAICoachProps) {
  const activeBetsArray = Object.values(bets);
  const totalWagered = activeBetsArray.reduce((sum, b) => sum + b.amount, 0);
  const totalPockets = variant === 'european' ? EUROPEAN_WHEEL_ORDER.length : AMERICAN_WHEEL_ORDER.length;

  // Compute unique pockets covered
  const coveredSet = new Set<number | '00'>();
  activeBetsArray.forEach((b) => {
    b.numbers.forEach((num) => coveredSet.add(num));
  });

  const coveredCount = coveredSet.size;
  const coveragePercent = totalPockets > 0 ? ((coveredCount / totalPockets) * 100).toFixed(1) : '0';

  // House edge & EV calculation
  const houseEdgePercent = variant === 'european' ? 2.70 : 5.26;
  const expectedLoss = (totalWagered * (houseEdgePercent / 100)).toFixed(2);

  // Bankroll risk analysis
  const bankrollRiskPercent = bankroll > 0 ? ((totalWagered / bankroll) * 100).toFixed(1) : '0';
  const riskTier: 'safe' | 'moderate' | 'aggressive' =
    parseFloat(bankrollRiskPercent) > 8 ? 'aggressive' :
    parseFloat(bankrollRiskPercent) > 3 ? 'moderate' : 'safe';

  // Gambler's Fallacy streak detection
  let streakMessage: string | null = null;
  if (history.length >= 3) {
    const recentColors = history.slice(0, 4).map((p) => p.color);
    const allRecentRed = recentColors.every((c) => c === 'red');
    const allRecentBlack = recentColors.every((c) => c === 'black');

    if (allRecentRed) {
      streakMessage = `⚠️ Gambler's Fallacy Notice: ${recentColors.length} Reds in a row! Each roulette spin is an independent Bernoulli trial. Black is NOT 'due' to hit; probability of Black remains exactly ${variant === 'european' ? '48.65%' : '47.37%'}.`;
    } else if (allRecentBlack) {
      streakMessage = `⚠️ Gambler's Fallacy Notice: ${recentColors.length} Blacks in a row! Roulette has no memory. Red is NOT 'due' to hit; next probability remains ${variant === 'european' ? '48.65%' : '47.37%'}.`;
    }
  }

  if (position === 'hidden') {
    return (
      <button
        onClick={() => onPositionChange('left')}
        className="fixed bottom-12 right-4 z-40 bg-zinc-900/90 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 text-xs font-bold transition-all hover:scale-105 cursor-pointer backdrop-blur-md"
        title="Open AI Odds Coach"
      >
        <Sparkles size={14} />
        <span>AI Coach</span>
      </button>
    );
  }

  const containerClasses = clsx(
    'bg-[#0c0d14]/95 backdrop-blur-xl border-zinc-800 text-slate-100 flex flex-col z-40 select-none font-sans transition-all duration-300 shadow-2xl',
    position === 'right' && (isStacked ? 'fixed right-0 top-14 h-[46%] w-80 sm:w-88 border-l border-b' : 'fixed right-0 top-14 bottom-0 w-80 sm:w-88 border-l'),
    position === 'left' && (isStacked ? 'fixed left-0 top-14 h-[46%] w-80 sm:w-88 border-r border-b' : 'fixed left-0 top-14 bottom-0 w-80 sm:w-88 border-r'),
    position === 'bottom' && 'w-full h-full border rounded-lg',
    className
  );

  return (
    <aside className={containerClasses}>
      {/* Top Header & Docking Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/80 bg-zinc-950/60">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold tracking-wider uppercase text-amber-300">
            AI Probability Coach
          </span>
          <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded-full font-semibold border border-amber-800/50">
            {variant === 'european' ? 'European 2.7%' : 'American 5.3%'}
          </span>
        </div>

        {/* Position selectors */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPositionChange('left')}
            className={clsx(
              'p-1 rounded hover:bg-zinc-800 transition',
              position === 'left' ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
            )}
            title="Dock to Left"
          >
            <PanelLeftClose size={13} />
          </button>
          <button
            onClick={() => onPositionChange('right')}
            className={clsx(
              'p-1 rounded hover:bg-zinc-800 transition',
              position === 'right' ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
            )}
            title="Dock to Right"
          >
            <PanelRightClose size={13} />
          </button>
          <button
            onClick={() => onPositionChange('bottom')}
            className={clsx(
              'p-1 rounded hover:bg-zinc-800 transition',
              position === 'bottom' ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
            )}
            title="Dock to Bottom"
          >
            <ArrowDownToLine size={13} />
          </button>
          <button
            onClick={() => onPositionChange('hidden')}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition"
            title="Hide Coach"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Coach Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {/* 1. Wheel Coverage Meter */}
        <div className="bg-gradient-to-b from-amber-950/40 to-zinc-900 border border-amber-600/40 rounded-xl p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
              <BarChart2 size={13} className="text-amber-400" />
              Wheel Coverage
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black font-black text-xs shadow-md">
              {coveragePercent}%
            </span>
          </div>

          <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800 mb-2">
            <div
              style={{ width: `${coveragePercent}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-300"
            />
          </div>

          <p className="text-zinc-300 text-[11px] leading-relaxed">
            {totalWagered > 0 ? (
              <>
                You are covering <span className="text-white font-bold">{coveredCount}</span> of{' '}
                <span className="text-white font-bold">{totalPockets}</span> pockets with a total bet of{' '}
                <span className="text-amber-300 font-bold">${totalWagered}</span>.
              </>
            ) : (
              'Place chips on the felt to evaluate wheel coverage and mathematical expectation.'
            )}
          </p>
        </div>

        {/* 2. Expected Loss & House Edge Analysis */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp size={13} className="text-indigo-400" />
              Expected Value Math
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-400">
              {houseEdgePercent}% Edge
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Expected Loss</span>
              <span className="text-sm font-bold font-mono text-rose-400">
                -${expectedLoss}
              </span>
            </div>
            <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Bankroll Exposure</span>
              <span className={clsx(
                'text-sm font-bold font-mono',
                riskTier === 'aggressive' ? 'text-rose-400' :
                riskTier === 'moderate' ? 'text-amber-400' : 'text-emerald-400'
              )}>
                {bankrollRiskPercent}%
              </span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
            {variant === 'european' ? (
              <>Single zero (<code className="text-emerald-400">0</code>) produces a favorable 2.70% house edge.</>
            ) : (
              <>Double zero (<code className="text-amber-400">00</code>) nearly doubles the house edge to 5.26%. Consider European mode for better long-term EV.</>
            )}
          </p>
        </div>

        {/* 3. Gambler's Fallacy Detector Alert */}
        {streakMessage && (
          <div className="bg-amber-950/40 border border-amber-600/50 rounded-xl p-3 shadow-md">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs mb-1">
              <AlertTriangle size={13} className="text-amber-400" />
              <span>Cognitive Bias Warning</span>
            </div>
            <p className="text-[11px] text-zinc-200 leading-normal">
              {streakMessage}
            </p>
          </div>
        )}

        {/* 4. Strategic Betting Principles */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5 text-[10px] text-zinc-400 space-y-1">
          <div className="font-bold text-zinc-300 text-[11px] flex items-center gap-1">
            <ShieldCheck size={12} className="text-amber-400" />
            <span>Optimal Roulette Disciplines</span>
          </div>
          <div>&bull; Avoid Martingale doubling systems; table limits guarantee eventual ruin.</div>
          <div>&bull; Outside bets (Red/Black, Dozens) have lowest variance for bankroll preservation.</div>
          <div>&bull; Keep individual spin wagers under 3% of your career bankroll.</div>
        </div>
      </div>
    </aside>
  );
}
