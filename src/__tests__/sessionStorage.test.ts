import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSavedSessions,
  saveSessionToStorage,
  deleteSessionFromStorage,
  getSessionById,
  MAX_SAVED_SESSIONS,
} from '@/lib/poker/sessionStorage';
import type { GameSession } from '@/types/poker';

// Setup an in-memory localStorage mock for Node test environment
const memoryStore = new Map<string, string>();
Object.defineProperty(globalThis, 'window', {
  value: globalThis,
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, val: string) => memoryStore.set(key, val),
    removeItem: (key: string) => memoryStore.delete(key),
    clear: () => memoryStore.clear(),
  },
  configurable: true,
  writable: true,
});

function createMockSession(id: string, handsPlayed = 1): GameSession {
  return {
    id,
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    stakes: '$1/$2 NL',
    handsPlayed,
    phase: 'PREFLOP',
    players: [],
    dealerIndex: 0,
    activePlayerIndex: 0,
    communityCards: [],
    pot: 3,
    currentBet: 2,
    minRaise: 2,
    logs: [],
    remainingCards: [],
    heroSeatIndex: 0,
  };
}

describe('Session Persistence (src/lib/poker/sessionStorage.ts)', () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  it('returns empty array when no sessions exist in localStorage', () => {
    assert.deepEqual(getSavedSessions(), []);
  });

  it('saves and retrieves a game session by ID', () => {
    const s1 = createMockSession('session-1', 5);
    saveSessionToStorage(s1);

    const saved = getSavedSessions();
    assert.equal(saved.length, 1);
    assert.equal(saved[0].id, 'session-1');
    assert.equal(saved[0].handsPlayed, 5);

    const found = getSessionById('session-1');
    assert.ok(found);
    assert.equal(found.handsPlayed, 5);
  });

  it('updates an existing session in-place without creating duplicate entries', () => {
    const s1 = createMockSession('session-1', 2);
    saveSessionToStorage(s1);

    const updated = { ...s1, handsPlayed: 14, pot: 45 };
    saveSessionToStorage(updated);

    const list = getSavedSessions();
    assert.equal(list.length, 1);
    assert.equal(list[0].handsPlayed, 14);
    assert.equal(list[0].pot, 45);
  });

  it('enforces MAX_SAVED_SESSIONS (5) cap by dropping oldest sessions', () => {
    for (let i = 1; i <= 7; i++) {
      const s = createMockSession(`session-${i}`, i);
      saveSessionToStorage(s);
    }

    const list = getSavedSessions();
    assert.equal(list.length, MAX_SAVED_SESSIONS);
  });

  it('deletes a specific session by ID', () => {
    saveSessionToStorage(createMockSession('session-a', 1));
    saveSessionToStorage(createMockSession('session-b', 2));

    const afterDelete = deleteSessionFromStorage('session-a');
    assert.equal(afterDelete.length, 1);
    assert.equal(afterDelete[0].id, 'session-b');
    assert.equal(getSessionById('session-a'), null);
  });

  it('recovers gracefully if localStorage contains corrupted JSON', () => {
    memoryStore.set('feltsense_saved_sessions', '{not-valid-json');
    const list = getSavedSessions();
    assert.deepEqual(list, []);
  });
});
