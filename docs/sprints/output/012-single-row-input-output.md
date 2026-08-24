# Sprint 12 Output: Single-Row Input

**Terminal state: `DONE`**

Loop spec: `docs/planning/loops/012-single-row-input.md`
Handoff: `docs/agent-handoff.md`

## `staff` on `PitchCapture`

**Removed entirely**, not kept. `PitchCapture` is now `{ source: PitchCaptureSource; pitches: readonly number[] }`.

Reasoning: `staff` on `PitchCapture` existed to record *which row* the user's pointer captured a pitch from. With one keyboard there is no second row for a capture to originate from, so the field would carry no information — every pointer capture would set the same constant. Keeping a field that can only ever hold one value is worse than removing it: a future MIDI adapter reading this type would have to invent a staff to satisfy the shape rather than being told the shape doesn't need one. The seam itself — `source: 'pointer' | 'midi'` plus a `pitches` array — is unchanged and still lets a hardware adapter feed the same path.

`SelectedKey` is now a plain `number` (previously `{ pitch, staff }`, deduped on `pitch:staff`). A selection is `readonly SelectedKey[]`, i.e. `readonly number[]`, deduped by `Set` semantics in `applyCapture`.

## Three dim states, how they're distinguished

State enum on the keyboard is unchanged: `'entered' | 'available' | 'unavailable'`, with `UnavailableReason = 'sequence' | 'cooccurrence'` further splitting the unavailable case. The fourth reason from Loop 006/011 — "outside this staff's range" — is gone along with `extent`/`inExtent`; there is one keyboard covering the full range, so nothing is ever out of range.

- **Visually**: `entered` gets the solid accent fill; `available` gets a 2px accent border; `unavailable` (either reason) is rendered at reduced opacity with a plain border. The two `unavailable` reasons are **not** visually distinguished from each other — same as before this loop — because a sighted user only needs "don't press this."
- **Accessible name**: `"{pitch label}, {state word}"` — e.g. `"F#3, available next"`, `"F#3, entered"`, `"F#3, not available next"` (sequence), `"F#3, does not occur together with the current selection"` (cooccurrence). No row is mentioned anywhere — verified live: `find` on the running app returned `"F#3, available next"`, `"B1, available next"`, etc., with nothing else appended.

## Task 0 — handoff archive

Copied `docs/agent-handoff.md` to `docs/prompts/sprint12-claude-code-single-row.md`.

`cmp` exit code: **0**.

## Changed files

| File | In scope? |
|---|---|
| `src/lib/music/capture.ts` | Yes — Task 1, pitch-only selection |
| `src/lib/music/continuations.ts` | Yes — Task 2, added `containmentCount` |
| `src/components/phrase-lookup/PhraseKeyboard.tsx` | Yes — Task 3, one row |
| `src/components/phrase-lookup/PhraseLookupSurface.tsx` | Yes — Tasks 3–4, one keyboard + partial count |
| `src/tests/continuations.test.ts` | Yes — Task 5, updated capture-seam tests, added containment-count tests |
| `docs/prompts/sprint12-claude-code-single-row.md` | Yes — Task 0, archive |
| `docs/sprints/output/012-single-row-input-output.md` | Yes — this file |

No forbidden file (`KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`, `chordVoicings.test.ts`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `vercel.json`, `phrase-search.ts`, `scripts/`, `moonlight-sonata.ts`) was touched.

Pre-existing uncommitted changes in the working tree (`AGENTS.md`, `CLAUDE.md`, `docs/agent-handoff.md` itself, `docs/planning/loops/006-two-row-keyboard-input.md`, `docs/planning/product-loop-map.md`, `docs/learning/`, and several sprint kickoff/output docs for other loops) predate this session and were left untouched and uncommitted — they are not part of this loop's scope.

## Verification — all 15 checks

**Check 1 — `npm run typecheck`.** Exit 0, no output beyond the script header:
```
> Chord Selector Application@0.1.0 typecheck
> tsc --noEmit
```
**Pass.**

**Check 2 — `npm test`.** All pass:
```
Test Files  7 passed (7)
     Tests  80 passed (80)
```
**Pass.**

**Check 3 — `npm run build`.** Succeeds:
```
✓ 1697 modules transformed.
✓ built in 735ms
```
**Pass.**

**Check 4 — Purity.** `grep -rniE "react|document|window|fetch|jsdom" src/lib/music/` returned nothing (exit 1, no matches). **Pass.**

**Check 5 — Geometry unchanged.** `keyLayout(29, 87)` → `total 59 white 34 black 25`. **Pass.**

**Check 6 — Selection is pitch-only.** Captured F#3 then F#4 through `applyCapture`:
```
selection: [ 54, 66 ]   query pitches: [ 54, 66 ]
```
No `staff` field exists anywhere in `capture.ts` or on the query path. **Pass.**

**Check 7 — Available count.** Nothing committed, nothing selected: `possibleContinuations(moonlightSonata, []).length` → **55**. Confirmed live in the browser: "55 possible next notes highlighted". **Pass.**

**Check 8 — Co-occurrence preserved.** F#3 (54) selected:
```
[ 30, 32, 33, 35, 36, 37, 42, 44, 45, 47, 48, 61, 66, 68, 72, 73 ]
```
Exactly the 16 pitches from Section 4, F#4 (66) among them. **Pass.**

**Check 9 — Sequence constraint preserved.** `[54,66]` committed, nothing selected: `possibleContinuations(moonlightSonata, [{notes:[54,66]}])` → `[ 61 ]`. **Pass.**

**Check 10 — Containment counts.**
```
F#4 containment:        87
B1+B2 containment:       13
F#3+F#4 containment:      6
```
All three match Section 4 exactly. **Pass.**

**Check 11 — Founding query (browser).** Entry sequence, using accessibility-tree lookups (`find` + ref-based `click`, no coordinates):

1. Click `"F#3, available next"`
2. Click `"F#4, available next"` (still available after F#3 — cross-staff octave preserved)
3. Click "Add group" → phrase becomes `[F#3+F#4]`
4. Click `"C#4, available next"`
5. Click "Add group" → phrase becomes `[F#3+F#4] → [C#4]`
6. Click `"E4, available next"`
7. Click "Add group" → phrase becomes `[F#3+F#4] → [C#4] → [E4]`

Result, verbatim from the UI: **"1 occurrence of [F#3+F#4] → [C#4] → [E4]"**, **"Measure 12, beat 4"**. **Pass.**

**Check 12 — One keyboard rendered.** `grep -rn "Upper row|Lower row" src/` returns nothing. Live screenshot shows a single key row; no row headings anywhere. **Pass.**

**Check 13 — Partial count visible.** Cleared selection, selected B1 then B2. UI showed: **"Current group: [B1+B2]"**, **"13 onsets in the piece contain the current selection"**. **Pass.**

**Check 14 — Accessibility.** Every key is a `<button>` with `aria-label`/`title` carrying pitch and state, no row (`"F#3, available next"`, `"B1, available next"`, `"C#4, available next"`, `"E4, available next"` — all confirmed via `find`). The entire founding query (check 11) was completed using only `find` (accessibility-tree lookups by name) and ref-based clicks — zero coordinate clicks. **Pass.**

**Check 15 — No regression.** Committed `[B1+B2]`, then clicked "Undo last group": phrase returned to empty, current group to "nothing selected", available count back to 55. "Add group" continues to trigger an immediate results update without needing the "Search" fallback button (observed at every commit step in check 11). "Clear all" was exercised earlier in the session and reset state correctly. **Pass.**

## Commit

See the commit created immediately after this file was written; SHA recorded in the follow-up message to the user (this document is written before the commit exists, per Task 6's order: "Run Section 8, write the output, commit once").

## Repair attempts

**Zero.** Implementation matched all Section 4 numbers on the first pass — the containment-count semantics (global containment over the whole stream, independent of any committed prefix) were verified against the measured numbers with a standalone script before wiring them into `continuations.ts`, so no repair cycle was needed.

## Stop rules triggered

None — all 15 checks passed on the initial implementation.

## Out-of-scope pressure encountered

None. The task stayed inside pitch-only selection, one keyboard, and the containment count; no pressure arose to build onset strips, the staff toggle, fuzzy matching, or hand inference.

## Risks and open questions

- `possibleContinuationsByStaff` and `staffPitchRanges` remain in `continuations.ts`, fully tested, but are now unused by any UI surface — the phrase keyboard consumes `possibleContinuations` directly. They are left in place because they are pure, still correctly tested, and Loop 013 (the staff toggle) is a plausible future consumer; removing and re-adding them would be churn.
- `GroupByStaff` in `PhraseLookupSurface.tsx` (results rendering) still reads `group.staves` directly per match — this is untouched by this loop, as results text rendering is explicitly out of scope until Loop 013.
- The pre-existing dev server this session tested against (PID owned by an earlier process, port 3000) was reused rather than started fresh, since Vite's HMR reflected all source edits live; a second `npm run dev` invocation that this session started collided on the port and was killed immediately to avoid leaving a duplicate process running.
