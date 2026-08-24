# Loop Spec 017: Browse the Piece

Loop type: **Completion**
Status: engineered, awaiting executor assignment
Executor: TBD
Depends on: Loop 016 DONE
Blocks: nothing. Independent of Loops 018 and 019.

## Trigger

The Phrase Lookup tab opens empty. The only way to see any of the piece is to
enter a phrase and match something.

The user practises from the score and often knows where he stopped — "I left
off around measure 34" — and wants to open the app and get there. Today that is
impossible without first constructing a phrase he may not remember.

Requested on the model of Kibana Discover: the data is simply *there* on load,
and search narrows it.

## Goal

From **"the piece is invisible until you match something"** to **"the piece is
what you land on, readable from measure 1, with a way to jump to any measure."**

## Measured facts that shape the design

| Fact | Value |
|---|---|
| Onsets in the movement | 823 across 69 measures |
| Rendering **all** of it | ~**49,400px** tall, ~**48,600** key nodes |
| First 3 measures | 36 onsets, ~2,160px |
| First 5 measures | 61 onsets, ~3,660px |
| First 8 measures | 98 onsets, ~5,880px |
| Reaching measure 34 **by scrolling** | ~**24,100px**, about thirty screens |

Two things follow, and both are load-bearing.

### Incremental rendering is a ceiling, not a nicety

48,600 key nodes in one page is not a smoothness concern, it is a limit. The
initial view renders a small number of measures and extends as the user reads
forward.

### Scrolling cannot serve the stated use case

Reaching measure 34 costs ~24,100px. **A jump-to-measure control is required**,
not optional. Scroll is for reading forward from wherever you land; jump is for
getting there.

Loop 016 already built measure stepping with `<` / `>`; a jump control extends
that machinery rather than inventing new navigation.

### The fixed frame is what makes a long scroll coherent

Loop 016 established that while an occurrence is focused the window is fixed at
**MIDI 29–87, F1–D#6, 34 white keys** — identical to the input keyboard's range.

Browse uses the same fixed frame, for the same reason and more urgently: a
window that recomputed per measure would resize the keys continuously through
50,000px of scrolling. That decision was made for navigation and turns out to
carry browse.

## Design decisions, frozen

### Browse is the landing state of the Phrase Lookup tab

- With **no query entered**, the tab shows the piece from measure 1.
- Entering a query shows results, exactly as today. **The results surface built
  in Loops 014–016 is unchanged.**
- Clearing the query returns to browse.

One surface, two ways in. Do not build a second tab.

### No persistence

The user remembers the measure himself; the jump control gets him there. Loop
001 excluded storage and every loop since has kept it out.

**Session state only. No `localStorage`, `sessionStorage`, or `indexedDB`.**
Returning to a remembered position after a reload is explicitly *not* a
requirement — the human supplies the memory.

### Jump, then read

- A **jump-to-measure control**: enter a measure number, land there.
- Bounds are 1–69 for this piece, derived from the loaded piece rather than
  hardcoded. Out-of-range and non-numeric input must be handled visibly, not
  silently ignored.
- The control needs an accessible name; the e2e suite selects on names.

### Loading more must not be scroll-only

Scroll-triggered loading is a well-known accessibility trap: a keyboard or
screen-reader user who cannot generate a scroll event can never reach the rest
of the content.

**There must be a keyboard-operable way to load more** — a real focusable
control, not only an intersection observer. Both may exist; the control is the
requirement.

### Measure numbers are the landmark

Every measure in the browse view is labelled. This is the unit the user
navigates by.

## Scope

In scope: `src/components/phrase-lookup/**`, `src/lib/music/**` for pure
helpers, `src/tests/**`, `e2e/**`, `src/styles/globals.css`, plus prompt archive
and sprint output.

Explicitly out of scope:

- **Upload / a second piece** — Loops 018 and 019
- Any change to the results surface from Loops 014–016
- Fuzzy, transposition-invariant, shape or relaxed matching (Loop 007); hand
  inference; ranking
- The staff toggle, the 12-result cap, the 6-onset disclosure threshold
- `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`,
  `chordDatabase.ts`, `phrase-search.ts`, `scripts/`, the committed artifact
- Any npm dependency; a Tailwind build step; **any persistence**

## Still not a piano roll

Browse renders discrete onsets, one row each, evenly spaced. **No durations, no
continuous time axis, no proportional spacing by rhythm, no playback.**

Recorded honestly: this is the second widening in two loops. The product becomes
a **pitch-position score reader with lookup in it**. That serves the original
problem, and it is a real change of identity rather than a neutral addition.

## Constraints inherited

**No Tailwind build step.** `src/index.css` is a pre-compiled Tailwind v4
artifact; a utility class not already compiled into it does nothing, silently.
Use utilities confirmed present, or hand-author in `src/styles/globals.css` with
a comment.

**The e2e suite is accessibility-first** — `getByRole` and `getByText`, never
`getByTestId`. That is what makes it double as the accessible-naming regression
test.

## Verifier

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 under `strict` |
| 2 | `npm test` | all pass |
| 3 | `npm run build` | succeeds |
| 4 | `npm run test:e2e` | all specs pass, existing **and** new |
| 5 | Suite accessibility-first | `grep -rn "getByTestId" e2e/` returns nothing |
| 6 | No fixed sleeps | `grep -rn "waitForTimeout\|setTimeout" e2e/` returns nothing |
| 7 | Browse on load | with no query, measure 1 is visible without interaction |
| 8 | **Bounded initial render** | the initial view renders **well under** the full 823 onsets — state the number chosen and the resulting node count |
| 9 | **Loading extends, not replaces** | after loading more, earlier measures are still present |
| 10 | **Keyboard-operable load-more** | more content can be loaded with the keyboard alone, no scroll event |
| 11 | **Jump works** | jumping to measure 34 shows measure 34 without ~24,100px of scrolling |
| 12 | Jump bounds | 0, 70 and non-numeric input are handled **visibly**; the piece's 69 is derived, not hardcoded |
| 13 | **Fixed frame** | every browse keyboard spans F1–D#6, 34 white keys, and the range is identical at measure 1 and at measure 34 |
| 14 | **A pitch holds its x** | a pitch in two different measures occupies the same x — assert on measured geometry |
| 15 | Measures labelled | every rendered measure carries its number |
| 16 | Query replaces browse | entering a phrase shows results; clearing returns to browse |
| 17 | Results surface untouched | Loops 014–016 behaviour unchanged: cap `78 occurrences — showing 12`, disclosure 13 → count / 6 → strips, focus and `<` `>` still work |
| 18 | Session-only | `grep -rn "localStorage\|sessionStorage\|indexedDB" src/` returns nothing |
| 19 | Not a piano roll | evenly spaced rows, no durations, no playback, `audio`/`video` count 0 |
| 20 | **Vacuity** | break one new assertion, capture the failure output verbatim, revert, confirm a clean tree |
| 21 | Existing counts intact | 55 / 16 / 43 / 8 / 6 unchanged |

**Checks 13 and 14 are the loop**, for the same reason they were in 016: a frame
that shifts while you scroll makes the reading actively misleading. **Check 10
is the one most likely to be skipped** — scroll-triggered loading looks finished
without it.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not change `src/lib/music/onset-range.ts`** — browse uses the fixed
  full-piece range, it does not alter how ranges are computed.
- Do not change the cap, the disclosure threshold, or the results surface.
- Do not add persistence to satisfy any check.
- Do not use `getByTestId` in a new test.
- Do not paper over e2e flakiness with retries or timeouts. A flaky test is a
  finding.
- Never silence a type error with `any` or an ignore comment.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–21 pass, evidence recorded |
| `NEEDS_ARCHITECTURE_DECISION` | browse appears to require a dependency, persistence, or a merged-stream contract change |
| `OUT_OF_SCOPE` | success appears to require upload, a second piece, piano-roll features, or changes to the results surface |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report
it.** See `docs/learning/never-mutate-an-active-handoff.md`.

## Left to the executor

- **How many measures load initially, and how many per extension.** 3 measures
  is ~2,160px, 5 is ~3,660px, 8 is ~5,880px. Pick, justify, and state the
  resulting node count.
- Whether scroll-triggered loading exists *alongside* the required keyboard
  control.
- Where the jump control sits, and whether `<` / `>` appear in browse as well.
- How browse and results visually relate when the query is cleared.

Record each choice and its reasoning.
