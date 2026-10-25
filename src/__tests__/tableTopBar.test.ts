import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { TableTopBar } from '../components/casino/TableTopBar';

describe('Standardized Casino TableTopBar Component', () => {
  it('renders exclusive Casino Floor navigation button when in lobby view (onExitToLobby absent)', () => {
    const html = renderToString(
      React.createElement(TableTopBar, {
        mode: 'lobby',
        title: 'FeltSense',
        subtitle: '9-Max $1/$2',
        floorHref: '/',
      })
    );

    assert.ok(html.includes('Casino Floor'), 'Should render Casino Floor navigation button');
    assert.ok(html.includes('href="/"'), 'Casino Floor button should link to root');
    assert.equal(html.includes('title="Return to Game Lobby &amp; Table Selector"'), false, 'Should NOT render Lobby button in lobby mode');
    assert.ok(html.includes('FeltSense'), 'Should render title');
    assert.ok(html.includes('9-Max $1/$2'), 'Should render subtitle');
  });

  it('renders exclusive Lobby return button in the fixed far-left slot when onExitToLobby is provided', () => {
    let lobbyExited = false;
    const html = renderToString(
      React.createElement(TableTopBar, {
        mode: 'game',
        title: 'FeltSense',
        subtitle: '9-Max $1/$2',
        onExitToLobby: () => {
          lobbyExited = true;
        },
        lobbyLabel: 'Lobby',
      })
    );

    assert.ok(html.includes('Lobby'), 'Should render Lobby button in game mode');
    assert.equal(html.includes('Casino Floor'), false, 'Should strictly NOT render Casino Floor inside active game');
    assert.equal(lobbyExited, false);
  });

  it('renders formatted career bankroll vault badge with currency formatting', () => {
    const html = renderToString(
      React.createElement(TableTopBar, {
        title: 'VIP Blackjack',
        bankroll: 5420,
        userProfile: {
          uid: 'user-1',
          email: 'player@example.com',
          displayName: 'CardShark',
          nickname: 'CardShark',
          avatarUrl: 'https://example.com/avatar.jpg',
          careerBankroll: 5420,
          provider: 'google',
          isGuest: false,
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          careerStats: {
            totalHandsPlayed: 42,
            totalVpipHands: 20,
            totalPfrHands: 15,
            careerNetProfit: 500,
            careerOptimalCount: 30,
            careerLeakCount: 2,
            careerBlunderCount: 0,
            careerEvLoss: 12,
            sessionsCompleted: 3,
            topCareerLeaks: [],
          },
        },
      })
    );

    assert.ok(html.includes('$5,420'), 'Bankroll should be formatted with thousands separator');
    assert.ok(html.includes('CardShark'), 'Should display user nickname in profile vault pill');
  });

  it('renders action buttons for Audio Mute, Analytics Stats, and Rules', () => {
    let muted = false;
    let statsOpened = false;
    let rulesOpened = false;

    const html = renderToString(
      React.createElement(TableTopBar, {
        title: 'Monte Carlo Roulette',
        soundMuted: false,
        onToggleMute: () => {
          muted = true;
        },
        onOpenStats: () => {
          statsOpened = true;
        },
        onOpenRules: () => {
          rulesOpened = true;
        },
      })
    );

    assert.ok(html.includes('Mute Sound'), 'Should include mute sound button title');
    assert.ok(html.includes('Roulette Rules &amp; Payouts') || html.includes('Rules &amp; Payouts'), 'Should include rules trigger');
    assert.equal(muted, false);
    assert.equal(statsOpened, false);
    assert.equal(rulesOpened, false);
  });

  it('renders consolidated Table Settings trigger button', () => {
    const html = renderToString(
      React.createElement(TableTopBar, {
        title: 'FeltSense',
        speed: 'relaxed',
        onSpeedChange: () => {},
        coachPosition: 'left',
        onCoachPositionChange: () => {},
        logPosition: 'right',
        onLogPositionChange: () => {},
        themes: [
          { id: 'emerald', label: 'Bellagio Green', active: true, onClick: () => {} },
          { id: 'royal', label: 'Macau Navy', active: false, onClick: () => {} },
        ],
      })
    );

    assert.ok(html.includes('Settings'), 'Should render Table Settings trigger button');
  });
});
