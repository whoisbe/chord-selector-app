# Loop Spec 006: Two-Row Virtual Keyboard Input

Loop type: **Completion**
Status: **revision 2** — rewritten against the actual `KeyboardDiagram.tsx` and the real ingested corpus. Engineered, awaiting executor assignment.
Executor: **Claude Code** (Opus 5)
Depends on: Loops 004, 009, 010 all DONE
Blocks: nothing. Loop 007 benefits but is not gated on it.

> **Revision 2 corrects revision 1 on three points.** The reuse claim was too optimistic, the key counts were wrong, and typechecking now exists. Details inline.

## Trigger

The user's recall is **spatial and muscle-memory based** — he knows where his hands went, not what the notes were called. Loop 001's pitch-button grid and the abandoned text-entry plan both demand translating a spatial memory into note names, which he cannot reliably do. The evidence: his stated phrase was correct in shape and pitch-class but wrong by an octave, and wrong about which hand.

ADR 0002 then established that the phrase he actually wanted spans both staves. Loop 004 proved it: exactly one match, measure 12 beat 4, invisible to either staff alone.

## Goal

From **"the user must name the notes they half-remember"** to **"the user points at where their hands went, across two rows, and the keyboard shows them what can come next."**

## Correction: `KeyboardDiagram.tsx` is a reference, not a base

**Revision 1 claimed this loop would "extend an existing component rather than build one." That was based on reading the first 80 of 215 lines. It is wrong.**

What `KeyboardDiagram.tsx` actually is:

| Property | Reality | What this loop needs |
|---|---|---|
| Range | hardcoded `startNote = 60`, `numOctaves = 2` | variable, MIDI 29–87 |
| Interaction | **none** — `notes: number[]` in, render out | click to toggle, per key |
| Black keys | wrapped in `pointer-events-none` | must be clickable |
| Markup | `<div>`s | focusable controls with accessible names |
| States | 2 — active / inactive | 3 — entered, available-next, unavailable |
| Labels | only rendered for *active* keys | octave landmarks always visible |
| Naming | `noteNames` prop indexed by position in the chord | absolute pitch labels |

It is a fixed-range, display-only, two-state, chord-oriented diagram. This loop needs a variable-range, interactive, three-state, pitch-oriented instrument.

**Decision: build a new `PhraseKeyboard` component. Do not generalize `KeyboardDiagram`.**

`KeyboardDiagram` is in production in both By Key and By Name. Generalizing it behind a mode flag would risk regressing two working features to serve a third with genuinely different requirements. Two components sharing a pure geometry module is the better structure; a shared abstraction can be extracted later if it earns itself.

What *does* transfer, and should be reused deliberately:

- the white/black pitch-class sets, `[0,2,4,5,7,9,11]` and `[1,3,6,8,10]`
- the black-key placement formula — position on the boundary between adjacent white keys
- the 20px white key / 1px gap sizing, which keeps the new keyboard visually native to the app. **34 white keys × 21px ≈ 714px**, which fits the existing `max-w-7xl` container.
- `C4 = 60`, already shared

## Design decisions, frozen for this loop

### Two rows, one group

Upper row = staff 1, lower row = staff 2.

**Both rows feed a single group per onset.** Per ADR 0002, `PhraseQuery` carries no staff at all — `groups: Array<{ notes: number[] }>`. Clicking F#3 on the lower row and F#4 on the upper row produces the group `[54, 66]`, which is the cross-staff octave the whole project turns on.

**Be honest about why two rows exist**, since the query ignores staff entirely:

1. **Spatial fidelity.** Two hands are in two places. Entering a cross-staff octave as one gesture across two rows matches the physical memory being recalled.
2. **Staff-aware highlighting.** Continuations can be shown on the row where they actually occur. After `[F#3+F#4]`, the single possible next pitch `C#4` occurs on **staff 2** — lighting it on the lower row tells the user which hand plays it.
3. **Result display.** Rendering a matched group across two rows shows its hand distribution, which is what you need in order to play it.

Rows are an input and display affordance. They are never a query partition. Conflating those is exactly what caused the ADR 0002 bug.

### Rows are geometrically identical and x-aligned

Same key width, same offsets, **same full range on both rows**, so a given pitch sits at the same x on the upper and lower rows. Non-negotiable — the entire premise is spatial memory, and misaligned rows destroy it.

Measured from the committed artifact, the movement spans **MIDI 29 (F1) to 87 (D#6) — 59 keys: 34 white, 25 black.**

> Revision 1 said "35 white and 24 black." That was wrong; the correct split is **34 white, 25 black**.

The staves occupy different sub-ranges — staff 1 is C3–D#6 (48–87), staff 2 is F1–E4 (29–64). **Render the full range on both rows anyway** and dim the keys outside a row's own range. Trimming each row to its own extent would break alignment, which costs more than the wasted width.

### Corpus-constrained highlighting is the feature

Given the committed prefix, compute every pitch that can extend it anywhere in the piece and highlight exactly those. Everything else dims.

Measured against the ingested movement:

| Prefix | Occurrences | Pitches that can follow |
|---|---|---|
| `[F#4]` | 77 | 20 of 55 |
| `[F#3 + F#4]` | 1 | **1 — C#4, on staff 2** |
| `[F#3+F#4] → [C#4]` | 1 | **1 — E4, on staff 2** |

After the cross-staff octave, exactly one key lights, on the lower row. The user cannot misremember their way out of it. This is error prevention at entry rather than error forgiveness after the fact — and it is the reason this loop is worth more than a prettier button grid.

The piece contains only **119 distinct groups across 823 events**, so the continuation index is small.

### Search runs on every commit

Results update as groups are added. Keep a search control as a harmless fallback. With exact matching, a one-note prefix matches many places — cap the rendered list and show the total count.

## Architecture: keep the browser out of the logic

Two new pure modules, no React, no DOM:

- `src/lib/music/keyboard.ts` — `keyLayout(minPitch, maxPitch)` returns, per pitch, `{ pitch, x, width, isBlack }`. Pure arithmetic over the 12-tone pattern.
- `src/lib/music/continuations.ts` — `possibleContinuations(stream, prefix): number[]`, and a staff-aware variant for row placement. Pure.

`PhraseKeyboard` renders from `keyLayout` output and dims from `possibleContinuations` output.

This split is why **10 of 16 checks below need no browser** — the direct lesson of Loop 001 stranding on a browser-only verifier.

## Scope

In scope: `src/lib/music/keyboard.ts`, `src/lib/music/continuations.ts`, `src/components/phrase-lookup/**` (new), `src/components/PhraseLookupTab.tsx` (replace the Loop 004 smoke surface), `src/tests/**`, plus prompt archive and sprint output.

Explicitly out of scope:

- **Any edit to `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`.** Read `KeyboardDiagram` for reference; do not touch it.
- **Fuzzy, transposition-invariant, shape, or relaxed matching.** Loop 007. Exact matching only. Resist hard — the keyboard makes relaxation feel adjacent, and building it here leaves it unevaluated.
- Ranking and scoring
- Web MIDI input — see below
- Audio playback or note preview sounds
- Score rendering or a piano roll
- Computer-keyboard key mapping
- Key-aware enharmonic spelling (Open Decision 8)
- Any npm dependency
- Changes to `phrase-search.ts`, `musicxml` ingestion, or the committed artifact

### Web MIDI is out of scope but must not be designed out

The capture path — "some input produced this set of pitches at this step" — must be a seam the component consumes, not logic buried in click handlers. A later Web MIDI adapter should feed the same seam. Do not build the adapter; do not make it impossible.

## Verifier

Checks 1–10 need no browser. 11–16 do, and that is stated up front.

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 under `strict` |
| 2 | `npm test` | all pass, including the 39 existing tests |
| 3 | `npm run build` | succeeds |
| 4 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing |
| 5 | Geometry: key count | `keyLayout(29, 87)` returns **59 keys — 34 white, 25 black** |
| 6 | Geometry: black-key identity | exactly the pitches where `pitch % 12 ∈ {1,3,6,8,10}` are black |
| 7 | Geometry: alignment by construction | `keyLayout` is a pure function of the pitch range alone — called twice it returns identical output, so both rows are aligned structurally, not by eye |
| 8 | Geometry: ordering | white-key x strictly increases with pitch; every black key's x falls between its neighbouring white keys' |
| 9 | Continuations: collapse | after `[54, 66]` returns exactly `[61]`; after `[54,66],[61]` returns exactly `[64]` |
| 10 | Continuations: breadth | after `[66]` returns 20 distinct pitches |
| 11 | Two rows render, aligned | screenshot: a given pitch occupies the same x on both rows |
| 12 | **Founding cross-staff entry** | click F#3 on the lower row and F#4 on the upper row, commit, add C#4, add E4 → **exactly 1 result, measure 12, beat 4** |
| 13 | Highlighting collapses | after committing `[F#3+F#4]`, exactly one key is highlighted available — C#4 — and it is on the **lower** row |
| 14 | Search-as-you-type | results update on commit without pressing a search button |
| 15 | Undo and clear | undo removes the last committed group; clear resets selection, groups, results and messages |
| 16 | Accessibility | every key is a focusable control with an accessible name including its note name; **the founding query is completable from the accessibility tree without coordinate clicking** |

Check 12 is the loop. Check 7 is how alignment is guaranteed structurally rather than by eyeballing. Check 16 is a regression guard with teeth: Loop 001's grid was fully operable from the accessibility tree — that is how the macro layer verified it — and `KeyboardDiagram`'s black-key layer is `pointer-events-none` `<div>`s, which is exactly the pattern **not** to copy.

**Checks 11–16 require a browser and a running dev server.** Without one: run 1–10, mark 11–16 `not run`, end at `BLOCKED`, and do not substitute inspection. The macro layer closes them, as it has four times now.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not relax matching to make check 12 return a result.** If exact matching on the merged stream fails to return m12 b4, the defect is in entry or geometry, not in strictness.
- Do not add a dependency for SVG, geometry, or state.
- Do not edit `KeyboardDiagram.tsx` to share code with it. If the duplication becomes painful, that is a finding for a later loop, not a licence.
- Never silence a type error with `any` or an ignore comment.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–16 pass, evidence recorded |
| `BLOCKED` | no browser or dev server for 11–16, with 1–10 passing |
| `NEEDS_ARCHITECTURE_DECISION` | success appears to require a dependency, a change to the merged-stream contract, or abandoning the pure geometry/continuations split |
| `OUT_OF_SCOPE` | success appears to require fuzzy matching, ranking, MIDI, audio, score rendering, or editing the chord components |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

## Left to the executor, deliberately

- **Black-key x offsets.** Exact piano geometry versus the boundary-midpoint placement `KeyboardDiagram` uses. Either is fine provided the 2-black/3-black grouping is unmistakable — that grouping *is* the spatial cue.
- **SVG versus DOM.** `KeyboardDiagram` uses absolutely-positioned `<div>`s. SVG with a `viewBox` scales responsively for free and simplifies hit-testing at 59 keys. Choose, and record why.
- **Label policy.** Octave landmarks (every C) must always be visible; whether all names show, or only on hover/entered, is open.
- **Simultaneous selection.** Click-to-toggle then commit, as Loop 001 did, is the safe default.

Record each choice and its reasoning in the sprint output. They are candidates for an ADR if they prove load-bearing.

## Note for the handoff

Typechecking now exists (ADR 0003). Specs and handoffs should **no longer carry the standing note that the build does not typecheck** — `npm run typecheck` is check 1 above. One caveat worth passing on: TypeScript 7 ships as a platform-native binary, so that check is executor- or human-local and cannot be re-run from an arbitrary machine.
