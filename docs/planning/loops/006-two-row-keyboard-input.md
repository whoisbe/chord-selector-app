# Loop Spec 006: Two-Row Virtual Keyboard Input

Loop type: **Completion**
Status: engineered, awaiting executor assignment
Executor: TBD
Depends on: Loop 005 DONE (utilities must generate), Loop 004 DONE (highlighting is uninteresting against a 26-event fixture)
Blocks: Loop 007 eval harness benefits from it but is not gated on it

## Trigger

Two findings converged.

The user's recall is **spatial and muscle-memory based**, not nominal — he knows where his hands went, not what the notes were called. Loop 001's pitch-button grid and the previously-chosen text entry both require translating a spatial memory into note names, a step the user cannot reliably perform. Evidence: his stated phrase was correct in shape and pitch-class but wrong by one octave, and wrong about which hand.

ADR 0002 established that the phrase he actually wanted spans both staves. A single-hand input model cannot express it.

## Goal

Transition from **"the user must name the notes they half-remember, in one hand"** to **"the user points at where their hands went, across two rows, and the keyboard shows them what can come next."**

## Design decisions, frozen for this loop

### Two rows, one query

Upper row = staff 1, lower row = staff 2. Two rows because that is where the hands sit and how a grand staff reads.

**But both rows feed one group.** Per ADR 0002, notes selected on either row at the same step form a single onset group. The rows are an input affordance, not a query partition. Clicking F#3 on the lower row and F#4 on the upper row produces the group `[F#3, F#4]` — the cross-staff octave that started all this.

Row choice records staff as metadata for display. It never filters the search.

### Rows must be geometrically identical and x-aligned

Same key width, same offsets, same range, so that C4 on the upper row sits directly above C4 on the lower row. This is non-negotiable: the entire premise is spatial memory, and misaligned rows destroy it.

Both rows render the full range **MIDI 29 (F1) to 87 (D#6)** — the movement's actual extent. Keys outside a given staff's observed range render dimmed rather than absent, because removing them would break alignment.

### Corpus-constrained highlighting is the point

Given the committed prefix, compute the set of pitches that can extend it anywhere in the piece, and highlight exactly those. Everything else dims.

Measured against the ingested movement:

| Prefix | Occurrences | Pitches that can follow |
|---|---|---|
| `[F#4]` | 77 | 20 of 55 |
| `[F#3 + F#4]` | 1 | **1 — C#4** |
| `[F#3+F#4] → [C#4]` | 1 | **1 — E4** |

After the cross-staff octave the keyboard lights a single key. The user cannot misremember their way out of it. This is the feature — error prevention at entry, rather than error forgiveness after the fact.

### Search runs on every commit

Results update as groups are added. No search button needed; keep one as a no-op-safe fallback. With exact matching and a repetitive piece, a one-note prefix yields many matches — cap the rendered result list and show the count.

## Architecture: keep the browser out of the logic

Two new pure modules, no React, no DOM:

- `lib/music/keyboard.ts` — geometry. `keyLayout(minPitch, maxPitch)` returns, per pitch, `{ pitch, x, width, isBlack }`. Pure arithmetic over the 12-tone pattern. **Fully unit-testable without a browser.**
- `lib/music/continuations.ts` — `possibleContinuations(stream, prefix): number[]`. Pure. **Fully unit-testable without a browser.**

The React component renders SVG from `keyLayout` output and dims from `possibleContinuations` output. This split is what makes most of this loop verifiable without a browser backend, which is the direct lesson of Loop 001.

## Scope

In scope: `lib/music/keyboard.ts`, `lib/music/continuations.ts`, `components/phrase-lookup/**`, `app/lookup/page.tsx`, `tests/**`, plus this loop's prompt archive and sprint output.

Explicitly out of scope:

- **Fuzzy, transposition-invariant, shape, or relaxed matching.** Loop 007. This loop is exact matching on the merged stream. Resist hard — the keyboard makes relaxation feel adjacent, and building it here would leave it unevaluated.
- Ranking and scoring.
- Web MIDI input. See the note below.
- Audio playback, note preview sounds.
- Score rendering or a piano roll.
- Computer-keyboard key mapping (`a`/`w`/`s`…). Nice, not now.
- Any npm dependency.
- Any change to `lib/music/musicxml.ts` or `phrase-search.ts`.

### Web MIDI is out of scope but must not be designed out

The capture path — "some input produced this set of pitches at this step" — must be a seam the component consumes, not logic buried in SVG click handlers. A later Web MIDI adapter should be able to feed the same seam. Do not build the adapter; do not make it impossible.

## Verifier

Checks 1–9 need no browser. Checks 10–15 do, and that is stated up front.

| # | Check | Passing result |
|---|---|---|
| 1 | `npm test` | all pass |
| 2 | `npm run build` | succeeds |
| 3 | Purity | `grep -rn "react\|document\|window\|fetch" lib/music/` returns nothing |
| 4 | Geometry: key count | `keyLayout(29, 87)` returns 59 keys, 24 black and 35 white |
| 5 | Geometry: black-key identification | exactly the pitches where `pitch % 12 ∈ {1,3,6,8,10}` are black |
| 6 | Geometry: alignment | `keyLayout` is a pure function of pitch range only — calling it twice returns identical output, so both rows are guaranteed aligned by construction |
| 7 | Geometry: ordering | x positions strictly increase with pitch for white keys; every black key's x falls between its neighbouring white keys' |
| 8 | Continuations: `[F#3+F#4]` | returns exactly `[61]` (C#4) |
| 9 | Continuations: `[F#4]` | returns 20 distinct pitches; `[C#4]` returns 17 |
| 10 | Two rows render, aligned | screenshot: a given pitch occupies the same x on both rows |
| 11 | **Founding cross-staff entry** | click F#3 on the lower row and F#4 on the upper row, commit, add C#4, add E4 → **exactly 1 result, measure 12, beat 4** |
| 12 | Highlighting collapses | after committing `[F#3+F#4]`, exactly one key is highlighted as available, and it is C#4 |
| 13 | Search-as-you-type | results update on commit without pressing a search button |
| 14 | Undo and clear | unchanged behaviour from Loop 001 |
| 15 | Accessibility | every key is a focusable control with an accessible name including its note name; the founding query is completable from the accessibility tree without coordinate clicking |

Check 11 is the loop. Check 6 is how alignment is guaranteed structurally rather than by eyeballing. Check 15 is a regression guard: Loop 001's grid was fully operable from the accessibility tree — that is how the macro layer verified it — and an SVG keyboard must not lose that.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- Do not relax matching to make check 11 produce a result. If exact matching on the merged stream does not return measure 12 beat 4, the defect is in ingestion or entry, not in strictness.
- Do not add a dependency for SVG, geometry, or state.
- If a Tailwind utility named in Loop 005's findings misbehaves, use a different working utility. Do not reopen the stylesheet.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–15 pass, evidence recorded |
| `BLOCKED` | no browser backend for 10–15, with 1–9 passing. Report and stop; do not substitute inspection. |
| `NEEDS_ARCHITECTURE_DECISION` | success appears to require a dependency, a change to the merged-stream contract, or abandoning the pure geometry/continuations split |
| `OUT_OF_SCOPE` | success appears to require fuzzy matching, ranking, MIDI, audio, or score rendering |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

## Open questions deliberately left to the executor

- Black-key x offsets: exact piano geometry versus placing them on white-key boundaries. Either is acceptable provided the 2-black/3-black grouping is visually unmistakable, which is the actual spatial cue.
- Whether note-name labels are always on, off, or toggleable. C-octave landmarks must always be visible.
- How simultaneous selection is expressed — click-to-toggle then commit, as Loop 001 did, is the safe default.

Record the choices and the reasoning in the sprint output; they are candidates for a later ADR if they prove load-bearing.
