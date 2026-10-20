import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Deck } from '@/lib/poker/deck';
import type { Card } from '@/types/poker';

describe('Deck Engine (src/lib/poker/deck.ts)', () => {
  it('initializes with exactly 52 unique standard playing cards', () => {
    const deck = new Deck();
    const cards = deck.getCards();
    assert.equal(cards.length, 52);

    const uniqueKeys = new Set(cards.map((c) => `${c.rank}${c.suit}`));
    assert.equal(uniqueKeys.size, 52, 'All 52 cards must be unique');
  });

  it('contains 13 cards of each of the 4 suits (h, d, c, s)', () => {
    const deck = new Deck();
    const cards = deck.getCards();
    for (const suit of ['h', 'd', 'c', 's'] as const) {
      const suitCards = cards.filter((c) => c.suit === suit);
      assert.equal(suitCards.length, 13, `Expected 13 cards for suit ${suit}`);
    }
  });

  it('draws single and multiple cards and reduces remaining count', () => {
    const deck = new Deck();
    const firstCard = deck.draw();
    assert.ok(firstCard);
    assert.equal(deck.getCards().length, 51);

    const holeCards = deck.drawMultiple(2);
    assert.equal(holeCards.length, 2);
    assert.equal(deck.getCards().length, 49);
  });

  it('returns undefined when drawing from an exhausted deck', () => {
    const deck = new Deck();
    const allCards = deck.drawMultiple(52);
    assert.equal(allCards.length, 52);
    assert.equal(deck.getCards().length, 0);

    const extraCard = deck.draw();
    assert.equal(extraCard, undefined);
    assert.deepEqual(deck.drawMultiple(5), []);
  });

  it('resets back to a full 52-card shuffled deck after depletion', () => {
    const deck = new Deck();
    deck.drawMultiple(30);
    assert.equal(deck.getCards().length, 22);

    deck.reset();
    assert.equal(deck.getCards().length, 52);
  });

  it('preserves card integrity when saving and loading custom deck state', () => {
    const deck = new Deck();
    const customState: Card[] = [
      { rank: 'A', suit: 's' },
      { rank: 'K', suit: 'h' },
      { rank: 'Q', suit: 'd' },
    ];
    deck.loadCards(customState);

    assert.equal(deck.getCards().length, 3);
    const drawn = deck.draw();
    assert.deepEqual(drawn, { rank: 'Q', suit: 'd' });
    assert.equal(deck.getCards().length, 2);
  });
});
