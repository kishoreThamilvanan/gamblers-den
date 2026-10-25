'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, X, PanelLeftClose, PanelRightClose, 
  ArrowDownToLine, Trash2, Shield
} from 'lucide-react';
import { clsx } from 'clsx';
import { LogPosition } from '../blackjack/BlackjackDealerLog';

export interface RouletteLogMessage {
  id: string;
  timestamp: string;
  type: 'system' | 'bet' | 'spin' | 'result' | 'payout' | 'alert';
  text: string;
}

interface RouletteDealerLogProps {
  logs: RouletteLogMessage[];
  onClearLogs?: () => void;
  position: LogPosition;
  onPositionChange: (pos: LogPosition) => void;
  isStacked?: boolean;
  className?: string;
}

export function RouletteDealerLog({
  logs,
  onClearLogs,
  position,
  onPositionChange,
  isStacked = false,
  className = '',
}: RouletteDealerLogProps) {
  const [filter, setFilter] = useState<'all' | 'spins' | 'payouts'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of dealer log when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (position === 'hidden') {
    return (
      <button
        onClick={() => onPositionChange('right')}
        className="fixed bottom-24 right-4 z-40 bg-zinc-900/90 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 text-xs font-bold transition-all hover:scale-105 cursor-pointer backdrop-blur-md"
        title="Open Croupier Log"
      >
        <MessageSquare size={14} />
        <span>Croupier Log ({logs.length})</span>
      </button>
    );
  }

  const containerClasses = clsx(
    'bg-[#0c0d14]/95 backdrop-blur-xl border-zinc-800 text-slate-100 flex flex-col z-40 select-none font-sans transition-all duration-300 shadow-2xl',
    position === 'right' && (isStacked ? 'fixed right-0 top-[52%] bottom-0 w-80 sm:w-88 border-l border-t' : 'fixed right-0 top-14 bottom-0 w-80 sm:w-88 border-l'),
    position === 'left' && (isStacked ? 'fixed left-0 top-[52%] bottom-0 w-80 sm:w-88 border-r border-t' : 'fixed left-0 top-14 bottom-0 w-80 sm:w-88 border-r'),
    position === 'bottom' && 'w-full h-full border rounded-lg',
    className
  );

  const filteredLogs = logs.filter((log) => {
    if (filter === 'spins') return log.type === 'spin' || log.type === 'result';
    if (filter === 'payouts') return log.type === 'payout';
    return true;
  });

  return (
    <aside className={containerClasses}>
      {/* Top Header & Docking Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/80 bg-zinc-950/60">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold tracking-wider uppercase text-zinc-200">
            Croupier Log
          </span>
          <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded-full font-mono border border-amber-800/50">
            {logs.length}
          </span>
        </div>

        {/* Position selectors */}
        <div className="flex items-center space-x-1">
          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
              title="Clear Log"
            >
              <Trash2 size={13} />
            </button>
          )}
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
            title="Hide Log"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-zinc-800/60 bg-zinc-950/40 px-2 py-1 gap-1 text-[11px]">
        <button
          onClick={() => setFilter('all')}
          className={clsx(
            'px-2 py-0.5 rounded font-medium transition',
            filter === 'all'
              ? 'bg-amber-600/30 text-amber-300 font-semibold border border-amber-500/40'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          All Events
        </button>
        <button
          onClick={() => setFilter('spins')}
          className={clsx(
            'px-2 py-0.5 rounded font-medium transition',
            filter === 'spins'
              ? 'bg-amber-600/30 text-amber-300 font-semibold border border-amber-500/40'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          Spins
        </button>
        <button
          onClick={() => setFilter('payouts')}
          className={clsx(
            'px-2 py-0.5 rounded font-medium transition',
            filter === 'payouts'
              ? 'bg-amber-600/30 text-amber-300 font-semibold border border-amber-500/40'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          Payouts
        </button>
      </div>

      {/* Message Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-1.5 text-xs font-mono">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center p-4">
            <Shield size={24} className="mb-2 text-zinc-600" />
            <p className="text-xs">No croupier events recorded yet.</p>
            <p className="text-[10px] text-zinc-600 mt-1">Place your bets on the felt and spin the wheel to see live croupier calls.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isPayout = log.type === 'payout';
            const isResult = log.type === 'result';
            const isSpin = log.type === 'spin';
            const isBet = log.type === 'bet';

            return (
              <div
                key={log.id}
                className={clsx(
                  'px-2 py-1 rounded border text-[11px] leading-relaxed transition-all',
                  isPayout && 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300',
                  isResult && 'bg-amber-950/30 border-amber-800/40 text-amber-300',
                  isSpin && 'bg-zinc-900 border-zinc-700 text-zinc-200',
                  isBet && 'bg-zinc-900/60 border-zinc-800 text-zinc-300',
                  !isPayout && !isResult && !isSpin && !isBet && 'bg-zinc-900/40 border-zinc-800/50 text-zinc-400'
                )}
              >
                <div className="flex items-center justify-between text-[9px] text-zinc-500 mb-0.5">
                  <span className="uppercase font-semibold tracking-wider text-amber-400/80">
                    {log.type}
                  </span>
                  <span>{log.timestamp}</span>
                </div>
                <div className="font-sans font-medium">{log.text}</div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
