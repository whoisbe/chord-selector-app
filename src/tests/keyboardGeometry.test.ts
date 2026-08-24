import { describe, it, expect } from 'vitest';

import {
  BLACK_KEY_WIDTH,
  KEY_GAP,
  WHITE_KEY_WIDTH,
  isBlackKey,
  keyLayout,
  keyboardWidth,
} from '../lib/music/keyboard';

// The full extent of the ingested movement: F1 to D#6.
const PIECE_MIN = 29;
const PIECE_MAX = 87;

describe('keyboard geometry', () => {
  it('covers the movement range with 59 keys — 34 white, 25 black', () => {
    const keys = keyLayout(PIECE_MIN, PIECE_MAX);

    expect(keys.length).toBe(59);
    expect(keys.filter((key) => !key.isBlack).length).toBe(34);
    expect(keys.filter((key) => key.isBlack).length).toBe(25);
    expect(keys[0].pitch).toBe(PIECE_MIN);
    expect(keys[keys.length - 1].pitch).toBe(PIECE_MAX);
  });

  it('marks exactly the pitch classes 1, 3, 6, 8 and 10 as black', () => {
    const keys = keyLayout(PIECE_MIN, PIECE_MAX);
    const blackClasses = new Set([1, 3, 6, 8, 10]);

    for (const key of keys) {
      expect(key.isBlack).toBe(blackClasses.has(key.pitch % 12));
      expect(isBlackKey(key.pitch)).toBe(key.isBlack);
    }
  });

  // Check 7: the two rows align because they are the same numbers, not because
  // they look aligned. keyLayout depends on nothing but the pitch range.
  it('is a pure function of the pitch range — two calls return identical output', () => {
    const first = keyLayout(PIECE_MIN, PIECE_MAX);
    const second = keyLayout(PIECE_MIN, PIECE_MAX);

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('increases white-key x strictly with pitch, one white step apart', () => {
    const whiteKeys = keyLayout(PIECE_MIN, PIECE_MAX).filter((key) => !key.isBlack);

    expect(whiteKeys[0].x).toBe(0);
    for (let index = 1; index < whiteKeys.length; index += 1) {
      expect(whiteKeys[index].x).toBeGreaterThan(whiteKeys[index - 1].x);
      expect(whiteKeys[index].x - whiteKeys[index - 1].x).toBe(WHITE_KEY_WIDTH + KEY_GAP);
    }
  });

  it('places every black key between its neighbouring white keys', () => {
    const keys = keyLayout(PIECE_MIN, PIECE_MAX);
    const byPitch = new Map(keys.map((key) => [key.pitch, key] as const));
    const blackKeys = keys.filter((candidate) => candidate.isBlack);

    let comparisons = 0;
    for (const key of blackKeys) {
      const whiteBelow = byPitch.get(key.pitch - 1);
      const whiteAbove = byPitch.get(key.pitch + 1);

      // D#6 closes the range, so its upper neighbour E6 is not rendered. Every
      // other black key is bracketed by two white keys of the same layout.
      if (whiteBelow) {
        expect(whiteBelow.isBlack).toBe(false);
        expect(key.x).toBeGreaterThan(whiteBelow.x);
        comparisons += 1;
      }
      if (whiteAbove) {
        expect(whiteAbove.isBlack).toBe(false);
        expect(key.x).toBeLessThan(whiteAbove.x);
        comparisons += 1;
      }
    }

    expect(blackKeys.length).toBe(25);
    expect(comparisons).toBe(49);
    expect(byPitch.get(88)).toBe(undefined);
  });

  it('sizes keys to the app’s existing keyboard', () => {
    const keys = keyLayout(PIECE_MIN, PIECE_MAX);

    for (const key of keys) {
      expect(key.width).toBe(key.isBlack ? BLACK_KEY_WIDTH : WHITE_KEY_WIDTH);
    }

    // 34 white keys at 21px per step, less the trailing gap, plus the overhang
    // of D#6 — the range's final key is black.
    expect(keyboardWidth(keys)).toBeCloseTo(719.5, 5);
  });

  it('handles ranges that open or close on a black key without negative x', () => {
    const openingOnBlack = keyLayout(61, 65);
    expect(openingOnBlack[0].pitch).toBe(61);
    expect(openingOnBlack[0].isBlack).toBe(true);
    expect(Math.min(...openingOnBlack.map((key) => key.x))).toBe(0);

    const singleBlackKey = keyLayout(61, 61);
    expect(singleBlackKey).toEqual([{ pitch: 61, x: 0, width: BLACK_KEY_WIDTH, isBlack: true }]);
  });

  it('rejects ranges that are not ordered integer pitches', () => {
    expect(() => keyLayout(87, 29)).toThrow(RangeError);
    expect(() => keyLayout(29.5, 87)).toThrow(RangeError);
  });
});
