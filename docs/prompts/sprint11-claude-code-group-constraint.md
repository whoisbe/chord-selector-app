# Agent Handoff: Group-Wise Key Constraint

**Assigned agent: Claude Code**
**Model: Sonnet 5 (`claude-sonnet-5`)** — this loop is mechanical with a crisp verifier and no open architecture. One design question is left to you, in Section 6.
Loop spec: `docs/planning/loops/011-group-wise-highlighting.md`
Sprint: 11
Prepared: 2026-08-02
Sprint output: `docs/sprints/output/011-group-wise-highlighting-output.md`

Self-contained. Execute from this document alone. Do not rely on prior conversation.

Repository: `/Users/b/dev/chord-selector-app`, branch `phrase-lookup`. **Do not push. Do not merge to `main`.**

Checks 10–12 need a browser and a dev server (`npm run dev`, port 3000). Start one if it is not running.

## 1. The gap

Loop 006 built a two-row keyboard whose keys are highlighted when they can follow the phrase entered so far. It constrains **pitch-by-pitch but not group-wise.**

Measured against the ingested movement:

| | |
|---|---|
| 2-key selections available from the highlighted set | 1,485 |
| 2-note groups that actually exist in the piece | **12** |
| Hit rate for an arbitrary 2-key selection | **0.8%** |
| After selecting F#3, pitches that genuinely co-occur with it | **16 of 54** |

So once the user selects one key, 38 of the 54 remaining keys are still lit and clickable, and every one builds a group that occurs nowhere in the piece. They press Add group, get nothing, and are told nothing.

The app's own on-screen text reads *"dimmed keys cannot follow what you have entered so far."* That is currently true of sequences and false of chords.

## 2. Goal

> From "highlighting prevents impossible sequences but allows impossible chords" to "once a key is selected, only keys that genuinely co-occur with it remain available, so a dead-end group cannot be built."

## 3. The rule

> While a current group is being assembled, a pitch is available only if it appears **together with every already-selected pitch, in the same group**, somewhere the committed phrase prefix can continue.

Two constraints compose. Neither replaces the other:

1. **Sequence constraint** — existing, from Loop 006: the group must be able to follow the committed prefix.
2. **Co-occurrence constraint** — new: the group being assembled must be one that actually exists.

With nothing selected in the current group, behaviour is **unchanged**.

## 4. Exact expected values

These are measured from the committed artifact at `HEAD`. Use them as test fixtures.

**Nothing committed, nothing selected:** 55 distinct pitches available.

**Nothing committed, F#3 (54) selected** → exactly these 16 pitches remain available:

```
30, 32, 33, 35, 36, 37, 42, 44, 45, 47, 48, 61, 66, 68, 72, 73
F#1 G#1 A1  B1  C2  C#2 F#2 G#2 A2  B2  C3  C#4 F#4 G#4 C5  C#5
```

**Nothing committed, F#3 (54) and F#4 (66) both selected** → exactly these 8 remain:

```
30, 33, 35, 36, 42, 45, 47, 48
F#1 A1  B1  C2  F#2 A2  B2  C3
```

**`[54,66]` committed, nothing selected** → available = `[61]` (C#4). This is the Loop 006 behaviour and must not change.

**F#4 (66) must be available after selecting F#3 (54).** It is in the list above. The entire project turns on that cross-staff octave; if it disappears, the loop has failed.

For reference, the complete set of 2-note groups in the piece:

```
(32,44) (37,44) (44,56) (44,80) (49,61) (54,66)
(55,67) (56,68) (57,71) (59,68) (59,71) (61,73)
```

## 5. Styling constraint — read before writing UI

**There is no Tailwind build step in this project.** No `tailwindcss` dependency, no PostCSS or Tailwind config. `src/index.css` is a pre-compiled Tailwind v4 artifact.

**A utility class not already compiled into `src/index.css` does nothing — silently.** No error, no warning; the element just renders unstyled.

Use utilities you have confirmed exist in `src/index.css`, or hand-author rules in `src/styles/globals.css` with a comment explaining why, as Loop 006 did. Pseudo-classes such as `:focus-visible` cannot be inline styles.

## 6. One design question — answer it, don't assume it

A key blocked because it never co-occurs with your selection is unavailable for a **different reason** than a key blocked because it cannot follow your phrase.

Decide whether those two states are visually distinguished or share one dimmed treatment, and **say why in the output.** Either answer is acceptable. What is not acceptable is failing to notice they differ.

Whichever you choose, the accessible name must stay truthful. Loop 006's names read `"F#3, Lower row, available next"`; any new state needs a correspondingly accurate name.

## 7. Tasks

**Task 0.** Copy `docs/agent-handoff.md` verbatim to `docs/prompts/sprint11-claude-code-group-constraint.md`. Verify with `cmp -s`, record the exit code.

**Task 1.** Extend `src/lib/music/continuations.ts` with the co-occurrence constraint. Keep it **pure** — no React, no DOM.

**Task 2.** Tests for the exact values in Section 4, plus check 9 below.

**Task 3.** Wire it into the phrase-lookup surface.

**Task 4.** Run Section 8, write the output, commit once.

## 8. Verification requirements

Checks 1–9 need no browser.

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 under `strict` |
| 2 | `npm test` | all pass, including the 63 existing tests |
| 3 | `npm run build` | succeeds |
| 4 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing |
| 5 | Empty selection unchanged | nothing committed, nothing selected → **55** pitches available |
| 6 | Single selection | F#3 selected → exactly the **16** pitches in Section 4 |
| 7 | **Cross-staff octave survives** | F#4 (66) is available after selecting F#3 (54) |
| 8 | Constraints compose | `[54,66]` committed, nothing selected → available = `[61]`; and F#3+F#4 selected → exactly the **8** pitches in Section 4 |
| 9 | **No false negatives** | for **every** group in the artifact, selecting its pitches one at a time never makes a later pitch of that same group unavailable |
| 10 | Founding query still enterable | browser, end to end: F#3 lower row, F#4 upper row, Add group, C#4, Add group, E4, Add group → **1 result, measure 12, beat 4** |
| 11 | Dead end unreachable | browser: after selecting F#3, a pitch known not to co-occur with it — for example E4 (64) — is **not** activatable |
| 12 | Accessibility | every key remains a focusable control with a truthful accessible name; the founding query is still completable from the accessibility tree **without coordinate clicking** |

**Check 9 is the one that protects the feature from itself.** A too-aggressive constraint that dims a key belonging to a real group makes parts of the piece unreachable — worse than the problem being fixed. It must run over all 823 groups, not a sample.

Check 7 is the specific regression guard. Check 12 matters because Loop 006's keys are operable from the accessibility tree and that is how the macro layer verifies them; do not regress it.

If you have no browser backend: run 1–9, mark 10–12 `not run` with the reason, end at `BLOCKED`, and **do not substitute code inspection for a required check.**

## 9. Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not weaken check 9 to a sample.** All 823 groups, every time.
- Do not relax matching to make check 10 return a result. The founding query is verified to have exactly one match; a failure means your constraint is wrong.
- Do not adjust the Section 4 numbers to match your implementation. They are measured from the committed artifact. If you believe one is wrong, stop at `NEEDS_HUMAN_DECISION` and show the discrepancy.
- Do not add a dependency.
- Never silence a type error with `any`, `@ts-ignore`, or `@ts-expect-error`.

## 10. Forbidden actions

- Editing `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`, `chordVoicings.test.ts`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `vercel.json`
- Editing `phrase-search.ts`, `scripts/`, or the committed `moonlight-sonata.ts` artifact
- **Fuzzy, transposition-invariant, shape, or relaxed matching** — that is Loop 007 and must be built against an eval harness
- Ranking or scoring; a second piece; Web MIDI, audio, score rendering
- Adding a Tailwind build step (Open Decision 9)
- Any npm dependency
- `git push`, merging to `main`, rewriting history
- Writing anything in `/Users/b/dev/chordsense`

## 11. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–12 pass, evidence recorded |
| `BLOCKED` | no browser or dev server for 10–12, with 1–9 passing |
| `NEEDS_ARCHITECTURE_DECISION` | the constraint appears to require a dependency or a change to the merged-stream contract |
| `NEEDS_HUMAN_DECISION` | a Section 4 number is unreachable and you believe the number is wrong |
| `OUT_OF_SCOPE` | success appears to require fuzzy matching, ranking, or a second piece |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report it.** Do not resume against an amended contract — a prior loop failed exactly that way. See `docs/learning/never-mutate-an-active-handoff.md`.

## 12. Output requirements

Write `docs/sprints/output/011-group-wise-highlighting-output.md`:

- exactly one terminal state
- the Section 6 design decision and your reasoning
- Task 0 archive path and `cmp` exit code
- every changed file and whether it was in scope
- all 12 checks with **actual output** — quote the real pitch lists for 5–8, not "as expected"
- for check 9, how many groups were exercised and the failure count
- for check 10, the entry sequence and the result verbatim
- the commit SHA
- repair attempts used, including zero
- stop rules triggered, if any
- out-of-scope pressure encountered
- risks and open questions

When `DONE`, the next recommended action must be "accept current loop as complete."
