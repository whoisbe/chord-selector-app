// The capture seam: "some input produced this set of pitches at this step".
//
// Pointer input on the two-row keyboard is one source. A later MIDI adapter is
// another, and it must be able to feed the same seam without the surface
// changing — so the toggle rule lives here as pure data-in/data-out rather
// than inside a click handler. Loop 006 does not build that adapter.

export type StaffRow = 1 | 2

export type PitchCaptureSource = 'pointer' | 'midi'

export type PitchCapture = {
  source: PitchCaptureSource
  // Which row the input came from. Display and highlighting facet only
  // (ADR 0002) — it never reaches the query. A hardware adapter picks a row
  // for the pitches it reports; it does not partition the search.
  staff: StaffRow
  pitches: readonly number[]
}

// A key chosen in the current, not-yet-committed group. The same pitch may be
// selected on both rows — that is the cross-staff octave gesture, and it
// collapses to a single pitch in the query.
export type SelectedKey = {
  pitch: number
  staff: StaffRow
}

function keyOf(selected: SelectedKey): string {
  return `${selected.pitch}:${selected.staff}`
}

function bySortOrder(left: SelectedKey, right: SelectedKey): number {
  return left.pitch - right.pitch || left.staff - right.staff
}

// Toggle semantics: capturing a key that is already selected removes it.
export function applyCapture(
  selection: readonly SelectedKey[],
  capture: PitchCapture,
): SelectedKey[] {
  const next = new Map(selection.map((selected) => [keyOf(selected), selected] as const))

  for (const pitch of capture.pitches) {
    const candidate: SelectedKey = { pitch, staff: capture.staff }
    const identity = keyOf(candidate)
    if (next.has(identity)) {
      next.delete(identity)
    } else {
      next.set(identity, candidate)
    }
  }

  return Array.from(next.values()).sort(bySortOrder)
}

export function isSelected(
  selection: readonly SelectedKey[],
  pitch: number,
  staff: StaffRow,
): boolean {
  return selection.some((selected) => selected.pitch === pitch && selected.staff === staff)
}

// The query facet: rows collapse away entirely, leaving a deduplicated,
// order-independent set of pitches for one onset.
export function selectionPitches(selection: readonly SelectedKey[]): number[] {
  return Array.from(new Set(selection.map((selected) => selected.pitch))).sort(
    (left, right) => left - right,
  )
}
