# Loop Spec 004: MusicXML Ingestion

Loop type: **Completion**
Status: engineered, awaiting executor assignment
Executor: TBD
Depends on: Loop 002 DONE. Independent of Loops 005 and 006.
Blocks: Loop 006's corpus-constrained highlighting, Loop 007's eval harness

## Trigger

ADR 0001 selects MusicXML. ADR 0002 replaces the staff-split stream with a merged onset stream. Neither exists in code — `/lookup` still searches a 26-event hand-authored fixture through a single-staff filter.

## Goal

Transition from **"the only searchable piece is a fixture authored to satisfy the search"** to **"the real Moonlight Sonata first movement is ingested from MusicXML into the canonical merged onset stream, and the founding query returns its one true match."**

## Reference: the algorithm is already proven

A macro-layer spike parsed `data/spike/moonlight-sonata.mxl` with stdlib XML and produced the target numbers. The executor reimplements this in TypeScript; it does not need to rediscover it.

Per `<measure>`, maintain a tick position starting at 0:

- `<backup>`: subtract `<duration>` from position. This is how MusicXML switches staves mid-measure — it is not optional.
- `<forward>`: add `<duration>`.
- `<note>` with `<chord/>`: place at the *previous* onset, not the current position. Do not advance.
- `<note>` with `<grace>`: has no `<duration>`. Place it, do not advance.
- Other `<note>`: place at position, record position as previous onset, then advance by `<duration>`.
- `<rest>`: advances position, contributes no pitch.
- `<divisions>` is declared in `<attributes>` and may change mid-score. Track it per measure.

MIDI number from `<pitch>`: `(octave + 1) * 12 + step + alter`, with `C=0 D=2 E=4 F=5 G=7 A=9 B=11`.

## Target numbers

The spike's output is the acceptance target. Deviation is a defect in the parser, not a new finding.

| Quantity | Required value |
|---|---|
| Measures parsed | 69 |
| Pitched notes placed | 1169 |
| Notes with explicit `<staff>` | 1210 of 1210 |
| Staff assignments inferred | 0 |
| Merged onset events | 823 |
| Staff-split events (if computed) | 938 |
| Full pitch range | MIDI 29 (F1) to 87 (D#6) |
| Distinct pitches | 55 |

## The founding query

The single most important test in this loop:

```
[F#3 + F#4] → [C#4] → [E4]
```

Against the merged stream this must return **exactly one match, at measure 12, beat 4**. Not zero, not two. This is the passage the user actually gets stuck on, and it is the reason ADR 0002 exists.

## Scope

In scope:

- `lib/music/musicxml.ts` — the parser
- `lib/music/types.ts` — extend for ticks and staff metadata
- `lib/music/phrase-search.ts` — remove the hand filter per ADR 0002
- `data/pieces/` — the ingested piece artifact
- `scripts/` — an ingestion script, if ingestion is build-time
- `tests/` — new suites
- `components/phrase-lookup/PhraseLookup.tsx` — **only** to remove the now-meaningless hand selector and point at the real piece
- `docs/sprints/output/004-musicxml-ingestion-output.md`, `docs/prompts/sprint4-<executor>-ingestion.md`

Explicitly out of scope:

- The virtual keyboard. That is Loop 006.
- Relaxed, fuzzy, transposition-invariant, or shape matching. That is Loop 007. **Exact matching only in this loop**, so that the founding query's single match is unambiguous evidence.
- Ranking and scoring.
- Any second piece. One piece, ingested correctly.
- Repairing Tailwind. That is Loop 005.
- Any npm dependency. The spike proved none is needed.
- Uncompressed `.musicxml`, multi-part scores, repeats, voltas, transposing instruments.

## Open decision the executor must resolve, not invent

**Build-time or runtime parsing?** The `.mxl` is a ZIP; unzipping in the browser needs a dependency, which is forbidden. Therefore parse at build time or via a script, and commit the resulting stream as a TypeScript or JSON artifact. If the executor concludes runtime parsing is required, that is `NEEDS_ARCHITECTURE_DECISION` — do not add a ZIP library to work around it.

## Verifier

| # | Check | Passing result |
|---|---|---|
| 1 | `npm test` | all pass, including every pre-existing Loop 001 test that survives ADR 0002 |
| 2 | `npm run build` | succeeds |
| 3 | Measure count | 69 |
| 4 | Pitched notes placed | 1169 |
| 5 | Staff inference count | 0 |
| 6 | Merged onset event count | 823 |
| 7 | Pitch range | MIDI 29–87 |
| 8 | **Founding query** | exactly 1 match, measure 12, beat 4 |
| 9 | Staff-split control | the same query returns 0 in each staff alone — proves the merge is what found it |
| 10 | Measure 1 spot-check | upper staff `[G#3] [C#4] [E4]` triplets; lower staff `[C#2+C#3]` |
| 11 | Tick storage | beats stored as integer ticks; no float beat value participates in an equality comparison |
| 12 | `git diff --exit-code package.json package-lock.json` | exit 0 |
| 13 | Purity | `grep -rn "react\|document\|window\|fs\|fetch" lib/music/` returns nothing |

Check 9 is the one that matters most. A parser that returns the right answer for the wrong reason is worse than one that fails.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- Do not adjust a target number to match the parser's output. The numbers came from a working probe; a mismatch means the TypeScript parser is wrong. If the executor believes a target number is itself wrong, that is `NEEDS_HUMAN_DECISION` with the discrepancy shown — not a silent edit.
- Do not weaken or delete a Loop 001 test to make it pass. Tests that assert single-hand filtering are *expected* to change under ADR 0002; rewrite those deliberately and say so. Every other test stays.
- Do not add a dependency as a repair.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | all 13 checks pass, evidence recorded |
| `NEEDS_ARCHITECTURE_DECISION` | success appears to require runtime ZIP handling, a parsing dependency, or a change to the `NoteGroup` contract beyond ticks and staff metadata |
| `NEEDS_HUMAN_DECISION` | a target number is unreachable and the executor believes the target is wrong |
| `OUT_OF_SCOPE` | success appears to require the keyboard, fuzzy matching, Tailwind, or a second piece |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |
| `BLOCKED` | `data/spike/moonlight-sonata.mxl` is missing or unreadable |

## Handoff artifact

`docs/sprints/output/004-musicxml-ingestion-output.md`, with all 13 checks, actual output for the founding query and the staff-split control, one terminal state, and one next recommended action.
