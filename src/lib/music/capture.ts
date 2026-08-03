// The capture seam: "some input produced this set of pitches at this step".
//
// Pointer input on the single keyboard is one source. A later MIDI adapter is
// another, and it must be able to feed the same seam without the surface
// changing — so the toggle rule lives here as pure data-in/data-out rather
// than inside a click handler.
//
// Loop 012 removed staff from this module entirely. There is one keyboard now,
// so there is no row for a capture to originate from, and a selection is just
// a set of pitches.

export type PitchCaptureSource = 'pointer' | 'midi'

export type PitchCapture = {
  source: PitchCaptureSource
  pitches: readonly number[]
}

// A pitch chosen in the current, not-yet-committed group.
export type SelectedKey = number

// Toggle semantics: capturing a pitch that is already selected removes it.
export function applyCapture(
  selection: readonly SelectedKey[],
  capture: PitchCapture,
): SelectedKey[] {
  const next = new Set(selection)

  for (const pitch of capture.pitches) {
    if (next.has(pitch)) {
      next.delete(pitch)
    } else {
      next.add(pitch)
    }
  }

  return Array.from(next).sort((left, right) => left - right)
}

export function isSelected(selection: readonly SelectedKey[], pitch: number): boolean {
  return selection.includes(pitch)
}

// The query facet: a deduplicated, order-independent set of pitches for one
// onset. Selections built through applyCapture are already deduplicated, but
// this stays defensive so any selection — not just one built through the
// toggle — normalises the same way.
export function selectionPitches(selection: readonly SelectedKey[]): number[] {
  return Array.from(new Set(selection)).sort((left, right) => left - right)
}
