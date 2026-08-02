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
