// Loop 016, task 1 — the pure side of measure navigation.
//
// Two kinds of case here. The fixtures pin the semantics, including the one
// the committed artifact cannot exercise (a measure with no onsets at all).
// The artifact cases pin the numbers the focused view and its e2e checks are
// built on: 69 measures, 12 onsets in measure 12, and a fixed window of F1 to
// D#6 that the focused view never recomputes.

import { describe, expect, it } from 'vitest'

import { moonlightSonata } from '../data/pieces/moonlight-sonata'
import { streamPitchRange } from '../lib/music/continuations'
import {
  adjacentMeasure,
  measureBounds,
  measuresWithOnsets,
  onsetKey,
  onsetsInMeasure,
} from '../lib/music/measures'
import { describePitchRange, whiteKeyCount } from '../lib/music/onset-range'
import type { NoteGroup } from '../lib/music/types'

// Measures 1, 2 and 5 carry onsets; 3 and 4 are empty. Deliberately not in
// measure order, so nothing here can pass by relying on the input being
// sorted.
const gapped: NoteGroup[] = [
  { measure: 2, tick: 0, beat: 1, notes: [62] },
  { measure: 1, tick: 0, beat: 1, notes: [60] },
  { measure: 1, tick: 240, beat: 2, notes: [64] },
  { measure: 5, tick: 0, beat: 1, notes: [67] },
]

describe('measuresWithOnsets', () => {
  it('is empty for an empty stream', () => {
    expect(measuresWithOnsets([])).toEqual([])
  })

  it('lists each measure once, ascending, skipping empty ones', () => {
    expect(measuresWithOnsets(gapped)).toEqual([1, 2, 5])
  })
})

describe('measureBounds', () => {
  it('is null when there is nothing to bound', () => {
    expect(measureBounds([])).toBeNull()
  })

  it('reports the first and last measure carrying onsets', () => {
    expect(measureBounds(gapped)).toEqual({ firstMeasure: 1, lastMeasure: 5 })
  })

  it('spans the whole movement for the committed artifact', () => {
    expect(measureBounds(moonlightSonata)).toEqual({ firstMeasure: 1, lastMeasure: 69 })
  })
})

describe('onsetsInMeasure', () => {
  it('returns the onsets of one measure in stream order', () => {
    expect(onsetsInMeasure(gapped, 1).map((group) => group.beat)).toEqual([1, 2])
  })

  it('returns nothing for a measure with no onsets', () => {
    expect(onsetsInMeasure(gapped, 3)).toEqual([])
  })

  it('returns all twelve onsets of measure 12 of the artifact', () => {
    const onsets = onsetsInMeasure(moonlightSonata, 12)

    expect(onsets).toHaveLength(12)
    // The founding query's match — [F#3+F#4] → [C#4] → [E4] — is the last
    // three of them, which is why paging straight to measure 13 would skip
    // what directly follows it.
    expect(onsets.slice(-3).map((group) => group.notes)).toEqual([[66, 54], [61], [64]])
  })

  it('leaves measure 69 as the single final chord', () => {
    expect(onsetsInMeasure(moonlightSonata, 69)).toHaveLength(1)
  })
})

describe('adjacentMeasure', () => {
  it('steps over an empty measure rather than into it', () => {
    expect(adjacentMeasure(gapped, 2, 1)).toBe(5)
    expect(adjacentMeasure(gapped, 5, -1)).toBe(2)
  })

  it('is null at each end — the condition that disables a control', () => {
    expect(adjacentMeasure(gapped, 1, -1)).toBeNull()
    expect(adjacentMeasure(gapped, 5, 1)).toBeNull()
  })

  it('works from a measure that carries no onsets itself', () => {
    expect(adjacentMeasure(gapped, 3, 1)).toBe(5)
    expect(adjacentMeasure(gapped, 3, -1)).toBe(2)
  })

  it('steps 12 → 13 → 14 and back through the artifact', () => {
    expect(adjacentMeasure(moonlightSonata, 12, 1)).toBe(13)
    expect(adjacentMeasure(moonlightSonata, 13, 1)).toBe(14)
    expect(adjacentMeasure(moonlightSonata, 14, -1)).toBe(13)
  })

  it('is null before measure 1 and after measure 69', () => {
    expect(adjacentMeasure(moonlightSonata, 1, -1)).toBeNull()
    expect(adjacentMeasure(moonlightSonata, 69, 1)).toBeNull()
  })
})

describe('onsetKey', () => {
  it('keys on tick when the piece carries one', () => {
    expect(onsetKey({ measure: 12, tick: 720, beat: 4, notes: [66, 54] })).toBe('m12t720')
  })

  it('falls back to beat for a fixture with no tick', () => {
    expect(onsetKey({ measure: 1, beat: 1.5, notes: [60] })).toBe('m1b1.5')
  })

  it('is unique across every onset of the artifact', () => {
    const keys = new Set(moonlightSonata.map(onsetKey))

    expect(keys.size).toBe(moonlightSonata.length)
  })

  it('identifies the onsets of a match inside their own measure', () => {
    // What the focused view does to mark the anchor: the matched onsets are
    // copies, not the stream's own objects, so identity comparison is out and
    // this key is what stands in for it.
    const matched = moonlightSonata.filter(
      (group) => group.measure === 12 && group.beat >= 4,
    )
    const anchors = new Set(matched.map((group) => ({ ...group })).map(onsetKey))
    const marked = onsetsInMeasure(moonlightSonata, 12).filter((group) =>
      anchors.has(onsetKey(group)),
    )

    expect(marked).toHaveLength(3)
  })
})

describe('the focused view’s fixed window', () => {
  // The focused view is drawn on the input keyboard's range — the whole
  // piece, computed once — rather than on a per-measure range. These are the
  // numbers the loop's checks 10 and 11 quote, pinned here so a change to the
  // artifact could not move the frame unnoticed.
  it('is the full-piece window, MIDI 29 to 87', () => {
    expect(streamPitchRange(moonlightSonata)).toEqual({ minPitch: 29, maxPitch: 87 })
  })

  it('reads as F1 to D#6, 34 white keys', () => {
    const range = { minPitch: 29, maxPitch: 87 }

    expect(whiteKeyCount(range)).toBe(34)
    expect(describePitchRange(range)).toBe('F1 to D#6, 34 white keys')
  })
})
