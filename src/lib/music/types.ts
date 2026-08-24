export type Hand = 'left' | 'right'

export type NoteGroup = {
  measure: number
  beat: number
  // Integer tick position within the measure. Present for MusicXML-ingested
  // pieces; absent for hand-authored fixtures. Never compare beat directly —
  // it is a float derived from tick and exists for display only.
  tick?: number
  // Legacy per-group hand metadata (Loop 001 fixture). Display/ranking facet
  // only — see ADR 0002.
  hand?: Hand
  // Per-note staff origin, parallel to `notes`. Display/ranking facet only —
  // never a search filter. See ADR 0002.
  staves?: number[]
  notes: number[]
}

export type PhraseQuery = {
  // Optional legacy filter for hand-authored fixtures. See ADR 0002 — staff
  // (and, before it, hand) is not a search filter for real pieces; the
  // merged onset stream is searched as-is when this is omitted.
  hand?: Hand
  groups: Array<{ notes: number[] }>
}

export type PhraseMatch = {
  measure: number
  beat: number
  matchedGroups: NoteGroup[]
  followingGroups: NoteGroup[]
}
