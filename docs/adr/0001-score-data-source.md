# ADR 0001: MusicXML as the score data source

Status: **Accepted**
Date: 2026-08-01
Decided by: macro layer, from a spike run inline rather than as a coding loop
Supersedes: the comparison portion of `docs/planning/loops/003-score-data-source-decision.md`

## Context

The Piece lifecycle had `UNKNOWN` at both `SOURCE` and `PARSED`. Loop 001 sidestepped it by hand-authoring a fixture directly in the `NoteGroup[]` shape. Three candidates were on the table: MusicXML, MIDI, and a hand-curated corpus.

Loop 003 was specced as a three-way spike with a measurement protocol. It was not run as a coding loop, because a single measured input collapsed the comparison.

## Evidence

Input: `data/spike/moonlight-sonata.mxl`, human-supplied. Beethoven Op. 27 No. 2 movement 1, MuseScore 2.0.3 export dated 2016-04-12, permissive redistribution notice, 596 KB uncompressed.

Parsed with a throwaway probe (stdlib XML only, no dependency):

| Dimension | Result |
|---|---|
| Measures | 69 — the complete movement |
| `<note>` elements | 1210 (1169 pitched, 41 rests) |
| Notes with an explicit `<staff>` | **1210 of 1210 — 100%** |
| Staff assignment inferred by heuristic | **0** |
| Grace notes needing special handling | 0 |
| Measure provenance | explicit `<measure number>` attribute, 100% |
| Beat provenance | derived from `<duration>` against `divisions=12`, exact rational, 13 distinct positions |
| Chord members | 124, marked with `<chord/>` — onset grouping is explicit, not inferred |
| Dependencies required | none; Python stdlib `xml.etree` sufficed |
| Parse failures | none |
| `NoteGroup`s produced | 938 staff-split / 823 merged by onset |

## Decision

**MusicXML is the score data source.** MIDI is not evaluated further.

## Why the comparison collapsed

The decisive dimension was always going to be onset and part provenance, because search depends on grouping simultaneous notes and locating them by measure and beat.

MusicXML supplied every one of those from explicit markup — `<staff>`, `<chord/>`, `<measure number>`, `<duration>`/`<divisions>` — with a heuristic-inference rate of exactly zero. A MIDI file structurally cannot match that: measure and beat must be reconstructed from a tempo map and time-signature meta events, and part assignment must be guessed from track or channel layout. Even a perfect MIDI parser would enter the comparison with an inference rate above zero on the dimension that decides it.

There is no version of this comparison that MIDI wins. Running the spike to confirm that would have been ceremony.

The curated-corpus option is also rejected: MusicXML parsing turned out to cost nothing, so hand-authoring buys no risk reduction while capping the corpus at what a human will type.

## What this evidence does not establish

Stated explicitly, because a decision loop that reports only confirming evidence is worse than no decision loop.

1. **One file, one exporter.** MuseScore emits unusually clean MusicXML. The finding is "MusicXML from MuseScore is excellent," not "MusicXML is excellent." Files from Finale, Sibelius, optical recognition, or hand-editing will be messier. The 100% figure should be expected to degrade on a heterogeneous corpus.
2. **Provenance is a community transcription**, not an urtext edition. Adequate for building and evaluating search; not a basis for claiming score facts.
3. **`.mxl` only.** Uncompressed `.musicxml`, multi-part scores, repeats, voltas, and transposing instruments are all untested. This file is a single piano part with two staves.
4. **`<staff>` being present is not the same as `<staff>` meaning what we want.** See ADR 0002 — this turned out to matter a great deal.

## Consequences

- Loop 004 implements MusicXML ingestion. Its algorithm is already proven by the spike: walk `<measure>`, advance position by `<duration>`, honour `<backup>`/`<forward>`, group `<chord/>` members at the previous onset.
- Ingestion needs no npm dependency. The "no new dependencies" contract survives.
- **Store the integer tick offset, not the fractional beat.** Triplets against `divisions=12` produce `1.33`/`1.67`; storing those as floats invites equality bugs in matching. Derive the display beat from ticks.
- Loop 003's spec is superseded and marked as such. `spike/` quarantine is unnecessary, since the probe needed no dependencies and produced no code worth keeping.
- Forecloses: MIDI-file input, and by extension any near-term path to "record what I play on my keyboard into a searchable piece." Live MIDI *input for querying* is unaffected and remains open.

## Addendum — 2026-08-22, after Loop 018

Loop 018 ran a second file through the ingestion: OpenScore's Für Elise,
engraved by a different transcriber and exported by MuseScore 2.1.0.
Full evidence in `docs/sprints/output/018-ingestion-generalises-output.md`.

**Caveat 1 is half-closed.** The merge algorithm generalised without a single
change: 815 pitched notes placed, 598 merged onsets, 106 measures, MIDI 33–100,
56 distinct pitches, and — the number that mattered — **0 staff assignments
inferred**, matching Moonlight's 0 of 1,169. Two engravers, two MuseScore
versions, both perfect on `<staff>`.

**The human has scoped the other half out rather than leaving it open.** The app
may assume the user downloads from MuseScore. Finale, Sibelius, optical
recognition and hand-edited files are no longer "untested" — they are
**out of scope**, and the app's obligation toward them is to **refuse clearly**,
not to accommodate. That is a product decision, recorded here so it is not
rediscovered as a gap.

**Caveat 3 partially closes and partially sharpens.**

- *Repeats and voltas* are now tested and are the finding that costs most.
  Für Elise carries 4 repeats and 8 endings. The stream is in document order,
  which is not played order, so "what comes next" across a repeat barline is
  wrong. Decided: **detect and warn, keep document order.** Modelling
  performance order would break every measure control Loops 016 and 017 built.
- *Pickup measures* were not on the original list and should have been.
  Für Elise's first bar is `number="0" implicit="yes"`. Nothing broke — the
  measure helpers derive their bounds — but the labelling disagrees with what
  MuseScore draws. Decided: **label it "Pickup" and keep it out of the numeric
  bounds.**
- *Multi-part scores* remain untested. `querySelector('part')` silently takes
  the first. Both test files are single-part piano.
- *Uncompressed vs compressed* inverts what this ADR assumed. The spike read
  the `.mxl`; the shipped script reads a hardcoded **uncompressed** `.musicxml`
  that only exists because someone extracted it by hand. MuseScore's download
  is `.mxl`, and the entry name inside it is arbitrary — `lg-30448188.xml` and
  `lg-76663811.xml` — so `META-INF/container.xml` must be read.

**One consequence this ADR got right is now load-bearing.** "Store the integer
tick offset, not the fractional beat" held: no equality bug appeared across a
second file with different divisions (24 rather than 12). The *display* beat
derived from ticks is wrong in both pieces — it is a quarter-note position
rather than the meter's beat — but that is a labelling defect, not a matching
one, and matching is what the decision protected.
