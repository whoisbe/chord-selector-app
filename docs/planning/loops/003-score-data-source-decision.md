# Loop Spec 003: Score Data Source Decision

> **SUPERSEDED 2026-08-01.** The three-way comparison was collapsed by a macro-layer spike run inline against `data/spike/moonlight-sonata.mxl`: 1210 of 1210 notes carried an explicit `<staff>`, zero inferred. See `docs/adr/0001-score-data-source.md` and `docs/adr/0002-merged-onset-stream.md`. Kept for the record; do not execute.


Loop type: **Architecture-conformance** (decision loop producing an ADR)
Status: engineered, awaiting executor assignment
Executor: TBD
Depends on: Loop 002 DONE, and `data/spike/` populated by the human
Blocks: Loop 004 (piece ingestion)

## Trigger

The Piece lifecycle in `docs/planning/product-loop-map.md` has `UNKNOWN` at both `SOURCE` and `PARSED`. Loop 001 sidestepped this by hand-authoring a fixture directly in the `NORMALIZED_STREAM` shape. Loop 004 cannot be specced until this is resolved.

## Goal

Transition from **"we have three plausible score-data paths and no evidence"** to **"a proposed ADR exists in which every option is measured against the same real piece on the same dimensions, with a recommendation and its uncertainty stated."**

This loop produces evidence and a proposal. It does not ratify. Ratification happens in the Mode 3 review with the human, because the correctness spot-check requires someone who can read the actual score.

## Human precondition

Before this loop runs, `data/spike/` must contain, for **the same real piece**:

- one `.musicxml` or `.mxl` file
- one `.mid` file

Running target: Beethoven, Piano Sonata No. 14 Op. 27 No. 2, movement 1. If the files are absent or are of different pieces, the loop ends at `BLOCKED` immediately. Do not substitute, synthesise, or download replacements.

## Dependency quarantine

All spike code lives under `spike/` with its own `package.json` and its own lockfile.

- The root `package.json` and `package-lock.json` must not change. This is verified.
- `spike/` is added to `.gitignore` except for `spike/README.md` and the results file.
- Dependencies used by each option are a **measured cost recorded in the ADR**, not a silent convenience.
- No spike code may be imported by `app/`, `lib/`, `components/`, or `tests/`.

## The contract every option must satisfy

Each option's parser must emit exactly the shape Loop 001 froze:

```ts
type NoteGroup = { measure: number; beat: number; hand: 'left' | 'right'; notes: number[] }
```

An option that cannot produce this shape has failed, and that failure is itself the finding.

## Measurement protocol

For each of the three options, produce the same table. **Numbers, not adjectives.**

| Dimension | How measured |
|---|---|
| Events emitted | `length` of the resulting `NoteGroup[]` |
| Measure provenance | count and % of events whose `measure` came from an explicit field in the file vs. was computed or inferred |
| Beat provenance | count and % of events whose `beat` came from an explicit field vs. was derived from ticks, divisions, or a tempo map |
| Hand provenance | count and % of events whose `hand` came from an explicit staff/track/channel field vs. was inferred by a heuristic |
| Heuristics used | one line naming each inference rule applied, or "none" |
| Dependencies | package name, version, and whether it is maintained |
| Parser size | non-blank, non-comment lines in the option's parser |
| Failures hit | each parse error, unsupported construct, or silently dropped element |

**Hand provenance is the decisive dimension.** Loop 001's search filters by hand and is meaningless without a trustworthy hand assignment. An option that infers hand by a pitch threshold or a note-count rule must say so plainly and report what fraction of events rest on that guess.

Option C (curated corpus) is measured too. Its parser is a human, so record instead: time to author 16 bars by hand, and which of measure/beat/hand it gets for free.

## Correctness spot-check

Pick five measures spread across the piece. For each, emit a rendered table of the right-hand and left-hand `NoteGroup`s the parser produced, with pitches shown as sharp note names, not raw MIDI integers.

The executor **must not** assert whether these match the real score. It renders them for human verification and states explicitly that they are unverified. Asserting score facts from parser output is exactly the failure mode Loop 001's invariants forbade.

Then run Loop 001's own search, unmodified, against each option's output and record whether the frozen semantics still behave: hand filtering, contiguity, exact group equality.

## Verifier

| # | Check | Passing result |
|---|---|---|
| 1 | `git diff --exit-code package.json package-lock.json` | exit 0; root dependencies untouched |
| 2 | `npm test` at root | 10 tests, 10 passed |
| 3 | `npm run build` at root | succeeds |
| 4 | `grep -rn "spike/" app lib components tests` | no matches |
| 5 | Results file | contains the full measurement table for all three options, no cell empty or "N/A" without a reason |
| 6 | Spot-check section | five measures rendered for both hands, each carrying an explicit "unverified against the score" statement |
| 7 | Loop 001 search re-run | recorded pass/fail per option |
| 8 | ADR file exists | `docs/adr/0001-score-data-source.md`, `Status: Proposed` |
| 9 | ADR content | names a recommended option, states the evidence that drove it, and names what the choice forecloses |
| 10 | ADR honesty | contains an explicit section listing what the evidence does **not** establish |
| 11 | `git status --short` | shows only in-scope paths; `spike/` internals ignored |

Check 10 exists because a decision loop that reports only confirming evidence is worse than no decision loop.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- A parse failure on a real file is **data, not a defect**. Record it in the failures row and continue; do not spend a repair attempt making a stubborn file parse.
- Repair attempts are for the spike harness failing to run, or for a root-level verifier breaking.
- Do not hand-edit `data/spike/` inputs to make a parser succeed. That destroys the measurement.
- Do not modify `lib/music/phrase-search.ts` to accommodate an option. If an option requires changing the frozen search, stop at `NEEDS_ARCHITECTURE_DECISION` — that is a finding of the highest value this loop can produce.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | all 11 checks pass; proposed ADR written; evidence recorded |
| `BLOCKED` | `data/spike/` missing, empty, or containing files of different pieces |
| `NEEDS_ARCHITECTURE_DECISION` | an option can only work by changing the frozen `NoteGroup` contract or Loop 001's search semantics |
| `NEEDS_HUMAN_DECISION` | the measurements do not separate the options — no option wins on hand provenance and none fails outright |
| `OUT_OF_SCOPE` | success appears to require touching `app/`, `lib/`, `components/`, `tests/`, or root dependencies |
| `FAILED_VERIFICATION` | a required check still fails after 2 repair attempts |

`NEEDS_HUMAN_DECISION` here is a legitimate success. Three options measured and genuinely tied is a real result; a fabricated tiebreak is not.

## Explicit exclusions

- Building the production ingestion pipeline. That is Loop 004, specced only after this ADR is ratified.
- Ingesting more than the one spike piece.
- Rendering, playback, MIDI hardware, persistence, APIs, or services.
- Changing Loop 001's search, UI, or fixture.
- Downloading score files from anywhere.

## Handoff artifact

- `spike/RESULTS.md` — the measurement tables and spot-check
- `docs/adr/0001-score-data-source.md` — proposed ADR
- `docs/sprints/output/003-score-source-output.md` — evidence record with one terminal state

## Memory and update behaviour

On ratification, the Mode 3 review updates `docs/planning/product-loop-map.md`: replace the two `UNKNOWN` nodes in the Piece lifecycle, move Open Decision 3 (is there a server) forward or resolve it, and spec Loop 004.
