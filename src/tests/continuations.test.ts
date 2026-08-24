import { describe, it, expect } from 'vitest';

import { moonlightSonata } from '../data/pieces/moonlight-sonata';
import {
  containmentCount,
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

describe('group-wise co-occurrence constraint (Loop 011)', () => {
  // Section 4 fixture values, measured from the committed artifact at HEAD.
  // Do not adjust these to match the implementation — the implementation
  // must match these.

  it('check 5 — empty selection leaves the Loop 006 behaviour unchanged: 55 pitches', () => {
    const available = possibleContinuations(moonlightSonata, []);
    expect(available.length).toBe(55);
  });

  it('check 6 — selecting F#3 (54) leaves exactly the 16 co-occurring pitches', () => {
    const available = possibleContinuations(moonlightSonata, [], [54]);
    expect(available).toEqual([30, 32, 33, 35, 36, 37, 42, 44, 45, 47, 48, 61, 66, 68, 72, 73]);
  });

  it('check 7 — F#4 (66) survives selecting F#3 (54): the cross-staff octave', () => {
    const available = possibleContinuations(moonlightSonata, [], [54]);
    expect(available).toContain(66);
  });

  it('check 8 — constraints compose: prefix [54,66] alone still gives [61]', () => {
    expect(possibleContinuations(moonlightSonata, [{ notes: [54, 66] }])).toEqual([61]);
  });

  it('check 8 — constraints compose: F#3 + F#4 selected leaves exactly 8 pitches', () => {
    const available = possibleContinuations(moonlightSonata, [], [54, 66]);
    expect(available).toEqual([30, 33, 35, 36, 42, 45, 47, 48]);
  });

  it('already-selected pitches never reappear as available', () => {
    expect(possibleContinuations(moonlightSonata, [], [54])).not.toContain(54);
    expect(possibleContinuations(moonlightSonata, [], [54, 66])).not.toContain(54);
    expect(possibleContinuations(moonlightSonata, [], [54, 66])).not.toContain(66);
  });

  it('possibleContinuationsByStaff applies the same constraint as possibleContinuations', () => {
    const byStaff = possibleContinuationsByStaff(moonlightSonata, [], [54]);
    expect(byStaff.map((c) => c.pitch)).toEqual([
      30, 32, 33, 35, 36, 37, 42, 44, 45, 47, 48, 61, 66, 68, 72, 73,
    ]);
  });

  it('a two-note prefix that requires a third co-occurring note offers nothing else', () => {
    // (54,66) is a real group; a third pitch that never joins it is rejected.
    expect(possibleContinuations(moonlightSonata, [], [54, 66, 64])).toEqual([]);
  });

  // Check 9 — the property that protects the feature from itself. A
  // too-aggressive constraint that dims a key belonging to a real group makes
  // part of the piece unreachable. This runs over every one of the 823
  // groups in the artifact, not a sample.
  //
  // The constraint is stateless — possibleContinuations recomputes from
  // scratch on every call from whatever currentSelection it is given, it
  // never accumulates. So for a fixed target pitch, availability can only
  // shrink as more pitches are added to currentSelection (groupContainsAll
  // is monotonic: a superset of required pitches can only pass at groups a
  // subset also passes at). Testing every prefix of each group's natural
  // note order — ending at "every other pitch of the group selected" —
  // therefore covers every selection order, not just the one tested.
  it('check 9 — selecting a real group one pitch at a time never dims a later pitch of that group', () => {
    let exercised = 0;
    const failures: Array<{ group: number[]; missing: number; afterSelecting: number[] }> = [];

    for (const group of moonlightSonata) {
      const notes = Array.from(new Set(group.notes)).sort((left, right) => left - right);
      exercised += 1;

      for (let selectedCount = 0; selectedCount < notes.length; selectedCount += 1) {
        const selectedSoFar = notes.slice(0, selectedCount);
        const stillToSelect = notes.slice(selectedCount);
        const available = possibleContinuations(moonlightSonata, [], selectedSoFar);

        for (const laterPitch of stillToSelect) {
          if (!available.includes(laterPitch)) {
            failures.push({ group: notes, missing: laterPitch, afterSelecting: selectedSoFar });
          }
        }
      }
    }

    expect(exercised).toBe(823);
    expect(failures).toEqual([]);
  });
});

describe('capture seam (Loop 012 — pitch-only selection)', () => {
  it('toggles a pitch on and off', () => {
    const first = applyCapture([], { source: 'pointer', pitches: [54] });
    expect(first).toEqual([54]);

    const second = applyCapture(first, { source: 'pointer', pitches: [66] });
    expect(second).toEqual([54, 66]);

    expect(applyCapture(second, { source: 'pointer', pitches: [66] })).toEqual([54]);
  });

  it('dedupes a pitch captured twice rather than tracking it per row', () => {
    const first = applyCapture([], { source: 'pointer', pitches: [66] });
    // Capturing the same pitch again is now a toggle-off: one keyboard has no
    // second row for the same pitch to occupy.
    expect(applyCapture(first, { source: 'pointer', pitches: [66] })).toEqual([]);
  });

  // A hardware adapter would report several pitches at once through this same
  // seam. This loop builds no adapter; it only leaves the shape usable.
  it('accepts a multi-pitch capture from a non-pointer source', () => {
    expect(applyCapture([], { source: 'midi', pitches: [61, 49, 37] })).toEqual([37, 49, 61]);
  });

  it('produces the founding group from two captures, with no staff anywhere', () => {
    const first = applyCapture([], { source: 'pointer', pitches: [54] });
    const both = applyCapture(first, { source: 'pointer', pitches: [66] });

    expect(both).toEqual([54, 66]);
    expect(selectionPitches(both)).toEqual([54, 66]);
  });

  it('does not mutate the selection it is given', () => {
    const selection = [60];
    applyCapture(selection, { source: 'pointer', pitches: [62] });
    expect(selection).toEqual([60]);
  });
});

describe('containment count (Loop 012)', () => {
  // Section 4 fixture values, measured from the committed artifact at HEAD.
  // Do not adjust these to match the implementation — the implementation
  // must match these.

  it('check 10 — F#4 (66) alone is contained in 87 onsets', () => {
    expect(containmentCount(moonlightSonata, [66])).toBe(87);
  });

  it('B3 (59) alone is contained in 65 onsets', () => {
    expect(containmentCount(moonlightSonata, [59])).toBe(65);
  });

  it('F#3 (54) alone is contained in 43 onsets', () => {
    expect(containmentCount(moonlightSonata, [54])).toBe(43);
  });

  it('B1 + B2 (35, 47) together are contained in 13 onsets', () => {
    expect(containmentCount(moonlightSonata, [35, 47])).toBe(13);
  });

  it('check 10 — F#3 + F#4 (54, 66) together are contained in 6 onsets', () => {
    expect(containmentCount(moonlightSonata, [54, 66])).toBe(6);
  });

  it('an empty selection is contained everywhere: every onset in the piece', () => {
    expect(containmentCount(moonlightSonata, [])).toBe(moonlightSonata.length);
    expect(containmentCount(moonlightSonata, [])).toBe(823);
  });

  it('is independent of pitch order and duplicates in the selection', () => {
    expect(containmentCount(moonlightSonata, [66, 54])).toBe(
      containmentCount(moonlightSonata, [54, 66]),
    );
    expect(containmentCount(moonlightSonata, [54, 54, 66])).toBe(
      containmentCount(moonlightSonata, [54, 66]),
    );
  });

  it('does not mutate the piece', () => {
    const before = structuredClone(moonlightSonata);
    containmentCount(moonlightSonata, [54, 66]);
    expect(moonlightSonata).toEqual(before);
  });
});
