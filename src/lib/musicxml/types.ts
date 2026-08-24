// Loop 019 — the vocabulary of reading a score at runtime.
//
// `src/lib/music/` holds pure functions over `NoteGroup[]`. This directory
// holds the messy business of turning a MuseScore `.mxl` download into one.
// The boundary is deliberate: Loop 014's purity check on `src/lib/music/`
// stays exactly as strict as it was, and nothing here weakens it.
//
// Imports inside this directory carry explicit `.ts` extensions because
// `scripts/ingest-musicxml.mjs` imports the tick walk directly and Node
// resolves the extension it is given. `allowImportingTsExtensions` is already
// on in tsconfig.json, so tsc and Vite both accept them.

import type { NoteGroup } from '../music/types.ts'

// Why a file was refused. The code is for a caller that wants to branch —
// Loop 020's error surface — and the message is for the human holding the
// file. Every message names what was wrong *and* what was expected, because
// "invalid file" tells nobody what to do next.
export type RefusalCode =
  | 'not-a-zip'
  | 'unreadable-zip'
  | 'missing-container'
  | 'no-rootfile'
  | 'missing-rootfile-entry'
  | 'unparsable-xml'
  | 'not-score-partwise'
  | 'part-count'
  | 'no-divisions'
  | 'no-pitched-notes'

export type Refusal = {
  code: RefusalCode
  message: string
}

// A caveat that does not stop the piece loading. It rides on the piece rather
// than beside it: a piece handed to a component keeps its caveat, and Loop 020
// renders `piece.warnings` without having to thread a second value through.
export type PieceWarningCode = 'repeats-not-expanded'

export type PieceWarning = {
  code: PieceWarningCode
  message: string
}

export type Piece = {
  // `<work-title>`, else `<movement-title>`, else null. The committed
  // Moonlight artifact keeps its own hand-written name; this is what a piece
  // read at runtime can honestly say about itself.
  title: string | null
  // The merged onset stream — the same shape every loop since 004 searches.
  stream: NoteGroup[]
  // How many `<measure>` elements the part carried, pickup included.
  measureCount: number
  // The number MusicXML gave the pickup measure, or null when there is none.
  // MuseScore writes `implicit="yes"` and numbers it 0.
  pickupMeasure: number | null
  // `<divisions>` in effect at the end of the walk — ticks per quarter note.
  divisions: number
  pitchedNoteCount: number
  // Notes that carried no `<staff>` and were placed on staff 1. Both committed
  // files report 0; anything higher means the staff facet is guesswork.
  inferredStaffCount: number
  warnings: PieceWarning[]
}

// A discriminated union rather than an exception. There are two callers: the
// ingest script, which wants to print a reason and exit, and Loop 020's UI,
// which wants to render one. Both want the refusal as a value they can hold,
// not as control flow they have to catch, and `ok` narrows without a type
// guard at either call site.
export type ScoreReadResult = { ok: true; piece: Piece } | { ok: false; refusal: Refusal }
