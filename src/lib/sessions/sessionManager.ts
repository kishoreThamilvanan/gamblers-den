import {
  MAX_SAVED_SESSIONS,
  SupportedGameType,
  PokerSession,
  BlackjackSession,
  RouletteSession,
} from './types';

const STORAGE_KEYS: Record<SupportedGameType, string> = {
  poker: 'gamblersden_saved_sessions',
  blackjack: 'gamblersden_blackjack_sessions',
  roulette: 'gamblersden_roulette_sessions',
};

const LEGACY_STORAGE_KEYS: Partial<Record<SupportedGameType, string>> = {
  poker: 'feltsense_saved_sessions',
};

/**
 * Retrieve saved sessions for a given game type, sorted by lastPlayedAt descending.
 */
export function getSavedSessions<T = PokerSession | BlackjackSession | RouletteSession>(
  gameType: SupportedGameType
): T[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const key = STORAGE_KEYS[gameType];
    let raw = localStorage.getItem(key);

    // Check legacy key migration if primary key is empty
    const legacyKey = LEGACY_STORAGE_KEYS[gameType];
    if (!raw && legacyKey) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) {
        raw = legacyRaw;
        try {
          localStorage.setItem(key, legacyRaw);
          localStorage.removeItem(legacyKey);
        } catch {
          // ignore migration write failures
        }
      }
    }

    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.sort(
      (a: { lastPlayedAt?: number }, b: { lastPlayedAt?: number }) =>
        (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0)
    ) as T[];
  } catch (err) {
    console.error(`Failed to parse saved sessions for ${gameType} from localStorage:`, err);
    return [];
  }
}

/**
 * Save or update a session for a given game type.
 * Enforces a strict maximum cap of 5 sessions, dropping the least recently played session on adding a 6th.
 */
export function saveSession<T extends { id: string; lastPlayedAt?: number }>(
  gameType: SupportedGameType,
  session: T
): T[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const key = STORAGE_KEYS[gameType];
    const existing = getSavedSessions<T>(gameType);
    const index = existing.findIndex((s) => s.id === session.id);

    const updatedSession: T = {
      ...session,
      lastPlayedAt: Date.now(),
    };

    let updatedList: T[];
    if (index >= 0) {
      updatedList = [...existing];
      updatedList[index] = updatedSession;
    } else {
      updatedList = [updatedSession, ...existing];
    }

    // Sort by lastPlayedAt descending
    updatedList.sort(
      (a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0)
    );

    // Enforce MAX_SAVED_SESSIONS (5) cap
    const trimmedList = updatedList.slice(0, MAX_SAVED_SESSIONS);

    localStorage.setItem(key, JSON.stringify(trimmedList));
    return trimmedList;
  } catch (err) {
    console.error(`Failed to save session for ${gameType} to localStorage:`, err);
    return [];
  }
}

/**
 * Delete a specific session by ID for a given game type.
 */
export function deleteSession<T extends { id: string }>(
  gameType: SupportedGameType,
  sessionId: string
): T[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const key = STORAGE_KEYS[gameType];
    const existing = getSavedSessions<T>(gameType);
    const updated = existing.filter((s) => s.id !== sessionId);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error(`Failed to delete session ${sessionId} for ${gameType} from localStorage:`, err);
    return [];
  }
}

/**
 * Clear all sessions for a specific game type.
 */
export function clearSessions(gameType: SupportedGameType): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const key = STORAGE_KEYS[gameType];
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`Failed to clear sessions for ${gameType} from localStorage:`, err);
  }
}
