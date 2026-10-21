'use client';

import React from 'react';
import {
  Sparkles, Zap, TrendingUp, AlertTriangle, ShieldCheck,
  PanelLeftClose, PanelRightClose, ArrowDownToLine, X, Award
} from 'lucide-react';
import {
  BlackjackHandState,
  BlackjackCard,
  BasicStrategyAction,
  getBasicStrategyAction,
  calculateHand,
  calculateTrueCount,
} from '@/lib/blackjack/blackjackEngine';
import { LogPosition } from './BlackjackDealerLog';
import { clsx } from 'clsx';

interface BlackjackAICoachProps {
  activeHand: BlackjackHandState | null;
  dealerUpCard: BlackjackCard | null;
  runningCount: number;
  remainingCards: number;
  bankroll: number;
  onApplyAdvice?: (action: BasicStrategyAction) => void;
  position: LogPosition;
  onPositionChange: (pos: LogPosition) => void;
  isStacked?: boolean;
  className?: string;
}

export function BlackjackAICoach({
  activeHand,
  dealerUpCard,
  runningCount,
  remainingCards,
  bankroll,
  onApplyAdvice,
  position,
  onPositionChange,
  isStacked = false,
  className = '',
}: BlackjackAICoachProps) {
  const trueCount = calculateTrueCount(runningCount, remainingCards);

  // Determine basic strategy advice
  let advice: BasicStrategyAction | null = null;
  let explanation = '';
  let rationale = '';

  if (activeHand && dealerUpCard && activeHand.status === 'playing') {
    const canDouble = activeHand.cards.length === 2 && bankroll >= activeHand.bet;
    const canSplit =
      activeHand.cards.length === 2 &&
      activeHand.cards[0].rank === activeHand.cards[1].rank &&
      bankroll >= activeHand.bet;
    const canSurrender = activeHand.cards.length === 2 && !activeHand.isSplit;

    advice = getBasicStrategyAction(activeHand.cards, dealerUpCard, canDouble, canSplit, canSurrender);

    const dealerVal = dealerUpCard.rank === 'A' ? 11 : dealerUpCard.value;
    const playerEval = calculateHand(activeHand.cards);
    const playerTotal = playerEval.total;
    const isSoft = playerEval.isSoft;

    if (advice === 'hit') {
      explanation = `Basic strategy dictates HIT on ${isSoft ? 'Soft' : 'Hard'} ${playerTotal} vs Dealer ${dealerVal}.`;
      rationale = dealerVal >= 7
        ? `Dealer is strong (${dealerVal}). You must improve your total to avoid losing the showdown.`
        : `Even against a weak card, standing on ${playerTotal} yields lower long-term expectation than hitting.`;
    } else if (advice === 'stand') {
      explanation = `Basic strategy dictates STAND on ${isSoft ? 'Soft' : 'Hard'} ${playerTotal} vs Dealer ${dealerVal}.`;
      rationale = dealerVal <= 6
        ? `Dealer has a high bust rate (${dealerVal === 5 || dealerVal === 6 ? '42%' : '35-37%'}). Never risk busting yourself.`
        : `Standing preserves your showdown value against a dealer pat hand.`;
    } else if (advice === 'double') {
      explanation = `Basic strategy dictates DOUBLE DOWN on ${isSoft ? 'Soft' : 'Hard'} ${playerTotal} vs Dealer ${dealerVal}.`;
      rationale = `Massive mathematical edge: You have high odds of making a 19-21 while dealer faces high bust vulnerability.`;
    } else if (advice === 'split') {
      explanation = `Basic strategy dictates SPLIT on pair of ${activeHand.cards[0].rank}s vs Dealer ${dealerVal}.`;
      rationale = activeHand.cards[0].rank === '8'
        ? `Splitting 8s breaks a disastrous Hard 16 into two favorable starting hands of 8.`
        : `Splitting capitalizes on positive expectation by turning a single bet into two dominant positions.`;
    } else if (advice === 'surrender') {
      explanation = `Basic strategy recommends LATE SURRENDER on ${playerTotal} vs Dealer ${dealerVal}.`;
      rationale = `Surrendering recovers 50% of your wager, which exceeds the negative expectation of playing this hand.`;
    }
  }

  // Insurance calculation
  const isInsuranceSituation = dealerUpCard?.rank === 'A';
  const insuranceAdvice = trueCount >= 3.0
    ? 'Take Insurance (True Count >= +3.0 makes insurance +EV)'
    : 'Decline Insurance (Standard house edge is -7.4% on insurance)';

  if (position === 'hidden') {
    return (
      <button
        onClick={() => onPositionChange('left')}
        className="fixed bottom-12 right-4 z-40 bg-zinc-900/90 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 text-xs font-bold transition-all hover:scale-105 cursor-pointer backdrop-blur-md"
        title="Open AI Strategy Coach"
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
            AI Strategy Coach
          </span>
          <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded-full font-semibold border border-amber-800/50">
            Vegas S17
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
        {/* 1. Proactive Advice Card */}
        {activeHand && advice ? (
          <div className="bg-gradient-to-b from-amber-950/40 to-zinc-900 border border-amber-600/40 rounded-xl p-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                <Zap size={13} className="text-amber-400" />
                Optimal Action
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black font-black text-xs shadow-md uppercase">
                {advice === 'hit' && 'HIT'}
                {advice === 'stand' && 'STAND'}
                {advice === 'double' && 'DOUBLE DOWN'}
                {advice === 'split' && 'SPLIT PAIR'}
                {advice === 'surrender' && 'SURRENDER'}
              </span>
            </div>

            <p className="text-zinc-200 text-xs font-semibold leading-relaxed">
              {explanation}
            </p>
            <p className="text-zinc-400 text-[11px] mt-1.5 leading-normal">
              {rationale}
            </p>

            {/* 1-Click Apply Button */}
            {onApplyAdvice && (
              <button
                onClick={() => onApplyAdvice(advice!)}
                className="mt-3 w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
              >
                <Zap size={12} />
                <span>Apply Advice &bull; {advice.toUpperCase()}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center text-zinc-500">
            <ShieldCheck size={20} className="mx-auto mb-1.5 text-zinc-600" />
            <p className="text-xs font-medium">Awaiting Next Player Decision</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Place your bets and deal to receive instant mathematical strategy guidance.</p>
          </div>
        )}

        {/* 2. Hi-Lo Card Counting Telemetry */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp size={13} className="text-indigo-400" />
              Hi-Lo Counting Telemetry
            </span>
            <span className={clsx(
              'px-1.5 py-0.2 rounded text-[10px] font-mono font-bold',
              trueCount >= 2.0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
              trueCount <= -1.5 ? 'bg-rose-950 text-rose-300 border border-rose-700' :
              'bg-zinc-800 text-zinc-400'
            )}>
              {trueCount > 0 ? `+${trueCount.toFixed(1)}` : trueCount.toFixed(1)} TC
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Running Count</span>
              <span className="text-sm font-bold font-mono text-zinc-200">
                {runningCount > 0 ? `+${runningCount}` : runningCount}
              </span>
            </div>
            <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Player EV Edge</span>
              <span className={clsx(
                'text-sm font-bold font-mono',
                trueCount >= 1.0 ? 'text-emerald-400' : trueCount <= -1.0 ? 'text-rose-400' : 'text-zinc-300'
              )}>
                {trueCount > 0 ? `+${(trueCount * 0.5).toFixed(2)}%` : `${(trueCount * 0.5).toFixed(2)}%`}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
            {trueCount >= 2.0
              ? '🔥 High deck saturation of 10s and Aces. Favor double downs and consider increased bet sizing.'
              : trueCount <= -1.5
              ? '❄️ Low card concentration. Dealer is less prone to busting. Keep minimum bets.'
              : '⚖️ Neutral shoe expectation. Standard basic strategy applies.'}
          </p>
        </div>

        {/* 3. Insurance Math Advisor (When dealer shows Ace) */}
        {isInsuranceSituation && (
          <div className="bg-amber-950/30 border border-amber-600/40 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs mb-1">
              <AlertTriangle size={13} className="text-amber-400" />
              <span>Insurance Advisory</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-normal">
              {insuranceAdvice}
            </p>
          </div>
        )}

        {/* 4. Readiness & Strategy Rules Quick Reference */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5 text-[10px] text-zinc-400 space-y-1">
          <div className="font-bold text-zinc-300 text-[11px] flex items-center gap-1">
            <Award size={12} className="text-amber-400" />
            <span>Golden Rules of Basic Strategy</span>
          </div>
          <div>&bull; Always split Aces and 8s; never split 5s or 10s.</div>
          <div>&bull; Double 11 vs 2-10; double 10 vs 2-9; double 9 vs 3-6.</div>
          <div>&bull; Stand on Hard 12-16 vs Dealer 2-6 (except 12 vs 2-3).</div>
          <div>&bull; Never stand on Soft 17 or lower (always hit or double).</div>
        </div>
      </div>
    </aside>
  );
}
