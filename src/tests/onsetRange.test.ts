// Loop 014, check 8: every onset keyboard on screen at one time is drawn on
// the same pitch range. The surface computes that range with these helpers,
// so this is where the rule is pinned down — asserting on the computed range
// rather than on how the strips happen to look.

import { describe, expect, it } from 'vitest'

import { moonlightSonata } from '../data/pieces/moonlight-sonata'
import { containingOccurrences } from '../lib/music/continuations'
import { describePitchRange, sharedPitchRange, whiteKeyCount } from '../lib/music/onset-range'
import { findPhraseMatches } from '../lib/music/phrase-search'
import type { NoteGroup } from '../lib/music/types'

function group(notes: number[]): NoteGroup {
  return { measure: 1, beat: 1, notes }
}

function displayedGroups(occurrences: ReturnType<typeof findPhraseMatches>): NoteGroup[] {
  return occurrences.flatMap((occurrence) => [
    ...occurrence.matchedGroups,
    ...occurrence.followingGroups,
  ])
}

describe('sharedPitchRange', () => {
  it('returns null when nothing is displayed', () => {
    expect(sharedPitchRange([])).toBeNull()
  })

  it('spans the extremes of every onset given', () => {
    expect(sharedPitchRange([group([60, 64]), group([48]), group([72, 55])])).toEqual({
      minPitch: 48,
      maxPitch: 72,
    })
  })

  it('collapses several independent sets into one range', () => {
    // The surface can show committed-phrase results and containing onsets at
    // the same time; both must land on one range or their shapes stop being
    // comparable, which is the whole point of drawing them.
    const results = [group([60]), group([64])]
    const containing = [group([40]), group([80])]

    expect(sharedPitchRange(results, containing)).toEqual({ minPitch: 40, maxPitch: 80 })
    expect(sharedPitchRange(results, containing)).toEqual(
      sharedPitchRange([...results, ...containing]),
    )
  })

  it('is unaffected by the order of the onsets', () => {
    const onsets = [group([60, 64]), group([48]), group([72])]

    expect(sharedPitchRange(onsets)).toEqual(sharedPitchRange([...onsets].reverse()))
  })

  it('handles a single note', () => {
    expect(sharedPitchRange([group([60])])).toEqual({ minPitch: 60, maxPitch: 60 })
  })
})

describe('whiteKeyCount', () => {
  it('counts a full octave C to C as eight white keys', () => {
    expect(whiteKeyCount({ minPitch: 60, maxPitch: 72 })).toBe(8)
  })

  it('counts a range that begins and ends on black keys', () => {
    // F#1 (30) to F#4 (66): the loop's worst rendered case.
    expect(whiteKeyCount({ minPitch: 30, maxPitch: 66 })).toBe(21)
  })

  it('counts a single black key as none', () => {
    expect(whiteKeyCount({ minPitch: 66, maxPitch: 66 })).toBe(0)
  })
})

describe('describePitchRange', () => {
  it('names both ends and the white-key count', () => {
    expect(describePitchRange({ minPitch: 35, maxPitch: 66 })).toBe('B1 to F#4, 19 white keys')
  })

  it('says key, singular, when there is one', () => {
    expect(describePitchRange({ minPitch: 60, maxPitch: 60 })).toBe('C4 to C4, 1 white key')
  })
})

// The figures below are measured from the committed artifact and are quoted
// by the loop handoff. They are here so a change in rendering cannot quietly
// move them.
describe('the ranges the surface actually renders', () => {
  it('draws the founding query on B1 to F#4, 19 white keys', () => {
    const matches = findPhraseMatches(moonlightSonata, {
      groups: [{ notes: [54, 66] }, { notes: [61] }, { notes: [64] }],
    })

    expect(matches).toHaveLength(1)
    expect(matches[0].matchedGroups).toHaveLength(3)
    expect(matches[0].followingGroups).toHaveLength(3)

    const range = sharedPitchRange(displayedGroups(matches))

    expect(range).toEqual({ minPitch: 35, maxPitch: 66 })
    expect(describePitchRange(range!)).toBe('B1 to F#4, 19 white keys')
  })

  it('draws the capped [E4] result on F#1 to F#4, 21 white keys', () => {
    const matches = findPhraseMatches(moonlightSonata, { groups: [{ notes: [64] }] })

    expect(matches).toHaveLength(78)

    const range = sharedPitchRange(displayedGroups(matches.slice(0, 12)))

    expect(describePitchRange(range!)).toBe('F#1 to F#4, 21 white keys')
  })

  it('draws the F#3 plus F#4 disclosure strips on F#1 to F#4, 21 white keys', () => {
    const occurrences = containingOccurrences(moonlightSonata, [54, 66])

    expect(occurrences).toHaveLength(6)

    const range = sharedPitchRange(displayedGroups(occurrences))

    expect(describePitchRange(range!)).toBe('F#1 to F#4, 21 white keys')
  })
})

describe('containingOccurrences', () => {
  it('finds every onset containing the selection, with what follows each', () => {
    const occurrences = containingOccurrences(moonlightSonata, [54, 66])

    expect(occurrences).toHaveLength(6)
    expect(occurrences[0].measure).toBe(12)
    expect(occurrences[0].beat).toBe(4)
    expect(occurrences[0].matchedGroups).toHaveLength(1)
    expect(occurrences[0].matchedGroups[0].notes).toEqual(
      expect.arrayContaining([54, 66]),
    )
    expect(occurrences[0].followingGroups).toHaveLength(3)
    expect(occurrences[0].followingGroups[0].notes).toEqual([61])
  })

  it('agrees with containmentCount for the counts the surface shows', () => {
    // 87 / 65 / 43 / 13 / 6 — the measured figures behind the disclosure
    // threshold, and the reason only the last of them draws strips.
    expect(containingOccurrences(moonlightSonata, [66])).toHaveLength(87)
    expect(containingOccurrences(moonlightSonata, [59])).toHaveLength(65)
    expect(containingOccurrences(moonlightSonata, [54])).toHaveLength(43)
    expect(containingOccurrences(moonlightSonata, [35, 47])).toHaveLength(13)
    expect(containingOccurrences(moonlightSonata, [54, 66])).toHaveLength(6)
  })

  it('returns nothing for an empty selection', () => {
    // Every onset vacuously contains nothing; listing all 823 would say
    // nothing at all.
    expect(containingOccurrences(moonlightSonata, [])).toEqual([])
  })

  it('stops the following groups at the end of the stream', () => {
    const last = moonlightSonata[moonlightSonata.length - 1]
    const occurrences = containingOccurrences(moonlightSonata, last.notes)

    expect(occurrences.length).toBeGreaterThan(0)
    expect(occurrences[occurrences.length - 1].followingGroups).toEqual([])
  })
})
