import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateAssignment, isValidAssignment, encodeState, decodeState } from './santa.ts';

test('generateAssignment returns null for fewer than 2 participants', () => {
  assert.equal(generateAssignment([], [], 1), null);
  assert.equal(generateAssignment(['Alice'], [], 1), null);
});

test('generateAssignment returns null for duplicate names', () => {
  assert.equal(generateAssignment(['Alice', 'Alice', 'Bob'], [], 1), null);
});

test('generateAssignment: with exactly 2 participants, each is assigned to the other', () => {
  const result = generateAssignment(['Alice', 'Bob'], [], 42);
  assert.deepEqual(result, { Alice: 'Bob', Bob: 'Alice' });
});

test('generateAssignment never assigns anyone to themselves, across many seeds and group sizes', () => {
  const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];
  for (let seed = 0; seed < 30; seed++) {
    const result = generateAssignment(names, [], seed);
    assert.ok(result !== null);
    for (const giver of names) {
      assert.notEqual(result[giver], giver, `seed ${seed}: ${giver} assigned to self`);
    }
  }
});

test('generateAssignment produces a valid bijection (everyone gives once, everyone receives once)', () => {
  const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];
  const result = generateAssignment(names, [], 7);
  const receivers = Object.values(result);
  assert.equal(new Set(receivers).size, names.length);
});

test('generateAssignment respects exclusion pairs across many seeds', () => {
  const names = ['Alice', 'Bob', 'Carol', 'Dave'];
  const exclusions = [['Alice', 'Bob']]; // e.g. a couple who shouldn't draw each other
  for (let seed = 0; seed < 30; seed++) {
    const result = generateAssignment(names, exclusions, seed);
    assert.ok(result !== null);
    assert.notEqual(result.Alice, 'Bob');
    assert.notEqual(result.Bob, 'Alice');
  }
});

test('generateAssignment is deterministic for a fixed seed (required for a working share link)', () => {
  const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];
  const a = generateAssignment(names, [], 99);
  const b = generateAssignment(names, [], 99);
  assert.deepEqual(a, b);
});

test('generateAssignment returns null when constraints make an assignment impossible', () => {
  // Two people who are mutually excluded: the only derangement of 2 is A<->B, which is excluded.
  assert.equal(generateAssignment(['Alice', 'Bob'], [['Alice', 'Bob']], 1), null);
});

test('generateAssignment returns null when all pairs in a 3-person group are excluded', () => {
  const names = ['Alice', 'Bob', 'Carol'];
  const exclusions = [['Alice', 'Bob'], ['Bob', 'Carol'], ['Alice', 'Carol']];
  assert.equal(generateAssignment(names, exclusions, 5), null);
});

test('isValidAssignment rejects a self-assignment', () => {
  assert.equal(isValidAssignment(['Alice', 'Bob'], [], { Alice: 'Alice', Bob: 'Bob' }), false);
});

test('isValidAssignment rejects an excluded pair', () => {
  const assignment = { Alice: 'Bob', Bob: 'Alice' };
  assert.equal(isValidAssignment(['Alice', 'Bob'], [['Alice', 'Bob']], assignment), false);
});

test('isValidAssignment accepts a correct derangement', () => {
  const assignment = { Alice: 'Bob', Bob: 'Carol', Carol: 'Alice' };
  assert.equal(isValidAssignment(['Alice', 'Bob', 'Carol'], [], assignment), true);
});

test('encodeState / decodeState round-trips a full scenario', () => {
  const state = { names: ['Alice', 'Bob'], exclusions: [['Alice', 'Bob']], seed: 42 };
  const params = encodeState(state);
  const fallback = { names: [], exclusions: [], seed: 0 };
  const decoded = decodeState(params, fallback);
  assert.deepEqual(decoded, state);
});

test('decodeState falls back safely on missing or corrupted data', () => {
  const fallback = { names: ['X'], exclusions: [], seed: 1 };
  assert.deepEqual(decodeState(new URLSearchParams(), fallback), fallback);
  assert.deepEqual(decodeState(new URLSearchParams('d=not-valid-base64url!!!'), fallback), fallback);
});
