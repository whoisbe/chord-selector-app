const SHARP_NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

export function pitchToLabel(pitch: number): string {
  if (!Number.isInteger(pitch) || pitch < 0 || pitch > 127) {
    throw new RangeError('MIDI pitch must be an integer from 0 through 127')
  }

  const noteName = SHARP_NOTE_NAMES[pitch % 12]
  const octave = Math.floor(pitch / 12) - 1

  return `${noteName}${octave}`
}
