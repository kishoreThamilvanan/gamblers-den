'use client';

import React, { useEffect } from 'react';
import { usePokerStore } from '@/lib/store';
import { CheckCircle2, AlertTriangle, XCircle, Info, X, TrendingDown, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

export function CoachDrawer() {
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
      icon: <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0" />,
      border: 'border-emerald-500/50',
      bg: 'bg-zinc-950/95',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      title: 'Optimal TAG Play',
    },
    Acceptable: {
      icon: <Info className="text-sky-400 w-5 h-5 shrink-0" />,
      border: 'border-sky-500/50',
      bg: 'bg-zinc-950/95',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      title: 'Acceptable Play',
    },
    Leak: {
      icon: <AlertTriangle className="text-amber-400 w-5 h-5 shrink-0" />,
      border: 'border-amber-500/50',
      bg: 'bg-zinc-950/95',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      title: 'Strategic Leak',
    },
    Blunder: {
      icon: <XCircle className="text-rose-500 w-5 h-5 shrink-0" />,
      border: 'border-rose-500/60',
      bg: 'bg-zinc-950/95',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      title: 'Costly Blunder',
    },
  }[currentFeedback.rating] || {
    icon: <Info className="text-zinc-400 w-5 h-5 shrink-0" />,
    border: 'border-zinc-700',
    bg: 'bg-zinc-950/95',
    badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    title: 'Coach Advice',
  };

  const isPositiveEv = currentFeedback.evLossEstimate > 0;

  return (
    <div
      className={clsx(
        'absolute top-4 right-4 max-w-sm w-full p-3.5 rounded-xl border backdrop-blur-md shadow-2xl z-50 animate-in slide-in-from-right-4 fade-in duration-200 select-none text-white',
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {config.icon}
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
                {isPositiveEv ? `+${currentFeedback.evLossEstimate.toFixed(1)} EV` : `${currentFeedback.evLossEstimate.toFixed(1)} EV`}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={clearFeedback}
          className="text-zinc-500 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-zinc-300 leading-relaxed font-sans mt-2 border-t border-zinc-800 pt-2">
        {currentFeedback.explanation}
      </p>

      {currentFeedback.potOddsPercent !== undefined && currentFeedback.potOddsPercent > 0 && (
        <div className="mt-2 text-[10px] text-zinc-500 font-mono">
          Pot Odds Required: <strong className="text-zinc-300">{currentFeedback.potOddsPercent}%</strong>
        </div>
      )}
    </div>
  );
}
