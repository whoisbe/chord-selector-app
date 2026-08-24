// Loop 019 — the tick walk, and only one of it.
//
// This is the algorithm proven by the macro-layer spike (ADR 0001 / 0002),
// moved here verbatim from `scripts/ingest-musicxml.mjs` and changed in
// exactly one respect: it no longer builds its own DOM. It is handed an
// already-parsed XML tree instead. The browser hands it one from `DOMParser`,
// the ingest script hands it one from `jsdom`, and the unit suite hands it one
// from vitest's jsdom environment. Three callers, one implementation, nothing
// to drift.
//
// The algorithm: per `<measure>`, walk children in order tracking an integer
// tick position. `<backup>` / `<forward>` move that position — this is how
// MusicXML switches staves mid-measure. A `<chord/>` note attaches to the
// previous onset instead of advancing. Every note sharing (measure, tick)
// across both staves merges into one NoteGroup.
//
// Nothing here touches a global. It takes a tree and returns plain data.

import type { NoteGroup } from '../music/types.ts'

export type RawNote = {
  measure: number
  tick: number
  staff: number
  midi: number
  // Null only for a note that appears before the score declares any
  // `<divisions>`. `readScoreFromDocument` refuses such a score outright.
  divisions: number | null
}

export type RawParse = {
  rawNotes: RawNote[]
  measureCount: number
  pitchedNoteCount: number
  notesWithoutStaff: number
  // `<divisions>` in effect when the walk ended, or null if none was declared.
  divisions: number | null
}

const STEP_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

function elementNumber(el: Element | null): number | null {
  return el === null ? null : Number((el.textContent ?? '').trim())
}

function childNumber(parent: Element, tagName: string): number | null {
  return elementNumber(parent.querySelector(`:scope > ${tagName}`))
}

function midiFromPitch(pitchEl: Element): number {
  const step = (pitchEl.querySelector('step')?.textContent ?? '').trim()
  const octave = elementNumber(pitchEl.querySelector('octave')) ?? 0
  const alter = elementNumber(pitchEl.querySelector('alter')) ?? 0

  return (octave + 1) * 12 + STEP_SEMITONES[step] + alter
}

// Walks a parsed MusicXML tree into raw per-note onset events, before merging.
export function parseRawNotes(doc: Document): RawParse {
  const part = doc.querySelector('part')

  const rawNotes: RawNote[] = []
  let divisions: number | null = null
  let measureCount = 0
  let pitchedNoteCount = 0
  let notesWithoutStaff = 0

  if (part === null) {
    return { rawNotes, measureCount, pitchedNoteCount, notesWithoutStaff, divisions }
  }

  const measureEls = Array.from(part.querySelectorAll(':scope > measure'))

  for (const measureEl of measureEls) {
    measureCount += 1
    const measureNumber = Number(measureEl.getAttribute('number'))

    let position = 0
    let prevOnset = 0

    for (const el of Array.from(measureEl.children)) {
      const tag = el.tagName

      if (tag === 'attributes') {
        const measureDivisions = childNumber(el, 'divisions')
        if (measureDivisions !== null) {
          divisions = measureDivisions
        }
        continue
      }

      if (tag === 'backup') {
        position -= childNumber(el, 'duration') ?? 0
        continue
      }

      if (tag === 'forward') {
        position += childNumber(el, 'duration') ?? 0
        continue
      }

      if (tag !== 'note') {
        continue
      }

      const isRest = el.querySelector(':scope > rest') !== null
      const isChord = el.querySelector(':scope > chord') !== null
      const isGrace = el.querySelector(':scope > grace') !== null
      const duration = childNumber(el, 'duration') ?? 0
      const staff = elementNumber(el.querySelector(':scope > staff'))

      let onsetTick: number

      if (isChord) {
        onsetTick = prevOnset
      } else if (isGrace) {
        onsetTick = position
        prevOnset = position
      } else {
        onsetTick = position
        prevOnset = position
        position += duration
      }

      if (isRest) {
        continue
      }

      // A `<note>` that is neither a rest nor pitched is an `<unpitched>`
      // percussion note. A MuseScore piano download has none, so skipping it
      // changes nothing measurable here — but it is the difference between
      // refusing a drum part cleanly and crashing on it.
      const pitchEl = el.querySelector(':scope > pitch')
      if (pitchEl === null) {
        continue
      }

      pitchedNoteCount += 1
      if (staff === null) {
        notesWithoutStaff += 1
      }

      rawNotes.push({
        measure: measureNumber,
        tick: onsetTick,
        staff: staff ?? 1,
        midi: midiFromPitch(pitchEl),
        divisions,
      })
    }
  }

  return { rawNotes, measureCount, pitchedNoteCount, notesWithoutStaff, divisions }
}

function groupKey(measure: number, tick: number): string {
  return `${measure}:${tick}`
}

type GroupEntry = {
  measure: number
  tick: number
  divisions: number | null
  staves: number[]
  notes: number[]
}

// Groups raw note events sharing (measure, tick) into NoteGroups. `keyFn`
// decides which raw notes combine — the merged stream keys on measure and
// tick alone, so both staves fold together.
function buildGroups(rawNotes: readonly RawNote[], keyFn: (note: RawNote) => string): NoteGroup[] {
  const order: GroupEntry[] = []
  const byKey = new Map<string, GroupEntry>()
  const seenPairsByKey = new Map<string, Set<string>>()

  for (const note of rawNotes) {
    const key = keyFn(note)
    let entry = byKey.get(key)
    if (entry === undefined) {
      entry = {
        measure: note.measure,
        tick: note.tick,
        divisions: note.divisions,
        staves: [],
        notes: [],
      }
      byKey.set(key, entry)
      seenPairsByKey.set(key, new Set())
      order.push(entry)
    }

    // Dedupe on the (pitch, staff) pair — two voices doubling the same note
    // on the same staff is redundant, but the same pitch on two different
    // staves at once is genuine cross-staff doubling and must survive.
    const seenPairs = seenPairsByKey.get(key) ?? new Set<string>()
    const pairKey = `${note.midi}:${note.staff}`
    if (seenPairs.has(pairKey)) {
      continue
    }
    seenPairs.add(pairKey)

    entry.staves.push(note.staff)
    entry.notes.push(note.midi)
  }

  order.sort((a, b) => a.measure - b.measure || a.tick - b.tick)

  return order.map((entry) => ({
    measure: entry.measure,
    tick: entry.tick,
    // Loop 018 established this is a quarter-note position rather than the
    // meter's beat, in both committed pieces. The human decided to leave it
    // now that it is written down — and check 1 of this loop requires output
    // identical to the committed artifact, so it could not change here anyway.
    // `divisions` is null only for a score this loop refuses before it reaches
    // this line; NaN is the honest answer to a beat with no unit.
    beat: 1 + entry.tick / (entry.divisions ?? Number.NaN),
    staves: entry.staves,
    notes: entry.notes,
  }))
}

export function buildMergedGroups(rawNotes: readonly RawNote[]): NoteGroup[] {
  return buildGroups(rawNotes, (note) => groupKey(note.measure, note.tick))
}

export function buildStaffGroups(rawNotes: readonly RawNote[], staff: number): NoteGroup[] {
  return buildGroups(
    rawNotes.filter((note) => note.staff === staff),
    (note) => groupKey(note.measure, note.tick),
  )
}
