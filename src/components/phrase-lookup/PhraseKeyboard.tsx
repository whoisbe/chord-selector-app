// The spatial input surface: two full-range rows of real, focusable keys.
//
// This is a deliberate sibling of KeyboardDiagram, not a generalisation of it.
// That component is a fixed-range, display-only, two-state chord diagram in
// production on two other tabs; this one is a variable-range, interactive,
// three-state instrument. Sharing them would put both at risk. The duplication
// is accepted — see the Loop 006 handoff, section 3.

import {
  BLACK_KEY_HEIGHT,
  WHITE_KEY_HEIGHT,
  isOctaveLandmark,
  keyboardWidth,
  type KeyGeometry,
} from '../../lib/music/keyboard';
import { isSelected, type PitchCapture, type SelectedKey, type StaffRow } from '../../lib/music/capture';
import type { PitchRange } from '../../lib/music/continuations';
import { pitchToLabel } from '../../lib/music/pitch-label';

export type KeyState = 'entered' | 'available' | 'unavailable';

// Why a key is unavailable, distinguished in the accessible name only (Loop
// 011, Section 6). The two constraints compose but read as one dimmed
// treatment visually — a sighted user just needs "don't press this"; a
// screen-reader user gets the specific reason for free, at no styling cost.
// 'sequence' — Loop 006's original reason: this pitch cannot follow the
// committed phrase at all, regardless of what else is selected.
// 'cooccurrence' — Loop 011's new reason: this pitch can follow the phrase,
// but never together with the pitch(es) already chosen for this group.
export type UnavailableReason = 'sequence' | 'cooccurrence';

export type KeyboardRow = {
  staff: StaffRow;
  // "Upper row" / "Lower row" — part of every key's accessible name.
  title: string;
  caption: string;
  // The extent this staff actually reaches in the piece. Keys outside it are
  // dimmed but still rendered and still operable: both rows carry the full
  // range so a given pitch sits at the same x on both.
  extent: PitchRange | undefined;
};

type PhraseKeyboardProps = {
  // One layout, shared by both rows. Alignment is structural, not visual.
  keys: readonly KeyGeometry[];
  rows: readonly KeyboardRow[];
  selection: readonly SelectedKey[];
  availableByStaff: ReadonlyMap<StaffRow, ReadonlySet<number>>;
  // Pitches that pass the sequence constraint but are dimmed solely because
  // they never co-occur with the current selection. Empty for every staff
  // while the current group is empty — see UnavailableReason.
  blockedByCoOccurrenceByStaff: ReadonlyMap<StaffRow, ReadonlySet<number>>;
  onCapture: (capture: PitchCapture) => void;
};

const ACCENT = '#1f705f';
const ACCENT_EDGE = '#16544a';

function keyStyle(key: KeyGeometry, state: KeyState, inExtent: boolean) {
  const base = {
    left: `${key.x}px`,
    width: `${key.width}px`,
    height: `${key.isBlack ? BLACK_KEY_HEIGHT : WHITE_KEY_HEIGHT}px`,
    opacity: inExtent ? 1 : 0.35,
  };

  if (state === 'entered') {
    return {
      ...base,
      background: ACCENT,
      border: `1px solid ${ACCENT_EDGE}`,
      color: '#ffffff',
      boxShadow: '0 2px 6px rgba(31, 112, 95, 0.45)',
    };
  }

  if (key.isBlack) {
    return {
      ...base,
      background: state === 'available' ? '#0f172a' : '#18181b',
      border: state === 'available' ? `2px solid ${ACCENT}` : '1px solid #27272a',
      color: '#ffffff',
      opacity: state === 'available' ? base.opacity : base.opacity * 0.55,
    };
  }

  return {
    ...base,
    background: '#ffffff',
    border: state === 'available' ? `2px solid ${ACCENT}` : '1px solid #e4e4e7',
    color: state === 'available' ? ACCENT : '#a1a1aa',
    opacity: state === 'available' ? base.opacity : base.opacity * 0.7,
  };
}

function accessibleName(
  pitch: number,
  row: KeyboardRow,
  state: KeyState,
  inExtent: boolean,
  unavailableReason: UnavailableReason | undefined,
): string {
  const stateWord =
    state === 'entered'
      ? 'entered'
      : state === 'available'
        ? 'available next'
        : unavailableReason === 'cooccurrence'
          ? 'does not occur together with the current selection'
          : 'not available next';
  const extentWord = inExtent ? '' : `, outside staff ${row.staff} range`;

  return `${pitchToLabel(pitch)}, ${row.title}, ${stateWord}${extentWord}`;
}

function KeyboardRowKeys({
  keys,
  row,
  selection,
  available,
  blockedByCoOccurrence,
  onCapture,
}: {
  keys: readonly KeyGeometry[];
  row: KeyboardRow;
  selection: readonly SelectedKey[];
  available: ReadonlySet<number>;
  blockedByCoOccurrence: ReadonlySet<number>;
  onCapture: (capture: PitchCapture) => void;
}) {
  const width = keyboardWidth(keys);

  return (
    <div
      className="relative"
      style={{ width: `${width}px`, height: `${WHITE_KEY_HEIGHT}px` }}
      role="group"
      aria-label={`${row.title} — staff ${row.staff}`}
    >
      {/* Rendered in pitch order so the focus order runs low to high, with
          black keys raised above their white neighbours. Every key is a real
          button: no pointer-events-none layer anywhere on this surface. */}
      {keys.map((key) => {
        const entered = isSelected(selection, key.pitch, row.staff);
        const state: KeyState = entered
          ? 'entered'
          : available.has(key.pitch)
            ? 'available'
            : 'unavailable';
        const inExtent = row.extent
          ? key.pitch >= row.extent.minPitch && key.pitch <= row.extent.maxPitch
          : true;
        const unavailableReason: UnavailableReason | undefined =
          state === 'unavailable'
            ? blockedByCoOccurrence.has(key.pitch)
              ? 'cooccurrence'
              : 'sequence'
            : undefined;
        const name = accessibleName(key.pitch, row, state, inExtent, unavailableReason);
        const showLabel = !key.isBlack && (isOctaveLandmark(key.pitch) || entered);
        // Loop 006 kept every key operable — including sequence-blocked ones
        // — so dimming stayed informative rather than a hard block, and the
        // accessibility tree stayed at full size (no `disabled`). Loop 011
        // narrows that only for the dead end it introduces: a co-occurrence
        // block means no group containing it can ever match, so activating
        // it is a no-op rather than a click that silently builds garbage.
        // The button stays focusable and its accessible name stays truthful
        // either way.
        const isDeadEnd = unavailableReason === 'cooccurrence';

        return (
          <button
            key={`${row.staff}-${key.pitch}`}
            type="button"
            aria-label={name}
            aria-pressed={entered}
            title={name}
            data-pitch={key.pitch}
            data-staff={row.staff}
            data-key-state={state}
            data-unavailable-reason={unavailableReason}
            onClick={() => {
              if (isDeadEnd) {
                return;
              }
              onCapture({ source: 'pointer', staff: row.staff, pitches: [key.pitch] });
            }}
            className="phrase-key"
            style={{ ...keyStyle(key, state, inExtent), zIndex: key.isBlack ? 20 : 10 }}
          >
            {showLabel ? (
              <span className="phrase-key-label">{pitchToLabel(key.pitch)}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function PhraseKeyboard({
  keys,
  rows,
  selection,
  availableByStaff,
  blockedByCoOccurrenceByStaff,
  onCapture,
}: PhraseKeyboardProps) {
  const emptySet: ReadonlySet<number> = new Set<number>();

  return (
    <div className="phrase-keyboard-scroll">
      <div className="flex flex-col gap-4" style={{ width: `${keyboardWidth(keys)}px` }}>
        {rows.map((row) => (
          <div key={row.staff} className="flex flex-col gap-1">
            {/* Headings sit above the keys, never beside them — anything to the
                left of a row would push it out of alignment with the other. */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{row.title}</span>
              <span className="text-muted-foreground text-xs">{row.caption}</span>
            </div>
            <KeyboardRowKeys
              keys={keys}
              row={row}
              selection={selection}
              available={availableByStaff.get(row.staff) ?? emptySet}
              blockedByCoOccurrence={blockedByCoOccurrenceByStaff.get(row.staff) ?? emptySet}
              onCapture={onCapture}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
