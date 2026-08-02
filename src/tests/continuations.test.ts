import { describe, it, expect } from 'vitest';

import { moonlightSonata } from '../data/pieces/moonlight-sonata';
import {
  occurrenceCount,
  possibleContinuations,
  possibleContinuationsByStaff,
  staffPitchRanges,
  streamPitchRange,
} from '../lib/music/continuations';
import { applyCapture, selectionPitches } from '../lib/music/capture';
import type { NoteGroup } from '../lib/music/types';

describe('corpus-constrained continuations', () => {
  // The founding phrase. Each committed group narrows the piece until exactly
  // one key can be pressed next — the reason this surface beats a pitch grid.
  it('collapses to a single continuation after the cross-staff F# octave', () => {
    expect(occurrenceCount(moonlightSonata, [{ notes: [54, 66] }])).toBe(1);
    expect(possibleContinuations(moonlightSonata, [{ notes: [54, 66] }])).toEqual([61]);
    expect(
      possibleContinuations(moonlightSonata, [{ notes: [54, 66] }, { notes: [61] }]),
    ).toEqual([64]);
  });

  it('reports the staff each continuation occurs on', () => {
    expect(possibleContinuationsByStaff(moonlightSonata, [{ notes: [54, 66] }])).toEqual([
      { pitch: 61, staves: [2] },
    ]);
    expect(
      possibleContinuationsByStaff(moonlightSonata, [{ notes: [54, 66] }, { notes: [61] }]),
    ).toEqual([{ pitch: 64, staves: [2] }]);
  });

  it('offers 20 continuations after a lone F#4, which occurs 77 times', () => {
    expect(occurrenceCount(moonlightSonata, [{ notes: [66] }])).toBe(77);

    const continuations = possibleContinuations(moonlightSonata, [{ notes: [66] }]);
    expect(continuations.length).toBe(20);
    expect(new Set(continuations).size).toBe(20);
    expect(continuations).toEqual([
      32, 35, 36, 37, 44, 47, 48, 49, 55, 56, 57, 59, 60, 61, 63, 67, 68, 69, 71, 72,
    ]);
  });

  it('offers every pitch in the piece before anything is committed', () => {
    const everyPitch = new Set(moonlightSonata.flatMap((group) => group.notes));

    expect(possibleContinuations(moonlightSonata, []).length).toBe(55);
    expect(possibleContinuations(moonlightSonata, [])).toEqual(
      Array.from(everyPitch).sort((left, right) => left - right),
    );
  });

  it('offers nothing after a prefix that does not occur', () => {
    expect(possibleContinuations(moonlightSonata, [{ notes: [54, 66] }, { notes: [60] }])).toEqual(
      [],
    );
    expect(possibleContinuations(moonlightSonata, [{ notes: [] }])).toEqual([]);
  });

  it('matches groups exactly — an extra note in the prefix finds nothing', () => {
    expect(possibleContinuations(moonlightSonata, [{ notes: [54, 66, 61] }])).toEqual([]);
  });

  it('ignores note order and duplicates inside a prefix group', () => {
    expect(possibleContinuations(moonlightSonata, [{ notes: [66, 54, 54] }])).toEqual([61]);
  });

  it('does not run off the end of the stream', () => {
    const stream: NoteGroup[] = [
      { measure: 1, beat: 1, notes: [60] },
      { measure: 1, beat: 2, notes: [62] },
    ];

    expect(possibleContinuations(stream, [{ notes: [62] }])).toEqual([]);
    expect(possibleContinuations(stream, [{ notes: [60] }])).toEqual([62]);
  });

  it('leaves staves empty when the piece carries no staff data', () => {
    const stream: NoteGroup[] = [
      { measure: 1, beat: 1, notes: [60] },
      { measure: 1, beat: 2, notes: [62] },
    ];

    expect(possibleContinuationsByStaff(stream, [{ notes: [60] }])).toEqual([
      { pitch: 62, staves: [] },
    ]);
  });

  it('does not mutate the piece', () => {
    const before = structuredClone(moonlightSonata);
    possibleContinuationsByStaff(moonlightSonata, [{ notes: [54, 66] }]);
    expect(moonlightSonata).toEqual(before);
  });

  it('reads the keyboard range and per-staff extents off the piece', () => {
    expect(streamPitchRange(moonlightSonata)).toEqual({ minPitch: 29, maxPitch: 87 });
    expect(streamPitchRange([])).toBe(null);

    const ranges = staffPitchRanges(moonlightSonata);
    expect(ranges.get(1)).toEqual({ minPitch: 48, maxPitch: 87 });
    expect(ranges.get(2)).toEqual({ minPitch: 29, maxPitch: 64 });
  });
});

describe('capture seam', () => {
  it('toggles a key on and off for the row it was captured from', () => {
    const first = applyCapture([], { source: 'pointer', staff: 2, pitches: [54] });
    expect(first).toEqual([{ pitch: 54, staff: 2 }]);

    const second = applyCapture(first, { source: 'pointer', staff: 1, pitches: [66] });
    expect(second).toEqual([
      { pitch: 54, staff: 2 },
      { pitch: 66, staff: 1 },
    ]);

    expect(applyCapture(second, { source: 'pointer', staff: 1, pitches: [66] })).toEqual([
      { pitch: 54, staff: 2 },
    ]);
  });

  it('keeps the same pitch on both rows distinct, and collapses it in the query', () => {
    const bothRows = applyCapture([{ pitch: 66, staff: 1 }], {
      source: 'pointer',
      staff: 2,
      pitches: [66],
    });

    expect(bothRows).toEqual([
      { pitch: 66, staff: 1 },
      { pitch: 66, staff: 2 },
    ]);
    expect(selectionPitches(bothRows)).toEqual([66]);
  });

  // A hardware adapter would report several pitches at once through this same
  // seam. Loop 006 builds no adapter; it only leaves the shape usable.
  it('accepts a multi-pitch capture from a non-pointer source', () => {
    expect(applyCapture([], { source: 'midi', staff: 2, pitches: [61, 49, 37] })).toEqual([
      { pitch: 37, staff: 2 },
      { pitch: 49, staff: 2 },
      { pitch: 61, staff: 2 },
    ]);
  });

  it('produces the founding group from a two-row gesture', () => {
    const lower = applyCapture([], { source: 'pointer', staff: 2, pitches: [54] });
    const both = applyCapture(lower, { source: 'pointer', staff: 1, pitches: [66] });

    expect(selectionPitches(both)).toEqual([54, 66]);
  });

  it('does not mutate the selection it is given', () => {
    const selection = [{ pitch: 60, staff: 1 } as const];
    applyCapture(selection, { source: 'pointer', staff: 1, pitches: [62] });
    expect(selection).toEqual([{ pitch: 60, staff: 1 }]);
  });
});
