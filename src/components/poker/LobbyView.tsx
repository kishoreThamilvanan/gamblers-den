'use client';

import { useState } from 'react';
import { usePokerStore } from '@/lib/store';
import { TableTopBar } from '@/components/casino';
import { Card } from './Card';
import { UserProfileModal } from './UserProfileModal';
import {
  Play, PlusCircle, Trash2, Clock, Coins,
  Layers, Award, Users, Target, Zap, Sliders
} from 'lucide-react';
import { clsx } from 'clsx';

export function LobbyView() {
  const {
    savedSessions,
    tableConfig,
    setTableConfig,
    startNewGame,
    loadGame,
    deleteSession,
    userProfile,
  } = usePokerStore();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

  return (
    <div className="min-h-screen w-full bg-[#111112] text-white flex flex-col justify-between overflow-y-auto custom-scrollbar font-sans select-none">
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Standardized Fixed Casino Top Navigation Bar */}
      <TableTopBar
        mode="lobby"
        title="Texas Hold'em"
        subtitle={`${tableConfig.tableSize}-Max • $${tableConfig.buyInAmount} Buy-In • ${tableConfig.difficulty.toUpperCase()}`}
        icon={
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#429E68] to-[#2A8655] flex items-center justify-center text-white font-black text-xs italic shadow-md shrink-0">
            GD
          </div>
        }
        floorHref="/"
        bankroll={userProfile?.careerBankroll}
        userProfile={userProfile}
        onProfileClick={() => setIsProfileOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* Hero Banner + Interactive Table Configuration Deck */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1E2E24] via-[#16201B] to-[#171719] border border-[#2A8655]/30 p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-xl">
              <div className="inline-flex items-center gap-2 text-[#429E68] font-bold text-xs uppercase tracking-widest bg-[#429E68]/10 px-3 py-1 rounded-full w-fit border border-[#429E68]/20">
                <Award className="w-3.5 h-3.5" />
                Live $1/$2 NLHE Casino Simulation
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Configure Your Table &amp; Crush Live Low-Stakes
              </h2>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                Customize opponent difficulty, table size, starting buy-in stack, max rebuys, or launch the dedicated <strong className="text-amber-300">Live Limp-Punisher Drill</strong>.
              </p>
            </div>

            <button
              onClick={() => startNewGame()}
              className="relative z-10 flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#2A8655] to-[#429E68] hover:from-[#339e65] hover:to-[#4bb376] text-white font-black text-base sm:text-lg tracking-wide uppercase shadow-[0_10px_30px_rgba(42,134,85,0.4)] hover:shadow-[0_12px_40px_rgba(42,134,85,0.6)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-6 h-6" />
              <span>{tableConfig.gameMode === 'limp_punisher' ? 'Start Limp-Punisher Drill' : 'Start New Table'}</span>
            </button>
          </div>

          {/* Configuration Controls Grid */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-white/10">
            
            {/* 1. Training Mode */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                <Target className="w-3.5 h-3.5" />
                <span>Training Mode</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setTableConfig({ gameMode: 'cash' })}
                  className={clsx(
                    'px-3 py-1.5 rounded-xl text-xs font-bold text-left transition cursor-pointer border',
                    tableConfig.gameMode === 'cash'
                      ? 'bg-emerald-600/25 text-emerald-300 border-emerald-500/50'
                      : 'bg-white/5 text-white/60 border-transparent hover:text-white'
                  )}
                >
                  🎰 Standard Cash Game
                </button>
                <button
                  onClick={() => setTableConfig({ gameMode: 'limp_punisher', tableSize: 9 })}
                  className={clsx(
                    'px-3 py-1.5 rounded-xl text-xs font-bold text-left transition cursor-pointer border',
                    tableConfig.gameMode === 'limp_punisher'
                      ? 'bg-amber-500/25 text-amber-300 border-amber-500/50'
                      : 'bg-white/5 text-white/60 border-transparent hover:text-white'
                  )}
                >
                  🎯 Limp-Punisher Drill
                </button>
              </div>
            </div>

            {/* 2. AI Difficulty Level */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                <Zap className="w-3.5 h-3.5" />
                <span>AI Difficulty Tier</span>
              </div>
              <div className="flex flex-col gap-1">
                {([
                  { id: 'beginner', label: '🐟 Friday Night Fish', desc: 'Loose-passive + Full Coach' },
                  { id: 'intermediate', label: '🕶️ Casino Regulars', desc: 'Balanced TAG/Fish mix' },
                  { id: 'advanced', label: '🦈 Vegas Sharks', desc: 'Tough 3-bets + Spoiler-Free Coach' },
                ] as const).map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setTableConfig({ difficulty: tier.id })}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold text-left transition cursor-pointer border flex items-center justify-between',
                      tableConfig.difficulty === tier.id
                        ? 'bg-emerald-600/25 text-emerald-300 border-emerald-500/50'
                        : 'bg-white/5 text-white/60 border-transparent hover:text-white'
                    )}
                    title={tier.desc}
                  >
                    <span>{tier.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Table Size (Players at Table) */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
                <Users className="w-3.5 h-3.5" />
                <span>Players at Table</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 my-auto">
                {([
                  { size: 2, label: '2-Max', sub: 'Heads-Up' },
                  { size: 6, label: '6-Max', sub: 'Short' },
                  { size: 9, label: '9-Max', sub: 'Full Ring' },
                ] as const).map((opt) => (
                  <button
                    key={opt.size}
                    disabled={tableConfig.gameMode === 'limp_punisher' && opt.size === 2}
                    onClick={() => setTableConfig({ tableSize: opt.size })}
                    className={clsx(
                      'py-2 px-1 rounded-xl text-center transition cursor-pointer border flex flex-col items-center justify-center disabled:opacity-30',
                      tableConfig.tableSize === opt.size
                        ? 'bg-sky-600/25 text-sky-300 border-sky-500/50 font-black'
                        : 'bg-white/5 text-white/60 border-transparent hover:text-white font-semibold'
                    )}
                  >
                    <span className="text-xs">{opt.label}</span>
                    <span className="text-[9px] opacity-70">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Starting Buy-In Stack */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                <Coins className="w-3.5 h-3.5" />
                <span>Buy-In Stack ($1/$2)</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 my-auto">
                {([
                  { amt: 100, bb: '50 BB' },
                  { amt: 200, bb: '100 BB' },
                  { amt: 300, bb: '150 BB' },
                  { amt: 400, bb: '200 BB' },
                ] as const).map((b) => (
                  <button
                    key={b.amt}
                    onClick={() => setTableConfig({ buyInAmount: b.amt })}
                    className={clsx(
                      'py-1.5 px-2 rounded-xl text-center transition cursor-pointer border flex flex-col items-center',
                      tableConfig.buyInAmount === b.amt
                        ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 font-black'
                        : 'bg-white/5 text-white/60 border-transparent hover:text-white font-semibold'
                    )}
                  >
                    <span className="text-xs">${b.amt}</span>
                    <span className="text-[9px] opacity-70">{b.bb}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Max Number of Buy-Ins (Rebuys) */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-300">
                <Sliders className="w-3.5 h-3.5" />
                <span>Max Rebuys Allowed</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 my-auto">
                {([
                  { max: 0, label: '0 (Freeze)' },
                  { max: 1, label: '1 Rebuy' },
                  { max: 3, label: '3 Rebuys' },
                  { max: 99, label: 'Unlimited' },
                ] as const).map((r) => (
                  <button
                    key={r.max}
                    onClick={() => setTableConfig({ maxRebuys: r.max })}
                    className={clsx(
                      'py-2 px-2 rounded-xl text-xs text-center transition cursor-pointer border',
                      tableConfig.maxRebuys === r.max
                        ? 'bg-purple-600/25 text-purple-300 border-purple-500/50 font-black'
                        : 'bg-white/5 text-white/60 border-transparent hover:text-white font-semibold'
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="absolute -right-10 -bottom-20 w-72 h-72 rounded-full bg-[#429E68]/10 blur-3xl pointer-events-none"></div>
        </div>

        {/* Saved Sessions Section */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-[#429E68]" />
              <h3 className="text-lg font-bold uppercase tracking-wider text-white">
                Saved Games &amp; Active Tables
              </h3>
              <span className="text-xs bg-white/10 text-white/70 px-2.5 py-0.5 rounded-full font-mono">
                {savedSessions.length} / 5 slots
              </span>
            </div>
            <p className="text-xs text-white/40 hidden sm:block">
              Auto-saved to your exact last move. Resumes instantly mid-hand.
            </p>
          </div>

          {savedSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#171719]/40 p-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                <Coins className="w-8 h-8" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-base font-bold text-white">No active tables found</h4>
                <p className="text-xs text-white/50 max-w-sm">
                  Configure your table settings above and click &ldquo;Start New Table&rdquo; to deal your first hand.
                </p>
              </div>
              <button
                onClick={() => startNewGame()}
                className="mt-2 text-xs font-bold uppercase tracking-wider text-[#429E68] hover:text-[#52bb7c] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Deal First Hand</span>
                <span>&rarr;</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedSessions.map((session) => {
                const hero = session.players.find((p) => p.archetype === 'Hero') || session.players[session.heroSeatIndex ?? 0];
                const buyIn = session.tableConfig?.buyInAmount ?? 200;
                const heroStack = hero ? hero.stack : buyIn;
                const profit = heroStack - buyIn * (1 + (session.rebuysUsed ?? 0));
                const bbProfit = (profit / 2).toFixed(1);
                const isHeroTurn = session.activePlayerIndex === (session.heroSeatIndex ?? 0) && session.phase !== 'SHOWDOWN';

                return (
                  <div
                    key={session.id}
                    className="group relative rounded-2xl bg-[#1A1A1D] border border-white/10 hover:border-[#429E68]/50 p-5 flex flex-col justify-between gap-5 shadow-xl transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-[#429E68]">
                            {session.tableConfig?.tableSize || session.players.length}-Max {session.stakes}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/70 font-mono">
                            Hand #{session.handsPlayed || 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-white/40 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimestamp(session.lastPlayedAt)}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete saved session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="rounded-xl bg-black/40 border border-white/5 p-3.5 flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
                          Your Hole Cards ({hero?.position || 'BTN'})
                        </span>
                        <div className="flex gap-1.5 mt-0.5">
                          {hero && hero.holeCards && hero.holeCards.length === 2 ? (
                            <>
                              <Card card={hero.holeCards[0]} size="sm" />
                              <Card card={hero.holeCards[1]} size="sm" />
                            </>
                          ) : (
                            <span className="text-xs text-white/30 italic">Waiting for deal</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
                          Street: <strong className="text-white">{session.phase}</strong>
                        </span>
                        <div className="text-xs text-white/70">
                          Pot: <span className="text-[#F5B841] font-bold font-mono">${session.pot.toFixed(2)}</span>
                        </div>
                        {isHeroTurn && (
                          <span className="mt-1 text-[9px] bg-[#F5B841]/20 text-[#F5B841] border border-[#F5B841]/40 px-2 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">
                            Your Turn
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
                          Hero Stack
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black font-mono text-white">
                            ${heroStack.toFixed(2)}
                          </span>
                          <span
                            className={`text-xs font-bold font-mono ${
                              profit > 0
                                ? 'text-[#4ADE80]'
                                : profit < 0
                                ? 'text-[#F87171]'
                                : 'text-white/40'
                            }`}
                          >
                            ({profit >= 0 ? '+' : ''}
                            {bbProfit} BB)
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => loadGame(session.id)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A8655] hover:bg-[#349963] text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-8 text-center text-xs text-white/30">
        Gambler&apos;s Den Casino Gaming Engine &bull; Configurable 2/6/9-Max Live Simulation
      </footer>
    </div>
  );
}
