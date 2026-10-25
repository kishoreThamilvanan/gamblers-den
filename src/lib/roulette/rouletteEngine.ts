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

export interface RouletteStreakInfo {
  label: string;
  type: 'red' | 'black' | 'green' | 'even' | 'odd' | 'low' | 'high';
  count: number;
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
  lowCount: number;
  lowPercentage: number;
  highCount: number;
  highPercentage: number;
  dozen1Count: number;
  dozen1Percentage: number;
  dozen2Count: number;
  dozen2Percentage: number;
  dozen3Count: number;
  dozen3Percentage: number;
  column1Count: number;
  column1Percentage: number;
  column2Count: number;
  column2Percentage: number;
  column3Count: number;
  column3Percentage: number;
  voisinsCount: number;
  voisinsPercentage: number;
  tiersCount: number;
  tiersPercentage: number;
  orphelinsCount: number;
  orphelinsPercentage: number;
  jeuzeroCount: number;
  jeuzeroPercentage: number;
  currentStreak: RouletteStreakInfo | null;
  hotNumbers: { pocket: PocketNumber; count: number }[];
  coldNumbers: { pocket: PocketNumber; count: number }[];
}

/**
 * Generates a batch of realistic sample spins for quick telemetry seeding
 */
export function generateSampleSpins(
  count: number = 25,
  variant: RouletteVariant = 'european',
  seedStart?: number
): RoulettePocket[] {
  const results: RoulettePocket[] = [];
  for (let i = 0; i < count; i++) {
    const seed = seedStart !== undefined ? seedStart + i * 17 : undefined;
    results.push(spinRoulette(variant, seed));
  }
  return results;
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
      lowCount: 0,
      lowPercentage: 0,
      highCount: 0,
      highPercentage: 0,
      dozen1Count: 0,
      dozen1Percentage: 0,
      dozen2Count: 0,
      dozen2Percentage: 0,
      dozen3Count: 0,
      dozen3Percentage: 0,
      column1Count: 0,
      column1Percentage: 0,
      column2Count: 0,
      column2Percentage: 0,
      column3Count: 0,
      column3Percentage: 0,
      voisinsCount: 0,
      voisinsPercentage: 0,
      tiersCount: 0,
      tiersPercentage: 0,
      orphelinsCount: 0,
      orphelinsPercentage: 0,
      jeuzeroCount: 0,
      jeuzeroPercentage: 0,
      currentStreak: null,
      hotNumbers: [],
      coldNumbers: [],
    };
  }

  let redCount = 0;
  let blackCount = 0;
  let greenCount = 0;
  let evenCount = 0;
  let oddCount = 0;
  let lowCount = 0;
  let highCount = 0;
  let dozen1Count = 0;
  let dozen2Count = 0;
  let dozen3Count = 0;
  let column1Count = 0;
  let column2Count = 0;
  let column3Count = 0;
  let voisinsCount = 0;
  let tiersCount = 0;
  let orphelinsCount = 0;
  let jeuzeroCount = 0;

  const frequencyMap: Map<PocketNumber, number> = new Map();
  const allPockets = variant === 'european' ? EUROPEAN_WHEEL_ORDER : AMERICAN_WHEEL_ORDER;
  allPockets.forEach((p) => frequencyMap.set(p, 0));

  history.forEach((pocket) => {
    if (pocket.color === 'red') redCount++;
    else if (pocket.color === 'black') blackCount++;
    else greenCount++;

    if (pocket.parity === 'even') evenCount++;
    else if (pocket.parity === 'odd') oddCount++;

    if (pocket.range === 'low') lowCount++;
    else if (pocket.range === 'high') highCount++;

    if (pocket.dozen === 1) dozen1Count++;
    else if (pocket.dozen === 2) dozen2Count++;
    else if (pocket.dozen === 3) dozen3Count++;

    if (pocket.column === 1) column1Count++;
    else if (pocket.column === 2) column2Count++;
    else if (pocket.column === 3) column3Count++;

    if (VOISINS_DU_ZERO.includes(pocket.id)) voisinsCount++;
    if (TIERS_DU_CYLINDRE.includes(pocket.id)) tiersCount++;
    if (ORPHELINS.includes(pocket.id)) orphelinsCount++;
    if (JEU_ZERO.includes(pocket.id)) jeuzeroCount++;

    frequencyMap.set(pocket.id, (frequencyMap.get(pocket.id) || 0) + 1);
  });

  // Detect active streak from newest spins (index 0 is newest)
  let currentStreak: RouletteStreakInfo | null = null;
  if (history.length >= 2) {
    const first = history[0];
    // Color streak
    let colorRun = 1;
    for (let i = 1; i < history.length; i++) {
      if (history[i].color === first.color) colorRun++;
      else break;
    }

    // Parity streak
    let parityRun = 0;
    if (first.parity) {
      parityRun = 1;
      for (let i = 1; i < history.length; i++) {
        if (history[i].parity === first.parity) parityRun++;
        else break;
      }
    }

    // Range streak
    let rangeRun = 0;
    if (first.range) {
      rangeRun = 1;
      for (let i = 1; i < history.length; i++) {
        if (history[i].range === first.range) rangeRun++;
        else break;
      }
    }

    if (colorRun >= 2 && colorRun >= parityRun && colorRun >= rangeRun) {
      currentStreak = {
        label: `${colorRun}x ${first.color.toUpperCase()} STREAK`,
        type: first.color,
        count: colorRun,
      };
    } else if (parityRun >= 2 && parityRun >= rangeRun && first.parity) {
      currentStreak = {
        label: `${parityRun}x ${first.parity.toUpperCase()} STREAK`,
        type: first.parity,
        count: parityRun,
      };
    } else if (rangeRun >= 2 && first.range) {
      currentStreak = {
        label: `${rangeRun}x ${first.range === 'low' ? '1-18' : '19-36'} STREAK`,
        type: first.range,
        count: rangeRun,
      };
    }
  }

  const sortedFrequencies = Array.from(frequencyMap.entries())
    .map(([pocket, count]) => ({ pocket, count }))
    .sort((a, b) => b.count - a.count);

  const hotNumbers = sortedFrequencies.slice(0, 5);
  const coldNumbers = [...sortedFrequencies].reverse().slice(0, 5);

  const pct = (count: number) => Math.round((count / totalSpins) * 100);

  return {
    totalSpins,
    redCount,
    redPercentage: pct(redCount),
    blackCount,
    blackPercentage: pct(blackCount),
    greenCount,
    greenPercentage: pct(greenCount),
    evenCount,
    evenPercentage: pct(evenCount),
    oddCount,
    oddPercentage: pct(oddCount),
    lowCount,
    lowPercentage: pct(lowCount),
    highCount,
    highPercentage: pct(highCount),
    dozen1Count,
    dozen1Percentage: pct(dozen1Count),
    dozen2Count,
    dozen2Percentage: pct(dozen2Count),
    dozen3Count,
    dozen3Percentage: pct(dozen3Count),
    column1Count,
    column1Percentage: pct(column1Count),
    column2Count,
    column2Percentage: pct(column2Count),
    column3Count,
    column3Percentage: pct(column3Count),
    voisinsCount,
    voisinsPercentage: pct(voisinsCount),
    tiersCount,
    tiersPercentage: pct(tiersCount),
    orphelinsCount,
    orphelinsPercentage: pct(orphelinsCount),
    jeuzeroCount,
    jeuzeroPercentage: pct(jeuzeroCount),
    currentStreak,
    hotNumbers,
    coldNumbers,
  };
}
