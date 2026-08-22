# Sprint 17 Output: Browse the Piece

**Terminal state: `DONE`**

Loop spec: `docs/planning/loops/017-browse-the-piece.md`
Handoff: `docs/agent-handoff.md` (archived verbatim, see Task 0 below)
Executor: Claude Code (Opus 5)

## A finding that came before the design, and changed it

**The handoff's pixel column is stale.** Its measured table — ~60px per onset,
~49,400px for the whole movement, "3 measures is ~2,160px", "measure 34 is
~24,100px down" — was taken when `OnsetStrip.tsx` drew a 14px white key.
Commit `1188094`, already on this branch when the loop started, set `SCALE = 1`
so that a result keyboard matches the By Key and By Name tabs' key size. A row
is now **112px tall on a 120px pitch**, not 60.

Measured in Chromium against the production build, not calculated:

```
EV m1 row ys: [581,701,821,941,1061,1181,1301,1421,1541,1661,1781,1901]
EV body scrollHeight at 3 measures: 5051
```

120px between consecutive onsets. Restating the handoff's table at the size the
piece is actually drawn today:

| Span | Onsets | Height as handed off | Height as measured |
|---|---|---|---|
| 3 measures | 36 | ~2,160px | **~4,300px** (page 5,051px) |
| 5 measures | 61 | ~3,660px | **~7,300px** |
| 8 measures | 98 | ~5,880px | **~11,800px** |
| whole movement | 823 | ~49,400px | **~98,800px** |
| reaching measure 34 by scrolling | ~24,100px | **~48,200px** (402 onsets) |

The **node** figures were unaffected — 823 × 59 keys = 48,557, which is the
handoff's ~48,600 — because the scale change altered how big a key is drawn,
not how many there are.

Nothing about the design changes: the argument was that scrolling cannot serve
the use case and that rendering everything is a ceiling, and both are now
twice as true. What changes is decision 1, which is stated below in measured
numbers rather than in the handoff's.

## Section 10 decisions

### 1. Three measures load, and three more per extension

**36 onsets, 2,124 key nodes, 5,368 SVG elements — measured, not estimated:**

```
EV nodes: {"keyboards":36,"paths":2124,"pathsPerKeyboard":59,"allElements":5368}
```

2,124 of the movement's 48,557 key nodes: **4.4%**. At 120px a row that first
page is already ~4,300px — four to five viewports of reading before the control
is needed at all, which is enough that browse reads as *the piece is here*
rather than as a teaser.

Five measures (61 onsets, ~7,300px) and eight (98 onsets, ~11,800px) were both
rejected for the same reason: at the current scale they build a great deal of
DOM for content the reader has not asked to see, and the handoff's own argument
is that incremental rendering is a ceiling rather than a nicety. Had the 14px
scale still been in force, five would have been the better pick — at ~3,660px
it was barely three screens. The scale doubled; the span halved.

**The extension is the same size as the first load, deliberately.** An
extension that differed would make the second press cost something other than
what the first page taught the reader to expect.

### 2. No scroll-triggered loading — the button is the only mechanism

The handoff permits an observer *alongside* the control. There is none, for
three reasons.

It would make the control's own effect untestable: content would already have
arrived by scroll before anyone pressed the button, so a passing test would no
longer distinguish "the keyboard path works" from "the scroll path fired
first". Check 10 is described in the handoff as the one most likely to be
skipped; two mechanisms is how it gets skipped without anyone noticing.

An intersection observer is also the classic source of exactly the e2e
flakiness the repair policy forbids papering over — a loader that fires on
layout is a race with every assertion after it.

And it adds no capability. Scroll-triggered loading is a convenience for the
one input method that already works; the button serves every input method
including that one.

What replaces it is a test that scrolls to the very bottom of what is drawn —
the moment an observer would fire — and asserts that **nothing loaded**:

```ts
await showMore(page).scrollIntoViewIfNeeded();
expect(after!.y).toBeLessThan(before!.y - 1000);   // the scroll really happened
await expect(onsetKeyboards(page)).toHaveCount(36); // and changed nothing
```

### 3. The jump control sits at the top; `<` / `>` do not appear in browse

Getting somewhere is the first thing the reader wants and the one thing
scrolling cannot give them — measure 34 is ~48,200px down. So the jump control
and the "Showing measures 1 to 3 of 69" line sit together above the piece,
where they are visible without scrolling anywhere.

**`<` and `>` are deliberately absent.** In the focused results view those
glyphs *replace* the measure on screen. In browse, measures *accumulate*. The
same control with the opposite meaning in two places on one surface would be
worse than having no shortcut at all, so browse's vocabulary is jump and
show-more, and stepping stays the focused occurrence's. The machinery is still
shared — `measuresWithOnsets` and `measureBounds` from Loop 016's
`measures.ts` are what both are built on — which is what the handoff asked for.

One detail worth recording: the jump field is `type="text"` with
`inputMode="numeric"`, **not** `type="number"`. Chromium silently discards
non-digits typed into a number field, which would have made check 12's "abc"
case unreachable — the error would have been impossible to trigger rather than
unnecessary, and the reader would have got no explanation at all.

### 4. Browse and results are mutually exclusive, and the reader keeps their place

Browse renders only when **nothing at all is entered** — no committed group and
no selection in progress. It is not enough to wait for a commit: an assembled
selection already draws containment strips on their own shared range, and
browse is drawn on the fixed full-piece range, so leaving both up would put two
different rulers in front of the reader. That is precisely what Loop 014 exists
to prevent and what Loop 016 restated when it dropped the focus on a selection
change.

It is also load-bearing for check 21. The pre-existing test
`onset-strips.spec.ts:156` asserts zero onset keyboards on the page after
selecting B1 and B2 with nothing committed; browse had to disappear on the
first key press or that test would have failed. Confirmed measured:

```
EV disclosure above threshold: 13 onsets in the piece contain the current selection
                               | keyboards: 0 | browse regions: 0
```

**Where the reader had got to is not part of the query**, so the anchor and
span live in `PhraseLookupSurface`, not inside `BrowseThePiece`. Jumping to 34,
trying a phrase and pressing Clear all returns the reader to measure 34, not to
measure 1. There is a test for it. Still session state only — a reload puts
browse back at measure 1, and there is a test for that too.

**Also decided, and recorded as an open question:** browse does not render the
staff toggle. The toggle belongs to the results surface, which check 17
requires untouched; browse draws with whatever `showStaff` currently is. See
risk 2.

## Task 0 — handoff archive

A contract problem was found and settled **before** any implementation began.
`docs/agent-handoff.md` on disk was still the **Sprint 16** handoff, byte-
identical to its own archive:

```
$ cmp docs/agent-handoff.md docs/prompts/sprint16-claude-code-measure-navigation.md; echo $?
0
```

The Sprint 17 contract existed only as text in the session. Archiving the file
as it stood would have preserved the wrong contract and made Task 0
meaningless. Raised with the human, who chose to have the Sprint 17 text
written to `docs/agent-handoff.md` first; that happened as step 0a, before any
source file was touched, so nothing was amended mid-run
(`docs/learning/never-mutate-an-active-handoff.md`).

```
$ shasum -a 256 docs/agent-handoff.md
e8d0b2ddb60739d4d6a83db685826ae50b63c4d2f3f1ac7e326e9c9085ab254a
$ cp docs/agent-handoff.md docs/prompts/sprint17-claude-code-browse.md
$ cmp -s docs/agent-handoff.md docs/prompts/sprint17-claude-code-browse.md; echo "cmp exit: $?"
cmp exit: 0
```

Re-hashed at the end of execution: **the same
`e8d0b2ddb60739d4d6a83db685826ae50b63c4d2f3f1ac7e326e9c9085ab254a`**, and
`cmp -s` against the archive still exits 0. **The handoff did not change while
this loop was executing.**

### A second housekeeping decision

The working tree was **not clean** when the loop started: `PhraseLookupSurface.tsx`,
`globals.css` and two e2e specs carried uncommitted work from the previous
loop (the two-column strip layout and the 88-key input keyboard), alongside
twenty untracked docs. Committing once on top of that would have merged two
loops into one commit. The human chose to commit the prior work separately
first, as `e734dc5`, so Loop 017's single commit contains only Loop 017.

## Files changed

| File | In scope? |
|---|---|
| `docs/agent-handoff.md` | Yes — step 0a, the Sprint 17 contract itself, written before execution |
| `docs/prompts/sprint17-claude-code-browse.md` | Yes — Task 0 archive |
| `src/lib/music/browse.ts` | Yes — Task 1, new pure helper (`src/lib/music/**`) |
| `src/tests/browse.test.ts` | Yes — Task 1 unit tests (`src/tests/**`) |
| `src/components/phrase-lookup/BrowseThePiece.tsx` | Yes — Tasks 2, 3 and 4, new component |
| `src/components/phrase-lookup/PhraseLookupSurface.tsx` | Yes — Task 5, browse state and the landing branch |
| `src/styles/globals.css` | Yes — hand-authored Loop 017 block |
| `e2e/browse.spec.ts` | Yes — Task 6, new spec |
| `docs/sprints/output/017-browse-the-piece-output.md` | Yes — this document |

**Not touched, deliberately** (`git status --porcelain` over all of them
returns nothing): `src/lib/music/onset-range.ts`, `phrase-search.ts`,
`continuations.ts`, `measures.ts`, `keyboard.ts`, the committed
`moonlight-sonata.ts` artifact, `scripts/`, `src/index.css`,
`OnsetStrip.tsx`, `FocusedOccurrence.tsx`, `PhraseKeyboard.tsx`,
`KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`,
`chordDatabase.ts`, and every config file.

`OnsetStrip.tsx` is **imported** by the new component — `OnsetKeyboard` and
`formatOnsetLabel`, the two things Loop 016 exported for exactly this — and not
modified. An onset in a result, an onset reached by paging and an onset met
while browsing are the same picture because they are the same function.

The nine pre-existing `data-testid` attributes were neither used nor removed —
`grep -c data-testid` on `PhraseLookupSurface.tsx` still returns **9**.
`empty-query-message` in particular still renders exactly as before; browse was
added as a sibling beneath it, so the paragraph became an instruction above the
piece rather than a dead end. `MAX_RENDERED_RESULTS = 12` and
`DISCLOSURE_THRESHOLD = 6` are untouched.

## How the fixed frame is obtained

Browse is drawn on **the same `FULL_RANGE` object `FocusedOccurrence` is handed**
— `streamPitchRange(moonlightSonata)`, computed once at module load and passed
down as a `range` prop that `BrowseThePiece` never recomputes. It is not a
second constant that happens to hold the same numbers.

Note that this is no longer the input keyboard's range: the commit already on
this branch made the input a full 88-key piano (`INPUT_RANGE`, 21–108) while
result keyboards kept the piece-derived `FULL_RANGE` (29–87). Checks 13 and 14
specify F1–D#6 and 34 white keys, which is `FULL_RANGE`, so browse uses that
and matches the results surface rather than the input surface.

`onset-range.ts` was **not** modified. `describePitchRange` is read, not
changed. `browse.ts` computes no pitch span at all — a module that cannot
compute a frame cannot reintroduce a moving one.

## Verification — all 21 checks

| # | Check | Result |
|---|---|---|
| 1 | `npm run typecheck` | **Pass.** `tsc --noEmit`, exit 0, no output. No `any`, no `@ts-ignore`, no `@ts-expect-error` added anywhere. |
| 2 | `npm test` | **Pass.** `Test Files 10 passed (10) / Tests 139 passed (139)` — 117 pre-existing plus 22 new in `browse.test.ts`. |
| 3 | `npm run build` | **Pass.** `✓ built in 686ms`, `build/assets/index-CSr0p3eq.js 352.62 kB │ gzip: 103.27 kB`. |
| 4 | `npm run test:e2e` | **Pass.** `57 passed (9.6s)` — 42 pre-existing plus 15 new. Listing below. |
| 5 | Suite accessibility-first | **Pass.** `grep -rn "getByTestId" e2e/` → no output, exit 1. |
| 6 | No fixed sleeps | **Pass.** `grep -rn "waitForTimeout\|setTimeout" e2e/` → no output, exit 1. |
| 7 | Browse on load | **Pass.** `browse is what the tab lands on, with measure 1 already drawn`: with nothing entered, the region `Browse the piece`, the heading `Measure 1`, the line `Showing measures 1 to 3 of 69.` and **12 onset keyboards inside measure 1** are all visible. The onsets themselves, not merely a heading promising them. |
| 8 | **Bounded initial render** | **Pass, measured.** 3 measures, 36 onsets, **2,124 key nodes** (59 per keyboard × 36), 5,368 SVG elements — against 48,557 key nodes for the whole movement. **4.4%.** Measure 4 is not in the DOM (`toHaveCount(0)`). Raw capture quoted above. |
| 9 | **Loading extends, not replaces** | **Pass.** `showing more adds measures 4 to 6 and keeps 1 to 3`: measure groups 3 → 6, all of 1–6 asserted visible individually, keyboards 36 → **74** (12+12+12 already there, plus 12+13+13 arriving — measures 5 and 6 carry 13 onsets each), line reads `Showing measures 1 to 6 of 69.` |
| 10 | **Keyboard-operable load-more** | **Pass, both halves.** See below. |
| 11 | **Jump works** | **Pass, measured.** See below. |
| 12 | Jump bounds | **Pass, measured.** All four messages quoted below; the 69 is derived, proven by unit test. |
| 13 | **Fixed frame** | **Pass, measured.** See below. |
| 14 | **A pitch holds its x** | **Pass, measured.** See below. |
| 15 | Measures labelled | **Pass.** `every rendered measure carries its number` scrapes the group names rather than trusting the headings: `expect(names).toEqual(['Measure 1', 'Measure 2', 'Measure 3'])`, and each of the three headings is separately asserted visible. Every measure carries the number twice — as its group's accessible name and as a visible `<h3>` — so it is announced as well as printed. |
| 16 | Query replaces browse | **Pass.** `entering a phrase replaces browse, and clearing brings it back`: browse visible → click F#3 → region count 0 **and** keyboard count 0 → add `[F#3+F#4]`, `Phrase: [F#3+F#4]` visible, region still 0 → `Clear all` → region visible, `Showing measures 1 to 3 of 69.` |
| 17 | Results surface untouched | **Pass, measured.** See below. |
| 18 | Session-only | **Pass.** `grep -rn "localStorage\|sessionStorage\|indexedDB" src/` → no output, exit 1. Backed from outside by `the browse position does not survive a reload`: jump to 34, reload, back at `Showing measures 1 to 3 of 69.` with measure 34 gone. |
| 19 | Not a piano roll | **Pass, measured.** See below. |
| 20 | **Vacuity** | **Pass.** Verbatim failure output below, reverted, tree confirmed. |
| 21 | Existing counts intact | **Pass.** All 42 pre-existing e2e tests pass unchanged, including `the initial state highlights 55 possible next notes`, `selecting F#3 narrows to 16 possible next notes and 43 containing onsets`, and `adding F#4 … 8 possible next notes, 6 onsets`. **55 / 16 / 43 / 8 / 6 unchanged.** |

### Check 10 — how loading more works from the keyboard alone

The control is a real `<button>`, focusable and activatable, and the test
touches no pointer:

```ts
const more = showMore(page);
await more.focus();
await expect(more).toBeFocused();
await page.keyboard.press('Enter');

await expect(measureGroup(page, 6)).toBeVisible();
await expect(onsetKeyboards(page)).toHaveCount(74);
await expect(more).toBeFocused();
await expect(more).toHaveAccessibleName('Show more measures, from measure 7');

await page.keyboard.press('Enter');
await expect(measureGroup(page, 9)).toBeVisible();
```

Three things this pins beyond "it works". Focus **stays on the button** after
activation, so a second press loads a second page without hunting for the
control again — pressing Enter twice runs 3 → 6 → 9 measures without touching
anything else. The accessible name **states which measure the next press
brings** (`from measure 4`, then `from measure 7`), so it is worth reading
before pressing rather than being a bare "more". And at the end of the piece
the control is **disabled, never hidden** — measured:

```
EV m69 show-more: {"name":"Show more measures, unavailable at the end of the piece",
                   "disabled":true,"visible":true,
                   "box":{"x":32,"y":705,"width":1216,"height":24}}
```

A real 1216×24 box on screen, disabled, naming the boundary rather than a
measure that does not exist — the same shape Loop 016 gave `<` at measure 1.

The negative half is a separate test, and it is the one that makes the claim
mean something. `scrolling to the end of the drawn measures loads nothing more`
scrolls to the very bottom of what is drawn — the moment an intersection
observer would fire — proves the scroll really happened by measuring that
measure 1's heading moved more than 1,000px up the viewport, and then asserts
the measure count is still 3, measure 4 is still absent, and the keyboard count
is still 36.

(An earlier version of that test asserted `window.scrollY > 0` and failed:
`Expected: > 0, Received: 0`. This page's scrolling element is not the window.
Rather than assert against a container the test would have to know about, it
now measures that a known element moved, which is true whichever element
scrolls. That correction is counted as repair 1 below.)

### Check 11 — the jump, measured

```
EV m34 heading box: {"x":32,"y":553,"width":1216,"height":20}
EV viewport: {"width":1280,"height":720}
EV show-more name at m34: Show more measures, from measure 37
```

`boundingBox` is viewport-relative, so y = 553 in a 720px viewport means
measure 34's heading is **on screen**, 553px from the top, with nothing having
scrolled to put it there. Reaching the same measure by scrolling costs the 402
onsets before it — **~48,200px**. The test asserts `0 < box.y < viewport.height`
rather than a hardcoded pixel, so it stays a claim about what the reader can
see.

The jump **re-anchors rather than appends**: measure 1 drops out of the DOM
(`toHaveCount(0)`) and the page is again three measures. That is the difference
between jump and show-more, and both are asserted.

### Check 12 — bounds, and the proof that 69 is derived

All four refusals, captured from the running app:

```
EV alert for 0:     Measure 0 is outside this piece. This piece has measures 1 to 69.
EV alert for 70:    Measure 70 is outside this piece. This piece has measures 1 to 69.
EV alert for abc:   "abc" is not a measure number. This piece has measures 1 to 69.
EV alert for empty: Enter a measure number. This piece has measures 1 to 69.
```

Each is a `role="alert"`, so it is announced rather than merely printed, and
each names the piece's own bounds. The e2e test also asserts that a refused
jump **changes nothing but the message** (still on measure 1) and that a good
number afterwards still works — a control that got stuck after a bad input
would be a worse failure than ignoring the input.

`3.5`, `1e2`, `-4` and `12a` are rejected the same way as `abc` (unit-tested):
`Number()` would quietly accept the first three, and none of them is a measure
number.

**The 69 is computed, and this is what shows it.** The same code, given the
five-measure fixture, says five:

```
✓ requestMeasure > takes its bounds from the piece it is given, not from this piece
    requestMeasure('6', gappedBounds)
      → 'Measure 6 is outside this piece. This piece has measures 1 to 5.'
    requestMeasure('x', gappedBounds)
      → '"x" is not a measure number. This piece has measures 1 to 5.'
```

There is no `69` anywhere in `browse.ts`.

### Check 13 — the frame, measured at measure 1 and at measure 34

```
EV m1-3  widths distinct: ["719.5"] count: 36
EV m34-36 widths distinct: ["719.5"] count: 36
```

719.5px is the F1–D#6 span at the current full-size key grid; every one of the
36 keyboards carries that exact `width` attribute, and the value is
**byte-identical before and after a jump of 33 measures**. The suite asserts
`new Set(widths).size === 1` on both sides plus `atThirtyFour[0] === atOne[0]`,
and the stated sentence is asserted visible in both states:

> Same range on every browse keyboard: F1 to D#6, 34 white keys — fixed for the
> whole piece, so a pitch keeps its place from the first measure to the last.

(For contrast: the same app draws the *unfocused* results strip on a range
computed from what is shown — B1–F#4, 19 white keys for the founding query. The
two really are different frames, and browse's is the fixed full-piece one.)

### Check 14 — a pitch holds its x

C#4 sounds in measure 1 (ticks 4, 16, 28 and 40) and again at the top of
measure 34. Its `<rect>` bounding box in each:

```
EV C#4 in m1:  {"x":424.5,"y":701,"width":12,"height":48}
EV C#4 in m34: {"x":424.5,"y":581,"width":12,"height":48}
```

Same x, same width, same height; only y differs, because it is a different row
of a different measure 33 bars away. The vacuity run below shifts this by one
white key and the test fails, which is what shows the assertion is live.

Supporting measurement — every row in a measure starts at the same x, so the
alignment holds down the column as well as across the jump:

```
EV m1 row xs distinct:      [32]
EV m1 row heights distinct: [112]
```

### Check 17 — the results surface, re-measured

```
EV cap line: 78 occurrences of [E4] — showing 12
EV disclosure above threshold: 13 onsets in the piece contain the current selection
                               | keyboards: 0 | browse regions: 0
EV disclosure at threshold:     6 onsets in the piece contain the current selection
                               | keyboards: 24
EV focused step: Measure 13 of 69 | browse regions: 0
```

The cap sentence, the 13 → count / 6 → strips disclosure (24 keyboards = 6
containing onsets plus the three following each), and focus with `>` stepping
12 → 13 all behave exactly as Loops 014–016 left them. Browse is absent in
every one of those states, which is the mutual exclusion decision 4 describes.
All 17 tests in `onset-strips.spec.ts` and all 14 in `measure-navigation.spec.ts`
pass unchanged.

### Check 19 — not a piano roll

```
EV m1 row ys: [581,701,821,941,1061,1181,1301,1421,1541,1661,1781,1901]
```

Twelve rows, every consecutive gap exactly 120px, every row 112px tall. The
test derives the gap from the first pair and asserts it holds for the rest
within 0.05px, asserts every row's height and x match the first, and counts
`audio` and `video` elements: **0 and 0**.

No duration is read anywhere. `browseMeasures` filters on `measure` and the row
order is stream order; `onsetKey` uses `tick` as an identity string only, never
as a position. `grep -rniE "duration|playback|new Audio|AudioContext"` over
`BrowseThePiece.tsx` and `browse.ts` → no output, exit 1.

## Check 20 — vacuity proof, verbatim

One assertion in a new test was broken: in `C#4 occupies the same x in measure
1 and in measure 34`, `expect(later!.x).toBeCloseTo(first!.x, 1)` became
`toBeCloseTo(first!.x + 21, 1)` — a one-white-key shift at the current 21px
grid, which is precisely the corruption a per-measure frame would introduce.

```
$ npm run test:e2e -- browse.spec.ts -g "C#4 occupies the same x"

Running 1 test using 1 worker

  ✘  1 [chromium] › e2e/browse.spec.ts:281:5 › C#4 occupies the same x in measure 1 and in measure 34 (411ms)


  1) [chromium] › e2e/browse.spec.ts:281:5 › C#4 occupies the same x in measure 1 and in measure 34

    Error: expect(received).toBeCloseTo(expected, precision)

    Expected: 445.5
    Received: 424.5

    Expected precision:    1
    Expected difference: < 0.05
    Received difference:   21

      295 |   expect(first).not.toBeNull();
      296 |   expect(later).not.toBeNull();
    > 297 |   expect(later!.x).toBeCloseTo(first!.x + 21, 1);
          |                    ^
      298 |   expect(later!.width).toBeCloseTo(first!.width, 1);
      299 | });
      300 |
        at /Users/b/dev/chord-selector-app/e2e/browse.spec.ts:297:20

    Error Context: test-results/browse-C-4-occupies-the-sa-995be-measure-1-and-in-measure-34-chromium/error-context.md

  1 failed
    [chromium] › e2e/browse.spec.ts:281:5 › C#4 occupies the same x in measure 1 and in measure 34 ─
```

Reverted and re-run:

```
$ npm run test:e2e -- browse.spec.ts -g "C#4 occupies the same x"
  ✓  1 [chromium] › e2e/browse.spec.ts:281:5 › C#4 occupies the same x in measure 1 and in measure 34 (345ms)
  1 passed (2.5s)
```

Tree confirmed after the revert: line 297 reads
`expect(later!.x).toBeCloseTo(first!.x, 1);` again, and
`git status --porcelain e2e/` lists only the intended new file
`?? e2e/browse.spec.ts` — no other file under `e2e/` is modified. A temporary
evidence spec used to capture the measurements quoted throughout this document
(`e2e/zz-evidence.spec.ts`) was deleted before the commit; `ls e2e/` shows only
the four real specs.

## New tests

**15 in `e2e/browse.spec.ts`**, all accessibility-first — every locator is a
role and an accessible name or visible text:

| Test | Covers |
|---|---|
| `browse is what the tab lands on, with measure 1 already drawn` | 7 — the piece is the landing state, onsets and all |
| `the first page is three measures and 36 onsets, and measure 4 is not drawn` | 8 — bounded, with the key-node count measured in the DOM |
| `every rendered measure carries its number` | 15 — group names scraped, headings asserted |
| `showing more adds measures 4 to 6 and keeps 1 to 3` | 9 — extends, does not replace |
| `scrolling to the end of the drawn measures loads nothing more` | 10 — the negative half: no observer exists |
| `more measures load from the keyboard alone` | 10 — focus, Enter, Enter again; focus never stolen |
| `jumping to measure 34 lands on it without scrolling` | 11 — the use case the loop exists for |
| `0, 70 and a non-number are each refused out loud` | 12 — four visible refusals, and recovery afterwards |
| `every browse keyboard is F1 to D#6, 34 white keys, at measure 1 and at 34` | 13 — the loop: stated range and measured width, across a 33-bar jump |
| `C#4 occupies the same x in measure 1 and in measure 34` | 14 — the loop: a pitch does not move when the measure does |
| `entering a phrase replaces browse, and clearing brings it back` | 16 — one surface, two ways in |
| `clearing a query returns the reader to where they were reading` | 4 (decision) — the reader's place is not part of the query |
| `the browse position does not survive a reload` | 18 — session state only, proven from outside |
| `at measure 69 the show-more control is present and disabled` | 10 — the boundary, disabled and named honestly |
| `a measure is a column of evenly spaced rows, with no playback` | 19 — one row per onset, evenly spaced, nothing that plays |

**22 in `src/tests/browse.test.ts`**, covering `browseMeasures`,
`nextUnreadMeasure` and `requestMeasure` against both the committed artifact
and the gapped fixture — the case the artifact cannot exercise, since all 69 of
its measures carry onsets — plus the page-size constants and the
bounds-derivation proof for check 12.

## Commit

Subject: `Open the phrase lookup tab on the piece itself`

SHA: **`ca7211c`** — this is the id of the loop's single commit as first
created. The line you are reading was then written into this file and that same
commit amended in place, so `git log -1` reports a different final id: a commit
cannot contain its own hash, and amending keeps the loop to one commit rather
than adding a bookkeeping second one.

Preceded by `e734dc5`, which is **not** part of this loop — it is the previous
loop's uncommitted work, committed separately first so that Loop 017's single
commit contains only Loop 017. See Task 0.

## Repair attempts

**One of two used.**

`scrolling to the end of the drawn measures loads nothing more` first asserted
`window.scrollY > 0` to prove a scroll had happened, and failed:
`Expected: > 0, Received: 0`. This page's scrolling element is not the window,
so the assertion was measuring the wrong thing — and had it been left as
`toBeGreaterThanOrEqual(0)` or dropped, the test would have "passed" while
proving nothing, which is the failure mode this project's learning notes keep
returning to. Replaced with a measurement of a known element moving up the
viewport, which is true whichever element scrolls. The product was not changed;
the test was.

The same reasoning was then applied to check 11, which had asserted
`window.scrollY === 0` — vacuously true for the same reason. It now asserts
that measure 34's heading sits inside the viewport, which is the property that
actually matters. That correction was made before the test was ever run in its
weak form, so it is not counted as a second repair.

## Stop rules triggered

None. `NEEDS_ARCHITECTURE_DECISION`, `OUT_OF_SCOPE` and `FAILED_VERIFICATION`
were not reached. No dependency was added, no persistence introduced, and the
merged-stream contract was not touched.

Two things were escalated to the human rather than decided unilaterally, both
**before** implementation began: the stale handoff file (Task 0) and the dirty
working tree. Neither is a stop rule — both are contract hygiene that would
have silently corrupted the sprint record if resolved quietly.

## Out-of-scope pressure encountered

**Persistence: strong, and refused.** This is the first loop where the absence
of storage is actively felt. The reader jumps to measure 34, reloads the page,
and is back at measure 1 — and one line of `localStorage` would fix it. The
handoff forbids it in three separate places and Loop 001 excluded it, so it was
not done; instead there is a test that *asserts the reload loses the position*,
which turns the absence into a checked property rather than an omission waiting
to be quietly filled. The honest note is that this is the loop that creates the
demand for storage, and Loop 018 or 019 will have to answer it rather than
inherit it.

A softer form of the same pull: keeping the browse position across a query is
itself a small piece of memory. It was kept because it is genuinely session
state in one component tree — not stored, not survived, gone on reload — but it
is worth noticing that "remember where I was" arrived in this loop even in the
sanctioned form.

**Piano roll: mild, and refused twice.** The first pull was proportional
spacing: a measure's onsets are triplet quavers with a longer chord on each
beat, and 120px of even gap between them looks wrong to a musician. Rows are
evenly spaced, and there is a test that fails if they stop being. The second
was a scrolling viewport with a fixed cursor — a continuous time axis in
disguise — which is what several thousand pixels of column invites. The page
scrolls; the music does not move past anything.

**A third pull, specific to this loop: virtualisation.** ~4,300px of DOM for
three measures makes windowed rendering look obviously correct, and it would
have meant a dependency, or a hand-rolled scroll-position calculation that is
scroll-triggered loading under another name. Refused on both counts. The
bounded page plus an explicit control is the same answer with none of the cost.

**Widening of purpose, recorded as the handoff asks:** this is the second
widening in two loops, and it is the larger of the two. Loop 016 made a result
something you read forward from. Loop 017 makes the piece readable without a
result at all. The product is now a **pitch-position score reader with lookup
in it**, which is what Section 5 of the handoff predicted and named. Nothing
was added beyond what Section 4 froze, but the change of identity is real and
is not hidden by calling it a rendering change.

## Risks and open questions

1. **Three measures is a guess about a reader nobody has watched yet.** It is
   defensible on node count and on screens-of-reading, but the right span is
   the one that matches how far someone actually reads before wanting more, and
   that is an empirical question. The constants are two exported numbers in
   `browse.ts`; changing them changes nothing else.

2. **Browse has no staff toggle.** The toggle lives in the results surface,
   which check 17 requires untouched, so browse draws with whatever `showStaff`
   happens to be — which on a fresh load is always off. A reader browsing the
   piece therefore cannot turn staff colouring on without first building a
   query. That is a real gap, and the fix (rendering the toggle in browse too)
   was deliberately not attempted in a loop whose contract froze that surface.

3. **The pristine tab is now much heavier.** Every visit to Phrase Lookup
   renders 36 SVG keyboards, each with its own `<defs>` of two gradients and
   four filters — 5,368 SVG elements before anyone does anything. The suite is
   unaffected (57 tests in 9.6s, up from 42 in 7.6s) and nothing measured is
   slow, but this is the first loop where opening the tab does real rendering
   work, and it will get heavier as the reader presses the control.

4. **`space-y-2` is dead code in the results surface.** `PhraseLookupSurface.tsx`
   uses it at two places and it is not compiled into `src/index.css` (only
   `space-y-3` and `space-y-8` are), so it does nothing — exactly the silent
   failure the CLAUDE.md constraint warns about. **Not fixed**, because fixing
   it would change the results surface's spacing, which check 17 forbids. It
   should be picked up by whichever loop is next allowed to touch that file.

5. **A jump to an empty measure lands on the next one that has onsets.** All 69
   measures of this piece carry onsets, so the behaviour is only exercised by a
   fixture. It is the safer default — no blank page — but a reader who typed 3
   and got measure 5 with no explanation would be reasonably confused. Worth
   revisiting the moment a piece with a genuinely empty bar exists.

6. **The handoff's measured facts should be regenerated before Loop 018.** The
   pixel column was already stale by one commit when this loop started, and
   nobody noticed until the numbers were re-measured. A spec that reasons from
   measurements needs those measurements taken against the branch it will run
   on.

## Next recommended action

**Accept current loop as complete.**
