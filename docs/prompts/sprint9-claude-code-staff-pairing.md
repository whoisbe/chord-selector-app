# Agent Handoff: Staff/Pitch Pairing Repair

**Assigned agent: Claude Code**
Loop spec: `docs/planning/loops/009-staff-pairing-repair.md`
Sprint: 9
Prepared: 2026-08-02
Sprint output: `docs/sprints/output/009-staff-pairing-repair-output.md`

Self-contained. Execute from this document alone. Do not rely on prior conversation.

Repository: `/Users/b/dev/chord-selector-app`, branch `phrase-lookup`. **Do not push. Do not merge to `main`.**

## 1. The defect

Loop 004 was accepted. Its parse is correct — the committed artifact was compared event-for-event against an independent implementation and agreed on all 823 events. This loop does **not** revisit parsing.

The defect is in how the new `staves` array survives the search. In `src/lib/music/phrase-search.ts`:

```ts
export function normalizeNotes(notes: readonly number[]): number[] {
  return Array.from(new Set(notes)).sort((left, right) => left - right)
}

function copyGroup(group: NoteGroup): NoteGroup {
  return { ...group, notes: normalizeNotes(group.notes) }
}
```

`notes` is deduplicated **and sorted**. `staves` — the parallel array Loop 004 introduced — is spread through **unchanged**. They desynchronize in every `matchedGroups` and `followingGroups` entry `findPhraseMatches` returns.

**115 of 823 groups span more than one staff. All 115 mispair.** That is every group where staff data carries information at all.

Including the founding match:

```
m12 beat 4
  stored:  notes [F#4, F#3]   staves [1, 2]
  after:   notes [F#3, F#4]   staves [1, 2]   ← unchanged
     F#3: claimed staff 1, actually staff 2
     F#4: claimed staff 2, actually staff 1
```

The one match this project exists to find has inverted staff data the moment it leaves the search.

Nothing reads `staves` yet, which is exactly why all 15 of Loop 004's checks passed honestly. ADR 0002 retains staff for display and ranking, and Loop 006 renders **two rows keyed on staff** — it would put notes on the wrong row, silently, in the very cross-staff case ADR 0002 exists to serve.

## 2. Goal

> From "staff metadata is silently wrong for every cross-staff group the search returns"
> to "staff information provably corresponds to its pitch for every group the search returns, enforced by a test."

## 3. The invariant — satisfy this, do not copy an implementation

> For every `NoteGroup` returned by `findPhraseMatches`, each pitch's associated staff must equal the staff that pitch had in the source piece.

Choose the design and record your reasoning in the output. Options, none mandated:

| Approach | Trade-off |
|---|---|
| Sort `notes` and `staves` together as pairs | Smallest diff, keeps the current shape. |
| Replace both with one array of `{ pitch, staff }` | Makes desync structurally impossible. Larger diff across types, script, artifact, tests. |
| Pitch-keyed staff map | Order-independent by construction, but loses information if one pitch ever appears on both staves at one onset. |
| Drop `staves` from `copyGroup`'s output | Shipping no data beats shipping wrong data, but defers what Loop 006 needs. |

**Prefer a design where the desync is structurally impossible over one that fixes this single function.** A second function that touches `notes` later would reintroduce the bug otherwise.

## 4. Also fix: duplicate pitches in the artifact

Ten groups contain the same pitch twice, from two voices colliding **on the same staff** — e.g. m15 tick 0 has `B3` twice, both staff 1. Harmless to matching, because `normalizeNotes` deduplicates before comparison, but redundant, and they inflate any downstream pitch counting.

**Deduplicate on the `(pitch, staff)` pair, not on pitch alone.** Deduplicating by pitch alone would discard genuine cross-staff doubling if this or a future piece contains any.

## 5. Also do: commit Loop 004

Loop 004's work is uncommitted — its handoff omitted a commit task. That was a macro-layer omission, not an executor failure.

Two commits, in this order, so history shows the defect and the fix separately:

1. **Loop 004's ingestion work as it stands** — script, artifact, extracted `.musicxml`, type and search changes, tests, smoke surface, docs
2. **This loop's repair**

Do this before applying your fix, so commit 1 is genuinely Loop 004's state.

## 6. Context files

1. `docs/planning/loops/009-staff-pairing-repair.md`
2. `docs/adr/0002-merged-onset-stream.md`
3. `src/lib/music/phrase-search.ts`, `types.ts`
4. `scripts/ingest-musicxml.mjs`
5. `src/data/pieces/moonlight-sonata.ts`
6. `src/tests/phraseSearch.test.ts`, `src/tests/musicxmlIngestion.test.ts`

## 7. Tasks

**Task 0.** Copy `docs/agent-handoff.md` verbatim to `docs/prompts/sprint9-claude-code-staff-pairing.md`. Verify with `cmp -s`, record the exit code.

**Task 1.** Commit Loop 004's work as-is. Real commit message. Do not push.

**Task 2.** Establish the invariant in Section 3. Change `scripts/ingest-musicxml.mjs` and regenerate the artifact if the shape changes — **never hand-edit `src/data/pieces/moonlight-sonata.ts`.**

**Task 3.** Deduplicate on `(pitch, staff)` pairs in the ingestion script; regenerate.

**Task 4.** Add the staff-pairing test. It must assert against **all 115** cross-staff groups, and must assert the count is 115 so a change in artifact shape is noticed rather than silently passing.

**Task 5.** Run Section 8, write the output, commit the repair.

## 8. Verification requirements

| # | Check | Passing result |
|---|---|---|
| 1 | `npm test` | all pass |
| 2 | `npm run build` | succeeds — **not** a typecheck; see the standing note below |
| 3 | **Staff pairing** | for **all 115** cross-staff groups, every pitch returned by `findPhraseMatches` carries the staff it has in the source artifact |
| 4 | Count asserted | the test asserts 115 explicitly |
| 5 | Founding-match pairing | m12 b4 returns F#3→staff 2, F#4→staff 1 |
| 6 | No duplicate pairs | no group contains the same `(pitch, staff)` pair twice |
| 7 | Event count | **823**, unchanged |
| 8 | Pitch sets | every group's set of distinct pitches identical to before this loop |
| 9 | Founding query | still exactly 1 match, m12 beat 4 |
| 10 | Staff-split control | still 0 in staff 1 alone, 0 in staff 2 alone |
| 11 | Loop 004 numbers | 69 measures, 1169 notes, 0 inferred, MIDI 29–87, 55 distinct — unchanged |
| 12 | Reproducibility | re-running the ingestion script regenerates the artifact byte-identically |
| 13 | `git diff --exit-code package.json package-lock.json` | exit 0 |
| 14 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing |
| 15 | Commits | exactly two, in the stated order, on `phrase-lookup`, unpushed |
| 16 | Smoke surface (browser) | Phrase Lookup renders the single m12 b4 match |

Check 3 is the loop. Check 8 is the regression guard — the repair must change how staff is *associated*, never *which* pitches are in a group.

**Check 16 requires a browser and a running dev server.** Stated up front: an earlier loop finished, passed every automated check, then stranded at `BLOCKED` for want of a browser. If you have no browser backend, run 1–15, mark 16 `not run` with the reason, end at `BLOCKED`, and **do not substitute code inspection**. The macro layer closes it.

Check 16 also carries Loop 004's check 15, which was executor-reported but never macro-verified because the dev server went down during review. Treat it as covering both.

## 9. Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Never hand-edit the artifact.** Change the script and regenerate; check 12 catches hand edits.
- **Do not change the parsing algorithm.** It was verified event-for-event against an independent implementation and is correct. Touching it is `OUT_OF_SCOPE`.
- Do not weaken check 3 to a sample. All 115, every time.
- Do not add a dependency.
- Record failure signal, diagnosis, change, and rerun result per attempt.

## 10. Forbidden actions

- Adding, removing, or updating any npm dependency, including `typescript`
- Editing `ByKeyTab.tsx`, `ByNameTab.tsx`, `KeyboardDiagram.tsx`, `chordData.ts`, `chordDatabase.ts`, `chordVoicings.test.ts`, `vite.config.ts`, `vitest.config.ts`, `vercel.json`
- The two-row keyboard (Loop 006); fuzzy or shape matching (Loop 007); ranking or scoring
- Actually *using* staff for anything — this loop makes it correct, not useful
- Re-parsing or re-deriving the score
- `git push`, merging to `main`, rewriting history
- Writing anything in `/Users/b/dev/chordsense`

## 11. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–16 pass, evidence recorded |
| `BLOCKED` | no browser or dev server for check 16, with 1–15 passing |
| `NEEDS_ARCHITECTURE_DECISION` | the invariant appears to require a dependency, or a `NoteGroup` change that breaks ADR 0002's merged-stream contract |
| `OUT_OF_SCOPE` | success appears to require the keyboard, fuzzy matching, or re-parsing |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

## 12. Output requirements

Write `docs/sprints/output/009-staff-pairing-repair-output.md`:

- exactly one terminal state
- the design chosen for the invariant, and **why** — including whether desync is now structurally impossible or only test-enforced
- Task 0 archive path and `cmp` exit code
- every changed file and whether it was in scope
- all 16 checks **with actual output** — quote real numbers for 3–11, not "as expected"
- the m12 b4 pairing, verbatim
- both commit SHAs and their order
- repair attempts used, including zero
- stop rules triggered, if any
- out-of-scope pressure encountered
- risks and open questions

**Standing note to carry, not act on:** this repo has no TypeScript typechecking. `typescript` is not a declared dependency and `vite build` only strips types. A `tsc --noEmit` script would help and requires a dependency, which the standing contract forbids without an explicit decision. Loop 004 already recorded this; repeat it if still true.

When `DONE`, the next recommended action must be "accept current loop as complete."
