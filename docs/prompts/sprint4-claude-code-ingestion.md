# Agent Handoff: MusicXML Ingestion

**Assigned agent: Claude Code**
Loop spec: `docs/planning/loops/004-musicxml-ingestion.md` (revision 2)
Sprint: 4
Prepared: 2026-08-02
Sprint output: `docs/sprints/output/004-musicxml-ingestion-output.md`

Self-contained. Execute from this document alone. Do not rely on prior conversation.

Repository: `/Users/b/dev/chord-selector-app`, branch `phrase-lookup`. **Do not push. Do not merge to `main`.**

## 1. Goal

The Phrase Lookup tab runs a hardcoded query against a 26-event hand-authored fixture through a single-staff filter. Two ADRs say that is wrong.

> From "the only searchable piece is a fixture authored to satisfy the search"
> to "the real Moonlight Sonata first movement is ingested from MusicXML into the canonical merged onset stream, and the founding query returns its one true match."

## 2. Why this loop exists — read this before coding

A macro-layer spike parsed the real score and found two things that overturned earlier assumptions.

**ADR 0001:** MusicXML is the source. 1210 of 1210 notes carry an explicit `<staff>` — zero heuristic inference.

**ADR 0002:** *staff is not hand*, and searching a single staff is broken. The user's actual stuck point is measure 12 beat 4, where the score reads:

```
m12 b4.00   staff 1: [F#4]      staff 2: [F#3]     ← an F# octave, split across staves
m12 b4.33                       staff 2: [C#4]
m12 b4.67                       staff 2: [E4]
```

Searching either staff alone returns **0**. Searching the merged onset stream returns **1** — the correct one. That is why this loop merges staves.

Loop 008 deliberately ported the single-hand filter **unchanged**, so its removal shows up as *this loop's* diff. Removing it is Task 4.

## 3. Environment facts — verified, do not rediscover

| Fact | Consequence |
|---|---|
| `jsdom ^27.1.0` is a declared devDependency | use it for XML. **Node has no built-in XML parser.** Adds no dependency. |
| No `typescript`, `tsx`, `ts-node`, or `vite-node` installed | **the ingestion script must be plain JavaScript ESM (`.mjs`)**, run with `node`. A `.ts` script cannot be executed. |
| `npm run build` is `vite build` | **it does NOT typecheck.** esbuild strips types without checking. |
| `fflate` is present but **transitive only** | do not import it. |
| `npm test` is `vitest run`, jsdom env, `globals: true` | assertions go in `src/tests/*.test.ts` |

**The missing typecheck matters.** In the previous repo, `next build` typechecked, and that is exactly what caught the earlier ES5 spread bug. Nothing here would. Do not treat a green build as type safety — put real assertions in vitest.

## 4. Context files

1. `docs/planning/loops/004-musicxml-ingestion.md`
2. `docs/adr/0001-score-data-source.md`
3. `docs/adr/0002-merged-onset-stream.md`
4. `src/lib/music/types.ts`, `phrase-search.ts`, `pitch-label.ts`
5. `src/tests/phraseSearch.test.ts`
6. `src/components/PhraseLookupTab.tsx`
7. `package.json`, `vitest.config.ts`

Record any other file inspected, and why.

## 5. Tasks

### Task 0: Archive this handoff

Copy `docs/agent-handoff.md` verbatim to `docs/prompts/sprint4-claude-code-ingestion.md`. Verify with `cmp -s`, record the exit code.

### Task 1: Extract the score

`data/spike/moonlight-sonata.mxl` is a ZIP. Extract it **once** with the `unzip` CLI. The score entry is `lg-30448188.xml` (596 KB); `META-INF/container.xml` names it.

Commit the plain XML as `data/spike/moonlight-sonata.musicxml`. Keep the `.mxl` as provenance. The parser reads plain XML only.

Do not add a ZIP library. If `unzip` is unavailable, the fallback is Node's built-in `zlib.inflateRawSync` over the local file headers. Needing a dependency here is `NEEDS_ARCHITECTURE_DECISION`.

### Task 2: Write the ingestion script

`scripts/ingest-musicxml.mjs` — plain JavaScript ESM, run with `node`. Use jsdom's DOM parsing for the XML.

**The algorithm is already proven by the spike. Reimplement it; do not rediscover it.**

Per `<measure>`, maintain a tick position starting at 0:

- `<backup>`: subtract its `<duration>`. **This is how MusicXML switches staves mid-measure — not optional. Omitting it is the single most likely cause of a wrong event count.**
- `<forward>`: add its `<duration>`.
- `<note>` with `<chord/>`: place at the *previous* onset. Do not advance.
- `<note>` with `<grace>`: no `<duration>`. Place it, do not advance.
- any other `<note>`: place at the current position, record that position as the previous onset, then advance by `<duration>`.
- `<rest>`: advances position, contributes no pitch.
- `<divisions>` appears in `<attributes>` and may change mid-score. Track it per measure.

MIDI number from `<pitch>`:

```
(octave + 1) * 12 + step + alter        where  C=0 D=2 E=4 F=5 G=7 A=9 B=11
```

Then **merge**: every note sharing `(measure, tick)` — across **both** staves — becomes one `NoteGroup`. Emit in onset order.

Write the result to `src/data/pieces/moonlight-sonata.ts` as a committed artifact.

### Task 3: Extend the types

Store the **integer tick**; derive the display beat. Triplets against `divisions=12` produce 1.33 and 1.67, and float beats invite equality bugs in matching. Keep `divisions` available so beat can be derived. Retain staff as per-note or per-group metadata for display — **never as a filter**.

### Task 4: Land ADR 0002

- Remove `hand` as a required filter from `PhraseQuery`.
- `findPhraseMatches` operates on the merged stream.
- **Every other frozen semantic survives unchanged**: deduplicated order-independent groups within a group, ordered contiguous matching, exact group equality, register sensitivity, empty query returns nothing, matches may cross a measure boundary.
- The ported test `"hand selection prevents cross-hand matches"` is **expected** to change. Rewrite it deliberately — ideally into a test asserting that a cross-staff phrase *is* found — and state in the output exactly what replaced it. **Every other ported test stays as-is.**

### Task 5: Tests

In `src/tests/`, using vitest. Cover:

1. measures parsed = 69
2. pitched notes placed = 1169
3. staff assignments inferred = 0
4. merged onset events = 823
5. pitch range = MIDI 29–87, 55 distinct pitches
6. **founding query** `[54,66] → [61] → [64]` (F#3+F#4 → C#4 → E4) returns **exactly 1 match at measure 12, beat 4**
7. **staff-split control**: the same query returns **0** against staff 1 alone and **0** against staff 2 alone
8. measure 1 spot-check: staff 1 `[56] [61] [64]` (G#3, C#4, E4) triplets; staff 2 `[37, 49]` (C#2+C#3)
9. the surviving frozen semantics from Loop 001

Test 7 is the most important in the loop. A parser that returns the right answer for the wrong reason is worse than one that fails.

### Task 6: Point the smoke surface at the real piece

Update `src/components/PhraseLookupTab.tsx` to run the founding query against the ingested movement. **Keep it minimal and keep it marked temporary** — Loop 006 replaces it. Do not build a query builder, pitch grid, or keyboard here.

### Task 7: Verify and record

Run Section 6, write the sprint output.

## 6. Verification requirements

| # | Check | Passing result |
|---|---|---|
| 1 | `npm test` | all pass, including surviving ported tests and the pre-existing chordVoicings suite |
| 2 | `npm run build` | succeeds — and is **not** treated as a typecheck |
| 3 | Measures parsed | 69 |
| 4 | Pitched notes placed | 1169 |
| 5 | Staff inference count | 0 |
| 6 | Merged onset events | **823** |
| 7 | Pitch range | MIDI 29–87, 55 distinct |
| 8 | **Founding query** | exactly 1 match, measure 12, beat 4 |
| 9 | **Staff-split control** | 0 in staff 1 alone, 0 in staff 2 alone |
| 10 | Measure 1 spot-check | as in Task 5 item 8 |
| 11 | Tick storage | no float beat participates in an equality comparison |
| 12 | `git diff --exit-code package.json package-lock.json` | exit 0 |
| 13 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing — jsdom belongs to the build script, never to shipped modules |
| 14 | Reproducibility | re-running `node scripts/ingest-musicxml.mjs` regenerates the artifact **byte-identically** |
| 15 | Smoke surface (browser) | Phrase Lookup renders the founding query's single m12 b4 match |

Check 14 is what makes the artifact trustworthy — a committed blob nobody can regenerate is a liability. Check 13 keeps jsdom out of the shipped bundle.

**Check 15 requires a browser.** Stated up front deliberately: an earlier loop finished its implementation, passed every automated check, then stranded at `BLOCKED` because its session had no browser. If you have no browser backend, run 1–14, mark 15 `not run` with the reason, and end at `BLOCKED`. **Do not substitute code inspection for a required check.** The macro layer will close it, as it has twice before.

## 7. Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not adjust a target number to match your parser.** These came from a working probe against this exact file. A mismatch means the parser is wrong — most likely `<backup>` handling. If you believe a target is itself wrong, stop at `NEEDS_HUMAN_DECISION` and show the discrepancy.
- Do not hand-edit anything in `data/spike/` to make parsing succeed. That destroys the measurement.
- Do not add a dependency as a repair.
- Weaken or delete no test except the one ADR 0002 explicitly supersedes.
- Record failure signal, diagnosis, change, and rerun result for each attempt.

## 8. Forbidden actions

- Adding, removing, or updating any npm dependency — including `typescript`
- Editing `ByKeyTab.tsx`, `ByNameTab.tsx`, `KeyboardDiagram.tsx`, `chordData.ts`, `chordDatabase.ts`, `chordVoicings.test.ts`, `vite.config.ts`, `vitest.config.ts`, `vercel.json`
- The two-row keyboard (Loop 006)
- Relaxed, fuzzy, transposition-invariant, or shape matching (Loop 007) — **exact matching only**, so the founding query's single match is unambiguous evidence
- Ranking or scoring
- Ingesting any second piece
- Runtime parsing of the 596 KB XML in the browser
- `git push`, merging to `main`, rewriting history
- Writing anything in `/Users/b/dev/chordsense`

## 9. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–15 pass, evidence recorded |
| `BLOCKED` | the `.mxl` is missing or unreadable; or no browser for check 15 with 1–14 passing |
| `NEEDS_ARCHITECTURE_DECISION` | success appears to require a ZIP or XML dependency, a runtime browser parse, or a `NoteGroup` change beyond ticks and staff metadata |
| `NEEDS_HUMAN_DECISION` | a target number is unreachable and you believe the target is wrong |
| `OUT_OF_SCOPE` | success appears to require the keyboard, fuzzy matching, ranking, or a second piece |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

Do not continue into Loop 006 or 007 after reaching a terminal state.

## 10. Output requirements

Write `docs/sprints/output/004-musicxml-ingestion-output.md`:

- exactly one terminal state
- the attempted state transition and outcome
- Task 0 archive path and `cmp` exit code
- every changed file and whether it was in scope
- all 15 verification results **with actual output** — quote the real numbers for checks 3–10, not "as expected"
- the founding query and staff-split control results verbatim
- exactly what replaced the superseded hand-filter test, and confirmation that every other ported test is unchanged
- repair attempts used, including zero
- stop rules triggered, if any
- out-of-scope pressure encountered
- risks and open questions
- exactly one next recommended action

**Also record, without acting on it:** this repo has no TypeScript typechecking. `typescript` is not a declared dependency and `vite build` only strips types. A `tsc --noEmit` script would be a real improvement and requires adding a dependency, which the standing contract forbids without an explicit decision. Recommend it; do not do it.

When `DONE`, the next recommended action must be "accept current loop as complete."
