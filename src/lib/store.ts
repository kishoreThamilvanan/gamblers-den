import { create } from 'zustand';
import {
  GameState,
  Player,
  Position,
  Phase,
  ViewMode,
  DisplayView,
  TableTheme,
  GameSession,
  CoachingFeedback,
  SessionStats,
  BotPersona,
  GameSpeed,
  HandResult,
  TableActionEvent,
  TableConfig,
  PreActionSelection,
  HandHistoryRecord,
  HandHistoryStep,
  LeakEntry,
  Card,
  UserProfile,
  AuthProviderType
} from './poker/types';
import { Deck } from './poker/deck';
import { BOT_PERSONAS } from './poker/personas';
import { evaluateAction, getProactiveAdvice } from './poker/coach';
import { evaluateHand } from './poker/evaluator';
import { sound } from './sound/soundSystem';
import {
  getSavedSessions,
  saveSessionToStorage,
  deleteSessionFromStorage,
  getSessionById
} from './poker/sessionStorage';
import {
  getStoredUserProfile,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInAsGuest,
  signInWithPasskey,
  registerPasskeyForUser,
  removePasskeyFromUser,
  upgradeGuestProfile,
  updateUserTableIdentity,
  recordSessionPreferenceToUserProfile,
  recordDeltaToUserProfile,
  signOutStoredUser,
  verifyCurrentUserEmail,
  resendVerificationEmail
} from './auth/authService';

const getSpeedMultiplier = (speed: GameSpeed = 'relaxed') => {
  if (speed === 'relaxed') return 2.0; // 2x delay for comfortably paced learning
  if (speed === 'normal') return 1.3;
  return 0.7; // Fast drills
};

const getStreetTransitionDelay = (speed: GameSpeed = 'relaxed') => {
  if (speed === 'relaxed') return 1800; // 1.8s delay between street cards
  if (speed === 'normal') return 1200;
  return 600;
};

let aiTimeoutId: ReturnType<typeof setTimeout> | null = null;

const clearAITimeout = () => {
  if (aiTimeoutId) {
    clearTimeout(aiTimeoutId);
    aiTimeoutId = null;
  }
};

const POSITIONS_9MAX: Position[] = ['UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const POSITIONS_6MAX: Position[] = ['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const POSITIONS_2MAX: Position[] = ['BTN', 'BB'];

export function getPositionsForTableSize(size: number): Position[] {
  if (size === 2) return POSITIONS_2MAX;
  if (size === 6) return POSITIONS_6MAX;
  return POSITIONS_9MAX;
}

const AVATAR_URLS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
];

export const DEFAULT_TABLE_CONFIG: TableConfig = {
  tableSize: 9,
  buyInAmount: 200,
  maxRebuys: 3,
  difficulty: 'beginner',
  gameMode: 'cash',
};

const getPersonasForDifficulty = (difficulty: TableConfig['difficulty']): BotPersona[] => {
  if (difficulty === 'beginner') {
    // Recreational heavy lineup (Calling Stations + Aggro-Fish + 1 Nit)
    const order = ['big-mike', 'lucky-larry', 'mad-dog-danny', 'vegas-vic', 'tony-two-times', 'ice-cold-igor', 'sophia-chen', 'sarah-the-shark'];
    return order.map((id) => BOT_PERSONAS.find((b) => b.id === id)!).filter(Boolean);
  }
  if (difficulty === 'advanced') {
    // Tough shark & grinder lineup
    const order = ['sarah-the-shark', 'sophia-chen', 'tony-two-times', 'ice-cold-igor', 'mad-dog-danny', 'vegas-vic', 'big-mike', 'lucky-larry'];
    return order.map((id) => BOT_PERSONAS.find((b) => b.id === id)!).filter(Boolean);
  }
  return BOT_PERSONAS;
};

const createInitialPlayers = (
  heroSeatIndex: number,
  config: TableConfig = DEFAULT_TABLE_CONFIG,
  userProfile?: UserProfile | null
): Player[] => {
  const count = config.tableSize;
  const posList = getPositionsForTableSize(count);
  const personas = getPersonasForDifficulty(config.difficulty);
  let botIdx = 0;

  return Array.from({ length: count }).map((_, i) => {
    if (i === heroSeatIndex) {
      return {
        id: `p${i}`,
        name: userProfile ? `${userProfile.nickname} (You)` : 'Hero (You)',
        nickname: userProfile ? userProfile.nickname : 'You',
        seatIndex: i,
        position: posList[i % posList.length],
        stack: config.buyInAmount,
        holeCards: [],
        isActive: true,
        hasFolded: false,
        isAllIn: false,
        currentBet: 0,
        archetype: 'Hero',
        avatarUrl: userProfile?.avatarUrl || AVATAR_URLS[0],
        isThinking: false,
        lastAction: null
      };
    }
    const persona: BotPersona = personas[botIdx % personas.length];
    botIdx++;
    return {
      id: `p${i}`,
      name: persona.name,
      nickname: persona.nickname,
      personaId: persona.id,
      seatIndex: i,
      position: posList[i % posList.length],
      stack: config.buyInAmount,
      holeCards: [],
      isActive: true,
      hasFolded: false,
      isAllIn: false,
      currentBet: 0,
      archetype: persona.archetype,
      avatarUrl: AVATAR_URLS[(i + 1) % AVATAR_URLS.length],
      isThinking: false,
      lastAction: null
    };
  });
};

const LIMP_DRILL_HANDS: [Card, Card][] = [
  [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 'h' }],
  [{ rank: 'A', suit: 'h' }, { rank: 'Q', suit: 'h' }],
  [{ rank: 'K', suit: 's' }, { rank: 'Q', suit: 's' }],
  [{ rank: 'A', suit: 'd' }, { rank: 'J', suit: 'c' }],
  [{ rank: 'J', suit: 's' }, { rank: 'J', suit: 'd' }],
  [{ rank: 'T', suit: 'h' }, { rank: 'T', suit: 'c' }],
  [{ rank: '9', suit: 's' }, { rank: '9', suit: 'h' }],
  [{ rank: 'Q', suit: 'h' }, { rank: 'J', suit: 'h' }],
];

interface PokerStore extends GameState {
  viewMode: ViewMode;
  displayView: DisplayView;
  tableTheme: TableTheme;
  alwaysRevealHoleCards: boolean;
  soundMuted: boolean;
  ambientPlaying: boolean;
  soundVolume: number;
  currentFeedback: CoachingFeedback | null;
  sessionStats: SessionStats;

  currentSessionId: string | null;
  handsPlayed: number;
  lastAutoSavedAt: number | null;
  savedSessions: GameSession[];
  deck: Deck;
  heroSeatIndex: number;
  gameSpeed: GameSpeed;
  lastHandResult: HandResult | null;
  lastActionEvent: TableActionEvent | null;

  // User Account & Profile State
  userProfile: UserProfile | null;

  // Backlog Features: Config, Rebuys, Pre-Actions, Hand History
  tableConfig: TableConfig;
  rebuysUsed: number;
  preAction: PreActionSelection;
  handHistory: HandHistoryRecord[];
  lastHandRecord: HandHistoryRecord | null;
  currentHandSteps: HandHistoryStep[];
  heroStartStackForHand: number;

  // Atmosphere & View Setters
  setDisplayView: (view: DisplayView) => void;
  setTableTheme: (theme: TableTheme) => void;
  setAlwaysRevealHoleCards: (val: boolean) => void;
  toggleMute: () => void;
  toggleAmbient: () => void;
  setVolume: (val: number) => void;
  clearFeedback: () => void;
  setGameSpeed: (speed: GameSpeed) => void;
  setTableConfig: (partial: Partial<TableConfig>) => void;
  setPreAction: (val: PreActionSelection) => void;
  rebuyHero: () => boolean;

  // Auth & User Profile Actions
  loginWithGoogle: (customGoogleAccount?: { email?: string; displayName?: string; avatarUrl?: string }) => Promise<UserProfile>;
  loginWithPasskey: (fallbackAccount?: { email?: string; displayName?: string; nickname?: string; avatarUrl?: string }) => Promise<UserProfile>;
  registerUserPasskey: (label?: string) => Promise<UserProfile | null>;
  removeUserPasskey: (credentialId: string) => Promise<UserProfile | null>;
  loginWithEmail: (params: { email: string; password: string }) => Promise<UserProfile>;
  registerUserWithEmail: (params: { email: string; password: string; displayName: string; nickname?: string; avatarUrl?: string; emailVerified?: boolean }) => Promise<UserProfile>;
  verifyUserEmail: () => Promise<UserProfile>;
  resendUserVerificationEmail: () => Promise<{ sent: boolean; email: string }>;
  loginAsGuest: (nickname?: string, avatarUrl?: string) => Promise<UserProfile>;
  upgradeGuestUser: (params: { provider: Exclude<AuthProviderType, 'guest'>; email: string; password?: string; displayName?: string; nickname?: string; avatarUrl?: string }) => Promise<UserProfile>;
  updateUserIdentity: (updates: { displayName?: string; nickname?: string; avatarUrl?: string }) => Promise<UserProfile | null>;
  logoutUser: () => void;

  // Session & Lifecycle Actions
  initLobby: () => void;
  startNewGame: (customConfig?: Partial<TableConfig>) => void;
  loadGame: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  quitToLobby: () => void;
  autoSave: () => void;

  // In-Game Actions
  isDealingCards: boolean;
  setIsDealingCards: (isDealing: boolean) => void;
  dealNextHand: () => void;
  playerAction: (action: 'fold' | 'check' | 'call' | 'bet' | 'raise', amount?: number, liveTell?: string) => void;
  advancePhase: () => void;
  executeAIAction: () => void;
}

export const usePokerStore = create<PokerStore>((set, get) => ({
  viewMode: 'LOBBY',
  displayView: 'CASINO_SIM',
  tableTheme: 'classic-green',
  alwaysRevealHoleCards: false,
  soundMuted: false,
  ambientPlaying: false,
  soundVolume: 0.6,
  gameSpeed: 'relaxed',
  lastHandResult: null,
  lastActionEvent: null,
  currentFeedback: null,

  userProfile: null,

  tableConfig: DEFAULT_TABLE_CONFIG,
  rebuysUsed: 0,
  preAction: null,
  handHistory: [],
  lastHandRecord: null,
  currentHandSteps: [],
  heroStartStackForHand: 200,

  sessionStats: {
    handsPlayed: 0,
    vpipHands: 0,
    pfrHands: 0,
    netProfit: 0,
    blunderCount: 0,
    leakCount: 0,
    optimalCount: 0,
    cumulativeEvLoss: 0,
    profitHistory: [{ hand: 0, profit: 0, balance: 200 }],
    leakLedger: []
  },

  currentSessionId: null,
  handsPlayed: 0,
  lastAutoSavedAt: null,
  savedSessions: [],
  phase: 'PREFLOP',
  players: createInitialPlayers(0, DEFAULT_TABLE_CONFIG, null),
  dealerIndex: 0,
  activePlayerIndex: 0,
  communityCards: [],
  pot: 0,
  currentBet: 0,
  minRaise: 2,
  logs: [],
  deck: new Deck(),
  heroSeatIndex: 0,

  setDisplayView: (view) => set({ displayView: view }),
  setTableTheme: (theme) => set({ tableTheme: theme }),
  setAlwaysRevealHoleCards: (val) => set({ alwaysRevealHoleCards: val }),
  clearFeedback: () => set({ currentFeedback: null }),

  setTableConfig: (partial) => {
    set((state) => ({
      tableConfig: { ...state.tableConfig, ...partial }
    }));
  },

  setPreAction: (val) => set({ preAction: val }),

  loginWithGoogle: async (customGoogleAccount) => {
    const profile = await signInWithGoogle(customGoogleAccount);
    set((state) => ({
      userProfile: profile,
      players: state.players.map((p, idx) =>
        idx === state.heroSeatIndex
          ? { ...p, name: `${profile.nickname} (You)`, nickname: profile.nickname, avatarUrl: profile.avatarUrl }
          : p
      )
    }));
    return profile;
  },

  loginWithPasskey: async (fallbackAccount) => {
    const profile = await signInWithPasskey(fallbackAccount);
    set((state) => ({
      userProfile: profile,
      players: state.players.map((p, idx) =>
        idx === state.heroSeatIndex
          ? { ...p, name: `${profile.nickname} (You)`, nickname: profile.nickname, avatarUrl: profile.avatarUrl }
          : p
      )
    }));
    return profile;
  },

  registerUserPasskey: async (label) => {
    const current = get().userProfile;
    if (!current) return null;
    const updated = await registerPasskeyForUser(current, label);
    set({ userProfile: updated });
    return updated;
  },

  removeUserPasskey: async (credentialId) => {
    const current = get().userProfile;
    if (!current) return null;
    const updated = await removePasskeyFromUser(current, credentialId);
    set({ userProfile: updated });
    return updated;
  },

  loginWithEmail: async (params) => {
    const profile = await signInWithEmail(params);
    set((state) => ({
      userProfile: profile,
      players: state.players.map((p, idx) =>
        idx === state.heroSeatIndex
          ? { ...p, name: `${profile.nickname} (You)`, nickname: profile.nickname, avatarUrl: profile.avatarUrl }
          : p
      )
    }));
    return profile;
  },

  registerUserWithEmail: async (params) => {
    const profile = await registerWithEmail(params);
    set((state) => ({
      userProfile: profile,
      players: state.players.map((p, idx) =>
        idx === state.heroSeatIndex
          ? { ...p, name: `${profile.nickname} (You)`, nickname: profile.nickname, avatarUrl: profile.avatarUrl }
          : p
      )
    }));
    return profile;
  },

  verifyUserEmail: async () => {
    const current = get().userProfile;
    const verified = await verifyCurrentUserEmail(current);
    set({ userProfile: verified });
    return verified;
  },

  resendUserVerificationEmail: async () => {
    const current = get().userProfile;
    return resendVerificationEmail(current);
  },

  loginAsGuest: async (nickname, avatarUrl) => {
    const profile = await signInAsGuest(nickname, avatarUrl);
    set((state) => ({
      userProfile: profile,
      players: state.players.map((p, idx) =>
        idx === state.heroSeatIndex
          ? { ...p, name: `${profile.nickname} (You)`, nickname: profile.nickname, avatarUrl: profile.avatarUrl }
          : p
      )
    }));
    return profile;
  },

  upgradeGuestUser: async (params) => {
    const current = get().userProfile;
    if (!current) {
      throw new Error('No active guest profile to upgrade.');
    }
    const upgraded = await upgradeGuestProfile(current, params);
    set((state) => ({
      userProfile: upgraded,
      players: state.players.map((p, idx) =>
        idx === state.heroSeatIndex
          ? { ...p, name: `${upgraded.nickname} (You)`, nickname: upgraded.nickname, avatarUrl: upgraded.avatarUrl }
          : p
      )
    }));
    return upgraded;
  },

  updateUserIdentity: async (updates) => {
    const current = get().userProfile;
    if (!current) return null;
    const updated = await updateUserTableIdentity(current, updates);
    set((state) => ({
      userProfile: updated,
      players: state.players.map((p, idx) =>
        idx === state.heroSeatIndex
          ? { ...p, name: `${updated.nickname} (You)`, nickname: updated.nickname, avatarUrl: updated.avatarUrl }
          : p
      )
    }));
    return updated;
  },

  logoutUser: () => {
    clearAITimeout();
    sound.stopAmbientRoom();
    signOutStoredUser();
    set({
      userProfile: null,
      viewMode: 'LOBBY',
      ambientPlaying: false
    });
  },

  rebuyHero: () => {
    const state = get();
    const { tableConfig, rebuysUsed, players, heroSeatIndex } = state;
    if (rebuysUsed >= tableConfig.maxRebuys) {
      return false;
    }
    const updatedPlayers = players.map((p, idx) =>
      idx === heroSeatIndex ? { ...p, stack: tableConfig.buyInAmount } : p
    );
    sound.playChipSplash();
    set({
      players: updatedPlayers,
      rebuysUsed: rebuysUsed + 1,
      logs: [...state.logs, `Hero rebuys for $${tableConfig.buyInAmount} (${rebuysUsed + 1}/${tableConfig.maxRebuys === 99 ? '∞' : tableConfig.maxRebuys} rebuys used).`]
    });
    get().autoSave();
    return true;
  },

  toggleMute: () => {
    const isMuted = sound.toggleMute();
    set({ soundMuted: isMuted });
  },

  toggleAmbient: () => {
    const isPlaying = sound.toggleAmbientRoom();
    set({ ambientPlaying: isPlaying });
  },

  setVolume: (val) => {
    sound.setVolume(val);
    set({ soundVolume: val });
  },

  setGameSpeed: (speed) => {
    set({ gameSpeed: speed });
  },

  initLobby: () => {
    clearAITimeout();
    sound.stopAmbientRoom();
    const sessions = getSavedSessions();
    const storedProfile = getStoredUserProfile();
    set((state) => ({
      savedSessions: sessions,
      userProfile: state.userProfile || storedProfile,
      viewMode: 'LOBBY',
      ambientPlaying: false
    }));
  },

  autoSave: () => {
    const state = get();
    if (!state.currentSessionId) return;

    const sessionSnapshot: GameSession = {
      id: state.currentSessionId,
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      stakes: '$1/$2 NL',
      handsPlayed: state.handsPlayed,
      phase: state.phase,
      players: state.players.map((p) => ({ ...p, isThinking: false })),
      dealerIndex: state.dealerIndex,
      activePlayerIndex: state.activePlayerIndex,
      communityCards: state.communityCards,
      pot: state.pot,
      currentBet: state.currentBet,
      minRaise: state.minRaise,
      logs: state.logs,
      remainingCards: state.deck.getCards(),
      heroSeatIndex: state.heroSeatIndex,
      tableConfig: state.tableConfig,
      rebuysUsed: state.rebuysUsed,
      stats: state.sessionStats
    };

    const updated = saveSessionToStorage(sessionSnapshot);
    set({
      savedSessions: updated,
      lastAutoSavedAt: Date.now()
    });
  },

  startNewGame: (customConfig) => {
    clearAITimeout();
    const state = get();
    const mergedConfig: TableConfig = {
      ...state.tableConfig,
      ...(customConfig || {})
    };
    const sessionId = `session-${Date.now()}`;
    const updatedUserProfile = recordSessionPreferenceToUserProfile(state.userProfile, mergedConfig);
    const initialPlayers = createInitialPlayers(0, mergedConfig, updatedUserProfile);
    const deck = new Deck();
    deck.reset();

    set({
      userProfile: updatedUserProfile,
      tableConfig: mergedConfig,
      rebuysUsed: 0,
      preAction: null,
      currentSessionId: sessionId,
      handsPlayed: 0,
      players: initialPlayers,
      dealerIndex: 0,
      heroSeatIndex: 0,
      deck,
      handHistory: [],
      lastHandRecord: null,
      currentHandSteps: [],
      logs: [
        mergedConfig.gameMode === 'limp_punisher'
          ? 'Welcome to Live Limp-Punisher Drill! Practice isolating limpers with 4BB + 1BB/limper.'
          : `Welcome to Gambler's Den! ${mergedConfig.tableSize}-Max $1/$2 NL Simulation (${mergedConfig.difficulty.toUpperCase()} tier) started.`
      ],
      viewMode: 'GAME',
      currentFeedback: null,
      sessionStats: {
        handsPlayed: 0,
        vpipHands: 0,
        pfrHands: 0,
        netProfit: 0,
        blunderCount: 0,
        leakCount: 0,
        optimalCount: 0,
        cumulativeEvLoss: 0,
        profitHistory: [{ hand: 0, profit: 0, balance: mergedConfig.buyInAmount }],
        leakLedger: []
      }
    });

    get().dealNextHand();
  },

  loadGame: (sessionId: string) => {
    clearAITimeout();
    const session = getSessionById(sessionId);
    if (!session) return;

    const restoredDeck = new Deck();
    if (session.remainingCards && session.remainingCards.length > 0) {
      restoredDeck.loadCards(session.remainingCards);
    } else {
      restoredDeck.reset();
    }

    const heroIndexFromSession = session.players.findIndex((p) => p.archetype === 'Hero');
    const heroSeatIndex = heroIndexFromSession !== -1 ? heroIndexFromSession : (session.heroSeatIndex ?? 0);
    const restoredConfig = session.tableConfig || {
      ...DEFAULT_TABLE_CONFIG,
      tableSize: (session.players.length as 2 | 6 | 9) || 9,
    };

    set({
      currentSessionId: session.id,
      handsPlayed: session.handsPlayed || 1,
      phase: session.phase,
      players: session.players.map((p) => ({ ...p, isThinking: false })),
      dealerIndex: session.dealerIndex,
      activePlayerIndex: session.activePlayerIndex,
      communityCards: session.communityCards,
      pot: session.pot,
      currentBet: session.currentBet,
      minRaise: session.minRaise,
      logs: [...session.logs, `--- Resumed game session ---`],
      deck: restoredDeck,
      heroSeatIndex,
      tableConfig: restoredConfig,
      rebuysUsed: session.rebuysUsed ?? 0,
      preAction: null,
      viewMode: 'GAME',
      sessionStats: session.stats || {
        handsPlayed: session.handsPlayed || 1,
        vpipHands: 0,
        pfrHands: 0,
        netProfit: 0,
        blunderCount: 0,
        leakCount: 0,
        optimalCount: 0,
        cumulativeEvLoss: 0,
        profitHistory: [{ hand: 0, profit: 0, balance: restoredConfig.buyInAmount }],
        leakLedger: []
      },
      lastAutoSavedAt: Date.now()
    });

    get().autoSave();

    const activePlayer = session.players[session.activePlayerIndex];
    if (session.phase !== 'SHOWDOWN' && activePlayer && activePlayer.archetype !== 'Hero' && !activePlayer.hasFolded) {
      aiTimeoutId = setTimeout(() => {
        get().executeAIAction();
      }, 1000);
    }
  },

  deleteSession: (sessionId: string) => {
    const updated = deleteSessionFromStorage(sessionId);
    set({ savedSessions: updated });
  },

  quitToLobby: () => {
    clearAITimeout();
    sound.stopAmbientRoom();
    get().autoSave();
    const sessions = getSavedSessions();
    set({
      viewMode: 'LOBBY',
      savedSessions: sessions,
      ambientPlaying: false,
      preAction: null,
      isDealingCards: false,
    });
  },

  isDealingCards: false,

  setIsDealingCards: (isDealing: boolean) => {
    set({ isDealingCards: isDealing });
    if (!isDealing) {
      const state = get();
      if (state.phase !== 'SHOWDOWN' && state.viewMode === 'GAME') {
        const p = state.players[state.activePlayerIndex];
        if (p && p.archetype !== 'Hero' && !p.hasFolded && !p.isAllIn) {
          const persona = BOT_PERSONAS.find((bp) => bp.id === p.personaId);
          const baseDelay = persona ? persona.thinkingDelayMin + Math.random() * (persona.thinkingDelayMax - persona.thinkingDelayMin) : 900;
          const delay = baseDelay * getSpeedMultiplier(state.gameSpeed);
          clearAITimeout();
          aiTimeoutId = setTimeout(() => {
            get().executeAIAction();
          }, delay);
        }
      }
    }
  },

  dealNextHand: () => {
    clearAITimeout();
    const { players, dealerIndex, deck, handsPlayed, tableConfig, heroSeatIndex } = get();
    const count = players.length;
    const posList = getPositionsForTableSize(count);
    deck.reset();

    sound.playCardDeal();

    const isDrill = tableConfig.gameMode === 'limp_punisher' && count >= 6;
    // In Limp-Punisher Drill mode, Hero is always placed on the Button (dealerIndex = heroSeatIndex)
    const newDealerIndex = isDrill ? heroSeatIndex : (dealerIndex + 1) % count;

    const updatedPlayers: Player[] = players.map((p, i): Player => {
      const offsetFromDealer = (i - newDealerIndex + count) % count;
      // Assign position based on offset from Dealer Button
      // offset 0 -> BTN, offset 1 -> SB, offset 2 -> BB, etc.
      const btnIndexInPosList = posList.indexOf('BTN');
      const pos = posList[(btnIndexInPosList + offsetFromDealer) % posList.length];

      // Auto-reload busted bots; keep Hero stack as-is unless Hero is busted and in drill mode
      const isHero = i === heroSeatIndex;
      const effectiveStack = p.stack <= 0 ? (isHero ? p.stack : tableConfig.buyInAmount) : p.stack;

      return {
        ...p,
        stack: effectiveStack,
        hasFolded: false,
        foldPhase: undefined,
        isActive: effectiveStack > 0,
        isAllIn: false,
        currentBet: 0,
        isThinking: false,
        lastAction: null,
        holeCards: deck.drawMultiple(2),
        position: pos
      };
    });

    const now = Date.now();
    const sbIndex = count === 2 ? newDealerIndex : (newDealerIndex + 1) % count;
    const bbIndex = count === 2 ? (newDealerIndex + 1) % count : (newDealerIndex + 2) % count;

    if (updatedPlayers[sbIndex].stack > 0) {
      updatedPlayers[sbIndex].currentBet = Math.min(1, updatedPlayers[sbIndex].stack);
      updatedPlayers[sbIndex].stack -= updatedPlayers[sbIndex].currentBet;
      updatedPlayers[sbIndex].lastAction = {
        type: 'sb',
        label: `SB $${updatedPlayers[sbIndex].currentBet}`,
        amount: updatedPlayers[sbIndex].currentBet,
        timestamp: now
      };
    }

    if (updatedPlayers[bbIndex].stack > 0) {
      updatedPlayers[bbIndex].currentBet = Math.min(2, updatedPlayers[bbIndex].stack);
      updatedPlayers[bbIndex].stack -= updatedPlayers[bbIndex].currentBet;
      updatedPlayers[bbIndex].lastAction = {
        type: 'bb',
        label: `BB $${updatedPlayers[bbIndex].currentBet}`,
        amount: updatedPlayers[bbIndex].currentBet,
        timestamp: now + 1
      };
    }

    let initialPot = updatedPlayers[sbIndex].currentBet + updatedPlayers[bbIndex].currentBet;
    let firstActor = count === 2 ? newDealerIndex : (newDealerIndex + 3) % count;
    const nextHandNumber = handsPlayed + 1;
    const drillLogs: string[] = [`\n=== Hand #${nextHandNumber} Started ($1/$2 NL) ===`];

    // Special Setup for "Live Limp-Punisher" Drill Mode
    if (isDrill) {
      const drillHand = LIMP_DRILL_HANDS[nextHandNumber % LIMP_DRILL_HANDS.length];
      updatedPlayers[heroSeatIndex].holeCards = [drillHand[0], drillHand[1]];

      // Generate 1 to 3 limpers ahead of Hero (on the Button)
      const numLimpers = 1 + (nextHandNumber % 3); // 1, 2, or 3 limpers
      let limpersCreated = 0;

      for (let step = 3; step < count; step++) {
        const seatIdx = (newDealerIndex + step) % count;
        if (seatIdx === heroSeatIndex) break;

        if (limpersCreated < numLimpers && updatedPlayers[seatIdx].stack >= 2) {
          updatedPlayers[seatIdx].stack -= 2;
          updatedPlayers[seatIdx].currentBet = 2;
          updatedPlayers[seatIdx].lastAction = {
            type: 'call',
            label: 'CALL $2',
            amount: 2,
            timestamp: now + step
          };
          initialPot += 2;
          limpersCreated++;
          drillLogs.push(`${updatedPlayers[seatIdx].name} (${updatedPlayers[seatIdx].position}) limps for $2.00.`);
        } else {
          updatedPlayers[seatIdx].hasFolded = true;
          updatedPlayers[seatIdx].foldPhase = 'PREFLOP';
          updatedPlayers[seatIdx].lastAction = {
            type: 'fold',
            label: 'FOLDED',
            timestamp: now + step
          };
        }
      }

      firstActor = heroSeatIndex;
      drillLogs.push(`🎯 DRILL SPOT: ${limpersCreated} limper(s) ahead. Isolate to $${8 + limpersCreated * 2} (4BB + 1BB/limper)!`);
    }

    const heroStackStart = updatedPlayers[heroSeatIndex]?.stack + (updatedPlayers[heroSeatIndex]?.currentBet || 0);

    set({
      phase: 'PREFLOP',
      handsPlayed: nextHandNumber,
      players: updatedPlayers,
      dealerIndex: newDealerIndex,
      activePlayerIndex: firstActor,
      communityCards: [],
      pot: initialPot,
      currentBet: 2,
      minRaise: 2,
      preAction: null,
      lastHandResult: null,
      lastActionEvent: null,
      currentHandSteps: [],
      heroStartStackForHand: heroStackStart,
      logs: [...get().logs, ...drillLogs]
    });

    get().autoSave();

    if (!get().isDealingCards && updatedPlayers[firstActor] && updatedPlayers[firstActor].archetype !== 'Hero') {
      const persona = BOT_PERSONAS.find((bp) => bp.id === updatedPlayers[firstActor].personaId);
      const baseDelay = persona ? persona.thinkingDelayMin + Math.random() * (persona.thinkingDelayMax - persona.thinkingDelayMin) : 900;
      const delay = baseDelay * getSpeedMultiplier(get().gameSpeed);
      aiTimeoutId = setTimeout(() => {
        get().executeAIAction();
      }, delay);
    }
  },

  playerAction: (action, amount = 0, liveTell) => {
    clearAITimeout();
    const state = get();
    const count = state.players.length;
    const isHero = state.activePlayerIndex === state.heroSeatIndex;
    const p = { ...state.players[state.activePlayerIndex] };
    let newPot = state.pot;
    let newCurrentBet = state.currentBet;
    let newMinRaise = state.minRaise;
    let log = '';
    const now = Date.now();

    const updatedPlayers = [...state.players];

    // Sound triggers and visual action badge based on action (using Multi-Density Chip Sound Escalation)
    if (action === 'fold') {
      p.hasFolded = true;
      p.foldPhase = state.phase;
      p.lastAction = {
        type: 'fold',
        label: 'FOLDED',
        timestamp: now
      };
      log = `${p.name} folds.`;
    } else if (action === 'check') {
      sound.playCheckKnock();
      p.lastAction = {
        type: 'check',
        label: 'CHECK',
        timestamp: now
      };
      log = `${p.name} checks.`;
    } else if (action === 'call') {
      const callAmount = Math.min(newCurrentBet - p.currentBet, p.stack);
      p.stack -= callAmount;
      p.currentBet += callAmount;
      newPot += callAmount;
      if (p.stack === 0) p.isAllIn = true;
      sound.playBetByDensity(callAmount, state.pot);
      p.lastAction = p.isAllIn
        ? { type: 'allin', label: `ALL-IN $${p.currentBet}`, amount: p.currentBet, timestamp: now }
        : { type: 'call', label: `CALL $${callAmount}`, amount: callAmount, timestamp: now };
      log = `${p.name} calls $${callAmount.toFixed(2)}.`;
    } else if (action === 'bet' || action === 'raise') {
      const totalBet = amount;
      const addAmount = totalBet - p.currentBet;
      p.stack -= addAmount;
      p.currentBet = totalBet;
      newPot += addAmount;
      if (p.stack === 0) p.isAllIn = true;

      const raiseAmount = totalBet - newCurrentBet;
      newCurrentBet = totalBet;
      newMinRaise = Math.max(newMinRaise, raiseAmount);
      sound.playBetByDensity(addAmount, state.pot);
      p.lastAction = p.isAllIn
        ? { type: 'allin', label: `ALL-IN $${totalBet}`, amount: totalBet, timestamp: now }
        : action === 'bet'
        ? { type: 'bet', label: `BET $${totalBet}`, amount: totalBet, timestamp: now }
        : { type: 'raise', label: `RAISE $${totalBet}`, amount: totalBet, timestamp: now };
      log = `${p.name} ${action}s to $${totalBet.toFixed(2)}.`;
    }

    if (liveTell) {
      log += ` [${liveTell}]`;
    }

    p.isThinking = false;
    updatedPlayers[state.activePlayerIndex] = p;

    const actionEvent: TableActionEvent | null = p.lastAction
      ? {
          playerId: p.id,
          playerName: p.name,
          position: p.position,
          type: p.lastAction.type,
          label: p.lastAction.label,
          amount: p.lastAction.amount,
          timestamp: now,
          liveTell
        }
      : null;

    // If an opponent bets or raises while Hero has 'check' pre-staged, clear preAction so Hero isn't surprised
    let nextPreAction = state.preAction;
    if (!isHero && (action === 'bet' || action === 'raise') && nextPreAction === 'check') {
      nextPreAction = null;
    }

    // --- Hero Coaching Evaluation & Stats Update ---
    const updatedStats = {
      ...state.sessionStats,
      leakLedger: [...(state.sessionStats.leakLedger || [])]
    };
    let stepCoachNote: string | undefined;

    if (isHero) {
      nextPreAction = null;
      const limpersCount = state.players.filter((pl) => pl.currentBet === 2 && !pl.hasFolded).length;
      const feedback = evaluateAction(
        p.holeCards,
        state.communityCards,
        state.phase,
        p.position,
        action,
        amount,
        state.pot,
        limpersCount,
        state.currentBet,
        state.players[state.heroSeatIndex].currentBet
      );

      stepCoachNote = `${feedback.rating}: ${feedback.explanation}`;

      let vpipDelta = 0;
      let pfrDelta = 0;
      // Track VPIP & PFR preflop
      if (state.phase === 'PREFLOP') {
        if (action === 'call' || action === 'bet' || action === 'raise') {
          updatedStats.vpipHands += 1;
          vpipDelta = 1;
        }
        if (action === 'bet' || action === 'raise') {
          updatedStats.pfrHands += 1;
          pfrDelta = 1;
        }
      }

      let optimalDelta = 0;
      let leakDelta = 0;
      let blunderDelta = 0;
      let evLossDelta = 0;
      let newLeakEntry: LeakEntry | undefined;

      if (feedback.rating === 'Blunder' || feedback.rating === 'Leak') {
        const loss = Math.abs(feedback.evLossEstimate) || (feedback.rating === 'Blunder' ? 4.0 : 2.0);
        if (feedback.rating === 'Blunder') {
          updatedStats.blunderCount += 1;
          blunderDelta = 1;
        } else {
          updatedStats.leakCount += 1;
          leakDelta = 1;
        }
        updatedStats.cumulativeEvLoss += loss;
        evLossDelta = loss;

        newLeakEntry = {
          id: `leak-${now}-${state.handsPlayed}`,
          handNumber: state.handsPlayed || 1,
          street: state.phase,
          actionLabel: p.lastAction?.label || action.toUpperCase(),
          rating: feedback.rating,
          evLoss: loss,
          explanation: feedback.explanation
        };
        updatedStats.leakLedger = [...updatedStats.leakLedger, newLeakEntry];
      } else if (feedback.rating === 'Optimal') {
        updatedStats.optimalCount += 1;
        optimalDelta = 1;
      }

      const updatedProfile = recordDeltaToUserProfile(state.userProfile, {
        vpipDelta,
        pfrDelta,
        optimalDelta,
        leakDelta,
        blunderDelta,
        evLossDelta,
        newLeak: newLeakEntry
      });

      set({ currentFeedback: feedback, userProfile: updatedProfile });
    }

    // Record step for Street-by-Street Hand Replayer
    const heroPlayer = updatedPlayers[state.heroSeatIndex];
    const limpersNow = updatedPlayers.filter((pl) => pl.currentBet === 2 && !pl.hasFolded).length;
    const proactiveForEquity = heroPlayer
      ? getProactiveAdvice(
          heroPlayer.holeCards,
          state.communityCards,
          state.phase,
          heroPlayer.position,
          newCurrentBet,
          heroPlayer.currentBet,
          newPot,
          limpersNow,
          heroPlayer.stack
        )
      : null;

    const newStep: HandHistoryStep = {
      stepIndex: state.currentHandSteps.length + 1,
      phase: state.phase,
      actorName: p.name,
      actorPosition: p.position,
      actionLabel: p.lastAction?.label || action.toUpperCase(),
      potAfter: newPot,
      communityCards: [...state.communityCards],
      heroHoleCards: heroPlayer ? [...heroPlayer.holeCards] : [],
      heroEquityPercent: proactiveForEquity?.equityPercent ?? 50,
      coachNote: stepCoachNote,
      liveTell
    };

    const updatedHandSteps = [...state.currentHandSteps, newStep];

    set({
      players: updatedPlayers,
      pot: newPot,
      currentBet: newCurrentBet,
      minRaise: newMinRaise,
      preAction: nextPreAction,
      lastActionEvent: actionEvent,
      currentHandSteps: updatedHandSteps,
      logs: [...state.logs, log],
      sessionStats: updatedStats
    });

    // Check if only one player remaining (All folded)
    const remainingPlayers = updatedPlayers.filter((pl) => !pl.hasFolded);
    if (remainingPlayers.length === 1) {
      const winner = remainingPlayers[0];
      winner.stack += newPot;
      sound.playWinPot();
      const winLog = `${winner.name} wins pot of $${newPot.toFixed(2)} (all opponents folded).`;

      // Run out remaining community cards to 5 so players can see the full board and realize hands
      let finalBoard = [...state.communityCards];
      let wasRunout = false;
      if (finalBoard.length < 5) {
        const needed = 5 - finalBoard.length;
        const extraCards = state.deck.drawMultiple(needed);
        finalBoard = [...finalBoard, ...extraCards];
        wasRunout = true;
      }

      const hero = updatedPlayers[state.heroSeatIndex];
      let heroPotentialHand: HandResult['heroPotentialHand'] | undefined;
      if (hero && hero.holeCards && hero.holeCards.length === 2 && finalBoard.length === 5) {
        const heroEval = evaluateHand([...hero.holeCards, ...finalBoard]);
        heroPotentialHand = {
          name: heroEval.name,
          rank: heroEval.rank,
          wasFolded: hero.hasFolded,
          foldStreet: hero.foldPhase
        };
      }

      const isHeroWinner = winner.archetype === 'Hero';
      const handResult: HandResult = {
        winnerNames: winner.name,
        winnerIds: [winner.id],
        handName: isHeroWinner 
          ? (heroPotentialHand ? heroPotentialHand.name : 'All Opponents Folded')
          : 'All Opponents Folded',
        amount: newPot,
        isHeroWinner,
        byFold: true,
        winningCards: isHeroWinner ? winner.holeCards : undefined,
        heroPotentialHand,
        wasRunout,
      };

      const totalHeroInvested = state.tableConfig.buyInAmount * (1 + state.rebuysUsed);
      const netProfit = hero ? hero.stack - totalHeroInvested : 0;
      const handNetHeroProfit = hero ? hero.stack - state.heroStartStackForHand : 0;
      const newProfitHistory = [
        ...updatedStats.profitHistory,
        { hand: state.handsPlayed, profit: netProfit, balance: hero ? hero.stack : 0 }
      ];

      const completedRecord: HandHistoryRecord = {
        handNumber: state.handsPlayed || 1,
        timestamp: now,
        heroHoleCards: hero ? [...hero.holeCards] : [],
        heroPosition: hero ? hero.position : 'BTN',
        finalCommunityCards: [...finalBoard],
        potWon: newPot,
        winnerNames: winner.name,
        isHeroWinner,
        netHeroProfit: handNetHeroProfit,
        steps: updatedHandSteps
      };

      const updatedProfile = recordDeltaToUserProfile(get().userProfile, {
        handsDelta: 1,
        profitDelta: handNetHeroProfit
      });

      set({
        phase: 'SHOWDOWN',
        communityCards: finalBoard,
        pot: 0,
        preAction: null,
        userProfile: updatedProfile,
        lastHandResult: handResult,
        lastHandRecord: completedRecord,
        handHistory: [completedRecord, ...state.handHistory].slice(0, 15),
        logs: [...get().logs, winLog],
        sessionStats: {
          ...updatedStats,
          handsPlayed: state.handsPlayed,
          netProfit,
          profitHistory: newProfitHistory
        }
      });

      get().autoSave();
      return;
    }

    // Check if betting round settled
    let allSettled = true;
    for (let i = 0; i < count; i++) {
      const pl = updatedPlayers[i];
      if (!pl.hasFolded && !pl.isAllIn && pl.currentBet !== newCurrentBet) {
        allSettled = false;
        break;
      }
    }

    const nonFoldedNonAllIn = updatedPlayers.filter((pl) => !pl.hasFolded && !pl.isAllIn);

    if (allSettled || nonFoldedNonAllIn.length <= 1) {
      get().autoSave();
      aiTimeoutId = setTimeout(() => {
        get().advancePhase();
      }, getStreetTransitionDelay(get().gameSpeed));
      return;
    }

    // Find next active player
    let nextIndex = (state.activePlayerIndex + 1) % count;
    while (updatedPlayers[nextIndex].hasFolded || updatedPlayers[nextIndex].isAllIn) {
      nextIndex = (nextIndex + 1) % count;
    }

    set({ activePlayerIndex: nextIndex });
    get().autoSave();

    // If next player is Hero and Hero has a staged Pre-Action checkbox, execute it immediately!
    if (updatedPlayers[nextIndex].archetype === 'Hero') {
      const staged = get().preAction;
      if (staged) {
        const heroToCall = Math.max(0, newCurrentBet - updatedPlayers[nextIndex].currentBet);
        set({ preAction: null });
        aiTimeoutId = setTimeout(() => {
          if (staged === 'check_fold') {
            get().playerAction(heroToCall === 0 ? 'check' : 'fold');
          } else if (staged === 'check') {
            if (heroToCall === 0) get().playerAction('check');
          } else if (staged === 'call_any') {
            get().playerAction(heroToCall === 0 ? 'check' : 'call');
          }
        }, 120);
      }
      return;
    }

    // Schedule AI Turn (with Timing Tell modulation)
    const persona = BOT_PERSONAS.find((bp) => bp.id === updatedPlayers[nextIndex].personaId);
    const baseDelay = persona ? persona.thinkingDelayMin + Math.random() * (persona.thinkingDelayMax - persona.thinkingDelayMin) : 900;
    const delay = baseDelay * getSpeedMultiplier(get().gameSpeed);
    aiTimeoutId = setTimeout(() => {
      get().executeAIAction();
    }, delay);
  },

  advancePhase: () => {
    clearAITimeout();
    const state = get();
    const count = state.players.length;
    let nextPhase = state.phase;
    let newCards = [...state.communityCards];
    const { deck } = state;

    sound.playCardDeal();

    if (state.phase === 'PREFLOP') {
      nextPhase = 'FLOP';
      newCards = deck.drawMultiple(3);
    } else if (state.phase === 'FLOP') {
      nextPhase = 'TURN';
      newCards = [...newCards, ...deck.drawMultiple(1)];
    } else if (state.phase === 'TURN') {
      nextPhase = 'RIVER';
      newCards = [...newCards, ...deck.drawMultiple(1)];
    } else {
      nextPhase = 'SHOWDOWN';
    }

    const updatedPlayers = state.players.map((p) => ({
      ...p,
      currentBet: 0,
      isThinking: false,
      lastAction: p.hasFolded || p.isAllIn ? p.lastAction : null
    }));

    const showdownLogs: string[] = [`--- Street: ${nextPhase} ---`];
    let finalPot = state.pot;

    if (nextPhase === 'SHOWDOWN') {
      sound.playWinPot();
      const activePlayers = updatedPlayers.filter((p) => !p.hasFolded);
      if (activePlayers.length > 0) {
        let bestScore = -1;
        let winners: Player[] = [];
        activePlayers.forEach((p) => {
          const evalResult = evaluateHand([...p.holeCards, ...newCards]);
          if (evalResult.value > bestScore) {
            bestScore = evalResult.value;
            winners = [p];
          } else if (evalResult.value === bestScore) {
            winners.push(p);
          }
        });

        const splitAmount = finalPot / winners.length;
        winners.forEach((w) => {
          w.stack += splitAmount;
        });

        const winnerNames = winners.map((w) => w.name).join(', ');
        const winEvaluation = evaluateHand([...winners[0].holeCards, ...newCards]);
        showdownLogs.push(`Showdown Winner(s): ${winnerNames} with ${winEvaluation.name} ($${finalPot.toFixed(2)})`);

        const hero = updatedPlayers[state.heroSeatIndex];
        let heroPotentialHand: HandResult['heroPotentialHand'] | undefined;
        if (hero && hero.holeCards && hero.holeCards.length === 2 && newCards.length === 5) {
          const heroEval = evaluateHand([...hero.holeCards, ...newCards]);
          heroPotentialHand = {
            name: heroEval.name,
            rank: heroEval.rank,
            wasFolded: hero.hasFolded,
            foldStreet: hero.foldPhase
          };
        }

        const isHeroWinner = winners.some((w) => w.archetype === 'Hero');
        const handResult: HandResult = {
          winnerNames,
          winnerIds: winners.map((w) => w.id),
          handName: winEvaluation.name,
          amount: finalPot,
          isHeroWinner,
          byFold: false,
          winningCards: winners[0].holeCards,
          heroPotentialHand,
          wasRunout: false
        };

        const potWonSnapshot = finalPot;
        finalPot = 0;

        const totalHeroInvested = state.tableConfig.buyInAmount * (1 + state.rebuysUsed);
        const netProfit = hero ? hero.stack - totalHeroInvested : 0;
        const handNetHeroProfit = hero ? hero.stack - state.heroStartStackForHand : 0;
        const newProfitHistory = [
          ...state.sessionStats.profitHistory,
          { hand: state.handsPlayed, profit: netProfit, balance: hero ? hero.stack : 0 }
        ];

        const completedRecord: HandHistoryRecord = {
          handNumber: state.handsPlayed || 1,
          timestamp: Date.now(),
          heroHoleCards: hero ? [...hero.holeCards] : [],
          heroPosition: hero ? hero.position : 'BTN',
          finalCommunityCards: [...newCards],
          potWon: potWonSnapshot,
          winnerNames,
          isHeroWinner,
          netHeroProfit: handNetHeroProfit,
          steps: state.currentHandSteps
        };

        const updatedProfile = recordDeltaToUserProfile(state.userProfile, {
          handsDelta: 1,
          profitDelta: handNetHeroProfit
        });

        set({
          userProfile: updatedProfile,
          sessionStats: {
            ...state.sessionStats,
            handsPlayed: state.handsPlayed,
            netProfit,
            profitHistory: newProfitHistory
          },
          lastHandResult: handResult,
          lastHandRecord: completedRecord,
          handHistory: [completedRecord, ...state.handHistory].slice(0, 15)
        });
      }
    }

    set({
      phase: nextPhase as Phase,
      players: updatedPlayers,
      communityCards: newCards,
      currentBet: 0,
      minRaise: 2,
      pot: finalPot,
      preAction: null,
      lastActionEvent: null,
      logs: [...state.logs, ...showdownLogs]
    });

    get().autoSave();

    if (nextPhase !== 'SHOWDOWN') {
      const nonFoldedNonAllIn = updatedPlayers.filter((pl) => !pl.hasFolded && !pl.isAllIn);
      if (nonFoldedNonAllIn.length <= 1) {
        aiTimeoutId = setTimeout(() => {
          get().advancePhase();
        }, getStreetTransitionDelay(get().gameSpeed));
        return;
      }

      let nextIndex = (state.dealerIndex + 1) % count;
      while (updatedPlayers[nextIndex].hasFolded || updatedPlayers[nextIndex].isAllIn) {
        nextIndex = (nextIndex + 1) % count;
      }
      set({ activePlayerIndex: nextIndex });

      if (updatedPlayers[nextIndex].archetype !== 'Hero') {
        const persona = BOT_PERSONAS.find((bp) => bp.id === updatedPlayers[nextIndex].personaId);
        const baseDelay = persona ? persona.thinkingDelayMin + Math.random() * (persona.thinkingDelayMax - persona.thinkingDelayMin) : 900;
        const delay = baseDelay * getSpeedMultiplier(get().gameSpeed);
        aiTimeoutId = setTimeout(() => {
          get().executeAIAction();
        }, delay);
      }
    }
  },

  executeAIAction: () => {
    const state = get();
    if (state.phase === 'SHOWDOWN' || state.viewMode !== 'GAME' || state.isDealingCards) return;

    const p = state.players[state.activePlayerIndex];
    if (!p || p.archetype === 'Hero' || p.hasFolded || p.isAllIn) return;

    const toCall = state.currentBet - p.currentBet;
    const persona = BOT_PERSONAS.find((bp) => bp.id === p.personaId);
    const archetype = persona ? persona.archetype : p.archetype;
    const isAdvanced = state.tableConfig.difficulty === 'advanced';

    // --- Archetype & Difficulty AI Decision Matrix with Live Timing Tells ---
    if (toCall === 0) {
      // 1. Calling Station: Checks when checked to 85% of time
      if (archetype === 'CallingStation') {
        if (Math.random() < 0.15) {
          get().playerAction('bet', 2);
        } else {
          get().playerAction('check');
        }
      }
      // 2. Nit: Only bets monsters (two pair+)
      else if (archetype === 'Nit') {
        if (state.phase !== 'PREFLOP' && state.communityCards.length >= 3) {
          const evalRes = evaluateHand([...p.holeCards, ...state.communityCards]);
          if (evalRes.value >= 300000000) {
            const betAmt = Math.min(p.stack, Math.max(state.minRaise, Math.floor(state.pot * 0.65)));
            const tell = !isAdvanced ? 'Hollywood Tank-Bet Tell: Live Nit betting postflop represents Two Pair+ >85% of the time.' : undefined;
            get().playerAction('bet', betAmt, tell);
          } else {
            get().playerAction('check');
          }
        } else {
          get().playerAction('check');
        }
      }
      // 3. Aggro-Fish: Frequently stabs into weakness
      else if (archetype === 'AggroFish') {
        if (Math.random() < 0.65) {
          const betSize = Math.max(state.minRaise, Math.floor(state.pot * 0.75) || 4);
          const tell = !isAdvanced ? 'Weakness Stab Tell: Aggro-Fish quickly stabs when checked to with wide air/draws.' : undefined;
          get().playerAction('bet', Math.min(p.stack, betSize), tell);
        } else {
          get().playerAction('check');
        }
      }
      // 4. TAG: Selective c-bets based on board texture & difficulty
      else {
        const cbetFreq = isAdvanced ? 0.65 : 0.5;
        if (Math.random() < cbetFreq) {
          const betSize = Math.max(state.minRaise, Math.floor(state.pot * 0.55) || 4);
          get().playerAction('bet', Math.min(p.stack, betSize));
        } else {
          get().playerAction('check');
        }
      }
    } else {
      // Facing a bet/raise:
      // 1. Calling Station: Snap-calls 75%+ of bets up to $25
      if (archetype === 'CallingStation') {
        if (toCall <= 25 && Math.random() < 0.78) {
          const tell = !isAdvanced && state.phase !== 'PREFLOP'
            ? 'Snap-Call Tell (0.3s): Marginal pair or draw; rarely a trap.'
            : undefined;
          get().playerAction('call', 0, tell);
        } else if (toCall <= 60 && Math.random() < 0.45) {
          get().playerAction('call');
        } else {
          get().playerAction('fold');
        }
      }
      // 2. Nit: Folds 80% of hands unless holding two-pair+ or overpair
      else if (archetype === 'Nit') {
        if (state.phase !== 'PREFLOP' && state.communityCards.length >= 3) {
          const evalRes = evaluateHand([...p.holeCards, ...state.communityCards]);
          if (evalRes.value >= 300000000) {
            const raiseTarget = Math.min(p.stack + p.currentBet, state.currentBet * 2 + 6);
            if (raiseTarget > state.currentBet) {
              const tell = !isAdvanced
                ? 'Hollywood Tank-Raise Tell: Extreme strength! Live Nits have Two Pair+ >85% here.'
                : undefined;
              get().playerAction('raise', raiseTarget, tell);
            } else {
              get().playerAction('call');
            }
          } else if (evalRes.value >= 200000000 && toCall <= 8) {
            get().playerAction('call');
          } else {
            get().playerAction('fold');
          }
        } else {
          if (toCall <= 8 && Math.random() < 0.22) {
            get().playerAction('call');
          } else {
            get().playerAction('fold');
          }
        }
      }
      // 3. Aggro-Fish: Calls wide and bluff-raises 25% of the time
      else if (archetype === 'AggroFish') {
        const rand = Math.random();
        const minValidRaise = state.currentBet + state.minRaise;
        if (rand < 0.22 && p.stack + p.currentBet >= minValidRaise && state.currentBet <= 30) {
          const raiseTarget = Math.min(p.stack + p.currentBet, state.currentBet * 2 + 4);
          get().playerAction('raise', raiseTarget);
        } else if (rand < 0.72 && toCall <= 35) {
          get().playerAction('call');
        } else {
          get().playerAction('fold');
        }
      }
      // 4. TAG: Disciplined calls & 3-bets (tighter & more aggressive on Vegas Sharks tier)
      else {
        const rand = Math.random();
        const minValidRaise = state.currentBet + state.minRaise;
        const raiseFreq = isAdvanced ? 0.22 : 0.12;
        if (rand < raiseFreq && p.stack + p.currentBet >= minValidRaise && state.currentBet <= 25) {
          const raiseTarget = Math.min(p.stack + p.currentBet, state.currentBet * 2 + 6);
          get().playerAction('raise', raiseTarget);
        } else if (rand < 0.48 && toCall <= 22) {
          get().playerAction('call');
        } else {
          get().playerAction('fold');
        }
      }
    }
  }
}));
