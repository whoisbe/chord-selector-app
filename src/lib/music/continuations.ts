// Corpus-constrained continuations: given a committed prefix of note groups,
// which pitches can extend it anywhere in the piece? The phrase surface
// highlights exactly those and dims everything else, so a misremembered note
// is prevented at entry instead of forgiven afterwards.
//
// Matching semantics are deliberately identical to findPhraseMatches —
// contiguous groups, exact group equality, exact register. This module reuses
// that module's normaliser rather than restating it, so the keys that light up
// can never disagree with the search that follows.
//
// Two constraints compose (Loop 011). The prefix narrows which *groups* can
// follow — the sequence constraint, unchanged since Loop 006. An optional
// currentSelection then narrows *within* those groups to the ones that
// actually contain every pitch already chosen for the group being assembled
// — the co-occurrence constraint. Without it, a user could pick keys one at a
// time that individually continue the phrase but together form a chord that
// occurs nowhere in the piece. Pitches already in currentSelection are
// excluded from the result — they are entered, not available.

import { normalizeNotes } from './phrase-search'
import type { NoteGroup, PhraseMatch } from './types'

export type PrefixGroup = { notes: readonly number[] }

export type StaffContinuation = {
  pitch: number
  // Staves this pitch occurs on in a continuation group. Display facet only
  // (ADR 0002) — it decides which row lights, never which events are searched.
  // Empty when the piece carries no per-note staff data, which the surface
  // reads as "light on both rows".
  staves: number[]
}

function groupsAreEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((note, index) => note === right[index])
}

// Indices of every group that immediately follows an occurrence of the prefix.
// An empty prefix is satisfied everywhere, so every group is a continuation —
// that is what makes the whole piece available before the first entry.
function continuationIndices(
  stream: readonly NoteGroup[],
  prefix: readonly PrefixGroup[],
): number[] {
  const prefixNotes = prefix.map((group) => normalizeNotes(group.notes))
  const indices: number[] = []

  for (let start = 0; start + prefixNotes.length < stream.length; start += 1) {
    const isMatch = prefixNotes.every((notes, offset) =>
      groupsAreEqual(notes, normalizeNotes(stream[start + offset].notes)),
    )

    if (isMatch) {
      indices.push(start + prefixNotes.length)
    }
  }

  return indices
}

function hasEmptyGroup(prefix: readonly PrefixGroup[]): boolean {
  return prefix.some((group) => group.notes.length === 0)
}

// The co-occurrence constraint: a continuation group can only extend the
// group currently being assembled if it contains every pitch already chosen
// for that group, at the same register. This is what stops a user from
// building a chord that exists nowhere in the piece — see Loop 011.
function groupContainsAll(groupNotes: readonly number[], required: readonly number[]): boolean {
  if (required.length === 0) {
    return true
  }

  const notes = new Set(groupNotes)
  return required.every((pitch) => notes.has(pitch))
}

export function possibleContinuations(
  stream: readonly NoteGroup[],
  prefix: readonly PrefixGroup[],
  currentSelection: readonly number[] = [],
): number[] {
  if (hasEmptyGroup(prefix)) {
    return []
  }

  const selected = new Set(currentSelection)
  const pitches = new Set<number>()
  for (const index of continuationIndices(stream, prefix)) {
    const group = stream[index]
    if (!groupContainsAll(group.notes, currentSelection)) {
      continue
    }

    for (const pitch of group.notes) {
      if (!selected.has(pitch)) {
        pitches.add(pitch)
      }
    }
  }

  return Array.from(pitches).sort((left, right) => left - right)
}

export function possibleContinuationsByStaff(
  stream: readonly NoteGroup[],
  prefix: readonly PrefixGroup[],
  currentSelection: readonly number[] = [],
): StaffContinuation[] {
  if (hasEmptyGroup(prefix)) {
    return []
  }

  const selected = new Set(currentSelection)
  const byPitch = new Map<number, Set<number>>()

  for (const index of continuationIndices(stream, prefix)) {
    const group = stream[index]
    if (!groupContainsAll(group.notes, currentSelection)) {
      continue
    }

    group.notes.forEach((pitch, position) => {
      if (selected.has(pitch)) {
        return
      }

      let staves = byPitch.get(pitch)
      if (!staves) {
        staves = new Set<number>()
        byPitch.set(pitch, staves)
      }

      const staff = group.staves?.[position]
      if (staff !== undefined) {
        staves.add(staff)
      }
    })
  }

  return Array.from(byPitch.entries())
    .sort(([left], [right]) => left - right)
    .map(([pitch, staves]) => ({
      pitch,
      staves: Array.from(staves).sort((left, right) => left - right),
    }))
}

export function occurrenceCount(
  stream: readonly NoteGroup[],
  prefix: readonly PrefixGroup[],
): number {
  if (prefix.length === 0 || hasEmptyGroup(prefix)) {
    return 0
  }

  const prefixNotes = prefix.map((group) => normalizeNotes(group.notes))
  let count = 0

  for (let start = 0; start + prefixNotes.length <= stream.length; start += 1) {
    const isMatch = prefixNotes.every((notes, offset) =>
      groupsAreEqual(notes, normalizeNotes(stream[start + offset].notes)),
    )
    if (isMatch) {
      count += 1
    }
  }

  return count
}

// Loop 012: how many onsets in the whole piece contain every pitch in a
// candidate selection — irrespective of the committed prefix. This is the
// convergence signal shown while a group is still being assembled: it tells
// the user whether the chord they are building actually exists anywhere in
// the piece, well before they commit it and run it through the sequence
// constraint. An empty selection is vacuously contained everywhere, so it
// returns the full onset count.
export function containmentCount(
  stream: readonly NoteGroup[],
  selection: readonly number[],
): number {
  if (selection.length === 0) {
    return stream.length
  }

  let count = 0
  for (const group of stream) {
    if (groupContainsAll(group.notes, selection)) {
      count += 1
    }
  }

  return count
}

// Loop 014: the onsets counted by containmentCount, with the few onsets that
// follow each of them — the material behind progressive disclosure. Once the
// count is small enough to draw, the user should see *where* those places are
// and what comes next, not just how many there are.
//
// The shape matches PhraseMatch so one renderer can draw both this and a
// committed-phrase result. `matchedGroups` here is always the single
// containing onset: this is containment of a selection still being assembled,
// not a phrase match, and nothing about the committed prefix is applied.
export function containingOccurrences(
  stream: readonly NoteGroup[],
  selection: readonly number[],
  followingCount = 3,
): PhraseMatch[] {
  if (selection.length === 0) {
    return []
  }

  const occurrences: PhraseMatch[] = []

  stream.forEach((group, index) => {
    if (!groupContainsAll(group.notes, selection)) {
      return
    }

    occurrences.push({
      measure: group.measure,
      beat: group.beat,
      matchedGroups: [group],
      followingGroups: stream.slice(index + 1, index + 1 + followingCount),
    })
  })

  return occurrences
}

export type PitchRange = { minPitch: number; maxPitch: number }

// The keyboard's rendered range, read off the piece rather than hardcoded.
export function streamPitchRange(stream: readonly NoteGroup[]): PitchRange | null {
  let minPitch = Number.POSITIVE_INFINITY
  let maxPitch = Number.NEGATIVE_INFINITY

  for (const group of stream) {
    for (const pitch of group.notes) {
      minPitch = Math.min(minPitch, pitch)
      maxPitch = Math.max(maxPitch, pitch)
    }
  }

  return Number.isFinite(minPitch) ? { minPitch, maxPitch } : null
}

// Per-staff extents, used to dim the part of a row its own staff never reaches.
// Both rows still render the full range — trimming would break x-alignment.
export function staffPitchRanges(stream: readonly NoteGroup[]): Map<number, PitchRange> {
  const ranges = new Map<number, PitchRange>()

  for (const group of stream) {
    group.notes.forEach((pitch, position) => {
      const staff = group.staves?.[position]
      if (staff === undefined) {
        return
      }

      const current = ranges.get(staff)
      ranges.set(
        staff,
        current
          ? { minPitch: Math.min(current.minPitch, pitch), maxPitch: Math.max(current.maxPitch, pitch) }
          : { minPitch: pitch, maxPitch: pitch },
      )
    })
  }

  return ranges
}
