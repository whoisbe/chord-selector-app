import type { NoteGroup, PhraseMatch, PhraseQuery } from './types'

export function normalizeNotes(notes: readonly number[]): number[] {
  return Array.from(new Set(notes)).sort((left, right) => left - right)
}

function notesAreEqual(left: readonly number[], right: readonly number[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  return left.every((note, index) => note === right[index])
}

function copyGroup(group: NoteGroup): NoteGroup {
  return { ...group, notes: normalizeNotes(group.notes) }
}

export function findPhraseMatches(
  piece: readonly NoteGroup[],
  query: PhraseQuery,
): PhraseMatch[] {
  if (query.groups.length === 0 || query.groups.some((group) => group.notes.length === 0)) {
    return []
  }

  const queryNotes = query.groups.map((group) => normalizeNotes(group.notes))
  // ADR 0002: hand/staff is not a search filter for the merged onset stream.
  // `query.hand` is honoured only when present, for Loop 001's hand-authored
  // fixture — real pieces search the merged stream as given.
  const searchGroups = query.hand
    ? piece.filter((group) => group.hand === query.hand)
    : piece
  const matches: PhraseMatch[] = []

  for (let start = 0; start <= searchGroups.length - queryNotes.length; start += 1) {
    const isMatch = queryNotes.every((notes, offset) =>
      notesAreEqual(notes, normalizeNotes(searchGroups[start + offset].notes)),
    )

    if (!isMatch) {
      continue
    }

    const firstGroup = searchGroups[start]
    const matchEnd = start + queryNotes.length

    matches.push({
      measure: firstGroup.measure,
      beat: firstGroup.beat,
      matchedGroups: searchGroups.slice(start, matchEnd).map(copyGroup),
      followingGroups: searchGroups.slice(matchEnd, matchEnd + 3).map(copyGroup),
    })
  }

  return matches
}
