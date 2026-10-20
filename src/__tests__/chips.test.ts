import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBankrollChips,
  calculateBetChips,
  DENOMINATIONS,
} from '@/components/poker/ChipStack';

describe('Physical Chip Stack Calculator (src/components/poker/ChipStack.tsx)', () => {
  it('defines standard casino $100, $25, $5, and $1 denominations', () => {
    assert.deepEqual(
      DENOMINATIONS.map((d) => d.value),
      [100, 25, 5, 1]
    );
  });

  it('returns empty array for zero or negative stack amounts', () => {
    assert.deepEqual(calculateBankrollChips(0), []);
    assert.deepEqual(calculateBankrollChips(-15), []);
    assert.deepEqual(calculateBetChips(0), []);
    assert.deepEqual(calculateBetChips(-5), []);
  });

  it('breaks down small stacks (< $10) into $5 Red and $1 Blue chips', () => {
    const stack7 = calculateBankrollChips(7);
    assert.equal(stack7.length, 2);
    assert.equal(stack7[0].denom.value, 5);
    assert.equal(stack7[0].count, 1);
    assert.equal(stack7[1].denom.value, 1);
    assert.equal(stack7[1].count, 2);
  });

  it('breaks down a standard $200 buy-in into realistic casino chip columns', () => {
    const stack200 = calculateBankrollChips(200);
    assert.ok(stack200.length > 0);
    assert.equal(stack200[0].denom.value, 100);
    assert.equal(stack200[0].count, 2);
  });

  it('breaks down mixed bankroll amounts ($187) across $100, $25, $5, and $1 denominations', () => {
    const stack187 = calculateBankrollChips(187);
    const values = stack187.map((c) => c.denom.value);
    assert.ok(values.includes(100));
    assert.ok(values.includes(25));
    assert.ok(values.includes(5));
    assert.ok(values.includes(1));
  });

  it('calculates bet chip stacks accurately for blinds and raises', () => {
    const sbBet = calculateBetChips(1);
    assert.equal(sbBet.length, 1);
    assert.equal(sbBet[0].denom.value, 1);
    assert.equal(sbBet[0].count, 1);

    const openRaise12 = calculateBetChips(12);
    assert.equal(openRaise12.length, 2);
    assert.equal(openRaise12[0].denom.value, 5);
    assert.equal(openRaise12[0].count, 2);
    assert.equal(openRaise12[1].denom.value, 1);
    assert.equal(openRaise12[1].count, 2);
  });
});
