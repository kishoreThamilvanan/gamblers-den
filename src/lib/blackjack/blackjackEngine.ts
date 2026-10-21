export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface BlackjackCard {
  id: string;
  rank: Rank;
  suit: Suit;
  value: number; // 2-10, Face cards = 10, Ace = 11 (can be counted as 1)
  isAce: boolean;
}

export interface HandEvaluation {
  total: number;
  hardTotal: number;
  softTotal: number;
  isSoft: boolean;
  isBlackjack: boolean;
  isBusted: boolean;
  is21: boolean;
}

export type BasicStrategyAction = 'hit' | 'stand' | 'double' | 'split' | 'surrender';

export interface BlackjackHandState {
  id: string;
  spotIndex: number; // 0, 1, or 2 (Spot Left, Center, Right)
  cards: BlackjackCard[];
  bet: number;
  isDoubled: boolean;
  isSplit: boolean;
  isSurrendered: boolean;
  status: 'betting' | 'playing' | 'stood' | 'busted' | 'blackjack' | 'settled';
  result?: 'win' | 'loss' | 'push' | 'blackjack';
  payout?: number;
  netProfit?: number;
}

export interface DealerState {
  cards: BlackjackCard[];
  holeCardHidden: boolean;
  total: number;
  isSoft: boolean;
  isBusted: boolean;
  isBlackjack: boolean;
}

export interface ShoeState {
  cards: BlackjackCard[];
  totalDecks: number;
  cutCardIndex: number;
  runningCount: number; // Hi-Lo Running Count
  dealtCount: number;
}

const SUITS: Suit[] = ['s', 'h', 'd', 'c'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export function getRankValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'K' || rank === 'Q' || rank === 'J' || rank === 'T') return 10;
  return parseInt(rank, 10);
}

let cardCounter = 0;

export function createCard(rank: Rank, suit: Suit, deckIndex = 0): BlackjackCard {
  cardCounter += 1;
  return {
    id: `${rank}${suit}-${deckIndex}-${cardCounter}`,
    rank,
    suit,
    value: getRankValue(rank),
    isAce: rank === 'A',
  };
}

export function createShoe(numDecks = 6, seed?: number): ShoeState {
  const cards: BlackjackCard[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push(createCard(rank, suit, d));
      }
    }
  }

  // Deterministic LCG shuffle if seed is provided (for SSR prerender or testing), otherwise runtime Math.random()
  if (typeof seed === 'number') {
    let s = seed;
    for (let i = cards.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const rnd = s / 233280;
      const j = Math.floor(rnd * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  } else {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  }

  // Standard casino 75% penetration cut card
  const cutCardIndex = Math.floor(cards.length * 0.75);

  return {
    cards,
    totalDecks: numDecks,
    cutCardIndex,
    runningCount: 0,
    dealtCount: 0,
  };
}

export function getHiLoValue(card: BlackjackCard): number {
  if (['2', '3', '4', '5', '6'].includes(card.rank)) return 1;
  if (['7', '8', '9'].includes(card.rank)) return 0;
  return -1; // T, J, Q, K, A
}

export function calculateHand(cards: BlackjackCard[]): HandEvaluation {
  let hardTotal = 0;
  let aceCount = 0;

  for (const card of cards) {
    if (card.isAce) {
      aceCount += 1;
      hardTotal += 1;
    } else {
      hardTotal += card.value;
    }
  }

  // Calculate best total using Aces as 11 where possible without busting
  let total = hardTotal;
  let isSoft = false;

  if (aceCount > 0 && hardTotal + 10 <= 21) {
    total = hardTotal + 10;
    isSoft = true;
  }

  const isBusted = total > 21;
  const is21 = total === 21;
  const isBlackjack = cards.length === 2 && total === 21;

  return {
    total,
    hardTotal,
    softTotal: hardTotal + (aceCount > 0 ? 10 : 0),
    isSoft,
    isBlackjack,
    isBusted,
    is21,
  };
}

/**
 * Mathematically Optimal Basic Strategy Calculator (Vegas Strip S17 / DAS)
 */
export function getBasicStrategyAction(
  playerCards: BlackjackCard[],
  dealerUpcard: BlackjackCard,
  canDouble = true,
  canSplit = true,
  canSurrender = true
): BasicStrategyAction {
  const playerEval = calculateHand(playerCards);
  const upcardVal = dealerUpcard.rank === 'A' ? 11 : dealerUpcard.value;

  // 1. Pair Splitting
  if (playerCards.length === 2 && playerCards[0].rank === playerCards[1].rank && canSplit) {
    const rank = playerCards[0].rank;
    if (rank === 'A' || rank === '8') return 'split';
    if (rank === 'T' || rank === 'J' || rank === 'Q' || rank === 'K') return 'stand';
    if (rank === '9') {
      return [2, 3, 4, 5, 6, 8, 9].includes(upcardVal) ? 'split' : 'stand';
    }
    if (rank === '7') {
      return upcardVal <= 7 ? 'split' : 'hit';
    }
    if (rank === '6') {
      return upcardVal >= 3 && upcardVal <= 6 ? 'split' : 'hit';
    }
    if (rank === '5') {
      return canDouble && upcardVal <= 9 ? 'double' : 'hit';
    }
    if (rank === '4') {
      return [5, 6].includes(upcardVal) ? 'split' : 'hit';
    }
    if (rank === '3' || rank === '2') {
      return upcardVal <= 7 ? 'split' : 'hit';
    }
  }

  // 2. Soft Totals (Ace + Other Cards)
  if (playerEval.isSoft && playerCards.length === 2) {
    const nonAceCard = playerCards[0].isAce ? playerCards[1] : playerCards[0];
    const nonAceVal = nonAceCard.value;

    if (nonAceVal >= 8) return 'stand'; // A,8 (19) or A,9 (20)
    if (nonAceVal === 7) {
      // A,7 (18)
      if (canDouble && upcardVal >= 3 && upcardVal <= 6) return 'double';
      if ([2, 7, 8].includes(upcardVal)) return 'stand';
      return 'hit';
    }
    if (nonAceVal === 6) {
      // A,6 (17)
      return canDouble && upcardVal >= 3 && upcardVal <= 6 ? 'double' : 'hit';
    }
    if (nonAceVal === 5 || nonAceVal === 4) {
      // A,5 (16) or A,4 (15)
      return canDouble && upcardVal >= 4 && upcardVal <= 6 ? 'double' : 'hit';
    }
    if (nonAceVal === 3 || nonAceVal === 2) {
      // A,3 (14) or A,2 (13)
      return canDouble && upcardVal >= 5 && upcardVal <= 6 ? 'double' : 'hit';
    }
  }

  // 3. Hard Totals
  const total = playerEval.total;

  if (total >= 17) return 'stand';

  if (total === 16) {
    if (canSurrender && [9, 10, 11].includes(upcardVal)) return 'surrender';
    return upcardVal <= 6 ? 'stand' : 'hit';
  }

  if (total === 15) {
    if (canSurrender && upcardVal === 10) return 'surrender';
    return upcardVal <= 6 ? 'stand' : 'hit';
  }

  if (total === 13 || total === 14) {
    return upcardVal <= 6 ? 'stand' : 'hit';
  }

  if (total === 12) {
    return [4, 5, 6].includes(upcardVal) ? 'stand' : 'hit';
  }

  if (total === 11) {
    return canDouble && upcardVal <= 10 ? 'double' : 'hit';
  }

  if (total === 10) {
    return canDouble && upcardVal <= 9 ? 'double' : 'hit';
  }

  if (total === 9) {
    return canDouble && upcardVal >= 3 && upcardVal <= 6 ? 'double' : 'hit';
  }

  return 'hit'; // 8 or lower
}

/**
 * Evaluates Dealer turn under Vegas S17 rules:
 * Dealer must draw cards until total is 17 or higher; stands on all 17s (including soft 17).
 */
export function playDealerTurn(
  dealerHand: BlackjackCard[],
  shoe: ShoeState
): { finalCards: BlackjackCard[]; updatedShoe: ShoeState } {
  const cards = [...dealerHand];
  let currentShoe = { ...shoe, cards: [...shoe.cards] };

  while (true) {
    const evaluation = calculateHand(cards);
    if (evaluation.total >= 17 || evaluation.isBusted) {
      break;
    }
    // Draw next card
    if (currentShoe.cards.length === 0) {
      currentShoe = createShoe(currentShoe.totalDecks);
    }
    const nextCard = currentShoe.cards.pop()!;
    cards.push(nextCard);
    currentShoe.runningCount += getHiLoValue(nextCard);
    currentShoe.dealtCount += 1;
  }

  return {
    finalCards: cards,
    updatedShoe: currentShoe,
  };
}

/**
 * Calculates payout and outcome for a player hand against dealer's final hand.
 */
export function settleHand(
  playerHand: BlackjackHandState,
  dealerCards: BlackjackCard[]
): {
  result: 'win' | 'loss' | 'push' | 'blackjack';
  payout: number;
  netProfit: number;
} {
  const bet = playerHand.bet;

  if (playerHand.isSurrendered) {
    return {
      result: 'loss',
      payout: bet * 0.5,
      netProfit: -bet * 0.5,
    };
  }

  const pEval = calculateHand(playerHand.cards);
  const dEval = calculateHand(dealerCards);

  // Player busted
  if (pEval.isBusted) {
    return {
      result: 'loss',
      payout: 0,
      netProfit: -bet,
    };
  }

  // Player has Natural Blackjack
  if (pEval.isBlackjack) {
    if (dEval.isBlackjack) {
      return {
        result: 'push',
        payout: bet,
        netProfit: 0,
      };
    }
    // 3:2 payout: profit is 1.5 * bet; return is 2.5 * bet
    const profit = bet * 1.5;
    return {
      result: 'blackjack',
      payout: bet + profit,
      netProfit: profit,
    };
  }

  // Dealer has Natural Blackjack but player doesn't
  if (dEval.isBlackjack) {
    return {
      result: 'loss',
      payout: 0,
      netProfit: -bet,
    };
  }

  // Dealer busted (and player didn't)
  if (dEval.isBusted) {
    return {
      result: 'win',
      payout: bet * 2,
      netProfit: bet,
    };
  }

  // Both have valid totals
  if (pEval.total > dEval.total) {
    return {
      result: 'win',
      payout: bet * 2,
      netProfit: bet,
    };
  }

  if (pEval.total < dEval.total) {
    return {
      result: 'loss',
      payout: 0,
      netProfit: -bet,
    };
  }

  // Equal totals -> Push
  return {
    result: 'push',
    payout: bet,
    netProfit: 0,
  };
}

/**
 * Computes Hi-Lo True Count from Running Count and remaining cards in shoe.
 */
export function calculateTrueCount(runningCount: number, remainingCards: number): number {
  const decksRemaining = Math.max(0.5, remainingCards / 52);
  const raw = runningCount / decksRemaining;
  return Math.round(raw * 10) / 10;
}
