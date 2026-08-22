// Loop 019 — the public surface of runtime score reading.
//
// `readScoreFromMxl(bytes, parseXml)` is the whole point of the loop: bytes of
// a MuseScore download in, a validated piece or an actionable refusal out. The
// rest is exported because the ingest script and the unit suite need the tick
// walk itself, and because a hand-rolled zip reader is worth testing directly.

export { buildMergedGroups, buildStaffGroups, parseRawNotes } from './parse-score.ts'
export type { RawNote, RawParse } from './parse-score.ts'
export { readScoreFromDocument, readScoreFromMxl } from './read-score.ts'
export type { XmlParser } from './read-score.ts'
export { crc32, readZipEntries } from './zip.ts'
export type { ZipEntries, ZipReadResult } from './zip.ts'
export type {
  Piece,
  PieceWarning,
  PieceWarningCode,
  Refusal,
  RefusalCode,
  ScoreReadResult,
} from './types.ts'
