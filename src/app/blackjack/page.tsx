'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePokerStore } from '@/lib/store';
import { AuthGateView } from '@/components/poker/AuthGateView';
import { UserProfileModal } from '@/components/poker/UserProfileModal';
import { Card } from '@/components/poker/Card';
import { ChipStack } from '@/components/poker/ChipStack';
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
  BLACKJACK_BOT_PRESETS,
  BlackjackBotPersona,
} from '@/lib/blackjack/blackjackEngine';
import {
  BlackjackDealerLog,
  BlackjackLogMessage,
  LogPosition,
} from '@/components/blackjack/BlackjackDealerLog';
import { BlackjackAICoach } from '@/components/blackjack/BlackjackAICoach';
import { DealerChipFloat } from '@/components/blackjack/DealerChipFloat';
import { DealingShoe } from '@/components/blackjack/DealingShoe';
import { DiscardRack } from '@/components/blackjack/DiscardRack';
import { BlackjackFeltRules } from '@/components/blackjack/BlackjackFeltRules';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Coins,
  Sparkles,
  Info,
  Flame,
  MessageSquare,
  UserPlus,
  X,
  Users,
} from 'lucide-react';
import { clsx } from 'clsx';

const CHIP_DENOMINATIONS = [
  { value: 1, label: '$1', color: 'bg-blue-600 border-blue-400 text-white' },
  { value: 5, label: '$5', color: 'bg-red-600 border-red-400 text-white' },
  { value: 25, label: '$25', color: 'bg-emerald-600 border-emerald-400 text-white' },
  { value: 100, label: '$100', color: 'bg-zinc-900 border-zinc-400 text-amber-300' },
  { value: 500, label: '$500', color: 'bg-purple-700 border-purple-400 text-white' },
];

export type SeatOccupant = 'hero' | 'bot' | 'empty';

export interface TableSeat {
  spotIndex: number; // 0 to 4 (Spots 1 to 5)
  occupant: SeatOccupant;
  bet: number;
  bot?: BlackjackBotPersona;
}

// 5 Arc Positions (X% and Y% coordinates along the table felt arc)
const SEAT_ARC_COORDS = [
  { left: '15%', top: '56%' }, // Spot 1 - Far Left
  { left: '32%', top: '65%' }, // Spot 2 - Mid Left
  { left: '50%', top: '69%' }, // Spot 3 - Center (Hero anchor)
  { left: '68%', top: '65%' }, // Spot 4 - Mid Right
  { left: '85%', top: '56%' }, // Spot 5 - Far Right
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

  // 5 Scalable Table Seats (Spot 0 to Spot 4)
  // Default: Center spot (Index 2) is Hero ($25), other spots are open/empty
  const [seats, setSeats] = useState<TableSeat[]>([
    { spotIndex: 0, occupant: 'empty', bet: 0 },
    { spotIndex: 1, occupant: 'empty', bet: 0 },
    { spotIndex: 2, occupant: 'hero', bet: 25 },
    { spotIndex: 3, occupant: 'empty', bet: 0 },
    { spotIndex: 4, occupant: 'empty', bet: 0 },
  ]);

  const [lastHeroBets, setLastHeroBets] = useState<number[]>([0, 0, 25, 0, 0]);
  const [selectedChip, setSelectedChip] = useState<number>(25);

  // Active Game State
  const [gamePhase, setGamePhase] = useState<'betting' | 'dealing' | 'player_turn' | 'dealer_turn' | 'settled'>('betting');
  const [dealerCards, setDealerCards] = useState<BlackjackCard[]>([]);
  const [dealerHoleHidden, setDealerHoleHidden] = useState<boolean>(true);

  // Visual Shoe / Mucking Animation States
  const [isDealingAnimation, setIsDealingAnimation] = useState<boolean>(false);
  const [isMuckingAnimation, setIsMuckingAnimation] = useState<boolean>(false);
  const [dealSpeed, setDealSpeed] = useState<'relaxed' | 'normal'>('relaxed');

  // Side Settlement Score Breakdown Details
  const [settlementDetails, setSettlementDetails] = useState<{
    id: string;
    spotIndex: number;
    isHero: boolean;
    name: string;
    playerTotal: number;
    dealerTotal: number;
    result: 'win' | 'loss' | 'push' | 'blackjack';
    bet: number;
    netProfit: number;
    summaryText: string;
  }[]>([]);

  // Hands currently in play
  const [hands, setHands] = useState<BlackjackHandState[]>([]);
  const [activeHandIndex, setActiveHandIndex] = useState<number>(0);

  // Docking Positions for AI Coach & Dealer Log
  const [coachPosition, setCoachPosition] = useState<LogPosition>('left');
  const [dealerLogPosition, setDealerLogPosition] = useState<LogPosition>('right');

  // Live Dealer Speech & Action Log
  const [logs, setLogs] = useState<BlackjackLogMessage[]>([
    {
      id: 'init-1',
      timestamp: '00:00:00',
      type: 'system',
      text: "Welcome to Gambler's Den VIP 5-Seat Blackjack Salon. 6-Deck Shoe active (S17, 3:2 Natural, Dealer stands on Soft 17).",
    },
  ]);

  const addLog = useCallback((type: BlackjackLogMessage['type'], text: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp,
        type,
        text,
      },
    ]);
  }, []);

  // HUD & Coaching Toggles
  const [showCountingHud, setShowCountingHud] = useState<boolean>(true);
  const [tableNotice, setTableNotice] = useState<string>('Place your bets or seat AI tablemates, then click Deal Cards.');

  // Total wager placed by Hero across all seats
  const totalHeroWager = useMemo(() => {
    return seats.filter((s) => s.occupant === 'hero').reduce((sum, s) => sum + s.bet, 0);
  }, [seats]);

  // Total active spots with bets >= $5
  const activeSeatsCount = useMemo(() => {
    return seats.filter((s) => s.occupant !== 'empty' && s.bet >= 5).length;
  }, [seats]);

  // Active Hand & Dealer Evaluations
  const dealerEval = useMemo(() => {
    return calculateHand(dealerHoleHidden && dealerCards.length >= 1 ? [dealerCards[0]] : dealerCards);
  }, [dealerCards, dealerHoleHidden]);

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

  // Docking screen reorganization logic
  const isStacked = coachPosition === dealerLogPosition && coachPosition !== 'hidden' && coachPosition !== 'bottom';
  const hasLeftDock = coachPosition === 'left' || dealerLogPosition === 'left';
  const hasRightDock = coachPosition === 'right' || dealerLogPosition === 'right';

  // ============================================================================
  // SEATING MANAGEMENT & PRESETS
  // ============================================================================
  const handleSpotClick = (spotIndex: number) => {
    if (gamePhase !== 'betting') return;
    const seat = seats[spotIndex];

    // If spot is empty, seat Hero with selected chip
    if (seat.occupant === 'empty') {
      if (bankroll < selectedChip) {
        setTableNotice('Insufficient career vault bankroll to place this chip.');
        return;
      }
      sound.playChipSound();
      setSeats((prev) => {
        const next = [...prev];
        next[spotIndex] = { ...seat, occupant: 'hero', bet: selectedChip };
        return next;
      });
      setTableNotice(`Spot ${spotIndex + 1} bet: $${selectedChip}`);
      return;
    }

    // If spot belongs to Hero, add more chips
    if (seat.occupant === 'hero') {
      if (bankroll < totalHeroWager + selectedChip) {
        setTableNotice('Insufficient career vault bankroll to increase this bet.');
        return;
      }
      const newBet = seat.bet + selectedChip;
      if (newBet > 1000) {
        setTableNotice('Maximum table limit is $1,000 per spot.');
        return;
      }
      sound.playChipSound();
      setSeats((prev) => {
        const next = [...prev];
        next[spotIndex] = { ...seat, bet: newBet };
        return next;
      });
      setTableNotice(`Spot ${spotIndex + 1} bet: $${newBet}`);
    }
  };

  const handleSeatBot = (spotIndex: number) => {
    if (gamePhase !== 'betting') return;
    const preset = BLACKJACK_BOT_PRESETS[spotIndex] ?? {
      id: `bot-${spotIndex}`,
      name: `VIP Player ${spotIndex + 1}`,
      nickname: 'Casino Regular',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      defaultBet: 25,
      bankroll: 2000,
    };

    sound.playChipSound();
    setSeats((prev) => {
      const next = [...prev];
      next[spotIndex] = {
        spotIndex,
        occupant: 'bot',
        bet: preset.defaultBet,
        bot: { ...preset },
      };
      return next;
    });
    addLog('system', `${preset.name} sits down at Spot ${spotIndex + 1} with $${preset.bankroll.toLocaleString()} bankroll.`);
    setTableNotice(`${preset.name} seated at Spot ${spotIndex + 1}.`);
  };

  const handleUnseat = (spotIndex: number) => {
    if (gamePhase !== 'betting') return;
    const seat = seats[spotIndex];
    if (seat.occupant === 'bot' && seat.bot) {
      addLog('system', `${seat.bot.name} stands up from Spot ${spotIndex + 1}.`);
    }
    sound.playChipSound();
    setSeats((prev) => {
      const next = [...prev];
      next[spotIndex] = { spotIndex, occupant: 'empty', bet: 0 };
      return next;
    });
  };

  // Table Configuration Presets
  const applyPreset = (preset: 'solo_1' | 'solo_3' | 'mixed_bots' | 'solo_5') => {
    if (gamePhase !== 'betting') return;
    sound.playChipSound();

    if (preset === 'solo_1') {
      setSeats([
        { spotIndex: 0, occupant: 'empty', bet: 0 },
        { spotIndex: 1, occupant: 'empty', bet: 0 },
        { spotIndex: 2, occupant: 'hero', bet: 25 },
        { spotIndex: 3, occupant: 'empty', bet: 0 },
        { spotIndex: 4, occupant: 'empty', bet: 0 },
      ]);
      setTableNotice('Table configured for Solo 1-Hand play.');
    } else if (preset === 'solo_3') {
      setSeats([
        { spotIndex: 0, occupant: 'empty', bet: 0 },
        { spotIndex: 1, occupant: 'hero', bet: 25 },
        { spotIndex: 2, occupant: 'hero', bet: 25 },
        { spotIndex: 3, occupant: 'hero', bet: 25 },
        { spotIndex: 4, occupant: 'empty', bet: 0 },
      ]);
      setTableNotice('Table configured for Solo 3-Hands multi-play.');
    } else if (preset === 'mixed_bots') {
      setSeats([
        { spotIndex: 0, occupant: 'bot', bet: 25, bot: { ...BLACKJACK_BOT_PRESETS[0] } },
        { spotIndex: 1, occupant: 'bot', bet: 50, bot: { ...BLACKJACK_BOT_PRESETS[1] } },
        { spotIndex: 2, occupant: 'hero', bet: 25 },
        { spotIndex: 3, occupant: 'bot', bet: 100, bot: { ...BLACKJACK_BOT_PRESETS[3] } },
        { spotIndex: 4, occupant: 'bot', bet: 50, bot: { ...BLACKJACK_BOT_PRESETS[4] } },
      ]);
      setTableNotice('Full VIP Table seated: You + 4 AI Tablemates!');
    } else if (preset === 'solo_5') {
      setSeats([
        { spotIndex: 0, occupant: 'hero', bet: 25 },
        { spotIndex: 1, occupant: 'hero', bet: 25 },
        { spotIndex: 2, occupant: 'hero', bet: 25 },
        { spotIndex: 3, occupant: 'hero', bet: 25 },
        { spotIndex: 4, occupant: 'hero', bet: 25 },
      ]);
      setTableNotice('High Roller Solo: You control all 5 spots!');
    }
  };

  const handleClearBets = () => {
    if (gamePhase !== 'betting') return;
    setSeats((prev) =>
      prev.map((s) => (s.occupant === 'hero' ? { ...s, bet: 0, occupant: s.spotIndex === 2 ? 'hero' : 'empty' } : s))
    );
    sound.playChipSound();
    setTableNotice('All your bets cleared.');
  };

  const handleDoubleBets = () => {
    if (gamePhase !== 'betting') return;
    const needed = totalHeroWager * 2;
    if (needed > bankroll) {
      setTableNotice('Insufficient bankroll to double your bets.');
      return;
    }
    setSeats((prev) =>
      prev.map((s) => (s.occupant === 'hero' ? { ...s, bet: s.bet * 2 } : s))
    );
    sound.playChipSound();
  };

  const handleRebet = () => {
    if (gamePhase !== 'betting') return;
    const needed = lastHeroBets.reduce((a, b) => a + b, 0);
    if (needed > bankroll) {
      setTableNotice('Insufficient bankroll to repeat previous bets.');
      return;
    }
    setSeats((prev) =>
      prev.map((s, idx) => {
        if (lastHeroBets[idx] > 0) {
          return { ...s, occupant: 'hero', bet: lastHeroBets[idx] };
        }
        return s;
      })
    );
    sound.playChipSound();
  };

  // ============================================================================
  // DEALER TURN & SETTLEMENT
  // ============================================================================
  const triggerDealerTurn = useCallback(
    (
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

      const allEnded = currentHands.every((h) => h.status === 'busted' || h.isSurrendered);
      const dealerHoleEval = calculateHand([currentDealerCards[0], currentDealerCards[1]]);
      addLog('dealer', `Dealer reveals hole card [${currentDealerCards[1].rank}${currentDealerCards[1].suit}] (Dealer Total: ${dealerHoleEval.total})`);

      let finalDealerCards = [...currentDealerCards];

      if (!allEnded) {
        const dealerRes = playDealerTurn(currentDealerCards, updatedShoe);
        finalDealerCards = dealerRes.finalCards;
        const finalEval = calculateHand(finalDealerCards);
        if (finalDealerCards.length > 2) {
          for (let i = 2; i < finalDealerCards.length; i++) {
            const card = finalDealerCards[i];
            addLog('dealer', `Dealer hits -> receives [${card.rank}${card.suit}]`);
          }
        }
        if (finalEval.isBusted) {
          addLog('alert', `Dealer BUSTS with ${finalEval.total}!`);
        } else {
          addLog('dealer', `Dealer stands on ${finalEval.total}.`);
        }
      } else {
        addLog('dealer', 'All player hands busted or surrendered; dealer stands.');
      }

      setDealerCards(finalDealerCards);
      setShoe(updatedShoe);

      const finalDealerEval = calculateHand(finalDealerCards);
      const dTotal = finalDealerEval.total;

      // Settle each hand
      let totalHeroPayout = 0;
      let netHeroProfit = 0;

      const settledHands = currentHands.map((h) => {
        const outcome = settleHand(h, finalDealerCards);
        if (!h.isBot) {
          totalHeroPayout += outcome.payout;
          netHeroProfit += outcome.netProfit;
        }
        return {
          ...h,
          status: 'settled' as const,
          result: outcome.result,
          payout: outcome.payout,
          netProfit: outcome.netProfit,
        };
      });

      // Update Bot Bankrolls for bot winners
      setSeats((prev) =>
        prev.map((s) => {
          if (s.occupant === 'bot' && s.bot) {
            const botHand = settledHands.find((h) => h.spotIndex === s.spotIndex);
            if (botHand && botHand.payout) {
              return {
                ...s,
                bot: { ...s.bot, bankroll: s.bot.bankroll + botHand.payout },
              };
            }
          }
          return s;
        })
      );

      // Construct detailed side settlement comparisons
      const details = settledHands.map((h) => {
        const pEval = calculateHand(h.cards);
        const isHero = !h.isBot;
        const name = isHero ? 'You' : (h.botName ?? 'Bot');
        let summary = '';
        if (pEval.isBusted) {
          summary = `${name}: Busted with ${pEval.total}, ${isHero ? 'you lost' : 'lost'} (-$${h.bet})`;
        } else if (h.result === 'blackjack') {
          summary = `${name}: Natural 21 pays 3:2! ${isHero ? 'You won' : 'Won'} +$${h.netProfit}!`;
        } else if (h.result === 'win') {
          summary = finalDealerEval.isBusted
            ? `${name}: ${pEval.total} against Busted Dealer — ${isHero ? 'You won' : 'Won'} +$${h.netProfit}!`
            : `${name}: ${pEval.total} against Dealer ${dTotal} — ${isHero ? 'You won' : 'Won'} +$${h.netProfit}!`;
        } else if (h.result === 'push') {
          summary = `${name}: ${pEval.total} against Dealer ${dTotal} — Push (Bet returned)`;
        } else {
          summary = `${name}: ${pEval.total} against Dealer ${dTotal} — ${isHero ? 'You lost' : 'Lost'} (-$${h.bet})`;
        }
        return {
          id: h.id,
          spotIndex: h.spotIndex,
          isHero,
          name,
          playerTotal: pEval.total,
          dealerTotal: dTotal,
          result: h.result ?? 'loss',
          bet: h.bet,
          netProfit: h.netProfit ?? 0,
          summaryText: summary,
        };
      });

      setSettlementDetails(details);

      settledHands.forEach((h) => {
        const ownerLabel = h.isBot ? `${h.botName} (Spot ${h.spotIndex + 1})` : `You (Spot ${h.spotIndex + 1})`;
        const resultText =
          h.result === 'win' || h.result === 'blackjack'
            ? `WINS +$${h.netProfit}`
            : h.result === 'push'
            ? 'PUSHES'
            : `LOSES -$${h.bet}`;
        addLog('settlement', `${ownerLabel} ${resultText} (Hand Total: ${calculateHand(h.cards).total})`);
      });

      setHands(settledHands);
      setGamePhase('settled');

      // Credit Hero payouts to vault
      if (totalHeroPayout > 0) {
        updateVaultBankroll(bankroll + totalHeroPayout);
      }

      const heroDetail = details.find((d) => d.isHero);
      if (heroDetail) {
        setTableNotice(heroDetail.summaryText);
      } else if (netHeroProfit > 0) {
        sound.playWinPot();
        setTableNotice(`Winner! +$${netHeroProfit} profit credited to your career vault.`);
      } else if (netHeroProfit === 0) {
        setTableNotice('Push — equal bets returned to your vault.');
      } else {
        setTableNotice(`Round settled. Net -$${Math.abs(netHeroProfit)}.`);
      }
    },
    [addLog, updateVaultBankroll, bankroll]
  );

  // Helper to advance across hands clockwise
  const advanceToNextHand = useCallback(
    (
      startIndex: number,
      currentHands: BlackjackHandState[],
      currentShoe: ShoeState,
      currentDealerCards: BlackjackCard[]
    ) => {
      let targetIdx = startIndex + 1;
      while (targetIdx < currentHands.length && currentHands[targetIdx].status === 'blackjack') {
        targetIdx += 1;
      }
      if (targetIdx < currentHands.length) {
        setActiveHandIndex(targetIdx);
      } else {
        // All player hands finished! Begin dealer turn
        triggerDealerTurn(currentHands, currentShoe, currentDealerCards);
      }
    },
    [triggerDealerTurn]
  );

  // ============================================================================
  // DEAL HANDS (Clockwise Step-by-Step Dealing from Shoe)
  // ============================================================================
  const handleDeal = async () => {
    if (gamePhase !== 'betting') return;
    if (activeSeatsCount === 0) {
      setTableNotice('Please place at least one bet ($5 minimum).');
      return;
    }
    if (totalHeroWager > bankroll) {
      setTableNotice('Total wagers exceed your career vault bankroll.');
      return;
    }

    // Deduct Hero's wagers from persistent bankroll
    updateVaultBankroll(bankroll - totalHeroWager);
    setLastHeroBets(seats.map((s) => (s.occupant === 'hero' ? s.bet : 0)));

    // Deduct Bot wagers from bot bankrolls
    setSeats((prev) =>
      prev.map((s) => {
        if (s.occupant === 'bot' && s.bot) {
          return {
            ...s,
            bot: { ...s.bot, bankroll: Math.max(0, s.bot.bankroll - s.bet) },
          };
        }
        return s;
      })
    );

    // Check if shoe needs reshuffling (cut card reached)
    let currentShoe = { ...shoe, cards: [...shoe.cards] };
    if (currentShoe.cards.length <= currentShoe.cutCardIndex || currentShoe.cards.length < 20) {
      currentShoe = createShoe(6);
      setTableNotice('Reshuffling 6-Deck Shoe...');
      addLog('system', 'Cut card reached. Dealer reshuffles 6-deck shoe.');
    }

    // Enter dealing phase
    setGamePhase('dealing');
    setSettlementDetails([]);
    setTableNotice('Dealing cards clockwise from shoe...');

    // Prepare hands for active spots (clockwise 0 to 4)
    const activeSpots = seats
      .filter((s) => s.occupant !== 'empty' && s.bet >= 5)
      .sort((a, b) => a.spotIndex - b.spotIndex);

    const initialHands: BlackjackHandState[] = activeSpots.map((s, idx) => ({
      id: `hand-${s.spotIndex}-${idx}`,
      spotIndex: s.spotIndex,
      cards: [],
      bet: s.bet,
      isDoubled: false,
      isSplit: false,
      isSurrendered: false,
      isBot: s.occupant === 'bot',
      botName: s.bot?.name,
      botAvatar: s.bot?.avatarUrl,
      status: 'playing',
    }));

    setHands(initialHands);
    setDealerCards([]);
    setDealerHoleHidden(true);

    const dealDelay = dealSpeed === 'relaxed' ? 280 : 150;
    const workingHands: BlackjackHandState[] = initialHands.map((h) => ({
      ...h,
      cards: [...h.cards],
    }));
    const workingDealerCards: BlackjackCard[] = [];

    // Pass 1: Deal 1st card to players clockwise
    for (let i = 0; i < workingHands.length; i++) {
      setIsDealingAnimation(true);
      const c = currentShoe.cards.pop()!;
      workingHands[i].cards.push(c);
      currentShoe.runningCount += getHiLoValue(c);
      currentShoe.dealtCount += 1;
      setHands(workingHands.map((h) => ({ ...h, cards: [...h.cards] })));
      setShoe({ ...currentShoe, cards: [...currentShoe.cards] });
      sound.playCardDeal();
      await new Promise((r) => setTimeout(r, dealDelay));
      setIsDealingAnimation(false);
    }

    // Deal 1st card to dealer (Upcard)
    setIsDealingAnimation(true);
    const dealerUpcard = currentShoe.cards.pop()!;
    workingDealerCards.push(dealerUpcard);
    currentShoe.runningCount += getHiLoValue(dealerUpcard);
    currentShoe.dealtCount += 1;
    setDealerCards([...workingDealerCards]);
    setShoe({ ...currentShoe, cards: [...currentShoe.cards] });
    sound.playCardDeal();
    await new Promise((r) => setTimeout(r, dealDelay));
    setIsDealingAnimation(false);

    // Pass 2: Deal 2nd card to players clockwise
    for (let i = 0; i < workingHands.length; i++) {
      setIsDealingAnimation(true);
      const c = currentShoe.cards.pop()!;
      workingHands[i].cards.push(c);
      currentShoe.runningCount += getHiLoValue(c);
      currentShoe.dealtCount += 1;
      setHands(workingHands.map((h) => ({ ...h, cards: [...h.cards] })));
      setShoe({ ...currentShoe, cards: [...currentShoe.cards] });
      sound.playCardDeal();
      await new Promise((r) => setTimeout(r, dealDelay));
      setIsDealingAnimation(false);
    }

    // Deal 2nd card to dealer (Hole card, hidden)
    setIsDealingAnimation(true);
    const dealerHoleCard = currentShoe.cards.pop()!;
    workingDealerCards.push(dealerHoleCard);
    currentShoe.dealtCount += 1;
    setDealerCards([...workingDealerCards]);
    setShoe({ ...currentShoe, cards: [...currentShoe.cards] });
    sound.playCardDeal();
    await new Promise((r) => setTimeout(r, dealDelay));
    setIsDealingAnimation(false);

    // Check Natural Blackjacks on player hands
    for (const h of workingHands) {
      const evalResult = calculateHand(h.cards);
      const ownerLabel = h.isBot ? `${h.botName} (Spot ${h.spotIndex + 1})` : `You (Spot ${h.spotIndex + 1})`;
      addLog('deal', `Dealt to ${ownerLabel}: [${h.cards[0].rank}${h.cards[0].suit}, ${h.cards[1].rank}${h.cards[1].suit}] (${evalResult.total})`);
      if (evalResult.isBlackjack) {
        h.status = 'blackjack';
        addLog('alert', `Natural Blackjack for ${ownerLabel} (Pays 3:2)!`);
      }
    }
    addLog('dealer', `Dealer shows upcard: [${dealerUpcard.rank}${dealerUpcard.suit}] (${dealerUpcard.value})`);

    setHands(workingHands);
    setGamePhase('player_turn');
    setActiveHandIndex(0);

    // If first hand is already blackjack, advance automatically
    if (workingHands[0]?.status === 'blackjack') {
      advanceToNextHand(0, workingHands, currentShoe, workingDealerCards);
    }
  };

  // ============================================================================
  // BOT AUTO-PLAY ENGINE (Authentic Basic Strategy with 500-750ms pacing)
  // ============================================================================
  useEffect(() => {
    if (gamePhase !== 'player_turn') return;
    if (!activeHand || !activeHand.isBot || activeHand.status !== 'playing') return;

    const timer = setTimeout(() => {
      // Determine optimal Basic Strategy action for this bot
      const canDouble = activeHand.cards.length === 2;
      const canSplit =
        activeHand.cards.length === 2 &&
        activeHand.cards[0].rank === activeHand.cards[1].rank;
      const action = getBasicStrategyAction(activeHand.cards, dealerCards[0], canDouble, canSplit, false);

      const botName = activeHand.botName ?? `Bot at Spot ${activeHand.spotIndex + 1}`;
      const currentShoe = { ...shoe, cards: [...shoe.cards] };

      if (action === 'hit') {
        const nextCard = currentShoe.cards.pop()!;
        currentShoe.runningCount += getHiLoValue(nextCard);
        currentShoe.dealtCount += 1;
        setShoe(currentShoe);
        sound.playCardDeal();

        const updatedHands = [...hands];
        const newHand = { ...activeHand, cards: [...activeHand.cards, nextCard] };
        const evaluation = calculateHand(newHand.cards);

        addLog('action', `${botName} Hits -> [${nextCard.rank}${nextCard.suit}] (Total: ${evaluation.total})`);

        if (evaluation.isBusted) {
          newHand.status = 'busted';
          addLog('alert', `${botName} BUSTS with ${evaluation.total}!`);
          updatedHands[activeHandIndex] = newHand;
          setHands(updatedHands);
          advanceToNextHand(activeHandIndex, updatedHands, currentShoe, dealerCards);
        } else if (evaluation.is21) {
          newHand.status = 'stood';
          updatedHands[activeHandIndex] = newHand;
          setHands(updatedHands);
          advanceToNextHand(activeHandIndex, updatedHands, currentShoe, dealerCards);
        } else {
          updatedHands[activeHandIndex] = newHand;
          setHands(updatedHands);
          // Bot will trigger another hit/stand cycle via useEffect!
        }
      } else if (action === 'double') {
        const nextCard = currentShoe.cards.pop()!;
        currentShoe.runningCount += getHiLoValue(nextCard);
        currentShoe.dealtCount += 1;
        setShoe(currentShoe);
        sound.playCardDeal();

        const updatedHands = [...hands];
        const newHand = {
          ...activeHand,
          bet: activeHand.bet * 2,
          isDoubled: true,
          cards: [...activeHand.cards, nextCard],
        };
        const evaluation = calculateHand(newHand.cards);
        newHand.status = evaluation.isBusted ? 'busted' : 'stood';

        addLog('action', `${botName} Doubles Down -> [${nextCard.rank}${nextCard.suit}] (Total: ${evaluation.total})`);
        if (evaluation.isBusted) {
          addLog('alert', `${botName} BUSTS on Double Down!`);
        }

        updatedHands[activeHandIndex] = newHand;
        setHands(updatedHands);
        advanceToNextHand(activeHandIndex, updatedHands, currentShoe, dealerCards);
      } else {
        // Stand
        sound.playCheckKnock();
        const evalRes = calculateHand(activeHand.cards);
        addLog('action', `${botName} Stands on total ${evalRes.total}.`);

        const updatedHands = [...hands];
        updatedHands[activeHandIndex] = { ...activeHand, status: 'stood' };
        setHands(updatedHands);
        advanceToNextHand(activeHandIndex, updatedHands, shoe, dealerCards);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [gamePhase, activeHand, activeHandIndex, dealerCards, hands, shoe, addLog, advanceToNextHand]);

  // ============================================================================
  // HERO PLAYER ACTIONS
  // ============================================================================
  const handleHit = () => {
    if (gamePhase !== 'player_turn' || !activeHand || activeHand.isBot) return;

    const currentShoe = { ...shoe, cards: [...shoe.cards] };
    const nextCard = currentShoe.cards.pop()!;
    currentShoe.runningCount += getHiLoValue(nextCard);
    currentShoe.dealtCount += 1;
    setShoe(currentShoe);

    sound.playCardDeal();

    const updatedHands = [...hands];
    const hand = { ...activeHand, cards: [...activeHand.cards, nextCard] };
    const evaluation = calculateHand(hand.cards);

    addLog('action', `You (Spot ${activeHand.spotIndex + 1}) Hit -> [${nextCard.rank}${nextCard.suit}] (Total: ${evaluation.total})`);

    if (evaluation.isBusted) {
      hand.status = 'busted';
      sound.playBetByDensity(25, 100);
      addLog('alert', `You BUST with ${evaluation.total} at Spot ${activeHand.spotIndex + 1}!`);
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
    if (gamePhase !== 'player_turn' || !activeHand || activeHand.isBot) return;

    sound.playCheckKnock();
    const evaluation = calculateHand(activeHand.cards);
    addLog('action', `You (Spot ${activeHand.spotIndex + 1}) Stand on total ${evaluation.total}.`);

    const updatedHands = [...hands];
    updatedHands[activeHandIndex] = { ...activeHand, status: 'stood' };
    setHands(updatedHands);

    advanceToNextHand(activeHandIndex, updatedHands, shoe, dealerCards);
  };

  const handleDoubleDown = () => {
    if (gamePhase !== 'player_turn' || !activeHand || activeHand.isBot) return;
    if (bankroll < activeHand.bet) {
      setTableNotice('Insufficient career vault balance to double down.');
      return;
    }

    updateVaultBankroll(bankroll - activeHand.bet);
    sound.playChipSound();

    const currentShoe = { ...shoe, cards: [...shoe.cards] };
    const card = currentShoe.cards.pop()!;
    currentShoe.runningCount += getHiLoValue(card);
    currentShoe.dealtCount += 1;
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

    addLog('action', `You (Spot ${activeHand.spotIndex + 1}) Double Down -> [${card.rank}${card.suit}] (Total: ${evaluation.total}).`);
    if (evaluation.isBusted) {
      addLog('alert', `You BUST on Double Down at Spot ${activeHand.spotIndex + 1}!`);
    }

    updatedHands[activeHandIndex] = hand;
    setHands(updatedHands);

    advanceToNextHand(activeHandIndex, updatedHands, currentShoe, dealerCards);
  };

  const handleSplit = () => {
    if (gamePhase !== 'player_turn' || !activeHand || activeHand.isBot) return;
    if (activeHand.cards.length !== 2 || activeHand.cards[0].rank !== activeHand.cards[1].rank) return;
    if (bankroll < activeHand.bet) {
      setTableNotice('Insufficient career vault balance to split.');
      return;
    }

    updateVaultBankroll(bankroll - activeHand.bet);
    sound.playChipSound();

    const currentShoe = { ...shoe, cards: [...shoe.cards] };
    const card1 = currentShoe.cards.pop()!;
    const card2 = currentShoe.cards.pop()!;
    currentShoe.runningCount += getHiLoValue(card1) + getHiLoValue(card2);
    currentShoe.dealtCount += 2;
    setShoe(currentShoe);

    sound.playCardDeal();

    addLog('action', `You Split pair of ${activeHand.cards[0].rank}s into two hands at Spot ${activeHand.spotIndex + 1}.`);

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
    if (gamePhase !== 'player_turn' || !activeHand || activeHand.isBot) return;
    if (activeHand.cards.length !== 2 || activeHand.isSplit) return;

    sound.playCardSnap();
    addLog('action', `You Surrender hand at Spot ${activeHand.spotIndex + 1} ($${activeHand.bet / 2} returned).`);

    const updatedHands = [...hands];
    updatedHands[activeHandIndex] = { ...activeHand, isSurrendered: true, status: 'settled' };
    setHands(updatedHands);

    advanceToNextHand(activeHandIndex, updatedHands, shoe, dealerCards);
  };

  // 1-Click Strategy Coach Action Handler
  const handleApplyAdvice = (action: BasicStrategyAction) => {
    if (action === 'hit') handleHit();
    else if (action === 'stand') handleStand();
    else if (action === 'double') handleDoubleDown();
    else if (action === 'split') handleSplit();
    else if (action === 'surrender') handleSurrender();
  };

  const handleNextRound = () => {
    setIsMuckingAnimation(true);
    sound.playCardSnap();

    setTimeout(() => {
      setIsMuckingAnimation(false);
      setGamePhase('betting');
      setHands([]);
      setDealerCards([]);
      setSettlementDetails([]);
      setDealerHoleHidden(true);
      setActiveHandIndex(0);
      setTableNotice('Place your bets or seat AI tablemates, then click Deal Cards.');
    }, 500);
  };

  // Global Auth Guard (after all hooks)
  if (!userProfile || userProfile.isGuest || userProfile.emailVerified === false) {
    return <AuthGateView />;
  }

  return (
    <div
      className={clsx(
        'min-h-screen w-full bg-[#05080c] text-white flex flex-col font-sans select-none overflow-x-hidden transition-all duration-300',
        hasLeftDock && 'lg:pl-80 sm:lg:pl-88',
        hasRightDock && 'lg:pr-80 sm:lg:pr-88'
      )}
    >
      {/* Profile Modal */}
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Top Header */}
      <header className="border-b border-white/10 bg-[#0a0e14]/90 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            title="Return to Casino Floor"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Casino Floor</span>
          </Link>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-black text-sm italic shadow-md">
            21
          </div>

          <div>
            <h1 className="text-xs sm:text-base font-black tracking-wide uppercase leading-none">
              VIP 5-Seat Blackjack Salon
            </h1>
            <span className="text-amber-400/90 text-[9px] sm:text-[10px] tracking-widest font-bold uppercase">
              Vegas Strip S17 &bull; 6-Deck Shoe &bull; 3:2 Payout
            </span>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* AI Strategy Coach Dock Toggle */}
          <button
            onClick={() => setCoachPosition((pos) => (pos === 'hidden' ? 'left' : 'hidden'))}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition cursor-pointer',
              coachPosition !== 'hidden'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-amber-500/20 shadow-sm'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
            )}
            title="Toggle AI Basic Strategy Coach"
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">AI Coach</span>
          </button>

          {/* Dealer Speech Log Dock Toggle */}
          <button
            onClick={() => setDealerLogPosition((pos) => (pos === 'hidden' ? 'right' : 'hidden'))}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition cursor-pointer',
              dealerLogPosition !== 'hidden'
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-indigo-500/20 shadow-sm'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
            )}
            title="Toggle Live Dealer Log"
          >
            <MessageSquare size={13} />
            <span className="hidden sm:inline">Dealer Log</span>
            <span className="text-[9px] bg-zinc-800 px-1 py-0.2 rounded font-mono">
              {logs.length}
            </span>
          </button>

          {/* Hi-Lo Counting HUD Toggle */}
          <button
            onClick={() => setShowCountingHud((v) => !v)}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition cursor-pointer',
              showCountingHud
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
            )}
            title="Toggle Hi-Lo Card Counting Telemetry"
          >
            <Flame size={13} />
            <span className="hidden sm:inline">Counter HUD</span>
          </button>

          {/* Deal Pacing Toggle */}
          <button
            onClick={() => setDealSpeed((s) => (s === 'relaxed' ? 'normal' : 'relaxed'))}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition cursor-pointer',
              dealSpeed === 'relaxed'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
            )}
            title="Toggle Deal Pacing (Relaxed vs Normal)"
          >
            <span>⏱️</span>
            <span className="hidden sm:inline">Speed:</span>
            <span className="capitalize">{dealSpeed}</span>
          </button>

          {/* Live Career Vault Pill */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-amber-500/30 px-2.5 sm:px-3 py-1 rounded-full">
            <Coins size={13} className="text-amber-400" />
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
            {soundMuted ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} className="text-emerald-400" />}
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

      {/* Main VIP Blackjack Table Stage */}
      <main className="flex-1 flex flex-col items-center justify-between p-2 sm:p-4 md:p-6 max-w-6xl w-full mx-auto relative">
        {/* Table Felt Container (Aspect ratio modeled after authentic VIP tables) */}
        <div className="w-full relative aspect-[16/10] sm:aspect-[16/9] max-h-[72vh] rounded-[120px_120px_60px_60px] border-[12px] sm:border-[16px] border-[#1e130c] bg-[radial-gradient(ellipse_at_50%_15%,#0d542b_0%,#073a1c_55%,#021f0e_100%)] shadow-[inset_0_0_80px_rgba(0,0,0,0.9),0_25px_60px_rgba(0,0,0,0.95)] flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
          {/* Subtle Outer Leather Bumper Highlight */}
          <div className="absolute inset-0 rounded-[105px_105px_45px_45px] border-2 border-[#3d2719]/40 pointer-events-none" />

          {/* Top Dealer Stage Fixtures (Discard Rack, Metallic Float, Dealing Shoe) */}
          <div className="relative z-10 w-full flex items-start justify-between px-2 sm:px-6">
            {/* Top-Left: Clear Acrylic Discard Rack */}
            <div className="w-20 sm:w-28 flex justify-start">
              <DiscardRack
                discardCount={shoe.dealtCount}
                isMucking={isMuckingAnimation}
              />
            </div>

            {/* Top-Center: Metallic Dealer Chip Float & Dealer Cards */}
            <div className="flex-1 flex flex-col items-center max-w-md mx-2">
              <DealerChipFloat className="mb-2" />

              {/* Dealer Cards & Label */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Dealer
                  </span>
                  {dealerCards.length > 0 && (
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black font-mono border',
                        dealerEval.isBusted
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : dealerEval.isBlackjack
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-zinc-900/90 text-zinc-200 border-zinc-700'
                      )}
                    >
                      {dealerEval.isBlackjack
                        ? 'Blackjack (3:2)!'
                        : dealerEval.isBusted
                        ? `Bust (${dealerEval.total})`
                        : dealerEval.isSoft
                        ? `Soft ${dealerEval.total}`
                        : dealerEval.total}
                    </span>
                  )}
                </div>

                {/* Cards row */}
                <div className="flex items-center gap-2 min-h-[75px] sm:min-h-[95px]">
                  {dealerCards.length === 0 ? (
                    <div className="w-12 sm:w-14 h-18 sm:h-20 rounded-md border border-white/10 bg-black/20 flex items-center justify-center text-[9px] text-zinc-500 uppercase tracking-widest font-mono">
                      Dealer
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

            {/* Top-Right: 3D Acrylic Dealing Shoe */}
            <div className="w-20 sm:w-28 flex justify-end">
              <DealingShoe
                remainingCards={shoe.cards.length}
                isDealing={isDealingAnimation}
              />
            </div>
          </div>

          {/* Center Felt: Arched Casino Gold Typography Rules */}
          <div className="absolute inset-x-0 top-36 sm:top-40 z-0">
            <BlackjackFeltRules />
          </div>

          {/* Floating Strategy Coach & Hi-Lo Counting HUDs */}
          <div className="absolute top-20 left-4 sm:left-6 z-20 flex flex-col gap-2 pointer-events-auto">
            {/* Card Counter Telemetry Widget */}
            {showCountingHud && (
              <div className="bg-zinc-950/85 border border-amber-500/30 backdrop-blur-md rounded-2xl p-2.5 shadow-lg min-w-[155px]">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Flame size={11} />
                    <span>Hi-Lo Counter</span>
                  </span>
                  <span className="font-mono text-zinc-400">6 Decks</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-center text-xs">
                  <div className="bg-white/5 rounded-lg p-1">
                    <span className="text-[8px] text-zinc-400 uppercase block">Running</span>
                    <span
                      className={clsx(
                        'font-mono font-black text-xs sm:text-sm',
                        shoe.runningCount > 0 ? 'text-emerald-400' : shoe.runningCount < 0 ? 'text-rose-400' : 'text-zinc-300'
                      )}
                    >
                      {shoe.runningCount > 0 ? `+${shoe.runningCount}` : shoe.runningCount}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-lg p-1">
                    <span className="text-[8px] text-zinc-400 uppercase block">True Count</span>
                    <span
                      className={clsx(
                        'font-mono font-black text-xs sm:text-sm',
                        trueCount >= 2 ? 'text-emerald-300 font-extrabold' : 'text-zinc-200'
                      )}
                    >
                      {trueCount > 0 ? `+${trueCount}` : trueCount}
                    </span>
                  </div>
                </div>
                <span className="text-[8px] text-zinc-500 block text-center mt-1 font-mono">
                  {shoe.cards.length} cards remaining
                </span>
              </div>
            )}

            {/* Basic Strategy Coach Banner */}
            {coachPosition !== 'hidden' && strategyAdvice && (
              <div className="bg-emerald-950/90 border border-emerald-500/40 backdrop-blur-md rounded-2xl p-2.5 shadow-lg max-w-[180px] animate-pulse">
                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-300 mb-0.5">
                  <Sparkles size={11} />
                  <span>Coach Advisor</span>
                </div>
                <p className="text-xs font-black text-white uppercase tracking-wide">
                  Recommend: <span className="text-emerald-300 underline">{strategyAdvice.toUpperCase()}</span>
                </p>
                <span className="text-[8px] text-zinc-300 leading-tight block mt-0.5">
                  Optimal vs Dealer {dealerCards[0]?.value}.
                </span>
              </div>
            )}
          </div>

          {/* Floating Non-Intrusive Settlement Score Callout Panel on Right */}
          {gamePhase === 'settled' && settlementDetails.length > 0 && (
            <div className="absolute top-20 right-4 sm:right-6 z-30 max-w-[240px] sm:max-w-[280px] bg-zinc-950/95 border border-amber-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-md animate-action-pop pointer-events-auto">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-300 flex items-center gap-1">
                  <span>🏆</span>
                  <span>Round Summary</span>
                </span>
                <span className="text-[9px] font-mono font-bold text-zinc-300 bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
                  Dealer: {dealerEval.isBusted ? `Bust (${dealerEval.total})` : dealerEval.total}
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {settlementDetails.map((d) => (
                  <div
                    key={d.id}
                    className={clsx(
                      'p-2 rounded-xl text-xs flex flex-col gap-0.5 border shadow-sm',
                      d.result === 'win' || d.result === 'blackjack'
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                        : d.result === 'push'
                        ? 'bg-zinc-900/80 border-zinc-700 text-zinc-300'
                        : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                    )}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[11px] font-bold">
                        {d.isHero ? `Spot ${d.spotIndex + 1} (You)` : `${d.name} (Spot ${d.spotIndex + 1})`}
                      </span>
                      <span className="font-mono font-black text-xs">
                        {d.result === 'blackjack'
                          ? `+$${d.netProfit} (BJ)`
                          : d.result === 'win'
                          ? `+$${d.netProfit}!`
                          : d.result === 'push'
                          ? 'Push $0'
                          : `-$${d.bet} LOST`}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-300 leading-tight">
                      {d.summaryText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5 SCALABLE BETTING SPOTS (Elliptical Arc Positions) */}
          <div className="relative z-10 w-full h-full min-h-[170px] sm:min-h-[220px]">
            {seats.map((seat, spotIndex) => {
              const coords = SEAT_ARC_COORDS[spotIndex];
              const spotHands = hands.filter((h) => h.spotIndex === spotIndex);
              const isSpotActive = hands[activeHandIndex]?.spotIndex === spotIndex && gamePhase === 'player_turn';
              const isHeroSeat = seat.occupant === 'hero';

              return (
                <div
                  key={spotIndex}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{ left: coords.left, top: coords.top }}
                >
                  {/* Cards Dealt to this Spot (if round active) */}
                  {spotHands.length > 0 && (
                    <div
                      className={clsx(
                        'flex flex-col items-center mb-1 z-20',
                        isHeroSeat ? '-mt-16 sm:-mt-22' : '-mt-10 sm:-mt-14'
                      )}
                    >
                      {spotHands.map((h) => {
                        const hEval = calculateHand(h.cards);
                        const isHeroHand = !h.isBot;
                        return (
                          <div key={h.id} className="flex flex-col items-center">
                            {/* Animated Win/Loss Pop-Pill Badge directly above cards */}
                            {h.result && (
                              <div
                                className={clsx(
                                  'px-2.5 py-0.5 rounded-full font-black font-mono text-[10px] sm:text-xs tracking-wide shadow-2xl border animate-action-pop flex items-center gap-1 -mt-2 mb-1.5 z-30',
                                  h.result === 'blackjack' && 'bg-gradient-to-r from-amber-400 to-amber-500 text-black border-amber-200 shadow-amber-500/50',
                                  h.result === 'win' && 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border-emerald-300 shadow-emerald-500/50',
                                  h.result === 'push' && 'bg-zinc-800 text-zinc-200 border-zinc-600 shadow-zinc-800/50',
                                  h.result === 'loss' && 'bg-gradient-to-r from-rose-600 to-rose-700 text-white border-rose-400 shadow-rose-500/50'
                                )}
                              >
                                {h.result === 'blackjack'
                                  ? `👑 BLACKJACK +$${h.netProfit}!`
                                  : h.result === 'win'
                                  ? `+$${h.netProfit} WIN!`
                                  : h.result === 'push'
                                  ? 'PUSH $0'
                                  : `-$${Math.abs(h.netProfit ?? h.bet)} ${hEval.isBusted ? 'BUST' : 'LOST'}`}
                              </div>
                            )}

                            {/* Cards Fan (Prominent 1.5x-2x for Hero!) */}
                            <div
                              className={clsx(
                                'flex items-center mb-1 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]',
                                isHeroHand ? '-space-x-3 sm:-space-x-4' : '-space-x-4 sm:-space-x-5'
                              )}
                            >
                              {h.cards.map((c) => (
                                <Card
                                  key={c.id}
                                  card={{ rank: c.rank, suit: c.suit }}
                                  size={isHeroHand ? 'lg' : 'sm'}
                                  className={clsx(
                                    'transition-all duration-300 animate-card-deal-flight',
                                    isHeroHand
                                      ? 'w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 text-sm sm:text-base md:text-lg rounded-xl border-2 border-zinc-200 shadow-2xl'
                                      : 'w-10 h-14 sm:w-11 sm:h-16 text-xs rounded-md border border-zinc-400 shadow-md'
                                  )}
                                />
                              ))}
                            </div>

                            {/* Score & Hand Total Pill */}
                            <div className="flex items-center gap-1">
                              <span
                                className={clsx(
                                  'rounded-full font-black font-mono border shadow-lg transition-all',
                                  isHeroHand ? 'px-2.5 py-0.5 text-xs sm:text-sm' : 'px-1.5 py-0.5 text-[9px] sm:text-[10px]',
                                  hEval.isBusted
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : h.status === 'blackjack' || h.result === 'blackjack'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : h.result === 'win'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-zinc-900 text-zinc-200 border-zinc-700',
                                  isSpotActive && isHeroHand && 'ring-2 ring-amber-400 shadow-amber-400/40'
                                )}
                              >
                                {h.status === 'blackjack' || h.result === 'blackjack'
                                  ? 'Blackjack (3:2)!'
                                  : hEval.isBusted
                                  ? `Bust (${hEval.total})`
                                  : hEval.isSoft
                                  ? `Soft ${hEval.total}`
                                  : hEval.total}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Circular Golden Betting Ring */}
                  <div
                    onClick={() => handleSpotClick(spotIndex)}
                    className={clsx(
                      'relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 transition-all flex flex-col items-center justify-center shadow-lg',
                      gamePhase === 'betting' && seat.occupant === 'empty' && 'border-amber-400/50 hover:border-amber-400 border-dashed bg-black/30 hover:bg-black/50 cursor-pointer',
                      gamePhase === 'betting' && seat.occupant === 'hero' && 'border-amber-400 bg-amber-950/30 cursor-pointer shadow-[0_0_15px_rgba(251,191,36,0.25)]',
                      seat.occupant === 'bot' && 'border-amber-400/80 bg-zinc-950/40',
                      isSpotActive && 'ring-4 ring-amber-400 bg-amber-400/10 shadow-[0_0_25px_rgba(251,191,36,0.4)] animate-pulse'
                    )}
                  >
                    {/* Inner Golden Ring Trim */}
                    <div className="absolute inset-1 rounded-full border border-amber-400/30 pointer-events-none" />

                    {/* Inside Circle: Render 3D Chip Stack or Spot Placeholder */}
                    {seat.bet > 0 ? (
                      <div className="relative flex flex-col items-center">
                        <ChipStack amount={seat.bet} mode="bet" size="sm" showAmountLabel={false} />
                        <span className="font-mono font-black text-[10px] sm:text-xs text-amber-300 drop-shadow mt-0.5">
                          ${seat.bet}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-serif font-black text-amber-300/60 uppercase tracking-widest">
                        {spotIndex + 1}
                      </span>
                    )}
                  </div>

                  {/* Player Pod Badge perched below betting ring */}
                  <div className="mt-1.5 flex flex-col items-center">
                    {seat.occupant === 'hero' ? (
                      /* Hero Badge */
                      <div className="flex items-center gap-1 bg-zinc-900/90 border border-amber-400/50 px-2 py-0.5 rounded-full shadow">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={userProfile.avatarUrl}
                          alt="You"
                          className="w-4 h-4 rounded-full object-cover border border-amber-400"
                        />
                        <span className="text-[9px] font-bold text-amber-300">You</span>
                        {gamePhase === 'betting' && spotIndex !== 2 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnseat(spotIndex);
                            }}
                            className="text-zinc-400 hover:text-rose-400 ml-0.5"
                            title="Remove Hero from this spot"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    ) : seat.occupant === 'bot' && seat.bot ? (
                      /* AI Tablemate Bot Badge */
                      <div className="flex items-center gap-1 bg-zinc-950/90 border border-zinc-700 px-2 py-0.5 rounded-full shadow">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={seat.bot.avatarUrl}
                          alt={seat.bot.name}
                          className="w-4 h-4 rounded-full object-cover border border-zinc-500"
                        />
                        <div className="flex flex-col leading-none">
                          <span className="text-[9px] font-bold text-zinc-200 truncate max-w-[55px]">
                            {seat.bot.nickname}
                          </span>
                        </div>
                        {isSpotActive && (
                          <span className="text-[7px] text-amber-300 font-mono animate-pulse">
                            Thinking...
                          </span>
                        )}
                        {gamePhase === 'betting' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnseat(spotIndex);
                            }}
                            className="text-zinc-400 hover:text-rose-400 ml-0.5"
                            title="Unseat bot"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Empty Spot: + Seat Bot Option during betting phase */
                      gamePhase === 'betting' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSeatBot(spotIndex);
                          }}
                          className="flex items-center gap-1 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-amber-400/40 px-2 py-0.5 rounded-full text-[8px] font-bold text-zinc-400 hover:text-white transition cursor-pointer"
                          title="Seat AI Tablemate here"
                        >
                          <UserPlus size={9} className="text-amber-400" />
                          <span>+ Bot</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Semicircular Padded Black Leather Armrest Rail along bottom */}
          <div className="absolute inset-x-0 bottom-0 h-8 sm:h-10 bg-gradient-to-t from-black via-[#11161d] to-transparent border-t border-[#3d2719] pointer-events-none flex items-center justify-center">
            <span className="text-[8px] uppercase tracking-[0.3em] font-mono text-zinc-600/70">
              VIP HIGHLIMIT SALON &bull; TABLE LIMIT $5 - $1,000
            </span>
          </div>
        </div>

        {/* Lower Control Bar: Quick Presets, Chips & Player Action Controls */}
        <div className="w-full mt-3 sm:mt-4 bg-[#0a0e14]/90 border border-white/10 backdrop-blur-md rounded-3xl p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3 shadow-xl">
          {/* Table Announcement Notice & Quick Seating Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-2 text-zinc-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Info size={14} className="text-amber-400 shrink-0" />
              <span>{tableNotice}</span>
            </span>

            {/* Quick Seating Preset Bar (betting phase only) */}
            {gamePhase === 'betting' && (
              <div className="flex items-center gap-1 text-[10px] bg-black/40 border border-white/10 rounded-full p-1">
                <span className="text-zinc-500 font-bold px-1.5 flex items-center gap-1">
                  <Users size={11} />
                  <span>Presets:</span>
                </span>
                <button
                  onClick={() => applyPreset('solo_1')}
                  className="px-2 py-0.5 rounded-full hover:bg-white/10 text-zinc-300 transition cursor-pointer"
                >
                  Solo 1H
                </button>
                <button
                  onClick={() => applyPreset('solo_3')}
                  className="px-2 py-0.5 rounded-full hover:bg-white/10 text-zinc-300 transition cursor-pointer"
                >
                  Solo 3H
                </button>
                <button
                  onClick={() => applyPreset('mixed_bots')}
                  className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 transition cursor-pointer font-bold"
                >
                  Mixed + 4 Bots
                </button>
                <button
                  onClick={() => applyPreset('solo_5')}
                  className="px-2 py-0.5 rounded-full hover:bg-white/10 text-zinc-300 transition cursor-pointer"
                >
                  Solo 5H
                </button>
              </div>
            )}
          </div>

          {/* Conditional Control Rows */}
          {gamePhase === 'betting' ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
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
                      'w-9 h-9 sm:w-11 sm:h-11 rounded-full font-black text-xs font-mono border-2 transition-all cursor-pointer flex items-center justify-center shadow-md',
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
                  disabled={totalHeroWager === 0}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-400 hover:text-white transition disabled:opacity-40 cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={handleDoubleBets}
                  disabled={totalHeroWager === 0}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-400 hover:text-white transition disabled:opacity-40 cursor-pointer"
                >
                  2x Double
                </button>
                <button
                  onClick={handleRebet}
                  disabled={lastHeroBets.every((b) => b === 0)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-400 hover:text-white transition disabled:opacity-40 cursor-pointer"
                >
                  Rebet
                </button>
                <button
                  onClick={handleDeal}
                  disabled={activeSeatsCount === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-xs uppercase tracking-wider transition shadow-lg disabled:opacity-40 cursor-pointer"
                >
                  Deal Cards
                </button>
              </div>
            </div>
          ) : gamePhase === 'player_turn' ? (
            /* Player Action Buttons during Live Hand */
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-2 border-t border-white/10">
              {activeHand && activeHand.isBot ? (
                /* Bot is currently playing */
                <div className="flex items-center gap-2 py-1 px-4 bg-zinc-900 border border-amber-400/40 rounded-xl text-xs font-bold text-amber-300 animate-pulse">
                  <span>💭 {activeHand.botName ?? 'AI Tablemate'} is taking their turn...</span>
                </div>
              ) : (
                /* Hero's active turn controls */
                <>
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
                </>
              )}
            </div>
          ) : (
            /* Settled phase -> Next Round */
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

      {/* Dockable AI Strategy Coach Panel */}
      <BlackjackAICoach
        activeHand={activeHand ?? null}
        dealerUpCard={dealerCards.length > 0 ? dealerCards[0] : null}
        runningCount={shoe.runningCount}
        remainingCards={shoe.cards.length}
        bankroll={bankroll}
        onApplyAdvice={handleApplyAdvice}
        position={coachPosition}
        onPositionChange={setCoachPosition}
        isStacked={isStacked}
      />

      {/* Dockable Live Dealer Speech Log */}
      <BlackjackDealerLog
        logs={logs}
        onClearLogs={() => setLogs([])}
        position={dealerLogPosition}
        onPositionChange={setDealerLogPosition}
        isStacked={isStacked}
      />
    </div>
  );
}
