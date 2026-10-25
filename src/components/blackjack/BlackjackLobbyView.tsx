'use client';

import { useState } from 'react';
import {
  PlusCircle, Trash2, Clock, Coins, Shield,
  Layers, Users, Zap, RotateCcw, Sparkles
} from 'lucide-react';
import { clsx } from 'clsx';
import { BlackjackSession, BlackjackTableConfig, BlackjackStakesTier } from '@/lib/sessions/types';
import { UserProfile } from '@/types/poker';
import { TableTopBar } from '@/components/casino';

export interface BlackjackLobbyViewProps {
  savedSessions: BlackjackSession[];
  currentConfig: BlackjackTableConfig;
  onConfigChange: (config: Partial<BlackjackTableConfig>) => void;
  onStartNewTable: (config?: BlackjackTableConfig) => void;
  onResumeSession: (session: BlackjackSession) => void;
  onDeleteSession: (sessionId: string) => void;
  userProfile?: UserProfile | null;
  onOpenProfile?: () => void;
}

const STAKES_TIERS: Array<{
  id: BlackjackStakesTier;
  label: string;
  minBet: number;
  maxBet: number;
  desc: string;
}> = [
  { id: 'casual', label: '☕ Casual Table', minBet: 5, maxBet: 200, desc: '$5 Min • $200 Max Bet' },
  { id: 'regular', label: '🎰 Casino Floor', minBet: 25, maxBet: 1000, desc: '$25 Min • $1,000 Max Bet' },
  { id: 'vip', label: '💎 VIP Salon Privé', minBet: 100, maxBet: 5000, desc: '$100 Min • $5,000 Max Bet' },
];

export function BlackjackLobbyView({
  savedSessions,
  currentConfig,
  onConfigChange,
  onStartNewTable,
  onResumeSession,
  onDeleteSession,
  userProfile,
  onOpenProfile,
}: BlackjackLobbyViewProps) {
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

  const handleStakesTierSelect = (tier: BlackjackStakesTier) => {
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
        title="Blackjack Lounge"
        subtitle={`${currentConfig.stakesTier.toUpperCase()} • $${currentConfig.minBet}–$${currentConfig.maxBet} • ${currentConfig.spotCount} Spots • ${currentConfig.deckCount}-Deck`}
        icon={
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-black text-xs italic shadow-md shrink-0">
            21
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#17231a] via-[#10171a] to-[#121622] border border-amber-500/25 p-5 sm:p-7 shadow-2xl flex flex-col gap-5">
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div className="flex flex-col gap-1.5 max-w-xl">
              <div className="inline-flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full w-fit border border-amber-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                Vegas S17 Natural 3:2 Rules
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Configure Your VIP Blackjack Table
              </h2>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                Customize stakes limits, active multi-hand spots, automated bot seat filling, shoe decks, or activate the <strong className="text-amber-300">Hi-Lo Card Counting Trainer</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {mostRecentSession && (
                <button
                  onClick={() => onResumeSession(mostRecentSession)}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-amber-400/30 text-white font-bold text-sm tracking-wide transition cursor-pointer shadow-lg"
                  title="Resume your most recent active session"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Resume Table (${mostRecentSession.bankroll.toLocaleString()})</span>
                </button>
              )}
              <button
                onClick={() => onStartNewTable(currentConfig)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-base tracking-wide uppercase shadow-[0_8px_25px_rgba(245,158,11,0.35)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                <span>
                  {currentConfig.trainingMode === 'counting' ? 'Start Counting Drill' : 'Start New Table'}
                </span>
              </button>
            </div>
          </div>

          {/* Configuration Controls Grid (5-Part Deck) */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-4 border-t border-white/10">
            {/* 1. Stakes Tier */}
            <div className="bg-black/45 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                <Coins className="w-3.5 h-3.5" />
                <span>Table Stakes Tier</span>
              </div>
              <div className="flex flex-col gap-1">
                {STAKES_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => handleStakesTierSelect(tier.id)}
                    className={clsx(
                      'px-2.5 py-1.5 rounded-xl text-left transition cursor-pointer border flex flex-col',
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

            {/* 2. Active Spots (1-5 Multi-Hand) */}
            <div className="bg-black/45 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                <Users className="w-3.5 h-3.5" />
                <span>Active Spots (1 to 5)</span>
              </div>
              <div className="grid grid-cols-5 gap-1 my-auto">
                {([1, 2, 3, 4, 5] as const).map((spotNum) => (
                  <button
                    key={spotNum}
                    onClick={() => onConfigChange({ spotCount: spotNum })}
                    className={clsx(
                      'py-2 rounded-xl text-center transition cursor-pointer border flex flex-col items-center justify-center',
                      currentConfig.spotCount === spotNum
                        ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60 font-black'
                        : 'bg-white/5 text-white/60 border-transparent hover:text-white font-semibold'
                    )}
                  >
                    <span className="text-xs">{spotNum}</span>
                    <span className="text-[8px] opacity-60">Spot</span>
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-400 text-center">
                Play {currentConfig.spotCount} hand{currentConfig.spotCount > 1 ? 's' : ''} against the dealer
              </span>
            </div>

            {/* 3. AI Bot Player Fill */}
            <div className="bg-black/45 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
                <Zap className="w-3.5 h-3.5" />
                <span>Empty Spot Fill</span>
              </div>
              <div className="flex flex-col gap-1.5 my-auto">
                <button
                  onClick={() => onConfigChange({ autoFillBots: false })}
                  className={clsx(
                    'px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition cursor-pointer border',
                    !currentConfig.autoFillBots
                      ? 'bg-sky-600/25 text-sky-300 border-sky-500/50'
                      : 'bg-white/5 text-white/60 border-transparent hover:text-white'
                  )}
                >
                  👤 Solo Play Only
                </button>
                <button
                  onClick={() => onConfigChange({ autoFillBots: true })}
                  className={clsx(
                    'px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition cursor-pointer border',
                    currentConfig.autoFillBots
                      ? 'bg-sky-600/25 text-sky-300 border-sky-500/50'
                      : 'bg-white/5 text-white/60 border-transparent hover:text-white'
                  )}
                >
                  🤖 Fill Empty Spots with Bots
                </button>
              </div>
              <span className="text-[10px] text-zinc-400 text-center">
                {currentConfig.autoFillBots ? 'Vegas bot patrons join table' : 'Only your chosen spots bet'}
              </span>
            </div>

            {/* 4. Shoe Deck Size */}
            <div className="bg-black/45 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-400">
                <Layers className="w-3.5 h-3.5" />
                <span>Shoe Deck Size</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 my-auto">
                {([
                  { decks: 6, label: '6-Deck', sub: 'Casino Shoe' },
                  { decks: 2, label: '2-Deck', sub: 'Pitch Game' },
                ] as const).map((opt) => (
                  <button
                    key={opt.decks}
                    onClick={() => onConfigChange({ deckCount: opt.decks })}
                    className={clsx(
                      'py-2 px-1 rounded-xl text-center transition cursor-pointer border flex flex-col items-center justify-center',
                      currentConfig.deckCount === opt.decks
                        ? 'bg-purple-600/30 text-purple-300 border-purple-500/60 font-black'
                        : 'bg-white/5 text-white/60 border-transparent hover:text-white font-semibold'
                    )}
                  >
                    <span className="text-xs">{opt.label}</span>
                    <span className="text-[9px] opacity-70">{opt.sub}</span>
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-400 text-center">
                Cut card reshuffle at 70% depth
              </span>
            </div>

            {/* 5. Training Mode */}
            <div className="bg-black/45 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-400">
                <Shield className="w-3.5 h-3.5" />
                <span>Game Mode</span>
              </div>
              <div className="flex flex-col gap-1.5 my-auto">
                <button
                  onClick={() => onConfigChange({ trainingMode: 'standard' })}
                  className={clsx(
                    'px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition cursor-pointer border',
                    currentConfig.trainingMode === 'standard'
                      ? 'bg-rose-600/25 text-rose-300 border-rose-500/50'
                      : 'bg-white/5 text-white/60 border-transparent hover:text-white'
                  )}
                >
                  🎰 Standard VIP Game
                </button>
                <button
                  onClick={() => onConfigChange({ trainingMode: 'counting' })}
                  className={clsx(
                    'px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition cursor-pointer border',
                    currentConfig.trainingMode === 'counting'
                      ? 'bg-amber-500/25 text-amber-300 border-amber-500/50'
                      : 'bg-white/5 text-white/60 border-transparent hover:text-white'
                  )}
                >
                  🧮 Hi-Lo Counting Drills
                </button>
              </div>
              <span className="text-[10px] text-zinc-400 text-center">
                {currentConfig.trainingMode === 'counting' ? 'Shows running & true count HUD' : 'Casino-authentic clean felt'}
              </span>
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
              Auto-saved on each round resolution &bull; Enforces 5 active table cap
            </span>
          </div>

          {savedSessions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-900/60 border border-white/5 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
              <Clock className="w-8 h-8 text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-400">No active Blackjack sessions saved yet.</p>
              <p className="text-xs max-w-md">
                Configure your table above and click &quot;Start New Table&quot;. Your session progress, stack, and round history will auto-save here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {savedSessions.map((s) => {
                const isConfirmingDelete = deleteConfirmId === s.id;
                const lastOutcome = s.recentOutcomes && s.recentOutcomes[0];

                return (
                  <div
                    key={s.id}
                    className="relative rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-white/10 hover:border-amber-500/40 p-4 transition flex flex-col justify-between gap-3 shadow-lg group"
                  >
                    {/* Top Row: Stakes & Timestamp */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                            {s.config.stakesTier.toUpperCase()}
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
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Hands Played</span>
                        <span className="text-sm font-mono font-bold text-white">
                          {s.handsPlayed}
                        </span>
                      </div>
                    </div>

                    {/* Context info: spots & last outcome */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                      <span>{s.config.spotCount} Active Spot{s.config.spotCount > 1 ? 's' : ''} &bull; {s.config.deckCount}-Deck</span>
                      {lastOutcome && (
                        <span className={clsx(
                          'font-mono font-semibold',
                          lastOutcome.netHeroProfit > 0 ? 'text-emerald-400' : lastOutcome.netHeroProfit < 0 ? 'text-rose-400' : 'text-zinc-400'
                        )}>
                          {lastOutcome.netHeroProfit > 0 ? `+${lastOutcome.netHeroProfit}` : lastOutcome.netHeroProfit}
                        </span>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => onResumeSession(s)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
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
        <span>Gambler&apos;s Den VIP Blackjack &bull; Multi-Session Persistence Engine &bull; Simulated Currency Only</span>
      </footer>
    </div>
  );
}
