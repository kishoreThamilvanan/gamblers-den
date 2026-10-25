'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Trash2, Shield
} from 'lucide-react';
import { CasinoDockPanel } from '@/components/casino/CasinoDockPanel';
import { clsx } from 'clsx';

export type LogPosition = 'right' | 'left' | 'bottom' | 'hidden';

export interface BlackjackLogMessage {
  id: string;
  timestamp: string;
  type: 'system' | 'deal' | 'action' | 'dealer' | 'settlement' | 'alert';
  text: string;
}

interface BlackjackDealerLogProps {
  logs: BlackjackLogMessage[];
  onClearLogs?: () => void;
  position: LogPosition;
  onPositionChange: (pos: LogPosition) => void;
  isStacked?: boolean;
  className?: string;
}

export function BlackjackDealerLog({
  logs,
  onClearLogs,
  position,
  onPositionChange,
  isStacked = false,
  className = '',
}: BlackjackDealerLogProps) {
  const [filter, setFilter] = useState<'all' | 'dealer' | 'payouts'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of dealer log when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'dealer') return log.type === 'dealer' || log.type === 'deal';
    if (filter === 'payouts') return log.type === 'settlement';
    return true;
  });

  return (
    <CasinoDockPanel
      position={position}
      onPositionChange={onPositionChange}
      isStacked={isStacked}
      isTop={false}
      title="Dealer Speech Log"
      icon={<MessageSquare className="w-4 h-4 text-sky-400" />}
      badge={
        <span className="text-[10px] bg-sky-950 text-sky-300 px-1.5 py-0.2 rounded-full font-mono border border-sky-800/50">
          {logs.length}
        </span>
      }
      tabs={[
        { id: 'all', label: 'All Events' },
        { id: 'dealer', label: 'Dealer' },
        { id: 'payouts', label: 'Payouts' },
      ]}
      activeTab={filter}
      onTabChange={(id) => setFilter(id as 'all' | 'dealer' | 'payouts')}
      floatingTrigger={{
        label: 'Dealer Log',
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
            <p className="text-xs">No dealer actions recorded yet.</p>
            <p className="text-[10px] text-zinc-600 mt-1">Actions from shoe deals, hits, and payouts will appear here in real time.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isSettlement = log.type === 'settlement';
            const isAlert = log.type === 'alert';
            const isAction = log.type === 'action';
            const isDealer = log.type === 'dealer';

            return (
              <div
                key={log.id}
                className={clsx(
                  'px-2 py-1 rounded border text-[11px] leading-relaxed transition-all',
                  isSettlement && 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300',
                  isAlert && 'bg-amber-950/30 border-amber-800/40 text-amber-300',
                  isAction && 'bg-indigo-950/20 border-indigo-800/30 text-zinc-200',
                  isDealer && 'bg-zinc-900/60 border-zinc-800 text-zinc-300',
                  !isSettlement && !isAlert && !isAction && !isDealer && 'bg-zinc-900/40 border-zinc-800/50 text-zinc-400'
                )}
              >
                <div className="flex items-center justify-between text-[9px] text-zinc-500 mb-0.5">
                  <span className="uppercase font-semibold tracking-wider text-indigo-400/80">
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
