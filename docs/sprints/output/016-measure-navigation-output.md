# Sprint 16 Output: Focused Occurrence with Measure Navigation

**Terminal state: `DONE`**

Loop spec: `docs/planning/loops/016-measure-navigation.md`
Handoff: `docs/agent-handoff.md` (archived verbatim, see Task 0 below)
Executor: Claude Code (Opus 5)

## Section 10 decisions

### 1. How collapsed occurrences summarise themselves

**A collapsed occurrence shows its place and the one onset that immediately
follows it — `Measure 42, beat 1  then [G#3]` — on a single line, as a
button.**

Matching here is exact, so every occurrence of a query has the *same* matched
notes. Repeating those notes on each collapsed line would distinguish nothing;
a reader scanning the list to decide which occurrence to open would be reading
the same text over and over. What actually differs between two occurrences is
**where** it is and **what happens next**, so those are the two things the
line carries. The first following onset is also the cheapest form of the
question the compact strip answers ("what comes immediately next"), so the
collapsed line stays useful for choosing, not merely for identifying. When an
occurrence is the last thing in the movement the line reads `end of
movement`, matching the wording the strip already uses.

The line is a real `<button>` with `aria-expanded`, not a clickable `<div>`,
because focusing is now an interaction.

### 2. Where `<` and `>` sit

**Above the onset column, on one row with the measure label and the "Back to
all occurrences" control — rendered once, not duplicated above and below.**

A measure of this movement is a dozen onsets and roughly a thousand pixels
tall. Below the column would put the controls off-screen at exactly the moment
the reader has finished the measure and wants the next one. Beside the column
would either narrow the keyboards (which is the one thing the fixed frame
exists to prevent) or drift away from them while scrolling. Above keeps the
control adjacent to the measure label it changes and to the heading that says
which occurrence is open.

They are rendered **once**. A second copy at the bottom would be convenient
for the mouse and actively harmful for everything else: two controls with the
accessible name `"Next measure, 13"` are two identical announcements for a
screen reader and an ambiguous target for the e2e suite that selects by name.

### 3. How the anchor is distinguished — and not by colour

**By a word first, a rule second, and a colour only third.**

Rows belonging to the matched occurrence carry a visible **`▌ matched`** badge
in the row gutter, and a **solid 3px rule down the left edge** of the row.
Unmarked rows have the same gutter (empty) and the same rule (transparent).
There is also a green tint and a green rule colour, but hue is strictly the
redundant channel — exactly as the staff markers in `OnsetStrip.tsx` are shapes
first and colours second.

In greyscale, with colours inverted, or under any colour-vision deficiency,
the anchor is still identifiable because the word "matched" is printed next to
it. The e2e check asserts on that word and on measured geometry, never on a
colour, which is what makes the claim testable rather than a promise.

The gutter is a **fixed 5rem on every row, marked or not**. A gutter that only
appeared on marked rows would push those keyboards sideways — breaking exactly
the x-alignment the fixed window exists to guarantee. There is a dedicated
test for this (`badged and unbadged rows start at the same x`), because the
bug it prevents would have been introduced *by* the fix for check 14.

## Task 0 — handoff archive

Copied `docs/agent-handoff.md` to
`docs/prompts/sprint16-claude-code-measure-navigation.md`.

```
$ cp docs/agent-handoff.md docs/prompts/sprint16-claude-code-measure-navigation.md
$ cmp -s docs/agent-handoff.md docs/prompts/sprint16-claude-code-measure-navigation.md; echo "cmp exit: $?"
cmp exit: 0
```

The handoff was hashed at the start of execution and again at the end:
`sha256 2359785873ffe2939d8ba21c0843e36fbe119cdec4b6d6dd533ec39416456a30`
both times, and `cmp -s` against the archive still exits 0. **The handoff did
not change while this loop was executing.**

## Files changed

| File | In scope? |
|---|---|
| `src/lib/music/measures.ts` | Yes — Task 1, new pure helper (`src/lib/music/**`) |
| `src/tests/measures.test.ts` | Yes — Task 1 unit tests (`src/tests/**`) |
| `src/components/phrase-lookup/FocusedOccurrence.tsx` | Yes — Tasks 3 and 4, new component |
| `src/components/phrase-lookup/PhraseLookupSurface.tsx` | Yes — Task 2, focus state and collapsed summaries |
| `src/components/phrase-lookup/OnsetStrip.tsx` | Yes — exports `OnsetKeyboard` and `formatOnsetLabel` for reuse; **no rendering change** |
| `src/styles/globals.css` | Yes — hand-authored Loop 016 block |
| `e2e/measure-navigation.spec.ts` | Yes — Task 5, new spec |
| `docs/prompts/sprint16-claude-code-measure-navigation.md` | Yes — Task 0 archive |
| `docs/sprints/output/016-measure-navigation-output.md` | Yes — this document |

**Not touched, deliberately:** `src/lib/music/onset-range.ts`,
`phrase-search.ts`, `continuations.ts`, `keyboard.ts`, the committed
`moonlight-sonata.ts` artifact, `scripts/`, `src/index.css`,
`KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`,
`chordDatabase.ts`, and every config file. The nine pre-existing
`data-testid` attributes in `PhraseLookupSurface.tsx` were neither used nor
removed — `data-testid="result-item"` still sits on the occurrence `<li>`,
untouched and unreferenced.

## How the fixed window is obtained

The focused view is drawn on **the `FULL_RANGE` object the input keyboard is
already built from** — `streamPitchRange(moonlightSonata)`, computed once at
module load — passed down as a `range` prop that `FocusedOccurrence` never
recomputes. It is not a second constant that happens to hold the same numbers.
That makes "identical to the input keyboard's geometry" true by construction
rather than by coincidence, and a unit test pins the numbers:

```
✓ the focused view’s fixed window > is the full-piece window, MIDI 29 to 87
✓ the focused view’s fixed window > reads as F1 to D#6, 34 white keys
```

`onset-range.ts` was **not** modified. `describePitchRange` and
`whiteKeyCount` are read, not changed.

## Verification — all 21 checks

| # | Check | Result |
|---|---|---|
| 1 | `npm run typecheck` | **Pass.** `tsc --noEmit`, exit 0, no output. No `any`, no `@ts-ignore`, no `@ts-expect-error` added anywhere. |
| 2 | `npm test` | **Pass.** `Test Files 9 passed (9) / Tests 117 passed (117)` — 97 pre-existing plus 20 new in `measures.test.ts`. |
| 3 | `npm run build` | **Pass.** `✓ 1701 modules transformed. … ✓ built in 990ms`. |
| 4 | `npm run test:e2e` | **Pass.** `41 passed (6.7s)` — 27 pre-existing plus 14 new. Full listing below. |
| 5 | Suite accessibility-first | **Pass.** `grep -rn "getByTestId" e2e/` → no output, exit 1. |
| 6 | No fixed sleeps | **Pass.** `grep -rn "waitForTimeout\|setTimeout" e2e/` → no output, exit 1. |
| 7 | Default view unchanged | **Pass.** `the unfocused result keeps its compact strip and offers no navigation`: 6 onset keyboards, `Matched onsets` and `Following onsets` groups both visible, `Measure navigation` count 0, heading `aria-expanded="false"`. The three pre-existing Loop 014/015 layout tests (`matched onsets stay in a horizontal row`, `following onsets stack in a column`, `each stacked row is labelled…`) still pass unchanged. |
| 8 | Focus expands one | **Pass.** `opening one occurrence collapses the others…`: after clicking `Measure 5, beat 1`, that heading reads `aria-expanded="true"`, `Onsets in measure 5` is visible, and the other occurrence is still present as `Measure 42, beat 1` + `then [G#3]` with `aria-expanded="false"`. Keyboard count goes 8 → 13 (only the open occurrence draws keyboards; measure 5 has 13 onsets). `a collapsed occurrence can be opened while another is open` covers re-selection without going back first. |
| 9 | Focus reversible | **Pass.** Same test: `Back to all occurrences` returns the list to 8 keyboards, `Measure navigation` count 0, `aria-expanded="false"`. `Escape` also closes it (covered in the keyboard test). |
| 10 | **Fixed frame** | **Pass, measured.** See quoted geometry below. |
| 11 | **A pitch holds its x** | **Pass, measured.** See quoted geometry below. |
| 12 | Measure stepping | **Pass.** `stepping runs 12 → 13 → 14 and back to 13, labelled at every stop`: from the founding match, `Next measure, 13` → `Measure 13 of 69`; `Next measure, 14` → `Measure 14 of 69`; `Previous measure, 13` → `Measure 13 of 69`, with `Onsets in measure 13` visible again. |
| 13 | Measure labelled | **Pass.** `Measure 12 of 69`, `Measure 13 of 69`, `Measure 14 of 69`, `Measure 1 of 69`, `Measure 5 of 69`, `Measure 42 of 69`, `Measure 69 of 69` are each asserted visible in the state that produces them. The occurrence heading (`Measure 12, beat 4`) stays visible while paging, so the anchor's location is never lost either. |
| 14 | Anchor identifiable | **Pass, measured.** See quoted geometry below. |
| 15 | Bounds | **Pass, measured.** See quoted geometry below. |
| 16 | Control naming | **Pass.** Every navigation assertion in the suite selects by accessible name: `Previous measure, 11`, `Next measure, 13`, `Next measure, 14`, `Previous measure, 13`, `Next measure, 2`, `Previous measure, 68`. At a boundary the name states the boundary instead of a measure that does not exist: `toHaveAccessibleName('Previous measure, unavailable at measure 1')` and `toHaveAccessibleName('Next measure, unavailable at measure 69')`. The glyphs `‹` `›` are `aria-hidden`. |
| 17 | Keyboard operable | **Pass.** `an occurrence can be opened and paged entirely from the keyboard`, no mouse: `Enter` on the occurrence heading opens it and **focus stays on that button** (asserted with `toBeFocused()` — opening does not move focus out from under the person who pressed it); `Tab` → `Back to all occurrences` focused; `Tab` → `Previous measure, 11` focused; `Tab` → `Next measure, 13` focused; `Enter` → `Measure 13 of 69`; `Escape` → `aria-expanded="false"` and navigation gone. |
| 18 | Session-only | **Pass.** `grep -rn "localStorage\|sessionStorage\|indexedDB" src/` → no output, exit 1. Two e2e tests back it from the outside: `an open occurrence does not survive a reload`, and `starting a new selection closes the open occurrence`. |
| 19 | Not a piano roll | **Pass.** `the measure is a column of evenly spaced rows, with no playback`: 12 rows in measure 12, every consecutive gap equal to the first within 0.05px, every row the same height, `audio` count 0, `video` count 0. `grep -rniE "duration\|playback\|timeline\|new Audio\|AudioContext"` over `src/components/phrase-lookup/` and `src/lib/music/measures.ts` → no output, exit 1. No note duration is read anywhere: the helper filters on `measure`, and the row order is stream order. |
| 20 | **Vacuity** | **Pass.** Verbatim failure output below, reverted, tree confirmed. |
| 21 | Existing behaviour intact | **Pass.** All 27 pre-existing e2e tests pass unchanged: `a one-note query reports all 78 occurrences and renders 12` (cap and `showing 12`), `B1 plus B2 shows 13 containing onsets as a count, with no strips`, `F#3 plus F#4 renders strips for all 6 containing onsets before commit`, `the initial state highlights 55 possible next notes`, `selecting F#3 narrows to 16 possible next notes and 43 containing onsets`, `adding F#4 … 8 possible next notes, 6 onsets`. Cap and disclosure threshold constants untouched (`MAX_RENDERED_RESULTS = 12`, `DISCLOSURE_THRESHOLD = 6`). |

### Check 10 — the frame, measured before and after a step

Measured in Chromium against the production build, founding query, occurrence
at measure 12 beat 4 opened:

```
EV window sentence: Same range on every keyboard: F1 to D#6, 34 white keys — fixed while an
                    occurrence is focused, so paging between measures moves the notes and never the frame.

before `>`   EV m12 keyboard count: 12
             EV m12 widths: ["479.66666666666663"]      (one distinct value across all 12)
             EV m12 xs:     [144]                        (one distinct value across all 12)

after  `>`   EV m13 keyboard count: 12
             EV m13 widths: ["479.66666666666663"]
             EV m13 xs:     [144]
```

479.66666666666663px is the F1–D#6 window at the strip's 14px white-key
scale; every keyboard in the focused view carries that exact `width`
attribute, and the value is **byte-identical before and after the step**. For
contrast, the same query's *unfocused* compact strip measures
`269.66666666666663` (B1–F#4, 19 white keys) — the two frames really are
different, and the focused one is the fixed full-piece window rather than a
range computed from what is shown.

The assertion in the suite is `expect(after[0]).toBe(before[0])` plus
`new Set(widths).size === 1` on both sides, and the stated range text is
asserted visible in both states.

### Check 11 — a pitch holds its x

F#4 sounds exactly once in measure 12 (beat 4, part of the match) and exactly
once in measure 13 (beat 1). Its `<rect>` bounding box:

```
EV F#4 in m12: {"x":448.3333435058594,"y":1371.6197509765625,"width":6.666656494140625,"height":14.666748046875}
EV F#4 in m13: {"x":448.3333435058594,"y":657.6666870117188,"width":6.666656494140625,"height":14.6666259765625}
```

Same x to the last digit, same width; only y differs, because it is a
different row of a different measure. The vacuity run below shifts this by one
key-step and the test fails, which is what shows the assertion is live.

Supporting measurement, `badged and unbadged rows start at the same x`: all 12
keyboards in measure 12 report x = 144 and identical width, although three of
those rows carry a badge and nine do not.

### Check 14 — the anchor, measured

Measure 12's three matched onsets are its last three (the match is at beat 4,
near the end of the bar):

```
EV m12 badge count: 3   ys: [1386.609375, 1465.9375, 1545.265625]
EV m12 row ys:          [643, 722.33, 801.66, 880.98, 960.31, 1039.64, 1118.97,
                         1198.30, 1277.63, 1356.95, 1436.28, 1515.61]
EV m13 badge count: 0
```

Each badge's vertical centre falls inside the box of rows 10, 11 and 12
(y = 1356.95, 1436.28, 1515.61; row height ≈ 78px) — asserted in the suite by
comparing measured boxes, not by trusting document order. Each badge's x is
less than its row's keyboard x, i.e. it sits in the gutter. Stepping to
measure 13, which contains none of the match, drops the badge count to 0: the
mark tracks the anchor rather than decorating the view.

### Check 15 — bounds, measured

```
EV m1 label: Measure 1 of 69
EV m1 previous — name: Previous measure, unavailable at measure 1 | disabled: true | visible: true
                | box: {"x":190.40625,"y":611,"width":25.359375,"height":24}
EV m1 next     — name: Next measure, 2                            | disabled: false

EV m69 label: Measure 69 of 69
EV m69 next    — name: Next measure, unavailable at measure 69     | disabled: true | visible: true
                | box: {"x":328.234375,"y":568,"width":25.296875,"height":24}
EV m69 previous— name: Previous measure, 68                        | disabled: false
EV m69 keyboards: 1
```

Both boundary controls are **present and rendered** — a real 25×24px box on
screen — and disabled. Neither is hidden, and neither claims a target measure
that does not exist. Measure 69 holds one onset and it is the match itself, so
its single row carries the badge (asserted).

## Check 20 — vacuity proof, verbatim

One assertion in a new test was broken: in `F#4 occupies the same x in measure
12 and in measure 13`, `expect(thirteenth!.x).toBeCloseTo(twelfth!.x, 1)`
became `toBeCloseTo(twelfth!.x + 14, 1)` — a one-white-key shift, which is
precisely the corruption a per-measure window would introduce.

```
$ npm run test:e2e -- measure-navigation.spec.ts -g "F#4 occupies the same x"

Running 1 test using 1 worker

  ✘  1 [chromium] › e2e/measure-navigation.spec.ts:220:5 › F#4 occupies the same x in measure 12 and in measure 13 (514ms)


  1) [chromium] › e2e/measure-navigation.spec.ts:220:5 › F#4 occupies the same x in measure 12 and in measure 13

    Error: expect(received).toBeCloseTo(expected, precision)

    Expected: 462.3333435058594
    Received: 448.3333435058594

    Expected precision:    1
    Expected difference: < 0.05
    Received difference:   14

       236 |   expect(twelfth).not.toBeNull();
       237 |   expect(thirteenth).not.toBeNull();
     > 238 |   expect(thirteenth!.x).toBeCloseTo(twelfth!.x + 14, 1);
           |                         ^
       239 |   expect(thirteenth!.width).toBeCloseTo(twelfth!.width, 1);
       240 | });
       241 |

        at /Users/b/dev/chord-selector-app/e2e/measure-navigation.spec.ts:238:25

    Error Context: test-results/measure-navigation-F-4-occ-83ccd-easure-12-and-in-measure-13-chromium/error-context.md

  1 failed
    [chromium] › e2e/measure-navigation.spec.ts:220:5 › F#4 occupies the same x in measure 12 and in measure 13
```

Reverted and re-run:

```
$ npm run test:e2e -- measure-navigation.spec.ts -g "F#4 occupies the same x"
  ✓  1 [chromium] › e2e/measure-navigation.spec.ts:220:5 › F#4 occupies the same x in measure 12 and in measure 13 (484ms)
  1 passed (2.8s)
```

Tree confirmed after the revert: line 238 reads
`expect(thirteenth!.x).toBeCloseTo(twelfth!.x, 1);` again, `git status
--porcelain e2e/` lists only the intended new file
`?? e2e/measure-navigation.spec.ts`, and no other file under `e2e/` is
modified. A temporary evidence spec used to capture the measurements quoted
above (`e2e/zz-evidence.spec.ts`) was deleted before the commit; `ls e2e/`
shows only the three real specs.

## New e2e tests

All in `e2e/measure-navigation.spec.ts`, all accessibility-first:

| Test | Covers |
|---|---|
| `the unfocused result keeps its compact strip and offers no navigation` | 7 — the default view is untouched until an occurrence is opened |
| `opening one occurrence collapses the others, and there is a way back` | 8, 9 — one expands, the rest become summary lines, `Back to all occurrences` restores the list |
| `a collapsed occurrence can be opened while another is open` | 8 — collapsed occurrences stay re-selectable, and only one is ever open |
| `the focused window is F1 to D#6, 34 white keys, and is identical after a step` | 10 — the loop: stated range and measured width, before and after `>` |
| `F#4 occupies the same x in measure 12 and in measure 13` | 11 — the loop: a pitch does not move when the measure does |
| `stepping runs 12 → 13 → 14 and back to 13, labelled at every stop` | 12, 13, 16 — stepping, the visible measure label, and the control names |
| `the matched onsets are badged in text, and only they are` | 14 — the anchor is marked by a word, on the right rows, and only where it is |
| `badged and unbadged rows start at the same x` | 11 — the badge gutter cannot shift a keyboard sideways |
| `at measure 1 the previous control is present and disabled` | 15, 16 — lower boundary, disabled not hidden, honest name |
| `at measure 69 the next control is present and disabled` | 15, 16 — upper boundary, plus the single-onset final measure |
| `an occurrence can be opened and paged entirely from the keyboard` | 17 — Enter, three Tabs, Enter, Escape; focus never stolen |
| `an open occurrence does not survive a reload` | 18 — session state only |
| `starting a new selection closes the open occurrence` | 18 — and one pitch window on screen at a time |
| `the measure is a column of evenly spaced rows, with no playback` | 19 — one row per onset, evenly spaced, nothing that plays |

New unit tests: 20 in `src/tests/measures.test.ts`, covering
`measuresWithOnsets`, `measureBounds`, `onsetsInMeasure`, `adjacentMeasure`
and `onsetKey` against both the committed artifact and a fixture with an empty
measure — the case the artifact cannot exercise, since all 69 of its measures
carry onsets — plus the two assertions that pin the fixed window (MIDI 29–87,
"F1 to D#6, 34 white keys").

## Commit

Subject: `Focus one occurrence and page it a measure at a time`

SHA: **`10c28c3`** — this is the id of the loop's single commit as first
created. The line you are reading was then written into this file and that
same commit amended in place, so `git log -1` reports a different final id: a
commit cannot contain its own hash, and amending keeps the loop to one commit
rather than adding a bookkeeping second one.

## Repair attempts

**Zero repairs against a completed implementation.**

One correction happened during authoring, before the implementation was
complete: the first run of the new spec asserted 12 onset keyboards for the
focused measure 5, and measure 5 has **13** onsets (the handoff's own table
gives a per-measure max of 13). The expected constant in the new test was
wrong; the product was not. Corrected in the test and re-run. Recorded here in
full rather than quietly folded into "implementation", so a reviewer can count
it as repair 1 of 2 if they prefer that reading — either way, one repair
remained unused.

## Stop rules triggered

None. `NEEDS_ARCHITECTURE_DECISION`, `OUT_OF_SCOPE` and
`FAILED_VERIFICATION` were not reached. No dependency was added, no
persistence introduced, and the merged-stream contract was not touched.

## Out-of-scope pressure encountered

**Piano-roll pull: mild, and refused twice.**

The first pull was proportional spacing. A measure's onsets in this movement
are triplet quavers with one longer chord on each beat, and it is tempting to
let the row gaps reflect that. It was not done: rows are evenly spaced, and
there is a test that fails if they stop being. The helper never reads a
duration — the artifact carries `tick`, but it is used only as an onset
identity for the anchor badge, never as a position.

The second was a scrolling timeline. Twelve rows of measure 12 come to roughly
a thousand pixels, which invites a viewport that scrolls the music past a
fixed cursor. That is a continuous time axis wearing a disguise, so the page
scrolls and the measure does not.

**A subtler pull, and the one worth flagging:** it was tempting to keep the
compact strip *and* show the measure column inside the focused card, so the
"three following onsets" answer stayed visible while paging. That would have
put two different pitch windows on screen at once — the strip's shared range
and the focused view's fixed range — which is exactly what Loop 014 exists to
prevent. The two mechanisms are therefore kept but never co-rendered: closed
occurrence → compact strip on the shared range; open occurrence → measure
column on the fixed range. The same reasoning is why starting a new selection
closes the focus, since the containment strips would otherwise appear beside a
differently framed measure.

**Widening of purpose, recorded as the handoff asks:** this does move the
product from *lookup* to *lookup plus read-forward*. Nothing was added beyond
what Section 4 froze, but the change of purpose is real and is not hidden by
calling it a rendering change.

## Risks and open questions

1. **The containment-disclosure onsets are not focusable.** Only occurrences
   of a committed query can be opened. Disclosure strips describe a selection
   still being assembled, not a match, and opening one would have raised the
   question of what "the occurrence" even is there. If a week of use shows
   that the disclosure list is where reading-forward actually starts, this is
   the first thing to revisit.

2. **`>` steps to the next measure that has onsets, not to the next number.**
   All 69 measures of this piece carry onsets, so the two are the same here
   and the distinction is only covered by a fixture. A piece with a genuinely
   empty bar would silently skip it rather than showing an empty frame. That
   is the safer default (no dead end) but it is a decision, and it is
   untested against real data.

3. **Focus is cleared whenever the query or the in-progress selection
   changes.** This is correct — the results underneath are different results —
   but it means a stray key press while reading forward closes the view and
   loses the reader's place. Only real use will say whether that is protective
   or annoying.

4. **A measure is tall.** Around a thousand pixels for twelve onsets, with the
   controls at the top. If paging repeatedly turns out to mean scrolling up
   each time, a sticky control row is the obvious remedy — deliberately not
   done now, on the grounds that it is a fix for a problem nobody has reported
   yet.

5. **No test proves the window would stay fixed for a piece with a wider
   range.** The fixed window is the current piece's full range, so the claim
   "the frame never moves" is verified within the movement, which is all the
   product currently contains. A second piece would test it properly.

## Next recommended action

**Accept current loop as complete.** The human intends a week of real use
next; nothing further should be specced until that produces evidence.
