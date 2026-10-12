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
  TableActionEvent
} from './poker/types';
import { Deck } from './poker/deck';
import { BOT_PERSONAS } from './poker/personas';
import { evaluateAction } from './poker/coach';
import { evaluateHand } from './poker/evaluator';
import { sound } from './sound/soundSystem';
import {
  getSavedSessions,
  saveSessionToStorage,
  deleteSessionFromStorage,
  getSessionById
} from './poker/sessionStorage';

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

const POSITIONS: Position[] = ['UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

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

const createInitialPlayers = (heroSeatIndex: number): Player[] => {
  let botIdx = 0;
  return Array.from({ length: 9 }).map((_, i) => {
    if (i === heroSeatIndex) {
      return {
        id: `p${i}`,
        name: 'Hero (You)',
        nickname: 'You',
        seatIndex: i,
        position: POSITIONS[0],
        stack: 200,
        holeCards: [],
        isActive: true,
        hasFolded: false,
        isAllIn: false,
        currentBet: 0,
        archetype: 'Hero',
        avatarUrl: AVATAR_URLS[0],
        isThinking: false,
        lastAction: null
      };
    }
    const persona: BotPersona = BOT_PERSONAS[botIdx % BOT_PERSONAS.length];
    botIdx++;
    return {
      id: `p${i}`,
      name: persona.name,
      nickname: persona.nickname,
      personaId: persona.id,
      seatIndex: i,
      position: POSITIONS[0],
      stack: 200,
      holeCards: [],
      isActive: true,
      hasFolded: false,
      isAllIn: false,
      currentBet: 0,
      archetype: persona.archetype,
      avatarUrl: AVATAR_URLS[i % AVATAR_URLS.length],
      isThinking: false,
      lastAction: null
    };
  });
};

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

  // Atmosphere & View Setters
  setDisplayView: (view: DisplayView) => void;
  setTableTheme: (theme: TableTheme) => void;
  setAlwaysRevealHoleCards: (val: boolean) => void;
  toggleMute: () => void;
  toggleAmbient: () => void;
  setVolume: (val: number) => void;
  clearFeedback: () => void;
  setGameSpeed: (speed: GameSpeed) => void;

  // Session & Lifecycle Actions
  initLobby: () => void;
  startNewGame: () => void;
  loadGame: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  quitToLobby: () => void;
  autoSave: () => void;

  // In-Game Actions
  dealNextHand: () => void;
  playerAction: (action: 'fold' | 'check' | 'call' | 'bet' | 'raise', amount?: number) => void;
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
  sessionStats: {
    handsPlayed: 0,
    vpipHands: 0,
    pfrHands: 0,
    netProfit: 0,
    blunderCount: 0,
    leakCount: 0,
    optimalCount: 0,
    cumulativeEvLoss: 0,
    profitHistory: [{ hand: 0, profit: 0, balance: 200 }]
  },

  currentSessionId: null,
  handsPlayed: 0,
  lastAutoSavedAt: null,
  savedSessions: [],
  phase: 'PREFLOP',
  players: createInitialPlayers(0),
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
    set({
      savedSessions: sessions,
      viewMode: 'LOBBY',
      ambientPlaying: false
    });
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
      stats: state.sessionStats
    };

    const updated = saveSessionToStorage(sessionSnapshot);
    set({
      savedSessions: updated,
      lastAutoSavedAt: Date.now()
    });
  },

  startNewGame: () => {
    clearAITimeout();
    const sessionId = `session-${Date.now()}`;
    const initialPlayers = createInitialPlayers(0);
    const deck = new Deck();
    deck.reset();

    set({
      currentSessionId: sessionId,
      handsPlayed: 0,
      players: initialPlayers,
      dealerIndex: 0,
      heroSeatIndex: 0,
      deck,
      logs: ['Welcome to FeltSense! 9-Max $1/$2 NL Live Casino Simulation started.'],
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
        profitHistory: [{ hand: 0, profit: 0, balance: 200 }]
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
        profitHistory: [{ hand: 0, profit: 0, balance: 200 }]
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
      ambientPlaying: false
    });
  },

  dealNextHand: () => {
    clearAITimeout();
    const { players, dealerIndex, deck, handsPlayed } = get();
    deck.reset();

    sound.playCardDeal();

    const newDealerIndex = (dealerIndex + 1) % 9;

    const updatedPlayers: Player[] = players.map((p, i): Player => {
      const posIndex = (i - newDealerIndex + 8) % 9;
      const effectiveStack = p.stack <= 0 ? 200 : p.stack;
      return {
        ...p,
        stack: effectiveStack,
        hasFolded: false,
        isActive: true,
        isAllIn: false,
        currentBet: 0,
        isThinking: false,
        lastAction: null,
        holeCards: deck.drawMultiple(2),
        position: POSITIONS[(8 - posIndex + 6) % 9]
      };
    });

    // Blinds post
    const sbIndex = (newDealerIndex + 1) % 9;
    const bbIndex = (newDealerIndex + 2) % 9;
    const now = Date.now();

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

    const firstActor = (newDealerIndex + 3) % 9;
    const nextHandNumber = handsPlayed + 1;

    set({
      phase: 'PREFLOP',
      handsPlayed: nextHandNumber,
      players: updatedPlayers,
      dealerIndex: newDealerIndex,
      activePlayerIndex: firstActor,
      communityCards: [],
      pot: updatedPlayers[sbIndex].currentBet + updatedPlayers[bbIndex].currentBet,
      currentBet: 2,
      minRaise: 2,
      lastHandResult: null,
      lastActionEvent: null,
      logs: [...get().logs, `\n=== Hand #${nextHandNumber} Started ($1/$2 NL) ===`]
    });

    get().autoSave();

    if (updatedPlayers[firstActor].archetype !== 'Hero') {
      const persona = BOT_PERSONAS.find((bp) => bp.id === updatedPlayers[firstActor].personaId);
      const baseDelay = persona ? persona.thinkingDelayMin + Math.random() * (persona.thinkingDelayMax - persona.thinkingDelayMin) : 900;
      const delay = baseDelay * getSpeedMultiplier(get().gameSpeed);
      aiTimeoutId = setTimeout(() => {
        get().executeAIAction();
      }, delay);
    }
  },

  playerAction: (action, amount = 0) => {
    clearAITimeout();
    const state = get();
    const isHero = state.activePlayerIndex === state.heroSeatIndex;
    const p = { ...state.players[state.activePlayerIndex] };
    let newPot = state.pot;
    let newCurrentBet = state.currentBet;
    let newMinRaise = state.minRaise;
    let log = '';
    const now = Date.now();

    const updatedPlayers = [...state.players];

    // Sound triggers and visual action badge based on action
    if (action === 'fold') {
      p.hasFolded = true;
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
      sound.playChipSound();
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
      sound.playChipSplash();
      p.lastAction = p.isAllIn
        ? { type: 'allin', label: `ALL-IN $${totalBet}`, amount: totalBet, timestamp: now }
        : action === 'bet'
        ? { type: 'bet', label: `BET $${totalBet}`, amount: totalBet, timestamp: now }
        : { type: 'raise', label: `RAISE $${totalBet}`, amount: totalBet, timestamp: now };
      log = `${p.name} ${action}s to $${totalBet.toFixed(2)}.`;
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
          timestamp: now
        }
      : null;

    // --- Hero Coaching Evaluation & Stats Update ---
    const updatedStats = { ...state.sessionStats };
    if (isHero) {
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

      // Track VPIP & PFR preflop
      if (state.phase === 'PREFLOP') {
        if (action === 'call' || action === 'bet' || action === 'raise') {
          updatedStats.vpipHands += 1;
        }
        if (action === 'bet' || action === 'raise') {
          updatedStats.pfrHands += 1;
        }
      }

      if (feedback.rating === 'Blunder') {
        updatedStats.blunderCount += 1;
        updatedStats.cumulativeEvLoss += Math.abs(feedback.evLossEstimate);
      } else if (feedback.rating === 'Leak') {
        updatedStats.leakCount += 1;
        updatedStats.cumulativeEvLoss += Math.abs(feedback.evLossEstimate);
      } else if (feedback.rating === 'Optimal') {
        updatedStats.optimalCount += 1;
      }

      set({ currentFeedback: feedback });
    }

    set({
      players: updatedPlayers,
      pot: newPot,
      currentBet: newCurrentBet,
      minRaise: newMinRaise,
      lastActionEvent: actionEvent,
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

      const isHeroWinner = winner.archetype === 'Hero';
      const handResult: HandResult = {
        winnerNames: winner.name,
        winnerIds: [winner.id],
        handName: 'All Opponents Folded',
        amount: newPot,
        isHeroWinner,
        byFold: true,
        winningCards: isHeroWinner ? winner.holeCards : undefined,
      };

      // Update profit history
      const hero = updatedPlayers[state.heroSeatIndex];
      const netProfit = hero.stack - 200;
      const newProfitHistory = [
        ...updatedStats.profitHistory,
        { hand: state.handsPlayed, profit: netProfit, balance: hero.stack }
      ];

      set({
        phase: 'SHOWDOWN',
        pot: 0,
        lastHandResult: handResult,
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
    for (let i = 0; i < 9; i++) {
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
    let nextIndex = (state.activePlayerIndex + 1) % 9;
    while (updatedPlayers[nextIndex].hasFolded || updatedPlayers[nextIndex].isAllIn) {
      nextIndex = (nextIndex + 1) % 9;
    }

    set({ activePlayerIndex: nextIndex });
    get().autoSave();

    if (updatedPlayers[nextIndex].archetype !== 'Hero') {
      const persona = BOT_PERSONAS.find((bp) => bp.id === updatedPlayers[nextIndex].personaId);
      const baseDelay = persona ? persona.thinkingDelayMin + Math.random() * (persona.thinkingDelayMax - persona.thinkingDelayMin) : 900;
      const delay = baseDelay * getSpeedMultiplier(get().gameSpeed);
      aiTimeoutId = setTimeout(() => {
        get().executeAIAction();
      }, delay);
    }
  },

  advancePhase: () => {
    clearAITimeout();
    const state = get();
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
      // Keep FOLDED and ALL-IN badges visible across streets; clear street-specific actions
      lastAction: p.hasFolded || p.isAllIn ? p.lastAction : null
    }));

    const showdownLogs: string[] = [`--- Street: ${nextPhase} ---`];
    let finalPot = state.pot;

    if (nextPhase === 'SHOWDOWN') {
      sound.playWinPot();
      const activePlayers = updatedPlayers.filter((p) => !p.hasFolded);
      if (activePlayers.length > 0) {
        // Evaluate best hand
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

        const isHeroWinner = winners.some((w) => w.archetype === 'Hero');
        const handResult: HandResult = {
          winnerNames,
          winnerIds: winners.map((w) => w.id),
          handName: winEvaluation.name,
          amount: finalPot,
          isHeroWinner,
          byFold: false,
          winningCards: winners[0].holeCards,
        };

        finalPot = 0;

        // Update profit history
        const hero = updatedPlayers[state.heroSeatIndex];
        const netProfit = hero.stack - 200;
        const newProfitHistory = [
          ...state.sessionStats.profitHistory,
          { hand: state.handsPlayed, profit: netProfit, balance: hero.stack }
        ];

        set({
          sessionStats: {
            ...state.sessionStats,
            handsPlayed: state.handsPlayed,
            netProfit,
            profitHistory: newProfitHistory
          },
          lastHandResult: handResult
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
      lastActionEvent: null,
      logs: [...state.logs, ...showdownLogs]
    });

    get().autoSave();

    if (nextPhase !== 'SHOWDOWN') {
      let nextIndex = (state.dealerIndex + 1) % 9;
      while (updatedPlayers[nextIndex].hasFolded || updatedPlayers[nextIndex].isAllIn) {
        nextIndex = (nextIndex + 1) % 9;
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
    if (state.phase === 'SHOWDOWN' || state.viewMode !== 'GAME') return;

    const p = state.players[state.activePlayerIndex];
    if (!p || p.archetype === 'Hero' || p.hasFolded || p.isAllIn) return;

    const toCall = state.currentBet - p.currentBet;
    const persona = BOT_PERSONAS.find((bp) => bp.id === p.personaId);
    const archetype = persona ? persona.archetype : p.archetype;

    // --- Sophisticated Archetype AI Decision Matrix ---
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
            get().playerAction('bet', Math.min(p.stack, Math.max(state.minRaise, Math.floor(state.pot * 0.6))));
          } else {
            get().playerAction('check');
          }
        } else {
          get().playerAction('check');
        }
      }
      // 3. Aggro-Fish: Frequently stabs and bets
      else if (archetype === 'AggroFish') {
        if (Math.random() < 0.65) {
          const betSize = Math.max(state.minRaise, Math.floor(state.pot * 0.75) || 4);
          get().playerAction('bet', Math.min(p.stack, betSize));
        } else {
          get().playerAction('check');
        }
      }
      // 4. TAG: Selective c-bets based on board texture
      else {
        if (Math.random() < 0.5) {
          const betSize = Math.max(state.minRaise, Math.floor(state.pot * 0.5) || 4);
          get().playerAction('bet', Math.min(p.stack, betSize));
        } else {
          get().playerAction('check');
        }
      }
    } else {
      // Facing a bet/raise:
      // 1. Calling Station: Snaps calls 75%+ of bets up to $25
      if (archetype === 'CallingStation') {
        if (toCall > 35 && Math.random() < 0.6) {
          get().playerAction('fold');
        } else {
          get().playerAction('call');
        }
      }
      // 2. Nit: Folds unless holding premiums
      else if (archetype === 'Nit') {
        if (toCall > 6) {
          get().playerAction('fold');
        } else if (Math.random() < 0.4) {
          get().playerAction('call');
        } else {
          get().playerAction('fold');
        }
      }
      // 3. Aggro-Fish: Calls or raises back aggressively
      else if (archetype === 'AggroFish') {
        if (Math.random() < 0.3 && p.stack > toCall * 2) {
          const raiseAmount = Math.min(p.stack + p.currentBet, state.currentBet * 2.5);
          get().playerAction('raise', Math.floor(raiseAmount));
        } else if (toCall < 40 || Math.random() < 0.5) {
          get().playerAction('call');
        } else {
          get().playerAction('fold');
        }
      }
      // 4. TAG: Standard pot-odds call or fold
      else {
        if (toCall > state.pot * 0.8 && Math.random() < 0.7) {
          get().playerAction('fold');
        } else {
          get().playerAction('call');
        }
      }
    }
  }
}));
