'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePokerStore } from '@/lib/store';
import { 
  MessageSquare, ShieldAlert, BarChart2
} from 'lucide-react';
import { CasinoDockPanel } from '@/components/casino/CasinoDockPanel';
import { clsx } from 'clsx';

export type LogPosition = 'right' | 'left' | 'bottom' | 'hidden';

interface DealerLogBoxProps {
  position: LogPosition;
  onPositionChange: (pos: LogPosition) => void;
  isStacked?: boolean;
  className?: string;
}

export function DealerLogBox({
  position,
  onPositionChange,
  isStacked = false,
  className = '',
}: DealerLogBoxProps) {
  const { logs, pot, handsPlayed, currentFeedback, sessionStats } = usePokerStore();
  const [activeTab, setActiveTab] = useState<'dealer' | 'coach' | 'stats'>('dealer');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of dealer log when new messages arrive
  useEffect(() => {
    if (scrollRef.current && activeTab === 'dealer') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, activeTab]);

  return (
    <CasinoDockPanel
      position={position}
      onPositionChange={onPositionChange}
      isStacked={isStacked}
      isTop={false}
      title="Dealer Speech Log"
      icon={<MessageSquare className="w-4 h-4 text-sky-400" />}
      tabs={[
        { id: 'dealer', label: 'Dealer', icon: <MessageSquare size={13} /> },
        { id: 'coach', label: 'Coach', icon: <ShieldAlert size={13} className="text-emerald-400" /> },
        { id: 'stats', label: 'Stats', icon: <BarChart2 size={13} className="text-purple-400" /> },
      ]}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as 'dealer' | 'coach' | 'stats')}
      floatingTrigger={{
        label: 'Dealer Log',
        icon: <MessageSquare size={14} />,
        position: 'bottom-right',
      }}
      className={className}
    >
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* TAB 1: DEALER LOG */}
        {activeTab === 'dealer' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Live Pot Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/80 text-xs">
              <span className="text-zinc-400 text-[11px] font-semibold">
                Hand <span className="text-white font-bold">#{handsPlayed || 1}</span>
              </span>
              <span className="text-amber-300 font-extrabold text-[11px]">
                Pot: ${pot.toFixed(2)}
              </span>
            </div>

            {/* Scrollable Log Stream */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 font-mono text-[11px] pr-1 select-text"
            >
              {logs.map((log, idx) => {
                const isHandHeader = log.startsWith('===');
                const isStreet = log.startsWith('---');
                const isWin = log.includes('wins') || log.includes('Winner');
                const isHero = log.includes('Hero') || log.includes('You');

                if (isHandHeader) {
                  return (
                    <div
                      key={idx}
                      className="text-amber-400 font-bold py-1 px-1.5 my-1 bg-amber-500/10 border-l-2 border-amber-400 rounded-r text-[10px]"
                    >
                      {log}
                    </div>
                  );
                }

                if (isStreet) {
                  return (
                    <div
                      key={idx}
                      className="text-sky-300 font-bold py-0.5 px-1.5 my-0.5 bg-sky-950/40 border-l-2 border-sky-400 rounded-r text-[10px]"
                    >
                      {log}
                    </div>
                  );
                }

                if (isWin) {
                  return (
                    <div
                      key={idx}
                      className="text-emerald-300 font-extrabold py-1 px-1.5 my-1 bg-emerald-950/60 border border-emerald-500/40 rounded flex items-center gap-1.5"
                    >
                      <span className="text-amber-400">🏆</span>
                      <span>{log}</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className={clsx(
                      'leading-relaxed py-0.5 px-1 rounded transition-colors',
                      isHero
                        ? 'text-amber-300 bg-amber-500/10 font-medium'
                        : 'text-zinc-300 hover:text-white'
                    )}
                  >
                    <span className="text-zinc-600 mr-1.5 select-none">•</span>
                    <span>{log}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE STRATEGY COACH */}
        {activeTab === 'coach' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 text-xs">
            {currentFeedback ? (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={clsx(
                      'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded',
                      currentFeedback.rating === 'Optimal' && 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
                      currentFeedback.rating === 'Acceptable' && 'bg-sky-500/20 text-sky-300 border border-sky-500/40',
                      currentFeedback.rating === 'Leak' && 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
                      currentFeedback.rating === 'Blunder' && 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    )}
                  >
                    {currentFeedback.rating}
                  </span>
                  {currentFeedback.evLossEstimate !== 0 && (
                    <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-300 font-bold">
                      {currentFeedback.evLossEstimate > 0 ? `+${currentFeedback.evLossEstimate.toFixed(1)}` : currentFeedback.evLossEstimate.toFixed(1)} EV
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-bold text-white mb-1">
                  Action: {currentFeedback.action.toUpperCase()}
                </div>

                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {currentFeedback.explanation}
                </p>
              </div>
            ) : (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-center text-zinc-400">
                <ShieldAlert size={24} className="mx-auto text-emerald-400 mb-1.5 opacity-60" />
                <p className="text-xs font-semibold text-zinc-300">Live Strategy Coach Active</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Your moves are evaluated against live $1/$2 exploit heuristics. Recommendations appear immediately after each decision.
                </p>
              </div>
            )}

            {/* Exploitative Principles Checklist */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Live $1/$2 Key Exploits
              </h4>
              <ul className="space-y-1.5 text-[11px] text-zinc-300">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Raise 4x–5x preflop ($8–$10). Limpers require +$2 per caller.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Value bet calling stations relentlessly; never bluff nits.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Fold to river raises with one pair — live players rarely bluff rivers.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 3: SESSION STATS */}
        {activeTab === 'stats' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 text-xs pr-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-2.5">
                <span className="text-[10px] text-zinc-400 block font-semibold uppercase">Hands</span>
                <span className="text-base font-extrabold text-white">{handsPlayed || 1}</span>
              </div>
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-2.5">
                <span className="text-[10px] text-zinc-400 block font-semibold uppercase">Net Profit</span>
                <span className={clsx(
                  'text-base font-extrabold',
                  sessionStats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                )}>
                  {sessionStats.netProfit >= 0 ? `+$${sessionStats.netProfit.toFixed(2)}` : `-$${Math.abs(sessionStats.netProfit).toFixed(2)}`}
                </span>
              </div>
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-2.5">
                <span className="text-[10px] text-zinc-400 block font-semibold uppercase">VPIP</span>
                <span className="text-base font-extrabold text-amber-300">
                  {sessionStats.handsPlayed > 0 ? Math.round((sessionStats.vpipHands / sessionStats.handsPlayed) * 100) : 0}%
                </span>
              </div>
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-2.5">
                <span className="text-[10px] text-zinc-400 block font-semibold uppercase">PFR</span>
                <span className="text-base font-extrabold text-sky-400">
                  {sessionStats.handsPlayed > 0 ? Math.round((sessionStats.pfrHands / sessionStats.handsPlayed) * 100) : 0}%
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Play Accuracy</div>
              <div className="flex justify-between text-[11px]">
                <span className="text-emerald-400">Optimal Moves:</span>
                <span className="font-bold text-white">{sessionStats.optimalCount}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-amber-400">Leaks Identified:</span>
                <span className="font-bold text-white">{sessionStats.leakCount}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-rose-400">Blunders:</span>
                <span className="font-bold text-white">{sessionStats.blunderCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </CasinoDockPanel>
  );
}
