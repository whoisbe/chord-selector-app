import { describe, it, expect } from 'vitest';

import { phraseLookupDemo } from '../data/pieces/phrase-lookup-demo';
import { findPhraseMatches } from '../lib/music/phrase-search';
import { pitchToLabel } from '../lib/music/pitch-label';
import type { NoteGroup, PhraseQuery } from '../lib/music/types';

const rememberedQuery: PhraseQuery = {
  hand: 'right',
  groups: [{ notes: [66, 78] }, { notes: [73] }, { notes: [76] }],
};

describe('phrase search', () => {
  it('the remembered query returns exactly measures 12 and 27 in order', () => {
    const matches = findPhraseMatches(phraseLookupDemo, rememberedQuery);

    expect(matches.map((match) => match.measure)).toEqual([12, 27]);
    expect(matches.map((match) => match.beat)).toEqual([1, 1]);
    expect(matches.map((match) => match.followingGroups.length)).toEqual([3, 3]);
  });

  it('note order and duplicate notes inside a simultaneous group do not matter', () => {
    const reorderedQuery: PhraseQuery = {
      ...rememberedQuery,
      groups: [{ notes: [78, 66, 78] }, { notes: [73] }, { notes: [76] }],
    };

    expect(
      findPhraseMatches(phraseLookupDemo, reorderedQuery).map((match) => match.measure),
    ).toEqual([12, 27]);
  });

  it('group ordering matters', () => {
    const reversedQuery: PhraseQuery = {
      hand: 'right',
      groups: [{ notes: [76] }, { notes: [73] }, { notes: [66, 78] }],
    };

    expect(findPhraseMatches(phraseLookupDemo, reversedQuery)).toEqual([]);
  });

  it('groups must be contiguous in the selected hand event stream', () => {
    const piece: NoteGroup[] = [
      { measure: 1, beat: 1, hand: 'right', notes: [60] },
      { measure: 1, beat: 2, hand: 'right', notes: [62] },
      { measure: 1, beat: 3, hand: 'right', notes: [64] },
    ];
    const query: PhraseQuery = {
      hand: 'right',
      groups: [{ notes: [60] }, { notes: [64] }],
    };

    expect(findPhraseMatches(piece, query)).toEqual([]);
  });

  it('an event containing an extra note does not satisfy exact matching', () => {
    const piece: NoteGroup[] = [
      { measure: 1, beat: 1, hand: 'right', notes: [60, 64] },
    ];
    const query: PhraseQuery = { hand: 'right', groups: [{ notes: [60] }] };

    expect(findPhraseMatches(piece, query)).toEqual([]);
  });

  it('hand selection prevents cross-hand matches', () => {
    const leftQuery: PhraseQuery = { ...rememberedQuery, hand: 'left' };

    expect(
      findPhraseMatches(phraseLookupDemo, rememberedQuery).map((match) => match.measure),
    ).toEqual([12, 27]);
    expect(
      findPhraseMatches(phraseLookupDemo, leftQuery).map((match) => match.measure),
    ).toEqual([20]);
  });

  it('empty queries and queries with an empty group return no matches', () => {
    expect(findPhraseMatches(phraseLookupDemo, { hand: 'right', groups: [] })).toEqual([]);
    expect(
      findPhraseMatches(phraseLookupDemo, {
        hand: 'right',
        groups: [{ notes: [66, 78] }, { notes: [] }],
      }),
    ).toEqual([]);
  });

  it('a contiguous match can cross a measure boundary', () => {
    const piece: NoteGroup[] = [
      { measure: 4, beat: 4, hand: 'right', notes: [60, 64] },
      { measure: 5, beat: 1, hand: 'left', notes: [36] },
      { measure: 5, beat: 1, hand: 'right', notes: [67] },
    ];
    const query: PhraseQuery = {
      hand: 'right',
      groups: [{ notes: [64, 60] }, { notes: [67] }],
    };

    const matches = findPhraseMatches(piece, query);
    expect(matches.length).toBe(1);
    expect(matches[0].measure).toBe(4);
    expect(matches[0].beat).toBe(4);
  });

  it('search does not mutate the piece or query inputs', () => {
    const piece: NoteGroup[] = [
      { measure: 1, beat: 1, hand: 'right', notes: [67, 60, 67] },
      { measure: 1, beat: 2, hand: 'right', notes: [64] },
    ];
    const query: PhraseQuery = {
      hand: 'right',
      groups: [{ notes: [67, 60, 60] }, { notes: [64] }],
    };
    const pieceBefore = structuredClone(piece);
    const queryBefore = structuredClone(query);

    findPhraseMatches(piece, query);

    expect(piece).toEqual(pieceBefore);
    expect(query).toEqual(queryBefore);
  });

  it('pitch labels use C4 = 60 with sharp spelling', () => {
    expect(pitchToLabel(60)).toBe('C4');
    expect(pitchToLabel(61)).toBe('C#4');
    expect(pitchToLabel(66)).toBe('F#4');
    expect(pitchToLabel(78)).toBe('F#5');
    expect(pitchToLabel(83)).toBe('B5');
  });
});
