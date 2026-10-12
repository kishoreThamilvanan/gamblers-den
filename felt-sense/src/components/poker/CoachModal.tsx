'use client';

import React, { useEffect } from 'react';
import { usePokerStore } from '@/lib/store';
import { CheckCircle2, AlertTriangle, XCircle, Info, X, TrendingDown, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

export function CoachModal() {
  const { currentFeedback, clearFeedback } = usePokerStore();

  useEffect(() => {
    if (!currentFeedback) return;
    const timer = setTimeout(() => {
      clearFeedback();
    }, 7000);
    return () => clearTimeout(timer);
  }, [currentFeedback, clearFeedback]);

  if (!currentFeedback) return null;

  const config = {
    Optimal: {
      icon: <CheckCircle2 className="text-emerald-400 w-7 h-7" />,
      border: 'border-emerald-500/60',
      bg: 'bg-emerald-950/90',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      title: 'Optimal TAG Play',
    },
    Acceptable: {
      icon: <Info className="text-blue-400 w-7 h-7" />,
      border: 'border-blue-500/60',
      bg: 'bg-blue-950/90',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      title: 'Acceptable Line',
    },
    Leak: {
      icon: <AlertTriangle className="text-amber-400 w-7 h-7" />,
      border: 'border-amber-500/60',
      bg: 'bg-amber-950/90',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      title: 'Live Exploit Leak',
    },
    Blunder: {
      icon: <XCircle className="text-rose-500 w-7 h-7" />,
      border: 'border-rose-500/70',
      bg: 'bg-rose-950/95',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      title: 'Major Strategy Blunder',
    },
  }[currentFeedback.rating] || {
    icon: <Info className="text-white w-7 h-7" />,
    border: 'border-white/40',
    bg: 'bg-slate-900',
    badge: 'bg-white/10 text-white border-white/20',
    title: 'Coach Feedback',
  };

  const isPositiveEv = currentFeedback.evLossEstimate > 0;

  return (
    <div
      className={clsx(
        'absolute top-4 right-4 max-w-sm w-full p-4 rounded-2xl border backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-50 animate-in slide-in-from-right-8 fade-in duration-300 select-none text-white',
        config.bg,
        config.border
      )}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {config.icon}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${config.badge}`}>
                {currentFeedback.rating}
              </span>
              {currentFeedback.evLossEstimate !== 0 && (
                <span
                  className={clsx(
                    'text-[10px] font-mono font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded',
                    isPositiveEv ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  )}
                >
                  {isPositiveEv ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositiveEv ? `+${currentFeedback.evLossEstimate.toFixed(2)} EV` : `${currentFeedback.evLossEstimate.toFixed(2)} EV`}
                </span>
              )}
            </div>
            <h4 className="text-sm font-black text-white tracking-wide mt-1">
              {config.title}
            </h4>
          </div>
        </div>

        <button
          onClick={clearFeedback}
          className="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Rationale Body */}
      <p className="text-xs text-white/90 leading-relaxed font-sans mt-3 border-t border-white/10 pt-2.5">
        {currentFeedback.explanation}
      </p>

      {/* Footer Details */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50 font-mono">
        <span>Action: <strong className="text-white">{currentFeedback.action}</strong></span>
        {currentFeedback.potOddsPercent !== undefined && currentFeedback.potOddsPercent > 0 && (
          <span>Pot Odds: <strong className="text-white">{currentFeedback.potOddsPercent}%</strong></span>
        )}
      </div>
    </div>
  );
}
