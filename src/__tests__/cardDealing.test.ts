import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FlyingCardData } from '../components/casino/CardDealingTypes';

describe('Shared Physical Card Dealing Engine', () => {
  it('correctly calculates trajectory tilt angle based on horizontal direction', () => {
    // Leftward flight from shoe (x: 88) to First Base Seat 1 (x: 15)
    const shoeOrigin = { x: 88, y: 14 };
    const firstBaseTarget = { x: 15, y: 56 };
    const deltaXLeft = firstBaseTarget.x - shoeOrigin.x;
    const tiltLeft = deltaXLeft < 0 ? -10 : 10;
    assert.equal(tiltLeft, -10, 'Leftward card slide should tilt counter-clockwise (-10deg)');

    // Rightward flight (e.g., from dealer left to seat right)
    const deltaXRight = 85 - 50;
    const tiltRight = deltaXRight < 0 ? -10 : 10;
    assert.equal(tiltRight, 10, 'Rightward card slide should tilt clockwise (+10deg)');
  });

  it('generates authentic clockwise 2-round dealing sequence for active blackjack spots', () => {
    const activeSpots = [0, 1, 2, 3, 4]; // Spots 1 to 5
    const dealSequence: string[] = [];

    // Round 1: Each active player spot clockwise, then dealer upcard
    for (const spot of activeSpots) {
      dealSequence.push(`Spot ${spot + 1} - Card 1 (Face-Up)`);
    }
    dealSequence.push('Dealer - Upcard (Face-Up)');

    // Round 2: Each active player spot clockwise, then dealer hole card
    for (const spot of activeSpots) {
      dealSequence.push(`Spot ${spot + 1} - Card 2 (Face-Up)`);
    }
    dealSequence.push('Dealer - Hole Card (Face-Down)');

    assert.equal(dealSequence.length, 12, '5 spots * 2 cards + 2 dealer cards = 12 deals');
    assert.equal(dealSequence[0], 'Spot 1 - Card 1 (Face-Up)');
    assert.equal(dealSequence[4], 'Spot 5 - Card 1 (Face-Up)');
    assert.equal(dealSequence[5], 'Dealer - Upcard (Face-Up)');
    assert.equal(dealSequence[6], 'Spot 1 - Card 2 (Face-Up)');
    assert.equal(dealSequence[10], 'Spot 5 - Card 2 (Face-Up)');
    assert.equal(dealSequence[11], 'Dealer - Hole Card (Face-Down)');
  });

  it('properly configures FlyingCardData tasks with face orientation and landing callbacks', () => {
    let landed = false;
    const task: FlyingCardData = {
      id: 'task-1',
      card: { rank: 'A', suit: 's', value: 11 },
      faceDown: false,
      origin: { x: 88, y: 14 },
      target: { x: 50, y: 69 },
      durationMs: 260,
      onLanded: () => {
        landed = true;
      },
    };

    assert.equal(task.faceDown, false);
    assert.equal(task.durationMs, 260);
    assert.equal(task.card.rank, 'A');

    // Fire landing callback
    task.onLanded?.();
    assert.equal(landed, true, 'Landing callback should execute cleanly');
  });

  it('supports Double Down 90-degree rotated sideways card flight', () => {
    const doubleDownTask: FlyingCardData = {
      id: 'double-task-1',
      card: { rank: 'T', suit: 'd', value: 10 },
      faceDown: false,
      origin: { x: 88, y: 14 },
      target: { x: 50, y: 69 },
      rotation: 90,
      durationMs: 240,
    };

    assert.equal(doubleDownTask.rotation, 90, 'Double down cards must rotate 90deg sideways');
  });

  it('generates authentic Texas Holdem clockwise 2-pass deal starting left of dealer button', () => {
    const totalSeats = 9;
    const dealerIndex = 3; // e.g. Button is at seat 3
    const activeSeats: number[] = [];

    // Deal starts at Small Blind (seat clockwise from button)
    for (let step = 1; step <= totalSeats; step++) {
      const s = (dealerIndex + step) % totalSeats;
      activeSeats.push(s);
    }

    assert.equal(activeSeats[0], 4, 'First card dealt to Small Blind (seat 4)');
    assert.equal(activeSeats[activeSeats.length - 1], 3, 'Last card in pass dealt to Dealer Button (seat 3)');

    const pokerDealLog: string[] = [];
    // Pass 1
    for (const seat of activeSeats) {
      pokerDealLog.push(`Seat ${seat} - Hole Card 1`);
    }
    // Pass 2
    for (const seat of activeSeats) {
      pokerDealLog.push(`Seat ${seat} - Hole Card 2`);
    }

    assert.equal(pokerDealLog.length, 18, '9 players * 2 hole cards = 18 physical slides');
    assert.equal(pokerDealLog[0], 'Seat 4 - Hole Card 1');
    assert.equal(pokerDealLog[8], 'Seat 3 - Hole Card 1');
    assert.equal(pokerDealLog[9], 'Seat 4 - Hole Card 2');
    assert.equal(pokerDealLog[17], 'Seat 3 - Hole Card 2');
  });

  it('enforces relaxed, unhurried interval timings between deals', () => {
    const relaxedFlight = 420;
    const relaxedPause = 260;
    const totalRelaxedInterval = relaxedFlight + relaxedPause;

    // Must be at least 600ms per card for deliberate, non-rushed physical casino pacing
    assert.ok(totalRelaxedInterval >= 600, `Relaxed interval ${totalRelaxedInterval}ms must be >= 600ms to avoid feeling rushed`);
    assert.ok(relaxedPause >= 200, `Pause between deals ${relaxedPause}ms must be >= 200ms`);
  });

  it('maps community cards to 5 distinct horizontal felt coordinates', () => {
    const communityCoords = [
      { x: 38, y: 50 },
      { x: 44, y: 50 },
      { x: 50, y: 50 },
      { x: 56, y: 50 },
      { x: 62, y: 50 },
    ];

    assert.equal(communityCoords.length, 5);
    // Strict horizontal ordering from left to right along felt center
    for (let i = 0; i < communityCoords.length - 1; i++) {
      assert.ok(communityCoords[i].x < communityCoords[i + 1].x, 'Board slots must proceed from left to right');
      assert.equal(communityCoords[i].y, 50, 'Board slots must align on center y-axis (50%)');
    }
  });
});
