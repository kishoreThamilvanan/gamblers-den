import { GameSession as PokerGameSession } from '@/types/poker';

export const MAX_SAVED_SESSIONS = 5;

export type SupportedGameType = 'poker' | 'blackjack' | 'roulette';

export interface BaseSessionMeta {
  id: string;
  createdAt: number;
  lastPlayedAt: number;
  handsPlayed: number;
  tableBankroll: number;
}

export type BlackjackStakesTier = 'casual' | 'regular' | 'vip';

export interface BlackjackTableConfig {
  stakesTier: BlackjackStakesTier;
  minBet: number;
  maxBet: number;
  spotCount: number; // 1 to 5 spots
  autoFillBots: boolean;
  deckCount: 2 | 6;
  trainingMode: 'standard' | 'counting';
}

export interface BlackjackSessionSpot {
  id: string;
  seatNumber: number;
  bet: number;
  isBot: boolean;
  botName?: string;
  botAvatar?: string;
}

export interface BlackjackRecentOutcome {
  roundNumber: number;
  dealerTotal: number;
  dealerBust: boolean;
  netHeroProfit: number;
  timestamp: number;
}

export interface BlackjackSession extends BaseSessionMeta {
  gameType: 'blackjack';
  config: BlackjackTableConfig;
  bankroll: number;
  spots: BlackjackSessionSpot[];
  recentOutcomes: BlackjackRecentOutcome[];
}

export type RouletteStakesTier = 'casual' | 'regular' | 'vip';
export type RouletteWheelVariant = 'european' | 'american';

export interface RouletteTableConfig {
  variant: RouletteWheelVariant;
  stakesTier: RouletteStakesTier;
  minBet: number;
  maxBet: number;
  betTimerSeconds: number | null; // null indicates manual spin
  buyInAmount: number;
}

export interface RouletteRecentNumber {
  pocket: string | number;
  color: 'red' | 'black' | 'green';
  timestamp: number;
}

export interface RouletteSession extends BaseSessionMeta {
  gameType: 'roulette';
  config: RouletteTableConfig;
  bankroll: number;
  totalWagered: number;
  totalWon: number;
  recentNumbers: RouletteRecentNumber[];
}

export type PokerSession = PokerGameSession;
