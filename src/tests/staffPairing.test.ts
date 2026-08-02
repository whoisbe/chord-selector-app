import { describe, it, expect } from 'vitest';

import { moonlightSonata } from '../data/pieces/moonlight-sonata';
import { findPhraseMatches } from '../lib/music/phrase-search';
import { pitchToLabel } from '../lib/music/pitch-label';
import type { NoteGroup, PhraseQuery } from '../lib/music/types';

// A group's own pitch -> staff pairing as stored in the source artifact —
// the ground truth these tests check findPhraseMatches's output against.
function sourcePairing(group: NoteGroup): Map<number, number | undefined> {
  const staves = group.staves ?? [];
  const pairing = new Map<number, number | undefined>();
  group.notes.forEach((pitch, index) => {
    pairing.set(pitch, staves[index]);
  });
  return pairing;
}

const crossStaffGroups = moonlightSonata.filter(
  (group) => new Set(group.staves).size > 1,
);

describe('staff/pitch pairing survives findPhraseMatches (loop 009)', () => {
  it('exactly 115 groups span more than one staff', () => {
    expect(crossStaffGroups.length).toBe(115);
  });

  it('for all 115 cross-staff groups, every pitch findPhraseMatches returns carries the staff it has in the source artifact', () => {
    for (const sourceGroup of crossStaffGroups) {
      const query: PhraseQuery = { groups: [{ notes: sourceGroup.notes }] };
      const matches = findPhraseMatches(moonlightSonata, query);
      const match = matches.find(
        (candidate) =>
          candidate.measure === sourceGroup.measure && candidate.beat === sourceGroup.beat,
      );

      expect(
        match,
        `no self-match found for m${sourceGroup.measure} b${sourceGroup.beat}`,
      ).toBeDefined();

      const returnedGroup = match!.matchedGroups[0];

      expect(sourcePairing(returnedGroup)).toEqual(sourcePairing(sourceGroup));
    }
  });

  it('no group contains the same (pitch, staff) pair twice', () => {
    for (const group of moonlightSonata) {
      if (!group.staves) {
        continue;
      }

      const pairs = group.notes.map((pitch, index) => `${pitch}:${group.staves![index]}`);
      expect(new Set(pairs).size).toBe(pairs.length);
    }
  });

  it('the founding match (m12 b4) returns F#3 on staff 2 and F#4 on staff 1', () => {
    const foundingQuery: PhraseQuery = {
      groups: [{ notes: [54, 66] }, { notes: [61] }, { notes: [64] }],
    };

    const matches = findPhraseMatches(moonlightSonata, foundingQuery);
    expect(matches.length).toBe(1);

    const [group] = matches[0].matchedGroups;
    const pairing = sourcePairing(group);

    expect(pairing.get(54)).toBe(2); // F#3
    expect(pairing.get(66)).toBe(1); // F#4
    expect(
      group.notes.map((pitch, index) => `${pitchToLabel(pitch)}→staff ${group.staves![index]}`),
    ).toEqual(['F#3→staff 2', 'F#4→staff 1']);
  });
});
