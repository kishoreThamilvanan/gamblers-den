import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePotOdds,
  calculateMDF,
  evaluateAction,
  getProactiveAdvice,
} from '@/lib/poker/coach';
import type { Card } from '@/types/poker';

const parseCards = (str: string): Card[] =>
  str
    .trim()
    .split(/\s+/)
    .map((token) => ({
      rank: token[0] as Card['rank'],
      suit: token[1] as Card['suit'],
    }));

describe('Coaching & Exploitative Strategy Engine (src/lib/poker/coach.ts)', () => {
  describe('Pot Odds & MDF Math', () => {
    it('returns 0% pot odds and 100% MDF when facing no bet', () => {
      assert.equal(calculatePotOdds(0, 20), 0);
      assert.equal(calculateMDF(0, 20), 100);
    });

    it('calculates pot odds and MDF accurately for a half-pot bet', () => {
      // Pot = $20, Bet/Call = $10 -> Total Pot after call = $30 -> 10/30 = 33%
      assert.equal(calculatePotOdds(10, 20), 33);
      // MDF = 20 / (20 + 10) = 67%
      assert.equal(calculateMDF(10, 20), 67);
    });

    it('calculates pot odds and MDF accurately for a full-pot bet', () => {
      // Pot = $20, Bet/Call = $20 -> 20/40 = 50%
      assert.equal(calculatePotOdds(20, 20), 50);
      assert.equal(calculateMDF(20, 20), 50);
    });
  });

  describe('Post-Action Evaluation Rules (evaluateAction)', () => {
    it('Rule 1: flags undersized 2x ($4-$5) preflop opens as a Leak', () => {
      const holeCards = parseCards('As Kh');
      const feedback = evaluateAction(
        holeCards,
        [],
        'PREFLOP',
        'CO',
        'raise',
        4,
        3,
        0,
        2,
        0
      );
      assert.equal(feedback.rating, 'Leak');
      assert.match(feedback.explanation, /Under-sizing open/i);
    });

    it('Rule 1: rewards standard 4x-5x ($8-$10) preflop opens with strong hands as Optimal', () => {
      const holeCards = parseCards('As Kh');
      const feedback = evaluateAction(
        holeCards,
        [],
        'PREFLOP',
        'CO',
        'raise',
        10,
        3,
        0,
        2,
        0
      );
      assert.equal(feedback.rating, 'Optimal');
      assert.ok(feedback.evLossEstimate > 0);
    });

    it('Rule 2: flags open-limping or over-limping playable hands on the Button as a Blunder', () => {
      const holeCards = parseCards('Ks Qs');
      const feedback = evaluateAction(
        holeCards,
        [],
        'PREFLOP',
        'BTN',
        'call',
        2,
        5,
        1,
        2,
        0
      );
      assert.equal(feedback.rating, 'Blunder');
      assert.match(feedback.explanation, /Never open-limp or over-limp/i);
    });

    it('Rule 2: flags light isolation raises over multiple limpers with negative EV warning', () => {
      const holeCards = parseCards('Ah Qh');
      // 2 limpers ahead -> target iso is $8 + 2*$2 = $12; raising to $6 is light
      const feedback = evaluateAction(
        holeCards,
        [],
        'PREFLOP',
        'BTN',
        'raise',
        6,
        7,
        2,
        2,
        0
      );
      assert.equal(feedback.rating, 'Acceptable');
      assert.ok(feedback.evLossEstimate < 0);
      assert.match(feedback.explanation, /limper/i);
    });

    it('Rule 3: flags calling large river bets ($16+) with one pair as a Leak', () => {
      const holeCards = parseCards('As Tc');
      const board = parseCards('Ah 9d 7s 4c 2h'); // One Pair of Aces
      const feedback = evaluateAction(
        holeCards,
        board,
        'RIVER',
        'BTN',
        'call',
        25,
        40,
        0,
        25,
        0
      );
      assert.equal(feedback.rating, 'Leak');
      assert.match(feedback.explanation, /under-bluff river raises/i);
    });

    it('Rule 3: rewards folding one pair to heavy river aggression as Optimal', () => {
      const holeCards = parseCards('As Tc');
      const board = parseCards('Ah 9d 7s 4c 2h');
      const feedback = evaluateAction(
        holeCards,
        board,
        'RIVER',
        'BTN',
        'fold',
        0,
        40,
        0,
        25,
        0
      );
      assert.equal(feedback.rating, 'Optimal');
    });

    it('flags checking back a Flush or better on the River as a value Leak', () => {
      const holeCards = parseCards('Ah Qh');
      const board = parseCards('Kh 9h 4h 2c 7d'); // Nut Flush
      const feedback = evaluateAction(
        holeCards,
        board,
        'RIVER',
        'BTN',
        'check',
        0,
        30,
        0,
        0,
        0
      );
      assert.equal(feedback.rating, 'Leak');
      assert.match(feedback.explanation, /forfeits crucial river value/i);
    });
  });

  describe('Proactive Real-Time AI Coach (getProactiveAdvice)', () => {
    it('recommends raising with premium pocket pairs (AA) preflop', () => {
      const advice = getProactiveAdvice(
        parseCards('As Ah'),
        [],
        'PREFLOP',
        'BTN',
        2,   // currentBet
        0,   // heroCurrentBet
        3,   // pot
        0,   // limpersCount
        200  // heroStack
      );
      assert.ok(advice);
      assert.equal(advice.action, 'raise');
      assert.ok(advice.recommendedAmount >= 8);
      assert.ok(advice.equityPercent >= 70);
      assert.equal(advice.badge, 'Value Bet');
    });

    it('recommends 3-betting with AA when facing an open raise preflop', () => {
      const advice = getProactiveAdvice(
        parseCards('As Ah'),
        [],
        'PREFLOP',
        'BTN',
        10,  // currentBet
        0,   // heroCurrentBet
        13,  // pot
        0,   // limpersCount
        200  // heroStack
      );
      assert.ok(advice);
      assert.equal(advice.action, 'raise');
      assert.equal(advice.recommendedAmount, 30);
      assert.equal(advice.badge, 'Pure Value');
    });

    it('recommends folding weak offsuit trash (72o) preflop when facing a bet', () => {
      const advice = getProactiveAdvice(
        parseCards('7s 2d'),
        [],
        'PREFLOP',
        'UTG',
        2,   // currentBet
        0,   // heroCurrentBet
        3,   // pot
        0,   // limpersCount
        200  // heroStack
      );
      assert.ok(advice);
      assert.equal(advice.action, 'fold');
      assert.equal(advice.recommendedAmount, 0);
    });

    it('recommends value betting postflop with a monster hand (Three of a Kind+) when checked to', () => {
      const advice = getProactiveAdvice(
        parseCards('9s 9h'),
        parseCards('9d 6c 2s'),
        'FLOP',
        'BTN',
        0,   // currentBet
        0,   // heroCurrentBet
        20,  // pot
        0,   // limpersCount
        190  // heroStack
      );
      assert.ok(advice);
      assert.equal(advice.action, 'bet');
      assert.ok(advice.recommendedAmount > 0);
      assert.equal(advice.badge, 'Pure Value');
    });

    it('recommends folding one pair on the river when facing a >75% pot bet', () => {
      const advice = getProactiveAdvice(
        parseCards('As Kd'),
        parseCards('Ah 9s 7c 4d 2h'),
        'RIVER',
        'CO',
        35,  // currentBet
        0,   // heroCurrentBet
        40,  // pot
        0,   // limpersCount
        160  // heroStack
      );
      assert.ok(advice);
      assert.equal(advice.action, 'fold');
      assert.equal(advice.badge, 'Check / Fold');
    });
  });
});
