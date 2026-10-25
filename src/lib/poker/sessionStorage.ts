import { GameSession } from './types';
import {
  getSavedSessions as getGenericSavedSessions,
  saveSession as genericSaveSession,
  deleteSession as genericDeleteSession,
} from '@/lib/sessions/sessionManager';

export const MAX_SAVED_SESSIONS = 5;

/**
 * Safely retrieve saved poker sessions from localStorage, sorted by lastPlayedAt descending.
 */
export function getSavedSessions(): GameSession[] {
  return getGenericSavedSessions<GameSession>('poker');
}

/**
 * Save or update a poker session. Enforces a maximum cap of 5 sessions,
 * dropping the least recently played session when adding a 6th.
 */
export function saveSessionToStorage(session: GameSession): GameSession[] {
  return genericSaveSession<GameSession>('poker', session);
}

/**
 * Delete a specific poker session by ID.
 */
export function deleteSessionFromStorage(sessionId: string): GameSession[] {
  return genericDeleteSession<GameSession>('poker', sessionId);
}

/**
 * Retrieve a specific poker session by ID.
 */
export function getSessionById(sessionId: string): GameSession | null {
  const sessions = getSavedSessions();
  return sessions.find((s) => s.id === sessionId) || null;
}
