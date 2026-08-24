// Loop 019 — reading a score at runtime, verified against the two real
// MuseScore downloads committed in data/spike/ and against crafted archives
// aimed at each refusal.
//
// The first test is the loop. Everything else is scaffolding around it: if the
// `.mxl` path reproduces the committed artifact exactly, the refactor provably
// changed nothing, and every count the product has asserted since Loop 004
// still means what it meant.
//
// The parsed tree comes from vitest's jsdom environment — the same jsdom the
// ingest script uses, and the stand-in for the browser's DOMParser.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

import { moonlightSonata } from '../data/pieces/moonlight-sonata'
import {
  describeMeasureSpan,
  measureBounds,
  measureLabel,
  measuresWithOnsets,
  onsetsInMeasure,
} from '../lib/music/measures'
import { readScoreFromMxl } from '../lib/musicxml/read-score.ts'
import type { Piece, RefusalCode, ScoreReadResult } from '../lib/musicxml/types.ts'
import { crc32, readZipEntries } from '../lib/musicxml/zip.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SPIKE = resolve(__dirname, '../../data/spike')
const MOONLIGHT_MXL = resolve(SPIKE, 'moonlight-sonata.mxl')
const FUR_ELISE_MXL = resolve(SPIKE, 'beethoven-fur-elise-bagatelle-no-25-woo-59.mxl')

const parseXml = (xmlText: string): Document =>
  new DOMParser().parseFromString(xmlText, 'application/xml')

function fileBytes(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path))
}

function expectPiece(result: ScoreReadResult): Piece {
  if (!result.ok) {
    throw new Error(`expected a piece, got refusal ${result.refusal.code}: ${result.refusal.message}`)
  }
  return result.piece
}

function expectRefusal(result: ScoreReadResult, code: RefusalCode): string {
  if (result.ok) {
    throw new Error(`expected refusal ${code}, got a piece of ${result.piece.stream.length} onsets`)
  }
  expect(result.refusal.code).toBe(code)
  return result.refusal.message
}

// ---------------------------------------------------------------------------
// A minimal zip writer, so each refusal can be aimed at a crafted archive
// rather than described in prose. Entries are stored (method 0), which also
// exercises the reader's uncompressed path — the real .mxl files only ever
// exercise the deflate one.
// ---------------------------------------------------------------------------

type CraftedEntry = {
  name: string
  data: Uint8Array
  method?: number
  flags?: number
  crc?: number
}

function buildZip(entries: readonly CraftedEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const method = entry.method ?? 0
    const flags = entry.flags ?? 0
    const crc = entry.crc ?? crc32(entry.data)

    const local = new Uint8Array(30 + name.length + entry.data.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, flags, true)
    localView.setUint16(8, method, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, entry.data.length, true)
    localView.setUint32(22, entry.data.length, true)
    localView.setUint16(26, name.length, true)
    local.set(name, 30)
    local.set(entry.data, 30 + name.length)
    locals.push(local)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, flags, true)
    centralView.setUint16(10, method, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, entry.data.length, true)
    centralView.setUint32(24, entry.data.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint32(42, offset, true)
    central.set(name, 46)
    centrals.push(central)

    offset += local.length
  }

  const centralSize = centrals.reduce((total, part) => total + part.length, 0)
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  eocdView.setUint32(0, 0x06054b50, true)
  eocdView.setUint16(8, entries.length, true)
  eocdView.setUint16(10, entries.length, true)
  eocdView.setUint32(12, centralSize, true)
  eocdView.setUint32(16, offset, true)

  const parts = [...locals, ...centrals, eocd]
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }

  return out
}

const text = (value: string): Uint8Array => new TextEncoder().encode(value)

function containerXml(fullPath: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container><rootfiles><rootfile full-path="${fullPath}"/></rootfiles></container>`
}

function craftedMxl(scoreXml: string, entryName = 'score.xml'): Uint8Array {
  return buildZip([
    { name: 'META-INF/container.xml', data: text(containerXml(entryName)) },
    { name: entryName, data: text(scoreXml) },
  ])
}

function scoreXml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  ${body}
</score-partwise>`
}

const ONE_NOTE_PART = `<part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><staff>1</staff></note>
    </measure>
  </part>`

// ---------------------------------------------------------------------------

describe('the committed artifact, reproduced from the .mxl', () => {
  let piece: Piece

  beforeAll(async () => {
    piece = expectPiece(await readScoreFromMxl(fileBytes(MOONLIGHT_MXL), parseXml))
  })

  // Check 1 of the Loop 019 verifier — the loop itself. Three independent
  // statements of the same equality: the length, a structural deep-equality
  // that compares every field of every group, and a serialisation that also
  // pins key order. Any one of them failing means the refactor moved
  // something.
  it('reads 823 onsets, the length of the committed stream', () => {
    expect(piece.stream).toHaveLength(823)
    expect(piece.stream).toHaveLength(moonlightSonata.length)
  })

  it('is deep-equal to the committed moonlightSonata artifact, field for field', () => {
    expect(piece.stream).toStrictEqual(moonlightSonata)
  })

  it('serialises identically to the committed artifact, key order included', () => {
    expect(JSON.stringify(piece.stream)).toBe(JSON.stringify(moonlightSonata))
  })

  it('matches group by group on measure, tick, beat, staves and notes', () => {
    for (const [index, group] of piece.stream.entries()) {
      const committed = moonlightSonata[index]
      expect(group.measure).toBe(committed.measure)
      expect(group.tick).toBe(committed.tick)
      expect(group.beat).toBe(committed.beat)
      expect(group.staves).toEqual(committed.staves)
      expect(group.notes).toEqual(committed.notes)
    }
  })

  it('reports the Loop 018 measured facts for Moonlight', () => {
    expect(piece.measureCount).toBe(69)
    expect(piece.pitchedNoteCount).toBe(1169)
    expect(piece.inferredStaffCount).toBe(0)
    expect(piece.divisions).toBe(12)
    expect(piece.pickupMeasure).toBeNull()
  })

  it('carries no warning — Moonlight has no repeats or endings', () => {
    expect(piece.warnings).toEqual([])
  })

  it('is bounded 1 to 69, and describes itself as 69 measures', () => {
    expect(measureBounds(piece.stream)).toEqual({ firstMeasure: 1, lastMeasure: 69 })
    expect(describeMeasureSpan(piece.stream)).toBe('69 measures')
  })
})

describe('Für Elise', () => {
  let piece: Piece

  beforeAll(async () => {
    piece = expectPiece(await readScoreFromMxl(fileBytes(FUR_ELISE_MXL), parseXml))
  })

  // Check 4 — the second file exists to prove the parser reads a score rather
  // than the one score it was written against.
  it('merges 598 onsets', () => {
    expect(piece.stream).toHaveLength(598)
  })

  it('covers 106 measures numbered 0 to 105', () => {
    expect(piece.measureCount).toBe(106)

    const measures = measuresWithOnsets(piece.stream)
    expect(measures[0]).toBe(0)
    expect(measures[measures.length - 1]).toBe(105)
    expect(measures).toHaveLength(106)
  })

  it('covers MIDI 33 to 100 across 56 distinct pitches', () => {
    const pitches = piece.stream.flatMap((group) => group.notes)
    expect(Math.min(...pitches)).toBe(33)
    expect(Math.max(...pitches)).toBe(100)
    expect(new Set(pitches).size).toBe(56)
  })

  it('infers zero staff assignments across 815 pitched notes', () => {
    expect(piece.pitchedNoteCount).toBe(815)
    expect(piece.inferredStaffCount).toBe(0)
    expect(piece.divisions).toBe(24)
  })

  it('names itself from <work-title>', () => {
    expect(piece.title).toBe('Für Elise')
  })

  // Check 11 — repeats are warned about, never expanded.
  it('warns that repeats are read in written order, not performance order', () => {
    expect(piece.warnings.map((warning) => warning.code)).toEqual(['repeats-not-expanded'])
    expect(piece.warnings[0].message).toContain('repeats')
    expect(piece.warnings[0].message).toContain('written order')
  })

  // Check 12 — the pickup is real music and stays in the stream.
  it('keeps the pickup measure, with its onsets', () => {
    expect(piece.pickupMeasure).toBe(0)

    const pickupOnsets = onsetsInMeasure(piece.stream, 0)
    expect(pickupOnsets.length).toBeGreaterThan(0)
    expect(pickupOnsets.flatMap((group) => group.notes).length).toBeGreaterThan(0)
  })

  // The `implicit="yes"` attribute the ingestion reads and the "below 1" rule
  // measures.ts applies are two independent statements about the same bar.
  // This is where they are checked against each other.
  it('agrees with the measures module about which bar is the pickup', () => {
    expect(measuresWithOnsets(piece.stream).filter((measure) => measure < 1)).toEqual([
      piece.pickupMeasure,
    ])
  })

  // Check 13 — the jump control offers what the score offers.
  it('is bounded 1 to 105, excluding the pickup', () => {
    expect(measureBounds(piece.stream)).toEqual({ firstMeasure: 1, lastMeasure: 105 })
  })

  // Check 14 / the piece describing itself.
  it('describes itself as 105 measures and a pickup, never 106', () => {
    expect(describeMeasureSpan(piece.stream)).toBe('105 measures and a pickup')
    expect(measureLabel(piece.pickupMeasure ?? 0)).toBe('Pickup')
  })
})

// Check 5 — the entry holding the score is named by the container, never
// guessed. The two committed files are the proof: same format, same encoder
// family, different entry names.
describe('the score entry is read from META-INF/container.xml', () => {
  it('the two committed files name different entries', async () => {
    const moonlight = await readZipEntries(fileBytes(MOONLIGHT_MXL))
    const furElise = await readZipEntries(fileBytes(FUR_ELISE_MXL))

    expect(moonlight.ok).toBe(true)
    expect(furElise.ok).toBe(true)
    if (!moonlight.ok || !furElise.ok) {
      return
    }

    expect(Array.from(moonlight.entries.keys())).toEqual([
      'META-INF/container.xml',
      'lg-30448188.xml',
    ])
    expect(Array.from(furElise.entries.keys())).toEqual([
      'META-INF/container.xml',
      'lg-76663811.xml',
    ])
  })

  it('reads a score under an entry name neither committed file uses', async () => {
    const bytes = craftedMxl(scoreXml(ONE_NOTE_PART), 'nothing-would-ever-guess-this.xml')
    const piece = expectPiece(await readScoreFromMxl(bytes, parseXml))

    expect(piece.stream).toEqual([
      { measure: 1, tick: 0, beat: 1, staves: [1], notes: [60] },
    ])
  })

  it('refuses when the container names an entry the archive does not hold', async () => {
    const bytes = buildZip([
      { name: 'META-INF/container.xml', data: text(containerXml('absent.xml')) },
      { name: 'present.xml', data: text(scoreXml(ONE_NOTE_PART)) },
    ])

    const message = expectRefusal(
      await readScoreFromMxl(bytes, parseXml),
      'missing-rootfile-entry',
    )
    expect(message).toContain('"absent.xml"')
    expect(message).toContain('"present.xml"')
  })
})

// Check 9 and 10 — every refusal names what was wrong and what was expected,
// and every one is aimed at a crafted input rather than argued for in prose.
// "Invalid file" appears nowhere: each assertion below pins the specific noun.
describe('refusals', () => {
  it('refuses a file that is not a zip', async () => {
    const message = expectRefusal(
      await readScoreFromMxl(text('this is a text file, not a MuseScore download'), parseXml),
      'not-a-zip',
    )
    expect(message).toContain('end-of-central-directory')
    expect(message).toContain('Expected')
  })

  it('refuses a file too small to be a zip', async () => {
    const message = expectRefusal(await readScoreFromMxl(text('PK'), parseXml), 'not-a-zip')
    expect(message).toContain('2 bytes')
    expect(message).toContain('Expected a MuseScore .mxl, which is a zip of at least 22 bytes')
  })

  it('refuses a zip with no META-INF/container.xml, listing what it did hold', async () => {
    const bytes = buildZip([{ name: 'score.xml', data: text(scoreXml(ONE_NOTE_PART)) }])

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'missing-container')
    expect(message).toContain('META-INF/container.xml')
    expect(message).toContain('"score.xml"')
  })

  it('refuses a container that names no rootfile', async () => {
    const bytes = buildZip([
      {
        name: 'META-INF/container.xml',
        data: text('<?xml version="1.0"?><container><rootfiles/></container>'),
      },
      { name: 'score.xml', data: text(scoreXml(ONE_NOTE_PART)) },
    ])

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'no-rootfile')
    expect(message).toContain('names no score file')
    expect(message).toContain('<rootfile full-path=')
  })

  it('refuses a container that is not well-formed XML', async () => {
    const bytes = buildZip([
      { name: 'META-INF/container.xml', data: text('<container><rootfiles>') },
      { name: 'score.xml', data: text(scoreXml(ONE_NOTE_PART)) },
    ])

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'no-rootfile')
    expect(message).toContain('not well-formed XML')
  })

  it('refuses a score that is not well-formed XML', async () => {
    const message = expectRefusal(
      await readScoreFromMxl(craftedMxl('<score-partwise><part id="P1">'), parseXml),
      'unparsable-xml',
    )
    expect(message).toContain('not well-formed XML')
    expect(message).toContain('MuseScore .mxl')
  })

  it('refuses score-timewise, naming it and saying what to do', async () => {
    const bytes = craftedMxl(
      '<?xml version="1.0"?><score-timewise><measure number="1"/></score-timewise>',
    )

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'not-score-partwise')
    expect(message).toContain('<score-timewise>')
    expect(message).toContain('Expected <score-partwise>')
    expect(message).toContain('Re-export from MuseScore')
  })

  it('refuses a root element that is not a score at all', async () => {
    const bytes = craftedMxl('<?xml version="1.0"?><html><body/></html>')

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'not-score-partwise')
    expect(message).toContain('<html>')
    expect(message).toContain('Expected <score-partwise>')
  })

  it('refuses more than one part rather than silently discarding the extras', async () => {
    const bytes = craftedMxl(
      scoreXml(`${ONE_NOTE_PART}
  <part id="P2">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><staff>1</staff></note>
    </measure>
  </part>`),
    )

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'part-count')
    expect(message).toContain('2 <part> elements')
    expect(message).toContain('Expected exactly 1')
  })

  it('refuses a score with no part at all', async () => {
    const message = expectRefusal(
      await readScoreFromMxl(craftedMxl(scoreXml('')), parseXml),
      'part-count',
    )
    expect(message).toContain('0 <part> elements')
    expect(message).toContain('Expected exactly 1')
  })

  it('refuses a score that declares no divisions', async () => {
    const bytes = craftedMxl(
      scoreXml(`<part id="P1">
    <measure number="1">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><staff>1</staff></note>
    </measure>
  </part>`),
    )

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'no-divisions')
    expect(message).toContain('<divisions>')
    expect(message).toContain('ticks per quarter note')
  })

  it('refuses a score of nothing but rests', async () => {
    const bytes = craftedMxl(
      scoreXml(`<part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><rest/><duration>4</duration><staff>1</staff></note>
    </measure>
    <measure number="2">
      <note><rest/><duration>4</duration><staff>1</staff></note>
    </measure>
  </part>`),
    )

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'no-pitched-notes')
    expect(message).toContain('no pitched notes')
    expect(message).toContain('2 measures')
  })

  it('never answers with a bare "invalid file"', async () => {
    const results = await Promise.all([
      readScoreFromMxl(text('a plain text file, comfortably longer than a zip trailer'), parseXml),
      readScoreFromMxl(buildZip([{ name: 'a.xml', data: text('<a/>') }]), parseXml),
      readScoreFromMxl(craftedMxl(scoreXml('')), parseXml),
    ])

    for (const result of results) {
      expect(result.ok).toBe(false)
      if (result.ok) {
        continue
      }
      expect(result.refusal.message.toLowerCase()).not.toContain('invalid file')
      expect(result.refusal.message).toContain('Expected')
    }
  })
})

// The hand-rolled zip reader is the correctness risk the handoff named when it
// allowed route 1. These are its failure modes, each tested rather than
// assumed.
describe('zip failure modes', () => {
  it('refuses an entry whose CRC-32 does not match its bytes', async () => {
    const bytes = buildZip([
      { name: 'META-INF/container.xml', data: text(containerXml('score.xml')), crc: 0 },
      { name: 'score.xml', data: text(scoreXml(ONE_NOTE_PART)) },
    ])

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'unreadable-zip')
    expect(message).toContain('CRC-32')
    expect(message).toContain('corrupt')
  })

  it('refuses an encrypted entry', async () => {
    const bytes = buildZip([
      { name: 'META-INF/container.xml', data: text(containerXml('score.xml')), flags: 1 },
      { name: 'score.xml', data: text(scoreXml(ONE_NOTE_PART)) },
    ])

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'unreadable-zip')
    expect(message).toContain('encrypted')
    expect(message).toContain('Expected an unencrypted MuseScore .mxl')
  })

  it('refuses a compression method it does not implement, naming the method', async () => {
    const bytes = buildZip([
      { name: 'META-INF/container.xml', data: text(containerXml('score.xml')), method: 14 },
      { name: 'score.xml', data: text(scoreXml(ONE_NOTE_PART)) },
    ])

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'unreadable-zip')
    expect(message).toContain('compression method 14')
    expect(message).toContain('stored (0) or deflate (8)')
  })

  it('refuses deflate data that will not decompress', async () => {
    const bytes = buildZip([
      {
        name: 'META-INF/container.xml',
        data: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
        method: 8,
      },
    ])

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'unreadable-zip')
    expect(message).toContain('could not be decompressed')
    expect(message).toContain('truncated or corrupt')
  })

  it('refuses a Zip64 archive rather than misreading its offsets', async () => {
    const bytes = buildZip([{ name: 'score.xml', data: text('<a/>') }])
    // Patch the end-of-central-directory entry count to the Zip64 sentinel.
    new DataView(bytes.buffer).setUint16(bytes.length - 22 + 10, 0xffff, true)

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'unreadable-zip')
    expect(message).toContain('Zip64')
    expect(message).toContain('Expected a plain zip')
  })

  it('refuses a truncated archive whose offsets point past the end', async () => {
    const bytes = buildZip([{ name: 'score.xml', data: text('<a/>') }])
    // Point the central directory entry's local header offset past the file.
    const centralOffset = new DataView(bytes.buffer).getUint32(bytes.length - 22 + 16, true)
    new DataView(bytes.buffer).setUint32(centralOffset + 42, 0xfffffff0, true)

    const message = expectRefusal(await readScoreFromMxl(bytes, parseXml), 'unreadable-zip')
    expect(message).toContain('truncated')
  })

  it('reads both committed files with every entry intact', async () => {
    for (const path of [MOONLIGHT_MXL, FUR_ELISE_MXL]) {
      const archive = await readZipEntries(fileBytes(path))
      expect(archive.ok).toBe(true)
      if (!archive.ok) {
        continue
      }

      expect(archive.entries.size).toBe(2)
      for (const [, data] of archive.entries) {
        expect(data.length).toBeGreaterThan(0)
      }
    }
  })
})
