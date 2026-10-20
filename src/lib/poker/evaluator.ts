import { Card, Rank } from './types';

export enum HandRank {
  HighCard = 1,
  Pair,
  TwoPair,
  ThreeOfAKind,
  Straight,
  Flush,
  FullHouse,
  FourOfAKind,
  StraightFlush,
  RoyalFlush
}

export interface HandEvaluation {
  rank: HandRank;
  name: string;
  value: number; // numerical value for comparing hands
}

const rankValues: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) return { rank: HandRank.HighCard, name: "Incomplete", value: 0 };

  const sortedCards = [...cards].sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);
  
  // Count suits and ranks
  const suitCounts: Record<string, Card[]> = {};
  const rankCounts: Record<number, number> = {};
  
  sortedCards.forEach(c => {
    suitCounts[c.suit] = suitCounts[c.suit] || [];
    suitCounts[c.suit].push(c);
    
    const v = rankValues[c.rank];
    rankCounts[v] = (rankCounts[v] || 0) + 1;
  });

  // Check flush
  let flushCards: Card[] | null = null;
  for (const suit in suitCounts) {
    if (suitCounts[suit].length >= 5) {
      flushCards = suitCounts[suit].slice(0, 5); // Already sorted desc
      break;
    }
  }

  // Helper for straight
  const findStraight = (cardsToSearch: Card[]): number[] | null => {
    const uniqueVals = Array.from(new Set(cardsToSearch.map(c => rankValues[c.rank]))).sort((a, b) => b - a);
    if (uniqueVals.includes(14)) uniqueVals.push(1); // Ace can be low
    
    let straightSeq: number[] = [];
    for (let i = 0; i < uniqueVals.length; i++) {
      if (straightSeq.length === 0 || uniqueVals[i] === straightSeq[straightSeq.length - 1] - 1) {
        straightSeq.push(uniqueVals[i]);
      } else if (uniqueVals[i] !== straightSeq[straightSeq.length - 1]) {
        straightSeq = [uniqueVals[i]];
      }
      if (straightSeq.length === 5) return straightSeq;
    }
    return null;
  };

  // Straight Flush
  if (flushCards) {
    const sfSeq = findStraight(flushCards);
    if (sfSeq) {
      if (sfSeq[0] === 14) return { rank: HandRank.RoyalFlush, name: "Royal Flush", value: HandRank.RoyalFlush * 100000000 };
      return { rank: HandRank.StraightFlush, name: "Straight Flush", value: HandRank.StraightFlush * 100000000 + sfSeq[0] };
    }
  }

  // Quads
  const pairs = Object.entries(rankCounts).map(([r, c]) => ({ r: Number(r), c })).sort((a, b) => b.c - a.c || b.r - a.r);
  
  if (pairs[0].c === 4) {
    const kicker = sortedCards.find(c => rankValues[c.rank] !== pairs[0].r)!;
    return { 
      rank: HandRank.FourOfAKind, 
      name: "Four of a Kind", 
      value: HandRank.FourOfAKind * 100000000 + pairs[0].r * 10000 + rankValues[kicker.rank] 
    };
  }

  // Full House
  if (pairs[0].c === 3 && pairs[1] && pairs[1].c >= 2) {
    return {
      rank: HandRank.FullHouse,
      name: "Full House",
      value: HandRank.FullHouse * 100000000 + pairs[0].r * 10000 + pairs[1].r
    };
  }

  // Flush
  if (flushCards) {
    let val = HandRank.Flush * 100000000;
    flushCards.forEach((c, i) => val += rankValues[c.rank] * Math.pow(15, 4 - i));
    return { rank: HandRank.Flush, name: "Flush", value: val };
  }

  // Straight
  const straightSeq = findStraight(sortedCards);
  if (straightSeq) {
    return { rank: HandRank.Straight, name: "Straight", value: HandRank.Straight * 100000000 + straightSeq[0] };
  }

  // Three of a Kind
  if (pairs[0].c === 3) {
    const kickers = sortedCards.filter(c => rankValues[c.rank] !== pairs[0].r).slice(0, 2);
    return {
      rank: HandRank.ThreeOfAKind,
      name: "Three of a Kind",
      value: HandRank.ThreeOfAKind * 100000000 + pairs[0].r * 10000 + rankValues[kickers[0].rank] * 15 + rankValues[kickers[1].rank]
    };
  }

  // Two Pair
  if (pairs[0].c === 2 && pairs[1] && pairs[1].c === 2) {
    const kickers = sortedCards.filter(c => rankValues[c.rank] !== pairs[0].r && rankValues[c.rank] !== pairs[1].r);
    return {
      rank: HandRank.TwoPair,
      name: "Two Pair",
      value: HandRank.TwoPair * 100000000 + pairs[0].r * 10000 + pairs[1].r * 100 + (kickers[0] ? rankValues[kickers[0].rank] : 0)
    };
  }

  // Pair
  if (pairs[0].c === 2) {
    const kickers = sortedCards.filter(c => rankValues[c.rank] !== pairs[0].r).slice(0, 3);
    let val = HandRank.Pair * 100000000 + pairs[0].r * 100000;
    kickers.forEach((c, i) => val += rankValues[c.rank] * Math.pow(15, 2 - i));
    return { rank: HandRank.Pair, name: "Pair", value: val };
  }

  // High Card
  let val = HandRank.HighCard * 100000000;
  sortedCards.slice(0, 5).forEach((c, i) => val += rankValues[c.rank] * Math.pow(15, 4 - i));
  return { rank: HandRank.HighCard, name: "High Card", value: val };
}
