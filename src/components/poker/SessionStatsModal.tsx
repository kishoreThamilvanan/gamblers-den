'use client';

import React from 'react';
import { usePokerStore } from '@/lib/store';
import { HandHistoryRecord } from '@/types/poker';
import {
  X, TrendingDown, AlertTriangle, ShieldCheck, BarChart3,
  Award, RotateCcw, Flame
} from 'lucide-react';
import { clsx } from 'clsx';

interface SessionStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayHand?: (record: HandHistoryRecord) => void;
}

export function SessionStatsModal({ isOpen, onClose, onReplayHand }: SessionStatsModalProps) {
  const { sessionStats, handsPlayed, handHistory, tableConfig } = usePokerStore();

  if (!isOpen) return null;

  const totalDecisions = sessionStats.optimalCount + sessionStats.leakCount + sessionStats.blunderCount;
  const optimalPercent = totalDecisions > 0 ? Math.round((sessionStats.optimalCount / totalDecisions) * 100) : 100;
  const vpipPercent = sessionStats.handsPlayed > 0 ? Math.round((sessionStats.vpipHands / sessionStats.handsPlayed) * 100) : 0;
  const pfrPercent = sessionStats.handsPlayed > 0 ? Math.round((sessionStats.pfrHands / sessionStats.handsPlayed) * 100) : 0;

  const isProfitable = sessionStats.netProfit >= 0;
  // Expected Value ($EV) = Realized Profit + EV lost to unforced leaks/blunders (or theoretical baseline)
  const theoreticalEvProfit = sessionStats.netProfit + sessionStats.cumulativeEvLoss;

  // Compute Live Casino Readiness Grade (A+ through F)
  const getReadinessGrade = () => {
    if (totalDecisions === 0) return { grade: 'A', label: 'Ready for Action', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/15' };
    const score = optimalPercent - sessionStats.blunderCount * 12 - sessionStats.leakCount * 5;
    if (score >= 88) return { grade: 'A+', label: 'Vegas Crushers', color: 'text-emerald-300 border-emerald-400/50 bg-emerald-500/20' };
    if (score >= 76) return { grade: 'A', label: 'Disciplined TAG', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/15' };
    if (score >= 64) return { grade: 'B', label: 'Solid Winning Reg', color: 'text-sky-300 border-sky-400/40 bg-sky-500/15' };
    if (score >= 50) return { grade: 'C', label: 'Minor Sizing Leaks', color: 'text-amber-300 border-amber-400/40 bg-amber-500/15' };
    if (score >= 35) return { grade: 'D', label: 'High Leak Vulnerability', color: 'text-orange-400 border-orange-500/40 bg-orange-500/15' };
    return { grade: 'F', label: 'Tilt / Spew Warning', color: 'text-rose-400 border-rose-500/40 bg-rose-500/15' };
  };

  const readiness = getReadinessGrade();

  // Top 3 Costliest Leaks sorted by EV loss descending
  const topLeaks = [...(sessionStats.leakLedger || [])]
    .sort((a, b) => b.evLoss - a.evLoss)
    .slice(0, 3);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#13161f] border border-white/15 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl text-white flex flex-col gap-5">
        
        {/* Header + Readiness Grade Badge */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black tracking-wide">
                Executive Session Review &amp; Blunder Ledger
              </h3>
              <p className="text-xs text-white/50">
                {tableConfig.tableSize}-Max • ${tableConfig.buyInAmount} Buy-In • {tableConfig.difficulty.toUpperCase()} Tier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={clsx('px-3 py-1.5 rounded-2xl border flex items-center gap-2', readiness.color)}>
              <Award className="w-4 h-4" />
              <div className="text-left leading-tight">
                <span className="text-[9px] uppercase font-bold block opacity-80">Readiness Grade</span>
                <span className="text-sm font-black">{readiness.grade} ({readiness.label})</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Realized Profit vs. Expected Value ($EV) + Primary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Realized Profit */}
          <div className="bg-black/45 border border-white/10 rounded-2xl p-3 flex flex-col">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Realized Profit</span>
            <span className={`text-xl font-black mt-1 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfitable ? `+$${sessionStats.netProfit.toFixed(2)}` : `-$${Math.abs(sessionStats.netProfit).toFixed(2)}`}
            </span>
            <span className="text-[10px] text-white/40 mt-0.5">
              {(sessionStats.netProfit / 2).toFixed(1)} BB
            </span>
          </div>

          {/* Expected Value ($EV) */}
          <div className="bg-black/45 border border-white/10 rounded-2xl p-3 flex flex-col">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Leak-Free $EV</span>
            <span className={`text-xl font-black mt-1 ${theoreticalEvProfit >= 0 ? 'text-amber-300' : 'text-rose-300'}`}>
              {theoreticalEvProfit >= 0 ? `+$${theoreticalEvProfit.toFixed(2)}` : `-$${Math.abs(theoreticalEvProfit).toFixed(2)}`}
            </span>
            <span className="text-[10px] text-rose-400/90 mt-0.5">
              -${sessionStats.cumulativeEvLoss.toFixed(2)} lost to leaks
            </span>
          </div>

          {/* VPIP / PFR */}
          <div className="bg-black/45 border border-white/10 rounded-2xl p-3 flex flex-col">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">VPIP / PFR</span>
            <span className="text-xl font-black text-sky-300 mt-1">
              {vpipPercent}% <span className="text-white/30">/</span> {pfrPercent}%
            </span>
            <span className="text-[10px] text-white/40 mt-0.5">Target: 22% / 18%</span>
          </div>

          {/* Hands Played */}
          <div className="bg-black/45 border border-white/10 rounded-2xl p-3 flex flex-col">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Hands Played</span>
            <span className="text-xl font-black text-purple-300 mt-1">{handsPlayed || sessionStats.handsPlayed}</span>
            <span className="text-[10px] text-white/40 mt-0.5">{optimalPercent}% Optimal</span>
          </div>
        </div>

        {/* Decision Quality Bar */}
        <div className="bg-black/50 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/70">
              Decision Accuracy Breakdown
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {optimalPercent}% Optimal Decisions
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${totalDecisions > 0 ? (sessionStats.optimalCount / totalDecisions) * 100 : 100}%` }}
            />
            <div
              className="bg-amber-500 h-full"
              style={{ width: `${totalDecisions > 0 ? (sessionStats.leakCount / totalDecisions) * 100 : 0}%` }}
            />
            <div
              className="bg-rose-500 h-full"
              style={{ width: `${totalDecisions > 0 ? (sessionStats.blunderCount / totalDecisions) * 100 : 0}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
            <div className="flex flex-col items-center">
              <span className="text-emerald-400 font-black text-sm flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {sessionStats.optimalCount}
              </span>
              <span className="text-[10px] text-white/40">Optimal Plays</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-amber-400 font-black text-sm flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {sessionStats.leakCount}
              </span>
              <span className="text-[10px] text-white/40">Strategic Leaks</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-rose-400 font-black text-sm flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                {sessionStats.blunderCount}
              </span>
              <span className="text-[10px] text-white/40">Blunders</span>
            </div>
          </div>
        </div>

        {/* Top 3 Costliest Leaks ("The Blunder Ledger") */}
        <div className="bg-black/45 border border-rose-500/20 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4" />
              Top Costliest Leaks (Blunder Ledger)
            </span>
            <span className="text-xs font-mono font-bold text-rose-400">
              Total EV Lost: -${sessionStats.cumulativeEvLoss.toFixed(2)}
            </span>
          </div>

          {topLeaks.length === 0 ? (
            <div className="text-xs text-zinc-400 py-3 text-center bg-zinc-900/50 rounded-xl border border-zinc-800">
              Zero leaks or blunders recorded this session! Disciplined live play.
            </div>
          ) : (
            <div className="space-y-2">
              {topLeaks.map((leak, idx) => (
                <div
                  key={leak.id}
                  className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        #{idx + 1} • {leak.rating.toUpperCase()}
                      </span>
                      <span className="font-bold text-white">
                        Hand #{leak.handNumber} ({leak.street}) — {leak.actionLabel}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">{leak.explanation}</p>
                  </div>
                  <span className="font-mono font-black text-rose-400 shrink-0 text-sm">
                    -${leak.evLoss.toFixed(2)} EV
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Hands History with Street-by-Street Replay Trigger */}
        {handHistory && handHistory.length > 0 && (
          <div className="bg-black/45 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Recent Hands — Click to Replay Street-by-Street
            </span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
              {handHistory.map((h) => (
                <div
                  key={`${h.handNumber}-${h.timestamp}`}
                  className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-400">#{h.handNumber}</span>
                    <span className="font-bold text-white">
                      {h.heroHoleCards.map((c) => `${c.rank}${c.suit === 'h' ? '♥' : c.suit === 'd' ? '♦' : c.suit === 'c' ? '♣' : '♠'}`).join(' ')}
                    </span>
                    <span className="text-[10px] font-mono bg-zinc-800 px-1.5 py-0.2 rounded text-zinc-300">
                      {h.heroPosition}
                    </span>
                    <span className={clsx('font-mono font-bold', h.netHeroProfit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {h.netHeroProfit >= 0 ? `+$${h.netHeroProfit.toFixed(2)}` : `-$${Math.abs(h.netHeroProfit).toFixed(2)}`}
                    </span>
                  </div>

                  {onReplayHand && (
                    <button
                      onClick={() => {
                        onClose();
                        onReplayHand(h);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>Replay Hand</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          Return to Table
        </button>

      </div>
    </div>
  );
}
