# Agent Handoff: Two-Row Virtual Keyboard Input

**Assigned agent: Claude Code**
**Recommended model: Opus 5 (`claude-opus-5`)** — this loop is design judgment, not mechanical throughput. Four decisions are deliberately left to you.
Loop spec: `docs/planning/loops/006-two-row-keyboard-input.md` (revision 2)
Sprint: 6
Prepared: 2026-08-02
Sprint output: `docs/sprints/output/006-keyboard-input-output.md`

Self-contained. Execute from this document alone. Do not rely on prior conversation.

Repository: `/Users/b/dev/chord-selector-app`, branch `phrase-lookup`. **Do not push. Do not merge to `main`.**

**A dev server is already running on `http://localhost:3000`.** Checks 11–16 need a browser; you should be able to run them. If you genuinely have no browser backend, see the stop rules — do not fake them.

## 1. Why this loop exists

The user's recall is **spatial and muscle-memory based.** He knows where his hands went, not what the notes were called. Evidence: the phrase he described was correct in shape and pitch-class but wrong by an octave, and wrong about which hand.

ADR 0002 then established that the phrase he actually wanted **spans both staves**. Loop 004 proved it — exactly one match in the whole movement, measure 12 beat 4, invisible to either staff searched alone.

Loop 001's pitch-button grid and the abandoned text-entry plan both demand translating a spatial memory into note names. He cannot reliably do that. This loop replaces the input surface with something spatial.

## 2. Goal

> From "the user must name the notes they half-remember" to "the user points at where their hands went, across two rows, and the keyboard shows them what can come next."

## 3. Read this before you look at `KeyboardDiagram.tsx`

`src/components/KeyboardDiagram.tsx` renders a piano and will look reusable. **It is a reference, not a base. Do not edit it and do not import from it.**

| Property | What it is | What you need |
|---|---|---|
| Range | hardcoded `startNote = 60`, `numOctaves = 2` | variable, MIDI 29–87 |
| Interaction | **none** — `notes: number[]` in, render out | click to toggle, per key |
| Black keys | wrapped in `pointer-events-none` | must be clickable |
| Markup | `<div>`s | focusable controls with accessible names |
| Visual states | 2 — active / inactive | 3 — entered, available-next, unavailable |
| Labels | rendered only for *active* keys | octave landmarks always visible |
| Naming | `noteNames` prop indexed by position in a chord | absolute pitch labels |

It is a fixed-range, display-only, two-state, chord-oriented diagram. You need a variable-range, interactive, three-state, pitch-oriented instrument.

It is also **in production in both By Key and By Name.** Generalising it behind a mode flag would risk regressing two working features to serve a third with different requirements.

**Build a new `PhraseKeyboard`. Accept the duplication deliberately.** If it later becomes painful, that is a finding for a future loop, not a licence to refactor here.

What you *should* take from it, by reading rather than importing:

- the white/black pitch-class sets, `[0,2,4,5,7,9,11]` and `[1,3,6,8,10]`
- the black-key placement idea — position on the boundary between adjacent white keys
- the 20px white key / 1px gap sizing, which keeps your keyboard visually native to the app. **34 white keys × 21px ≈ 714px**, which fits the existing `max-w-7xl` container.

## 4. Frozen design decisions

### Two rows, one group

Upper row = staff 1. Lower row = staff 2.

**Both rows feed a single group per onset.** `PhraseQuery` carries no staff at all — `groups: Array<{ notes: number[] }>`. Clicking F#3 on the lower row and F#4 on the upper row produces the group `[54, 66]`.

Since the query ignores staff entirely, be clear on why two rows exist:

1. **Spatial fidelity** — two hands are in two places; a cross-staff octave should be one gesture across two rows.
2. **Staff-aware highlighting** — after `[F#3+F#4]`, the single possible continuation `C#4` occurs on **staff 2**, so it should light on the **lower** row. That tells the user which hand plays next.
3. **Result display** — rendering a matched group across two rows shows its hand distribution, which is what you need to actually play it.

Rows are an input and display affordance. **They are never a query partition.** Conflating those is the exact bug ADR 0002 exists to correct.

### Rows are geometrically identical and x-aligned

Same key width, same offsets, **same full range on both rows**, so a given pitch sits at the same x on both. Non-negotiable — the premise is spatial memory, and misaligned rows destroy it.

Measured from the committed artifact: the movement spans **MIDI 29 (F1) to 87 (D#6) — 59 keys: 34 white, 25 black.**

Staff 1 occupies C3–D#6 (48–87); staff 2 occupies F1–E4 (29–64). **Render the full range on both rows anyway**, and dim keys outside a row's own range. Trimming each row to its own extent would break alignment, which costs more than the wasted width.

### Corpus-constrained highlighting is the feature

Given the committed prefix, compute every pitch that can extend it anywhere in the piece, highlight exactly those, dim everything else.

Measured against the committed artifact:

| Prefix | Occurrences | Pitches that can follow |
|---|---|---|
| `[66]` (F#4) | 77 | 20 of 55 |
| `[54, 66]` (F#3+F#4) | 1 | **1 — C#4 (61), on staff 2** |
| `[54,66] → [61]` | 1 | **1 — E4 (64), on staff 2** |

After the cross-staff octave exactly one key lights. The user cannot misremember their way out of it. This is error prevention at entry rather than error forgiveness afterwards, and it is why this loop is worth more than a prettier button grid.

The piece has only **119 distinct groups across 823 events**, so the index is small — no performance work needed.

### Search runs on every commit

Results update as groups are added. Keep a search control as a harmless fallback. With exact matching a one-note prefix matches many places — cap the rendered list and show the total count.

## 5. Architecture — keep the browser out of the logic

Two new **pure** modules. No React, no DOM, no fetch.

- `src/lib/music/keyboard.ts` — `keyLayout(minPitch, maxPitch)` returning, per pitch, `{ pitch, x, width, isBlack }`. Pure arithmetic.
- `src/lib/music/continuations.ts` — `possibleContinuations(stream, prefix): number[]`, plus a staff-aware variant so the UI knows which row to light. Pure.

`PhraseKeyboard` renders from `keyLayout` and dims from `possibleContinuations`.

This split is why **10 of 16 checks need no browser.** It is the direct lesson of Loop 001, which finished its implementation, passed every automated check, then stranded because one verifier needed a browser it did not have.

## 6. Tasks

**Task 0.** Copy `docs/agent-handoff.md` verbatim to `docs/prompts/sprint6-claude-code-keyboard.md`. Verify with `cmp -s`, record the exit code.

**Task 1.** Write `src/lib/music/keyboard.ts` and its tests.

**Task 2.** Write `src/lib/music/continuations.ts` and its tests.

**Task 3.** Build `src/components/phrase-lookup/PhraseKeyboard.tsx` — two rows, three visual states, clickable keys as real focusable controls.

**Task 4.** Build the surrounding surface: current-group selection, commit, undo, clear, results with measure/beat and following groups, empty-query and no-results messages, and a visible note that this searches the ingested Moonlight Sonata.

**Task 5.** Replace `src/components/PhraseLookupTab.tsx` — currently the Loop 004 smoke surface — with the real thing.

**Task 6.** Run Section 7, write the output, commit once.

## 7. Verification requirements

Checks 1–10 need no browser. 11–16 do.

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 under `strict` |
| 2 | `npm test` | all pass, including the 39 existing tests |
| 3 | `npm run build` | succeeds |
| 4 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing |
| 5 | Geometry: key count | `keyLayout(29, 87)` returns **59 keys — 34 white, 25 black** |
| 6 | Geometry: black-key identity | exactly the pitches where `pitch % 12 ∈ {1,3,6,8,10}` are black |
| 7 | Geometry: alignment by construction | `keyLayout` is a pure function of the pitch range alone — called twice it returns identical output, so both rows align structurally rather than by eye |
| 8 | Geometry: ordering | white-key x strictly increases with pitch; every black key's x falls between its neighbouring white keys' |
| 9 | Continuations: collapse | after `[[54,66]]` returns exactly `[61]`; after `[[54,66],[61]]` returns exactly `[64]` |
| 10 | Continuations: breadth | after `[[66]]` returns 20 distinct pitches |
| 11 | Two rows render, aligned | screenshot evidence that a given pitch occupies the same x on both rows |
| 12 | **Founding cross-staff entry** | click F#3 on the **lower** row and F#4 on the **upper** row, commit, add C#4, add E4 → **exactly 1 result, measure 12, beat 4** |
| 13 | Highlighting collapses | after committing `[F#3+F#4]`, exactly one key shows as available — C#4 — on the **lower** row |
| 14 | Search-as-you-type | results update on commit without pressing a search button |
| 15 | Undo and clear | undo removes the last committed group; clear resets selection, groups, results and messages |
| 16 | Accessibility | every key is a focusable control with an accessible name including its note name, and **the founding query is completable from the accessibility tree without coordinate clicking** |

**Check 12 is the loop.** Check 7 is how alignment is guaranteed structurally rather than by eyeballing a screenshot.

**Check 16 has teeth.** Loop 001's button grid was fully operable from the accessibility tree — that is how it was verified. `KeyboardDiagram`'s black-key layer is `pointer-events-none` `<div>`s, which is precisely the pattern **not** to copy. If your keys are not reachable and activatable from the accessibility tree, this check fails regardless of how the mouse behaves.

A dev server is running on `http://localhost:3000`. If you nonetheless have no browser backend: run 1–10, mark 11–16 `not run` with the reason, end at `BLOCKED`, and **do not substitute code inspection for a required check.**

## 8. Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not relax matching to make check 12 return a result.** If exact matching on the merged stream fails to return m12 b4, the defect is in your entry or geometry, not in strictness. The founding query is verified to have exactly one match.
- Do not add a dependency for SVG, geometry, or state.
- Do not edit `KeyboardDiagram.tsx` to share code with it.
- Never silence a type error with `any`, `@ts-ignore`, or `@ts-expect-error`.
- Record failure signal, diagnosis, change, and rerun result per attempt.

## 9. Forbidden actions

- Editing `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`, `chordVoicings.test.ts`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `vercel.json`
- Editing `phrase-search.ts`, `musicxml` ingestion, `scripts/`, or the committed `moonlight-sonata.ts` artifact
- **Fuzzy, transposition-invariant, shape, or relaxed matching.** That is Loop 007, and it must be built against an eval harness rather than by feel. Resist this hard — the keyboard makes relaxation feel adjacent.
- Ranking or scoring
- Web MIDI, audio playback, note preview sounds
- Score rendering or a piano roll
- Computer-keyboard key mapping
- Key-aware enharmonic spelling (Open Decision 8)
- Any npm dependency
- `git push`, merging to `main`, rewriting history
- Writing anything in `/Users/b/dev/chordsense`

### Web MIDI is out of scope but must not be designed out

The capture path — "some input produced this set of pitches at this step" — must be a seam the component consumes, not logic buried inside click handlers. A later Web MIDI adapter should feed the same seam. Do not build the adapter; do not make it impossible.

## 10. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–16 pass, evidence recorded |
| `BLOCKED` | no browser backend for 11–16, with 1–10 passing |
| `NEEDS_ARCHITECTURE_DECISION` | success appears to require a dependency, a change to the merged-stream contract, or abandoning the pure geometry/continuations split |
| `OUT_OF_SCOPE` | success appears to require fuzzy matching, ranking, MIDI, audio, score rendering, or editing the chord components |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to have changed while you are executing, stop and report it.** Do not resume against an amended contract — a prior loop failed exactly that way. See `docs/learning/never-mutate-an-active-handoff.md`.

## 11. Decisions left to you — record each with its reasoning

These are genuinely open. Choose, and say why in the output.

- **SVG versus DOM.** `KeyboardDiagram` uses absolutely-positioned `<div>`s. SVG with a `viewBox` scales responsively for free and simplifies hit-testing across 59 keys. Either is acceptable.
- **Black-key x offsets.** Exact piano geometry versus boundary-midpoint placement. Either is fine provided the 2-black/3-black grouping is unmistakable — that grouping *is* the spatial cue the whole feature relies on.
- **Label policy.** Octave landmarks (every C) must always be visible; whether all names show, or only on hover or when entered, is yours.
- **Simultaneous selection.** Click-to-toggle then commit, as Loop 001 did, is the safe default.

## 12. Output requirements

Write `docs/sprints/output/006-keyboard-input-output.md`:

- exactly one terminal state
- the four Section 11 decisions and the reasoning for each
- Task 0 archive path and `cmp` exit code
- every changed file and whether it was in scope
- all 16 checks with **actual output** — quote real numbers for 5–10, not "as expected"
- for check 12, the entry sequence performed and the result verbatim
- for check 13, which key was highlighted and on which row
- for check 16, how you confirmed accessibility-tree operability
- the commit SHA
- repair attempts used, including zero
- stop rules triggered, if any
- out-of-scope pressure encountered — particularly any temptation to reuse `KeyboardDiagram` or to add relaxed matching
- risks and open questions

When `DONE`, the next recommended action must be "accept current loop as complete."
