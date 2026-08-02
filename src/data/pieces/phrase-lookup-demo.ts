import type { NoteGroup } from '../../lib/music/types'

export const PHRASE_LOOKUP_DEMO_NAME = 'Phrase Lookup development fixture'

export const PHRASE_LOOKUP_DEMO_NOTICE =
  'Development fixture only — these events are not authoritative Moonlight Sonata score data.'

export const phraseLookupDemo: NoteGroup[] = [
  { measure: 11, beat: 3, hand: 'right', notes: [64, 68] },
  { measure: 11, beat: 3, hand: 'left', notes: [40, 47] },
  { measure: 12, beat: 1, hand: 'right', notes: [78, 66] },
  { measure: 12, beat: 1, hand: 'left', notes: [42, 49] },
  { measure: 12, beat: 2, hand: 'right', notes: [73] },
  { measure: 12, beat: 3, hand: 'right', notes: [76] },
  { measure: 12, beat: 4, hand: 'right', notes: [73, 76] },
  { measure: 13, beat: 1, hand: 'right', notes: [71] },
  { measure: 13, beat: 2, hand: 'right', notes: [68] },
  { measure: 13, beat: 1, hand: 'left', notes: [45, 52] },
  { measure: 18, beat: 1, hand: 'right', notes: [66, 78] },
  { measure: 18, beat: 2, hand: 'right', notes: [73] },
  { measure: 18, beat: 3, hand: 'right', notes: [76, 79] },
  { measure: 20, beat: 1, hand: 'left', notes: [66, 78] },
  { measure: 20, beat: 2, hand: 'left', notes: [73] },
  { measure: 20, beat: 3, hand: 'left', notes: [76] },
  { measure: 20, beat: 4, hand: 'left', notes: [61, 68] },
  { measure: 26, beat: 4, hand: 'right', notes: [66, 78] },
  { measure: 27, beat: 1, hand: 'right', notes: [66, 78] },
  { measure: 27, beat: 1, hand: 'left', notes: [42, 49] },
  { measure: 27, beat: 2, hand: 'right', notes: [73] },
  { measure: 27, beat: 3, hand: 'right', notes: [76] },
  { measure: 27, beat: 4, hand: 'right', notes: [75] },
  { measure: 28, beat: 1, hand: 'right', notes: [71, 76] },
  { measure: 28, beat: 2, hand: 'right', notes: [68] },
  { measure: 28, beat: 1, hand: 'left', notes: [40, 47] },
]
