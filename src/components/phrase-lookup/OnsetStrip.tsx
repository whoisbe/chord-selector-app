// Results as onset strips (Loop 014), with `then` stacked vertically (Loop 015).
//
// Each onset in a result is drawn as its own small keyboard, so a remembered
// shape can be recognised the way it was learned — spatially — instead of
// being decoded from `matched: upper F#4 / lower F#3`. The old text framing
// was the wrong modality for this project, and its upper/lower wording
// actively misled: at measure 13 the user read `lower F#3` and inferred left
// hand while playing that note with his right.
//
// Two rendering decisions worth stating, both left open by the Loop 014
// handoff:
//
// SVG rather than DOM. PhraseKeyboard uses absolutely positioned buttons
// because every key there is a real, focusable control. Nothing here is
// interactive, and a capped result set can put ~70 of these on screen at
// once; one <svg> per onset keeps that to one element per drawn shape instead
// of ~37 positioned <div>s per onset, and lets the sounding notes be named
// individually without minting dozens of focus targets.
//
// keyLayout is reused, not reimplemented. It is already pure and
// range-parameterised, and reusing it is what makes an onset strip and the
// input keyboard agree about where a pitch sits. Its constants are sized for
// the interactive surface (21px per white step), which is far too wide for a
// strip, so coordinates are scaled on the way out — the layout stays the one
// source of truth for relative position.
//
// Loop 015 stacks `then` vertically, one row per following onset, each on
// the same x axis. That is the entire mechanism: matched.range and every
// following row already share sharedRange (computed once, up in
// PhraseLookupSurface), so a pitch that recurs across rows was always going
// to land at the same x — stacking only had to stop spending that alignment
// sideways. Two decisions the Loop 014 handoff left open, now settled:
//
// Note names return on stacked rows. The 014 comment this replaced read
// "on for matched onsets, off for what follows" — a call forced by ~8px
// labels on a horizontal following strip. A stacked column has a free row's
// width beside it instead of a shrinking gap, so the constraint that made
// following-onset labels illegible no longer holds, and there is no
// remaining reason to withhold them.
//
// The per-row label sits beside the keyboard, not above it. Above would add
// a text line's height to every one of up to three rows for a result that is
// already the page's tallest element (Section 4 of the handoff); beside
// costs no vertical space at all, keeps every row the same height, and reads
// naturally left-to-right next to the shape it names.

import {
  BLACK_KEY_HEIGHT,
  KEY_GAP,
  WHITE_KEY_HEIGHT,
  WHITE_KEY_WIDTH,
  keyLayout,
  keyboardWidth,
  type KeyGeometry,
} from '../../lib/music/keyboard'
import { pitchToLabel } from '../../lib/music/pitch-label'
import type { NoteGroup, PhraseMatch } from '../../lib/music/types'
import type { PitchRange } from '../../lib/music/continuations'

// 14px per white key against keyLayout's 21px step. The handoff sized the
// worst rendered case (21 white keys) at ~252px using 12px keys; 14px puts it
// at ~294px, still well inside the container once rows wrap, and it is the
// smallest size at which the staff markers below stay tellable apart.
const ONSET_WHITE_KEY_WIDTH = 14
const SCALE = ONSET_WHITE_KEY_WIDTH / (WHITE_KEY_WIDTH + KEY_GAP)

const KEYBOARD_HEIGHT = WHITE_KEY_HEIGHT * SCALE
const LABEL_ROW_HEIGHT = 10
const LABEL_BAND = LABEL_ROW_HEIGHT * 2 + 2
const LABEL_FONT_SIZE = 8

// The tone the input keyboard already uses for a key you entered. Reusing it
// means a note you played and a note the piece plays back at you read as the
// same kind of thing.
const SOUNDING = '#1f705f'
const SOUNDING_UPPER = SOUNDING
const SOUNDING_LOWER = '#9a4f1b'
const MARKER = '#ffffff'

const WHITE_KEY_FILL = '#ffffff'
const WHITE_KEY_EDGE = '#d4d4d8'
const BLACK_KEY_FILL = '#18181b'

type SoundingNote = { pitch: number; staff: number | undefined }

// Stream groups are stored in engraved order, not pitch order — the artifact
// holds F#4 before F#3 at measure 12 beat 4 — while groups that came back
// from findPhraseMatches are already normalised. Sorting here means the
// accessible names read low to high either way, without either caller having
// to know which kind of group it is holding.
export function soundingNotes(group: NoteGroup): SoundingNote[] {
  return group.notes
    .map((pitch, index) => ({ pitch, staff: group.staves?.[index] }))
    .sort((left, right) => left.pitch - right.pitch)
}

function noteName(note: SoundingNote, showStaff: boolean): string {
  const label = pitchToLabel(note.pitch)

  if (!showStaff || note.staff === undefined) {
    return label
  }

  return `${label}, ${note.staff === 1 ? 'upper' : 'lower'} staff`
}

// The part of a key that no other key can overlap: below the black keys on a
// white key, inside the black key itself on a black one. Filling only this
// region means every sounding mark can be drawn in one final pass, in pitch
// order, without a white key painting over its black neighbour.
function capRect(key: KeyGeometry) {
  if (key.isBlack) {
    return {
      x: (key.x + 1) * SCALE,
      y: 22 * SCALE,
      width: (key.width - 2) * SCALE,
      height: 22 * SCALE,
      rx: 1.5,
    }
  }

  return {
    x: (key.x + 2) * SCALE,
    y: 50 * SCALE,
    width: (key.width - 4) * SCALE,
    height: 26 * SCALE,
    rx: 2,
  }
}

type OnsetKeyboardProps = {
  group: NoteGroup
  range: PitchRange
  showStaff: boolean
}

// Exported for Loop 016's focused view, which draws a whole measure as a
// column of these on one fixed window. Nothing about the drawing changes
// there — that is the point: an onset in a result and the same onset reached
// by paging are the same picture, so recognising one teaches you the other.

// Loop 015: note names under the keys are on unconditionally now. Loop 014
// turned them off for following onsets only because a horizontal strip left
// no room to render them; stacking removed that constraint (see the file
// comment above), so the one caller that used to pass `showLabels={false}`
// no longer exists and the prop went with it.
export function OnsetKeyboard({ group, range, showStaff }: OnsetKeyboardProps) {
  const keys = keyLayout(range.minPitch, range.maxPitch)
  const width = keyboardWidth(keys) * SCALE
  const height = KEYBOARD_HEIGHT + LABEL_BAND

  const notes = soundingNotes(group)
  const byPitch = new Map(notes.map((note) => [note.pitch, note]))

  // Two label rows, used only when neighbouring names would collide. A name
  // is about 20px wide at 8px type, and adjacent white keys are 14px apart.
  let lastLabelX = Number.NEGATIVE_INFINITY
  let lastLabelRow = 1

  return (
    <svg
      role="group"
      aria-label="Onset keyboard"
      width={width}
      height={height}
      className="onset-keyboard"
    >
      {keys
        .filter((key) => !key.isBlack)
        .map((key) => (
          <rect
            key={key.pitch}
            x={key.x * SCALE}
            y={0}
            width={key.width * SCALE}
            height={WHITE_KEY_HEIGHT * SCALE}
            fill={WHITE_KEY_FILL}
            stroke={WHITE_KEY_EDGE}
            strokeWidth={0.5}
            rx={1}
          />
        ))}

      {keys
        .filter((key) => key.isBlack)
        .map((key) => (
          <rect
            key={key.pitch}
            x={key.x * SCALE}
            y={0}
            width={key.width * SCALE}
            height={BLACK_KEY_HEIGHT * SCALE}
            fill={BLACK_KEY_FILL}
            rx={1}
          />
        ))}

      {keys.map((key) => {
        const note = byPitch.get(key.pitch)
        if (!note) {
          return null
        }

        const cap = capRect(key)
        const centreX = cap.x + cap.width / 2
        const centreY = cap.y + cap.height / 2
        const tone =
          showStaff && note.staff !== undefined
            ? note.staff === 1
              ? SOUNDING_UPPER
              : SOUNDING_LOWER
            : SOUNDING
        const marker = showStaff && note.staff !== undefined ? note.staff : undefined

        const row = centreX - lastLabelX < 20 && lastLabelRow === 1 ? 2 : 1
        lastLabelX = centreX
        lastLabelRow = row

        // A name centred on the outermost key of the range overruns the
        // edge and is clipped — F#1 renders as "#1" on any strip that
        // starts there. Anchoring to the edge instead keeps it whole.
        const halfName = (pitchToLabel(note.pitch).length * LABEL_FONT_SIZE) / 3
        const anchor: 'start' | 'middle' | 'end' =
          centreX - halfName < 0 ? 'start' : centreX + halfName > width ? 'end' : 'middle'

        const label = {
          x: anchor === 'start' ? 0 : anchor === 'end' ? width : centreX,
          y: KEYBOARD_HEIGHT + (row === 1 ? LABEL_ROW_HEIGHT : LABEL_ROW_HEIGHT * 2),
          anchor,
        }

        return (
          <g key={key.pitch} role="img" aria-label={noteName(note, showStaff)}>
            <rect
              x={cap.x}
              y={cap.y}
              width={cap.width}
              height={cap.height}
              rx={cap.rx}
              fill={tone}
            />
            {/* The staff distinction never rests on hue: an upper-staff note
                carries a dot and a lower-staff note a bar, so the two stay
                tellable apart in greyscale and under any colour-vision
                deficiency. Hue is the redundant channel here, not the
                carrier. */}
            {marker === 1 ? (
              <circle cx={centreX} cy={centreY} r={Math.min(3.4, cap.width / 2 - 1)} fill={MARKER} />
            ) : null}
            {marker === 2 ? (
              <line
                x1={centreX - Math.min(4, cap.width / 2 - 1)}
                x2={centreX + Math.min(4, cap.width / 2 - 1)}
                y1={centreY}
                y2={centreY}
                stroke={MARKER}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            ) : null}
            <text
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              fontSize={LABEL_FONT_SIZE}
              fill="currentColor"
            >
              {pitchToLabel(note.pitch)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function formatBeat(beat: number): string {
  return Number.isInteger(beat) ? String(beat) : beat.toFixed(2)
}

// Loop 015: the anchor carried beside each stacked following row. A
// horizontal strip could lean on left-to-right order to say "this is the
// next one"; a column still needs order (top to bottom supplies that), but
// with the width a note-name label no longer claims, there is room to say
// *where* too, so it does.
// Loop 016 reuses this for the rows of a focused measure: a row means the
// same thing in both places, so it is labelled the same way in both.
export function formatOnsetLabel(group: NoteGroup): string {
  return `m${group.measure} b${formatBeat(group.beat)}`
}

type OnsetStripProps = {
  occurrence: PhraseMatch
  range: PitchRange
  showStaff: boolean
  // What the leading onsets are: the groups of a committed phrase that
  // matched, or the single onset that contains the selection in progress.
  matchedLabel: string
  matchedGroupName: string
}

export function OnsetStrip({
  occurrence,
  range,
  showStaff,
  matchedLabel,
  matchedGroupName,
}: OnsetStripProps) {
  return (
    <div className="onset-strip">
      <div className="onset-strip-section" role="group" aria-label={matchedGroupName}>
        <span className="text-muted-foreground text-xs">{matchedLabel}</span>
        <div className="onset-strip-onsets">
          {occurrence.matchedGroups.map((group, position) => (
            <OnsetKeyboard
              key={`matched-${position}`}
              group={group}
              range={range}
              showStaff={showStaff}
            />
          ))}
        </div>
      </div>

      <div className="onset-strip-section" role="group" aria-label="Following onsets">
        <span className="text-muted-foreground text-xs">then</span>
        {occurrence.followingGroups.length === 0 ? (
          <span className="text-xs">end of movement</span>
        ) : (
          // Stacked, not the matched section's row (Loop 015): every row is
          // drawn to `range`, the same shared window as the matched onsets
          // above it, so a pitch recurring across rows lands at the same x
          // in each — that alignment is what turns a column of keyboards
          // into a readable contour instead of just a saving of width.
          <div className="onset-strip-onsets onset-strip-onsets--stacked">
            {occurrence.followingGroups.map((group, position) => (
              <div className="onset-strip-row" key={`following-${position}`}>
                <OnsetKeyboard group={group} range={range} showStaff={showStaff} />
                <span className="onset-strip-row-label text-muted-foreground text-xs">
                  {formatOnsetLabel(group)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
