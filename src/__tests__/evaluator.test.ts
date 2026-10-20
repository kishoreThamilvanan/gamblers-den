import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateHand, HandRank } from '@/lib/poker/evaluator';
import type { Card } from '@/types/poker';

const parseCards = (str: string): Card[] =>
  str
    .trim()
    .split(/\s+/)
    .map((token) => ({
      rank: token[0] as Card['rank'],
      suit: token[1] as Card['suit'],
    }));

describe('Hand Evaluator (src/lib/poker/evaluator.ts)', () => {
  it('handles incomplete hands (< 5 cards) gracefully', () => {
    const res = evaluateHand(parseCards('As Ah'));
    assert.equal(res.rank, HandRank.HighCard);
    assert.equal(res.name, 'Incomplete');
    assert.equal(res.value, 0);
  });

  it('identifies a Royal Flush', () => {
    const cards = parseCards('Ah Kh Qh Jh Th 2c 3d');
    const res = evaluateHand(cards);
    assert.equal(res.rank, HandRank.RoyalFlush);
    assert.equal(res.name, 'Royal Flush');
  });

  it('identifies a Straight Flush and ranks higher Straight Flush above lower', () => {
    const highSF = evaluateHand(parseCards('9s 8s 7s 6s 5s Kd 2c'));
    const lowSF = evaluateHand(parseCards('8s 7s 6s 5s 4s Ah Kd'));

    assert.equal(highSF.rank, HandRank.StraightFlush);
    assert.equal(lowSF.rank, HandRank.StraightFlush);
    assert.ok(highSF.value > lowSF.value);
  });

  it('identifies Four of a Kind and compares kickers', () => {
    const quadsAceKicker = evaluateHand(parseCards('Ts Td Tc Th As 2c 3d'));
    const quadsKingKicker = evaluateHand(parseCards('Ts Td Tc Th Ks Qc Jd'));

    assert.equal(quadsAceKicker.rank, HandRank.FourOfAKind);
    assert.equal(quadsAceKicker.name, 'Four of a Kind');
    assert.ok(quadsAceKicker.value > quadsKingKicker.value);
  });

  it('identifies Full House including 7-card boards with two sets of trips', () => {
    const kingsFull = evaluateHand(parseCards('Ks Kd Kc Qs Qd Jh 2c'));
    const queensFull = evaluateHand(parseCards('Qs Qd Qc Ks Kd Ah 2c'));
    const doubleTrips = evaluateHand(parseCards('As Ad Ac Ks Kd Kc 2h'));

    assert.equal(kingsFull.rank, HandRank.FullHouse);
    assert.equal(doubleTrips.rank, HandRank.FullHouse);
    assert.ok(kingsFull.value > queensFull.value);
    assert.ok(doubleTrips.value > kingsFull.value);
  });

  it('identifies Flush and uses top 5 suited cards for tie-breaking', () => {
    const aceHighFlush = evaluateHand(parseCards('Ah Jh 9h 6h 3h 2h Ks'));
    const kingHighFlush = evaluateHand(parseCards('Kh Qh Jh 9h 8h As Ac'));

    assert.equal(aceHighFlush.rank, HandRank.Flush);
    assert.equal(kingHighFlush.rank, HandRank.Flush);
    assert.ok(aceHighFlush.value > kingHighFlush.value);
  });

  it('identifies Broadway Straight (A-K-Q-J-T) and Wheel Straight (5-4-3-2-A)', () => {
    const broadway = evaluateHand(parseCards('As Kd Qh Jc Ts 4h 2d'));
    const wheel = evaluateHand(parseCards('As 5d 4h 3c 2s Kh Qd'));

    assert.equal(broadway.rank, HandRank.Straight);
    assert.equal(wheel.rank, HandRank.Straight);
    assert.ok(broadway.value > wheel.value, 'Broadway straight must beat 5-high wheel straight');
  });

  it('identifies Three of a Kind and compares kickers accurately', () => {
    const tripsHighKicker = evaluateHand(parseCards('8s 8d 8h As Kc 3d 2c'));
    const tripsLowKicker = evaluateHand(parseCards('8s 8d 8h Qs Jc 3d 2c'));

    assert.equal(tripsHighKicker.rank, HandRank.ThreeOfAKind);
    assert.ok(tripsHighKicker.value > tripsLowKicker.value);
  });

  it('identifies Two Pair and selects best two pairs when 3 pairs exist on 7 cards', () => {
    const acesAndKings = evaluateHand(parseCards('As Ad Ks Kd 5s 5c Qh'));
    const kingsAndQueens = evaluateHand(parseCards('Ks Kd Qs Qd Js Jc Ah'));

    assert.equal(acesAndKings.rank, HandRank.TwoPair);
    assert.equal(kingsAndQueens.rank, HandRank.TwoPair);
    assert.ok(acesAndKings.value > kingsAndQueens.value);
  });

  it('identifies One Pair and breaks ties using 3 kickers', () => {
    const pairAcesKingKicker = evaluateHand(parseCards('As Ad Kh Qc 9s 4d 2c'));
    const pairAcesQueenKicker = evaluateHand(parseCards('As Ad Qh Jc 9s 4d 2c'));

    assert.equal(pairAcesKingKicker.rank, HandRank.Pair);
    assert.ok(pairAcesKingKicker.value > pairAcesQueenKicker.value);
  });

  it('enforces strict global hierarchy across all 10 hand ranks', () => {
    const hands = [
      evaluateHand(parseCards('Ah Kd Qs Jc 9h 4d 2c')), // High Card
      evaluateHand(parseCards('Ah Ad Ks Qc Jh 4d 2c')), // Pair
      evaluateHand(parseCards('Ah Ad Ks Kd Qh 4d 2c')), // Two Pair
      evaluateHand(parseCards('Ah Ad As Kc Qh 4d 2c')), // Three of a Kind
      evaluateHand(parseCards('Ah Kd Qs Jc Th 4d 2c')), // Straight
      evaluateHand(parseCards('Ah Qh 9h 6h 2h Kd Qc')), // Flush
      evaluateHand(parseCards('Ah Ad As Kc Kd 4d 2c')), // Full House
      evaluateHand(parseCards('Ah Ad As Ac Kd 4d 2c')), // Four of a Kind
      evaluateHand(parseCards('9h 8h 7h 6h 5h Kd Qc')), // Straight Flush
      evaluateHand(parseCards('Ah Kh Qh Jh Th 4d 2c')), // Royal Flush
    ];

    for (let i = 1; i < hands.length; i++) {
      assert.ok(
        hands[i].value > hands[i - 1].value,
        `Expected ${hands[i].name} (${hands[i].value}) > ${hands[i - 1].name} (${hands[i - 1].value})`
      );
    }
  });
});
