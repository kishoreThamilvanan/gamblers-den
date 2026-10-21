import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCard,
  createShoe,
  calculateHand,
  getBasicStrategyAction,
  getHiLoValue,
  calculateTrueCount,
  playDealerTurn,
  settleHand,
  BlackjackCard,
  BlackjackHandState,
} from '../lib/blackjack/blackjackEngine';

describe('Blackjack Engine (Vegas Strip S17)', () => {
  it('creates a standard 6-deck shoe with 312 cards and 75% cut card', () => {
    const shoe = createShoe(6);
    assert.equal(shoe.cards.length, 312);
    assert.equal(shoe.totalDecks, 6);
    assert.equal(shoe.cutCardIndex, 234);
    assert.equal(shoe.runningCount, 0);
  });

  describe('Hand Total Calculator', () => {
    it('evaluates hard hands accurately', () => {
      const cards: BlackjackCard[] = [createCard('T', 's'), createCard('7', 'h')];
      const evaluation = calculateHand(cards);
      assert.equal(evaluation.total, 17);
      assert.equal(evaluation.isSoft, false);
      assert.equal(evaluation.isBlackjack, false);
      assert.equal(evaluation.isBusted, false);
    });

    it('identifies Natural Blackjack (Ace + 10-value card on initial 2 cards)', () => {
      const cards: BlackjackCard[] = [createCard('A', 's'), createCard('K', 'd')];
      const evaluation = calculateHand(cards);
      assert.equal(evaluation.total, 21);
      assert.equal(evaluation.isBlackjack, true);
      assert.equal(evaluation.isSoft, true);
    });

    it('distinguishes a 3-card 21 from a Natural Blackjack', () => {
      const cards: BlackjackCard[] = [
        createCard('7', 's'),
        createCard('7', 'd'),
        createCard('7', 'h'),
      ];
      const evaluation = calculateHand(cards);
      assert.equal(evaluation.total, 21);
      assert.equal(evaluation.isBlackjack, false);
      assert.equal(evaluation.is21, true);
    });

    it('handles multiple Aces adjusting from soft to hard', () => {
      // Ace + Ace = soft 12
      const twoAces: BlackjackCard[] = [createCard('A', 's'), createCard('A', 'h')];
      assert.equal(calculateHand(twoAces).total, 12);
      assert.equal(calculateHand(twoAces).isSoft, true);

      // Ace + Ace + 9 = hard 21 (11 + 1 + 9)
      const aceAceNine: BlackjackCard[] = [...twoAces, createCard('9', 'c')];
      assert.equal(calculateHand(aceAceNine).total, 21);
      assert.equal(calculateHand(aceAceNine).isSoft, true);

      // Ace + Ace + 9 + 5 = 1 + 1 + 9 + 5 = 16 (both Aces count as 1)
      const aceAceNineFive: BlackjackCard[] = [...aceAceNine, createCard('5', 'd')];
      assert.equal(calculateHand(aceAceNineFive).total, 16);
      assert.equal(calculateHand(aceAceNineFive).isSoft, false);
    });

    it('detects busted hands', () => {
      const busted: BlackjackCard[] = [
        createCard('T', 's'),
        createCard('8', 'h'),
        createCard('5', 'd'),
      ];
      const evaluation = calculateHand(busted);
      assert.equal(evaluation.total, 23);
      assert.equal(evaluation.isBusted, true);
    });
  });

  describe('Hi-Lo Card Counting Math', () => {
    it('assigns +1 to low cards (2-6)', () => {
      assert.equal(getHiLoValue(createCard('2', 's')), 1);
      assert.equal(getHiLoValue(createCard('6', 'd')), 1);
    });

    it('assigns 0 to neutral cards (7-9)', () => {
      assert.equal(getHiLoValue(createCard('7', 'c')), 0);
      assert.equal(getHiLoValue(createCard('9', 'h')), 0);
    });

    it('assigns -1 to high cards (10, J, Q, K, A)', () => {
      assert.equal(getHiLoValue(createCard('T', 's')), -1);
      assert.equal(getHiLoValue(createCard('J', 'd')), -1);
      assert.equal(getHiLoValue(createCard('A', 'h')), -1);
    });

    it('calculates accurate True Count from Running Count', () => {
      // Running count +6 with 3 decks remaining (156 cards) -> True Count +2.0
      const tc = calculateTrueCount(6, 156);
      assert.equal(tc, 2);

      // Running count +5 with 2 decks remaining (104 cards) -> True Count +2.5
      const tc2 = calculateTrueCount(5, 104);
      assert.equal(tc2, 2.5);
    });
  });

  describe('Basic Strategy Engine', () => {
    const dealerUp2 = createCard('2', 's');
    const dealerUp5 = createCard('5', 's');
    const dealerUp6 = createCard('6', 's');
    const dealerUp9 = createCard('9', 's');
    const dealerUp10 = createCard('T', 's');
    const dealerUpAce = createCard('A', 's');

    it('recommends splitting Aces and 8s always', () => {
      const pairAces = [createCard('A', 's'), createCard('A', 'h')];
      const pairEights = [createCard('8', 's'), createCard('8', 'h')];

      assert.equal(getBasicStrategyAction(pairAces, dealerUpAce), 'split');
      assert.equal(getBasicStrategyAction(pairAces, dealerUp5), 'split');
      assert.equal(getBasicStrategyAction(pairEights, dealerUp10), 'split');
      assert.equal(getBasicStrategyAction(pairEights, dealerUp6), 'split');
    });

    it('recommends standing on 10-10 pair rather than splitting', () => {
      const pairTens = [createCard('T', 's'), createCard('K', 'h')];
      assert.equal(getBasicStrategyAction(pairTens, dealerUp6), 'stand');
    });

    it('recommends doubling 11 vs dealer 2-10', () => {
      const hand11 = [createCard('6', 's'), createCard('5', 'd')];
      assert.equal(getBasicStrategyAction(hand11, dealerUp6), 'double');
      assert.equal(getBasicStrategyAction(hand11, dealerUp10), 'double');
    });

    it('recommends doubling soft 18 (A,7) vs dealer 3-6, standing vs 2/7/8, hitting vs 9/10/A', () => {
      const soft18 = [createCard('A', 's'), createCard('7', 'h')];
      assert.equal(getBasicStrategyAction(soft18, dealerUp5), 'double');
      assert.equal(getBasicStrategyAction(soft18, dealerUp2), 'stand');
      assert.equal(getBasicStrategyAction(soft18, dealerUp9), 'hit');
      assert.equal(getBasicStrategyAction(soft18, dealerUp10), 'hit');
    });

    it('recommends surrendering hard 16 vs 9, 10, A (or hit if surrender not allowed)', () => {
      const hard16 = [createCard('T', 's'), createCard('6', 'h')];
      assert.equal(getBasicStrategyAction(hard16, dealerUp10, true, true, true), 'surrender');
      assert.equal(getBasicStrategyAction(hard16, dealerUp10, true, true, false), 'hit');
      assert.equal(getBasicStrategyAction(hard16, dealerUp5), 'stand');
    });
  });

  describe('Dealer Turn & S17 Rules', () => {
    it('dealer hits until 17 or higher and stands on soft 17', () => {
      // Dealer has A + 6 = soft 17. S17 rules dictate dealer stands.
      const soft17Dealer = [createCard('A', 's'), createCard('6', 'h')];
      const shoe = createShoe(6);
      const result = playDealerTurn(soft17Dealer, shoe);
      assert.equal(calculateHand(result.finalCards).total, 17);
      assert.equal(result.finalCards.length, 2);
    });

    it('dealer hits on 16 and draws at least 1 card', () => {
      const dealer16 = [createCard('T', 's'), createCard('6', 'h')];
      const shoe = createShoe(6);
      const result = playDealerTurn(dealer16, shoe);
      assert.ok(result.finalCards.length >= 3);
      const evalFinal = calculateHand(result.finalCards);
      assert.ok(evalFinal.total >= 17 || evalFinal.isBusted);
    });
  });

  describe('Payout & Settlement Rules', () => {
    it('pays 3:2 on Natural Blackjack', () => {
      const hand: BlackjackHandState = {
        id: 'h1',
        spotIndex: 1,
        cards: [createCard('A', 's'), createCard('K', 'd')],
        bet: 100,
        isDoubled: false,
        isSplit: false,
        isSurrendered: false,
        status: 'blackjack',
      };
      const dealerCards = [createCard('T', 'c'), createCard('9', 'h')]; // Dealer 19
      const settlement = settleHand(hand, dealerCards);

      assert.equal(settlement.result, 'blackjack');
      assert.equal(settlement.netProfit, 150); // 3:2 on $100 = +$150 profit
      assert.equal(settlement.payout, 250); // $100 original bet + $150 profit
    });

    it('pushes when both Player and Dealer have Natural Blackjack', () => {
      const hand: BlackjackHandState = {
        id: 'h1',
        spotIndex: 1,
        cards: [createCard('A', 's'), createCard('K', 'd')],
        bet: 100,
        isDoubled: false,
        isSplit: false,
        isSurrendered: false,
        status: 'blackjack',
      };
      const dealerCards = [createCard('A', 'c'), createCard('Q', 'h')]; // Dealer BJ
      const settlement = settleHand(hand, dealerCards);

      assert.equal(settlement.result, 'push');
      assert.equal(settlement.netProfit, 0);
      assert.equal(settlement.payout, 100);
    });

    it('pays 1:1 on normal win against dealer', () => {
      const hand: BlackjackHandState = {
        id: 'h1',
        spotIndex: 1,
        cards: [createCard('T', 's'), createCard('9', 'd')], // 19
        bet: 50,
        isDoubled: false,
        isSplit: false,
        isSurrendered: false,
        status: 'stood',
      };
      const dealerCards = [createCard('T', 'c'), createCard('8', 'h')]; // Dealer 18
      const settlement = settleHand(hand, dealerCards);

      assert.equal(settlement.result, 'win');
      assert.equal(settlement.netProfit, 50);
      assert.equal(settlement.payout, 100);
    });

    it('refunds 50% on Late Surrender', () => {
      const hand: BlackjackHandState = {
        id: 'h1',
        spotIndex: 1,
        cards: [createCard('T', 's'), createCard('6', 'd')],
        bet: 100,
        isDoubled: false,
        isSplit: false,
        isSurrendered: true,
        status: 'settled',
      };
      const dealerCards = [createCard('T', 'c'), createCard('7', 'h')];
      const settlement = settleHand(hand, dealerCards);

      assert.equal(settlement.result, 'loss');
      assert.equal(settlement.netProfit, -50);
      assert.equal(settlement.payout, 50);
    });
  });
});
