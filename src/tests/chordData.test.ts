import { describe, expect, it } from 'vitest';

import { getChordVoicings } from '../data/chordData';

describe('getChordVoicings', () => {
  it('preserves flat note names in every inversion of a D♭ chord', () => {
    expect(getChordVoicings('D♭')).toEqual([
      {
        name: 'Root',
        notes: [61, 65, 68],
        noteNames: ['D♭', 'F', 'A♭'],
      },
      {
        name: '1st Inv',
        notes: [65, 68, 73],
        noteNames: ['F', 'A♭', 'D♭'],
      },
      {
        name: '2nd Inv',
        notes: [68, 73, 77],
        noteNames: ['A♭', 'D♭', 'F'],
      },
    ]);
  });
});
