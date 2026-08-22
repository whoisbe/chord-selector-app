# Agent Handoff: Browse the Piece

**Assigned agent: Claude Code**
**Model: Opus 5 (`claude-opus-5`)** — four design decisions are left open, in Section 10. Tier follows loop type.
Loop spec: `docs/planning/loops/017-browse-the-piece.md`
Sprint: 17
Prepared: 2026-08-07
Sprint output: `docs/sprints/output/017-browse-the-piece-output.md`

Self-contained. Execute from this document alone. Do not rely on prior conversation.

Repository: `/Users/b/dev/chord-selector-app`, branch `phrase-lookup`. **Do not push. Do not merge to `main`.**

Browser verification is `npm run test:e2e` — a headless Playwright suite of 42 tests across three specs. **Do not add manual browser checks.** One machine step may be needed once: `npx playwright install chromium`.

## 1. Why

The Phrase Lookup tab opens empty. The piece is invisible until you construct a phrase and match something.

The user practises from the score and often knows where he stopped — "I left off around measure 34" — and wants to open the app and get there. Today that is impossible without first building a phrase he may not remember.

Requested on the model of Kibana Discover: the data is simply *there* on load, and search narrows it.

## 2. Goal

> From "the piece is invisible until you match something" to "the piece is what you land on, readable from measure 1, with a way to jump to any measure."

## 3. Measured facts — these drove the design

| Fact | Value |
|---|---|
| Onsets in the movement | 823 across 69 measures |
| Rendering **all** of it | ~**49,400px** tall, ~**48,600** key nodes |
| First 3 measures | 36 onsets, ~2,160px |
| First 5 measures | 61 onsets, ~3,660px |
| First 8 measures | 98 onsets, ~5,880px |
| Reaching measure 34 **by scrolling** | ~**24,100px**, about thirty screens |

### 3a. Incremental rendering is a ceiling, not a nicety

48,600 key nodes in one page is a limit, not a smoothness concern. The initial view renders a small number of measures and extends as the user reads forward.

### 3b. Scrolling cannot serve the stated use case

Reaching measure 34 costs ~24,100px. **A jump-to-measure control is required**, not optional. Scroll is for reading forward from wherever you land; jump is for getting there.

Loop 016 already built `<` / `>` measure stepping — a jump control extends that machinery rather than inventing new navigation.

### 3c. The fixed frame is what makes a long scroll coherent

Loop 016 fixed the focused window at **MIDI 29–87, F1–D#6, 34 white keys** — identical to the input keyboard's range.

Browse uses the same fixed frame, more urgently: a window recomputing per measure would resize keys continuously through 50,000px of scrolling.

## 4. Frozen design

**Browse is the landing state of the Phrase Lookup tab.**

- With **no query entered**, the tab shows the piece from measure 1.
- Entering a query shows results, exactly as today. **The results surface from Loops 014–016 is unchanged.**
- Clearing the query returns to browse.

One surface, two ways in. **Do not build a second tab.**

**No persistence.** The user remembers the measure himself; the jump control gets him there. Loop 001 excluded storage and every loop since has kept it out.

**Session state only. No `localStorage`, `sessionStorage`, or `indexedDB`.** Surviving a reload is explicitly *not* a requirement — the human supplies the memory.

**Jump, then read.**

- A **jump-to-measure control**: enter a measure number, land there.
- Bounds are 1–69 for this piece, **derived from the loaded piece, not hardcoded**.
- Out-of-range and non-numeric input handled **visibly**, not silently ignored.
- It needs an accessible name; the e2e suite selects on names.

**Loading more must not be scroll-only.**

Scroll-triggered loading is a known accessibility trap: someone who cannot generate a scroll event can never reach the rest of the content.

**There must be a keyboard-operable way to load more** — a real focusable control, not only an intersection observer. Both may exist; the control is the requirement.

**Measure numbers are the landmark.** Every rendered measure is labelled.

## 5. Still not a piano roll

Discrete onsets, one row each, evenly spaced. **No durations, no continuous time axis, no proportional spacing by rhythm, no playback.**

Recorded honestly: this is the second widening in two loops. The product becomes a **pitch-position score reader with lookup in it**. That serves the original problem, and it is a real change of identity rather than a neutral addition.

## 6. Constraints inherited

**No Tailwind build step.** `src/index.css` is a pre-compiled Tailwind v4 artifact. A utility class not already compiled into it **does nothing, silently** — no error, no warning. Use utilities confirmed present, or hand-author in `src/styles/globals.css` with a comment, as Loops 006, 011, 012, 014, 015 and 016 did.

**The e2e suite is accessibility-first** — `getByRole` and `getByText`, never `getByTestId`. That is what makes it double as the accessible-naming regression test. Nine unused `data-testid` attributes exist in `PhraseLookupSurface.tsx` from earlier loops: leave them, do not use them, do not remove them.

## 7. Tasks

**Task 0.** Copy `docs/agent-handoff.md` verbatim to `docs/prompts/sprint17-claude-code-browse.md`. Verify with `cmp -s`, record the exit code.

**Task 1.** Add pure helpers for measure slicing and piece bounds. Unit-test them.

**Task 2.** Build the browse view on the fixed F1–D#6 frame, rendering a bounded initial set of measures.

**Task 3.** Add the keyboard-operable load-more control (and scroll-triggered loading alongside it, if you choose).

**Task 4.** Add the jump-to-measure control with bounds and visible error handling.

**Task 5.** Wire browse as the no-query landing state; query shows results; clearing returns to browse.

**Task 6.** Extend `e2e/` accessibility-first.

**Task 7.** Run Section 8, write the output, commit once.

## 8. Verification requirements

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 under `strict` |
| 2 | `npm test` | all pass |
| 3 | `npm run build` | succeeds |
| 4 | `npm run test:e2e` | all specs pass, existing **and** new |
| 5 | Suite accessibility-first | `grep -rn "getByTestId" e2e/` returns nothing |
| 6 | No fixed sleeps | `grep -rn "waitForTimeout\|setTimeout" e2e/` returns nothing |
| 7 | Browse on load | with no query, measure 1 is visible without interaction |
| 8 | **Bounded initial render** | the initial view renders **well under** 823 onsets — state the number chosen and the resulting node count |
| 9 | **Loading extends, not replaces** | after loading more, earlier measures are still present |
| 10 | **Keyboard-operable load-more** | more content loads with the keyboard alone, **no scroll event** |
| 11 | **Jump works** | jumping to measure 34 shows measure 34 without ~24,100px of scrolling |
| 12 | Jump bounds | 0, 70 and non-numeric input handled **visibly**; the 69 is derived, not hardcoded |
| 13 | **Fixed frame** | every browse keyboard spans F1–D#6, 34 white keys, and the range is **identical at measure 1 and at measure 34** |
| 14 | **A pitch holds its x** | a pitch in two different measures occupies the same x — assert on measured geometry, not by eye |
| 15 | Measures labelled | every rendered measure carries its number |
| 16 | Query replaces browse | entering a phrase shows results; clearing returns to browse |
| 17 | Results surface untouched | cap `78 occurrences — showing 12`; disclosure 13 → count, 6 → strips; focus and `<` `>` still work |
| 18 | Session-only | `grep -rn "localStorage\|sessionStorage\|indexedDB" src/` returns nothing |
| 19 | Not a piano roll | evenly spaced rows, no durations, no playback, `audio`/`video` element count 0 |
| 20 | **Vacuity** | break one new assertion, capture the failure output verbatim, revert, confirm a clean tree |
| 21 | Existing counts intact | 55 / 16 / 43 / 8 / 6 unchanged |

**Checks 13 and 14 are the loop**, for the reason they were in 016: a frame that shifts while you scroll makes the reading actively misleading rather than merely unhelpful.

**Check 10 is the one most likely to be skipped.** Scroll-triggered loading looks finished without it, and silently strands anyone who cannot scroll.

## 9. Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not change `src/lib/music/onset-range.ts`** — browse uses the fixed full-piece range; it does not alter how ranges are computed elsewhere.
- Do not change the cap, the disclosure threshold, or the results surface.
- **Do not add persistence** to satisfy any check.
- Do not use `getByTestId` in a new test, even where it is easier.
- Do not paper over e2e flakiness with retries, longer timeouts, or `test.slow()`. A flaky test is a finding.
- Never silence a type error with `any`, `@ts-ignore`, or `@ts-expect-error`.

## 10. Decisions left to you — record each with reasoning

- **How many measures load initially, and how many per extension.** 3 is ~2,160px, 5 is ~3,660px, 8 is ~5,880px. Pick, justify, and state the resulting node count.
- Whether scroll-triggered loading exists **alongside** the required keyboard control.
- **Where the jump control sits**, and whether `<` / `>` appear in browse as well as in focused results.
- **How browse and results relate visually** when the query is cleared.

## 11. Forbidden actions

- Upload, or loading a second piece — Loops 018 and 019
- Any change to the results surface from Loops 014–016
- Fuzzy, transposition-invariant, shape or relaxed matching (Loop 007); hand inference; ranking
- Changing the staff toggle, the 12-result cap, or the 6-onset disclosure threshold
- Editing `src/lib/music/onset-range.ts`, `phrase-search.ts`, `scripts/`, or the committed `moonlight-sonata.ts` artifact
- Editing `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `vercel.json`
- Any npm dependency; a Tailwind build step; **any persistence**
- Using or removing the nine pre-existing `data-testid` attributes
- `git push`, merging to `main`, rewriting history
- Writing anything in `/Users/b/dev/chordsense`

## 12. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–21 pass, evidence recorded |
| `NEEDS_ARCHITECTURE_DECISION` | browse appears to require a dependency, persistence, or a merged-stream contract change |
| `OUT_OF_SCOPE` | success appears to require upload, a second piece, piano-roll features, or changes to the results surface |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report it.** Do not resume against an amended contract — a prior loop failed exactly that way. See `docs/learning/never-mutate-an-active-handoff.md`.

## 13. Output requirements

Write `docs/sprints/output/017-browse-the-piece-output.md`:

- exactly one terminal state
- the four Section 10 decisions and the reasoning for each
- Task 0 archive path and `cmp` exit code
- every changed file and whether it was in scope
- all 21 checks with **actual output** — quote the measured geometry for 13 and 14, and the real node counts for 8, not "as expected"
- **the vacuity-proof failure output, verbatim**, and confirmation it was reverted with a clean tree
- how load-more works from the keyboard alone
- the new e2e test names and what each covers
- the commit SHA
- repair attempts used, including zero
- stop rules triggered, if any
- out-of-scope pressure encountered — particularly any pull toward persistence or piano-roll features
- risks and open questions

When `DONE`, the next recommended action must be "accept current loop as complete."
