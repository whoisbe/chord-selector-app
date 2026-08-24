// Loop 016 — one occurrence, focused, and paged through the piece a measure
// at a time.
//
// Three onsets of context never answered "what comes next", so a focused
// occurrence stops being a fixed sample of the neighbourhood and becomes
// something you read forward through: `<` and `>` step a measure, and the
// measure now on screen is drawn as a column of onsets, one row each.
//
// The frame is fixed, and that is the whole design. Per-measure pitch windows
// in this movement vary from 11 to 32 white keys; recomputing the window on
// every step would resize and shift the keys under the reader, and apparent
// melodic movement would become partly an artefact of the frame — which
// misinforms rather than merely underinforms. So the range is handed in from
// above and never recomputed here. The caller passes the input keyboard's own
// range (the whole piece, F1 to D#6, 34 white keys), so results and input end
// up the same geometry rather than two rulers that happen to agree.
//
// Decisions the handoff left open, and why:
//
// `<` and `>` sit above the column, not below or beside it. A measure of this
// piece is around a dozen onsets and close to a thousand pixels tall, so
// below would put the controls off-screen at the moment you have finished
// reading and want the next measure, and beside would either narrow the
// keyboards or float away from them as you scroll. Above keeps the control
// and the measure label it changes in one place, immediately under the
// heading that says which occurrence is open. They are rendered once, not
// duplicated top and bottom: two copies of "Next measure, 13" would be two
// controls with one accessible name, which is worse for a screen reader than
// a little scrolling is for a mouse.
//
// The anchor is marked with a word, not a colour. Rows belonging to the
// matched occurrence carry a visible "matched" badge and a solid rule down
// their left edge; every other row carries neither. Hue is present too — the
// rule and the tint are green — but it is the redundant channel, exactly as
// the staff markers in OnsetStrip.tsx are shapes first and colours second.
// The badge sits in a gutter of fixed width that every row has, marked or
// not, because a gutter that only appeared on marked rows would shift those
// keyboards sideways and break the very alignment the fixed frame exists to
// guarantee.

import { useMemo, useState } from 'react'

import {
  adjacentMeasure,
  measureBounds,
  onsetKey,
  onsetsInMeasure,
} from '../../lib/music/measures'
import type { PitchRange } from '../../lib/music/continuations'
import type { NoteGroup, PhraseMatch } from '../../lib/music/types'
import { OnsetKeyboard, formatOnsetLabel } from './OnsetStrip'

type FocusedOccurrenceProps = {
  occurrence: PhraseMatch
  stream: readonly NoteGroup[]
  // Fixed for the lifetime of the focus. See the file comment: this is the
  // loop, not a detail of it.
  range: PitchRange
  showStaff: boolean
  onClose: () => void
}

export function FocusedOccurrence({
  occurrence,
  stream,
  range,
  showStaff,
  onClose,
}: FocusedOccurrenceProps) {
  // Session state, and only this component's. The occurrence's own measure is
  // where paging starts; nothing about where the reader got to survives a
  // reload, a different occurrence, or a new query — this project has no
  // persistence layer and a navigation loop is not the place to introduce one.
  const [measure, setMeasure] = useState(occurrence.measure)

  const bounds = useMemo(() => measureBounds(stream), [stream])
  const previousMeasure = useMemo(() => adjacentMeasure(stream, measure, -1), [stream, measure])
  const nextMeasure = useMemo(() => adjacentMeasure(stream, measure, 1), [stream, measure])
  const onsets = useMemo(() => onsetsInMeasure(stream, measure), [stream, measure])

  // The onsets of the match itself, by key rather than by object identity:
  // findPhraseMatches hands back copies, so the groups in `occurrence` are
  // never the same objects as the ones in the stream.
  const anchorKeys = useMemo(
    () => new Set(occurrence.matchedGroups.map(onsetKey)),
    [occurrence],
  )

  const lastMeasure = bounds?.lastMeasure ?? measure

  return (
    <div className="focused-occurrence">
      <div className="focused-occurrence-controls">
        <button type="button" className="measure-nav-button" onClick={onClose}>
          Back to all occurrences
        </button>

        <div className="measure-nav" role="group" aria-label="Measure navigation">
          {/* A control at a boundary is disabled, never hidden: a `<` that
              vanished at measure 1 would be indistinguishable from a crash.
              Its name says so out loud rather than naming a measure that does
              not exist. */}
          <button
            type="button"
            className="measure-nav-button"
            aria-label={
              previousMeasure === null
                ? `Previous measure, unavailable at measure ${measure}`
                : `Previous measure, ${previousMeasure}`
            }
            disabled={previousMeasure === null}
            onClick={() => {
              if (previousMeasure !== null) {
                setMeasure(previousMeasure)
              }
            }}
          >
            <span aria-hidden="true">‹</span>
          </button>

          <span className="text-sm">
            Measure {measure} of {lastMeasure}
          </span>

          <button
            type="button"
            className="measure-nav-button"
            aria-label={
              nextMeasure === null
                ? `Next measure, unavailable at measure ${measure}`
                : `Next measure, ${nextMeasure}`
            }
            disabled={nextMeasure === null}
            onClick={() => {
              if (nextMeasure !== null) {
                setMeasure(nextMeasure)
              }
            }}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>

      {/* A group rather than a list: the surface's occurrence list is already
          a <ul>, and nesting a second one inside it would make every row of
          every measure a list item of the results too. */}
      <div
        className="focused-onsets"
        role="group"
        aria-label={`Onsets in measure ${measure}`}
      >
        {onsets.length === 0 ? (
          <p className="text-sm">No onsets in measure {measure}.</p>
        ) : (
          onsets.map((group) => {
            const isAnchor = anchorKeys.has(onsetKey(group))

            return (
              <div
                key={onsetKey(group)}
                className={
                  isAnchor ? 'focused-onset-row focused-onset-row--anchor' : 'focused-onset-row'
                }
              >
                <span className="focused-onset-gutter text-xs">
                  {isAnchor ? (
                    <span className="focused-onset-badge">
                      <span aria-hidden="true">▌</span>
                      <span>matched</span>
                    </span>
                  ) : null}
                </span>
                <OnsetKeyboard group={group} range={range} showStaff={showStaff} />
                <span className="onset-strip-row-label text-muted-foreground text-xs">
                  {formatOnsetLabel(group)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
