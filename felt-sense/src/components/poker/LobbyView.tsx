'use client';

import { usePokerStore } from '@/lib/store';
import { Card } from './Card';
import { Play, PlusCircle, Trash2, Clock, Coins, Shield, Layers, Award } from 'lucide-react';

export function LobbyView() {
  const { savedSessions, startNewGame, loadGame, deleteSession } = usePokerStore();

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
    <div className="min-h-screen w-full bg-[#111112] text-white flex flex-col justify-between overflow-y-auto custom-scrollbar font-sans">
      
      {/* Top Header / Branding */}
      <header className="border-b border-white/5 bg-[#171719]/80 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#429E68] to-[#2A8655] flex items-center justify-center text-white font-black text-xl italic shadow-[0_0_15px_rgba(66,158,104,0.4)]">
            FS
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider uppercase leading-none">FeltSense</h1>
            <span className="text-[#429E68] text-[10px] tracking-[0.25em] font-bold uppercase">Casino TAG Trainer</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <Shield className="w-3.5 h-3.5 text-[#429E68]" />
            <span>9-Handed 100BB Exploitative Engine</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 flex flex-col gap-10">
        
        {/* Hero Banner / Start New Game Callout */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1E2E24] via-[#16201B] to-[#171719] border border-[#2A8655]/30 p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative z-10 flex flex-col gap-2 max-w-xl">
            <div className="inline-flex items-center gap-2 text-[#429E68] font-bold text-xs uppercase tracking-widest bg-[#429E68]/10 px-3 py-1 rounded-full w-fit border border-[#429E68]/20">
              <Award className="w-3.5 h-3.5" />
              Live $1/$2 & $1/$3 Simulation
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              Ready to crush low-stakes live games?
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              Step up to a fresh 9-max table with $200 stacks (100BB). Practice position awareness, isolation sizing over limpers, and exploit fish, nits, and calling stations.
            </p>
          </div>

          <button
            onClick={startNewGame}
            className="relative z-10 flex items-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-r from-[#2A8655] to-[#429E68] hover:from-[#339e65] hover:to-[#4bb376] text-white font-black text-lg tracking-wide uppercase shadow-[0_10px_30px_rgba(42,134,85,0.4)] hover:shadow-[0_12px_40px_rgba(42,134,85,0.6)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-6 h-6" />
            <span>Start New Table</span>
          </button>

          {/* Background decorative felt element */}
          <div className="absolute -right-10 -bottom-20 w-72 h-72 rounded-full bg-[#429E68]/10 blur-3xl pointer-events-none"></div>
        </div>

        {/* Saved Sessions Section */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-[#429E68]" />
              <h3 className="text-lg font-bold uppercase tracking-wider text-white">
                Saved Games & Active Tables
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
            /* Empty State */
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#171719]/40 p-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                <Coins className="w-8 h-8" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-base font-bold text-white">No active tables found</h4>
                <p className="text-xs text-white/50 max-w-sm">
                  Click &ldquo;Start New Table&rdquo; above to deal your first hand. Your session will be automatically saved continuously as you play.
                </p>
              </div>
              <button
                onClick={startNewGame}
                className="mt-2 text-xs font-bold uppercase tracking-wider text-[#429E68] hover:text-[#52bb7c] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Deal First Hand</span>
                <span>&rarr;</span>
              </button>
            </div>
          ) : (
            /* Saved Sessions Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedSessions.map((session) => {
                const hero = session.players.find((p) => p.archetype === 'Hero') || session.players[session.heroSeatIndex ?? 4];
                const heroStack = hero ? hero.stack : 200;
                const profit = heroStack - 200;
                const bbProfit = (profit / 2).toFixed(1);
                const isHeroTurn = session.activePlayerIndex === (session.heroSeatIndex ?? 4) && session.phase !== 'SHOWDOWN';

                return (
                  <div
                    key={session.id}
                    className="relative rounded-2xl bg-[#1A1A1D] border border-white/10 hover:border-[#429E68]/50 p-5 flex flex-col justify-between gap-5 transition-all shadow-lg hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)] group"
                  >
                    {/* Top Meta Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black bg-[#429E68]/20 text-[#429E68] px-2 py-0.5 rounded border border-[#429E68]/30">
                            {session.stakes}
                          </span>
                          <span className="text-[10px] uppercase font-bold bg-white/5 text-white/70 px-2 py-0.5 rounded border border-white/5">
                            Hand #{session.handsPlayed || 1}
                          </span>
                          <span className="text-[10px] uppercase font-bold bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">
                            {session.phase}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-white/40 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimestamp(session.lastPlayedAt)}</span>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this saved game session?')) {
                            deleteSession(session.id);
                          }
                        }}
                        title="Delete Session"
                        className="text-white/30 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Mid Card Section: Hero Chip Stack & Cards Preview */}
                    <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                          Hero Stack
                        </span>
                        <div className="text-lg font-black text-white flex items-baseline gap-1.5">
                          <span>${heroStack.toFixed(2)}</span>
                          <span className={`text-[11px] font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {profit >= 0 ? `+${profit.toFixed(2)}` : profit.toFixed(2)} ({profit >= 0 ? `+${bbProfit}` : bbProfit} BB)
                          </span>
                        </div>
                        {isHeroTurn && (
                          <span className="text-[10px] text-yellow-400 font-bold mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping"></span>
                            Your turn to act!
                          </span>
                        )}
                      </div>

                      {/* Mini Preview of Hero Cards */}
                      <div className="flex gap-1 items-center">
                        {hero && hero.holeCards && hero.holeCards.length === 2 ? (
                          <>
                            <Card card={hero.holeCards[0]} size="sm" className="shadow-md" />
                            <Card card={hero.holeCards[1]} size="sm" className="shadow-md" />
                          </>
                        ) : (
                          <div className="text-[10px] text-white/30 italic">No cards</div>
                        )}
                      </div>
                    </div>

                    {/* Community Board / Pot Preview */}
                    {session.communityCards && session.communityCards.length > 0 && (
                      <div className="flex items-center justify-between text-xs text-white/60 pt-1 border-t border-white/5">
                        <span className="text-[10px] text-white/40 uppercase">Board</span>
                        <div className="flex gap-1">
                          {session.communityCards.map((c, idx) => (
                            <Card key={idx} card={c} size="sm" className="scale-75 origin-right" />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-white">Pot: ${session.pot.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Bottom Action: Resume Game */}
                    <button
                      onClick={() => loadGame(session.id)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2A8655] hover:bg-[#349e66] text-white text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Resume Game</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-8 text-center text-xs text-white/30">
        FeltSense &copy; 2026 &bull; Exploit live 9-handed live casino No-Limit Texas Hold&apos;em
      </footer>
    </div>
  );
}
