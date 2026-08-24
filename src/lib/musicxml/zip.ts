// Loop 019 — reading a `.mxl`, which is a zip.
//
// Route 1 of the handoff's Section 5c: no dependency. `DecompressionStream`
// does the inflating — native in browsers and in Node 22 — and this file only
// has to find where each entry's bytes start and end. Hand-rolling DEFLATE
// itself was explicitly out of bounds and is not what happens here.
//
// It reads the **central directory**, not the local file headers, because an
// entry written with a data descriptor (general-purpose bit 3) carries zeroed
// sizes in its local header and the true ones only in the central directory.
// Guessing from local headers is exactly the hand-rolled-binary correctness
// risk the handoff warned about.
//
// Every entry's CRC-32 is checked against the one the archive recorded. That
// is what makes a hand-rolled reader trustworthy rather than merely lucky: a
// truncated or corrupted download is refused, not silently half-parsed.

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50

const EOCD_MIN_SIZE = 22
// The EOCD is last in the file but may be followed by a comment of up to 64KB.
const MAX_COMMENT_SIZE = 0xffff

const METHOD_STORE = 0
const METHOD_DEFLATE = 8

// Sentinel values that mean "the real number lives in a Zip64 record".
const ZIP64_16 = 0xffff
const ZIP64_32 = 0xffffffff

export type ZipEntries = ReadonlyMap<string, Uint8Array>

export type ZipReadResult =
  | { ok: true; entries: ZipEntries }
  | { ok: false; code: 'not-a-zip' | 'unreadable-zip'; reason: string }

class ZipError extends Error {
  readonly code: 'not-a-zip' | 'unreadable-zip'

  constructor(code: 'not-a-zip' | 'unreadable-zip', message: string) {
    super(message)
    this.code = code
  }
}

const CRC_TABLE = buildCrcTable()

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256)

  for (let n = 0; n < 256; n += 1) {
    let value = n
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[n] = value >>> 0
  }

  return table
}

// Exported so tests can build valid crafted archives to aim the refusals at.
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff

  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  // DecompressionStream accepts a `BufferSource`, which rules out an array
  // that might be backed by a SharedArrayBuffer. `compressed` is a view into
  // the caller's bytes and carries no such guarantee, so it is copied into a
  // plainly-backed array first — a few hundred KB once per entry.
  const chunk = new Uint8Array(compressed.length)
  chunk.set(compressed)

  const source = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(chunk)
      controller.close()
    },
  })

  const reader = source.pipeThrough(new DecompressionStream('deflate-raw')).getReader()

  const chunks: Uint8Array[] = []
  let total = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    chunks.push(value)
    total += value.length
  }

  const inflated = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    inflated.set(chunk, at)
    at += chunk.length
  }

  return inflated
}

function requireRange(bytes: Uint8Array, start: number, length: number, what: string): void {
  if (start < 0 || length < 0 || start + length > bytes.length) {
    throw new ZipError(
      'unreadable-zip',
      `The archive is truncated: ${what} points past the end of the file. Expected a complete zip archive.`,
    )
  }
}

function findEndOfCentralDirectory(bytes: Uint8Array, view: DataView): number {
  if (bytes.length < EOCD_MIN_SIZE) {
    throw new ZipError(
      'not-a-zip',
      `This file is ${bytes.length} bytes, too small to be a zip archive. Expected a MuseScore .mxl, which is a zip of at least ${EOCD_MIN_SIZE} bytes.`,
    )
  }

  const lowest = Math.max(0, bytes.length - EOCD_MIN_SIZE - MAX_COMMENT_SIZE)

  for (let at = bytes.length - EOCD_MIN_SIZE; at >= lowest; at -= 1) {
    if (view.getUint32(at, true) === EOCD_SIGNATURE) {
      return at
    }
  }

  throw new ZipError(
    'not-a-zip',
    'This file has no zip end-of-central-directory record, so it is not a zip archive. Expected a MuseScore .mxl, which is a zip containing META-INF/container.xml.',
  )
}

type CentralEntry = {
  name: string
  method: number
  flags: number
  crc: number
  compressedSize: number
  uncompressedSize: number
  localOffset: number
}

function readCentralDirectory(bytes: Uint8Array, view: DataView, eocd: number): CentralEntry[] {
  const count = view.getUint16(eocd + 10, true)
  const directorySize = view.getUint32(eocd + 12, true)
  const directoryOffset = view.getUint32(eocd + 16, true)

  if (count === ZIP64_16 || directorySize === ZIP64_32 || directoryOffset === ZIP64_32) {
    throw new ZipError(
      'unreadable-zip',
      'This is a Zip64 archive, which this reader does not support. Expected a plain zip — a MuseScore .mxl holds two small entries and never needs Zip64.',
    )
  }

  const decoder = new TextDecoder()
  const entries: CentralEntry[] = []
  let at = directoryOffset

  for (let n = 0; n < count; n += 1) {
    requireRange(bytes, at, 46, `central directory entry ${n + 1}`)

    if (view.getUint32(at, true) !== CENTRAL_SIGNATURE) {
      throw new ZipError(
        'unreadable-zip',
        `The central directory is malformed at entry ${n + 1}: expected a central file header signature. Expected a well-formed zip archive.`,
      )
    }

    const flags = view.getUint16(at + 8, true)
    const method = view.getUint16(at + 10, true)
    const crc = view.getUint32(at + 16, true)
    const compressedSize = view.getUint32(at + 20, true)
    const uncompressedSize = view.getUint32(at + 24, true)
    const nameLength = view.getUint16(at + 28, true)
    const extraLength = view.getUint16(at + 30, true)
    const commentLength = view.getUint16(at + 32, true)
    const localOffset = view.getUint32(at + 42, true)

    requireRange(bytes, at + 46, nameLength, `the name of central directory entry ${n + 1}`)
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength))

    if (compressedSize === ZIP64_32 || uncompressedSize === ZIP64_32 || localOffset === ZIP64_32) {
      throw new ZipError(
        'unreadable-zip',
        `Entry "${name}" uses Zip64 size fields, which this reader does not support. Expected a plain zip.`,
      )
    }

    entries.push({ name, method, flags, crc, compressedSize, uncompressedSize, localOffset })
    at += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

function locateEntryData(bytes: Uint8Array, view: DataView, entry: CentralEntry): Uint8Array {
  requireRange(bytes, entry.localOffset, 30, `the local header of entry "${entry.name}"`)

  if (view.getUint32(entry.localOffset, true) !== LOCAL_SIGNATURE) {
    throw new ZipError(
      'unreadable-zip',
      `Entry "${entry.name}" has no local file header where the central directory says it should. Expected a well-formed zip archive.`,
    )
  }

  const nameLength = view.getUint16(entry.localOffset + 26, true)
  const extraLength = view.getUint16(entry.localOffset + 28, true)
  const start = entry.localOffset + 30 + nameLength + extraLength

  requireRange(bytes, start, entry.compressedSize, `the data of entry "${entry.name}"`)

  return bytes.subarray(start, start + entry.compressedSize)
}

async function decodeEntry(entry: CentralEntry, raw: Uint8Array): Promise<Uint8Array> {
  if ((entry.flags & 1) !== 0) {
    throw new ZipError(
      'unreadable-zip',
      `Entry "${entry.name}" is encrypted. Expected an unencrypted MuseScore .mxl.`,
    )
  }

  let data: Uint8Array

  if (entry.method === METHOD_STORE) {
    data = raw
  } else if (entry.method === METHOD_DEFLATE) {
    try {
      data = await inflateRaw(raw)
    } catch {
      throw new ZipError(
        'unreadable-zip',
        `Entry "${entry.name}" could not be decompressed. Expected valid deflate data — the file may be truncated or corrupt.`,
      )
    }
  } else {
    throw new ZipError(
      'unreadable-zip',
      `Entry "${entry.name}" uses compression method ${entry.method}, which this reader does not support. Expected stored (0) or deflate (8), which is all MuseScore writes.`,
    )
  }

  if (data.length !== entry.uncompressedSize) {
    throw new ZipError(
      'unreadable-zip',
      `Entry "${entry.name}" unpacked to ${data.length} bytes but the archive says it should be ${entry.uncompressedSize}. Expected the two to agree — the file may be truncated or corrupt.`,
    )
  }

  if (crc32(data) !== entry.crc) {
    throw new ZipError(
      'unreadable-zip',
      `Entry "${entry.name}" fails its CRC-32 check. Expected the unpacked bytes to match the checksum the archive recorded — the file is corrupt.`,
    )
  }

  return data
}

// Reads every entry of a zip archive into memory. A `.mxl` holds two small
// entries, so reading all of them costs nothing and spares the caller a second
// pass once `META-INF/container.xml` has named the one that matters.
export async function readZipEntries(bytes: Uint8Array): Promise<ZipReadResult> {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const eocd = findEndOfCentralDirectory(bytes, view)
    const entries = readCentralDirectory(bytes, view, eocd)

    const unpacked = new Map<string, Uint8Array>()
    for (const entry of entries) {
      unpacked.set(entry.name, await decodeEntry(entry, locateEntryData(bytes, view, entry)))
    }

    return { ok: true, entries: unpacked }
  } catch (error) {
    if (error instanceof ZipError) {
      return { ok: false, code: error.code, reason: error.message }
    }
    throw error
  }
}
