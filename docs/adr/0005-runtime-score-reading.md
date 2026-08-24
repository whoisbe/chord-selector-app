# ADR 0005: Runtime score reading — module boundary and zip strategy

**Status:** Accepted
**Date:** 2026-08-22
**Loop:** 019
**Supersedes:** nothing. **Amends:** ADR 0001's assumption that ingestion is
build-time only.

## Context

Until Loop 019 the piece was a TypeScript module generated on a laptop by
`scripts/ingest-musicxml.mjs`, which constructed `new JSDOM()` inside itself
and hardcoded its input path, its output path, and the export names
`moonlightSonata` and `MOONLIGHT_SONATA_NAME` as string literals.

Loop 018 established that the app must be able to read a MuseScore `.mxl` at
runtime. That forces two decisions this project had never had to make.

## Decision 1 — the ingestion lives in `src/lib/musicxml/`, not `src/lib/music/`

Loop 014 established that `src/lib/music/` contains no DOM, React or jsdom
dependency, enforced by a case-insensitive grep. A runtime parser needs a
`Document`. The obvious moves were to relax the grep or to add an exclusion.

**Neither. A new directory instead.**

- `src/lib/music/` — pure functions over `NoteGroup[]`. Nothing about files.
- `src/lib/musicxml/` — turning a file into `NoteGroup[]`. Zip, XML, validation.

The grep is unchanged, unexcluded and still passes.

This is the honest boundary rather than a workaround, and the test is that the
boundary is describable without mentioning the check: one directory reasons
about music that is already loaded, the other is about loading. The check was
protecting a real distinction that had simply never been named.

**The tick walk takes an already-parsed document** rather than building one, so
the algorithm has exactly one implementation with three callers — the browser
via a 12-line `DOMParser` adapter, the ingest script via jsdom, and the unit
suite via vitest's jsdom environment. Two copies of the tick walk was the
failure mode most likely to look like success, so Loop 019's check 3 asserted
against it directly.

**Verified by reproduction, not by argument.** Parsing `moonlight-sonata.mxl`
through the new runtime path yields a stream **JSON-identical** to the
committed artifact across all 823 groups, and `node scripts/ingest-musicxml.mjs`
still regenerates that artifact with `git diff --exit-code` returning 0. Both
were re-run independently by the macro layer.

## Decision 2 — the zip reader is hand-rolled, with zero dependencies

`.mxl` is a zip. The options were a dependency (`fflate`) or
`DecompressionStream('deflate-raw')`, which is native in browsers and in Node
22, plus a reader for the archive structure.

**Native, zero dependencies.** `package.json` and `package-lock.json` are
untouched. This project has added one dependency in nineteen loops.

DEFLATE itself is **not** hand-rolled — that was explicitly out of bounds.
What is hand-rolled is the archive structure, and two properties are what make
that defensible rather than lucky:

- **It reads the central directory, not the local file headers.** An entry
  written with a data descriptor carries zeroed sizes in its local header and
  the true ones only centrally. Neither committed file uses one, so a
  local-header reader would have passed both test files and broken on the
  third.
- **Every entry's CRC-32 is verified** against the archive's stored checksum,
  so a truncated download is refused rather than half-parsed.

Zip64, encryption, unsupported compression methods, corrupt deflate data and
out-of-range offsets are each refused with a specific message and each tested.

**The standing risk is recorded rather than argued away:** hand-rolled binary
parsing has been proven against exactly two MuseScore versions. If real use
turns up an `.mxl` this refuses, `fflate` remains a legitimate fallback and
swapping it in touches only `zip.ts`. The refusal messages are specific enough
that such a failure arrives as a report rather than a mystery.

## Decision 3 — validation refuses; it does not accommodate

Scoped by the human before Loop 019: **the app may assume a MuseScore
download.** Files from Finale, Sibelius or optical recognition are out of
scope, not untested.

So validation's job is to say no in a way you can act on. Six refusal
conditions, each naming what was wrong and what was expected, with a test
asserting no refusal is a bare "invalid file". Multi-part scores are **refused
rather than merged**, because Loop 018 found extra parts are silently
discarded today and merging would widen the intake rather than narrow the
failure.

One condition warns rather than refuses: a score containing repeats loads, and
carries a warning that what follows an occurrence is read in written order
rather than performance order. Modelling performance order would renumber
measures and break every control Loops 016 and 017 built.

## Consequences

- Loop 020 gets `readScoreFromMxl(bytes, parseXml)` returning
  `{ ok: true, piece } | { ok: false, refusal }`. **It is `async`** — the
  native decompression is stream-based.
- `piece.warnings` travels with the piece, so a component receives its caveat
  without a second value threaded alongside.
- A pickup measure is kept in the stream, labelled `"Pickup"`, and excluded
  from the numeric bounds — so Für Elise reports 1–105 and describes itself as
  "105 measures and a pickup", matching what MuseScore draws.
- The committed artifact remains the oracle for the ingestion. Any future
  change to the `beat` computation invalidates it and needs its own oracle
  strategy — recorded because Loop 018 found `beat` is a quarter-note position
  rather than the meter's beat, in both pieces, and that fix is deferred.
- Storage is still excluded. A `Piece` is trivially serialisable and persisting
  one would be about six lines, which is exactly why it was not done inside a
  feature loop. See OPEN DECISION 10.
