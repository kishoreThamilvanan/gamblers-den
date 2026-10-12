export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise';

export type Phase = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN' | 'EVALUATION_MODAL';
export type Position = 'UTG' | 'UTG+1' | 'MP' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
export type Archetype = 'CallingStation' | 'Nit' | 'AggroFish' | 'TAG' | 'Hero';
export type BotArchetype = Archetype;

export interface BotPersona {
  id: string;
  name: string;
  nickname: string;
  archetype: Archetype;
  avatarSeed: string;
  avatarBg: string;
  avatarAccent: string;
  description: string;
  vpip: number;
  pfr: number;
  thinkingDelayMin: number;
  thinkingDelayMax: number;
}

export type PlayerActionVisualType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin' | 'sb' | 'bb';

export interface PlayerActionBadge {
  type: PlayerActionVisualType;
  label: string;
  amount?: number;
  timestamp: number;
}

export interface TableActionEvent {
  playerId: string;
  playerName: string;
  position: Position;
  type: PlayerActionVisualType;
  label: string;
  amount?: number;
  timestamp: number;
}

export interface Player {
  id: string;
  name: string;
  nickname?: string;
  seatIndex: number;
  position: Position;
  stack: number;
  holeCards: Card[];
  isActive: boolean;
  hasFolded: boolean;
  isAllIn: boolean;
  currentBet: number;
  archetype: Archetype;
  personaId?: string;
  avatarUrl?: string;
  isThinking?: boolean;
  lastAction?: PlayerActionBadge | null;
}

export type GameSpeed = 'relaxed' | 'normal' | 'fast';

export interface HandResult {
  winnerNames: string;
  winnerIds: string[];
  handName: string;
  amount: number;
  isHeroWinner: boolean;
  byFold: boolean;
  winningCards?: Card[];
}

export interface GameState {
  phase: Phase;
  players: Player[];
  dealerIndex: number;
  activePlayerIndex: number;
  communityCards: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  logs: string[];
  gameSpeed?: GameSpeed;
  lastHandResult?: HandResult | null;
  lastActionEvent?: TableActionEvent | null;
}

export type ViewMode = 'LOBBY' | 'GAME';
export type DisplayView = 'CASINO_SIM' | 'GRIND_LAB';
export type TableTheme = 'classic-green' | 'charcoal-dark';

export type CoachingRating = 'Optimal' | 'Acceptable' | 'Leak' | 'Blunder';

export interface CoachingFeedback {
  rating: CoachingRating;
  explanation: string;
  evLossEstimate: number; // In dollars (e.g. -4.50 or +2.00)
  action: string;
  handName?: string;
  potOddsPercent?: number;
  equityPercent?: number;
}

export interface SessionStats {
  handsPlayed: number;
  vpipHands: number;
  pfrHands: number;
  netProfit: number;
  blunderCount: number;
  leakCount: number;
  optimalCount: number;
  cumulativeEvLoss: number;
  profitHistory: { hand: number; profit: number; balance: number }[];
}

export interface GameSession {
  id: string;
  createdAt: number;
  lastPlayedAt: number;
  stakes: string;
  handsPlayed: number;
  phase: Phase;
  players: Player[];
  dealerIndex: number;
  activePlayerIndex: number;
  communityCards: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  logs: string[];
  remainingCards: Card[];
  heroSeatIndex: number;
  stats?: SessionStats;
}
