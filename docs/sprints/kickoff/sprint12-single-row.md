# Agent Handoff: Single-Row Input

**Assigned agent: Claude Code**
**Model: Sonnet 5 (`claude-sonnet-5`)** — a bounded refactor plus one small feature, with measured expected values throughout.
Loop spec: `docs/planning/loops/012-single-row-input.md`
Sprint: 12
Prepared: 2026-08-02
Sprint output: `docs/sprints/output/012-single-row-input-output.md`

Self-contained. Execute from this document alone. Do not rely on prior conversation.

Repository: `/Users/b/dev/chord-selector-app`, branch `phrase-lookup`. **Do not push. Do not merge to `main`.**

Checks 11–15 need a browser and a dev server (`npm run dev`, port 3000).

## 1. Why

Loop 006 built a two-row keyboard — upper = staff 1, lower = staff 2. Real use showed the split costs more than it gives, because **staff is not hand and the UI implied it was.**

At measure 13 beat 1 the onset is `[B1, B2, F#3, F#4]`. The user plays `B1+B2` with the left hand and `F#3+F#4` with the right. The transcription puts `B1, B2, F#3` on staff 2 and only `F#4` on staff 1 — so **F#3 appears on the row associated with the left hand while being played by the right.**

Third time this has cost something: ADR 0002 exists because searching by staff made the founding query invisible; a bug report was filed against correct behaviour because the user looked on the row his hand suggested; and now the layout itself misleads.

**The query has carried no staff since ADR 0002.** Two rows never affected what is searched. For input they ask a question the user cannot answer and that does not matter.

## 2. Goal

> From "input is split across two rows by a transcription detail that does not match the user's hands" to "input is one keyboard, and the counts the app reports are in notes rather than key elements."

## 3. What changes

**One keyboard**, MIDI 29 (F1) to 87 (D#6) — **59 keys, 34 white, 25 black**. Same range and geometry as each existing row. `keyLayout(29, 87)` is unchanged; call it once instead of twice.

**Selection becomes pitch-only.** `SelectedKey` in `src/lib/music/capture.ts` currently carries `{ pitch, staff }` and dedupes on `pitch:staff`. Staff leaves the selection model — a selection is a set of pitches, deduped on pitch. The cross-staff octave still works and gets simpler: F#3 and F#4 are two keys on one keyboard.

**Keep the `capture.ts` seam.** `PitchCapture` carries `source: 'pointer' | 'midi'` so a later MIDI adapter can feed the same path. Do not remove it. Whether `staff` stays on `PitchCapture` is your call — but it must not reach selection or the query.

**Counts become honest.** Today the app says "69 possible next keys" because a pitch on both staves renders twice. One row reports **55 possible next notes** — distinct pitches, which is what the user thinks in.

**Dim states go from four to three.** *Available*, *cannot follow the phrase*, *does not co-occur with the current selection*. The fourth — *outside this staff's range* — disappears with the rows. Loop 011 distinguished the remaining reasons in the accessible name; keep them distinguished.

**Accessible names lose the row.** `"F#3, Lower row, available next"` becomes `"F#3, available next"`.

**New: partial-selection count.** While assembling a group, show how many onsets **contain** the current selection. This is the signal that tells the user whether they are converging — 87 → 13 → 6 → 1.

## 4. Measured expected values

From the committed artifact at `HEAD`. Use as test fixtures. **Do not adjust these to match your implementation.**

- Nothing committed, nothing selected → **55** available notes
- F#3 (54) selected → exactly **16** available:
  `30, 32, 33, 35, 36, 37, 42, 44, 45, 47, 48, 61, 66, 68, 72, 73`
  (F#1 G#1 A1 B1 C2 C#2 F#2 G#2 A2 B2 C3 C#4 **F#4** G#4 C5 C#5)
- F#3 + F#4 selected → exactly **8** available: `30, 33, 35, 36, 42, 45, 47, 48`
- `[54,66]` committed, nothing selected → available = `[61]`
- Onsets **containing** the selection: F#4 → **87**; B3 → **65**; F#3 → **43**; B1+B2 → **13**; F#3+F#4 → **6**
- Founding query `[54,66] → [61] → [64]` → **exactly 1 match, measure 12, beat 4**

## 5. Explicitly NOT in this loop

- **Results as onset strips, and the staff-colour toggle** — Loop 013. Results keep their current text rendering here.
- Fuzzy, transposition-invariant, shape or relaxed matching — Loop 007
- Inferring hands from pitch clustering — needs ground truth and an eval
- Ranking, a second piece, Web MIDI, audio, score rendering
- Any persistence or storage

## 6. Styling constraint — read before writing UI

**There is no Tailwind build step in this project.** No `tailwindcss` dependency, no PostCSS or Tailwind config; `src/index.css` is a pre-compiled Tailwind v4 artifact.

**A utility class not already compiled into `src/index.css` does nothing — silently.** No error, no warning. Use utilities you have confirmed exist, or hand-author rules in `src/styles/globals.css` with a comment, as Loops 006 and 011 did.

## 7. Tasks

**Task 0.** Copy `docs/agent-handoff.md` verbatim to `docs/prompts/sprint12-claude-code-single-row.md`. Verify with `cmp -s`, record the exit code.

**Task 1.** Simplify `src/lib/music/capture.ts` to pitch-only selection, keeping the seam.

**Task 2.** Add the containment count to `src/lib/music/continuations.ts` if not already present. Keep it **pure**.

**Task 3.** Collapse the keyboard to one row.

**Task 4.** Surface the partial-selection count.

**Task 5.** Update tests for the Section 4 values.

**Task 6.** Run Section 8, write the output, commit once.

## 8. Verification requirements

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 under `strict` |
| 2 | `npm test` | all pass, including existing suites |
| 3 | `npm run build` | succeeds |
| 4 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing |
| 5 | Geometry unchanged | `keyLayout(29,87)` → **59 keys, 34 white, 25 black** |
| 6 | Selection is pitch-only | selecting F#3 then F#4 yields `[54, 66]`; **no staff appears anywhere in the query** |
| 7 | Available count | nothing committed, nothing selected → **55** |
| 8 | Co-occurrence preserved | F#3 selected → exactly the **16** pitches in Section 4, F#4 among them |
| 9 | Sequence constraint preserved | `[54,66]` committed → available = `[61]` |
| 10 | Containment counts | F#4 → 87, B1+B2 → 13, F#3+F#4 → 6 |
| 11 | **Founding query** | browser: click F#3, click F#4, Add group, C#4, Add group, E4, Add group → **1 result, measure 12, beat 4** |
| 12 | One keyboard | exactly one key row; no "Upper row"/"Lower row" headings remain |
| 13 | Partial count visible | with B1+B2 selected, the UI shows **13** |
| 14 | Accessibility | keys are focusable controls; names carry pitch and state and **no row**; founding query completable from the accessibility tree **without coordinate clicking** |
| 15 | No regression | undo, clear, and search-on-commit behave as before |

Check 8 guards Loop 011's co-occurrence rule through the refactor. Check 6 guards that staff genuinely left the query rather than being hidden.

Without a browser: run 1–10, mark 11–15 `not run` with the reason, end at `BLOCKED`, **do not substitute code inspection**.

## 9. Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not adjust the Section 4 numbers.** A mismatch means the code is wrong. If you believe a number is wrong, stop at `NEEDS_HUMAN_DECISION` and show it.
- Do not relax matching to make check 11 return a result.
- Do not remove the `capture.ts` seam.
- Never silence a type error with `any`, `@ts-ignore`, or `@ts-expect-error`.

## 10. Forbidden actions

- Editing `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`, `chordVoicings.test.ts`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `vercel.json`
- Editing `phrase-search.ts`, `scripts/`, or the committed `moonlight-sonata.ts` artifact
- Building onset strips or the staff toggle (Loop 013)
- Fuzzy or shape matching (Loop 007); hand inference; ranking; a second piece
- Any npm dependency; a Tailwind build step; any persistence
- `git push`, merging to `main`, rewriting history
- Writing anything in `/Users/b/dev/chordsense`

## 11. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–15 pass, evidence recorded |
| `BLOCKED` | no browser or dev server for 11–15, with 1–10 passing |
| `NEEDS_ARCHITECTURE_DECISION` | success appears to require a dependency or a merged-stream contract change |
| `NEEDS_HUMAN_DECISION` | a Section 4 number is unreachable and you believe it is wrong |
| `OUT_OF_SCOPE` | success appears to require strips, the toggle, fuzzy matching, or hand inference |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report it.** See `docs/learning/never-mutate-an-active-handoff.md`.

## 12. Output requirements

Write `docs/sprints/output/012-single-row-input-output.md`:

- exactly one terminal state
- whether `staff` was kept on `PitchCapture`, and why
- how the three remaining dim states are distinguished, visually and in accessible names
- Task 0 archive path and `cmp` exit code
- every changed file and whether it was in scope
- all 15 checks with **actual output** — quote the real pitch lists and counts for 5–10, not "as expected"
- for check 11, the entry sequence and result verbatim
- the commit SHA
- repair attempts used, including zero
- stop rules triggered, if any
- out-of-scope pressure encountered
- risks and open questions

When `DONE`, the next recommended action must be "accept current loop as complete."
