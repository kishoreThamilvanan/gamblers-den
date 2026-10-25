'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BarChart3, Eye, EyeOff, RotateCcw, RefreshCw, UserSearch, CheckSquare, Square
} from 'lucide-react';
import { usePokerStore } from '@/lib/store';
import { sound } from '@/lib/sound/soundSystem';
import { evaluateHand } from '@/lib/poker/evaluator';
import { getProactiveAdvice } from '@/lib/poker/coach';
import { LobbyView } from '@/components/poker/LobbyView';
import { AuthGateView } from '@/components/poker/AuthGateView';
import { UserProfileModal } from '@/components/poker/UserProfileModal';
import { SessionStatsModal } from '@/components/poker/SessionStatsModal';
import { OpponentDossierModal } from '@/components/poker/OpponentDossierModal';
import { HandReplayerModal } from '@/components/poker/HandReplayerModal';
import { ChipStack } from '@/components/poker/ChipStack';
import { DealerLogBox, LogPosition } from '@/components/poker/DealerLogBox';
import { AICoachPanel } from '@/components/poker/AICoachPanel';
import { CardDealingOverlay, useCardDealingAnimation, TableTopBar } from '@/components/casino';
import { Player, HandHistoryRecord, PreActionSelection } from '@/types/poker';
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
  { top: '86%', left: '50%', slot: 0 }, // 0: Hero (Bottom Center)
  { top: '78%', left: '20%', slot: 1 }, // 1: Bottom Left
  { top: '48%', left: '8%',  slot: 2 }, // 2: Middle Left
  { top: '18%', left: '20%', slot: 3 }, // 3: Top Left
  { top: '9%',  left: '38%', slot: 4 }, // 4: Top Center-Left
  { top: '9%',  left: '62%', slot: 5 }, // 5: Top Center-Right
  { top: '18%', left: '80%', slot: 6 }, // 6: Top Right
  { top: '48%', left: '92%', slot: 7 }, // 7: Middle Right
  { top: '78%', left: '80%', slot: 8 }  // 8: Bottom Right
];

const POKER_DECK_ORIGIN = { x: 50, y: 13 };

const COMMUNITY_CARD_COORDS = [
  { x: 38, y: 50 },
  { x: 44, y: 50 },
  { x: 50, y: 50 },
  { x: 56, y: 50 },
  { x: 62, y: 50 },
];

function getVisualSeatLayout(idx: number, effectiveHeroIdx: number, totalPlayers: number) {
  const rel = (idx - effectiveHeroIdx + totalPlayers) % totalPlayers;
  if (totalPlayers === 2) {
    return rel === 0
      ? SEAT_POSITIONS[0]
      : { top: '9%', left: '50%', slot: 4 };
  }
  if (totalPlayers === 6) {
    const sixMaxMap = [
      SEAT_POSITIONS[0], // 0: Hero (Bottom Center)
      SEAT_POSITIONS[1], // 1: Bottom Left
      SEAT_POSITIONS[3], // 2: Top Left
      { top: '9%', left: '50%', slot: 4 }, // 3: Top Center
      SEAT_POSITIONS[6], // 4: Top Right
      SEAT_POSITIONS[8], // 5: Bottom Right
    ];
    return sixMaxMap[rel] || SEAT_POSITIONS[0];
  }
  return SEAT_POSITIONS[rel] || SEAT_POSITIONS[0];
}

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
    tableConfig,
    rebuysUsed,
    rebuyHero,
    preAction,
    setPreAction,
    alwaysRevealHoleCards,
    setAlwaysRevealHoleCards,
    lastHandRecord,
    userProfile,
    isDealingCards,
    setIsDealingCards,
  } = usePokerStore();

  const [themeKey, setThemeKey] = useState<'emerald' | 'royal' | 'charcoal'>('emerald');
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<Player | null>(null);
  const [replayRecord, setReplayRecord] = useState<HandHistoryRecord | null>(null);
  const [coachPosition, setCoachPosition] = useState<LogPosition>('left');
  const [logPosition, setLogPosition] = useState<LogPosition>('right');

  // Shared Physical Card Dealing Animation Engine
  const {
    flyingCards,
    isDealing: isPhysicalDealing,
    dealSingleCard,
    fastForward,
    onCardLanded,
  } = useCardDealingAnimation();

  const [visibleHoleCounts, setVisibleHoleCounts] = useState<Record<string, number>>({});
  const [visibleCommunityCount, setVisibleCommunityCount] = useState<number>(0);
  const [isDealingHand, setIsDealingHand] = useState<boolean>(false);
  const isDealingActive = isPhysicalDealing || isDealingHand || isDealingCards;
  const lastDealtHandNumberRef = useRef<number | null>(null);
  const isDealingInProgressRef = useRef<boolean>(false);

  // Fast-Forward dealing animation (Spacebar or felt click)
  const handleFastForward = useCallback(() => {
    fastForward();
    isDealingInProgressRef.current = false;
    const allCounts: Record<string, number> = {};
    players.forEach((p) => {
      allCounts[p.id] = 2;
    });
    setVisibleHoleCounts(allCounts);
    setVisibleCommunityCount(communityCards.length);
    setIsDealingCards(false);
    setIsDealingHand(false);
  }, [fastForward, players, communityCards.length, setIsDealingCards]);

  // 3D Hole Card Peeking state
  const [isPeeking, setIsPeeking] = useState(false);
  const [pinnedHandNumber, setPinnedHandNumber] = useState<number | null>(null);
  const [dismissedWinnerHandNumber, setDismissedWinnerHandNumber] = useState<number | null>(null);
  const isWinnerCardDismissed = dismissedWinnerHandNumber === handsPlayed;

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

  // Calculate live pot odds & Hero equity for the CALL button badge
  const limpersCount = players.filter(
    (p, i) => i !== effectiveHeroIdx && !p.hasFolded && p.currentBet === 2
  ).length;
  const heroAdvice =
    hero && hero.holeCards && hero.holeCards.length >= 2
      ? getProactiveAdvice(
          hero.holeCards,
          communityCards,
          phase,
          hero.position,
          currentBet,
          hero.currentBet,
          pot,
          limpersCount,
          hero.stack
        )
      : null;

  const requiredPotOddsPct = toCall > 0 ? Math.round((toCall / (pot + toCall)) * 100) : 0;
  const heroEquityPct = heroAdvice?.equityPercent ?? 50;
  const isPositivePotOdds = heroEquityPct >= requiredPotOddsPct;

  // Determine whether Hero's hole cards are currently revealed
  const isHeroCardsPinned = pinnedHandNumber === handsPlayed;
  const areHeroCardsFaceUp =
    alwaysRevealHoleCards || isHeroCardsPinned || isPeeking || phase === 'SHOWDOWN';

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

  // Step-by-Step Clockwise Physical Hole Card Distribution
  const animateHoleDeal = useCallback(
    async (currentPlayers: Player[], currentDealerIdx: number) => {
      if (isDealingInProgressRef.current) return;
      isDealingInProgressRef.current = true;
      setIsDealingHand(true);
      setIsDealingCards(true);

      const initialCounts: Record<string, number> = {};
      currentPlayers.forEach((p) => {
        initialCounts[p.id] = 0;
      });
      setVisibleHoleCounts(initialCounts);
      setVisibleCommunityCount(0);

      const count = currentPlayers.length;
      const activeSeats: number[] = [];
      for (let step = 1; step <= count; step++) {
        const s = (currentDealerIdx + step) % count;
        if (currentPlayers[s] && currentPlayers[s].isActive && !currentPlayers[s].hasFolded) {
          activeSeats.push(s);
        }
      }

      // Authentic, slow & relaxed pacing requested by user
      const flightDuration = gameSpeed === 'relaxed' ? 420 : gameSpeed === 'fast' ? 200 : 300;
      const stepPause = gameSpeed === 'relaxed' ? 260 : gameSpeed === 'fast' ? 70 : 140;

      // Pass 1: Deal 1st hole card clockwise
      for (const seatIdx of activeSeats) {
        if (!isDealingInProgressRef.current) break;
        const p = currentPlayers[seatIdx];
        const isHero = p.archetype === 'Hero' || seatIdx === effectiveHeroIdx;
        const pos = getVisualSeatLayout(seatIdx, effectiveHeroIdx, count);
        const targetCoord = {
          x: parseFloat(pos.left) - (isHero ? 3.5 : 2),
          y: parseFloat(pos.top) - (isHero ? 7 : 4),
        };

        await dealSingleCard({
          card: p.holeCards[0] || { rank: 'A', suit: 's' },
          faceDown: !isHero,
          size: isHero ? 'md' : 'sm',
          origin: POKER_DECK_ORIGIN,
          target: targetCoord,
          durationMs: flightDuration,
          onLanded: () => {
            setVisibleHoleCounts((prev) => ({ ...prev, [p.id]: 1 }));
          },
        });
        if (!isDealingInProgressRef.current) break;
        await new Promise((r) => setTimeout(r, stepPause));
      }

      // Pass 2: Deal 2nd hole card clockwise
      for (const seatIdx of activeSeats) {
        if (!isDealingInProgressRef.current) break;
        const p = currentPlayers[seatIdx];
        const isHero = p.archetype === 'Hero' || seatIdx === effectiveHeroIdx;
        const pos = getVisualSeatLayout(seatIdx, effectiveHeroIdx, count);
        const targetCoord = {
          x: parseFloat(pos.left) + (isHero ? 3.5 : 2),
          y: parseFloat(pos.top) - (isHero ? 7 : 4),
        };

        await dealSingleCard({
          card: p.holeCards[1] || { rank: 'K', suit: 'h' },
          faceDown: !isHero,
          size: isHero ? 'md' : 'sm',
          origin: POKER_DECK_ORIGIN,
          target: targetCoord,
          durationMs: flightDuration,
          onLanded: () => {
            setVisibleHoleCounts((prev) => ({ ...prev, [p.id]: 2 }));
          },
        });
        if (!isDealingInProgressRef.current) break;
        await new Promise((r) => setTimeout(r, stepPause));
      }

      setIsDealingCards(false);
      setIsDealingHand(false);
      isDealingInProgressRef.current = false;
    },
    [dealSingleCard, effectiveHeroIdx, gameSpeed, setIsDealingCards]
  );

  const handleDealNextHand = useCallback(async () => {
    if (isDealingInProgressRef.current || isPhysicalDealing) return;
    setIsDealingCards(true);
    dealNextHand();
    const state = usePokerStore.getState();
    lastDealtHandNumberRef.current = state.handsPlayed;
    await animateHoleDeal(state.players, state.dealerIndex);
  }, [animateHoleDeal, dealNextHand, isPhysicalDealing, setIsDealingCards]);

  // Initial table launch deal animation (when entering from lobby)
  useEffect(() => {
    if (viewMode === 'GAME' && phase === 'PREFLOP' && lastDealtHandNumberRef.current !== handsPlayed && players.length > 0) {
      lastDealtHandNumberRef.current = handsPlayed;
      animateHoleDeal(players, dealerIndex);
    }
  }, [viewMode, phase, handsPlayed, players, dealerIndex, animateHoleDeal]);

  // Community Card Street-by-Street Deal Animation (Flop, Turn, River)
  useEffect(() => {
    if (viewMode !== 'GAME' || phase === 'PREFLOP' || phase === 'SHOWDOWN') {
      return;
    }

    if (communityCards.length > visibleCommunityCount) {
      let isCancelled = false;
      const dealCommunity = async () => {
        const startIdx = visibleCommunityCount;
        const flightDuration = gameSpeed === 'relaxed' ? 380 : gameSpeed === 'fast' ? 180 : 280;
        const stepPause = gameSpeed === 'relaxed' ? 220 : gameSpeed === 'fast' ? 60 : 120;

        for (let i = startIdx; i < communityCards.length; i++) {
          if (isCancelled) break;
          const card = communityCards[i];
          const target = COMMUNITY_CARD_COORDS[i] || { x: 50, y: 50 };

          await dealSingleCard({
            card,
            faceDown: false,
            size: 'md',
            origin: POKER_DECK_ORIGIN,
            target,
            durationMs: flightDuration,
            onLanded: () => {
              if (!isCancelled) {
                setVisibleCommunityCount(i + 1);
              }
            },
          });
          if (isCancelled) break;
          await new Promise((r) => setTimeout(r, stepPause));
        }
      };

      dealCommunity();
      return () => {
        isCancelled = true;
      };
    }
  }, [communityCards, visibleCommunityCount, phase, viewMode, gameSpeed, dealSingleCard]);

  // Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (replayRecord || isStatsOpen || selectedOpponent || isProfileOpen) {
        return;
      }
      if (isPhysicalDealing || isDealingHand) {
        if (e.code === 'Space') {
          e.preventDefault();
          handleFastForward();
          return;
        }
      }
      const key = e.key.toUpperCase();
      if (phase === 'SHOWDOWN' && e.code === 'Space') {
        e.preventDefault();
        if (hero && hero.stack <= 0) return;
        handleDealNextHand();
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
  }, [isHeroTurn, phase, canCheck, currentBet, raiseAmount, handleAction, handleDealNextHand, handleFastForward, isPhysicalDealing, isDealingHand, hero, replayRecord, isStatsOpen, selectedOpponent, isProfileOpen]);

  // Evaluate current made hand
  const heroHandEval =
    hero && hero.holeCards && hero.holeCards.length === 2 && communityCards.length >= 3
      ? evaluateHand([...hero.holeCards, ...communityCards])
      : null;

  if (!userProfile || userProfile.isGuest || userProfile.emailVerified === false) {
    return <AuthGateView />;
  }

  if (viewMode === 'LOBBY') {
    return <LobbyView />;
  }

  const isHeroBusted = hero && hero.stack <= 0 && phase === 'SHOWDOWN';
  const canHeroRebuy = rebuysUsed < tableConfig.maxRebuys;

  return (
    <div className="w-full h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* User Account, Career Bankroll & Table Identity Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Session Stats & Blunder Ledger Modal */}
      <SessionStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        onReplayHand={(record) => {
          setIsStatsOpen(false);
          setReplayRecord(record);
        }}
      />

      {/* Interactive Opponent Cardroom Dossier Modal */}
      <OpponentDossierModal
        player={selectedOpponent}
        onClose={() => setSelectedOpponent(null)}
      />

      {/* Street-by-Street Hand Replayer Modal */}
      <HandReplayerModal
        handRecord={replayRecord}
        onClose={() => setReplayRecord(null)}
      />

      {/* Standardized Casino Top Navigation Bar */}
      <TableTopBar
        mode="game"
        title="FeltSense"
        subtitle={`${tableConfig.tableSize}-Max $1/$2`}
        badge={
          tableConfig.gameMode === 'limp_punisher' ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
              🎯 Limp-Punisher
            </span>
          ) : undefined
        }
        icon={
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-black text-black text-sm shadow">
            ♠
          </div>
        }
        floorHref="/"
        onExitToLobby={quitToLobby}
        lobbyLabel="Lobby"
        centerStatus={
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-300 text-[11px] shadow-sm">
            <span className="text-zinc-500">Hand:</span> <span className="font-semibold text-white">#{handsPlayed || 1}</span>
          </div>
        }
        bankroll={userProfile.careerBankroll}
        userProfile={userProfile}
        onProfileClick={() => setIsProfileOpen(true)}
        soundMuted={soundMuted}
        onToggleMute={toggleMute}
        onOpenStats={() => setIsStatsOpen(true)}
        speed={gameSpeed}
        onSpeedChange={setGameSpeed}
        themes={(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((k) => ({
          id: k,
          label: THEMES[k].name,
          active: themeKey === k,
          onClick: () => setThemeKey(k),
        }))}
        coachPosition={coachPosition}
        onCoachPositionChange={setCoachPosition}
        logPosition={logPosition}
        onLogPositionChange={setLogPosition}
        customSettingsTitle="Hole Card Visibility"
        customSettings={
          <button
            onClick={() => setAlwaysRevealHoleCards(!alwaysRevealHoleCards)}
            className={clsx(
              'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer',
              alwaysRevealHoleCards
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            )}
            title="Toggle between 3D Blind Card Peeking and Always Face-Up Hole Cards"
          >
            <span className="flex items-center gap-1.5">
              {alwaysRevealHoleCards ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>{alwaysRevealHoleCards ? 'Always Face-Up' : '3D Blind Peek'}</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {alwaysRevealHoleCards ? 'Open' : 'Peeking'}
            </span>
          </button>
        }
      />

      {/* Main Game Stage (Rock-Solid Centered Geometry without Layout Shifts) */}
      <div className="flex-1 relative flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        
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
                onClick={() => {
                  if (isPhysicalDealing || isDealingHand) {
                    handleFastForward();
                  }
                }}
              >
                
                {/* Subtle Felt Texture Overlay */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:6px_6px] pointer-events-none" />

                {/* Physical Dealer Card Deck Tray at Top Center Felt */}
                <div
                  className="absolute top-[13%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none select-none z-10"
                  title="Dealer Deck Tray"
                >
                  <div className="relative w-8 h-11 sm:w-9 sm:h-13 rounded border border-amber-500/40 bg-gradient-to-br from-red-800 to-red-950 shadow-[0_4px_12px_rgba(0,0,0,0.8)] flex items-center justify-center">
                    <div className="absolute inset-0 border border-white/10 rounded-[2px] m-0.5" />
                    <span className="text-[8px] sm:text-[9px] font-bold text-amber-300/80 tracking-tighter uppercase font-serif">GD</span>
                    <div className="absolute -bottom-1 left-0 right-0 h-1 bg-white/40 rounded-b border-t border-black/30" />
                    <div className="absolute -bottom-2 left-0.5 right-0.5 h-1 bg-zinc-300/50 rounded-b border-t border-black/30" />
                  </div>
                </div>

                {/* Table Center Watermark */}
                <div className="absolute text-center select-none pointer-events-none opacity-15">
                  <div className="text-3xl sm:text-5xl font-black tracking-widest text-white">FELT SENSE</div>
                  <div className="text-[10px] tracking-widest text-amber-300 font-semibold uppercase mt-1">GTO & Exploitative Casino Trainer</div>
                </div>

                {/* Table Center: Live Action Ticker, Timing Tell, Pot, and Community Cards */}
                <div className="flex flex-col items-center z-10 -mt-2">
                  
                  {/* Showdown Winner Floating Plaque (Compact & Non-Obscuring) OR Live Action & Pot */}
                  {phase === 'SHOWDOWN' ? (
                    !isWinnerCardDismissed && lastHandResult ? (
                      <div className="pointer-events-auto mb-2.5 max-w-sm sm:max-w-md w-full px-3 py-1.5 rounded-xl bg-zinc-950/90 border border-amber-500/60 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md flex items-center justify-between gap-2.5 animate-action-pop">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-black text-sm font-black shrink-0 shadow border border-white/40">
                            🏆
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-xs sm:text-sm font-black text-white truncate">
                                {lastHandResult.isHeroWinner ? (
                                  <span className="text-emerald-400">YOU WON THE POT!</span>
                                ) : (
                                  <span>{lastHandResult.winnerNames} Won</span>
                                )}
                              </span>
                              <span className="text-xs sm:text-sm font-black text-amber-300 shrink-0">
                                +${lastHandResult.amount.toFixed(2)}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-300 font-semibold truncate">
                              {lastHandResult.handName}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {lastHandResult.winningCards && lastHandResult.winningCards.length > 0 && (
                            <div className="hidden sm:flex items-center -space-x-2 mr-1">
                              {lastHandResult.winningCards.map((c, i) => (
                                <Card key={i} card={c} size="sm" />
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => setDismissedWinnerHandNumber(handsPlayed)}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                            title="Hide banner to inspect entire felt"
                          >
                            <EyeOff size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pointer-events-auto mb-2 min-h-[28px] flex items-center">
                        <button
                          onClick={() => setDismissedWinnerHandNumber(null)}
                          className="px-2.5 py-0.5 rounded-full bg-black/75 border border-zinc-700 hover:border-amber-400 text-[10px] text-zinc-400 hover:text-amber-300 transition cursor-pointer flex items-center gap-1 shadow backdrop-blur-sm"
                        >
                          <Eye size={12} />
                          <span>Show Winner Banner</span>
                        </button>
                      </div>
                    )
                  ) : (
                    <>
                      {/* Live Action Feed Ticker + Physical Timing Tell */}
                      <div className="mb-2 min-h-[28px] flex flex-col items-center justify-center gap-1">
                        {lastActionEvent ? (
                          <>
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
                            {lastActionEvent.liveTell && (
                              <div className="animate-ticker-slide px-3 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/40 text-amber-300 text-[10px] font-semibold shadow-lg max-w-md text-center">
                                ⏱️ {lastActionEvent.liveTell}
                              </div>
                            )}
                          </>
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
                    </>
                  )}

                  {/* 5 Community Cards */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {communityCards
                      .slice(0, phase === 'SHOWDOWN' ? communityCards.length : visibleCommunityCount)
                      .map((card, i) => (
                        <div 
                          key={`${card.rank}-${card.suit}-${i}`} 
                          className={clsx(
                            'animate-action-pop',
                            lastHandResult?.wasRunout && phase === 'SHOWDOWN' && 'ring-1 ring-amber-400/60 rounded'
                          )}
                        >
                          <Card card={card} size="md" />
                        </div>
                      ))}
                    {Array.from({
                      length: 5 - (phase === 'SHOWDOWN' ? communityCards.length : Math.min(communityCards.length, visibleCommunityCount)),
                    }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="w-10 h-14 sm:w-14 sm:h-20 rounded-md border border-white/20 bg-black/20 flex items-center justify-center"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      </div>
                    ))}
                  </div>

                  {/* Hand Strength / Hand Realization Pill */}
                  {phase === 'SHOWDOWN' ? (
                    <div className="mt-2.5 px-3.5 py-1 rounded-full bg-black/85 border border-amber-500/40 text-[11px] sm:text-xs font-semibold tracking-wide flex items-center gap-2 shadow-xl backdrop-blur-md animate-action-pop">
                      {lastHandResult?.heroPotentialHand?.wasFolded ? (
                        <>
                          <span className="text-amber-400 font-bold">🔮 What You Could Have Made:</span>
                          <span className="text-white font-extrabold underline decoration-amber-400/60">
                            {lastHandResult.heroPotentialHand.name}
                          </span>
                          {lastHandResult.heroPotentialHand.foldStreet && (
                            <span className="text-[10px] text-amber-300/80 font-mono bg-zinc-900 border border-zinc-700 px-1.5 py-0.2 rounded">
                              Folded {lastHandResult.heroPotentialHand.foldStreet}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-400 font-bold">🎯 Your Hand:</span>
                          <span className="text-white font-extrabold">
                            {lastHandResult?.heroPotentialHand?.name || heroHandEval?.name || 'Showdown'}
                          </span>
                          {lastHandResult?.isHeroWinner && (
                            <span className="text-[10px] bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 font-black px-1.5 py-0.2 rounded uppercase">
                              🏆 WINNER
                            </span>
                          )}
                        </>
                      )}
                      {lastHandResult?.wasRunout && (
                        <span className="text-[9px] text-zinc-400 font-mono border-l border-zinc-700 pl-2">
                          (Board Runout)
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2.5 px-3 py-0.5 rounded-full bg-black/60 border border-emerald-500/30 text-[10px] sm:text-xs text-emerald-300 font-medium tracking-wide flex items-center gap-1.5 backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {heroHandEval ? heroHandEval.name : phase === 'PREFLOP' ? 'Preflop Pocket' : `Street: ${phase}`}
                    </div>
                  )}
                </div>



              </div>
            </div>
          </div>

          {/* Player Pods Arranged Symmetrically for 2-Max, 6-Max, or 9-Max */}
          {players.map((player, idx) => {
            const isHero = player.archetype === 'Hero' || idx === effectiveHeroIdx;
            const pos = getVisualSeatLayout(idx, effectiveHeroIdx, players.length);
            const visualSlot = pos.slot;
            const isActive = idx === activePlayerIndex && phase !== 'SHOWDOWN';
            const isDealer = idx === dealerIndex;
            const isWinner = lastHandResult?.winnerIds?.includes(player.id) && phase === 'SHOWDOWN';

            // Opponents' cards remain strictly hidden until Showdown.
            // Hero's cards support 3D Blind Peeking or Pinning.
            const isShowdown = phase === 'SHOWDOWN';
            const showHoleCards = isHero
              ? areHeroCardsFaceUp
              : isShowdown && !player.hasFolded;
            const actionBadge = player.lastAction;

            return (
              <div
                key={player.id}
                style={{ top: pos.top, left: pos.left }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto transition-all duration-300 z-20 ${
                  isHero ? 'scale-110 z-30' : 'scale-90 sm:scale-100'
                }`}
              >
                {/* Dealt Hole Cards (with 3D Blind Peeking for Hero & Muck Animation on Fold) */}
                {player.holeCards && player.holeCards.length > 0 && (
                  <div
                    onMouseEnter={() => {
                      if (isHero && !alwaysRevealHoleCards && !isHeroCardsPinned && phase !== 'SHOWDOWN') {
                        setIsPeeking(true);
                        sound.playCardPeel();
                      }
                    }}
                    onMouseLeave={() => {
                      if (isHero && isPeeking) {
                        setIsPeeking(false);
                        sound.playCardSnap();
                      }
                    }}
                    onTouchStart={() => {
                      if (isHero && !alwaysRevealHoleCards && !isHeroCardsPinned && phase !== 'SHOWDOWN') {
                        setIsPeeking(true);
                        sound.playCardPeel();
                      }
                    }}
                    onTouchEnd={() => {
                      if (isHero && isPeeking) {
                        setIsPeeking(false);
                        sound.playCardSnap();
                      }
                    }}
                    onClick={() => {
                      if (isHero && !alwaysRevealHoleCards && phase !== 'SHOWDOWN') {
                        const nextPinned = isHeroCardsPinned ? null : handsPlayed;
                        setPinnedHandNumber(nextPinned);
                        sound.playCardSnap();
                      }
                    }}
                    title={
                      isHero && !alwaysRevealHoleCards
                        ? 'Hover/hold to 3D peek hole cards • Click to pin face-up for this hand'
                        : undefined
                    }
                    className={clsx(
                      'relative flex items-center gap-1 mb-1.5 transition-all duration-300',
                      isHero ? '-space-x-3 mb-2 cursor-pointer group' : '-space-x-3',
                      isHero && isPeeking && '[transform:perspective(600px)_rotateX(16deg)_rotateY(-8deg)_translateY(-6px)]',
                      player.hasFolded && (isShowdown && isHero ? 'opacity-90 ring-1 ring-amber-500/40 rounded p-0.5 bg-black/40' : 'animate-card-muck grayscale pointer-events-none')
                    )}
                  >
                    {(() => {
                      const visibleCount = isDealingActive
                        ? (visibleHoleCounts[player.id] ?? 0)
                        : 2;
                      const cardsToRender = player.holeCards.slice(0, visibleCount);

                      return (
                        <>
                          {cardsToRender.map((card, cIdx) => (
                            <Card 
                              key={cIdx} 
                              card={showHoleCards ? card : { hidden: true }} 
                              size={isHero ? 'md' : 'sm'} 
                              className={clsx(
                                isHero ? 'shadow-2xl transition-transform duration-200' : 'shadow',
                                'animate-action-pop'
                              )}
                            />
                          ))}
                          {isDealingActive && Array.from({ length: 2 - cardsToRender.length }).map((_, i) => (
                            <div
                              key={`empty-placeholder-${i}`}
                              className={clsx(
                                'rounded-md border border-dashed border-white/10 bg-black/25 flex items-center justify-center opacity-40',
                                isHero ? 'w-10 h-14 sm:w-14 sm:h-20' : 'w-6 h-9 sm:w-7 sm:h-10'
                              )}
                            />
                          ))}
                        </>
                      );
                    })()}

                    {/* Showdown realization callout on Hero's folded pocket cards */}
                    {isShowdown && isHero && player.hasFolded && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black/95 border border-amber-500/60 text-amber-300 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap shadow-xl">
                        Folded • {lastHandResult?.heroPotentialHand?.name || 'Folded'}
                      </div>
                    )}

                    {/* 3D Peek Helper Pill on Hero Cards when Face-Down */}
                    {isHero && !areHeroCardsFaceUp && !player.hasFolded && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-amber-500/50 text-amber-300 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full shadow-lg whitespace-nowrap pointer-events-none">
                        Hold to Peek • Click to Pin
                      </div>
                    )}
                  </div>
                )}

                {/* Avatar and Player Ring Container */}
                <div
                  onClick={() => {
                    if (isHero) {
                      setIsProfileOpen(true);
                    } else {
                      setSelectedOpponent(player);
                    }
                  }}
                  title={isHero ? 'Click to open your Player Profile & Table Identity' : `Click to view ${player.name}'s Cardroom Dossier`}
                  className="relative flex flex-col items-center group cursor-pointer"
                >
                  
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
                      !isHero && 'group-hover:ring-2 group-hover:ring-amber-400/70',
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

                    {/* Dossier Hover Icon for Opponents */}
                    {!isHero && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center shadow">
                        <UserSearch size={10} />
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
                    isHero ? 'border-amber-500/50 ring-1 ring-amber-500/30' : 'border-zinc-800 group-hover:border-amber-500/40',
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

                  {/* Bankroll Chip Stack on Felt */}
                  {player.stack > 0 && !player.hasFolded && (
                    <div className={`absolute pointer-events-none transition-all duration-300 ${
                      visualSlot === 0 ? '-left-12 bottom-1' :
                      visualSlot === 1 ? '-right-12 bottom-1' :
                      visualSlot === 2 ? '-right-12 top-2' :
                      visualSlot === 3 ? '-right-12 bottom-0' :
                      visualSlot === 4 || visualSlot === 5 ? '-left-12 top-1' :
                      visualSlot === 6 ? '-left-12 bottom-0' :
                      visualSlot === 7 ? '-left-12 top-2' :
                      '-left-12 bottom-1'
                    }`}>
                      <ChipStack amount={player.stack} mode="bankroll" size="xs" showAmountLabel={false} />
                    </div>
                  )}

                  {/* Dynamic Action / Bet Chip Stack */}
                  {player.currentBet > 0 && !player.hasFolded && (
                    <div
                      key={`bet-${player.id}-${player.currentBet}`}
                      className={`animate-chip-toss absolute pointer-events-none transition-all duration-300 ${
                        visualSlot === 0 ? '-top-12 left-1/2 -translate-x-1/2' :
                        visualSlot === 1 ? '-top-6 -right-14' :
                        visualSlot === 2 ? 'top-1 -right-16' :
                        visualSlot === 3 ? '-bottom-9 -right-12' :
                        visualSlot === 4 || visualSlot === 5 ? '-bottom-11 left-1/2 -translate-x-1/2' :
                        visualSlot === 6 ? '-bottom-9 -left-12' :
                        visualSlot === 7 ? 'top-1 -left-16' :
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

          {/* Shared Physical Card Dealing Overlay */}
          <CardDealingOverlay
            flyingCards={flyingCards}
            onCardLanded={onCardLanded}
          />

        </div>

        {/* Dockable AI Coach Panel */}
        <AICoachPanel
          position={coachPosition}
          onPositionChange={setCoachPosition}
          onApplyAdvice={handleApplyAdvice}
          isStacked={coachPosition === logPosition && (coachPosition === 'left' || coachPosition === 'right')}
        />

        {/* Dockable Dealer Log Panel */}
        <DealerLogBox
          position={logPosition}
          onPositionChange={setLogPosition}
          isStacked={coachPosition === logPosition && (logPosition === 'left' || logPosition === 'right')}
        />
      </div>

      {/* Bottom Betting Console */}
      <footer className="h-28 bg-[#0a0d13] border-t border-zinc-800 px-4 py-2 flex items-center justify-center gap-4 z-30 shrink-0">
        {/* Betting Action Controls OR Showdown Hand Realization Action Bar */}
        <div className="flex-1 max-w-3xl flex flex-col justify-between h-full py-0.5">
          {phase === 'SHOWDOWN' ? (
            <div className="flex items-center justify-between gap-3 h-full px-3 py-1.5 bg-zinc-950/80 border border-zinc-800 rounded-xl shadow-lg">
              {/* Left: Summary of Hand Outcome & Hero Realization */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-black text-sm shrink-0">
                  🏆
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">
                    {lastHandResult?.isHeroWinner ? (
                      <span className="text-emerald-400">You won ${lastHandResult?.amount.toFixed(2)} with {lastHandResult?.handName}!</span>
                    ) : (
                      <span>{lastHandResult?.winnerNames || 'Winner'} won ${lastHandResult?.amount.toFixed(2)} ({lastHandResult?.handName})</span>
                    )}
                  </span>
                  <span className="text-[10px] text-zinc-400 truncate">
                    {lastHandResult?.heroPotentialHand?.wasFolded ? (
                      <span className="text-amber-300">
                        Folded {lastHandResult.heroPotentialHand.foldStreet || 'early'} • Potential: <strong className="text-white">{lastHandResult.heroPotentialHand.name}</strong>
                      </span>
                    ) : (
                      <span>Your hand: <strong className="text-emerald-300">{lastHandResult?.heroPotentialHand?.name || heroHandEval?.name}</strong></span>
                    )}
                  </span>
                </div>
              </div>

              {/* Right: Deal Next Hand / Rebuy / Replay Controls */}
              <div className="flex items-center gap-2 shrink-0">
                {lastHandRecord && (
                  <button
                    onClick={() => setReplayRecord(lastHandRecord)}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40 font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1.5"
                    title="Replay this hand street-by-street"
                  >
                    <RotateCcw size={13} />
                    <span className="hidden sm:inline">Replay</span>
                  </button>
                )}

                {isHeroBusted ? (
                  canHeroRebuy ? (
                    <button
                      onClick={rebuyHero}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wider rounded-lg shadow-xl active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw size={14} />
                      <span>Rebuy ${tableConfig.buyInAmount}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsStatsOpen(true)}
                      className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-xl cursor-pointer flex items-center gap-1.5"
                    >
                      <BarChart3 size={14} />
                      <span>Session Review</span>
                    </button>
                  )
                ) : (
                  <button
                    onClick={handleDealNextHand}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-xl active:scale-95 transition-all cursor-pointer flex items-center gap-2 ring-2 ring-emerald-400/50"
                  >
                    <span>Deal Next Hand</span>
                    <span className="text-[10px] text-white/70 font-mono bg-black/40 px-1.5 py-0.5 rounded">[Space]</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Top Bar: Pre-Action Checkboxes (when waiting for turn) OR Bet Sizing Presets + Pot Odds Badge */}
              {!isHeroTurn && hero && !hero.hasFolded ? (
                <div className="flex items-center justify-between gap-2 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    Pre-Action Staging:
                  </span>
                  <div className="flex items-center gap-2">
                    {(
                      [
                        { id: 'check_fold', label: 'Check / Fold' },
                        { id: 'check', label: 'Check' },
                        { id: 'call_any', label: `Call ${toCall > 0 ? `$${toCall}` : 'Any'}` },
                      ] as Array<{ id: Exclude<PreActionSelection, null>; label: string }>
                    ).map((item) => {
                      const active = preAction === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setPreAction(active ? null : item.id)}
                          className={clsx(
                            'px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer',
                            active
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          )}
                        >
                          {active ? <CheckSquare size={12} className="text-amber-400" /> : <Square size={12} />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className={`flex items-center justify-between gap-2 ${!isHeroTurn ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <button 
                      onClick={() => setPreset('MIN')}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
                    >
                      MIN (${minPossibleBet})
                    </button>
                    <button 
                      onClick={() => setPreset('HALF')}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
                    >
                      1/2 POT
                    </button>
                    <button 
                      onClick={() => setPreset('THREE_FOURTH')}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
                    >
                      3/4 POT
                    </button>
                    <button 
                      onClick={() => setPreset('POT')}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
                    >
                      POT
                    </button>
                    <button 
                      onClick={() => setPreset('ALLIN')}
                      className="px-2 py-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-800 transition cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>

                  {/* Live Pot Odds & Breakeven Equity Visualizer Badge */}
                  {toCall > 0 && (
                    <div
                      className={clsx(
                        'hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold',
                        isPositivePotOdds
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                      )}
                      title={`Calling $${toCall} into $${pot + toCall} total pot requires ${requiredPotOddsPct}% equity. Your estimated equity is ${heroEquityPct}%.`}
                    >
                      <span className={clsx('w-1.5 h-1.5 rounded-full', isPositivePotOdds ? 'bg-emerald-400' : 'bg-amber-400')} />
                      <span>Requires {requiredPotOddsPct}% Eq</span>
                      <span className="text-zinc-500">•</span>
                      <span>Hero {heroEquityPct}%</span>
                    </div>
                  )}

                  {/* Slider with exact input value */}
                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <input 
                      type="range" 
                      min={minPossibleBet} 
                      max={maxBet} 
                      step={1}
                      value={raiseAmount}
                      onChange={(e) => setCustomRaiseAmount(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <div className="bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-xs font-mono font-bold text-emerald-400 min-w-[54px] text-center">
                      ${raiseAmount}
                    </div>
                  </div>
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className={`grid grid-cols-3 gap-2 sm:gap-4 mt-1 ${!isHeroTurn ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
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
                  {!canCheck && (
                    <span className="text-xs bg-black/30 px-1.5 py-0.5 rounded font-mono font-normal">
                      ${toCall} ({requiredPotOddsPct}% Eq)
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => handleAction(currentBet === 0 ? 'bet' : 'raise', raiseAmount)}
                  className="py-2.5 sm:py-3 rounded-lg bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-sm sm:text-base tracking-wider uppercase shadow-lg shadow-emerald-950/50 border border-emerald-500/50 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{currentBet === 0 ? 'BET' : 'RAISE TO'}</span>
                  <span className="text-xs bg-black/30 px-1.5 py-0.5 rounded font-mono font-normal">${raiseAmount}</span>
                </button>
              </div>
            </>
          )}

        </div>

      </footer>
    </div>
  );
}
