'use client';

import React from 'react';
import { usePokerStore } from '@/lib/store';
import { X, TrendingDown, AlertTriangle, ShieldCheck, BarChart3 } from 'lucide-react';

interface SessionStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionStatsModal({ isOpen, onClose }: SessionStatsModalProps) {
  const { sessionStats, handsPlayed } = usePokerStore();

  if (!isOpen) return null;

  const totalDecisions = sessionStats.optimalCount + sessionStats.leakCount + sessionStats.blunderCount;
  const optimalPercent = totalDecisions > 0 ? Math.round((sessionStats.optimalCount / totalDecisions) * 100) : 100;
  const vpipPercent = sessionStats.handsPlayed > 0 ? Math.round((sessionStats.vpipHands / sessionStats.handsPlayed) * 100) : 0;
  const pfrPercent = sessionStats.handsPlayed > 0 ? Math.round((sessionStats.pfrHands / sessionStats.handsPlayed) * 100) : 0;

  const isProfitable = sessionStats.netProfit >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#17171a] border border-white/10 rounded-3xl p-6 max-w-xl w-full shadow-2xl text-white flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-wide">Live Session & Leak Analytics</h3>
              <p className="text-xs text-white/50">TAG Exploitative Training Performance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Net Profit */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Net Profit</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-xl font-black ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isProfitable ? `+$${sessionStats.netProfit.toFixed(2)}` : `-$${Math.abs(sessionStats.netProfit).toFixed(2)}`}
              </span>
            </div>
            <span className="text-[10px] text-white/40 mt-0.5">
              {(sessionStats.netProfit / 2).toFixed(1)} BB
            </span>
          </div>

          {/* VPIP % */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">VPIP %</span>
            <span className="text-xl font-black text-amber-300 mt-1">{vpipPercent}%</span>
            <span className="text-[10px] text-white/40 mt-0.5">Target: 20-25%</span>
          </div>

          {/* PFR % */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">PFR %</span>
            <span className="text-xl font-black text-blue-300 mt-1">{pfrPercent}%</span>
            <span className="text-[10px] text-white/40 mt-0.5">Target: 16-20%</span>
          </div>

          {/* Hands Played */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Hands</span>
            <span className="text-xl font-black text-purple-300 mt-1">{handsPlayed || sessionStats.handsPlayed}</span>
            <span className="text-[10px] text-white/40 mt-0.5">$1/$2 NL</span>
          </div>
        </div>

        {/* Coaching Grade Breakdown */}
        <div className="bg-black/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/70">
              Decision Quality Breakdown
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {optimalPercent}% Optimal
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${totalDecisions > 0 ? (sessionStats.optimalCount / totalDecisions) * 100 : 100}%` }}
              title={`Optimal: ${sessionStats.optimalCount}`}
            />
            <div
              className="bg-amber-500 h-full"
              style={{ width: `${totalDecisions > 0 ? (sessionStats.leakCount / totalDecisions) * 100 : 0}%` }}
              title={`Leaks: ${sessionStats.leakCount}`}
            />
            <div
              className="bg-rose-500 h-full"
              style={{ width: `${totalDecisions > 0 ? (sessionStats.blunderCount / totalDecisions) * 100 : 0}%` }}
              title={`Blunders: ${sessionStats.blunderCount}`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/5 text-center">
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

        {/* Cumulative EV Leak Cost */}
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-white/80">Estimated Session EV Lost to Leaks:</span>
          </div>
          <span className="font-mono font-black text-rose-400 text-sm">
            -${sessionStats.cumulativeEvLoss.toFixed(2)}
          </span>
        </div>

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
