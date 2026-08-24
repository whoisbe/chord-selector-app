# Loop Spec 004: MusicXML Ingestion

Loop type: **Completion**
Status: **revision 2** — retargeted to `chord-selector-app` after Loop 008. Engineered, awaiting executor assignment.
Executor: **Claude Code**
Depends on: Loop 008 DONE
Blocks: Loop 006's corpus-constrained highlighting, Loop 007's eval harness

> Revision 2 changes paths, tooling, and the verifier. The **evidence and target numbers from revision 1 are unchanged** — they came from a working probe, not from the old repo's structure.

## Trigger

ADR 0001 selects MusicXML. ADR 0002 replaces the staff-split stream with a merged onset stream. Neither exists in code — the Phrase Lookup tab still runs a hardcoded query against a 26-event hand-authored fixture through a single-staff filter.

## Goal

From **"the only searchable piece is a fixture authored to satisfy the search"** to **"the real Moonlight Sonata first movement is ingested from MusicXML into the canonical merged onset stream, and the founding query returns its one true match."**

## Environment facts, verified — do not rediscover

| Fact | Consequence |
|---|---|
| `jsdom ^27.1.0` is a **declared devDependency** | use its `DOMParser` for XML. Node has no built-in XML parser. Adds no dependency. |
| No `typescript`, `tsx`, `ts-node`, or `vite-node` is installed | **the ingestion script must be plain JavaScript ESM** (`.mjs`), run with `node`. A `.ts` script cannot be executed. |
| `npm run build` is `vite build` | **it does NOT typecheck.** esbuild strips types without checking them. |
| `fflate` exists but is **transitive only** | do not import it. Nothing guarantees it stays. |
| `npm test` is `vitest run`, jsdom environment, `globals: true` | all assertions go in `src/tests/*.test.ts` |

**The missing typecheck matters.** In chordsense, `next build` typechecked, and that is exactly what caught Loop 001's ES5 spread bug and consumed its one repair attempt. Here nothing would catch it. Do not treat a green build as type safety; put real assertions in vitest.

## Input file

`data/spike/moonlight-sonata.mxl` is a ZIP. Reading it needs either a dependency or a hand-rolled ZIP reader, and neither is warranted.

**Task 1 extracts it once**, with the `unzip` CLI, committing the plain XML as `data/spike/moonlight-sonata.musicxml`. The `.mxl` stays as provenance. The parser reads plain XML only.

Inside the archive the score is `lg-30448188.xml` (596 KB); `META-INF/container.xml` names it. Rename it to `moonlight-sonata.musicxml` on extraction.

If `unzip` is unavailable, the documented fallback is `zlib.inflateRawSync` over the local file headers — Node built-in, no dependency. Do not add a ZIP library; that is `NEEDS_ARCHITECTURE_DECISION`.

## Reference: the algorithm is proven

A macro-layer spike parsed this file with a stdlib XML walk and produced the target numbers. Reimplement it; do not rediscover it.

Per `<measure>`, maintain a tick position starting at 0:

- `<backup>`: subtract `<duration>`. **This is how MusicXML switches staves mid-measure — not optional.**
- `<forward>`: add `<duration>`.
- `<note>` with `<chord/>`: place at the *previous* onset. Do not advance.
- `<note>` with `<grace>`: no `<duration>`. Place it, do not advance.
- other `<note>`: place at position, record position as previous onset, advance by `<duration>`.
- `<rest>`: advances, contributes no pitch.
- `<divisions>` is declared in `<attributes>` and may change mid-score. Track per measure.

MIDI from `<pitch>`: `(octave + 1) * 12 + step + alter`, with `C=0 D=2 E=4 F=5 G=7 A=9 B=11`.

Merge to the canonical stream by grouping every note sharing `(measure, tick)` across **both** staves into one `NoteGroup`.

## Target numbers

The spike's output is the acceptance target. A deviation is a parser defect, not a new finding.

| Quantity | Required |
|---|---|
| Measures | 69 |
| Pitched notes placed | 1169 |
| Notes with explicit `<staff>` | 1210 of 1210 |
| Staff assignments inferred | 0 |
| **Merged onset events** | **823** |
| Staff-split events, if computed | 938 |
| Pitch range | MIDI 29 (F1) – 87 (D#6) |
| Distinct pitches | 55 |

## The founding query

```
[F#3 + F#4] → [C#4] → [E4]
```

Against the merged stream: **exactly one match, measure 12, beat 4.** Not zero, not two. This is the passage the user actually gets stuck on and the reason ADR 0002 exists.

## Contract change — ADR 0002 lands here

This is the loop that removes the single-hand filter. Loop 008 deliberately ported it unchanged so the removal shows up as this loop's diff.

- `PhraseQuery.hand` stops being a required filter.
- `findPhraseMatches` operates on the merged stream.
- Every other frozen semantic survives: deduplicated order-independent groups, ordered contiguous matching, exact group equality, register sensitivity.
- Loop 001's test `"hand selection prevents cross-hand matches"` is **expected** to change. Rewrite it deliberately and state what replaced it. Every other ported test stays.
- Store the integer **tick**; derive the display beat. Triplets against `divisions=12` give 1.33/1.67, and float beats invite equality bugs.

## Scope

In scope: `scripts/ingest-musicxml.mjs`, `src/lib/music/musicxml.ts`, `src/lib/music/types.ts`, `src/lib/music/phrase-search.ts`, `src/data/pieces/`, `src/tests/`, `data/spike/`, `src/components/PhraseLookupTab.tsx` (point the smoke surface at the real piece and the founding query — keep it minimal and still marked temporary), plus prompt archive and sprint output.

Explicitly out of scope: the two-row keyboard (006); relaxed, fuzzy, transposition-invariant or shape matching (007) — **exact matching only, so the founding query's single match is unambiguous evidence**; ranking; any second piece; `ByKeyTab`, `ByNameTab`, `KeyboardDiagram`, `chordData`, `chordDatabase`, `chordVoicings.test.ts`; any new npm dependency; `git push` or merging to `main`.

## Verifier

| # | Check | Passing result |
|---|---|---|
| 1 | `npm test` | all pass, including surviving ported tests |
| 2 | `npm run build` | succeeds — **and is not treated as a typecheck** |
| 3 | Measures parsed | 69 |
| 4 | Pitched notes placed | 1169 |
| 5 | Staff inference count | 0 |
| 6 | Merged onset events | 823 |
| 7 | Pitch range | MIDI 29–87 |
| 8 | **Founding query** | exactly 1 match, measure 12, beat 4 |
| 9 | **Staff-split control** | the same query returns 0 in each staff alone |
| 10 | Measure 1 spot-check | staff 1 `[G#3] [C#4] [E4]` triplets; staff 2 `[C#2+C#3]` |
| 11 | Tick storage | no float beat participates in an equality comparison |
| 12 | `git diff --exit-code package.json package-lock.json` | exit 0 |
| 13 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing — jsdom belongs to the build script, never to shipped modules |
| 14 | Reproducibility | re-running `node scripts/ingest-musicxml.mjs` regenerates the committed artifact byte-identically |
| 15 | Smoke surface (browser) | Phrase Lookup renders the founding query's single m12 b4 match |

Check 9 is the one that matters most: a parser returning the right answer for the wrong reason is worse than one that fails. Check 14 is what makes the artifact trustworthy — a committed blob nobody can regenerate is a liability. Check 13 keeps jsdom out of the bundle.

**Check 15 needs a browser**, stated up front. No browser: run 1–14, mark 15 `not run`, end at `BLOCKED`, do not substitute inspection. The macro layer closes it, as it did for Loops 001 and 008.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not adjust a target number to match the parser.** The numbers came from a working probe. A mismatch means the parser is wrong. If you believe a target is itself wrong, stop at `NEEDS_HUMAN_DECISION` and show the discrepancy.
- Do not hand-edit `data/spike/` inputs to make parsing succeed.
- Do not add a dependency as a repair.
- Weaken no test except the one ADR 0002 explicitly supersedes.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–15 pass, evidence recorded |
| `BLOCKED` | the `.mxl` is missing or unreadable; or no browser for 15 with 1–14 passing |
| `NEEDS_ARCHITECTURE_DECISION` | success appears to require a ZIP or XML dependency, a runtime parse of the 596 KB XML, or a `NoteGroup` change beyond ticks and staff metadata |
| `NEEDS_HUMAN_DECISION` | a target number is unreachable and you believe the target is wrong |
| `OUT_OF_SCOPE` | success appears to require the keyboard, fuzzy matching, or a second piece |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

## Open decision to raise, not resolve

**This repo has no TypeScript typechecking.** `typescript` is not a declared dependency and `vite build` only strips types. A `tsc --noEmit` typecheck script would be a real improvement, and adding it means adding a dependency — which the standing contract forbids without an explicit decision.

Record this in the sprint output as a recommendation. **Do not act on it in this loop.**
