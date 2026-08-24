# Sprint 18 Output: Does the ingestion generalise?

**Terminal state: `DONE`**

Loop spec: `docs/planning/loops/018-prove-ingestion-generalises.md`
Executed: **inline by the macro layer**, 2026-08-22, as Loop 003's score-source
decision was. The loop was "run a second file through and see what breaks";
that is measurement, not a sprint, and specing it would have cost more than
running it.

Second file: `data/spike/beethoven-fur-elise-bagatelle-no-25-woo-59.mxl` —
OpenScore's engraving of Für Elise, downloaded through MuseScore.

**Scope, set by the human before the spike:** the app may assume the user
downloads from MuseScore. Validation is required; accounting for everything
outside MuseScore is not.

## Method, and why the numbers can be trusted

`scripts/ingest-musicxml.mjs` needs `jsdom` and could not be run here, so the
algorithm was reimplemented in Python — the same document-order walk, the same
`<backup>`/`<forward>` tick arithmetic, the same `<chord/>` and grace handling,
the same `(pitch, staff)` dedupe, the same `beat = 1 + tick / divisions`.

**The mirror was validated against the committed artifact before being trusted.**
Run on `moonlight-sonata.mxl` it reproduces **823 merged onsets, MIDI 29–87, 55
distinct pitches, 1,169 pitched notes, 0 inferred staff assignments** — every
number ADR 0001 and ADR 0002 record. A mirror that reproduces the known case
exactly is evidence about the unknown one.

## Headline: the algorithm generalises. Everything around it does not.

Für Elise parses cleanly through the merge:

| | Moonlight (known) | Für Elise (new) |
|---|---|---|
| Encoder | MuseScore 2.0.3 | MuseScore 2.1.0 |
| Container | `.mxl` and `.musicxml` both present | **`.mxl` only** |
| Parts / staves | 1 part, 2 staves | 1 part, 2 staves |
| Pitched notes | 1,169 | 815 |
| **Staff assignments inferred** | **0** | **0** |
| Merged onsets | 823 | **598** |
| Measures | 69, numbered 1–105 | 106, numbered **0–105** |
| Contiguous | yes | yes |
| Pitch range | MIDI 29–87 | **MIDI 33–100** |
| Distinct pitches | 55 | 56 |
| Onsets per measure | median 12, max 13, min 1 | median 6, max 12, min 1 |
| Negative ticks | 0 | 0 |
| Divisions | 12, declared once | 24, declared once |
| Meter | 2/2 | **3/8** |
| Grace notes | 0 | **3** |
| Repeats / endings | 0 / 0 | **4 / 8** |

No crash, no exception, no inferred staff, no negative tick, no measure without
onsets. **ADR 0001's untested caveat is now half-closed:** MusicXML from
MuseScore is excellent across two files by two different engravers on two
different MuseScore versions. It remains untested outside MuseScore, which the
human has scoped out.

## Six findings, in order of how much they cost

### 1. The script cannot open the file at all — `.mxl` is a zip

`INPUT_PATH` is hardcoded to `data/spike/moonlight-sonata.musicxml`, an
**uncompressed** file. MuseScore's download is `.mxl`, a zip container. This is
the first thing any user hits, and the Moonlight case only worked because an
uncompressed copy happened to be sitting next to it.

**The inner filename cannot be guessed.** Both files name it arbitrarily:

```
moonlight-sonata.mxl  → META-INF/container.xml → lg-30448188.xml
fur-elise.mxl         → META-INF/container.xml → lg-76663811.xml
```

`META-INF/container.xml` must be read and its `<rootfile full-path>` followed.
Cheap to fix, and non-negotiable.

### 2. Measure 0 — Für Elise has a pickup, and every measure control assumes 1

```xml
<measure number="0" implicit="yes">
```

**Nothing breaks, and that is Loops 016 and 017 having been built correctly.**
`measureBounds` derives `firstMeasure` from the stream rather than assuming 1,
and `browseMeasures` walks to the first measure that carries onsets rather than
starting at 1. Both would return 0 and work.

What is wrong is what the reader is told:

- Browse would open on a heading reading **"Measure 0"**. MuseScore draws that
  bar unnumbered, because a pickup is not a measure to a musician.
- The jump control's refusals would read **"This piece has measures 0 to 105."**
- The piece would be described as **106 measures**; MuseScore shows 105.

The numbering of everything *after* the pickup still matches MuseScore exactly,
so "jump to 34" lands where the user expects. Only the boundary lies.

### 3. Repeats and voltas — document order is not played order

Für Elise carries **4 `<repeat>` and 8 `<ending>` elements**; Moonlight carries
none. The merged stream is in document order.

This is the only finding that is not a parsing problem. The product's question
is *what comes next*, and across a repeat barline or into a second ending the
honest answer is not the next element in the document. A user sitting at bar 22
of a repeated section and asking what follows would be shown the wrong bar,
with no indication anything was uncertain.

**Nothing detects this today, and nothing warns.**

### 4. Beat labels are in quarter-notes, not in the meter's beat — and always were

`beat = 1 + tick / divisions`, and `divisions` is divisions per **quarter note**.

Für Elise is **3/8**. Its three eighth-note beats come out as **1.0, 1.5, 2.0**;
a musician reads them as beats 1, 2 and 3.

**This is pre-existing, not caused by the new file.** Moonlight is **2/2**, and
its labels — `1.0, 1.333, 1.667, 2.0 … 4.667` — are quarter positions, not
cut-time beats. The founding query's famous `m12 b4.33` has been a quarter-note
position all along. Für Elise makes an existing defect visible rather than
introducing one.

### 5. Grace notes fuse into the note they ornament

The script gives a grace note `onsetTick = position` without advancing
`position`, so it lands on the **same tick as the principal note** and merges
into the same `NoteGroup`. Für Elise has 3; Moonlight has 0.

The consequence is a search contract change nobody chose: an onset that should
be one note becomes two, so finding it requires selecting both. Three notes in
this piece. It would matter in ornamented repertoire.

### 6. `querySelector('part')` silently takes the first part

Both files are single-part piano, so this is untested rather than broken. A
two-part score — organ with pedal, anything with a separate voice line — would
be read as its first part with the rest discarded, silently. This is exactly
the shape of failure validation exists to catch.

## What this tells Loop 019

**019 is a UI loop with a real parser problem behind it, not a file-picker.**

The current ingestion is a **build-time Node script** that constructs
`new JSDOM()` internally, hardcodes its input and output paths, and emits a
TypeScript module whose export names — `moonlightSonata`,
`MOONLIGHT_SONATA_NAME` — are literals in `renderArtifact`. None of that
survives contact with a browser.

Two constraints 019 must decide rather than discover:

- **Loop 014's check 5** greps `src/lib/music/` case-insensitively for
  `react|document|window|fetch|jsdom` and requires no hits. A runtime parser
  needs `DOMParser`, and unzipping `.mxl` needs a zip reader. Where the parser
  lives, and whether that purity check still means what it meant, is an
  architecture decision.
- **A zip reader is a dependency**, and this project has added exactly one
  dependency in eighteen loops.

## Open questions this leaves the human

1. How a pickup measure should be labelled and counted.
2. What the app does with a piece containing repeats — nothing, warn, or refuse.
3. Whether the quarter-note beat label is fixed now that it is documented, or
   left alone because it has never confused the one user.
