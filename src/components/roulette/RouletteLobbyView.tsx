'use client';

import { useState } from 'react';
import {
  PlusCircle, Trash2, Clock, Coins,
  Timer, RotateCcw, Sparkles, Disc3
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  RouletteSession,
  RouletteTableConfig,
  RouletteStakesTier,
  RouletteWheelVariant,
} from '@/lib/sessions/types';
import { UserProfile } from '@/types/poker';
import { TableTopBar } from '@/components/casino';

export interface RouletteLobbyViewProps {
  savedSessions: RouletteSession[];
  currentConfig: RouletteTableConfig;
  onConfigChange: (config: Partial<RouletteTableConfig>) => void;
  onStartNewTable: (config?: RouletteTableConfig) => void;
  onResumeSession: (session: RouletteSession) => void;
  onDeleteSession: (sessionId: string) => void;
  userProfile?: UserProfile | null;
  onOpenProfile?: () => void;
}

const STAKES_TIERS: Array<{
  id: RouletteStakesTier;
  label: string;
  minBet: number;
  maxBet: number;
  desc: string;
}> = [
  { id: 'casual', label: '☕ Casual Table', minBet: 1, maxBet: 100, desc: '$1 Min • $100 Max Bet' },
  { id: 'regular', label: '🎰 Casino Floor', minBet: 5, maxBet: 500, desc: '$5 Min • $500 Max Bet' },
  { id: 'vip', label: '💎 Salon Privé VIP', minBet: 25, maxBet: 2500, desc: '$25 Min • $2,500 Max Bet' },
];

export function RouletteLobbyView({
  savedSessions,
  currentConfig,
  onConfigChange,
  onStartNewTable,
  onResumeSession,
  onDeleteSession,
  userProfile,
  onOpenProfile,
}: RouletteLobbyViewProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Today at ${timeStr}`;
    }
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
  };

  const handleStakesTierSelect = (tier: RouletteStakesTier) => {
    const selected = STAKES_TIERS.find((t) => t.id === tier);
    if (!selected) return;
    onConfigChange({
      stakesTier: tier,
      minBet: selected.minBet,
      maxBet: selected.maxBet,
    });
  };

  const mostRecentSession = savedSessions[0];

  return (
    <div className="min-h-screen w-full bg-[#0a0d14] text-white flex flex-col justify-between overflow-y-auto custom-scrollbar font-sans select-none">
      {/* Standardized Fixed Casino Top Navigation Bar */}
      <TableTopBar
        mode="lobby"
        title="Monte Carlo Roulette"
        subtitle={`${currentConfig.variant.toUpperCase()} • ${currentConfig.stakesTier.toUpperCase()} $${currentConfig.minBet}–$${currentConfig.maxBet} • ${currentConfig.betTimerSeconds ? `${currentConfig.betTimerSeconds}s Clock` : 'Manual Spin'}`}
        icon={
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 to-rose-900 flex items-center justify-center text-white font-black text-xs shadow-md shrink-0">
            RL
          </div>
        }
        floorHref="/"
        bankroll={userProfile?.careerBankroll}
        userProfile={userProfile}
        onProfileClick={onOpenProfile}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Hero Banner + Interactive Table Configuration Deck */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#211218] via-[#15121c] to-[#121622] border border-rose-500/25 p-5 sm:p-7 shadow-2xl flex flex-col gap-5">
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div className="flex flex-col gap-1.5 max-w-xl">
              <div className="inline-flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full w-fit border border-rose-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                Single Zero 35:1 Straight-Up Payouts
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Configure Your Monte Carlo Wheel
              </h2>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                Choose between European Single Zero (2.7% edge) or American Double Zero (5.26% edge), set table betting limits, betting clock timers, and session buy-in stack.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {mostRecentSession && (
                <button
                  onClick={() => onResumeSession(mostRecentSession)}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-rose-400/30 text-white font-bold text-sm tracking-wide transition cursor-pointer shadow-lg"
                  title="Resume your most recent active session"
                >
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  <span>Resume Table (${mostRecentSession.bankroll.toLocaleString()})</span>
                </button>
              )}
              <button
                onClick={() => onStartNewTable(currentConfig)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-base tracking-wide uppercase shadow-[0_8px_25px_rgba(225,29,72,0.35)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Open Roulette Table</span>
              </button>
            </div>
          </div>

          {/* Configuration Controls Grid (4-Part Deck) */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 border-t border-white/10">
            {/* 1. Wheel Variant */}
            <div className="bg-black/45 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-400">
                <Disc3 className="w-3.5 h-3.5" />
                <span>Wheel Variant</span>
              </div>
              <div className="flex flex-col gap-1.5 my-auto">
                {([
                  { id: 'european', label: '🇪🇺 European Single 0', sub: '37 Pockets • 2.70% Edge' },
                  { id: 'american', label: '🇺🇸 American 0 & 00', sub: '38 Pockets • 5.26% Edge' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => onConfigChange({ variant: opt.id as RouletteWheelVariant })}
                    className={clsx(
                      'px-2.5 py-1.5 rounded-xl text-left transition cursor-pointer border flex flex-col',
                      currentConfig.variant === opt.id
                        ? 'bg-rose-600/30 text-rose-200 border-rose-500/60 font-bold'
                        : 'bg-white/5 text-white/60 border-transparent hover:text-white'
                    )}
                  >
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className="text-[10px] opacity-75">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Table Stakes Tier */}
            <div className="bg-black/45 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                <Coins className="w-3.5 h-3.5" />
                <span>Table Limits</span>
              </div>
              <div className="flex flex-col gap-1">
                {STAKES_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => handleStakesTierSelect(tier.id)}
                    className={clsx(
                      'px-2.5 py-1 rounded-xl text-left transition cursor-pointer border flex flex-col',
                      currentConfig.stakesTier === tier.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-white/5 text-white/60 border-transparent hover:text-white'
                    )}
                  >
                    <span className="text-xs font-bold">{tier.label}</span>
                    <span className="text-[10px] opacity-75">{tier.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Betting Countdown Clock */}
            <div className="bg-black/45 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
                <Timer className="w-3.5 h-3.5" />
                <span>Betting Countdown Clock</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 my-auto">
                {([
                  { sec: 10, label: '⚡ 10s', sub: 'Blitz' },
                  { sec: 15, label: '⏱️ 15s', sub: 'Standard' },
                  { sec: 30, label: '🐢 30s', sub: 'Relaxed' },
                  { sec: null, label: '🖐️ Manual', sub: 'Untimed' },
                ] as const).map((opt) => (
                  <button
                    key={String(opt.sec)}
                    onClick={() => onConfigChange({ betTimerSeconds: opt.sec })}
                    className={clsx(
                      'py-1.5 px-1 rounded-xl text-center transition cursor-pointer border flex flex-col items-center justify-center',
                      currentConfig.betTimerSeconds === opt.sec
                        ? 'bg-sky-600/30 text-sky-300 border-sky-500/60 font-black'
                        : 'bg-white/5 text-white/60 border-transparent hover:text-white font-semibold'
                    )}
                  >
                    <span className="text-xs">{opt.label}</span>
                    <span className="text-[9px] opacity-70">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Session Buy-In Stack */}
            <div className="bg-black/45 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                <Coins className="w-3.5 h-3.5" />
                <span>Session Buy-In Stack</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 my-auto">
                {([
                  { amt: 500, label: '$500' },
                  { amt: 1000, label: '$1,000' },
                  { amt: 2500, label: '$2,500' },
                  { amt: 5000, label: '$5,000' },
                ] as const).map((b) => (
                  <button
                    key={b.amt}
                    onClick={() => onConfigChange({ buyInAmount: b.amt })}
                    className={clsx(
                      'py-2 px-1 rounded-xl text-center transition cursor-pointer border flex flex-col items-center justify-center',
                      currentConfig.buyInAmount === b.amt
                        ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60 font-black'
                        : 'bg-white/5 text-white/60 border-transparent hover:text-white font-semibold'
                    )}
                  >
                    <span className="text-xs font-bold">{b.label}</span>
                    <span className="text-[9px] opacity-70">Chips</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Saved Sessions Deck (Up to 5 Sessions) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold uppercase tracking-wider text-white">
                Active Game Sessions
              </h3>
              <span className="text-xs bg-white/10 text-zinc-300 px-2 py-0.5 rounded-full font-bold">
                {savedSessions.length} / 5
              </span>
            </div>
            <span className="text-xs text-zinc-500 hidden sm:inline">
              Auto-saved on each spin &bull; Enforces 5 active table cap
            </span>
          </div>

          {savedSessions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-900/60 border border-white/5 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
              <Clock className="w-8 h-8 text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-400">No active Roulette sessions saved yet.</p>
              <p className="text-xs max-w-md">
                Configure your wheel and limits above and click &quot;Open Roulette Table&quot;. Your session bankroll and wheel outcomes will auto-save here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {savedSessions.map((s) => {
                const isConfirmingDelete = deleteConfirmId === s.id;

                return (
                  <div
                    key={s.id}
                    className="relative rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-white/10 hover:border-rose-500/40 p-4 transition flex flex-col justify-between gap-3 shadow-lg group"
                  >
                    {/* Top Row: Variant & Timestamp */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black uppercase text-rose-300 tracking-wider">
                            {`${s.config.variant.toUpperCase()} WHEEL`}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            ${s.config.minBet}–${s.config.maxBet}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Clock size={11} />
                          {formatTimestamp(s.lastPlayedAt)}
                        </span>
                      </div>

                      {/* Delete Trigger */}
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500/50 p-1 rounded-lg">
                          <button
                            onClick={() => {
                              onDeleteSession(s.id);
                              setDeleteConfirmId(null);
                            }}
                            className="text-[10px] bg-rose-600 hover:bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[10px] text-zinc-400 hover:text-white px-1 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(s.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                          title="Delete saved session"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Middle Telemetry */}
                    <div className="grid grid-cols-2 gap-2 bg-black/40 border border-white/5 rounded-xl p-2.5">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Table Bankroll</span>
                        <span className="text-sm font-mono font-black text-emerald-400">
                          ${s.bankroll.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Spins Played</span>
                        <span className="text-sm font-mono font-bold text-white">
                          {s.handsPlayed}
                        </span>
                      </div>
                    </div>

                    {/* Recent Numbers History Pills */}
                    {s.recentNumbers && s.recentNumbers.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                        <span className="text-[10px] text-zinc-500 font-bold shrink-0">Recent:</span>
                        {s.recentNumbers.slice(0, 6).map((rn, idx) => (
                          <span
                            key={idx}
                            className={clsx(
                              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm',
                              rn.color === 'red' ? 'bg-red-600' : rn.color === 'black' ? 'bg-zinc-800 border border-zinc-600' : 'bg-emerald-600'
                            )}
                          >
                            {rn.pocket}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => onResumeSession(s)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-600/15 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Resume Session</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-6 text-center text-xs text-zinc-600 flex flex-col sm:flex-row items-center justify-center gap-2">
        <span>Gambler&apos;s Den Monte Carlo Roulette &bull; Multi-Session Persistence Engine &bull; Simulated Currency Only</span>
      </footer>
    </div>
  );
}
