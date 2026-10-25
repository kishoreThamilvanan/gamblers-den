import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { usePokerStore } from '@/lib/store';

describe('Poker Game Store & State Machine (src/lib/store.ts)', () => {
  beforeEach(() => {
    // Reset to a fresh game before each test
    usePokerStore.getState().startNewGame();
    // Pause any background AI timers by switching to LOBBY and back when needed
    usePokerStore.getState().quitToLobby();
  });

  it('initializes 9 players with Hero anchored at seat 0 and $200 starting stacks', () => {
    usePokerStore.getState().startNewGame();
    const state = usePokerStore.getState();

    assert.equal(state.players.length, 9);
    assert.equal(state.heroSeatIndex, 0);
    assert.equal(state.players[0].archetype, 'Hero');
    assert.equal(state.phase, 'PREFLOP');

    // Every player is dealt 2 hole cards -> 18 dealt, 34 left in deck
    for (const player of state.players) {
      assert.equal(player.holeCards.length, 2);
      assert.equal(player.hasFolded, false);
    }
    assert.equal(state.deck.getCards().length, 34);

    // Clean up any scheduled AI timeout
    usePokerStore.getState().quitToLobby();
  });

  it('posts Small Blind ($1) and Big Blind ($2) with visual action badges on dealNextHand', () => {
    usePokerStore.getState().startNewGame();
    const state = usePokerStore.getState();

    const sbIdx = (state.dealerIndex + 1) % 9;
    const bbIdx = (state.dealerIndex + 2) % 9;
    const utgIdx = (state.dealerIndex + 3) % 9;

    assert.equal(state.players[sbIdx].currentBet, 1);
    assert.equal(state.players[sbIdx].stack, 199);
    assert.equal(state.players[sbIdx].lastAction?.type, 'sb');
    assert.equal(state.players[sbIdx].lastAction?.label, 'SB $1');

    assert.equal(state.players[bbIdx].currentBet, 2);
    assert.equal(state.players[bbIdx].stack, 198);
    assert.equal(state.players[bbIdx].lastAction?.type, 'bb');
    assert.equal(state.players[bbIdx].lastAction?.label, 'BB $2');

    assert.equal(state.pot, 3);
    assert.equal(state.currentBet, 2);
    assert.equal(state.activePlayerIndex, utgIdx);

    usePokerStore.getState().quitToLobby();
  });

  it('records visual action badges and live ticker events for raise, call, check, and fold', () => {
    usePokerStore.getState().startNewGame();

    // Force Hero (seat 0) to be the active actor
    usePokerStore.setState({ activePlayerIndex: 0 });
    usePokerStore.getState().playerAction('raise', 10);

    let state = usePokerStore.getState();
    assert.equal(state.players[0].currentBet, 10);
    assert.equal(state.players[0].stack, 190);
    assert.equal(state.players[0].lastAction?.type, 'raise');
    assert.equal(state.players[0].lastAction?.label, 'RAISE $10');
    assert.equal(state.lastActionEvent?.type, 'raise');
    assert.equal(state.lastActionEvent?.label, 'RAISE $10');
    assert.equal(state.currentBet, 10);

    // Next player (seat 1) calls $10
    usePokerStore.setState({ activePlayerIndex: 1 });
    usePokerStore.getState().playerAction('call');

    state = usePokerStore.getState();
    assert.equal(state.players[1].currentBet, 10);
    assert.equal(state.players[1].lastAction?.type, 'call');
    assert.equal(state.lastActionEvent?.type, 'call');

    // Next player (seat 2) folds
    usePokerStore.setState({ activePlayerIndex: 2 });
    usePokerStore.getState().playerAction('fold');

    state = usePokerStore.getState();
    assert.equal(state.players[2].hasFolded, true);
    assert.equal(state.players[2].lastAction?.type, 'fold');
    assert.equal(state.players[2].lastAction?.label, 'FOLDED');
    assert.equal(state.lastActionEvent?.type, 'fold');

    usePokerStore.getState().quitToLobby();
  });

  it('awards pot and sets lastHandResult when all opponents fold', () => {
    usePokerStore.getState().startNewGame();

    // Mark players 1..7 as already folded, leaving only Hero (0) and Player 8
    const players = usePokerStore.getState().players.map((p, idx) => ({
      ...p,
      hasFolded: idx >= 1 && idx <= 7,
    }));
    usePokerStore.setState({ players, activePlayerIndex: 8, pot: 15 });

    // Player 8 folds -> Hero wins $15 pot uncontested
    usePokerStore.getState().playerAction('fold');

    const state = usePokerStore.getState();
    assert.equal(state.phase, 'SHOWDOWN');
    assert.equal(state.pot, 0);
    assert.equal(state.communityCards.length, 5);
    assert.ok(state.lastHandResult);
    assert.equal(state.lastHandResult.isHeroWinner, true);
    assert.equal(state.lastHandResult.byFold, true);
    assert.equal(state.lastHandResult.amount, 15);
    assert.equal(state.lastHandResult.wasRunout, true);
    assert.ok(state.lastHandResult.heroPotentialHand);
    assert.equal(state.lastHandResult.heroPotentialHand.wasFolded, false);
    assert.ok(state.lastHandResult.winnerIds.includes('p0'));

    usePokerStore.getState().quitToLobby();
  });

  it('runs out remaining community cards and computes hero potential hand when Hero folds early', () => {
    usePokerStore.getState().startNewGame();

    // Mark players 2..8 as folded, leaving Hero (0) and Player 1
    const players = usePokerStore.getState().players.map((p, idx) => ({
      ...p,
      hasFolded: idx >= 2,
    }));
    usePokerStore.setState({ players, activePlayerIndex: 0, pot: 20 });

    // Hero folds preflop -> Player 1 wins
    usePokerStore.getState().playerAction('fold');

    const state = usePokerStore.getState();
    assert.equal(state.phase, 'SHOWDOWN');
    assert.equal(state.communityCards.length, 5);
    assert.ok(state.lastHandResult);
    assert.equal(state.lastHandResult.isHeroWinner, false);
    assert.equal(state.lastHandResult.byFold, true);
    assert.equal(state.lastHandResult.wasRunout, true);
    assert.ok(state.lastHandResult.heroPotentialHand);
    assert.equal(state.lastHandResult.heroPotentialHand.wasFolded, true);
    assert.equal(state.lastHandResult.heroPotentialHand.foldStreet, 'PREFLOP');

    usePokerStore.getState().quitToLobby();
  });

  it('progresses cleanly across PREFLOP -> FLOP -> TURN -> RIVER -> SHOWDOWN and evaluates showdown winner', () => {
    usePokerStore.getState().startNewGame();

    // Advance PREFLOP -> FLOP
    usePokerStore.getState().advancePhase();
    let state = usePokerStore.getState();
    assert.equal(state.phase, 'FLOP');
    assert.equal(state.communityCards.length, 3);
    assert.equal(state.currentBet, 0);

    // Advance FLOP -> TURN
    usePokerStore.getState().advancePhase();
    state = usePokerStore.getState();
    assert.equal(state.phase, 'TURN');
    assert.equal(state.communityCards.length, 4);

    // Advance TURN -> RIVER
    usePokerStore.getState().advancePhase();
    state = usePokerStore.getState();
    assert.equal(state.phase, 'RIVER');
    assert.equal(state.communityCards.length, 5);

    // Advance RIVER -> SHOWDOWN
    usePokerStore.getState().advancePhase();
    state = usePokerStore.getState();
    assert.equal(state.phase, 'SHOWDOWN');
    assert.equal(state.pot, 0);
    assert.ok(state.lastHandResult);
    assert.equal(state.lastHandResult.byFold, false);
    assert.ok(state.lastHandResult.winnerIds.length >= 1);

    usePokerStore.getState().quitToLobby();
  });

  it('updates gameSpeed setting between relaxed, normal, and fast', () => {
    usePokerStore.getState().setGameSpeed('fast');
    assert.equal(usePokerStore.getState().gameSpeed, 'fast');

    usePokerStore.getState().setGameSpeed('relaxed');
    assert.equal(usePokerStore.getState().gameSpeed, 'relaxed');
  });

  it('supports configurable 2-Max and 6-Max tables with custom buy-in stacks', () => {
    usePokerStore.getState().setTableConfig({
      tableSize: 6,
      buyInAmount: 300,
      difficulty: 'intermediate',
      gameMode: 'cash',
    });
    usePokerStore.getState().startNewGame();
    let state = usePokerStore.getState();

    assert.equal(state.players.length, 6);
    assert.equal(state.players[0].archetype, 'Hero');
    // Total chips across all 6 players + pot should equal 6 * 300 = 1800
    const totalChips6 = state.players.reduce((s, p) => s + p.stack, 0) + state.pot;
    assert.equal(totalChips6, 1800);
    usePokerStore.getState().quitToLobby();

    // Test 2-Max Heads-Up
    usePokerStore.getState().setTableConfig({
      tableSize: 2,
      buyInAmount: 100,
      difficulty: 'advanced',
      gameMode: 'cash',
    });
    usePokerStore.getState().startNewGame();
    state = usePokerStore.getState();

    assert.equal(state.players.length, 2);
    const totalChips2 = state.players.reduce((s, p) => s + p.stack, 0) + state.pot;
    assert.equal(totalChips2, 200);

    // Reset default config for subsequent tests
    usePokerStore.getState().setTableConfig({
      tableSize: 9,
      buyInAmount: 200,
      difficulty: 'intermediate',
      gameMode: 'cash',
      maxRebuys: 3,
    });
    usePokerStore.getState().quitToLobby();
  });

  it('generates Live Limp-Punisher drill scenarios with Hero on the Button facing limpers', () => {
    usePokerStore.getState().setTableConfig({
      tableSize: 6,
      buyInAmount: 200,
      difficulty: 'intermediate',
      gameMode: 'limp_punisher',
    });
    usePokerStore.getState().startNewGame();
    const state = usePokerStore.getState();

    assert.equal(state.dealerIndex, 0);
    assert.equal(state.activePlayerIndex, 0);
    assert.equal(state.players[0].position, 'BTN');
    assert.equal(state.currentBet, 2);

    // At least 1 non-blind player should have limped for $2
    const limpers = state.players.filter(
      (p, idx) => idx >= 3 && !p.hasFolded && p.currentBet === 2
    );
    assert.ok(limpers.length >= 1 && limpers.length <= 3);

    // Reset back to standard cash mode
    usePokerStore.getState().setTableConfig({
      tableSize: 9,
      buyInAmount: 200,
      difficulty: 'intermediate',
      gameMode: 'cash',
      maxRebuys: 3,
    });
    usePokerStore.getState().quitToLobby();
  });

  it('records EV leaks in leakLedger and populates handHistory for the Hand Replayer', () => {
    usePokerStore.getState().setTableConfig({
      tableSize: 6,
      buyInAmount: 200,
      difficulty: 'intermediate',
      gameMode: 'limp_punisher',
    });
    usePokerStore.getState().startNewGame();

    // Hero is on BTN facing limpers with a strong hand -> flat calling ($2) is a Limp-Punisher leak
    usePokerStore.getState().playerAction('call');
    const stateAfterCall = usePokerStore.getState();

    assert.ok((stateAfterCall.sessionStats.leakLedger || []).length >= 1);
    assert.ok(stateAfterCall.currentHandSteps.length >= 1);

    // Complete hand to showdown so lastHandRecord is saved
    usePokerStore.getState().advancePhase(); // FLOP
    usePokerStore.getState().advancePhase(); // TURN
    usePokerStore.getState().advancePhase(); // RIVER
    usePokerStore.getState().advancePhase(); // SHOWDOWN

    const finalState = usePokerStore.getState();
    assert.ok(finalState.lastHandRecord);
    assert.ok(finalState.handHistory.length >= 1);

    // Reset default config
    usePokerStore.getState().setTableConfig({
      tableSize: 9,
      buyInAmount: 200,
      difficulty: 'intermediate',
      gameMode: 'cash',
      maxRebuys: 3,
    });
    usePokerStore.getState().quitToLobby();
  });

  it('enforces maxRebuys when rebuyHero is invoked', () => {
    usePokerStore.getState().setTableConfig({
      tableSize: 6,
      buyInAmount: 200,
      maxRebuys: 1,
      difficulty: 'intermediate',
      gameMode: 'cash',
    });
    usePokerStore.getState().startNewGame();
    usePokerStore.getState().quitToLobby();

    // Bust Hero and invoke first rebuy
    const bustedPlayers = usePokerStore.getState().players.map((p, idx) =>
      idx === 0 ? { ...p, stack: 0 } : p
    );
    usePokerStore.setState({ players: bustedPlayers, phase: 'SHOWDOWN', rebuysUsed: 0 });

    usePokerStore.getState().rebuyHero();
    assert.equal(usePokerStore.getState().rebuysUsed, 1);
    usePokerStore.getState().quitToLobby();

    // Attempt a second rebuy when maxRebuys is 1 -> should not increment rebuysUsed
    usePokerStore.setState({ phase: 'SHOWDOWN' });
    usePokerStore.getState().rebuyHero();
    assert.equal(usePokerStore.getState().rebuysUsed, 1);

    // Reset default config
    usePokerStore.getState().setTableConfig({
      tableSize: 9,
      buyInAmount: 200,
      maxRebuys: 3,
      difficulty: 'intermediate',
      gameMode: 'cash',
    });
    usePokerStore.getState().quitToLobby();
  });
});
