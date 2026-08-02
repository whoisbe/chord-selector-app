export type Hand = 'left' | 'right'

export type NoteGroup = {
  measure: number
  beat: number
  hand: Hand
  notes: number[]
}

export type PhraseQuery = {
  hand: Hand
  groups: Array<{ notes: number[] }>
}

export type PhraseMatch = {
  measure: number
  beat: number
  matchedGroups: NoteGroup[]
  followingGroups: NoteGroup[]
}
