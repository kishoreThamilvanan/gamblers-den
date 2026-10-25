'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Trash2, Shield
} from 'lucide-react';
import { CasinoDockPanel } from '@/components/casino/CasinoDockPanel';
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

  const filteredLogs = logs.filter((log) => {
    if (filter === 'spins') return log.type === 'spin' || log.type === 'result';
    if (filter === 'payouts') return log.type === 'payout';
    return true;
  });

  return (
    <CasinoDockPanel
      position={position}
      onPositionChange={onPositionChange}
      isStacked={isStacked}
      isTop={false}
      title="Croupier Log"
      icon={<MessageSquare className="w-4 h-4 text-amber-400" />}
      badge={
        <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded-full font-mono border border-amber-800/50">
          {logs.length}
        </span>
      }
      tabs={[
        { id: 'all', label: 'All Events' },
        { id: 'spins', label: 'Spins' },
        { id: 'payouts', label: 'Payouts' },
      ]}
      activeTab={filter}
      onTabChange={(id) => setFilter(id as 'all' | 'spins' | 'payouts')}
      floatingTrigger={{
        label: 'Croupier Log',
        icon: <MessageSquare size={14} />,
        position: 'bottom-right',
      }}
      headerRightExtra={
        onClearLogs && (
          <button
            onClick={onClearLogs}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            title="Clear Log"
          >
            <Trash2 size={13} />
          </button>
        )
      }
      className={className}
    >
      {/* Message Feed */}
      <div ref={scrollRef} className="space-y-1.5 text-xs font-mono">
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
    </CasinoDockPanel>
  );
}
