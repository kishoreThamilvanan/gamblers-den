import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getPocketInfo,
  EUROPEAN_WHEEL_ORDER,
  AMERICAN_WHEEL_ORDER,
  ALL_EUROPEAN_POCKETS,
  ALL_AMERICAN_POCKETS,
  RED_NUMBERS,
  BLACK_NUMBERS,
  settleRouletteBets,
  calculateRouletteStatistics,
  spinRoulette,
  RouletteBet,
  PAYOUT_RATIOS,
} from '../lib/roulette/rouletteEngine';

describe('Roulette Engine - Pocket Structure & Wheel Sequences', () => {
  it('European wheel has exactly 37 pockets with single zero', () => {
    assert.strictEqual(EUROPEAN_WHEEL_ORDER.length, 37);
    assert.strictEqual(ALL_EUROPEAN_POCKETS.length, 37);
    assert.strictEqual(EUROPEAN_WHEEL_ORDER[0], 0);
  });

  it('American wheel has exactly 38 pockets with 0 and 00', () => {
    assert.strictEqual(AMERICAN_WHEEL_ORDER.length, 38);
    assert.strictEqual(ALL_AMERICAN_POCKETS.length, 38);
    assert.ok(AMERICAN_WHEEL_ORDER.includes(0));
    assert.ok(AMERICAN_WHEEL_ORDER.includes('00'));
  });

  it('Red numbers and Black numbers have exactly 18 unique values each', () => {
    assert.strictEqual(RED_NUMBERS.length, 18);
    assert.strictEqual(BLACK_NUMBERS.length, 18);

    const redSet = new Set(RED_NUMBERS);
    const blackSet = new Set(BLACK_NUMBERS);

    // Mutual exclusivity
    for (const r of RED_NUMBERS) {
      assert.strictEqual(blackSet.has(r), false);
    }

    // All numbers 1 to 36 covered
    for (let i = 1; i <= 36; i++) {
      assert.ok(redSet.has(i) || blackSet.has(i));
    }
  });

  it('Zero pockets (0 and 00) are classified as green with null properties', () => {
    const zero = getPocketInfo(0);
    assert.strictEqual(zero.color, 'green');
    assert.strictEqual(zero.dozen, null);
    assert.strictEqual(zero.column, null);
    assert.strictEqual(zero.parity, null);
    assert.strictEqual(zero.range, null);

    const doubleZero = getPocketInfo('00');
    assert.strictEqual(doubleZero.color, 'green');
    assert.strictEqual(doubleZero.dozen, null);
    assert.strictEqual(doubleZero.column, null);
    assert.strictEqual(doubleZero.parity, null);
    assert.strictEqual(doubleZero.range, null);
  });

  it('Standard pockets have accurate dozen, column, parity, and range', () => {
    const p17 = getPocketInfo(17);
    assert.strictEqual(p17.color, 'black');
    assert.strictEqual(p17.dozen, 2);
    assert.strictEqual(p17.column, 2); // 17 % 3 = 2
    assert.strictEqual(p17.parity, 'odd');
    assert.strictEqual(p17.range, 'low'); // 17 <= 18

    const p36 = getPocketInfo(36);
    assert.strictEqual(p36.color, 'red');
    assert.strictEqual(p36.dozen, 3);
    assert.strictEqual(p36.column, 3); // 36 % 3 = 0 -> col 3
    assert.strictEqual(p36.parity, 'even');
    assert.strictEqual(p36.range, 'high'); // 36 > 18
  });
});

describe('Roulette Engine - Payout & Settlement Rules', () => {
  it('Straight Up bet pays 35:1', () => {
    const winningPocket = getPocketInfo(17);
    const bets: RouletteBet[] = [
      {
        id: 'straight-17',
        type: 'straight',
        label: 'Single 17',
        numbers: [17],
        amount: 10,
        payoutMultiplier: PAYOUT_RATIOS.straight,
      },
    ];

    const result = settleRouletteBets(winningPocket, bets);
    assert.strictEqual(result.totalWagered, 10);
    assert.strictEqual(result.totalPayout, 360); // $10 stake + $350 profit
    assert.strictEqual(result.netProfit, 350);
    assert.strictEqual(result.results[0].won, true);
  });

  it('Split bet pays 17:1 on either number', () => {
    const winningPocket = getPocketInfo(14);
    const bets: RouletteBet[] = [
      {
        id: 'split-14-17',
        type: 'split',
        label: 'Split 14/17',
        numbers: [14, 17],
        amount: 25,
        payoutMultiplier: PAYOUT_RATIOS.split,
      },
    ];

    const result = settleRouletteBets(winningPocket, bets);
    assert.strictEqual(result.totalWagered, 25);
    assert.strictEqual(result.totalPayout, 25 + 25 * 17); // 25 + 425 = 450
    assert.strictEqual(result.netProfit, 425);
    assert.strictEqual(result.results[0].won, true);
  });

  it('Street bet pays 11:1', () => {
    const winningPocket = getPocketInfo(1);
    const bets: RouletteBet[] = [
      {
        id: 'street-1-2-3',
        type: 'street',
        label: 'Street 1-2-3',
        numbers: [1, 2, 3],
        amount: 10,
        payoutMultiplier: PAYOUT_RATIOS.street,
      },
    ];

    const result = settleRouletteBets(winningPocket, bets);
    assert.strictEqual(result.totalPayout, 120); // 10 + 110 = 120
    assert.strictEqual(result.netProfit, 110);
  });

  it('Corner bet pays 8:1', () => {
    const winningPocket = getPocketInfo(5);
    const bets: RouletteBet[] = [
      {
        id: 'corner-4-5-7-8',
        type: 'corner',
        label: 'Corner 4,5,7,8',
        numbers: [4, 5, 7, 8],
        amount: 20,
        payoutMultiplier: PAYOUT_RATIOS.corner,
      },
    ];

    const result = settleRouletteBets(winningPocket, bets);
    assert.strictEqual(result.totalPayout, 180); // 20 + 160 = 180
    assert.strictEqual(result.netProfit, 160);
  });

  it('Dozen and Column bets pay 2:1', () => {
    const winningPocket = getPocketInfo(12); // in 1st dozen (1-12) and 3rd column (12 % 3 === 0)
    const bets: RouletteBet[] = [
      {
        id: 'dozen-1',
        type: 'dozen',
        label: '1st 12',
        numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        amount: 50,
        payoutMultiplier: PAYOUT_RATIOS.dozen,
      },
      {
        id: 'column-3',
        type: 'column',
        label: '3rd Column',
        numbers: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
        amount: 30,
        payoutMultiplier: PAYOUT_RATIOS.column,
      },
    ];

    const result = settleRouletteBets(winningPocket, bets);
    assert.strictEqual(result.totalWagered, 80);
    // Dozen 1 pays: 50 + 100 = 150
    // Column 3 pays: 30 + 60 = 90
    assert.strictEqual(result.totalPayout, 240);
    assert.strictEqual(result.netProfit, 160);
  });

  it('Even Money bets (Red/Black, Even/Odd, Low/High) pay 1:1', () => {
    const winningPocket = getPocketInfo(7); // Red, Odd, Low (1-18)
    const bets: RouletteBet[] = [
      {
        id: 'red',
        type: 'red',
        label: 'Red',
        numbers: [...RED_NUMBERS],
        amount: 100,
        payoutMultiplier: PAYOUT_RATIOS.red,
      },
      {
        id: 'odd',
        type: 'odd',
        label: 'Odd',
        numbers: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35],
        amount: 50,
        payoutMultiplier: PAYOUT_RATIOS.odd,
      },
      {
        id: 'even',
        type: 'even',
        label: 'Even',
        numbers: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36],
        amount: 50,
        payoutMultiplier: PAYOUT_RATIOS.even,
      },
    ];

    const result = settleRouletteBets(winningPocket, bets);
    assert.strictEqual(result.totalWagered, 200);
    // Red wins: 100 + 100 = 200
    // Odd wins: 50 + 50 = 100
    // Even loses: 0
    assert.strictEqual(result.totalPayout, 300);
    assert.strictEqual(result.netProfit, 100);
  });

  it('Outside bets lose completely when 0 lands', () => {
    const zeroPocket = getPocketInfo(0);
    const bets: RouletteBet[] = [
      {
        id: 'red',
        type: 'red',
        label: 'Red',
        numbers: [...RED_NUMBERS],
        amount: 100,
        payoutMultiplier: 1,
      },
      {
        id: 'even',
        type: 'even',
        label: 'Even',
        numbers: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36],
        amount: 50,
        payoutMultiplier: 1,
      },
    ];

    const result = settleRouletteBets(zeroPocket, bets);
    assert.strictEqual(result.totalPayout, 0);
    assert.strictEqual(result.netProfit, -150);
  });
});

describe('Roulette Engine - Statistics & History Tracking', () => {
  it('Computes hot/cold numbers and color distributions correctly', () => {
    const history = [
      getPocketInfo(17),
      getPocketInfo(17),
      getPocketInfo(17),
      getPocketInfo(7),
      getPocketInfo(0),
    ];

    const stats = calculateRouletteStatistics(history, 'european');
    assert.strictEqual(stats.totalSpins, 5);
    assert.strictEqual(stats.greenCount, 1);
    assert.strictEqual(stats.greenPercentage, 20); // 1/5 = 20%
    assert.strictEqual(stats.redCount, 1); // 7 is red
    assert.strictEqual(stats.blackCount, 3); // 17 is black (3 times)

    assert.strictEqual(stats.hotNumbers[0].pocket, 17);
    assert.strictEqual(stats.hotNumbers[0].count, 3);
  });

  it('Handles empty history gracefully', () => {
    const stats = calculateRouletteStatistics([], 'european');
    assert.strictEqual(stats.totalSpins, 0);
    assert.strictEqual(stats.redCount, 0);
    assert.strictEqual(stats.hotNumbers.length, 0);
  });
});

describe('Roulette Engine - Deterministic Spin Simulation', () => {
  it('Spins European wheel returning a valid pocket', () => {
    const pocket = spinRoulette('european', 12345);
    assert.ok(EUROPEAN_WHEEL_ORDER.includes(pocket.id));
  });

  it('Spins American wheel returning a valid pocket', () => {
    const pocket = spinRoulette('american', 67890);
    assert.ok(AMERICAN_WHEEL_ORDER.includes(pocket.id));
  });
});
