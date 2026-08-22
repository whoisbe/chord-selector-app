# Loop Spec 012: Single-Row Input

Loop type: **Completion**
Status: engineered, awaiting executor assignment
Executor: **Claude Code** (Sonnet 5)
Depends on: Loop 011 DONE
Blocks: Loop 013 (results as onset strips) — which needs the freed vertical space and the simplified selection model

## Trigger

Loop 006 built a two-row keyboard, upper = staff 1, lower = staff 2. Real use found the split costs more than it gives.

**Staff is not hand, and the UI kept implying it was.** At measure 13 beat 1 the onset is `[B1, B2, F#3, F#4]`. The user plays `B1+B2` with the left hand and `F#3+F#4` with the right. The transcription puts `B1, B2, F#3` on staff 2 and only `F#4` on staff 1 — so **F#3 sits on the row and in the colour associated with the left hand while being played by the right.**

This is the third time staff-versus-hand has cost something:

1. ADR 0002 — searching by staff made the founding query invisible; it returns 0 in either staff alone and 1 in the merged stream.
2. Loop 006 review — the user looked for F# on the row his hand suggested, found it dimmed, and reported a bug that was not a bug.
3. The results colouring — grouped a right-hand note with left-hand notes.

The query has carried no staff since ADR 0002. Two rows therefore never affected what is searched. For input they ask a question the user cannot reliably answer and that does not matter.

## Goal

From **"input is split across two rows by a transcription detail that does not match the user's hands"** to **"input is one keyboard, and the counts the app reports are in notes rather than key elements."**

## Design decisions, frozen

### One keyboard for input

A single row spanning **MIDI 29 (F1) to 87 (D#6) — 59 keys, 34 white, 25 black**, the same range and geometry both rows use today. `keyLayout(29, 87)` is unchanged.

### Selection is pitch-only

`SelectedKey` in `src/lib/music/capture.ts` currently carries `{ pitch, staff }` and deduplicates on `pitch:staff`. Staff leaves the selection model: a selection is a set of pitches, deduplicated on pitch.

The cross-staff octave gesture still works and is now simpler — F#3 and F#4 are two keys on one keyboard, and clicking both yields `[54, 66]`.

`PitchCapture` keeps its `source: 'pointer' | 'midi'` seam. **Do not remove the seam** — a MIDI adapter must still be able to feed it. Whether `staff` remains on `PitchCapture` is the executor's call; if kept, it must not reach selection or the query.

### Counts become honest

Today the app reports "69 possible next keys" on an empty phrase, because a pitch present on both staves renders as two key elements. One row reports **55 possible next notes** — the count of distinct pitches, which is what the user thinks in.

### Dim states reduce from four to three

Two-row today: *available*, *cannot follow the phrase*, *does not co-occur with the current selection*, *outside this staff's range*. The fourth disappears with the rows.

Loop 011 distinguished the remaining reasons in the accessible name and they must stay distinguished. Accessible names lose the row: `"F#3, Lower row, available next"` becomes `"F#3, available next"`.

### Partial-selection count

While a group is being assembled, show how many onsets **contain** the current selection. This is the feedback that tells the user whether they are converging:

| Selection | Onsets containing it |
|---|---|
| F#4 | 87 |
| B3 | 65 |
| F#3 | 43 |
| B1 + B2 | 13 |
| F#3 + F#4 | **6** |

Rendering those onsets as strips once the count is small is **Loop 013**, not this loop. Here it is a count only.

### Staff colouring is not in this loop

Results keep their current text rendering. Loop 013 replaces them with strips and adds the opt-in staff toggle.

## Scope

In scope: `src/lib/music/capture.ts`, `src/lib/music/continuations.ts` (add the containment count if not present), `src/components/phrase-lookup/**`, `src/components/PhraseLookupTab.tsx`, `src/tests/**`, `src/styles/globals.css` if hand-authored CSS is needed, plus prompt archive and sprint output.

Explicitly out of scope:

- Results as onset strips, and the staff toggle — Loop 013
- **Fuzzy, transposition-invariant, shape, or relaxed matching** — Loop 007
- Inferring hands from pitch clustering — interesting, needs ground truth and an eval, not now
- Ranking, a second piece, Web MIDI, audio, score rendering
- `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`
- `phrase-search.ts`, `scripts/`, the committed artifact
- Any npm dependency; adding a Tailwind build step
- Any persistence or storage

## Styling constraint

**There is no Tailwind build step.** No `tailwindcss` dependency, no config; `src/index.css` is a pre-compiled Tailwind v4 artifact. **A utility class not already compiled into it does nothing — silently.** Use utilities confirmed present, or hand-author in `src/styles/globals.css` with a comment, as Loops 006 and 011 did.

## Verifier

Checks 1–10 need no browser.

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 under `strict` |
| 2 | `npm test` | all pass, including existing suites |
| 3 | `npm run build` | succeeds |
| 4 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing |
| 5 | Geometry unchanged | `keyLayout(29, 87)` still returns **59 keys — 34 white, 25 black** |
| 6 | Selection is pitch-only | selecting F#3 (54) then F#4 (66) yields the group `[54, 66]`; no staff appears in the query |
| 7 | Available count | nothing committed, nothing selected → **55** available notes |
| 8 | Co-occurrence preserved | after selecting F#3 (54) → exactly **16** pitches available: `30,32,33,35,36,37,42,44,45,47,48,61,66,68,72,73`; F#4 (66) among them |
| 9 | Sequence constraint preserved | after committing `[54,66]` with nothing selected → available = `[61]` |
| 10 | Containment counts | F#4 → **87**; B1+B2 → **13**; F#3+F#4 → **6** onsets contain the selection |
| 11 | **Founding query** | browser, one keyboard: click F#3, click F#4, Add group, C#4, Add group, E4, Add group → **1 result, measure 12, beat 4** |
| 12 | One keyboard rendered | exactly one key row; no "Upper row" / "Lower row" headings remain |
| 13 | Partial count visible | with B1+B2 selected the UI shows **13** onsets containing the selection |
| 14 | Accessibility | every key is a focusable control; names carry pitch and state and **no longer carry a row**; the founding query is completable from the accessibility tree **without coordinate clicking** |
| 15 | No regression | undo, clear, and search-on-commit behave as before |

Check 8 is the guard that Loop 011's co-occurrence rule survives the refactor — the numbers are measured from the committed artifact and must not move. Check 6 is the guard that staff really has left the query rather than being hidden.

**Checks 11–15 need a browser and a dev server.** Without one: run 1–10, mark the rest `not run`, end at `BLOCKED`, do not substitute inspection.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not adjust the numbers in checks 7–10 to match the implementation.** They are measured from the committed artifact; a mismatch means the code is wrong. If you believe a number is wrong, stop at `NEEDS_HUMAN_DECISION` and show the discrepancy.
- Do not relax matching to make check 11 return a result.
- Do not remove the `capture.ts` seam.
- Never silence a type error with `any` or an ignore comment.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–15 pass, evidence recorded |
| `BLOCKED` | no browser or dev server for 11–15, with 1–10 passing |
| `NEEDS_ARCHITECTURE_DECISION` | success appears to require a dependency or a change to the merged-stream contract |
| `NEEDS_HUMAN_DECISION` | a measured number is unreachable and you believe the number is wrong |
| `OUT_OF_SCOPE` | success appears to require strips, the staff toggle, fuzzy matching, or hand inference |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report it.** See `docs/learning/never-mutate-an-active-handoff.md`.

## Resolves an open decision

**Open Decision 5 — is staff worth keeping at all?** Answered by evidence rather than argument: **staff is worth keeping as data**, since MusicXML supplied it free and ingestion depends on it, **but it should be absent or opt-in on every user-facing surface.** Three separate failures trace to surfacing it as though it described hands. This loop removes it from input; Loop 013 makes it opt-in in results.
