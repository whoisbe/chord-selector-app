// Loop 017 — reading the piece itself, before there is a query.
//
// The lookup surface used to open empty: nothing of the movement was visible
// until a phrase had been built and matched. Browse makes the piece the thing
// you land on, and these are the pure decisions behind it — which measures are
// on the page, whether there are more after them, and what a typed measure
// number means.
//
// Three things this module deliberately does not do.
//
// It does not compute a pitch span. Browse is drawn on the fixed full-piece
// frame, handed down from the surface, exactly as the focused view of Loop 016
// is — recomputing per measure is the failure the fixed frame exists to
// prevent, and a module that could not compute a frame cannot reintroduce one.
//
// It does not assume measures are contiguous or that the anchor carries
// onsets. `browseMeasures` starts at the first measure at or after the anchor
// that actually has something in it, the same way `adjacentMeasure` walks
// rather than adds. All 69 measures of the committed artifact carry onsets, so
// that distinction is exercised by a fixture rather than by the piece.
//
// And it holds no state and reads no clock. The reader's place is session
// state in the component above; nothing here is stored, and nothing here
// survives a reload. That is the loop's contract, not an oversight.
//
// A note for anyone editing this file: `onset-range.ts` records that this
// directory is grepped case-insensitively for browser and framework
// identifiers, and the obvious noun for "the stretch of measures currently on
// the page" is one of the banned substrings. The wording here says span,
// stretch or slice instead, deliberately.

import { measuresWithOnsets, type MeasureBounds } from './measures'
import type { NoteGroup } from './types'

// Three measures to start, three more per extension. At the size a result
// keyboard is drawn today that is around 36 onsets and four to five pages of
// reading before the reader needs the control at all — enough that browse
// reads as "the piece is here" rather than as a teaser, and small enough that
// the initial page is a few per cent of the movement's node count rather than
// all of it. The two are equal on purpose: an extension that differed from the
// first load would make the second press cost something other than what the
// first one taught you to expect.
export const BROWSE_INITIAL_MEASURES = 3
export const BROWSE_EXTENSION_MEASURES = 3

// The measures on the page: those carrying onsets, from the first one at or
// after `anchor`, at most `count` of them. Fewer than `count` near the end of
// the piece, which is exactly when there is no more to show.
export function browseMeasures(
  stream: readonly NoteGroup[],
  anchor: number,
  count: number,
): number[] {
  if (count <= 0) {
    return []
  }

  return measuresWithOnsets(stream)
    .filter((measure) => measure >= anchor)
    .slice(0, count)
}

// Where a further extension would begin, or null when the page already reaches
// the end of the piece. Null rather than a clamped number, for the reason
// `adjacentMeasure` returns null: "there is nothing more" and "you are already
// showing it" have to be tellable apart by the caller, and a disabled control
// is the honest rendering of the first.
export function nextUnreadMeasure(
  stream: readonly NoteGroup[],
  anchor: number,
  count: number,
): number | null {
  const remaining = measuresWithOnsets(stream).filter((measure) => measure >= anchor)

  return remaining[Math.max(count, 0)] ?? null
}

export type MeasureRequest =
  | { ok: true; measure: number }
  | {
      ok: false
      reason: 'empty' | 'not-a-number' | 'out-of-range'
      message: string
    }

// What the reader typed into the jump control, turned into either a measure or
// a reason it is not one.
//
// The message is produced here, beside the rule that rejected the input, so
// the two can never drift apart — the same reason `describePitchRange` writes
// its own sentence rather than leaving the caller to phrase it. Every message
// names the piece's own first and last measure, and those come from `bounds`,
// which the caller derives from the loaded stream. There is no 69 anywhere in
// this file: a piece of five measures says "measures 1 to 5", which is what
// the unit suite checks.
//
// Rejection is never silent. A caller that ignored the returned message would
// leave the reader typing into a control that does nothing, which is the
// failure mode this shape exists to make awkward.
export function requestMeasure(input: string, bounds: MeasureBounds | null): MeasureRequest {
  const typed = input.trim()

  if (bounds === null) {
    return {
      ok: false,
      reason: typed === '' ? 'empty' : 'out-of-range',
      message: 'This piece has no measures to browse.',
    }
  }

  const span = `measures ${bounds.firstMeasure} to ${bounds.lastMeasure}`

  if (typed === '') {
    return { ok: false, reason: 'empty', message: `Enter a measure number. This piece has ${span}.` }
  }

  // Digits only. "3.5", "1e2", "-4" and "twelve" are all rejected the same
  // way: they may be numbers, but none of them is a measure number, and
  // Number() would quietly accept the first three.
  if (!/^\d+$/.test(typed)) {
    return {
      ok: false,
      reason: 'not-a-number',
      message: `"${typed}" is not a measure number. This piece has ${span}.`,
    }
  }

  const measure = Number.parseInt(typed, 10)

  if (measure < bounds.firstMeasure || measure > bounds.lastMeasure) {
    return {
      ok: false,
      reason: 'out-of-range',
      message: `Measure ${measure} is outside this piece. This piece has ${span}.`,
    }
  }

  return { ok: true, measure }
}
