import { GameSession } from './types';

const STORAGE_KEY = 'gamblersden_saved_sessions';
const LEGACY_STORAGE_KEY = 'feltsense_saved_sessions';
export const MAX_SAVED_SESSIONS = 5;

/**
 * Safely retrieve saved sessions from localStorage, sorted by lastPlayedAt descending.
 */
export function getSavedSessions(): GameSession[] {
  if (typeof window === 'undefined') return [];
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Legacy fallback migration
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        raw = legacy;
        try {
          localStorage.setItem(STORAGE_KEY, legacy);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
          // ignore storage migration errors
        }
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a: GameSession, b: GameSession) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
  } catch (err) {
    console.error('Failed to parse saved sessions from localStorage:', err);
    return [];
  }
}

/**
 * Save or update a session. Enforces a maximum cap of 5 sessions,
 * dropping the least recently played session when adding a 6th.
 */
export function saveSessionToStorage(session: GameSession): GameSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getSavedSessions();
    const index = existing.findIndex((s) => s.id === session.id);

    const updatedSession: GameSession = {
      ...session,
      lastPlayedAt: Date.now(),
    };

    let updatedList: GameSession[];
    if (index >= 0) {
      updatedList = [...existing];
      updatedList[index] = updatedSession;
    } else {
      updatedList = [updatedSession, ...existing];
    }

    // Sort by lastPlayedAt descending
    updatedList.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);

    // Keep only the most recent MAX_SAVED_SESSIONS (3-5 sessions)
    const trimmedList = updatedList.slice(0, MAX_SAVED_SESSIONS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedList));
    return trimmedList;
  } catch (err) {
    console.error('Failed to save session to localStorage:', err);
    return [];
  }
}

/**
 * Delete a specific session by ID.
 */
export function deleteSessionFromStorage(sessionId: string): GameSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getSavedSessions();
    const filtered = existing.filter((s) => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.error('Failed to delete session from localStorage:', err);
    return [];
  }
}

/**
 * Retrieve a specific session by ID.
 */
export function getSessionById(sessionId: string): GameSession | null {
  const sessions = getSavedSessions();
  return sessions.find((s) => s.id === sessionId) || null;
}
