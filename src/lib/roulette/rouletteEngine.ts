/**
 * Gambler's Den - European & American Roulette Core Math & Payout Engine
 *
 * Implements standard international casino rules:
 * - European Roulette: Single zero (0), 37 pockets, 2.70% house edge
 * - American Roulette: Double zero (0, 00), 38 pockets, 5.26% house edge
 * - Comprehensive inside & outside bet coverage with authentic payout ratios
 * - Statistical analysis: Hot/Cold numbers, color frequency, column/dozen heatmaps
 */

import { secureRandom } from '@/lib/casino/random';

export type RouletteVariant = 'european' | 'american';

export type PocketNumber = number | '00';
export type PocketColor = 'red' | 'black' | 'green';

export interface RoulettePocket {
  id: PocketNumber;
  label: string;
  color: PocketColor;
  dozen: 1 | 2 | 3 | null;
  column: 1 | 2 | 3 | null;
  parity: 'even' | 'odd' | null;
  range: 'low' | 'high' | null;
}

export const RED_NUMBERS: readonly number[] = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

export const BLACK_NUMBERS: readonly number[] = [
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
];

// Physical wheel pocket orders in clockwise direction
export const EUROPEAN_WHEEL_ORDER: readonly PocketNumber[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const AMERICAN_WHEEL_ORDER: readonly PocketNumber[] = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
  '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2,
];

/**
 * Creates pocket descriptor for a given number
 */
export function getPocketInfo(num: PocketNumber): RoulettePocket {
  if (num === 0 || num === '00') {
    return {
      id: num,
      label: String(num),
      color: 'green',
      dozen: null,
      column: null,
      parity: null,
      range: null,
    };
  }

  const n = typeof num === 'number' ? num : parseInt(num, 10);
  const color: PocketColor = RED_NUMBERS.includes(n) ? 'red' : 'black';
  const dozen: 1 | 2 | 3 = n <= 12 ? 1 : n <= 24 ? 2 : 3;
  const column: 1 | 2 | 3 = n % 3 === 1 ? 1 : n % 3 === 2 ? 2 : 3;
  const parity: 'even' | 'odd' = n % 2 === 0 ? 'even' : 'odd';
  const range: 'low' | 'high' = n <= 18 ? 'low' : 'high';

  return {
    id: n,
    label: String(n),
    color,
    dozen,
    column,
    parity,
    range,
  };
}

export const ALL_EUROPEAN_POCKETS: readonly RoulettePocket[] = EUROPEAN_WHEEL_ORDER.map(getPocketInfo);
export const ALL_AMERICAN_POCKETS: readonly RoulettePocket[] = AMERICAN_WHEEL_ORDER.map(getPocketInfo);

// French Racetrack Sector Definitions
export const VOISINS_DU_ZERO: readonly PocketNumber[] = [
  22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25,
];

export const TIERS_DU_CYLINDRE: readonly PocketNumber[] = [
  27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33,
];

export const ORPHELINS: readonly PocketNumber[] = [
  1, 20, 14, 31, 9, 17, 34, 6,
];

export const JEU_ZERO: readonly PocketNumber[] = [
  12, 35, 3, 26, 0, 32, 15,
];

export type RouletteBetType =
  | 'straight'
  | 'split'
  | 'street'
  | 'corner'
  | 'sixline'
  | 'column'
  | 'dozen'
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low'
  | 'high'
  | 'voisins'
  | 'tiers'
  | 'orphelins'
  | 'jeuzero';

export interface RouletteBet {
  id: string;
  type: RouletteBetType;
  label: string;
  numbers: PocketNumber[];
  amount: number;
  payoutMultiplier: number; // e.g. 35 for 35:1
}

export const PAYOUT_RATIOS: Record<RouletteBetType, number> = {
  straight: 35, // 35:1
  split: 17,    // 17:1
  street: 11,   // 11:1
  corner: 8,    // 8:1
  sixline: 5,   // 5:1
  column: 2,    // 2:1
  dozen: 2,     // 2:1
  red: 1,       // 1:1
  black: 1,     // 1:1
  even: 1,      // 1:1
  odd: 1,       // 1:1
  low: 1,       // 1:1
  high: 1,      // 1:1
  voisins: 2,   // 2:1 equivalent average
  tiers: 2,     // 2:1
  orphelins: 4, // 4:1
  jeuzero: 4,   // 4:1
};

export interface SettledBetResult {
  bet: RouletteBet;
  won: boolean;
  payout: number; // returned stake + winnings if won, 0 if lost
  netProfit: number; // payout - amount
}

export interface SpinSettlement {
  winningPocket: RoulettePocket;
  results: SettledBetResult[];
  totalWagered: number;
  totalPayout: number;
  netProfit: number;
}

/**
 * Evaluates placed bets against the winning pocket.
 * Follows authentic casino payout conventions (35:1 pays 35x bet + returns stake).
 */
export function settleRouletteBets(
  winningPocket: RoulettePocket,
  bets: RouletteBet[]
): SpinSettlement {
  let totalWagered = 0;
  let totalPayout = 0;

  const results: SettledBetResult[] = bets.map((bet) => {
    totalWagered += bet.amount;
    const won = bet.numbers.includes(winningPocket.id);

    if (won) {
      // Payout = original bet + (bet * payoutMultiplier)
      const payout = bet.amount + bet.amount * bet.payoutMultiplier;
      totalPayout += payout;
      return {
        bet,
        won: true,
        payout,
        netProfit: payout - bet.amount,
      };
    } else {
      return {
        bet,
        won: false,
        payout: 0,
        netProfit: -bet.amount,
      };
    }
  });

  return {
    winningPocket,
    results,
    totalWagered,
    totalPayout,
    netProfit: totalPayout - totalWagered,
  };
}

/**
 * Deterministic PRNG helper for seedable tests and games
 */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Spins the roulette wheel and produces a winning pocket.
 * Allows optional seed for testing.
 */
export function spinRoulette(
  variant: RouletteVariant = 'european',
  seed?: number
): RoulettePocket {
  const pockets = variant === 'european' ? EUROPEAN_WHEEL_ORDER : AMERICAN_WHEEL_ORDER;
  const rand = seed !== undefined ? pseudoRandom(seed) : secureRandom();
  const pocketIndex = Math.floor(rand * pockets.length);
  return getPocketInfo(pockets[pocketIndex]);
}

/**
 * Statistical tracking summary for past spins
 */
export interface RouletteStatistics {
  totalSpins: number;
  redCount: number;
  redPercentage: number;
  blackCount: number;
  blackPercentage: number;
  greenCount: number;
  greenPercentage: number;
  evenCount: number;
  evenPercentage: number;
  oddCount: number;
  oddPercentage: number;
  dozen1Count: number;
  dozen2Count: number;
  dozen3Count: number;
  column1Count: number;
  column2Count: number;
  column3Count: number;
  hotNumbers: { pocket: PocketNumber; count: number }[];
  coldNumbers: { pocket: PocketNumber; count: number }[];
}

export function calculateRouletteStatistics(
  history: RoulettePocket[],
  variant: RouletteVariant = 'european'
): RouletteStatistics {
  const totalSpins = history.length;
  if (totalSpins === 0) {
    return {
      totalSpins: 0,
      redCount: 0,
      redPercentage: 0,
      blackCount: 0,
      blackPercentage: 0,
      greenCount: 0,
      greenPercentage: 0,
      evenCount: 0,
      evenPercentage: 0,
      oddCount: 0,
      oddPercentage: 0,
      dozen1Count: 0,
      dozen2Count: 0,
      dozen3Count: 0,
      column1Count: 0,
      column2Count: 0,
      column3Count: 0,
      hotNumbers: [],
      coldNumbers: [],
    };
  }

  let redCount = 0;
  let blackCount = 0;
  let greenCount = 0;
  let evenCount = 0;
  let oddCount = 0;
  let dozen1Count = 0;
  let dozen2Count = 0;
  let dozen3Count = 0;
  let column1Count = 0;
  let column2Count = 0;
  let column3Count = 0;

  const frequencyMap: Map<PocketNumber, number> = new Map();
  const allPockets = variant === 'european' ? EUROPEAN_WHEEL_ORDER : AMERICAN_WHEEL_ORDER;
  allPockets.forEach((p) => frequencyMap.set(p, 0));

  history.forEach((pocket) => {
    if (pocket.color === 'red') redCount++;
    else if (pocket.color === 'black') blackCount++;
    else greenCount++;

    if (pocket.parity === 'even') evenCount++;
    else if (pocket.parity === 'odd') oddCount++;

    if (pocket.dozen === 1) dozen1Count++;
    else if (pocket.dozen === 2) dozen2Count++;
    else if (pocket.dozen === 3) dozen3Count++;

    if (pocket.column === 1) column1Count++;
    else if (pocket.column === 2) column2Count++;
    else if (pocket.column === 3) column3Count++;

    frequencyMap.set(pocket.id, (frequencyMap.get(pocket.id) || 0) + 1);
  });

  const sortedFrequencies = Array.from(frequencyMap.entries())
    .map(([pocket, count]) => ({ pocket, count }))
    .sort((a, b) => b.count - a.count);

  const hotNumbers = sortedFrequencies.slice(0, 5);
  const coldNumbers = [...sortedFrequencies].reverse().slice(0, 5);

  return {
    totalSpins,
    redCount,
    redPercentage: Math.round((redCount / totalSpins) * 100),
    blackCount,
    blackPercentage: Math.round((blackCount / totalSpins) * 100),
    greenCount,
    greenPercentage: Math.round((greenCount / totalSpins) * 100),
    evenCount,
    evenPercentage: Math.round((evenCount / totalSpins) * 100),
    oddCount,
    oddPercentage: Math.round((oddCount / totalSpins) * 100),
    dozen1Count,
    dozen2Count,
    dozen3Count,
    column1Count,
    column2Count,
    column3Count,
    hotNumbers,
    coldNumbers,
  };
}
