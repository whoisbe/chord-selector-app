import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

import {
  parseRawNotes,
  buildMergedGroups,
  buildStaffGroups,
} from '../lib/musicxml/parse-score.ts';
import { findPhraseMatches } from '../lib/music/phrase-search';
import { moonlightSonata } from '../data/pieces/moonlight-sonata';
import type { NoteGroup, PhraseQuery } from '../lib/music/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MUSICXML_PATH = resolve(__dirname, '../../data/spike/moonlight-sonata.musicxml');

// These tests exercise the real parser against the real score, not just the
// committed artifact — a parser that returns the right answer for the wrong
// reason is worse than one that fails (see loop 004 verifier, check 9).
//
// Loop 019 moved the tick walk into src/lib/musicxml/ and made it take an
// already-parsed tree instead of building its own. These assertions are
// unchanged from Loop 004 apart from that: the same numbers, on the same
// score, through the module the app now calls at runtime. The parsed tree
// comes from vitest's jsdom environment, which is the same jsdom the ingest
// script uses.

describe('MusicXML ingestion', () => {
  let rawNotes: ReturnType<typeof parseRawNotes>['rawNotes'];
  let measureCount: number;
  let pitchedNoteCount: number;
  let notesWithoutStaff: number;
  let merged: NoteGroup[];
  let staff1: NoteGroup[];
  let staff2: NoteGroup[];

  beforeAll(() => {
    const xmlText = readFileSync(MUSICXML_PATH, 'utf8');
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const parsed = parseRawNotes(doc);
    rawNotes = parsed.rawNotes;
    measureCount = parsed.measureCount;
    pitchedNoteCount = parsed.pitchedNoteCount;
    notesWithoutStaff = parsed.notesWithoutStaff;
    merged = buildMergedGroups(rawNotes);
    staff1 = buildStaffGroups(rawNotes, 1);
    staff2 = buildStaffGroups(rawNotes, 2);
  });

  it('parses 69 measures', () => {
    expect(measureCount).toBe(69);
  });

  it('places 1169 pitched notes', () => {
    expect(pitchedNoteCount).toBe(1169);
  });

  it('infers zero staff assignments — every note carries an explicit <staff>', () => {
    expect(notesWithoutStaff).toBe(0);
  });

  it('merges onsets across both staves into 823 events', () => {
    expect(merged.length).toBe(823);
  });

  it('covers MIDI 29-87 across 55 distinct pitches', () => {
    const pitches = merged.flatMap((group) => group.notes);
    expect(Math.min(...pitches)).toBe(29);
    expect(Math.max(...pitches)).toBe(87);
    expect(new Set(pitches).size).toBe(55);
  });

  // The founding query: an F# octave (F#3+F#4) split across both staves,
  // then C#4, then E4. See ADR 0002.
  const foundingQuery: PhraseQuery = {
    groups: [{ notes: [54, 66] }, { notes: [61] }, { notes: [64] }],
  };

  it('the founding query returns exactly one match, at measure 12 beat 4', () => {
    const matches = findPhraseMatches(merged, foundingQuery);

    expect(matches.length).toBe(1);
    expect(matches[0].measure).toBe(12);
    expect(matches[0].beat).toBe(4);
  });

  it('staff-split control: the founding query returns zero in either staff alone', () => {
    expect(findPhraseMatches(staff1, foundingQuery)).toEqual([]);
    expect(findPhraseMatches(staff2, foundingQuery)).toEqual([]);
  });

  it('staff-split events total 938, more than the 823 merged events', () => {
    expect(staff1.length + staff2.length).toBe(938);
  });

  it('measure 1 spot-check: staff 1 carries G#3/C#4/E4 triplets, staff 2 the C#2+C#3 whole-note chord', () => {
    const measure1Staff1 = staff1.filter((group) => group.measure === 1);
    const measure1Staff2 = staff2.filter((group) => group.measure === 1);

    expect(measure1Staff1.map((group) => group.notes)).toEqual([
      [56],
      [61],
      [64],
      [56],
      [61],
      [64],
      [56],
      [61],
      [64],
      [56],
      [61],
      [64],
    ]);
    expect(measure1Staff2.map((group) => group.notes)).toEqual([[37, 49]]);
  });

  it('the committed artifact matches a fresh parse of the source XML', () => {
    expect(moonlightSonata).toEqual(merged);
  });
});
