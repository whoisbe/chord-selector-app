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
  return {
    measure: group.measure,
    beat: group.beat,
    hand: group.hand,
    notes: normalizeNotes(group.notes),
  }
}

export function findPhraseMatches(
  piece: readonly NoteGroup[],
  query: PhraseQuery,
): PhraseMatch[] {
  if (query.groups.length === 0 || query.groups.some((group) => group.notes.length === 0)) {
    return []
  }

  const queryNotes = query.groups.map((group) => normalizeNotes(group.notes))
  const handGroups = piece.filter((group) => group.hand === query.hand)
  const matches: PhraseMatch[] = []

  for (let start = 0; start <= handGroups.length - queryNotes.length; start += 1) {
    const isMatch = queryNotes.every((notes, offset) =>
      notesAreEqual(notes, normalizeNotes(handGroups[start + offset].notes)),
    )

    if (!isMatch) {
      continue
    }

    const firstGroup = handGroups[start]
    const matchEnd = start + queryNotes.length

    matches.push({
      measure: firstGroup.measure,
      beat: firstGroup.beat,
      matchedGroups: handGroups.slice(start, matchEnd).map(copyGroup),
      followingGroups: handGroups.slice(matchEnd, matchEnd + 3).map(copyGroup),
    })
  }

  return matches
}
