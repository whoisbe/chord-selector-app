# Loop Spec 009: Staff/Pitch Pairing Repair

Loop type: **Repair**
Status: engineered, awaiting executor assignment
Executor: **Claude Code**
Depends on: Loop 004 accepted
Blocks: Loop 006 — which renders two rows keyed on staff and would inherit the defect silently

## Trigger

Loop 004 passed all 15 verifier checks and its evidence is sound. During macro-layer review, a defect was found in a facet **no check covered**.

`copyGroup` in `src/lib/music/phrase-search.ts`:

```ts
function copyGroup(group: NoteGroup): NoteGroup {
  return { ...group, notes: normalizeNotes(group.notes) }
}

export function normalizeNotes(notes: readonly number[]): number[] {
  return Array.from(new Set(notes)).sort((left, right) => left - right)
}
```

`notes` is deduplicated and **sorted**. `staves` — a parallel array introduced by Loop 004 — is spread through **unchanged**. The two arrays desynchronize in every `matchedGroups` and `followingGroups` entry `findPhraseMatches` returns.

Measured against the ingested movement: **115 of 823 groups span more than one staff, and all 115 mispair.** That is every group in which staff data carries any information.

Including the founding match itself:

```
m12 beat 4
  stored:  notes [F#4, F#3]   staves [1, 2]
  after:   notes [F#3, F#4]   staves [1, 2]   ← unchanged
     F#3: claimed staff 1, actually staff 2
     F#4: claimed staff 2, actually staff 1
```

The one match this project was built to find has inverted staff data the moment it leaves the search function.

## Why it is worth fixing now rather than at the point of use

The defect is latent — nothing reads `staves` yet, which is precisely why Loop 004's checks all passed honestly.

ADR 0002 retains staff "for display and ranking," and Loop 006 renders **two rows keyed on staff**. It would place notes on the wrong row, silently, in exactly the cross-staff case that motivated ADR 0002 in the first place. A latent data-integrity defect discovered by its consumer is far more expensive than one fixed at the source.

## Goal

From **"staff metadata is silently wrong for every cross-staff group returned by the search"** to **"staff information provably corresponds to its pitch for every group the search returns, enforced by a test."**

## The invariant to establish

> For every `NoteGroup` returned by `findPhraseMatches`, each pitch's associated staff must equal the staff that pitch had in the source piece.

**Specify the invariant, not the implementation.** Several designs satisfy it; the executor chooses and records the reasoning:

| Approach | Note |
|---|---|
| Sort `notes` and `staves` together as pairs | Smallest diff; preserves the current shape. |
| Replace the parallel arrays with one array of `{ pitch, staff }` | Cleanest; makes desync structurally impossible. Larger diff across types, ingestion, artifact, tests. |
| Store staff as a pitch-keyed map | Order-independent by construction, but loses information if one pitch ever appears on both staves at one onset. |
| Omit `staves` from `copyGroup`'s output entirely | Shipping no data beats shipping wrong data, but defers the need Loop 006 has. |

Whichever is chosen, **the desync must become structurally impossible or test-enforced — not merely fixed in one function.**

## Also in scope: the duplicate-pitch artifact entries

Ten groups contain the same pitch twice, from two voices colliding **on the same staff** — e.g. m15 tick 0 has `B3` twice, both staff 1. They are harmless to matching, because `normalizeNotes` deduplicates before comparison, but they are redundant and they inflate any downstream pitch counting.

Deduplicate on the **(pitch, staff) pair**, not on pitch alone. Deduplicating by pitch alone would discard genuine cross-staff doubling if this or a future piece contains any.

## Also in scope: committing Loop 004

Loop 004's work is uncommitted — its handoff omitted a commit task. This loop commits it.

Two commits, in this order, so history shows the defect and the fix separately:

1. Loop 004's ingestion work as it stands
2. This loop's repair

## Scope

In scope: `src/lib/music/phrase-search.ts`, `src/lib/music/types.ts`, `scripts/ingest-musicxml.mjs`, `src/data/pieces/moonlight-sonata.ts` (regenerated, never hand-edited), `src/tests/`, `src/components/PhraseLookupTab.tsx` only if a type change forces it, plus prompt archive and sprint output.

Explicitly out of scope:

- The two-row keyboard (Loop 006)
- Relaxed, fuzzy, transposition-invariant or shape matching (Loop 007)
- Ranking, scoring, or actually *using* staff for anything
- Re-parsing decisions — the parse is verified correct and must not change
- `ByKeyTab`, `ByNameTab`, `KeyboardDiagram`, `chordData`, `chordDatabase`, `chordVoicings.test.ts`
- Any npm dependency, including `typescript`
- `git push`, merging to `main`

## Verifier

| # | Check | Passing result |
|---|---|---|
| 1 | `npm test` | all pass |
| 2 | `npm run build` | succeeds — still not a typecheck |
| 3 | **Staff pairing test** | for **all 115** cross-staff groups, every pitch returned by `findPhraseMatches` carries the staff it has in the source artifact |
| 4 | Cross-staff group count asserted | the test asserts the count is 115, so a change in artifact shape is noticed rather than silently passing |
| 5 | Founding-match pairing | m12 b4 returns F#3→staff 2 and F#4→staff 1 |
| 6 | No duplicate pairs | no group contains the same `(pitch, staff)` pair twice |
| 7 | Event count unchanged | **823** |
| 8 | Pitch sets unchanged | every group's set of distinct pitches is identical to before this loop |
| 9 | Founding query | still exactly 1 match, m12 beat 4 |
| 10 | Staff-split control | still 0 in staff 1 alone, 0 in staff 2 alone |
| 11 | Loop 004 numbers | 69 measures, 1169 notes, 0 inferred, MIDI 29–87, 55 distinct — all unchanged |
| 12 | Reproducibility | re-running the ingestion script regenerates the artifact byte-identically |
| 13 | `git diff --exit-code package.json package-lock.json` | exit 0 |
| 14 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing |
| 15 | Commits | exactly two, in the stated order, on `phrase-lookup`, unpushed |
| 16 | Smoke surface (browser) | Phrase Lookup still renders the single m12 b4 match |

Check 3 is the loop. Check 8 is the regression guard — the repair must not change *which* pitches are in a group, only how staff is associated with them.

**Check 16 needs a browser**, stated up front. Without one: run 1–15, mark 16 `not run`, end at `BLOCKED`, do not substitute inspection.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Never hand-edit `src/data/pieces/moonlight-sonata.ts`.** Change the script and regenerate; check 12 will catch a hand edit.
- Do not change the parsing algorithm. Loop 004's parse was verified event-for-event against an independent implementation and is correct.
- Do not weaken check 3 to a sample. All 115 groups, every time.
- Do not add a dependency.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–16 pass, evidence recorded |
| `BLOCKED` | no browser for check 16 with 1–15 passing |
| `NEEDS_ARCHITECTURE_DECISION` | the invariant appears to require a dependency, or a `NoteGroup` change that breaks the merged-stream contract in ADR 0002 |
| `OUT_OF_SCOPE` | success appears to require the keyboard, fuzzy matching, or re-parsing |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

## Learning to record

Worth carrying into future loop specs:

> **When a loop introduces a new data facet, the verifier must check that the facet survives the code paths that touch it — not merely that it exists.**

Loop 004's fifteen checks were thorough about the *parse*: counts, ranges, spot-checks, a founding query, and a control proving the answer came from the right place. Not one of them followed `staves` through `findPhraseMatches`. The facet was introduced and verified at rest, never in motion.

This is the same shape as the earlier lesson that a fixture authored to satisfy a model cannot falsify it. Both are cases where every check passed honestly and the thing that mattered was outside the checks.
