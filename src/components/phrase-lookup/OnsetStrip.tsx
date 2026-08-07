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
// input keyboard agree about where a pitch sits — the layout stays the one
// source of truth for relative position. A strip keyboard renders at that
// same 21px-per-white-step size (see ONSET_WHITE_KEY_WIDTH below), matching
// the By Key / By Name chord diagrams rather than shrinking away from them.
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
//
// A strip is now two columns, `matched` left and `then` right, each a stack of
// keyboards. `matched` was a wrapping horizontal row until this change; a
// wrapped row spends the shared-range alignment sideways and then loses it at
// the wrap, where the next keyboard starts back at the container's left edge
// under a keyboard drawn at a different offset. Two stacks put every keyboard
// in a column on one left edge, and put the phrase and what follows it side by
// side, so the question the surface exists to answer — this, then what? — is
// one glance across rather than a scroll down.

import { useId } from 'react'

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

// No scaling down: a white key here is the same 20×80 (and a black key the
// same 12×48) as an active key on the By Key and By Name tabs' KeyboardDiagram
// — SCALE stays in the arithmetic below only because keyLayout's constants
// are shared with the interactive input keyboard and capRect's offsets are
// written in that same raw grid, not because there is still a shrink to
// apply. An earlier loop shrank this to 14px/white-key to fit a capped result
// set on screen at once; asked to compare, the two sizes read as two
// unrelated conventions rather than the same keyboard shown twice, and there
// turned out to be enough width for the stacked layout to carry full size.
const ONSET_WHITE_KEY_WIDTH = WHITE_KEY_WIDTH + KEY_GAP
const SCALE = ONSET_WHITE_KEY_WIDTH / (WHITE_KEY_WIDTH + KEY_GAP)

const KEYBOARD_HEIGHT = WHITE_KEY_HEIGHT * SCALE
const LABEL_ROW_HEIGHT = 14
const LABEL_BAND = LABEL_ROW_HEIGHT * 2 + 4
// text-xs, the size KeyboardDiagram's own note-name labels render at.
const LABEL_FONT_SIZE = 12

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

// A sounding key is filled with the same glassy teal (or, for a lower-staff
// note, brown) gradient as an active key on the By Key and By Name tabs'
// KeyboardDiagram, so a note played back here and a chord tone highlighted
// there read as the same kind of mark rather than two unrelated conventions.
// Stops are KeyboardDiagram's own gradient colours; SVG has no
// backdrop-filter, so the "glassy" read comes from the sheen overlay and
// glow filter below instead of a blur.
const GRADIENT_STOPS: Record<'teal' | 'brown', readonly [string, string, string]> = {
  teal: ['rgba(31, 112, 95, 0.85)', 'rgba(31, 112, 95, 0.95)', 'rgba(20, 80, 70, 0.9)'],
  brown: ['rgba(154, 79, 27, 0.85)', 'rgba(154, 79, 27, 0.95)', 'rgba(108, 56, 19, 0.9)'],
}

// rounded-b's radius (.25rem, compiled in src/index.css) — KeyboardDiagram
// rounds only the bottom two corners of every key, active or not.
const KEY_RADIUS = 4

// KeyboardDiagram's own active-key box-shadow, read back from the rendered
// DOM (getComputedStyle), split into the two things SVG has no box-shadow
// primitive for: two 0/±1px "inset" lines below (a CSS inset shadow has no
// SVG equivalent, so these are drawn as literal 1px strokes), and two
// stacked, blurred offsets that become a pair of feDropShadow primitives per
// glow filter below (CSS blur radius ≈ 2×feDropShadow stdDeviation). White
// and black keys carry very slightly different opacities in KeyboardDiagram
// itself, so both are reproduced rather than averaged into one.
const GLOW = {
  white: { colourOpacity: 0.4, shadeOpacity: 0.2, insetTopOpacity: 0.4, insetBottomOpacity: 0.3 },
  black: { colourOpacity: 0.5, shadeOpacity: 0.3, insetTopOpacity: 0.3, insetBottomOpacity: 0.4 },
} as const

// A rect with square top corners and KeyboardDiagram's rounded-b bottom
// corners — the shape every key on this strip is drawn as, sounding or not,
// same as KeyboardDiagram applies `rounded-b` unconditionally.
function roundedBottomPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(KEY_RADIUS, width / 2, height)
  return [
    `M ${x} ${y}`,
    `H ${x + width}`,
    `V ${y + height - r}`,
    `A ${r} ${r} 0 0 1 ${x + width - r} ${y + height}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + height - r}`,
    'Z',
  ].join(' ')
}

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
// white key, inside the black key itself on a black one. A sounding key's
// fill now covers the whole key (see the white/black rect passes below), but
// the dot/bar staff marker and its label still anchor to this region — a mark
// centred higher up would sit under a black key drawn on top of a white
// neighbour, which is exactly the overlap this rect avoids.
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
  // useId, not a literal string: many of these mount on one page (a capped
  // result set can put ~70 up at once, see the file comment above), and every
  // instance needs its own <defs> ids — a literal would collide the moment a
  // second keyboard mounted, and url(#id) resolves document-wide, not per-svg.
  const uid = useId()
  const gradientId = { teal: `${uid}-teal`, brown: `${uid}-brown` } as const
  const sheenId = `${uid}-sheen`
  // One glow filter per (key colour × tone) combination — the blur/offset
  // pair is the same in all four, only the flood colour and the two
  // opacities differ (see GLOW above).
  const glowId = {
    whiteTeal: `${uid}-glow-white-teal`,
    whiteBrown: `${uid}-glow-white-brown`,
    blackTeal: `${uid}-glow-black-teal`,
    blackBrown: `${uid}-glow-black-brown`,
  } as const
  function glowFilterFor(isBlack: boolean, tone: 'teal' | 'brown'): string {
    if (isBlack) {
      return tone === 'teal' ? glowId.blackTeal : glowId.blackBrown
    }
    return tone === 'teal' ? glowId.whiteTeal : glowId.whiteBrown
  }

  const keys = keyLayout(range.minPitch, range.maxPitch)
  const width = keyboardWidth(keys) * SCALE
  const height = KEYBOARD_HEIGHT + LABEL_BAND

  const notes = soundingNotes(group)
  const byPitch = new Map(notes.map((note) => [note.pitch, note]))

  // Brown for a lower-staff note when staff is shown, teal for everything
  // else (upper-staff, or staff hidden) — same split SOUNDING_UPPER /
  // SOUNDING_LOWER made. Read by both the fill passes below and the marker
  // pass, so the two never disagree about which key got which colour.
  function toneFor(note: SoundingNote): 'teal' | 'brown' {
    if (!showStaff || note.staff === undefined) {
      return 'teal'
    }
    return note.staff === 1 ? 'teal' : 'brown'
  }

  // Two label rows, used only when neighbouring names would collide — see the
  // threshold this feeds, below.
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
      <defs>
        {(['teal', 'brown'] as const).map((tone) => {
          const [start, mid, end] = GRADIENT_STOPS[tone]
          return (
            <linearGradient key={tone} id={gradientId[tone]} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={start} />
              <stop offset="50%" stopColor={mid} />
              <stop offset="100%" stopColor={end} />
            </linearGradient>
          )
        })}
        {/* The diagonal sheen KeyboardDiagram layers over an active key with
            mix-blend-mode: overlay — the part of its "glassy" look that
            survives without a backdrop-filter, which SVG has no equivalent
            of. */}
        <linearGradient id={sheenId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.25)" />
          <stop offset="50%" stopColor="rgba(255, 255, 255, 0)" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0.12)" />
        </linearGradient>
        {(['white', 'black'] as const).flatMap((size) =>
          (['teal', 'brown'] as const).map((tone) => {
            const id = glowFilterFor(size === 'black', tone)
            const accent = tone === 'teal' ? SOUNDING : SOUNDING_LOWER
            const g = GLOW[size]
            return (
              <filter key={id} id={id} x="-100%" y="-60%" width="300%" height="220%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={accent} floodOpacity={g.colourOpacity} />
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity={g.shadeOpacity} />
              </filter>
            )
          }),
        )}
      </defs>

      {/* White keys first, sounding ones filled with the gradient above, so
          the black-key pass right after still paints correctly over the
          portion a black key visually overlaps — the same paint order
          KeyboardDiagram uses (white row, then black keys on top of it). */}
      {keys
        .filter((key) => !key.isBlack)
        .map((key) => {
          const note = byPitch.get(key.pitch)
          const tone = note ? toneFor(note) : null
          const x = key.x * SCALE
          const w = key.width * SCALE
          const h = WHITE_KEY_HEIGHT * SCALE
          return (
            <g key={key.pitch}>
              <path
                d={roundedBottomPath(x, 0, w, h)}
                fill={tone ? `url(#${gradientId[tone]})` : WHITE_KEY_FILL}
                stroke={tone ? (tone === 'brown' ? SOUNDING_LOWER : SOUNDING) : WHITE_KEY_EDGE}
                strokeWidth={tone ? 1 : 0.5}
                filter={tone ? `url(#${glowFilterFor(false, tone)})` : undefined}
              />
              {/* KeyboardDiagram's inset highlight/shadow — the two 0/±1px,
                  unblurred box-shadow layers a filter can't express. Rects,
                  not <line>: the staff-off check counts every <circle> and
                  <line> in a keyboard as a staff marker, and a bevel edge is
                  neither — it is on every sounding key regardless of the
                  staff toggle. */}
              {tone ? (
                <>
                  <rect x={x} y={0} width={w} height={1} fill="#ffffff" fillOpacity={GLOW.white.insetTopOpacity} />
                  <rect
                    x={x + KEY_RADIUS}
                    y={h - 1}
                    width={w - KEY_RADIUS * 2}
                    height={1}
                    fill="#000000"
                    fillOpacity={GLOW.white.insetBottomOpacity}
                  />
                </>
              ) : null}
            </g>
          )
        })}

      {keys
        .filter((key) => key.isBlack)
        .map((key) => {
          const note = byPitch.get(key.pitch)
          const tone = note ? toneFor(note) : null
          const x = key.x * SCALE
          const w = key.width * SCALE
          const h = BLACK_KEY_HEIGHT * SCALE
          return (
            <g key={key.pitch}>
              <path
                d={roundedBottomPath(x, 0, w, h)}
                fill={tone ? `url(#${gradientId[tone]})` : BLACK_KEY_FILL}
                stroke={tone ? (tone === 'brown' ? SOUNDING_LOWER : SOUNDING) : 'none'}
                strokeWidth={tone ? 1 : 0}
                filter={tone ? `url(#${glowFilterFor(true, tone)})` : undefined}
              />
              {tone ? (
                <>
                  <rect x={x} y={0} width={w} height={1} fill="#ffffff" fillOpacity={GLOW.black.insetTopOpacity} />
                  <rect
                    x={x + KEY_RADIUS}
                    y={h - 1}
                    width={w - KEY_RADIUS * 2}
                    height={1}
                    fill="#000000"
                    fillOpacity={GLOW.black.insetBottomOpacity}
                  />
                </>
              ) : null}
            </g>
          )
        })}

      {keys.map((key) => {
        const note = byPitch.get(key.pitch)
        if (!note) {
          return null
        }

        const cap = capRect(key)
        const centreX = cap.x + cap.width / 2
        const centreY = cap.y + cap.height / 2
        const marker = showStaff && note.staff !== undefined ? note.staff : undefined
        const keyHeight = (key.isBlack ? BLACK_KEY_HEIGHT : WHITE_KEY_HEIGHT) * SCALE

        // Threshold scales with LABEL_FONT_SIZE, not a size this file used to
        // be: a name is roughly LABEL_FONT_SIZE px wide per character (see
        // halfName below), and two three-character names on adjacent white
        // keys collide below about 2.5 characters' worth of gap.
        const row =
          centreX - lastLabelX < LABEL_FONT_SIZE * 2.5 && lastLabelRow === 1 ? 2 : 1
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
          // A <rect>, not the rounded-bottom <path> the key passes above use:
          // e2e locates this element via `role=img .locator('rect')` to read
          // a sounding key's x position back out, and swapping the element
          // type would silently break that without changing anything a
          // reader could see (the sheen is a subtle blend-mode overlay; its
          // own corners being square rather than rounded is not visible).
          <g key={key.pitch} role="img" aria-label={noteName(note, showStaff)}>
            <rect
              x={key.x * SCALE}
              y={0}
              width={key.width * SCALE}
              height={keyHeight}
              rx={1}
              fill={`url(#${sheenId})`}
              style={{ mixBlendMode: 'overlay' }}
            />
            {/* The staff distinction never rests on hue: an upper-staff note
                carries a dot and a lower-staff note a bar, so the two stay
                tellable apart in greyscale and under any colour-vision
                deficiency. Hue is the redundant channel here, not the
                carrier. */}
            {marker === 1 ? (
              <circle cx={centreX} cy={centreY} r={Math.min(5, cap.width / 2 - 1)} fill={MARKER} />
            ) : null}
            {marker === 2 ? (
              <line
                x1={centreX - Math.min(6, cap.width / 2 - 1)}
                x2={centreX + Math.min(6, cap.width / 2 - 1)}
                y1={centreY}
                y2={centreY}
                stroke={MARKER}
                strokeWidth={3.6}
                strokeLinecap="round"
              />
            ) : null}
            {/* text-xs font-semibold, same as KeyboardDiagram's active-key
                label — bold, but in the ordinary foreground colour, not the
                key's accent. KeyboardDiagram's own source sets
                `text-[#1f705f]` on that label, but that class is an
                arbitrary-value utility this project's precompiled
                src/index.css never generated (see the styling-constraint
                note in CLAUDE.md), so it renders as dead weight and the
                label is left in plain currentColor by the cascade — a
                fill of currentColor here reproduces the real rendered
                result, not the source's unrealised intent. */}
            <text
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              fontSize={LABEL_FONT_SIZE}
              fontWeight={600}
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
        {/* Matched stacks too, for the same reason `then` does: every onset
            here is drawn to the same shared window, so a column makes a pitch
            that recurs across onsets land at the same x on every row, and the
            phrase reads as a contour down the page. It also puts matched and
            following side by side rather than one above the other, which is
            what lets the two be read against each other. */}
        <div className="onset-strip-onsets">
          {occurrence.matchedGroups.map((group, position) => (
            <div className="onset-strip-row" key={`matched-${position}`}>
              <OnsetKeyboard group={group} range={range} showStaff={showStaff} />
              <span className="onset-strip-row-label text-muted-foreground text-xs">
                {formatOnsetLabel(group)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="onset-strip-section" role="group" aria-label="Following onsets">
        <span className="text-muted-foreground text-xs">then</span>
        {occurrence.followingGroups.length === 0 ? (
          <span className="text-xs">end of movement</span>
        ) : (
          // Stacked, not a row (Loop 015): every row is drawn to `range`, the
          // same shared window as the matched onsets beside it, so a pitch
          // recurring across rows lands at the same x in each — that
          // alignment is what turns a column of keyboards into a readable
          // contour instead of just a saving of width.
          <div className="onset-strip-onsets">
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
