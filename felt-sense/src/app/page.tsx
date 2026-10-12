'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Volume2, VolumeX, LogOut, BarChart3
} from 'lucide-react';
import { usePokerStore } from '@/lib/store';
import { sound } from '@/lib/sound/soundSystem';
import { evaluateHand } from '@/lib/poker/evaluator';
import { LobbyView } from '@/components/poker/LobbyView';
import { SessionStatsModal } from '@/components/poker/SessionStatsModal';
import { ChipStack } from '@/components/poker/ChipStack';
import { DealerLogBox, LogPosition } from '@/components/poker/DealerLogBox';
import { AICoachPanel } from '@/components/poker/AICoachPanel';
import { clsx } from 'clsx';

const THEMES = {
  emerald: {
    name: 'Bellagio Green',
    felt: 'radial-gradient(ellipse at center, #1b5e20 0%, #0d3813 70%, #08240c 100%)',
    rail: 'from-[#3e2723] via-[#24140e] to-[#120a07]',
    innerBorder: 'border-emerald-600/30',
    accentColor: '#10b981',
    accentClass: 'text-emerald-400'
  },
  royal: {
    name: 'Macau Navy',
    felt: 'radial-gradient(ellipse at center, #1e3a8a 0%, #11224f 70%, #09122c 100%)',
    rail: 'from-[#2e1d10] via-[#1c1109] to-[#0a0604]',
    innerBorder: 'border-blue-600/30',
    accentColor: '#3b82f6',
    accentClass: 'text-blue-400'
  },
  charcoal: {
    name: 'Wynn Charcoal',
    felt: 'radial-gradient(ellipse at center, #27272a 0%, #18181b 70%, #09090b 100%)',
    rail: 'from-[#422006] via-[#261204] to-[#0f0701]',
    innerBorder: 'border-zinc-600/30',
    accentColor: '#fbbf24',
    accentClass: 'text-amber-400'
  }
};

/* Elliptical coordinate percentages (Top, Left) for 9 positions */
const SEAT_POSITIONS = [
  { top: '86%', left: '50%' }, // 0: Hero (Bottom Center)
  { top: '78%', left: '20%' }, // 1: Bottom Left
  { top: '48%', left: '8%' },  // 2: Middle Left
  { top: '18%', left: '20%' }, // 3: Top Left
  { top: '9%',  left: '38%' }, // 4: Top Center-Left
  { top: '9%',  left: '62%' }, // 5: Top Center-Right
  { top: '18%', left: '80%' }, // 6: Top Right
  { top: '48%', left: '92%' }, // 7: Middle Right
  { top: '78%', left: '80%' }  // 8: Bottom Right
];

const Card = ({ card, size = 'md', className = '' }: { card?: { rank?: string; suit?: string; hidden?: boolean }; size?: 'sm' | 'md'; className?: string }) => {
  if (!card) return null;

  if (card.hidden) {
    return (
      <div 
        className={`rounded-md bg-gradient-to-br from-red-800 to-red-950 border border-amber-300/40 shadow-md flex items-center justify-center relative overflow-hidden select-none ${
          size === 'sm' ? 'w-6 h-9 sm:w-7 sm:h-10' : 'w-10 h-14 sm:w-14 sm:h-20'
        } ${className}`}
      >
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:4px_4px]" />
        <div className="w-3 h-4 sm:w-4 sm:h-6 border border-amber-400/50 rounded flex items-center justify-center text-[7px] text-amber-300 font-bold">
          ♠
        </div>
      </div>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦' || card.suit === 'h' || card.suit === 'd';
  const textColor = isRed ? 'text-red-600' : 'text-slate-900';
  const suitChar = card.suit === 'h' ? '♥' : card.suit === 'd' ? '♦' : card.suit === 'c' ? '♣' : card.suit === 's' ? '♠' : card.suit;

  return (
    <div 
      className={`rounded-md bg-white border border-slate-300 shadow-lg flex flex-col justify-between p-1 select-none font-bold relative transition-transform hover:-translate-y-1 ${
        size === 'sm' ? 'w-7 h-10 text-[10px]' : 'w-10 h-14 sm:w-14 sm:h-20 text-xs sm:text-sm'
      } ${className}`}
    >
      <div className={`leading-none flex items-center justify-between ${textColor}`}>
        <span>{card.rank}</span>
        <span className="text-xs sm:text-sm">{suitChar}</span>
      </div>
      <div className={`text-center text-sm sm:text-2xl leading-none self-center ${textColor}`}>
        {suitChar}
      </div>
      <div className={`leading-none flex items-center justify-between rotate-180 ${textColor}`}>
        <span>{card.rank}</span>
        <span className="text-xs sm:text-sm">{suitChar}</span>
      </div>
    </div>
  );
};

export default function Home() {
  const {
    viewMode,
    players,
    activePlayerIndex,
    heroSeatIndex,
    dealerIndex,
    currentBet,
    minRaise,
    pot,
    communityCards,
    phase,
    handsPlayed,
    soundMuted,
    toggleMute,
    initLobby,
    quitToLobby,
    dealNextHand,
    playerAction,
    gameSpeed,
    setGameSpeed,
    lastHandResult,
    lastActionEvent,
  } = usePokerStore();

  const [themeKey, setThemeKey] = useState<'emerald' | 'royal' | 'charcoal'>('emerald');
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [coachPosition, setCoachPosition] = useState<LogPosition>('left');
  const [logPosition, setLogPosition] = useState<LogPosition>('right');

  const heroIdx = players.findIndex((p) => p.archetype === 'Hero');
  const effectiveHeroIdx = heroIdx !== -1 ? heroIdx : heroSeatIndex;
  const hero = players[effectiveHeroIdx];
  const isHeroTurn = activePlayerIndex === effectiveHeroIdx && phase !== 'SHOWDOWN';
  const toCall = hero ? Math.max(0, currentBet - hero.currentBet) : 0;
  const canCheck = toCall === 0;

  const maxBet = hero ? hero.stack + hero.currentBet : 200;
  const minPossibleBet = currentBet === 0 ? minRaise : currentBet + minRaise;

  const [customRaiseAmount, setCustomRaiseAmount] = useState<number | null>(null);
  const raiseAmount = Math.max(minPossibleBet, Math.min(maxBet, customRaiseAmount ?? minPossibleBet));

  useEffect(() => {
    initLobby();
  }, [initLobby]);

  const currentTheme = THEMES[themeKey];

  // Quick preset calculation
  const setPreset = (type: string) => {
    sound.playChipSound();
    if (type === 'MIN') setCustomRaiseAmount(minPossibleBet);
    if (type === 'HALF') setCustomRaiseAmount(Math.max(minPossibleBet, Math.round(pot * 0.5)));
    if (type === 'THREE_FOURTH') setCustomRaiseAmount(Math.max(minPossibleBet, Math.round(pot * 0.75)));
    if (type === 'POT') setCustomRaiseAmount(Math.max(minPossibleBet, Math.round(pot)));
    if (type === 'ALLIN') setCustomRaiseAmount(maxBet);
  };

  const handleAction = useCallback(
    (action: 'fold' | 'check' | 'call' | 'bet' | 'raise', amount?: number) => {
      if (!isHeroTurn) return;
      playerAction(action, amount);
    },
    [isHeroTurn, playerAction]
  );

  const handleApplyAdvice = useCallback(
    (action: 'fold' | 'check' | 'call' | 'bet' | 'raise', amount: number) => {
      if (!isHeroTurn) return;
      if (action === 'raise' || action === 'bet') {
        setCustomRaiseAmount(amount);
        handleAction(action, amount);
      } else {
        handleAction(action);
      }
    },
    [isHeroTurn, handleAction]
  );

  // Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      const key = e.key.toUpperCase();
      if (phase === 'SHOWDOWN' && e.code === 'Space') {
        e.preventDefault();
        dealNextHand();
        return;
      }
      if (!isHeroTurn) return;
      if (key === 'F') {
        e.preventDefault();
        handleAction('fold');
      } else if (key === 'C') {
        e.preventDefault();
        handleAction(canCheck ? 'check' : 'call');
      } else if (key === 'R') {
        e.preventDefault();
        handleAction(currentBet === 0 ? 'bet' : 'raise', raiseAmount);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHeroTurn, phase, canCheck, currentBet, raiseAmount, handleAction, dealNextHand]);

  // Evaluate current made hand
  const heroHandEval =
    hero && hero.holeCards && hero.holeCards.length === 2 && communityCards.length >= 3
      ? evaluateHand([...hero.holeCards, ...communityCards])
      : null;

  if (viewMode === 'LOBBY') {
    return <LobbyView />;
  }

  return (
    <div className="w-full h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* Session Stats Analytics Modal */}
      <SessionStatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />

      {/* Top Header Bar */}
      <header className="h-12 bg-[#0c1017] border-b border-zinc-800/80 px-3 sm:px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-black text-black text-sm shadow">
              ♠
            </div>
            <span className="font-bold tracking-tight text-white flex items-center gap-1 text-sm sm:text-base">
              FELT<span className="text-amber-400">SENSE</span>
              <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                $1 / $2 NLHE
              </span>
            </span>
          </div>

          {/* Theme selector */}
          <div className="hidden xl:flex items-center gap-1 ml-2 bg-zinc-900/90 rounded-md p-0.5 border border-zinc-800 text-xs">
            {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((k) => (
              <button
                key={k}
                onClick={() => setThemeKey(k)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  themeKey === k ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {THEMES[k].name}
              </button>
            ))}
          </div>

          {/* Game Speed Selector */}
          <div className="hidden lg:flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-md p-0.5 text-xs">
            <span className="text-[10px] text-zinc-500 px-1 font-mono uppercase">Speed:</span>
            {(['relaxed', 'normal', 'fast'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setGameSpeed(s)}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer',
                  gameSpeed === s ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-zinc-400 hover:text-white'
                )}
              >
                {s === 'relaxed' ? '🐢 Relaxed' : s === 'normal' ? '⚡ Normal' : '🚀 Fast'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          {/* AI Coach Pin Placement Pill */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-md p-0.5">
            <span className="text-[10px] text-emerald-400 font-semibold px-1">Coach:</span>
            {(['left', 'bottom', 'right', 'hidden'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setCoachPosition(pos)}
                className={clsx(
                  'px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer capitalize',
                  coachPosition === pos ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'text-zinc-400 hover:text-white'
                )}
              >
                {pos === 'hidden' ? 'Off' : pos}
              </button>
            ))}
          </div>

          {/* Dealer Log Placement Pill */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-md p-0.5">
            <span className="text-[10px] text-amber-400 font-semibold px-1">Log:</span>
            {(['left', 'bottom', 'right', 'hidden'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setLogPosition(pos)}
                className={clsx(
                  'px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer capitalize',
                  logPosition === pos ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'text-zinc-400 hover:text-white'
                )}
              >
                {pos === 'hidden' ? 'Off' : pos}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-300 text-[11px]">
            <span className="text-zinc-500">Hand:</span> <span className="font-semibold text-white">#{handsPlayed || 1}</span>
          </div>

          <button 
            onClick={toggleMute} 
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
            title={soundMuted ? 'Unmute' : 'Mute'}
          >
            {soundMuted ? <VolumeX size={15} className="text-rose-400" /> : <Volume2 size={15} className="text-emerald-400" />}
          </button>

          <button 
            onClick={() => setIsStatsOpen(true)}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
            title="Session Analytics"
          >
            <BarChart3 size={15} />
          </button>

          <button 
            onClick={quitToLobby}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 transition font-medium cursor-pointer text-xs"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Lobby</span>
          </button>
        </div>
      </header>

      {/* Main Game Stage (Auto-Reorganizes based on Left/Right Docked Panels) */}
      <div className={clsx(
        'flex-1 relative flex items-center justify-center p-2 sm:p-4 overflow-hidden transition-all duration-300',
        (coachPosition === 'left' || logPosition === 'left') && 'lg:pl-80 xl:pl-88',
        (coachPosition === 'right' || logPosition === 'right') && 'lg:pr-80 xl:pr-88'
      )}>
        
        {/* Table Stage Container with Aspect Ratio Enforcement */}
        <div className="relative w-full max-w-6xl aspect-[16/9] max-h-[82vh] flex items-center justify-center">
          
          {/* Outer Wood/Leather Table Rail */}
          <div className="absolute inset-0 rounded-[140px] sm:rounded-[200px] md:rounded-[240px] bg-gradient-to-b from-[#2d1b11] via-[#1a0f0a] to-[#0d0705] p-3 sm:p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.15)] flex items-center justify-center">
            
            {/* Inner Brass Accent Rim */}
            <div className="w-full h-full rounded-[120px] sm:rounded-[180px] md:rounded-[220px] p-1 sm:p-1.5 bg-gradient-to-r from-amber-700/60 via-amber-500/40 to-amber-800/60 shadow-inner flex items-center justify-center">
              
              {/* Felt Surface */}
              <div 
                className={`w-full h-full rounded-[115px] sm:rounded-[175px] md:rounded-[215px] relative overflow-hidden flex items-center justify-center border ${currentTheme.innerBorder} shadow-[inset_0_10px_30px_rgba(0,0,0,0.7)]`}
                style={{ background: currentTheme.felt }}
              >
                
                {/* Subtle Felt Texture Overlay */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:6px_6px] pointer-events-none" />

                {/* Table Center Watermark */}
                <div className="absolute text-center select-none pointer-events-none opacity-15">
                  <div className="text-3xl sm:text-5xl font-black tracking-widest text-white">FELT SENSE</div>
                  <div className="text-[10px] tracking-widest text-amber-300 font-semibold uppercase mt-1">GTO & Exploitative Casino Trainer</div>
                </div>

                {/* Table Center: Live Action Ticker, Pot, and Community Cards */}
                <div className="flex flex-col items-center z-10 -mt-2">
                  
                  {/* Live Action Feed Ticker (Shows latest move + whose turn is next) */}
                  <div className="mb-2.5 min-h-[28px] flex items-center justify-center">
                    {lastActionEvent ? (
                      <div
                        key={lastActionEvent.timestamp}
                        className="animate-ticker-slide flex items-center gap-2 bg-zinc-950/90 backdrop-blur-md px-3.5 py-1 rounded-full border border-zinc-700/80 shadow-2xl text-[11px] sm:text-xs"
                      >
                        <span className="font-bold text-zinc-200">{lastActionEvent.playerName}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                          {lastActionEvent.position}
                        </span>
                        <span
                          className={clsx(
                            'font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-[10px] shadow',
                            lastActionEvent.type === 'fold' && 'bg-rose-600/90 text-white',
                            lastActionEvent.type === 'check' && 'bg-teal-600/90 text-white',
                            lastActionEvent.type === 'call' && 'bg-sky-600/90 text-white',
                            lastActionEvent.type === 'bet' && 'bg-emerald-600/90 text-white',
                            lastActionEvent.type === 'raise' && 'bg-amber-500 text-black',
                            lastActionEvent.type === 'allin' && 'bg-gradient-to-r from-rose-600 to-amber-500 text-white'
                          )}
                        >
                          {lastActionEvent.label}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 text-[11px] text-zinc-300">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span>
                          {isHeroTurn
                            ? 'Your Turn to Act'
                            : `${players[activePlayerIndex]?.name || 'Player'} is acting...`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Central Pot Display */}
                  <div className="flex flex-col items-center mb-3">
                    {pot > 0 && (
                      <div key={`pot-${pot}`} className="mb-1 filter drop-shadow-lg animate-chip-toss">
                        <ChipStack amount={pot} mode="bet" size="sm" showAmountLabel={false} />
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-black/65 backdrop-blur-md px-4 py-1.5 rounded-full border border-amber-500/40 shadow-xl">
                      <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-black font-black text-[10px]">
                        $
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-amber-300 tracking-wider">
                        TOTAL POT: <span className="text-white font-extrabold">${pot.toFixed(2)}</span>
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                        {(pot / 2).toFixed(0)} BB
                      </span>
                    </div>
                  </div>

                  {/* 5 Community Cards */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {communityCards.map((card, i) => (
                      <div key={`${card.rank}-${card.suit}-${i}`} className="animate-action-pop">
                        <Card card={card} size="md" />
                      </div>
                    ))}
                    {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="w-10 h-14 sm:w-14 sm:h-20 rounded-md border border-white/20 bg-black/20 flex items-center justify-center"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      </div>
                    ))}
                  </div>

                  {/* Hand Strength / Board Category Pill */}
                  <div className="mt-2.5 px-3 py-0.5 rounded-full bg-black/60 border border-emerald-500/30 text-[10px] sm:text-xs text-emerald-300 font-medium tracking-wide flex items-center gap-1.5 backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {heroHandEval ? heroHandEval.name : phase === 'PREFLOP' ? 'Preflop Pocket' : `Street: ${phase}`}
                  </div>
                </div>

                {/* Showdown & Hand Complete Winner Overlay */}
                {phase === 'SHOWDOWN' && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 rounded-[115px] sm:rounded-[175px] md:rounded-[215px] backdrop-blur-md animate-in fade-in select-none">
                    <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-amber-500/60 p-5 sm:p-7 rounded-2xl flex flex-col items-center shadow-[0_0_60px_rgba(0,0,0,0.9)] text-center max-w-sm sm:max-w-md mx-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-black text-2xl mb-2.5 shadow-xl animate-bounce border-2 border-white/40">
                        🏆
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black tracking-wide">
                        {lastHandResult?.isHeroWinner ? (
                          <span className="text-emerald-400">YOU WON THE POT!</span>
                        ) : (
                          <span className="text-white">{lastHandResult?.winnerNames || 'Winner'} Won!</span>
                        )}
                      </h3>

                      <div className="text-amber-300 font-black text-xl sm:text-2xl mt-1 tracking-wider">
                        +${(lastHandResult?.amount ?? 0).toFixed(2)}
                      </div>

                      <div className="mt-2.5 mb-4 px-3.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-700/80 text-xs font-semibold text-zinc-200">
                        {lastHandResult?.handName || 'Winning Hand'}
                      </div>

                      {lastHandResult?.winningCards && lastHandResult.winningCards.length > 0 && (
                        <div className="flex items-center gap-2 mb-4">
                          {lastHandResult.winningCards.map((c, i) => (
                            <Card key={i} card={c} size="md" />
                          ))}
                        </div>
                      )}

                      <button
                        onClick={dealNextHand}
                        className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl transform active:scale-95 transition-all cursor-pointer flex items-center gap-2 ring-2 ring-emerald-400/50"
                      >
                        <span>Deal Next Hand</span>
                        <span className="text-[10px] text-white/60 font-mono bg-black/40 px-1.5 py-0.5 rounded">[Space]</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* 9 Player Pods Arranged Elliptically */}
          {players.map((player, idx) => {
            const isHero = player.archetype === 'Hero' || idx === effectiveHeroIdx;
            // Visual seat index: Rotated so Hero is ALWAYS at visual seat 0 (Bottom Center)
            const visualSeatIndex = (idx - effectiveHeroIdx + 9) % 9;
            const pos = SEAT_POSITIONS[visualSeatIndex] || SEAT_POSITIONS[0];
            const isActive = idx === activePlayerIndex && phase !== 'SHOWDOWN';
            const isDealer = idx === dealerIndex;
            const isWinner = lastHandResult?.winnerIds?.includes(player.id) && phase === 'SHOWDOWN';

            // Only Hero and active showdown players show their cards.
            // Opponents' cards remain face-down (hidden: true) during all betting rounds!
            const isShowdown = phase === 'SHOWDOWN';
            const showHoleCards = isHero || (isShowdown && !player.hasFolded);
            const actionBadge = player.lastAction;

            return (
              <div
                key={player.id}
                style={{ top: pos.top, left: pos.left }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto transition-all duration-300 z-20 ${
                  isHero ? 'scale-110 z-30' : 'scale-90 sm:scale-100'
                }`}
              >
                {/* Miniature Dealt Cards (Animates into muck when folded) */}
                {player.holeCards && player.holeCards.length > 0 && (
                  <div
                    className={clsx(
                      'flex items-center gap-1 mb-1.5 transition-all duration-500',
                      isHero ? '-space-x-4 mb-2' : '-space-x-3',
                      player.hasFolded && 'animate-card-muck grayscale pointer-events-none'
                    )}
                  >
                    {player.holeCards.map((card, cIdx) => (
                      <Card 
                        key={cIdx} 
                        card={showHoleCards ? card : { hidden: true }} 
                        size={isHero ? 'md' : 'sm'} 
                        className={isHero ? 'shadow-2xl hover:translate-y-[-6px]' : 'shadow'}
                      />
                    ))}
                  </div>
                )}

                {/* Avatar and Player Ring Container */}
                <div className="relative flex flex-col items-center">
                  
                  {/* Winner Crown Badge */}
                  {isWinner && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-amber-400 text-black font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-yellow-200 flex items-center gap-1 animate-bounce z-40 whitespace-nowrap">
                      <span>🏆</span>
                      <span>WINNER</span>
                    </div>
                  )}

                  {/* Active Thinking Bubble for Bots / Hero Turn Prompt */}
                  {isActive && !isWinner && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-amber-400 text-black font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-yellow-200 flex items-center gap-1 animate-bounce z-40 whitespace-nowrap">
                      {isHero ? (
                        <>
                          <span>⚡</span>
                          <span>YOUR TURN</span>
                        </>
                      ) : (
                        <>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                          <span>THINKING...</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Animated Action Callout Badge (RAISE $10, CALL $4, CHECK, FOLDED, ALL-IN) */}
                  {actionBadge && !isActive && !isWinner && (
                    <div
                      key={actionBadge.timestamp}
                      className={clsx(
                        'animate-action-pop absolute -top-6 left-1/2 -translate-x-1/2 font-black text-[9px] sm:text-[10px] px-2.5 py-0.5 rounded-full shadow-xl border flex items-center gap-1 z-40 whitespace-nowrap tracking-wide uppercase',
                        actionBadge.type === 'fold' && 'bg-rose-950/95 text-rose-300 border-rose-500/60 shadow-rose-950/50',
                        actionBadge.type === 'check' && 'bg-teal-950/95 text-teal-300 border-teal-400/60 shadow-teal-950/50',
                        actionBadge.type === 'call' && 'bg-sky-600 text-white border-sky-300/70 shadow-sky-950/60',
                        actionBadge.type === 'bet' && 'bg-emerald-600 text-white border-emerald-300/80 shadow-emerald-950/60',
                        actionBadge.type === 'raise' && 'bg-gradient-to-r from-amber-500 to-orange-500 text-black border-yellow-200 shadow-amber-950/70',
                        actionBadge.type === 'allin' && 'bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 text-white border-yellow-300 animate-pulse',
                        (actionBadge.type === 'sb' || actionBadge.type === 'bb') && 'bg-zinc-900/95 text-amber-300 border-amber-500/40'
                      )}
                    >
                      <span>
                        {actionBadge.type === 'fold' && '✕'}
                        {actionBadge.type === 'check' && '✊'}
                        {actionBadge.type === 'call' && '✓'}
                        {actionBadge.type === 'bet' && '●'}
                        {actionBadge.type === 'raise' && '▲'}
                        {actionBadge.type === 'allin' && '🔥'}
                      </span>
                      <span>{actionBadge.label}</span>
                    </div>
                  )}

                  {/* Position Pill (Left of Avatar) */}
                  <div className="absolute -top-1.5 -left-2.5 px-1 py-0.2 rounded bg-zinc-900/95 text-zinc-300 border border-zinc-700 font-mono font-bold text-[8px] shadow z-30">
                    {player.position}
                  </div>

                  {/* Dealer Puck */}
                  {isDealer && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-zinc-900 border-2 border-black font-extrabold text-[10px] flex items-center justify-center shadow-lg z-30">
                      D
                    </div>
                  )}

                  {/* Turn indicator / Action ripple / Winner glow */}
                  <div
                    key={actionBadge ? `avatar-${actionBadge.timestamp}` : 'avatar-idle'}
                    className={clsx(
                      'relative rounded-full p-0.5 transition-all duration-300',
                      isWinner && 'ring-4 ring-amber-400 ring-offset-2 ring-offset-zinc-950 animate-pulse shadow-[0_0_25px_rgba(251,191,36,0.8)]',
                      !isWinner && isActive && 'ring-4 ring-amber-400 ring-offset-2 ring-offset-zinc-950 animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.6)]',
                      !isWinner && !isActive && actionBadge && actionBadge.type === 'raise' && 'ring-2 ring-amber-400 animate-action-ripple',
                      !isWinner && !isActive && actionBadge && actionBadge.type === 'bet' && 'ring-2 ring-emerald-400 animate-action-ripple',
                      !isWinner && !isActive && actionBadge && actionBadge.type === 'call' && 'ring-2 ring-sky-400 animate-action-ripple',
                      player.hasFolded && 'opacity-50 grayscale'
                    )}
                  >
                    {player.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={player.avatarUrl} 
                        alt={player.name}
                        style={{ width: '42px', height: '42px', borderRadius: '9999px', objectFit: 'cover' }}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-zinc-500/60 shadow-md"
                      />
                    ) : (
                      <div 
                        style={{ width: '42px', height: '42px', borderRadius: '9999px' }}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-zinc-800 border border-zinc-500/60 shadow-md flex items-center justify-center text-xs font-bold text-white"
                      >
                        {player.name.slice(0, 2)}
                      </div>
                    )}

                    {/* Turn Timer Bar */}
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                        <div className="h-full bg-amber-400 animate-pulse w-full" />
                      </div>
                    )}
                  </div>

                  {/* Player Name & Chip Stack Box */}
                  <div className={clsx(
                    'mt-1 bg-black/90 backdrop-blur-md border px-2 py-0.5 rounded shadow-lg flex flex-col items-center w-24 sm:w-28 transition-opacity',
                    isHero ? 'border-amber-500/50 ring-1 ring-amber-500/30' : 'border-zinc-800',
                    player.hasFolded && 'opacity-65 border-rose-900/40'
                  )}>
                    <span className={`text-[10px] font-semibold truncate w-full text-center ${
                      isHero ? 'text-amber-300 font-bold' : player.hasFolded ? 'text-zinc-500 line-through' : 'text-zinc-200'
                    }`}>
                      {player.name}
                    </span>
                    <span className={clsx(
                      'text-[11px] font-bold',
                      player.hasFolded ? 'text-zinc-500' : 'text-emerald-400'
                    )}>
                      ${player.stack.toFixed(2)}
                    </span>
                  </div>

                  {/* Bankroll Chip Stack on Felt (reflects actual chips currently owned) */}
                  {player.stack > 0 && !player.hasFolded && (
                    <div className={`absolute pointer-events-none transition-all duration-300 ${
                      visualSeatIndex === 0 ? '-left-12 bottom-1' :
                      visualSeatIndex === 1 ? '-right-12 bottom-1' :
                      visualSeatIndex === 2 ? '-right-12 top-2' :
                      visualSeatIndex === 3 ? '-right-12 bottom-0' :
                      visualSeatIndex === 4 || visualSeatIndex === 5 ? '-left-12 top-1' :
                      visualSeatIndex === 6 ? '-left-12 bottom-0' :
                      visualSeatIndex === 7 ? '-left-12 top-2' :
                      '-left-12 bottom-1'
                    }`}>
                      <ChipStack amount={player.stack} mode="bankroll" size="xs" showAmountLabel={false} />
                    </div>
                  )}

                  {/* Dynamic Action / Bet Chip Stack - Animates tossing inward towards center of felt */}
                  {player.currentBet > 0 && !player.hasFolded && (
                    <div
                      key={`bet-${player.id}-${player.currentBet}`}
                      className={`animate-chip-toss absolute pointer-events-none transition-all duration-300 ${
                        visualSeatIndex === 0 ? '-top-12 left-1/2 -translate-x-1/2' :
                        visualSeatIndex === 1 ? '-top-6 -right-14' :
                        visualSeatIndex === 2 ? 'top-1 -right-16' :
                        visualSeatIndex === 3 ? '-bottom-9 -right-12' :
                        visualSeatIndex === 4 || visualSeatIndex === 5 ? '-bottom-11 left-1/2 -translate-x-1/2' :
                        visualSeatIndex === 6 ? '-bottom-9 -left-12' :
                        visualSeatIndex === 7 ? 'top-1 -left-16' :
                        '-top-6 -left-14'
                      }`}
                    >
                      <ChipStack amount={player.currentBet} mode="bet" size="sm" showAmountLabel={true} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        </div>

        {/* Wall-Docked / Floating AI Coach Panel */}
        {coachPosition !== 'bottom' && (
          <AICoachPanel
            position={coachPosition}
            onPositionChange={setCoachPosition}
            onApplyAdvice={handleApplyAdvice}
            isStacked={coachPosition === logPosition && (coachPosition === 'left' || coachPosition === 'right')}
          />
        )}

        {/* Wall-Docked / Floating Dealer Log Panel */}
        {logPosition !== 'bottom' && (
          <DealerLogBox
            position={logPosition}
            onPositionChange={setLogPosition}
            isStacked={coachPosition === logPosition && (logPosition === 'left' || logPosition === 'right')}
          />
        )}

      </div>

      {/* Bottom Betting Console & Optional Docked Panels */}
      <footer className={clsx(
        'h-28 bg-[#0a0d13] border-t border-zinc-800 px-4 py-2 flex items-center justify-center gap-4 z-30 shrink-0 transition-all duration-300',
        (coachPosition === 'left' || logPosition === 'left') && 'lg:pl-84 xl:pl-92',
        (coachPosition === 'right' || logPosition === 'right') && 'lg:pr-84 xl:pr-92'
      )}>
        
        {/* Optional Bottom-Docked Dealer Log */}
        {logPosition === 'bottom' && (
          <div className="hidden lg:flex w-80 h-full shrink-0">
            <DealerLogBox
              position="bottom"
              onPositionChange={setLogPosition}
            />
          </div>
        )}

        {/* Optional Bottom-Docked AI Coach */}
        {coachPosition === 'bottom' && (
          <div className="hidden lg:flex w-80 h-full shrink-0">
            <AICoachPanel
              position="bottom"
              onPositionChange={setCoachPosition}
              onApplyAdvice={handleApplyAdvice}
            />
          </div>
        )}

        {/* Betting Action Controls */}
        <div className={`flex-1 max-w-3xl flex flex-col justify-between h-full py-1 ${!isHeroTurn ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          
          {/* Quick Bet Presets and Sizing Slider */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => setPreset('MIN')}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
              >
                MIN (${minPossibleBet})
              </button>
              <button 
                onClick={() => setPreset('HALF')}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
              >
                1/2 POT
              </button>
              <button 
                onClick={() => setPreset('THREE_FOURTH')}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
              >
                3/4 POT
              </button>
              <button 
                onClick={() => setPreset('POT')}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
              >
                POT
              </button>
              <button 
                onClick={() => setPreset('ALLIN')}
                className="px-2.5 py-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-800 transition cursor-pointer"
              >
                MAX
              </button>
            </div>

            {/* Slider with exact input value */}
            <div className="flex items-center gap-3 flex-1 max-w-xs">
              <input 
                type="range" 
                min={minPossibleBet} 
                max={maxBet} 
                step={1}
                value={raiseAmount}
                onChange={(e) => setCustomRaiseAmount(Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-xs font-mono font-bold text-emerald-400 min-w-[58px] text-center">
                ${raiseAmount}
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-1">
            <button 
              onClick={() => handleAction('fold')}
              className="py-2.5 sm:py-3 rounded-lg bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-sm sm:text-base tracking-wider uppercase shadow-lg shadow-rose-950/50 border border-rose-500/50 active:scale-[0.98] transition cursor-pointer"
            >
              FOLD
            </button>

            <button 
              onClick={() => handleAction(canCheck ? 'check' : 'call')}
              className="py-2.5 sm:py-3 rounded-lg bg-gradient-to-b from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white font-extrabold text-sm sm:text-base tracking-wider uppercase shadow-lg shadow-sky-950/50 border border-sky-500/50 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{canCheck ? 'CHECK' : 'CALL'}</span>
              {!canCheck && <span className="text-xs bg-black/30 px-1.5 py-0.5 rounded font-mono font-normal">${toCall}</span>}
            </button>

            <button 
              onClick={() => handleAction(currentBet === 0 ? 'bet' : 'raise', raiseAmount)}
              className="py-2.5 sm:py-3 rounded-lg bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-sm sm:text-base tracking-wider uppercase shadow-lg shadow-emerald-950/50 border border-emerald-500/50 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{currentBet === 0 ? 'BET' : 'RAISE TO'}</span>
              <span className="text-xs bg-black/30 px-1.5 py-0.5 rounded font-mono font-normal">${raiseAmount}</span>
            </button>
          </div>

        </div>

      </footer>
    </div>
  );
}
