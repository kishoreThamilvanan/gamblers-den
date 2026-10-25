import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSavedSessions,
  saveSession,
  deleteSession,
  clearSessions,
} from '../lib/sessions/sessionManager';
import { BlackjackSession, RouletteSession } from '../lib/sessions/types';

// In-memory mock for localStorage in Node test runner
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe('Multi-Game Session Manager (src/lib/sessions/sessionManager.ts)', () => {
  beforeEach(() => {
    (globalThis as unknown as { window: unknown; localStorage: unknown }).window = {} as unknown as Window & typeof globalThis;
    (globalThis as unknown as { window: unknown; localStorage: unknown }).localStorage = new LocalStorageMock();
  });

  it('Blackjack: saves, retrieves, and enforces 5-session cap with LRU eviction', () => {
    const makeBJSession = (id: string, rounds: number, bankroll: number): BlackjackSession => ({
      id,
      gameType: 'blackjack',
      createdAt: Date.now() - 10000 + rounds * 1000,
      lastPlayedAt: Date.now() - 10000 + rounds * 1000,
      handsPlayed: rounds,
      tableBankroll: bankroll,
      bankroll,
      config: {
        stakesTier: 'regular',
        minBet: 25,
        maxBet: 1000,
        spotCount: 3,
        autoFillBots: true,
        deckCount: 6,
        trainingMode: 'standard',
      },
      spots: [
        { id: 'spot-1', seatNumber: 1, bet: 25, isBot: false },
        { id: 'spot-2', seatNumber: 2, bet: 50, isBot: true, botName: 'Vegas Lou' },
      ],
      recentOutcomes: [
        { roundNumber: rounds, dealerTotal: 19, dealerBust: false, netHeroProfit: 25, timestamp: Date.now() },
      ],
    });

    // 1. Initial retrieval should be empty
    assert.deepEqual(getSavedSessions<BlackjackSession>('blackjack'), []);

    // 2. Save 6 sessions sequentially
    for (let i = 1; i <= 6; i++) {
      saveSession<BlackjackSession>('blackjack', makeBJSession(`bj-${i}`, i, 1000 + i * 100));
    }

    const saved = getSavedSessions<BlackjackSession>('blackjack');
    assert.equal(saved.length, 5, 'Should enforce strict MAX_SAVED_SESSIONS (5) cap');
    // Most recent is bj-6, oldest retained is bj-2; bj-1 was evicted
    assert.equal(saved[0].id, 'bj-6');
    assert.equal(saved[4].id, 'bj-2');
    assert.equal(saved.some((s) => s.id === 'bj-1'), false, 'bj-1 should have been evicted');

    // 3. Delete a specific session
    const afterDelete = deleteSession<BlackjackSession>('blackjack', 'bj-4');
    assert.equal(afterDelete.length, 4);
    assert.equal(afterDelete.some((s) => s.id === 'bj-4'), false);
  });

  it('Roulette: saves, updates in-place, and clears sessions cleanly', () => {
    const rSession: RouletteSession = {
      id: 'roulette-alpha',
      gameType: 'roulette',
      createdAt: Date.now() - 5000,
      lastPlayedAt: Date.now() - 5000,
      handsPlayed: 14,
      tableBankroll: 1250,
      bankroll: 1250,
      totalWagered: 500,
      totalWon: 750,
      config: {
        variant: 'european',
        stakesTier: 'vip',
        minBet: 25,
        maxBet: 2500,
        betTimerSeconds: 15,
        buyInAmount: 1000,
      },
      recentNumbers: [
        { pocket: 17, color: 'black', timestamp: Date.now() - 2000 },
        { pocket: 32, color: 'red', timestamp: Date.now() - 1000 },
      ],
    };

    saveSession<RouletteSession>('roulette', rSession);
    const retrieved = getSavedSessions<RouletteSession>('roulette');
    assert.equal(retrieved.length, 1);
    assert.equal(retrieved[0].id, 'roulette-alpha');
    assert.equal(retrieved[0].config.variant, 'european');

    // Update in-place with new bankroll and spins
    const updatedRSession: RouletteSession = {
      ...rSession,
      handsPlayed: 15,
      bankroll: 1400,
      tableBankroll: 1400,
    };
    saveSession<RouletteSession>('roulette', updatedRSession);
    const afterUpdate = getSavedSessions<RouletteSession>('roulette');
    assert.equal(afterUpdate.length, 1, 'Updating existing session should not duplicate');
    assert.equal(afterUpdate[0].bankroll, 1400);
    assert.equal(afterUpdate[0].handsPlayed, 15);

    // Clear sessions
    clearSessions('roulette');
    assert.deepEqual(getSavedSessions<RouletteSession>('roulette'), []);
  });

  it('handles corrupted localStorage JSON gracefully', () => {
    localStorage.setItem('gamblersden_blackjack_sessions', '{ malformed_json:::');
    const recovered = getSavedSessions<BlackjackSession>('blackjack');
    assert.deepEqual(recovered, [], 'Corrupted JSON should fallback to empty array without throwing');
  });
});
