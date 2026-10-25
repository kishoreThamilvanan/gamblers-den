'use client';

import React, { useState } from 'react';
import { usePokerStore } from '@/lib/store';
import { 
  Sparkles, Zap, TrendingUp, 
  AlertTriangle, Layers, Eye
} from 'lucide-react';
import { CasinoDockPanel } from '@/components/casino/CasinoDockPanel';
import { getProactiveAdvice, ProactiveAdvice } from '@/lib/poker/coach';
import { LogPosition } from './DealerLogBox';

interface AICoachPanelProps {
  position: LogPosition;
  onPositionChange: (pos: LogPosition) => void;
  onApplyAdvice: (action: 'fold' | 'check' | 'call' | 'bet' | 'raise', amount: number) => void;
  isStacked?: boolean;
  className?: string;
}

export function AICoachPanel({
  position,
  onPositionChange,
  onApplyAdvice,
  isStacked = false,
  className = '',
}: AICoachPanelProps) {
  const {
    players,
    heroSeatIndex,
    activePlayerIndex,
    phase,
    communityCards,
    currentBet,
    pot,
    tableConfig,
    handsPlayed,
  } = usePokerStore();

  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const currentDecisionKey = `${handsPlayed}-${phase}-${currentBet}`;
  const isSharkMode = tableConfig.difficulty === 'advanced';
  const isHintConcealed = isSharkMode && revealedKey !== currentDecisionKey;

  const heroIdx = players.findIndex((p) => p.archetype === 'Hero');
  const effectiveHeroIdx = heroIdx !== -1 ? heroIdx : heroSeatIndex;
  const hero = players[effectiveHeroIdx];
  const isHeroTurn = activePlayerIndex === effectiveHeroIdx && phase !== 'SHOWDOWN';

  // Count active limpers preflop
  const limpersCount = players.filter(
    (p, i) => i !== effectiveHeroIdx && !p.hasFolded && p.currentBet === 2
  ).length;

  const proactiveAdvice: ProactiveAdvice | null = hero && hero.holeCards && hero.holeCards.length >= 2
    ? getProactiveAdvice(
        hero.holeCards,
        communityCards,
        phase,
        hero.position,
        currentBet,
        hero.currentBet,
        pot,
        limpersCount,
        hero.stack
      )
    : null;

  return (
    <CasinoDockPanel
      position={position}
      onPositionChange={onPositionChange}
      isStacked={isStacked}
      isTop={true}
      title="Live AI Coach"
      icon={<Zap size={15} className="animate-pulse text-amber-400" />}
      badge={
        isHeroTurn ? (
          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold animate-pulse">
            YOUR TURN
          </span>
        ) : undefined
      }
      floatingTrigger={{
        label: 'AI Coach',
        icon: <Sparkles size={14} />,
        position: 'bottom-left',
      }}
      className={className}
    >
      <div className="space-y-3 text-xs">
        {proactiveAdvice ? (
          <>
            {/* Primary Recommendation Card */}
            {isHintConcealed ? (
              <div className="bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-rose-500/40 rounded-xl p-4 shadow-xl text-center space-y-2.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                  🦈 Vegas Sharks • Spoiler-Free Mode
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Pre-action coaching is concealed in Shark Mode so you can calculate pot odds and sizing independently. Your action will still be graded in the Blunder Ledger.
                </p>
                <button
                  onClick={() => setRevealedKey(currentDecisionKey)}
                  className="w-full py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Eye size={13} />
                  <span>Reveal Coach Hint</span>
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-emerald-500/40 rounded-xl p-3.5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                {/* Badge & Equity Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${proactiveAdvice.badgeColor}`}>
                    {proactiveAdvice.badge}
                  </span>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-zinc-400 flex items-center gap-0.5">
                      <TrendingUp size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 font-bold">{proactiveAdvice.equityPercent}%</span> Equity
                    </span>
                  </div>
                </div>

                {/* Hand Category */}
                <div className="text-[11px] font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                  <span>Holding:</span>
                  <span className="text-white font-bold">{proactiveAdvice.handDescription}</span>
                </div>

                {/* Action Headline */}
                <div className="mt-2 mb-2 p-2 rounded-lg bg-black/60 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Recommended Move</span>
                    <span className="text-base font-black text-emerald-400 tracking-wide">
                      {proactiveAdvice.label}
                    </span>
                  </div>

                  {/* 1-Click Apply Button */}
                  {isHeroTurn && (
                    <button
                      onClick={() => onApplyAdvice(proactiveAdvice.action, proactiveAdvice.recommendedAmount)}
                      className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[11px] uppercase tracking-wider rounded-lg shadow-lg transform active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 ring-1 ring-emerald-400/50"
                    >
                      <Zap size={12} />
                      <span>Apply & Play</span>
                    </button>
                  )}
                </div>

                {/* Strategic Rationale */}
                <p className="text-zinc-300 text-[11px] leading-relaxed mt-2.5">
                  {proactiveAdvice.rationale}
                </p>

                {/* Leak Warning */}
                {proactiveAdvice.leakWarning && (
                  <div className="mt-2.5 p-2 rounded-md bg-rose-950/30 border border-rose-500/30 text-[11px] text-rose-300 flex items-start gap-1.5">
                    <AlertTriangle size={13} className="shrink-0 text-rose-400 mt-0.5" />
                    <span>{proactiveAdvice.leakWarning}</span>
                  </div>
                )}
              </div>
            )}

            {/* Table Context Box */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 space-y-2 text-[11px]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                <span>Tactical Context</span>
                <span className="text-zinc-400 font-mono font-normal">Street: {phase}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-zinc-300">
                <div className="bg-black/40 p-2 rounded border border-white/5">
                  <span className="text-[9px] text-zinc-500 block uppercase font-medium">Position</span>
                  <span className="font-bold text-white">{hero?.position || 'BTN'}</span>
                </div>
                <div className="bg-black/40 p-2 rounded border border-white/5">
                  <span className="text-[9px] text-zinc-500 block uppercase font-medium">Pot Odds</span>
                  <span className="font-bold text-sky-400">{proactiveAdvice.potOddsPercent}%</span>
                </div>
              </div>

              {proactiveAdvice.targetOpenSizing && (
                <div className="flex justify-between items-center pt-1 border-t border-zinc-800 text-[10px]">
                  <span className="text-zinc-400">Standard Live Open:</span>
                  <span className="font-mono font-bold text-amber-300">{proactiveAdvice.targetOpenSizing}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 text-center text-zinc-400 space-y-2">
            <Sparkles size={28} className="mx-auto text-emerald-400 opacity-50 mb-1" />
            <h4 className="text-xs font-bold text-zinc-200">Waiting for Deal</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              When a new hand is dealt, the AI coach will analyze your pocket cards and position to recommend optimal low-stakes live exploitation.
            </p>
          </div>
        )}

        {/* Live $1/$2 Exploitative Principles */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <Layers size={12} className="text-amber-400" />
            <span>Winning Principles</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-zinc-400">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Preflop:</strong> Open 4x ($8). Never limp first into the pot.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Postflop:</strong> Bet big on wet boards with monsters; recreational players love chasing.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Rivers:</strong> Fold one pair to river raises; live players rarely bluff rivers.</span>
            </li>
          </ul>
        </div>
      </div>
    </CasinoDockPanel>
  );
}
