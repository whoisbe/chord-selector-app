// Loop 019 — the function the app can call on the bytes of a MuseScore
// download, and the refusals it hands back when it cannot.
//
// Validation's job here is to say no in a way a human can act on. It is not
// to widen what the app accepts: the human scoped this deliberately to a
// MuseScore `.mxl`, so there is no accommodation code for Finale, Sibelius or
// optical recognition output. What there is, for every refusal, is a message
// naming what was wrong and what was expected.
//
// Nothing in this file reaches for a global. The caller injects the XML
// parser — `DOMParser` in the browser, `jsdom` in the script and the tests —
// which is what keeps `readScoreFromDocument` testable without a browser and
// keeps the parse itself free of any environment assumption.

import { buildMergedGroups, parseRawNotes } from './parse-score.ts'
import type {
  Piece,
  PieceWarning,
  Refusal,
  RefusalCode,
  ScoreReadResult,
} from './types.ts'
import { readZipEntries } from './zip.ts'

const CONTAINER_PATH = 'META-INF/container.xml'

// Turns XML text into a parsed tree. A browser satisfies this with
// `new DOMParser().parseFromString(text, 'application/xml')`; Node satisfies
// it with jsdom. Neither is named here.
export type XmlParser = (xmlText: string) => Document

function refuse(code: RefusalCode, message: string): { ok: false; refusal: Refusal } {
  return { ok: false, refusal: { code, message } }
}

// DOMParser does not throw on malformed XML — it hands back a tree whose root
// is a `<parsererror>`. jsdom does the same. Detecting that is the only way to
// tell "this is not XML" from "this is XML I do not want".
function hasParseError(doc: Document): boolean {
  return doc.documentElement === null || doc.getElementsByTagName('parsererror').length > 0
}

function elementText(el: Element | null): string | null {
  const text = (el?.textContent ?? '').trim()
  return text === '' ? null : text
}

function readTitle(doc: Document): string | null {
  return (
    elementText(doc.querySelector('work > work-title')) ??
    elementText(doc.querySelector('movement-title'))
  )
}

// A first measure MusicXML marks `implicit="yes"` is a pickup. MuseScore
// numbers it 0 and draws it as an upbeat rather than as bar zero.
function readPickupMeasure(part: Element): number | null {
  const first = part.querySelector(':scope > measure')

  if (first === null || first.getAttribute('implicit') !== 'yes') {
    return null
  }

  const number = Number(first.getAttribute('number'))
  return Number.isFinite(number) ? number : null
}

function readWarnings(doc: Document): PieceWarning[] {
  const warnings: PieceWarning[] = []

  // Repeats are honoured as marks on the page, not as performance order.
  // Expanding them would renumber every measure and break the controls Loops
  // 016 and 017 built, so warning is what this app can honestly offer.
  if (doc.querySelector('repeat, ending') !== null) {
    warnings.push({
      code: 'repeats-not-expanded',
      message:
        'This score contains repeats. Occurrences and what follows them are read in written order, as the page is printed — not in performance order, so a phrase heard after a repeat may be listed at its written position instead.',
    })
  }

  return warnings
}

// Validates a parsed MusicXML tree and turns it into a piece, or refuses it.
export function readScoreFromDocument(doc: Document): ScoreReadResult {
  if (hasParseError(doc)) {
    return refuse(
      'unparsable-xml',
      'The score inside the archive is not well-formed XML. Expected the MusicXML file a MuseScore .mxl export contains.',
    )
  }

  const root = doc.documentElement
  const rootName = root.tagName

  if (rootName !== 'score-partwise') {
    const extra =
      rootName === 'score-timewise'
        ? ' score-timewise is legal MusicXML, but this app reads scores part by part and cannot read it. Re-export from MuseScore, which writes score-partwise.'
        : ''

    return refuse(
      'not-score-partwise',
      `The score's root element is <${rootName}>. Expected <score-partwise>.${extra}`,
    )
  }

  const parts = root.querySelectorAll(':scope > part')

  if (parts.length !== 1) {
    return refuse(
      'part-count',
      `This score has ${parts.length} <part> elements. Expected exactly 1 — a piano score with two staves in one part. Loop 018 found extra parts are silently discarded, so this app refuses them rather than searching half a score.`,
    )
  }

  const part = parts[0]
  const parsed = parseRawNotes(doc)

  if (parsed.divisions === null) {
    return refuse(
      'no-divisions',
      'This score declares no <divisions>. Expected an <attributes><divisions> element giving ticks per quarter note — without it every onset position is meaningless.',
    )
  }

  if (parsed.rawNotes.length === 0) {
    return refuse(
      'no-pitched-notes',
      `This score has no pitched notes across its ${parsed.measureCount} measures. Expected at least one — there is nothing to search for in a score of rests.`,
    )
  }

  const piece: Piece = {
    title: readTitle(doc),
    stream: buildMergedGroups(parsed.rawNotes),
    measureCount: parsed.measureCount,
    pickupMeasure: readPickupMeasure(part),
    divisions: parsed.divisions,
    pitchedNoteCount: parsed.pitchedNoteCount,
    inferredStaffCount: parsed.notesWithoutStaff,
    warnings: readWarnings(doc),
  }

  return { ok: true, piece }
}

// The entry point: the bytes of a `.mxl` in, a piece or a refusal out.
//
// The name of the entry holding the score is **read, never guessed**.
// Moonlight calls it `lg-30448188.xml` and Für Elise calls it
// `lg-76663811.xml`; both are named by `<rootfile full-path="…">` inside
// META-INF/container.xml, and nothing else in the archive says which is which.
export async function readScoreFromMxl(
  bytes: Uint8Array,
  parseXml: XmlParser,
): Promise<ScoreReadResult> {
  const archive = await readZipEntries(bytes)

  if (!archive.ok) {
    return refuse(archive.code, archive.reason)
  }

  const containerBytes = archive.entries.get(CONTAINER_PATH)

  if (containerBytes === undefined) {
    const listed = Array.from(archive.entries.keys())
    const found = listed.length === 0 ? 'nothing' : listed.map((name) => `"${name}"`).join(', ')

    return refuse(
      'missing-container',
      `This zip archive has no ${CONTAINER_PATH} entry; it holds ${found}. Expected a MuseScore .mxl, which always names its score there.`,
    )
  }

  const decoder = new TextDecoder()
  const container = parseXml(decoder.decode(containerBytes))

  if (hasParseError(container)) {
    return refuse(
      'no-rootfile',
      `${CONTAINER_PATH} is not well-formed XML. Expected a <container> naming the score with <rootfile full-path="…">.`,
    )
  }

  const rootPath = container.querySelector('rootfile')?.getAttribute('full-path')?.trim() ?? ''

  if (rootPath === '') {
    return refuse(
      'no-rootfile',
      `${CONTAINER_PATH} names no score file. Expected a <rootfile full-path="…"> element giving the name of the MusicXML entry inside the archive.`,
    )
  }

  const scoreBytes = archive.entries.get(rootPath)

  if (scoreBytes === undefined) {
    const listed = Array.from(archive.entries.keys())
      .map((name) => `"${name}"`)
      .join(', ')

    return refuse(
      'missing-rootfile-entry',
      `${CONTAINER_PATH} names "${rootPath}" as the score, but the archive holds only ${listed}. Expected the named entry to be present.`,
    )
  }

  return readScoreFromDocument(parseXml(decoder.decode(scoreBytes)))
}
