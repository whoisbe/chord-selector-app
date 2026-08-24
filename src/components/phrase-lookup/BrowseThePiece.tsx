// Loop 017 — the piece itself, which is now what the tab opens on.
//
// The surface used to open empty: until you had built a phrase and matched
// something, none of the movement was on the page. This draws the piece from
// measure 1 instead, a bounded stretch at a time, with a control to jump
// anywhere in it.
//
// The frame is the same fixed one Loop 016 established, and for the same
// reason, only more urgently. Per-measure pitch spans in this movement run
// from 11 to 32 white keys; recomputing per measure would resize and shift the
// keys under a reader who is scrolling through tens of thousands of pixels,
// and apparent melodic movement would become partly an artefact of the frame.
// So the span arrives as a prop, from the same FULL_RANGE object the focused
// view is handed, and is never recomputed here. An onset in a result, an onset
// reached by paging, and an onset met while browsing are the same picture.
//
// Decisions the handoff left open, and why:
//
// Three measures load, and three more per press. At the size a result keyboard
// is drawn today that first page is 36 onsets — four or five pages of reading
// before the control is needed at all, and a few per cent of the movement's
// node count rather than all of it. Loading everything is not a smoothness
// problem, it is a ceiling.
//
// There is no scroll-triggered loading beside the button, only the button.
// Two mechanisms would make the button's own effect untestable — content would
// already have arrived by scroll before anyone pressed it — and an observer is
// the classic source of the e2e flakiness this project refuses to paper over.
// One mechanism, operable from the keyboard, and a test that scrolls to the
// bottom and proves nothing loaded.
//
// The jump control sits at the top, and `<` / `>` deliberately do not appear
// here. In the focused view those glyphs *replace* the measure on screen; here
// measures *accumulate*. The same control with the opposite meaning in two
// places would be worse than having no shortcut at all, so browse's vocabulary
// is jump and show-more, and stepping stays the focused occurrence's.

import { useId, useMemo, useState } from 'react'

import { browseMeasures, nextUnreadMeasure, requestMeasure } from '../../lib/music/browse'
import type { PitchRange } from '../../lib/music/continuations'
import { measureBounds, onsetKey, onsetsInMeasure } from '../../lib/music/measures'
import { describePitchRange } from '../../lib/music/onset-range'
import type { NoteGroup } from '../../lib/music/types'
import { OnsetKeyboard, formatOnsetLabel } from './OnsetStrip'

type BrowseThePieceProps = {
  stream: readonly NoteGroup[]
  // Fixed for the whole piece. See the file comment: this is the loop, not a
  // detail of it.
  range: PitchRange
  showStaff: boolean
  anchor: number
  span: number
  onJump: (measure: number) => void
  onShowMore: () => void
}

export function BrowseThePiece({
  stream,
  range,
  showStaff,
  anchor,
  span,
  onJump,
  onShowMore,
}: BrowseThePieceProps) {
  const inputId = useId()

  // Only the half-typed number and the reason the last one was refused live
  // here. Where the reader has got to is the surface's state, so returning
  // from a query lands back where they were reading — and none of it is
  // stored anywhere, so none of it survives a reload. The human supplies the
  // memory; this loop adds no persistence layer.
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const bounds = useMemo(() => measureBounds(stream), [stream])
  const measures = useMemo(() => browseMeasures(stream, anchor, span), [stream, anchor, span])
  const nextMeasure = useMemo(
    () => nextUnreadMeasure(stream, anchor, span),
    [stream, anchor, span],
  )

  const firstShown = measures[0] ?? null
  const lastShown = measures[measures.length - 1] ?? null
  const lastMeasure = bounds?.lastMeasure ?? null

  return (
    <section className="browse-piece" aria-label="Browse the piece">
      <div className="browse-controls">
        {/* A real form, so Enter in the field submits the way Enter in a
            field is supposed to — the reader types a number and presses the
            key already under their finger, rather than having to find a
            button. */}
        <form
          className="browse-jump"
          onSubmit={(event) => {
            event.preventDefault()

            const result = requestMeasure(draft, bounds)

            if (!result.ok) {
              // Refused out loud. A control that silently ignored 0, 70 or
              // "abc" would leave the reader typing into something that does
              // nothing, with no way to tell that from a broken app.
              setError(result.message)
              return
            }

            setError(null)
            setDraft('')
            onJump(result.measure)
          }}
        >
          <label htmlFor={inputId} className="text-sm">
            Go to measure
          </label>
          {/* type="text" with a numeric keypad hint, not type="number".
              Chromium silently discards non-digits typed into a number field,
              which would mean "abc" could never reach the validation above —
              the error would be unreachable rather than unnecessary, and the
              reader would get no explanation at all. */}
          <input
            id={inputId}
            className="browse-jump-input text-sm"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="measure-nav-button">
            Go
          </button>
        </form>

        {firstShown !== null && lastShown !== null && lastMeasure !== null ? (
          <p className="text-muted-foreground text-xs">
            Showing {firstShown === lastShown ? 'measure' : 'measures'} {firstShown}
            {firstShown === lastShown ? '' : ` to ${lastShown}`} of {lastMeasure}.
          </p>
        ) : null}
      </div>

      {/* role="alert" so the refusal is announced, not merely printed. */}
      {error ? (
        <p className="browse-jump-error text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {/* Said out loud, the way the results surface says it, so a reader can
          tell the frame is fixed without measuring pixels. */}
      <p className="text-muted-foreground text-xs">
        Same range on every browse keyboard: {describePitchRange(range)} — fixed for the whole
        piece, so a pitch keeps its place from the first measure to the last.
      </p>

      {measures.length === 0 ? (
        <p className="text-sm">No measures to show.</p>
      ) : (
        measures.map((measure) => (
          <div
            key={measure}
            className="browse-measure"
            role="group"
            aria-label={`Measure ${measure}`}
          >
            <h3 className="browse-measure-heading text-sm font-medium">Measure {measure}</h3>

            <div className="browse-measure-onsets">
              {onsetsInMeasure(stream, measure).map((group) => (
                <div key={onsetKey(group)} className="browse-onset-row">
                  <OnsetKeyboard group={group} range={range} showStaff={showStaff} />
                  <span className="onset-strip-row-label text-muted-foreground text-xs">
                    {formatOnsetLabel(group)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Disabled at the end of the piece, never hidden — a control that
          vanished there would read as a crash rather than as an ending. The
          name says which measure the next press would bring, so it is worth
          reading before pressing. */}
      <button
        type="button"
        className="measure-nav-button"
        aria-label={
          nextMeasure === null
            ? 'Show more measures, unavailable at the end of the piece'
            : `Show more measures, from measure ${nextMeasure}`
        }
        disabled={nextMeasure === null}
        onClick={onShowMore}
      >
        Show more measures
      </button>
    </section>
  )
}
