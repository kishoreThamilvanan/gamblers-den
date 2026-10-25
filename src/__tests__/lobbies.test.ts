import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { BlackjackLobbyView } from '../components/blackjack/BlackjackLobbyView';
import { RouletteLobbyView } from '../components/roulette/RouletteLobbyView';
import { BlackjackSession, RouletteSession } from '../lib/sessions/types';

describe('Blackjack Lobby View (src/components/blackjack/BlackjackLobbyView.tsx)', () => {
  const dummyUser = {
    uid: 'user-bj',
    email: 'shark@example.com',
    displayName: 'Vegas Shark',
    nickname: 'Vegas Shark',
    avatarUrl: 'https://example.com/avatar.png',
    careerBankroll: 3500,
    provider: 'google' as const,
    isGuest: false,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    careerStats: {
      totalHandsPlayed: 100,
      totalVpipHands: 50,
      totalPfrHands: 30,
      careerNetProfit: 1500,
      careerOptimalCount: 80,
      careerLeakCount: 5,
      careerBlunderCount: 0,
      careerEvLoss: 25,
      sessionsCompleted: 10,
      topCareerLeaks: [],
    },
  };

  it('renders 5-part configuration deck and empty state when no saved sessions exist', () => {
    const html = renderToString(
      React.createElement(BlackjackLobbyView, {
        savedSessions: [],
        currentConfig: {
          stakesTier: 'regular',
          minBet: 25,
          maxBet: 1000,
          spotCount: 3,
          autoFillBots: true,
          deckCount: 6,
          trainingMode: 'standard',
        },
        onConfigChange: () => {},
        onStartNewTable: () => {},
        onResumeSession: () => {},
        onDeleteSession: () => {},
        userProfile: dummyUser,
      })
    );

    assert.ok(html.includes('Blackjack Lounge'), 'Should render header title');
    assert.ok(html.includes('Casino Floor'), 'Should render Casino Floor navigation button in lobby');
    assert.equal(html.includes('title="Return to Game Lobby &amp; Table Selector"'), false, 'Should NOT render Lobby button in lobby');
    assert.ok(html.includes('Table Stakes Tier'), 'Should render stakes selector');
    assert.ok(html.includes('Active Spots'), 'Should render active spots selector');
    assert.ok(html.includes('Empty Spot Fill'), 'Should render empty spot fill selector');
    assert.ok(html.includes('Shoe Deck Size'), 'Should render shoe deck selector');
    assert.ok(html.includes('Game Mode'), 'Should render training mode selector');
    assert.ok(html.includes('No active Blackjack sessions saved yet'), 'Should render empty state');
    assert.ok(html.includes('Start New Table'), 'Should render CTA');
  });

  it('renders saved session card with telemetry and recent outcome', () => {
    const mockSession: BlackjackSession = {
      id: 'bj-test-1',
      gameType: 'blackjack',
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      handsPlayed: 12,
      tableBankroll: 2450,
      bankroll: 2450,
      config: {
        stakesTier: 'vip',
        minBet: 100,
        maxBet: 5000,
        spotCount: 3,
        autoFillBots: true,
        deckCount: 6,
        trainingMode: 'standard',
      },
      spots: [
        { id: 's1', seatNumber: 1, bet: 100, isBot: false },
        { id: 's2', seatNumber: 2, bet: 100, isBot: false },
      ],
      recentOutcomes: [
        { roundNumber: 12, dealerTotal: 22, dealerBust: true, netHeroProfit: 200, timestamp: Date.now() },
      ],
    };

    const html = renderToString(
      React.createElement(BlackjackLobbyView, {
        savedSessions: [mockSession],
        currentConfig: mockSession.config,
        onConfigChange: () => {},
        onStartNewTable: () => {},
        onResumeSession: () => {},
        onDeleteSession: () => {},
        userProfile: dummyUser,
      })
    );

    assert.ok(html.includes('VIP'), 'Should display VIP stakes tier');
    assert.ok(html.includes('12'), 'Should display hands played');
    assert.ok(html.includes('2,450'), 'Should display table bankroll');
    assert.ok(html.includes('+200'), 'Should display recent profit outcome');
    assert.ok(html.includes('Resume Session'), 'Should render resume session button');
  });
});

describe('Roulette Lobby View (src/components/roulette/RouletteLobbyView.tsx)', () => {
  const dummyUser = {
    uid: 'user-rl',
    email: 'croupier@example.com',
    displayName: 'Monte Carlo High Roller',
    nickname: 'High Roller',
    avatarUrl: 'https://example.com/avatar.png',
    careerBankroll: 7500,
    provider: 'google' as const,
    isGuest: false,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    careerStats: {
      totalHandsPlayed: 200,
      totalVpipHands: 100,
      totalPfrHands: 80,
      careerNetProfit: 4500,
      careerOptimalCount: 160,
      careerLeakCount: 10,
      careerBlunderCount: 0,
      careerEvLoss: 50,
      sessionsCompleted: 15,
      topCareerLeaks: [],
    },
  };

  it('renders 4-part configuration deck and empty state when no saved sessions exist', () => {
    const html = renderToString(
      React.createElement(RouletteLobbyView, {
        savedSessions: [],
        currentConfig: {
          variant: 'european',
          stakesTier: 'regular',
          minBet: 5,
          maxBet: 500,
          betTimerSeconds: 15,
          buyInAmount: 1000,
        },
        onConfigChange: () => {},
        onStartNewTable: () => {},
        onResumeSession: () => {},
        onDeleteSession: () => {},
        userProfile: dummyUser,
      })
    );

    assert.ok(html.includes('Monte Carlo Roulette'), 'Should render title');
    assert.ok(html.includes('Casino Floor'), 'Should render Casino Floor navigation button in lobby');
    assert.equal(html.includes('title="Return to Game Lobby &amp; Table Selector"'), false, 'Should NOT render Lobby button in lobby');
    assert.ok(html.includes('Wheel Variant'), 'Should render wheel variant selector');
    assert.ok(html.includes('Table Limits'), 'Should render table limits selector');
    assert.ok(html.includes('Betting Countdown Clock'), 'Should render timer selector');
    assert.ok(html.includes('Session Buy-In Stack'), 'Should render buy-in selector');
    assert.ok(html.includes('No active Roulette sessions saved yet'), 'Should render empty state');
    assert.ok(html.includes('Open Roulette Table'), 'Should render primary CTA');
  });

  it('renders saved session card with recent numbers preview pills', () => {
    const mockSession: RouletteSession = {
      id: 'rl-test-1',
      gameType: 'roulette',
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      handsPlayed: 32,
      tableBankroll: 1850,
      bankroll: 1850,
      totalWagered: 1200,
      totalWon: 2050,
      config: {
        variant: 'european',
        stakesTier: 'vip',
        minBet: 25,
        maxBet: 2500,
        betTimerSeconds: 15,
        buyInAmount: 1000,
      },
      recentNumbers: [
        { pocket: 17, color: 'black', timestamp: Date.now() - 3000 },
        { pocket: 0, color: 'green', timestamp: Date.now() - 2000 },
        { pocket: 32, color: 'red', timestamp: Date.now() - 1000 },
      ],
    };

    const html = renderToString(
      React.createElement(RouletteLobbyView, {
        savedSessions: [mockSession],
        currentConfig: mockSession.config,
        onConfigChange: () => {},
        onStartNewTable: () => {},
        onResumeSession: () => {},
        onDeleteSession: () => {},
        userProfile: dummyUser,
      })
    );

    assert.ok(html.includes('EUROPEAN WHEEL'), 'Should display European variant');
    assert.ok(html.includes('1,850'), 'Should display table bankroll');
    assert.ok(html.includes('32'), 'Should display spins played');
    assert.ok(html.includes('17'), 'Should display pocket 17');
    assert.ok(html.includes('Resume Session'), 'Should render resume button');
  });
});
