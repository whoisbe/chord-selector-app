// Pure geometry for the phrase keyboard: pitch range in, per-key rectangles
// out. Nothing here knows how those rectangles get drawn, so both rows of the
// two-row surface can share one layout and align by construction rather than
// by eye (loop 006, check 7).

export type KeyGeometry = {
  pitch: number
  // Left edge in px, relative to the leftmost key in the range.
  x: number
  width: number
  isBlack: boolean
}

// Sizing is taken from the app's existing keyboard so the phrase surface reads
// as native: 20px white keys separated by a 1px gap, 21px per white step.
export const WHITE_KEY_WIDTH = 20
export const KEY_GAP = 1
export const BLACK_KEY_WIDTH = 12
export const WHITE_KEY_HEIGHT = 80
export const BLACK_KEY_HEIGHT = 48

const WHITE_PITCH_CLASSES: ReadonlySet<number> = new Set([0, 2, 4, 5, 7, 9, 11])
const BLACK_PITCH_CLASSES: ReadonlySet<number> = new Set([1, 3, 6, 8, 10])

function pitchClass(pitch: number): number {
  return ((pitch % 12) + 12) % 12
}

export function isBlackKey(pitch: number): boolean {
  return BLACK_PITCH_CLASSES.has(pitchClass(pitch))
}

export function isWhiteKey(pitch: number): boolean {
  return WHITE_PITCH_CLASSES.has(pitchClass(pitch))
}

// Every C is an octave landmark. The surface always labels these.
export function isOctaveLandmark(pitch: number): boolean {
  return pitchClass(pitch) === 0
}

export function keyLayout(minPitch: number, maxPitch: number): KeyGeometry[] {
  if (!Number.isInteger(minPitch) || !Number.isInteger(maxPitch)) {
    throw new RangeError('keyLayout needs integer MIDI pitches')
  }
  if (maxPitch < minPitch) {
    throw new RangeError('keyLayout needs maxPitch to be at least minPitch')
  }

  // Pass 1 — white keys carry the ruler. Consecutive white keys sit exactly
  // WHITE_KEY_WIDTH + KEY_GAP apart, so white x increases strictly with pitch.
  const whiteX = new Map<number, number>()
  let whiteIndex = 0
  for (let pitch = minPitch; pitch <= maxPitch; pitch += 1) {
    if (!isBlackKey(pitch)) {
      whiteX.set(pitch, whiteIndex * (WHITE_KEY_WIDTH + KEY_GAP))
      whiteIndex += 1
    }
  }

  // Pass 2 — a black key is centred on the boundary between the white keys
  // either side of it. Every black pitch class has a white neighbour at both
  // pitch - 1 and pitch + 1, so either one alone fixes the boundary; that is
  // what keeps a range that starts or ends on a black key well defined.
  const keys: KeyGeometry[] = []
  for (let pitch = minPitch; pitch <= maxPitch; pitch += 1) {
    if (!isBlackKey(pitch)) {
      keys.push({
        pitch,
        x: whiteX.get(pitch) ?? 0,
        width: WHITE_KEY_WIDTH,
        isBlack: false,
      })
      continue
    }

    const whiteBelow = whiteX.get(pitch - 1)
    const whiteAbove = whiteX.get(pitch + 1)
    const boundary =
      whiteBelow !== undefined
        ? whiteBelow + WHITE_KEY_WIDTH + KEY_GAP / 2
        : whiteAbove !== undefined
          ? whiteAbove - KEY_GAP / 2
          : WHITE_KEY_WIDTH + KEY_GAP / 2

    keys.push({
      pitch,
      x: boundary - BLACK_KEY_WIDTH / 2,
      width: BLACK_KEY_WIDTH,
      isBlack: true,
    })
  }

  // A range opening on a black key would otherwise start at a negative x.
  // Normalising keeps the left edge at 0 while staying a pure function of the
  // range, so two calls with the same range still return identical output.
  const leftmost = Math.min(...keys.map((key) => key.x))
  if (leftmost === 0) {
    return keys
  }

  return keys.map((key) => ({ ...key, x: key.x - leftmost }))
}

export function keyboardWidth(keys: readonly KeyGeometry[]): number {
  return keys.reduce((widest, key) => Math.max(widest, key.x + key.width), 0)
}
