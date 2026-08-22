// Loop 017, task 1 — the pure side of browsing the piece.
//
// Two tiers, the same shape as measures.test.ts beside it. The fixture tier
// pins the semantics, including the two cases the committed artifact cannot
// exercise: a measure with no onsets in it, and a piece whose last measure is
// not 69. That second one is the whole of check 12's "derived, not hardcoded"
// claim — a five-measure piece has to say "measures 1 to 5", and nothing in
// browse.ts can be a literal 69 if it does.
//
// The artifact tier pins the numbers the browse view and its e2e checks are
// built on: three measures to a page, 36 onsets in the first three, and an end
// of the piece where the control has to go quiet.

import { describe, expect, it } from 'vitest'

import { moonlightSonata } from '../data/pieces/moonlight-sonata'
import {
  BROWSE_EXTENSION_MEASURES,
  BROWSE_INITIAL_MEASURES,
  browseMeasures,
  nextUnreadMeasure,
  requestMeasure,
} from '../lib/music/browse'
import { measureBounds, onsetsInMeasure } from '../lib/music/measures'
import type { NoteGroup } from '../lib/music/types'

// Measures 1, 2 and 5 carry onsets; 3 and 4 are empty. Out of measure order on
// purpose, so nothing here can pass by relying on the input being sorted.
const gapped: NoteGroup[] = [
  { measure: 2, tick: 0, beat: 1, notes: [62] },
  { measure: 1, tick: 0, beat: 1, notes: [60] },
  { measure: 1, tick: 240, beat: 2, notes: [64] },
  { measure: 5, tick: 0, beat: 1, notes: [67] },
]

const gappedBounds = measureBounds(gapped)

describe('the page size constants', () => {
  it('are equal, so the second press costs what the first load taught you', () => {
    expect(BROWSE_INITIAL_MEASURES).toBe(3)
    expect(BROWSE_EXTENSION_MEASURES).toBe(BROWSE_INITIAL_MEASURES)
  })
})

describe('browseMeasures', () => {
  it('is empty for an empty stream', () => {
    expect(browseMeasures([], 1, 3)).toEqual([])
  })

  it('is empty when nothing is asked for', () => {
    expect(browseMeasures(gapped, 1, 0)).toEqual([])
    expect(browseMeasures(gapped, 1, -1)).toEqual([])
  })

  it('takes the first `count` measures at or after the anchor', () => {
    expect(browseMeasures(gapped, 1, 2)).toEqual([1, 2])
  })

  it('starts at the next measure carrying onsets, not at an empty one', () => {
    // Anchored on measure 3, which has nothing in it. Browse opens on 5
    // rather than drawing a blank page and calling it measure 3.
    expect(browseMeasures(gapped, 3, 3)).toEqual([5])
  })

  it('returns fewer than asked for at the end of the piece', () => {
    expect(browseMeasures(gapped, 5, 3)).toEqual([5])
  })

  it('opens the artifact on measures 1, 2 and 3', () => {
    expect(browseMeasures(moonlightSonata, 1, BROWSE_INITIAL_MEASURES)).toEqual([1, 2, 3])
  })

  it('draws 36 onsets on that first page', () => {
    // The number check 8 is stated in: 36 of the movement's 823 onsets, so the
    // initial page is a small fraction of the whole rather than all of it.
    const onsets = browseMeasures(moonlightSonata, 1, BROWSE_INITIAL_MEASURES).flatMap((measure) =>
      onsetsInMeasure(moonlightSonata, measure),
    )

    expect(onsets).toHaveLength(36)
    expect(moonlightSonata).toHaveLength(823)
  })

  it('lands on 34, 35 and 36 when the reader jumps to where he stopped', () => {
    expect(browseMeasures(moonlightSonata, 34, BROWSE_INITIAL_MEASURES)).toEqual([34, 35, 36])
  })
})

describe('nextUnreadMeasure', () => {
  it('is the measure a further extension would begin at', () => {
    expect(nextUnreadMeasure(moonlightSonata, 1, BROWSE_INITIAL_MEASURES)).toBe(4)
    expect(nextUnreadMeasure(moonlightSonata, 34, 3)).toBe(37)
  })

  it('skips an empty measure the same way the page does', () => {
    expect(nextUnreadMeasure(gapped, 1, 2)).toBe(5)
  })

  it('is null once the page reaches the end of the piece', () => {
    // The condition that disables the control, rather than a clamped number
    // that would leave it live and inert.
    expect(nextUnreadMeasure(gapped, 1, 3)).toBeNull()
    expect(nextUnreadMeasure(moonlightSonata, 67, 3)).toBeNull()
    expect(nextUnreadMeasure(moonlightSonata, 1, 69)).toBeNull()
  })

  it('still offers the last measure when the page stops one short', () => {
    expect(nextUnreadMeasure(moonlightSonata, 66, 3)).toBe(69)
  })

  it('is null for an empty stream', () => {
    expect(nextUnreadMeasure([], 1, 3)).toBeNull()
  })
})

describe('requestMeasure', () => {
  const bounds = measureBounds(moonlightSonata)

  it('accepts a measure inside the piece', () => {
    expect(requestMeasure('34', bounds)).toEqual({ ok: true, measure: 34 })
  })

  it('accepts surrounding whitespace and a leading zero', () => {
    expect(requestMeasure('  34  ', bounds)).toEqual({ ok: true, measure: 34 })
    expect(requestMeasure('034', bounds)).toEqual({ ok: true, measure: 34 })
  })

  it('accepts both ends of the piece', () => {
    expect(requestMeasure('1', bounds)).toEqual({ ok: true, measure: 1 })
    expect(requestMeasure('69', bounds)).toEqual({ ok: true, measure: 69 })
  })

  it('rejects nothing typed at all, and says what to type', () => {
    const result = requestMeasure('   ', bounds)

    expect(result.ok).toBe(false)
    expect(result).toMatchObject({
      reason: 'empty',
      message: 'Enter a measure number. This piece has measures 1 to 69.',
    })
  })

  it('rejects what is not a measure number, quoting it back', () => {
    // Number() would accept the middle three. A measure number is digits.
    for (const typed of ['abc', '3.5', '1e2', '-4', '12a']) {
      const result = requestMeasure(typed, bounds)

      expect(result).toMatchObject({
        ok: false,
        reason: 'not-a-number',
        message: `"${typed}" is not a measure number. This piece has measures 1 to 69.`,
      })
    }
  })

  it('rejects 0 and 70, naming the measure that does not exist', () => {
    expect(requestMeasure('0', bounds)).toMatchObject({
      ok: false,
      reason: 'out-of-range',
      message: 'Measure 0 is outside this piece. This piece has measures 1 to 69.',
    })
    expect(requestMeasure('70', bounds)).toMatchObject({
      ok: false,
      reason: 'out-of-range',
      message: 'Measure 70 is outside this piece. This piece has measures 1 to 69.',
    })
  })

  it('takes its bounds from the piece it is given, not from this piece', () => {
    // Check 12's actual claim. The five-measure fixture says "1 to 5", so the
    // 69 in every message above is computed from the artifact rather than
    // written down anywhere.
    expect(requestMeasure('6', gappedBounds)).toMatchObject({
      ok: false,
      reason: 'out-of-range',
      message: 'Measure 6 is outside this piece. This piece has measures 1 to 5.',
    })
    expect(requestMeasure('x', gappedBounds)).toMatchObject({
      message: '"x" is not a measure number. This piece has measures 1 to 5.',
    })
    expect(requestMeasure('5', gappedBounds)).toEqual({ ok: true, measure: 5 })
  })

  it('refuses everything when there is no piece to browse', () => {
    expect(requestMeasure('1', null)).toMatchObject({
      ok: false,
      message: 'This piece has no measures to browse.',
    })
    expect(requestMeasure('', null)).toMatchObject({
      ok: false,
      reason: 'empty',
      message: 'This piece has no measures to browse.',
    })
  })
})
