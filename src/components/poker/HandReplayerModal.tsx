'use client';

import React, { useState } from 'react';
import { HandHistoryRecord, Card as CardType } from '@/types/poker';
import {
  X, SkipBack, ChevronLeft, ChevronRight, SkipForward,
  RotateCcw, TrendingUp, ShieldAlert, Eye
} from 'lucide-react';
import { clsx } from 'clsx';

interface HandReplayerModalProps {
  handRecord: HandHistoryRecord | null;
  onClose: () => void;
}

function MiniCard({ card }: { card: CardType }) {
  const isRed = card.suit === 'h' || card.suit === 'd';
  const suitSymbol = card.suit === 'h' ? '♥' : card.suit === 'd' ? '♦' : card.suit === 'c' ? '♣' : '♠';
  return (
    <div
      className={clsx(
        'w-10 h-14 rounded-md bg-white border border-slate-300 shadow-md flex flex-col justify-between p-1 font-bold text-xs select-none',
        isRed ? 'text-red-600' : 'text-slate-900'
      )}
    >
      <div className="flex items-center justify-between leading-none">
        <span>{card.rank}</span>
        <span>{suitSymbol}</span>
      </div>
      <div className="text-center text-base leading-none self-center">{suitSymbol}</div>
      <div className="flex items-center justify-between leading-none rotate-180">
        <span>{card.rank}</span>
        <span>{suitSymbol}</span>
      </div>
    </div>
  );
}

export function HandReplayerModal({ handRecord, onClose }: HandReplayerModalProps) {
  const [stepIdx, setStepIdx] = useState(0);

  if (!handRecord) return null;

  const steps = handRecord.steps || [];
  const totalSteps = steps.length;
  const clampedIdx = Math.min(Math.max(0, stepIdx), Math.max(0, totalSteps - 1));
  const currentStep = steps[clampedIdx];

  const boardCards = currentStep ? currentStep.communityCards : handRecord.finalCommunityCards;
  const currentPot = currentStep ? currentStep.potAfter : handRecord.potWon;
  const currentEquity = currentStep ? currentStep.heroEquityPercent : 50;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#11151e] border border-amber-500/40 rounded-3xl p-6 max-w-2xl w-full shadow-[0_25px_80px_rgba(0,0,0,0.95)] text-slate-100 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Street-by-Street Hand Replayer — Hand #{handRecord.handNumber}
              </h3>
              <p className="text-xs text-zinc-400">
                Winner: <span className="text-amber-300 font-bold">{handRecord.winnerNames}</span> (${handRecord.potWon.toFixed(2)} pot)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Street Progress Pills */}
        <div className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-2">
          <div className="flex items-center gap-2">
            {(['PREFLOP', 'FLOP', 'TURN', 'RIVER'] as const).map((st) => {
              const isCurrentStreet = currentStep?.phase === st;
              return (
                <span
                  key={st}
                  className={clsx(
                    'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md transition',
                    isCurrentStreet
                      ? 'bg-amber-500 text-black shadow'
                      : 'bg-zinc-800/80 text-zinc-500'
                  )}
                >
                  {st}
                </span>
              );
            })}
          </div>
          <span className="text-xs font-mono text-zinc-400">
            Action <strong className="text-white">{totalSteps > 0 ? clampedIdx + 1 : 0}</strong> / {totalSteps}
          </span>
        </div>

        {/* Mini Felt Stage: Community Cards, Pot & Hero Cards */}
        <div className="rounded-2xl bg-gradient-to-b from-[#174e2a] to-[#0c2d17] border border-emerald-500/30 p-5 flex flex-col items-center gap-4 shadow-inner">
          <div className="flex items-center justify-between w-full text-xs">
            <span className="bg-black/60 px-3 py-1 rounded-full border border-amber-500/30 text-amber-300 font-bold">
              Pot After Action: <strong className="text-white">${currentPot.toFixed(2)}</strong>
            </span>
            <span className="bg-black/60 px-3 py-1 rounded-full border border-emerald-500/30 text-emerald-300 font-bold">
              Hero Equity: <strong className="text-white">{currentEquity}%</strong>
            </span>
          </div>

          {/* Community Cards */}
          <div className="flex items-center gap-2 my-1">
            {boardCards.map((c, idx) => (
              <MiniCard key={idx} card={c} />
            ))}
            {Array.from({ length: Math.max(0, 5 - boardCards.length) }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="w-10 h-14 rounded-md border border-white/20 bg-black/25 flex items-center justify-center"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              </div>
            ))}
          </div>

          {/* Hero Hole Cards + Current Action Callout */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                Hero ({handRecord.heroPosition}):
              </span>
              <div className="flex items-center gap-1">
                {handRecord.heroHoleCards.map((c, idx) => (
                  <MiniCard key={idx} card={c} />
                ))}
              </div>
            </div>

            {currentStep && (
              <div className="bg-black/75 border border-zinc-700 rounded-xl px-4 py-2.5 text-right">
                <div className="text-[10px] text-zinc-400 uppercase font-bold">
                  Decision #{currentStep.stepIndex} • {currentStep.phase}
                </div>
                <div className="text-sm font-black text-white mt-0.5">
                  {currentStep.actorName} ({currentStep.actorPosition}):{' '}
                  <span className="text-amber-400">{currentStep.actionLabel}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Equity Trajectory Bar Chart Across Hand Steps */}
        {totalSteps > 0 && (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              <span className="flex items-center gap-1 text-emerald-400">
                <TrendingUp size={12} />
                Hero Equity Trajectory Across Actions
              </span>
              <span>Click any bar to jump to that action</span>
            </div>
            <div className="flex items-end gap-1.5 h-16 pt-2">
              {steps.map((st, idx) => {
                const isSelected = idx === clampedIdx;
                return (
                  <button
                    key={st.stepIndex}
                    onClick={() => setStepIdx(idx)}
                    className={clsx(
                      'flex-1 rounded-t transition-all cursor-pointer relative group',
                      isSelected
                        ? 'bg-emerald-400 ring-2 ring-amber-300'
                        : 'bg-emerald-600/40 hover:bg-emerald-500/70'
                    )}
                    style={{ height: `${Math.max(15, st.heroEquityPercent)}%` }}
                    title={`Step ${st.stepIndex}: ${st.actorName} ${st.actionLabel} (${st.heroEquityPercent}% eq)`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Coach Note or Live Tell at This Decision Point */}
        {(currentStep?.coachNote || currentStep?.liveTell) && (
          <div className="space-y-2">
            {currentStep.coachNote && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-start gap-2 text-xs">
                <ShieldAlert size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-300 block text-[10px] uppercase tracking-wider">
                    AI Coach Evaluation on This Move
                  </span>
                  <span className="text-zinc-200">{currentStep.coachNote}</span>
                </div>
              </div>
            )}
            {currentStep.liveTell && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 flex items-start gap-2 text-xs">
                <Eye size={15} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300 block text-[10px] uppercase tracking-wider">
                    Observed Live Timing Tell
                  </span>
                  <span className="text-zinc-200">{currentStep.liveTell}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Playback Step Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStepIdx(0)}
              disabled={clampedIdx === 0}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white transition cursor-pointer"
              title="First Action"
            >
              <SkipBack size={15} />
            </button>
            <button
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              disabled={clampedIdx === 0}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <ChevronLeft size={15} />
              <span>Previous Action</span>
            </button>
            <button
              onClick={() => setStepIdx((i) => Math.min(totalSteps - 1, i + 1))}
              disabled={clampedIdx >= totalSteps - 1}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <span>Next Action</span>
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => setStepIdx(Math.max(0, totalSteps - 1))}
              disabled={clampedIdx >= totalSteps - 1}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white transition cursor-pointer"
              title="Final Action"
            >
              <SkipForward size={15} />
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
