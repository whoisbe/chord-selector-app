// Ingests data/spike/moonlight-sonata.musicxml into the canonical merged onset
// stream and writes src/data/pieces/moonlight-sonata.ts.
//
// Algorithm proven by the macro-layer spike (see ADR 0001 / 0002):
// per <measure>, walk children in document order tracking an integer tick
// position. <backup>/<forward> move the position (this is how MusicXML
// switches staves mid-measure). <chord/> notes attach to the previous onset
// instead of advancing. Every note sharing (measure, tick) across both
// staves merges into one NoteGroup.
//
// Run with: node scripts/ingest-musicxml.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const INPUT_PATH = resolve(REPO_ROOT, 'data/spike/moonlight-sonata.musicxml');
const OUTPUT_PATH = resolve(REPO_ROOT, 'src/data/pieces/moonlight-sonata.ts');

const STEP_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midiFromPitch(pitchEl) {
  const step = pitchEl.querySelector('step').textContent.trim();
  const octave = Number(pitchEl.querySelector('octave').textContent.trim());
  const alterEl = pitchEl.querySelector('alter');
  const alter = alterEl ? Number(alterEl.textContent.trim()) : 0;

  return (octave + 1) * 12 + STEP_SEMITONES[step] + alter;
}

function childNumber(parent, tagName) {
  const el = parent.querySelector(`:scope > ${tagName}`);
  return el ? Number(el.textContent.trim()) : null;
}

// Parses MusicXML text into raw per-note onset events (before merging).
// Returns one entry per pitched note: { measure, tick, staff, midi, divisions }.
export function parseRawNotes(xmlText) {
  const dom = new JSDOM();
  const doc = new dom.window.DOMParser().parseFromString(xmlText, 'application/xml');

  const part = doc.querySelector('part');
  const measureEls = Array.from(part.querySelectorAll(':scope > measure'));

  const rawNotes = [];
  let divisions = null;
  let measureCount = 0;
  let pitchedNoteCount = 0;
  let notesWithoutStaff = 0;

  for (const measureEl of measureEls) {
    measureCount += 1;
    const measureNumber = Number(measureEl.getAttribute('number'));

    let position = 0;
    let prevOnset = 0;

    for (const el of Array.from(measureEl.children)) {
      const tag = el.tagName;

      if (tag === 'attributes') {
        const measureDivisions = childNumber(el, 'divisions');
        if (measureDivisions !== null) {
          divisions = measureDivisions;
        }
        continue;
      }

      if (tag === 'backup') {
        position -= childNumber(el, 'duration');
        continue;
      }

      if (tag === 'forward') {
        position += childNumber(el, 'duration');
        continue;
      }

      if (tag !== 'note') {
        continue;
      }

      const isRest = el.querySelector(':scope > rest') !== null;
      const isChord = el.querySelector(':scope > chord') !== null;
      const isGrace = el.querySelector(':scope > grace') !== null;
      const duration = childNumber(el, 'duration');
      const staffEl = el.querySelector(':scope > staff');
      const staff = staffEl ? Number(staffEl.textContent.trim()) : null;

      let onsetTick;

      if (isChord) {
        onsetTick = prevOnset;
      } else if (isGrace) {
        onsetTick = position;
        prevOnset = position;
      } else {
        onsetTick = position;
        prevOnset = position;
        position += duration;
      }

      if (isRest) {
        continue;
      }

      pitchedNoteCount += 1;
      if (staff === null) {
        notesWithoutStaff += 1;
      }

      const pitchEl = el.querySelector(':scope > pitch');
      const midi = midiFromPitch(pitchEl);

      rawNotes.push({
        measure: measureNumber,
        tick: onsetTick,
        staff: staff ?? 1,
        midi,
        divisions,
      });
    }
  }

  return { rawNotes, measureCount, pitchedNoteCount, notesWithoutStaff };
}

function groupKey(measure, tick) {
  return `${measure}:${tick}`;
}

// Groups raw note events sharing (measure, tick) into NoteGroups.
// `keyFn` decides which raw notes are combined into one group — pass a
// staff-qualified key to keep staves separate, or measure/tick alone to
// merge across staves.
function buildGroups(rawNotes, keyFn) {
  const order = [];
  const byKey = new Map();
  const seenPairsByKey = new Map();

  for (const note of rawNotes) {
    const key = keyFn(note);
    let entry = byKey.get(key);
    if (!entry) {
      entry = {
        measure: note.measure,
        tick: note.tick,
        divisions: note.divisions,
        staves: [],
        notes: [],
      };
      byKey.set(key, entry);
      seenPairsByKey.set(key, new Set());
      order.push(entry);
    }

    // Dedupe on the (pitch, staff) pair — two voices doubling the same note
    // on the same staff is redundant, but the same pitch on two different
    // staves at once is genuine cross-staff doubling and must survive.
    const seenPairs = seenPairsByKey.get(key);
    const pairKey = `${note.midi}:${note.staff}`;
    if (seenPairs.has(pairKey)) {
      continue;
    }
    seenPairs.add(pairKey);

    entry.staves.push(note.staff);
    entry.notes.push(note.midi);
  }

  order.sort((a, b) => a.measure - b.measure || a.tick - b.tick);

  return order.map((entry) => ({
    measure: entry.measure,
    tick: entry.tick,
    beat: 1 + entry.tick / entry.divisions,
    staves: entry.staves,
    notes: entry.notes,
  }));
}

export function buildMergedGroups(rawNotes) {
  return buildGroups(rawNotes, (note) => groupKey(note.measure, note.tick));
}

export function buildStaffGroups(rawNotes, staff) {
  return buildGroups(
    rawNotes.filter((note) => note.staff === staff),
    (note) => groupKey(note.measure, note.tick),
  );
}

function formatGroup(group) {
  return `  { measure: ${group.measure}, tick: ${group.tick}, beat: ${group.beat}, staves: [${group.staves.join(', ')}], notes: [${group.notes.join(', ')}] },`;
}

function renderArtifact(mergedGroups) {
  const lines = [
    "import type { NoteGroup } from '../../lib/music/types'",
    '',
    '// Generated by scripts/ingest-musicxml.mjs from data/spike/moonlight-sonata.musicxml.',
    '// Do not hand-edit — rerun the script to regenerate.',
    '',
    "export const MOONLIGHT_SONATA_NAME =",
    "  'Beethoven, Piano Sonata No. 14 in C# minor, Op. 27 No. 2 (\"Moonlight\"), movement I'",
    '',
    'export const moonlightSonata: NoteGroup[] = [',
    ...mergedGroups.map(formatGroup),
    ']',
    '',
  ];

  return lines.join('\n');
}

function main() {
  const xmlText = readFileSync(INPUT_PATH, 'utf8');
  const { rawNotes, measureCount, pitchedNoteCount, notesWithoutStaff } = parseRawNotes(xmlText);
  const mergedGroups = buildMergedGroups(rawNotes);

  const pitches = mergedGroups.flatMap((group) => group.notes);
  const distinctPitches = new Set(pitches);

  console.log('measures parsed:', measureCount);
  console.log('pitched notes placed:', pitchedNoteCount);
  console.log('staff assignments inferred:', notesWithoutStaff);
  console.log('merged onset events:', mergedGroups.length);
  console.log('pitch range:', Math.min(...pitches), '-', Math.max(...pitches));
  console.log('distinct pitches:', distinctPitches.size);

  writeFileSync(OUTPUT_PATH, renderArtifact(mergedGroups));
  console.log('wrote', OUTPUT_PATH);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
