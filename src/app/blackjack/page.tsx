'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePokerStore } from '@/lib/store';
import { AuthGateView } from '@/components/poker/AuthGateView';
import { UserProfileModal } from '@/components/poker/UserProfileModal';
import { Card } from '@/components/poker/Card';
import { sound } from '@/lib/sound/soundSystem';
import { persistActiveUserProfile } from '@/lib/auth/authService';
import {
  BlackjackCard,
  BlackjackHandState,
  ShoeState,
  createShoe,
  calculateHand,
  getBasicStrategyAction,
  getHiLoValue,
  calculateTrueCount,
  playDealerTurn,
  settleHand,
  BasicStrategyAction,
} from '@/lib/blackjack/blackjackEngine';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Coins,
  Sparkles,
  Info,
  Flame,
} from 'lucide-react';
import { clsx } from 'clsx';

const CHIP_DENOMINATIONS = [
  { value: 1, label: '$1', color: 'bg-blue-600 border-blue-400 text-white' },
  { value: 5, label: '$5', color: 'bg-red-600 border-red-400 text-white' },
  { value: 25, label: '$25', color: 'bg-emerald-600 border-emerald-400 text-white' },
  { value: 100, label: '$100', color: 'bg-zinc-900 border-zinc-400 text-amber-300' },
  { value: 500, label: '$500', color: 'bg-purple-700 border-purple-400 text-white' },
];

export default function BlackjackPage() {
  const { userProfile, soundMuted, toggleMute } = usePokerStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Persistent Career Bankroll State
  const [bankroll, setBankroll] = useState<number>(userProfile?.careerBankroll ?? 2000);

  // Sync bankroll updates back to profile and vault
  const updateVaultBankroll = useCallback((newBankroll: number) => {
    setBankroll(newBankroll);
    if (userProfile) {
      persistActiveUserProfile({
        ...userProfile,
        careerBankroll: newBankroll,
      });
    }
  }, [userProfile]);

  // 6-Deck Shoe State (seeded initial state ensures clean static prerender without Math.random() warnings)
  const [shoe, setShoe] = useState<ShoeState>(() => createShoe(6, 42));

  // 3 Multi-Hand Betting Spots
  // Spot 0: Left, Spot 1: Center, Spot 2: Right
  const [spotBets, setSpotBets] = useState<number[]>([0, 25, 0]); // Center spot default $25
  const [lastBets, setLastBets] = useState<number[]>([0, 25, 0]);
  const [selectedChip, setSelectedChip] = useState<number>(25);

  // Active Game State
  const [gamePhase, setGamePhase] = useState<'betting' | 'dealing' | 'player_turn' | 'dealer_turn' | 'settled'>('betting');
  const [dealerCards, setDealerCards] = useState<BlackjackCard[]>([]);
  const [dealerHoleHidden, setDealerHoleHidden] = useState<boolean>(true);

  // Hands on the table
  const [hands, setHands] = useState<BlackjackHandState[]>([]);
  const [activeHandIndex, setActiveHandIndex] = useState<number>(0);

  // HUD & Coaching Toggles
  const [showCoach, setShowCoach] = useState<boolean>(true);
  const [showCountingHud, setShowCountingHud] = useState<boolean>(true);
  const [tableNotice, setTableNotice] = useState<string>('Place your bets on 1 to 3 spots, then click Deal.');

  // Total current wager on table
  const totalWager = useMemo(() => spotBets.reduce((a, b) => a + b, 0), [spotBets]);

  // Active Hand & Dealer Evaluations
  const dealerEval = useMemo(() => calculateHand(dealerHoleHidden && dealerCards.length >= 1 ? [dealerCards[0]] : dealerCards), [dealerCards, dealerHoleHidden]);
  const activeHand = hands[activeHandIndex];

  // Basic Strategy Suggestion for active hand
  const strategyAdvice = useMemo<BasicStrategyAction | null>(() => {
    if (gamePhase !== 'player_turn' || !activeHand || dealerCards.length === 0) return null;
    const canDouble = activeHand.cards.length === 2 && bankroll >= activeHand.bet;
    const canSplit =
      activeHand.cards.length === 2 &&
      activeHand.cards[0].rank === activeHand.cards[1].rank &&
      bankroll >= activeHand.bet;
    const canSurrender = activeHand.cards.length === 2 && !activeHand.isSplit;

    return getBasicStrategyAction(activeHand.cards, dealerCards[0], canDouble, canSplit, canSurrender);
  }, [gamePhase, activeHand, dealerCards, bankroll]);

  // Card Counting True Count
  const trueCount = useMemo(() => {
    return calculateTrueCount(shoe.runningCount, shoe.cards.length);
  }, [shoe.runningCount, shoe.cards.length]);

  // Global Auth Guard (after all hooks)
  if (!userProfile || userProfile.isGuest || userProfile.emailVerified === false) {
    return <AuthGateView />;
  }

  // Place Chip on Spot
  const handleSpotClick = (spotIndex: number) => {
    if (gamePhase !== 'betting') return;
    if (bankroll < selectedChip) {
      setTableNotice('Insufficient career vault bankroll to place this chip.');
      return;
    }
    const currentBet = spotBets[spotIndex];
    const newBet = currentBet + selectedChip;
    if (newBet > 1000) {
      setTableNotice('Maximum table limit is $1,000 per spot.');
      return;
    }
    sound.playChipSound();
    setSpotBets((prev) => {
      const next = [...prev];
      next[spotIndex] = newBet;
      return next;
    });
    setTableNotice(`Spot ${spotIndex + 1} bet: $${newBet}`);
  };

  const handleClearBets = () => {
    if (gamePhase !== 'betting') return;
    setSpotBets([0, 0, 0]);
    sound.playChipSound();
    setTableNotice('All bets cleared.');
  };

  const handleDoubleBets = () => {
    if (gamePhase !== 'betting') return;
    const doubled = spotBets.map((b) => b * 2);
    const sum = doubled.reduce((a, b) => a + b, 0);
    if (sum > bankroll) {
      setTableNotice('Insufficient bankroll to double all bets.');
      return;
    }
    setSpotBets(doubled);
    sound.playChipSound();
  };

  const handleRebet = () => {
    if (gamePhase !== 'betting') return;
    const sum = lastBets.reduce((a, b) => a + b, 0);
    if (sum > bankroll) {
      setTableNotice('Insufficient bankroll to repeat previous bets.');
      return;
    }
    setSpotBets([...lastBets]);
    sound.playChipSound();
  };

  // ============================================================================
  // DEAL HANDS
  // ============================================================================
  const handleDeal = () => {
    if (gamePhase !== 'betting') return;
    if (totalWager === 0) {
      setTableNotice('Please place at least one bet ($5 minimum).');
      return;
    }
    if (totalWager > bankroll) {
      setTableNotice('Total wagers exceed your career vault bankroll.');
      return;
    }

    // Deduct total wagers from player's persistent bankroll
    updateVaultBankroll(bankroll - totalWager);
    setLastBets([...spotBets]);

    // Check if shoe needs reshuffling (cut card reached)
    let currentShoe = { ...shoe, cards: [...shoe.cards] };
    if (currentShoe.cards.length <= currentShoe.cutCardIndex || currentShoe.cards.length < 10) {
      currentShoe = createShoe(6);
      setTableNotice('Reshuffling 6-Deck Shoe...');
    }

    sound.playCardDeal();

    // Prepare initial hands for all active spots (1 to 3)
    const activeSpots = spotBets
      .map((bet, idx) => ({ bet, spotIndex: idx }))
      .filter((s) => s.bet >= 5);

    // Deal cards: 2 cards to each active player spot, 2 to dealer
    const playerHands: BlackjackHandState[] = activeSpots.map((s, idx) => ({
      id: `hand-${s.spotIndex}-${idx}`,
      spotIndex: s.spotIndex,
      cards: [],
      bet: s.bet,
      isDoubled: false,
      isSplit: false,
      isSurrendered: false,
      status: 'playing',
    }));

    // Deal 1st card to players
    for (const h of playerHands) {
      const c = currentShoe.cards.pop()!;
      h.cards.push(c);
      currentShoe.runningCount += getHiLoValue(c);
    }
    // Deal 1st card to dealer (Upcard)
    const dealerUpcard = currentShoe.cards.pop()!;
    currentShoe.runningCount += getHiLoValue(dealerUpcard);
    const dCards = [dealerUpcard];

    // Deal 2nd card to players
    for (const h of playerHands) {
      const c = currentShoe.cards.pop()!;
      h.cards.push(c);
      currentShoe.runningCount += getHiLoValue(c);
    }
    // Deal 2nd card to dealer (Hole card, hidden)
    const dealerHoleCard = currentShoe.cards.pop()!;
    // (Note: Dealer hole card is not counted in Hi-Lo until revealed)
    dCards.push(dealerHoleCard);

    setShoe(currentShoe);
    setDealerCards(dCards);
    setDealerHoleHidden(true);

    // Check Natural Blackjacks on player hands
    for (const h of playerHands) {
      const evalResult = calculateHand(h.cards);
      if (evalResult.isBlackjack) {
        h.status = 'blackjack';
      }
    }

    setHands(playerHands);
    setGamePhase('player_turn');
    setActiveHandIndex(0);

    // If first hand is already blackjack, advance automatically
    if (playerHands[0]?.status === 'blackjack') {
      advanceToNextHand(0, playerHands, currentShoe, dCards);
    }
  };

  // Helper to advance across multi-hands
  const advanceToNextHand = (
    currentIndex: number,
    currentHands: BlackjackHandState[],
    currentShoe: ShoeState,
    currentDealerCards: BlackjackCard[]
  ) => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < currentHands.length) {
      setActiveHandIndex(nextIdx);
      if (currentHands[nextIdx].status === 'blackjack') {
        advanceToNextHand(nextIdx, currentHands, currentShoe, currentDealerCards);
      }
    } else {
      // All player hands finished! Begin dealer turn
      triggerDealerTurn(currentHands, currentShoe, currentDealerCards);
    }
  };

  // ============================================================================
  // PLAYER ACTIONS
  // ============================================================================
  const handleHit = () => {
    if (gamePhase !== 'player_turn' || !activeHand) return;

    const currentShoe = { ...shoe, cards: [...shoe.cards] };
    const nextCard = currentShoe.cards.pop()!;
    currentShoe.runningCount += getHiLoValue(nextCard);
    setShoe(currentShoe);

    sound.playCardDeal();

    const updatedHands = [...hands];
    const hand = { ...activeHand, cards: [...activeHand.cards, nextCard] };
    const evaluation = calculateHand(hand.cards);

    if (evaluation.isBusted) {
      hand.status = 'busted';
      sound.playBetByDensity(25, 100); // Thud sound
    } else if (evaluation.is21) {
      hand.status = 'stood';
    }

    updatedHands[activeHandIndex] = hand;
    setHands(updatedHands);

    if (hand.status === 'busted' || hand.status === 'stood') {
      advanceToNextHand(activeHandIndex, updatedHands, currentShoe, dealerCards);
    }
  };

  const handleStand = () => {
    if (gamePhase !== 'player_turn' || !activeHand) return;

    sound.playCheckKnock();
    const updatedHands = [...hands];
    updatedHands[activeHandIndex] = { ...activeHand, status: 'stood' };
    setHands(updatedHands);

    advanceToNextHand(activeHandIndex, updatedHands, shoe, dealerCards);
  };

  const handleDoubleDown = () => {
    if (gamePhase !== 'player_turn' || !activeHand) return;
    if (bankroll < activeHand.bet) {
      setTableNotice('Insufficient vault balance to double down.');
      return;
    }

    // Deduct secondary double wager
    updateVaultBankroll(bankroll - activeHand.bet);
    sound.playChipSound();

    const currentShoe = { ...shoe, cards: [...shoe.cards] };
    const card = currentShoe.cards.pop()!;
    currentShoe.runningCount += getHiLoValue(card);
    setShoe(currentShoe);

    sound.playCardDeal();

    const updatedHands = [...hands];
    const hand = {
      ...activeHand,
      bet: activeHand.bet * 2,
      isDoubled: true,
      cards: [...activeHand.cards, card],
    };

    const evaluation = calculateHand(hand.cards);
    hand.status = evaluation.isBusted ? 'busted' : 'stood';

    updatedHands[activeHandIndex] = hand;
    setHands(updatedHands);

    advanceToNextHand(activeHandIndex, updatedHands, currentShoe, dealerCards);
  };

  const handleSplit = () => {
    if (gamePhase !== 'player_turn' || !activeHand) return;
    if (activeHand.cards.length !== 2 || activeHand.cards[0].rank !== activeHand.cards[1].rank) return;
    if (bankroll < activeHand.bet) {
      setTableNotice('Insufficient vault balance to split.');
      return;
    }

    // Deduct split bet
    updateVaultBankroll(bankroll - activeHand.bet);
    sound.playChipSound();

    const currentShoe = { ...shoe, cards: [...shoe.cards] };
    const card1 = currentShoe.cards.pop()!;
    const card2 = currentShoe.cards.pop()!;
    currentShoe.runningCount += getHiLoValue(card1) + getHiLoValue(card2);
    setShoe(currentShoe);

    sound.playCardDeal();

    // Create 2 split hands
    const handA: BlackjackHandState = {
      ...activeHand,
      id: `${activeHand.id}-a`,
      isSplit: true,
      cards: [activeHand.cards[0], card1],
    };
    const handB: BlackjackHandState = {
      ...activeHand,
      id: `${activeHand.id}-b`,
      isSplit: true,
      cards: [activeHand.cards[1], card2],
    };

    const updatedHands = [...hands];
    updatedHands.splice(activeHandIndex, 1, handA, handB);
    setHands(updatedHands);
  };

  const handleSurrender = () => {
    if (gamePhase !== 'player_turn' || !activeHand) return;
    if (activeHand.cards.length !== 2 || activeHand.isSplit) return;

    sound.playCardSnap();
    const updatedHands = [...hands];
    updatedHands[activeHandIndex] = { ...activeHand, isSurrendered: true, status: 'settled' };
    setHands(updatedHands);

    advanceToNextHand(activeHandIndex, updatedHands, shoe, dealerCards);
  };

  // ============================================================================
  // DEALER TURN & SETTLEMENT
  // ============================================================================
  const triggerDealerTurn = (
    currentHands: BlackjackHandState[],
    currentShoe: ShoeState,
    currentDealerCards: BlackjackCard[]
  ) => {
    setGamePhase('dealer_turn');
    setDealerHoleHidden(false);

    // Count dealer's hole card in Hi-Lo now that it's revealed
    const updatedShoe = { ...currentShoe };
    if (currentDealerCards[1]) {
      updatedShoe.runningCount += getHiLoValue(currentDealerCards[1]);
    }

    // Check if all player hands busted or surrendered; if so, dealer doesn't need to draw
    const allEnded = currentHands.every((h) => h.status === 'busted' || h.isSurrendered);

    let finalDealerCards = [...currentDealerCards];

    if (!allEnded) {
      const dealerRes = playDealerTurn(currentDealerCards, updatedShoe);
      finalDealerCards = dealerRes.finalCards;
    }

    setDealerCards(finalDealerCards);
    setShoe(updatedShoe);

    // Settle each hand
    let totalPayout = 0;
    let netChange = 0;
    const settledHands = currentHands.map((h) => {
      const outcome = settleHand(h, finalDealerCards);
      totalPayout += outcome.payout;
      netChange += outcome.netProfit;
      return {
        ...h,
        status: 'settled' as const,
        result: outcome.result,
        payout: outcome.payout,
        netProfit: outcome.netProfit,
      };
    });

    setHands(settledHands);
    setGamePhase('settled');

    // Credit payouts to vault
    if (totalPayout > 0) {
      updateVaultBankroll(bankroll + totalPayout);
    }

    // Sound and Banner notices
    if (netChange > 0) {
      sound.playWinPot();
      setTableNotice(`Winner! +$${netChange} profit credited to your vault.`);
    } else if (netChange === 0) {
      setTableNotice('Push — all equal bets returned.');
    } else {
      setTableNotice(`Round settled. Net -$${Math.abs(netChange)}.`);
    }
  };

  const handleNextRound = () => {
    setGamePhase('betting');
    setHands([]);
    setDealerCards([]);
    setDealerHoleHidden(true);
    setActiveHandIndex(0);
    setTableNotice('Place your bets for the next round.');
  };

  return (
    <div className="min-h-screen w-full bg-[#07090e] text-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* Profile Modal */}
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Top Header */}
      <header className="border-b border-white/10 bg-[#0c1017]/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            title="Return to Grand Casino Floor"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Casino Floor</span>
          </Link>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-sm italic shadow-md">
            21
          </div>

          <div>
            <h1 className="text-sm sm:text-base font-black tracking-wide uppercase leading-none">
              Blackjack VIP Salon
            </h1>
            <span className="text-indigo-400 text-[10px] tracking-widest font-bold uppercase">
              Vegas Strip S17 &bull; 6-Deck Shoe &bull; 3:2 Payout
            </span>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Strategy Coach Toggle */}
          <button
            onClick={() => setShowCoach((v) => !v)}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition cursor-pointer',
              showCoach
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
            )}
            title="Toggle Basic Strategy Advisor Overlay"
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">Strategy Coach</span>
          </button>

          {/* Hi-Lo Counting HUD Toggle */}
          <button
            onClick={() => setShowCountingHud((v) => !v)}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition cursor-pointer',
              showCountingHud
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
            )}
            title="Toggle Hi-Lo Card Counting HUD"
          >
            <Flame size={13} />
            <span className="hidden sm:inline">Card Counter</span>
          </button>

          {/* Live Career Vault Pill */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-amber-500/30 px-3 py-1 rounded-full">
            <Coins size={14} className="text-amber-400" />
            <span className="font-mono font-bold text-xs text-emerald-300">
              ${bankroll.toLocaleString()}
            </span>
          </div>

          {/* Audio */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer"
            title={soundMuted ? 'Unmute' : 'Mute'}
          >
            {soundMuted ? <VolumeX size={15} className="text-rose-400" /> : <Volume2 size={15} className="text-emerald-400" />}
          </button>

          {/* Profile Trigger */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-1.5 p-1 rounded-full bg-zinc-900 border border-white/15 transition cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.nickname}
              className="w-5 h-5 rounded-full object-cover border border-amber-400"
            />
          </button>
        </div>
      </header>

      {/* Main Semicircular Table Stage */}
      <main className="flex-1 flex flex-col items-center justify-between p-3 sm:p-6 max-w-6xl w-full mx-auto relative">
        {/* Upper Semicircular Green Felt Table */}
        <div className="w-full relative aspect-[16/9] max-h-[70vh] rounded-[100px_100px_40px_40px] border-[10px] border-[#2d1b13] bg-[radial-gradient(ellipse_at_top,#0b4d26_0%,#063318_70%,#031c0c_100%)] shadow-[inset_0_0_60px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.9)] flex flex-col justify-between p-6 sm:p-8 overflow-hidden">
          {/* Subtle Felt Watermark Arc */}
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none">
            <span className="text-white font-serif font-black text-7xl sm:text-9xl tracking-tight italic">
              GD 21
            </span>
          </div>

          {/* Top Dealer Box & Rules Banner */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Casino House Rules Gold Arc */}
            <div className="text-center mb-3">
              <span className="text-[11px] sm:text-xs font-serif font-bold uppercase tracking-[0.25em] text-amber-300/80 drop-shadow">
                Blackjack Pays 3 to 2 &bull; Dealer Must Stand on All 17s &bull; Insurance Pays 2 to 1
              </span>
            </div>

            {/* Dealer Cards & Total Badge */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Dealer</span>
                {dealerCards.length > 0 && (
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-black font-mono border',
                      dealerEval.isBusted
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : dealerEval.isBlackjack
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-zinc-800 text-zinc-200 border-zinc-700'
                    )}
                  >
                    {dealerEval.isBlackjack ? 'Blackjack!' : dealerEval.isBusted ? `Bust (${dealerEval.total})` : dealerEval.total}
                  </span>
                )}
              </div>

              {/* Cards row */}
              <div className="flex items-center gap-2 min-h-[85px] sm:min-h-[105px]">
                {dealerCards.length === 0 ? (
                  <div className="w-14 h-20 rounded-md border border-white/10 bg-white/5 flex items-center justify-center text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                    Shoe
                  </div>
                ) : (
                  dealerCards.map((card, idx) => {
                    const isHidden = idx === 1 && dealerHoleHidden;
                    return (
                      <Card
                        key={card.id}
                        card={isHidden ? undefined : { rank: card.rank, suit: card.suit }}
                        hidden={isHidden}
                        size="md"
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Floating Strategy Coach & Card Counting HUDs */}
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-2 pointer-events-auto">
            {/* Card Counter Widget */}
            {showCountingHud && (
              <div className="bg-zinc-950/80 border border-amber-500/30 backdrop-blur-md rounded-2xl p-3 shadow-lg min-w-[170px]">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Flame size={12} />
                    <span>Hi-Lo Counter</span>
                  </span>
                  <span className="font-mono text-zinc-400">6 Decks</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-white/5 rounded-lg p-1.5">
                    <span className="text-[9px] text-zinc-400 uppercase block">Running</span>
                    <span
                      className={clsx(
                        'font-mono font-black text-sm',
                        shoe.runningCount > 0 ? 'text-emerald-400' : shoe.runningCount < 0 ? 'text-rose-400' : 'text-zinc-300'
                      )}
                    >
                      {shoe.runningCount > 0 ? `+${shoe.runningCount}` : shoe.runningCount}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-lg p-1.5">
                    <span className="text-[9px] text-zinc-400 uppercase block">True Count</span>
                    <span
                      className={clsx(
                        'font-mono font-black text-sm',
                        trueCount >= 2 ? 'text-emerald-300 font-extrabold' : 'text-zinc-200'
                      )}
                    >
                      {trueCount > 0 ? `+${trueCount}` : trueCount}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] text-zinc-500 block text-center mt-1.5 font-mono">
                  {shoe.cards.length} cards remaining
                </span>
              </div>
            )}

            {/* Basic Strategy Coach Banner */}
            {showCoach && strategyAdvice && (
              <div className="bg-emerald-950/80 border border-emerald-500/40 backdrop-blur-md rounded-2xl p-3 shadow-lg max-w-[200px] animate-pulse">
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-300 mb-1">
                  <Sparkles size={12} />
                  <span>Coach Advisor</span>
                </div>
                <p className="text-xs font-black text-white uppercase tracking-wide">
                  Recommend: <span className="text-emerald-300 underline">{strategyAdvice.toUpperCase()}</span>
                </p>
                <span className="text-[9px] text-zinc-300 leading-tight block mt-0.5">
                  Mathematically optimal vs Dealer {dealerCards[0]?.value}.
                </span>
              </div>
            )}
          </div>

          {/* Bottom 3 Player Spots (Spot 0: Left, Spot 1: Center, Spot 2: Right) */}
          <div className="relative z-10 grid grid-cols-3 gap-3 sm:gap-6 mt-4">
            {[0, 1, 2].map((spotIndex) => {
              const spotBet = spotBets[spotIndex];
              // Find hands dealt to this spot
              const spotHands = hands.filter((h) => h.spotIndex === spotIndex);
              const isSpotActive = hands[activeHandIndex]?.spotIndex === spotIndex && gamePhase === 'player_turn';

              return (
                <div
                  key={spotIndex}
                  onClick={() => handleSpotClick(spotIndex)}
                  className={clsx(
                    'relative rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-between transition-all min-h-[140px] sm:min-h-[170px]',
                    gamePhase === 'betting' && 'cursor-pointer hover:bg-white/5 border border-dashed border-white/20',
                    isSpotActive && 'ring-2 ring-amber-400 bg-amber-400/5 shadow-[0_0_25px_rgba(251,191,36,0.2)]'
                  )}
                >
                  {/* Spot Label */}
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Spot {spotIndex + 1}
                  </span>

                  {/* If betting phase: show betting circle & placed chips */}
                  {gamePhase === 'betting' ? (
                    <div className="flex flex-col items-center my-auto">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-400/60 bg-black/30 flex flex-col items-center justify-center shadow-inner">
                        {spotBet > 0 ? (
                          <div className="text-center">
                            <span className="font-mono font-black text-sm sm:text-base text-amber-300">
                              ${spotBet}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                            Bet
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Playing / Settled phase: show cards and evaluations for this spot
                    <div className="flex flex-col items-center gap-1 my-auto">
                      {spotHands.map((h) => {
                        const hEval = calculateHand(h.cards);
                        return (
                          <div key={h.id} className="flex flex-col items-center">
                            {/* Cards row */}
                            <div className="flex items-center -space-x-3 mb-1">
                              {h.cards.map((c) => (
                                <Card key={c.id} card={{ rank: c.rank, suit: c.suit }} size="sm" />
                              ))}
                            </div>

                            {/* Total and Result Badge */}
                            <div className="flex items-center gap-1">
                              <span
                                className={clsx(
                                  'px-2 py-0.5 rounded-full text-[11px] font-black font-mono border',
                                  h.status === 'busted'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : h.status === 'blackjack'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : h.result === 'win'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-zinc-800 text-zinc-200 border-zinc-700'
                                )}
                              >
                                {h.status === 'blackjack'
                                  ? 'Blackjack (3:2)!'
                                  : h.status === 'busted'
                                  ? `Bust (${hEval.total})`
                                  : hEval.isSoft
                                  ? `Soft ${hEval.total}`
                                  : hEval.total}
                              </span>

                              {/* Dollar Result */}
                              {h.result && (
                                <span
                                  className={clsx(
                                    'text-[10px] font-black font-mono',
                                    h.netProfit && h.netProfit > 0
                                      ? 'text-emerald-400'
                                      : h.netProfit === 0
                                      ? 'text-zinc-400'
                                      : 'text-rose-400'
                                  )}
                                >
                                  {h.netProfit && h.netProfit > 0 ? `+$${h.netProfit}` : h.netProfit === 0 ? 'Push' : `-$${Math.abs(h.netProfit || h.bet)}`}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Spot Bet Badge */}
                  <div className="text-[10px] font-mono font-bold text-zinc-300 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                    ${spotBet} Bet
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lower Control Bar: Chips & Action Buttons */}
        <div className="w-full mt-4 bg-[#0d1017]/90 border border-white/10 backdrop-blur-md rounded-3xl p-4 flex flex-col gap-3 shadow-xl">
          {/* Table Announcement Notice */}
          <div className="flex items-center justify-between text-xs px-2 text-zinc-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Info size={14} className="text-amber-400" />
              <span>{tableNotice}</span>
            </span>
            <span className="font-mono text-zinc-500 hidden sm:inline">
              Total Table Wager: <span className="text-white font-bold">${totalWager}</span>
            </span>
          </div>

          {/* Conditional Control Row */}
          {gamePhase === 'betting' ? (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
              {/* Chip Denomination Picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mr-1 hidden sm:inline">
                  Select Chip:
                </span>
                {CHIP_DENOMINATIONS.map((chip) => (
                  <button
                    key={chip.value}
                    onClick={() => {
                      setSelectedChip(chip.value);
                      sound.playChipSound();
                    }}
                    className={clsx(
                      'w-10 h-10 sm:w-11 sm:h-11 rounded-full font-black text-xs font-mono border-2 transition-all cursor-pointer flex items-center justify-center shadow-md',
                      chip.color,
                      selectedChip === chip.value ? 'scale-110 ring-4 ring-amber-400/80' : 'opacity-80 hover:opacity-100'
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Wagering Action Shortcuts & Deal Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearBets}
                  disabled={totalWager === 0}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-400 hover:text-white transition disabled:opacity-40 cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={handleDoubleBets}
                  disabled={totalWager === 0}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-400 hover:text-white transition disabled:opacity-40 cursor-pointer"
                >
                  2x Double
                </button>
                <button
                  onClick={handleRebet}
                  disabled={lastBets.every((b) => b === 0)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-400 hover:text-white transition disabled:opacity-40 cursor-pointer"
                >
                  Rebet
                </button>
                <button
                  onClick={handleDeal}
                  disabled={totalWager === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-xs uppercase tracking-wider transition shadow-lg disabled:opacity-40 cursor-pointer"
                >
                  Deal Cards
                </button>
              </div>
            </div>
          ) : gamePhase === 'player_turn' ? (
            /* Player Action Buttons during Live Hand */
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-2 border-t border-white/10">
              <button
                onClick={handleHit}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition shadow cursor-pointer"
              >
                Hit
              </button>
              <button
                onClick={handleStand}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition shadow cursor-pointer"
              >
                Stand
              </button>
              <button
                onClick={handleDoubleDown}
                disabled={!activeHand || activeHand.cards.length !== 2 || bankroll < activeHand.bet}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider transition shadow disabled:opacity-40 cursor-pointer"
              >
                Double Down
              </button>
              <button
                onClick={handleSplit}
                disabled={
                  !activeHand ||
                  activeHand.cards.length !== 2 ||
                  activeHand.cards[0].rank !== activeHand.cards[1].rank ||
                  bankroll < activeHand.bet
                }
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition shadow disabled:opacity-40 cursor-pointer"
              >
                Split
              </button>
              <button
                onClick={handleSurrender}
                disabled={!activeHand || activeHand.cards.length !== 2 || activeHand.isSplit}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider transition disabled:opacity-40 cursor-pointer"
              >
                Surrender
              </button>
            </div>
          ) : (
            /* Settled phase -> Deal Next Round */
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                onClick={handleNextRound}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider transition shadow-lg cursor-pointer"
              >
                Next Round
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
