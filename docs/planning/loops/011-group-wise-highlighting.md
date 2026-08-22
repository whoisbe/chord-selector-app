# Loop Spec 011: Group-Wise Key Constraint

Loop type: **Completion**
Status: engineered, awaiting executor assignment
Executor: **Claude Code** (Sonnet 5)
Depends on: Loop 006 DONE
Blocks: nothing

## Trigger

Loop 006 shipped corpus-constrained highlighting, and macro-layer review found it constrains **pitch-by-pitch but not group-wise**.

Measured against the ingested movement:

| | |
|---|---|
| 2-key selections available from highlighted keys | 1,485 |
| 2-note groups that actually exist in the piece | **12** |
| Hit rate for an arbitrary 2-key selection | **0.8%** |
| After selecting F#3, pitches that genuinely co-occur with it | **16 of 54** |

So once the user has selected one key, 38 of the 54 remaining keys are still lit and still clickable, and every one of them builds a group that occurs nowhere in the piece.

The user then presses Add group, gets no results, and receives no explanation of what went wrong. That is the failure mode Loop 006's highlighting was meant to eliminate — it just eliminated it one dimension short.

## Goal

From **"highlighting prevents impossible sequences but allows impossible chords"** to **"once a key is selected, only keys that genuinely co-occur with it remain available, so a dead-end group cannot be built."**

## The rule

> While a current group is being assembled, a pitch is available only if it appears **together with every already-selected pitch, in the same group**, somewhere the current phrase prefix can continue.

Two constraints compose:

1. **Sequence constraint** (Loop 006, existing): the group must be able to follow the committed prefix.
2. **Co-occurrence constraint** (this loop, new): the group must be one that actually exists.

With nothing selected, behaviour is unchanged — all continuation pitches are available.

Worked example, first group, nothing committed:

- nothing selected → 55 pitches available (69 key elements across two rows)
- select F#3 → **16** pitches remain available: F#1, G#1, A1, B1, C2, C#2, F#2, G#2, A2, B2, C3, C#4, F#4, G#4, C5, C#5
- select F#4 as well → only pitches co-occurring with **both** remain

**The cross-staff octave must survive.** F#4 appears in that list, which is what lets the founding gesture still be entered. If F#4 is not available after selecting F#3, the loop has failed.

## Scope

In scope: `src/lib/music/continuations.ts` (extend), `src/components/phrase-lookup/**`, `src/tests/**`, plus prompt archive and sprint output.

Explicitly out of scope:

- **Fuzzy, transposition-invariant, shape, or relaxed matching.** Loop 007.
- Ranking or scoring
- `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`
- `phrase-search.ts`, the ingestion script, the committed artifact
- Web MIDI, audio, score rendering
- A second piece
- Any npm dependency
- Adding a Tailwind build step (Open Decision 9)
- `git push`, merging to `main`

## Styling constraint — read before writing UI

**There is no Tailwind build step in this project.** No `tailwindcss` dependency, no PostCSS or Tailwind config; `src/index.css` is a pre-compiled Tailwind v4 artifact. **A utility class not already compiled into it does nothing — silently.**

Use utilities confirmed present in `src/index.css`, or hand-author rules in `src/styles/globals.css` with a comment, as Loop 006 did.

## A design question you must answer, not assume

Co-occurrence-unavailable keys are unavailable for a **different reason** than sequence-unavailable keys. "This note never sounds with the one you picked" is not the same as "this note cannot follow your phrase."

Decide whether the two states are visually distinguished or share one dimmed treatment, and **say why**. Either is acceptable. What is not acceptable is failing to notice they are different.

Whatever you choose, the accessible name must remain truthful — Loop 006's names read `"F#3, Lower row, available next"`, and any new state needs a correspondingly accurate name.

## Verifier

Checks 1–9 need no browser.

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 under `strict` |
| 2 | `npm test` | all pass, including the 63 existing tests |
| 3 | `npm run build` | succeeds |
| 4 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing |
| 5 | Empty selection unchanged | with nothing selected and nothing committed, available pitches = **55** |
| 6 | **Single selection** | after selecting F#3 (54) with nothing committed, available = exactly the **16** pitches listed above |
| 7 | **Cross-staff octave survives** | F#4 (66) is available after selecting F#3 (54) |
| 8 | Composition with the sequence constraint | after committing `[54,66]` and selecting nothing, available = `[61]`; the two constraints compose rather than one overriding the other |
| 9 | No false negatives | for **every** group in the artifact, selecting its pitches one at a time never makes a later pitch of that same group unavailable |
| 10 | Founding query still enterable | end to end in the browser: F#3 lower, F#4 upper, commit, C#4, commit, E4, commit → **1 result, measure 12, beat 4** |
| 11 | Dead end is now unreachable | in the browser, after selecting F#3, a pitch known not to co-occur with it is **not** activatable |
| 12 | Accessibility | every key remains a focusable control with a truthful accessible name; the founding query is still completable from the accessibility tree without coordinate clicking |

**Check 9 is the one that protects the feature from itself.** A too-aggressive constraint that dims a key belonging to a real group would make parts of the piece unreachable — worse than the problem being fixed. It must pass over all 823 groups, not a sample.

Check 7 is the specific regression guard: the whole project turns on a cross-staff octave.

**Checks 10–12 need a browser and a running dev server.** Without one: run 1–9, mark 10–12 `not run`, end at `BLOCKED`, do not substitute inspection.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not weaken check 9 to a sample.** All groups, every time.
- Do not relax matching to make check 10 return a result.
- Do not add a dependency.
- Never silence a type error with `any` or an ignore comment.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–12 pass, evidence recorded |
| `BLOCKED` | no browser or dev server for 10–12, with 1–9 passing |
| `NEEDS_ARCHITECTURE_DECISION` | the constraint appears to require a dependency, or a change to the merged-stream contract |
| `OUT_OF_SCOPE` | success appears to require fuzzy matching, ranking, or a second piece |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report it.** See `docs/learning/never-mutate-an-active-handoff.md`.

## Why this is worth a loop of its own

It is small, but it closes the gap between what Loop 006 promised — *"dimmed keys cannot follow what you have entered so far"*, which is the app's own on-screen text — and what it delivers. At present that sentence is true of sequences and false of chords.

It also reduces the pressure for Loop 007. Guided entry that cannot produce a dead end removes most of the need for forgiving matching, which is worth knowing before committing to an eval harness.
