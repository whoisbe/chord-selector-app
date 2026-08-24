# Manual test procedure: focused occurrence with measure navigation

Covers the surface added in Loop 016 (`docs/planning/loops/016-measure-navigation.md`).

This procedure mirrors `e2e/measure-navigation.spec.ts` — anything that fails
here is a real regression, and every expected value below is one the automated
suite also asserts. It exists for a human reading the surface with their own
eyes, not as a substitute for `npm run test:e2e`, which remains the browser
verifier of record (ADR 0004).

Piece under test: the committed Moonlight Sonata movement I artifact — 823
onsets, 69 measures. All measure and beat numbers below are that artifact's,
not general score facts.

Time: about five minutes.

## Setup

```
npm run dev          # vite, http://localhost:3000, opens a browser
```

Click the **Phrase Lookup** tab.

Keys carry a tooltip (`title`) of the form `F#3, available next` — hover to
confirm you have the right key before clicking. White C keys are labelled on
the key itself; count up or down from those.

To test the production build instead — the exact thing the e2e suite runs
against:

```
npm run build && npx vite preview --host 127.0.0.1 --port 4173
```

## Part A — enter the founding query

| # | Do | Expect |
|---|---|---|
| 1 | Click **F#3**, then **F#4** | `Current group: [F#3+F#4]` · `8 possible next notes highlighted` · `6 onsets in the piece contain the current selection` · six containing-onset strips appear |
| 2 | Click **Add group** | `Phrase: [F#3+F#4]` |
| 3 | Click **C#4**, **Add group** | `Phrase: [F#3+F#4] → [C#4]` |
| 4 | Click **E4**, **Add group** | `Phrase: [F#3+F#4] → [C#4] → [E4]` · `1 occurrence of [F#3+F#4] → [C#4] → [E4]` |

**Baseline — the default view must be unchanged (check 7).** The single result
card shows:

- heading **`Measure 12, beat 4`**
- `Same range on every keyboard: B1 to F#4, 19 white keys. Shapes below can be compared directly.`
- `matched` — three keyboards **side by side**
- `then` — three keyboards **stacked**, labelled `m13 b1`, `m13 b1.33`, `m13 b1.67`
- the hint `Open an occurrence to read forward from it, a measure at a time.`
- **no** `‹` / `›` controls anywhere

## Part B — open it (checks 8, 10, 14)

| # | Do | Expect |
|---|---|---|
| 5 | Click the heading **`Measure 12, beat 4`** | The compact strip is replaced by the context view |

Expected state:

- Banner now reads **`Same range on every keyboard: F1 to D#6, 34 white keys —
  fixed while an occurrence is focused, so paging between measures moves the
  notes and never the frame.`**
- A control row: **`Back to all occurrences`** · **`‹`** · **`Measure 12 of 69`** · **`›`**
- **12 rows**, top to bottom: `m12 b1`, `b1.33`, `b1.67`, `b2`, `b2.33`,
  `b2.67`, `b3`, `b3.33`, `b3.67`, `b4`, `b4.33`, `b4.67`
- The **last three rows only** carry a **`▌ matched`** badge in the left
  gutter — those are the search itself: `m12 b4` shows F#3 + F#4, `b4.33`
  shows C#4, `b4.67` shows E4
- Every keyboard is visibly wider than the ones in Part A (34 white keys
  against 19), and all 12 start at the same left edge

Before stepping, note where the **F#4** mark sits in row `m12 b4` — pick a
screen landmark, or read the widths in the devtools console:

```js
[...document.querySelectorAll('svg.onset-keyboard')].map(s => s.getAttribute('width'))
```

Expected: twelve identical values, `"479.66666666666663"`.

## Part C — step forward and back (checks 10–13)

| # | Do | Expect |
|---|---|---|
| 6 | Click **`›`** | `Measure 13 of 69` · 12 rows `m13 b1` … `m13 b4.67` · **no `matched` badge anywhere** (the match is not in this bar) |
| 7 | Look at **F#4** in row `m13 b1` | It sits at **exactly the same horizontal position** as the F#4 noted in `m12 b4`. Re-run the console line: still twelve identical `"479.66666666666663"` — the frame did not move |
| 8 | Click **`›`** again | `Measure 14 of 69` |
| 9 | Click **`‹`** | `Measure 13 of 69` — same content as step 6 |
| 10 | Throughout steps 6–9 | The heading still reads `Measure 12, beat 4`, so the match's location is never lost |

**Failure signal for the loop's central property:** if keys change size, or
F#4 lands somewhere else after step 6, the window is being recomputed per
measure. That is worse than no navigation — it implies melodic movement that
is not in the music. Stop and report it.

## Part D — boundaries (checks 15, 16)

Click **Clear all**, then:

| # | Do | Expect |
|---|---|---|
| 11 | Click **C#2**, **C#3**, **G#3** → **Add group** | `1 occurrence of [C#2+C#3+G#3]` at `Measure 1, beat 1` |
| 12 | Open it | `Measure 1 of 69` · **`‹` visible but greyed out and unclickable** · `›` active |
| 13 | **Clear all**, then click **C#2, G#2, C#3, E3, G#3, C#4** → **Add group** | `2 occurrences` — `Measure 68, beat 3` and `Measure 69, beat 1` |
| 14 | Open **`Measure 69, beat 1`** | `Measure 69 of 69` · **`›` visible but greyed out** · `‹` active · exactly **one row** (`m69 b1`), carrying the `▌ matched` badge |
| 15 | While it is open, look at the other card | `Measure 68, beat 3` collapsed to one line reading `then [G#3]`, still clickable — click it and the view jumps to `Measure 68 of 69` |

Disabled must mean **greyed and present**, never gone: a control that vanishes
at a boundary is indistinguishable from a crash.

To confirm the control names (check 16), open devtools → Elements → select the
`‹` button → the Accessibility pane should read `Previous measure, unavailable
at measure 1` at measure 1, and `Previous measure, 68` at measure 69. These
buttons carry no tooltip; the name is exposed to assistive technology only.

## Part E — keyboard only (check 17)

Re-enter the founding query (Part A), then use no mouse:

| # | Press | Expect |
|---|---|---|
| 16 | `Tab` until the `Measure 12, beat 4` heading has a focus ring | Focus ring visible along the whole heading line |
| 17 | `Enter` | It opens — **and focus stays on that heading**, not moved out from under you |
| 18 | `Tab` | `Back to all occurrences` focused |
| 19 | `Tab` | `‹` focused |
| 20 | `Tab` | `›` focused |
| 21 | `Enter` | `Measure 13 of 69` |
| 22 | `Escape` | Closes back to the compact strip |

## Part F — session state (check 18)

| # | Do | Expect |
|---|---|---|
| 23 | Open an occurrence, then reload the page | Nothing is remembered: re-enter the query and it renders unfocused |
| 24 | Open an occurrence, then click any key on the input keyboard | The occurrence closes immediately — a new selection is a new question, and closing keeps one pitch window on screen at a time |

## Intended behaviour that can look like a bug

- **`matched` badges disappear once you page away** from the bar holding the
  match. The mark tracks the anchor; it does not decorate the view.
- **`Back to all occurrences` restores the three-following-onsets strip**
  rather than keeping the measure view. The compact strip answers "what comes
  immediately next" and the focused view answers "let me read forward" — both
  are kept, and they are never shown at the same time, because two pitch
  windows on screen at once would make the shapes incomparable.
- **Only one occurrence is open at a time.** Opening a second closes the
  first; a measure is close to a thousand pixels tall.
- **Occurrences in the "onsets containing the current selection" list are not
  openable.** Focus applies to occurrences of a committed phrase only.
