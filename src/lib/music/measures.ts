// Loop 016 — reading the merged onset stream a measure at a time.
//
// Focusing an occurrence turns the result into something you page through:
// `>` and `<` move a measure at a time, and the view draws whichever onsets
// live in the measure now on screen. All of that is decided here, in pure
// functions over the stream, so the component only has to render what it is
// handed.
//
// Two things this module deliberately does *not* do. It does not compute a
// pitch range — the focused view is drawn on a fixed span, which is the
// point of the loop, so nothing here needs to know about pitch at all. And it
// does not assume measures are contiguous: `adjacentMeasure` walks to the
// next measure that actually carries onsets rather than adding one, so a
// piece with an empty bar could never strand the navigation on a blank
// screen. The committed artifact happens to have onsets in all 69 of its
// measures, which means that distinction is untested by the piece itself —
// hence the fixture with a gap in the unit suite.

import type { NoteGroup } from './types'

export type MeasureBounds = { firstMeasure: number; lastMeasure: number }

// Every measure that carries at least one onset, ascending. The stream is
// already in time order, but sorting is what makes this independent of that
// assumption rather than quietly dependent on it.
export function measuresWithOnsets(stream: readonly NoteGroup[]): number[] {
  const measures = new Set<number>()

  for (const group of stream) {
    measures.add(group.measure)
  }

  return Array.from(measures).sort((left, right) => left - right)
}

// Loop 019 — a pickup is a measure the score does not count.
//
// MusicXML marks an incomplete first measure `implicit="yes"`, and MuseScore
// numbers it 0 while numbering every counted measure from 1. So "below 1" is
// the whole of the rule, and it needs nothing from the stream and nothing new
// on NoteGroup, which stays exactly as it was. The ingestion reads the
// `implicit` attribute independently and reports the number it found; the unit
// suite asserts the two agree on Für Elise rather than trusting either alone.
export function isPickupMeasure(measure: number): boolean {
  return measure < 1
}

// How a measure is named on screen. A pickup is drawn as a pickup, not as
// "Measure 0", because that is what the printed page shows and what the person
// looking at it would call the bar.
export function measureLabel(measure: number): string {
  return isPickupMeasure(measure) ? 'Pickup' : `Measure ${measure}`
}

// The first and last *counted* measure. A pickup is kept in the stream — it is
// real music, and dropping it would tell someone that a phrase they remember
// is not in the piece — but it is excluded from the bounds, so the jump
// control offers 1 to 105 for a piece the score prints as 105 bars and an
// upbeat. Excluding it here rather than at ingestion is what lets the stream
// stay a plain NoteGroup[].
export function measureBounds(stream: readonly NoteGroup[]): MeasureBounds | null {
  const measures = measuresWithOnsets(stream)
  const counted = measures.filter((measure) => !isPickupMeasure(measure))

  // A piece consisting of nothing but a pickup has no counted measure to bound.
  // Bounding it by the pickup beats reporting no bounds at all: there is still
  // exactly one place the controls can go, and null means "nowhere".
  const bounded = counted.length === 0 ? measures : counted

  if (bounded.length === 0) {
    return null
  }

  return { firstMeasure: bounded[0], lastMeasure: bounded[bounded.length - 1] }
}

// How long the piece is, in the terms the score itself uses: "69 measures" for
// the Moonlight sonata, "105 measures and a pickup" for Für Elise — never 106,
// because no one counting bars in that score would ever reach 106.
//
// Counted from the last measure number rather than from how many measures
// carry onsets, so a piece with a silent bar in the middle still reports its
// real length.
export function describeMeasureSpan(stream: readonly NoteGroup[]): string {
  const measures = measuresWithOnsets(stream)
  const counted = measures.filter((measure) => !isPickupMeasure(measure))
  const last = counted.length === 0 ? 0 : counted[counted.length - 1]
  const noun = last === 1 ? 'measure' : 'measures'
  const pickup = counted.length === measures.length ? '' : ' and a pickup'

  return `${last} ${noun}${pickup}`
}

// The onsets of one measure, in stream order — which is time order, and is
// the order the focused view stacks them in.
export function onsetsInMeasure(stream: readonly NoteGroup[], measure: number): NoteGroup[] {
  return stream.filter((group) => group.measure === measure)
}

// The next measure with onsets in `direction`, or null when there is none —
// which is exactly the condition that disables `<` or `>`. Null rather than a
// clamped value, because "there is nowhere to go" and "you are already there"
// have to be tellable apart by the caller: a disabled control is the honest
// rendering of the first, and a silently ignored press is not.
export function adjacentMeasure(
  stream: readonly NoteGroup[],
  measure: number,
  direction: -1 | 1,
): number | null {
  const measures = measuresWithOnsets(stream)

  if (direction === 1) {
    return measures.find((candidate) => candidate > measure) ?? null
  }

  const earlier = measures.filter((candidate) => candidate < measure)
  return earlier.length === 0 ? null : earlier[earlier.length - 1]
}

// A stable identity for one onset, used to tell the onsets of the matched
// occurrence apart from the surrounding context in the same measure.
//
// `tick` is the integer position the ingestion script wrote and is what this
// keys on when present; `beat` is a float derived from it and types.ts warns
// against comparing it, so it is only the fallback for hand-authored fixtures
// that carry no tick. Measure plus tick is unique across the committed
// artifact (checked in the unit suite), which is what makes an equality test
// on this string a sound stand-in for "the same onset".
export function onsetKey(group: NoteGroup): string {
  return group.tick === undefined
    ? `m${group.measure}b${group.beat}`
    : `m${group.measure}t${group.tick}`
}
