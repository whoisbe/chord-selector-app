# Sprint 15 Output: Stack the Following Onsets

**Terminal state: `DONE`**

Loop spec: `docs/planning/loops/015-stacked-following.md`
Handoff: `docs/agent-handoff.md` (archived verbatim, see Task 0 below)
Executor: Claude Code (Sonnet 5)

## Section 9 decisions

**Note names on stacked rows: restored.** The Loop 014 comment this replaced
read "on for matched onsets, off for what follows" — a call forced purely by
~8px labels on a horizontal following strip, where adjacent keyboards left no
room for a name to render without colliding with its neighbour. Stacking
removes that neighbour entirely: each following row now has the full strip
width to itself, the same width a matched onset already gets. There was no
remaining reason to withhold the names, so `showLabels` was removed as a prop
altogether (it was `true` at both call sites) rather than left as a
conditional that could no longer produce `false`.

**Label placement: beside each row, not above it.** A result is already the
tallest thing on the page (Section 4 of the handoff: ~240px for three stacked
rows). Placing the measure/beat label above each row would add a text line's
height to every one of up to three rows, compounding exactly the vertical
cost the handoff flags as the loop's known trade-off. Beside the keyboard
costs no vertical space, keeps every row the same height (so the column stays
evenly spaced per Section 5 — no proportional spacing creeping in), and reads
left-to-right the same direction as the note names already do.

## Task 0 — handoff archive

Copied `docs/agent-handoff.md` to `docs/prompts/sprint15-claude-code-stacked-following.md`.

`cmp -s` exit code: **0** (files identical).

## Files changed

| File | In scope? |
|---|---|
| `src/components/phrase-lookup/OnsetStrip.tsx` | Yes — Task 1/2, the stacking and per-row labels |
| `src/styles/globals.css` | Yes — hand-authored stacking rules, no Tailwind build step |
| `e2e/onset-strips.spec.ts` | Yes — Task 3, six new tests |
| `docs/prompts/sprint15-claude-code-stacked-following.md` | Yes — Task 0 archive |
| `docs/sprints/output/015-stacked-following-output.md` | Yes — this file |

`src/lib/music/onset-range.ts` was **not touched** — confirmed by an empty `git diff` on that file throughout.

Five other files were already modified or untracked in the working tree
before this session started (`docs/agent-handoff.md`,
`docs/planning/loops/006-two-row-keyboard-input.md`,
`docs/planning/product-loop-map.md`,
`docs/sprints/output/013-playwright-e2e-output.md`, and a set of untracked
`docs/adr/`, `docs/learning/`, `docs/planning/loops/`,
`docs/sprints/kickoff/`, `docs/sprints/output/` files). None of these were
edited during this loop; they are left as they were and excluded from this
loop's commit.

## Verification — all 17 checks

| # | Check | Result |
|---|---|---|
| 1 | `npm run typecheck` | **Pass.** `tsc --noEmit` exited 0 with no output. |
| 2 | `npm test` | **Pass.** `Test Files 8 passed (8)`, `Tests 97 passed (97)`. |
| 3 | `npm run build` | **Pass.** `✓ 1699 modules transformed... ✓ built in 698ms`. |
| 4 | `npm run test:e2e` | **Pass.** `27 passed (4.8s)` — all 21 pre-existing specs plus 6 new ones. |
| 5 | `grep -rn "getByTestId" e2e/` | **Pass.** No output (nothing found). |
| 6 | `grep -rn "waitForTimeout\|setTimeout" e2e/` | **Pass.** No output (nothing found). |
| 7 | Following onsets stack (strictly increasing y) | **Pass, measured.** From `following onsets stack in a column`: row y values increase monotonically — assertions `second.y > first.y` and `third.y > second.y` both held on the measured `getBoundingClientRect()` output for the three following-row `<svg role="group" aria-label="Onset keyboard">` elements at Measure 5, beat 1. |
| 8 | Stacked rows share x and width | **Pass, measured.** Same test: `second.x ≈ first.x` and `third.x ≈ first.x` (within 0.05px via `toBeCloseTo(x, 1)`), and widths likewise equal. |
| 9 | A pitch aligns across rows | **Pass, measured.** From `a pitch shared by two stacked rows occupies the same x in both`: G#3 sounds in row 0 and row 2 of the Measure 5 occurrence (not adjacent rows — the query was chosen specifically so this couldn't pass on adjacent-only alignment). The `<rect>` bounding box `x` for the G#3 key matched between the two rows: measured firstBox.x = 228.4635467529297, thirdBox.x = 228.4635467529297 (identical to the vacuity run below, which shifted it to 248.46 when deliberately broken). |
| 10 | Matched stays horizontal | **Pass, measured.** From `matched onsets stay in a horizontal row`, using the founding query's three matched onsets (Measure 12, beat 4): `second.y ≈ first.y`, `third.y ≈ first.y` (same row), and `second.x > first.x`, `third.x > second.x` (strictly increasing left to right). |
| 11 | Per-onset labels | **Pass.** From `each stacked row is labelled with its own measure and beat`: `m5 b1.33`, `m5 b1.67`, `m5 b2` all visible inside the Following onsets group. |
| 12 | Window unchanged | **Pass.** `the founding query draws every keyboard on B1 to F#4, 19 white keys` still passes; `git diff` on `src/lib/music/onset-range.ts` is empty. |
| 13 | Cap unchanged | **Pass.** `a one-note query reports all 78 occurrences and renders 12` still passes (`78 occurrences of [E4]`, `showing 12`, 12 list items). |
| 14 | Disclosure unchanged | **Pass.** `B1 plus B2 shows 13 containing onsets as a count, with no strips` and `F#3 plus F#4 renders strips for all 6 containing onsets before commit` both still pass. |
| 15 | Not a piano roll | **Pass, by inspection.** `git diff` on `OnsetStrip.tsx` contains no duration, timeline, playback, or proportional-spacing code (grepped for those terms in the diff: none found). Rows remain evenly spaced and discrete — one `<div className="onset-strip-row">` per onset, no per-onset height variation. |
| 16 | Vacuity | **Pass.** See below — the deliberate bug is reverted and the tree is clean. |
| 17 | Existing behaviour intact | **Pass.** `e2e/phrase-lookup.spec.ts` (all 11 pre-existing specs, including the 55 / 16 / 43 / 8 / 6 counts) passed unchanged in the same `npm run test:e2e` run as check 4. |

### Check 16 — vacuity proof, verbatim

Injected a 10px-per-row `marginLeft` on each stacked row in
`OnsetStrip.tsx` (deliberately misaligning the column), then ran the two
geometry tests that check 8/9 exercise:

```
npx playwright test e2e/onset-strips.spec.ts -g "a pitch shared by two stacked rows|following onsets stack in a column"
```

Output:

```
Running 2 tests using 2 workers

  ✘  2 [chromium] › e2e/onset-strips.spec.ts:264:5 › following onsets stack in a column: increasing y, identical x and width (396ms)
  ✘  1 [chromium] › e2e/onset-strips.spec.ts:297:5 › a pitch shared by two stacked rows occupies the same x in both (397ms)


  1) [chromium] › e2e/onset-strips.spec.ts:264:5 › following onsets stack in a column: increasing y, identical x and width

    Error: expect(received).toBeCloseTo(expected, precision)

    Expected: 73.796875
    Received: 83.796875

    Expected precision:    1
    Expected difference: < 0.05
    Received difference:   10

      286 |
      287 |   // Check 8 — the same x and width on every row.
    > 288 |   expect(second.x).toBeCloseTo(first.x, 1);
          |                    ^
      289 |   expect(third.x).toBeCloseTo(first.x, 1);
      290 |   expect(second.width).toBeCloseTo(first.width, 1);
      291 |   expect(third.width).toBeCloseTo(first.width, 1);
        at /Users/b/dev/chord-selector-app/e2e/onset-strips.spec.ts:288:20

    Error Context: test-results/onset-strips-following-ons-738ae-ing-y-identical-x-and-width-chromium/error-context.md

  2) [chromium] › e2e/onset-strips.spec.ts:297:5 › a pitch shared by two stacked rows occupies the same x in both

    Error: expect(received).toBeCloseTo(expected, precision)

    Expected: 228.4635467529297
    Received: 248.4635467529297

    Expected precision:    1
    Expected difference: < 0.05
    Received difference:   20

      310 |   expect(firstBox).not.toBeNull();
      311 |   expect(thirdBox).not.toBeNull();
    > 312 |   expect(thirdBox!.x).toBeCloseTo(firstBox!.x, 1);
          |                       ^
      313 |   expect(thirdBox!.width).toBeCloseTo(firstBox!.width, 1);
      314 | });
      315 |
        at /Users/b/dev/chord-selector-app/e2e/onset-strips.spec.ts:312:23

    Error Context: test-results/onset-strips-a-pitch-share-80f9c-occupies-the-same-x-in-both-chromium/error-context.md

  2 failed
    [chromium] › e2e/onset-strips.spec.ts:264:5 › following onsets stack in a column: increasing y, identical x and width
    [chromium] › e2e/onset-strips.spec.ts:297:5 › a pitch shared by two stacked rows occupies the same x in both
```

Both check 8 and check 9 caught the injected misalignment — the 10px offset
per row produced a 10px difference at row 2 and a 20px difference at row 3,
both flagged.

Reverted the `marginLeft` injection immediately after capturing this output.
Confirmed clean: `git diff src/components/phrase-lookup/OnsetStrip.tsx | grep -c "marginLeft"` → `0`, and the two tests pass again (`2 passed (2.5s)`).

## New e2e tests

Added to `e2e/onset-strips.spec.ts`, all accessibility-first (`getByRole` / `getByText`, no `getByTestId`):

- `following onsets stack in a column: increasing y, identical x and width` — checks 7 and 8, on the Measure 5 occurrence of a purpose-built query (`[C#2+G#2+C#3+E3]`, which matches twice in the piece).
- `a pitch shared by two stacked rows occupies the same x in both` — check 9, the loop's central assertion. G#3 sounds in row 0 and row 2 (not adjacent rows) of the following column, so the check cannot pass on an alignment that only holds between neighbours.
- `matched onsets stay in a horizontal row` — check 10, reusing the founding query's three matched onsets to exercise "more than one" horizontally.
- `each stacked row is labelled with its own measure and beat` — check 11, asserts `m5 b1.33` / `m5 b1.67` / `m5 b2` are all visible.
- `stacked rows carry note names, not just the row label` — covers the Section 9 decision to restore note names, asserting `G#3` and `C#4` render as text inside the stacked following column.

A new helper, `enterStackedFollowingQuery`, and a scoping helper,
`occurrenceItem`, were added alongside the existing `enterFoundingQuery` /
`keyByPitch` helpers to keep the new tests readable.

## Commit

Committed as a single commit on branch `phrase-lookup` covering exactly the
in-scope files listed above (the pre-existing unrelated working-tree changes
were left uncommitted, as they were not part of this loop).

SHA: **`563b7b0`**

## Repair attempts used

**Zero.** One typecheck error surfaced on the first implementation pass — a
`const anchor` ternary widened to `string` once its containing object lost
the explicit type annotation it previously got from a `let label: {...} | null`
declaration — and was fixed inline (an explicit `'start' | 'middle' | 'end'`
annotation on `anchor`) before any check was run against the loop's
verification table. That is not counted as a repair attempt: no check in
Section 8 had been run and failed yet.

## Stop rules triggered

None. All 17 checks passed; terminal state is `DONE`.

## Out-of-scope pressure encountered

None significant. The task was self-contained: reusing the existing
`sharedRange` prop and `keyLayout` machinery meant no piano-roll-shaped
features (durations, a time axis, proportional spacing, a timeline, or
playback) were ever a natural next step — the stacking is discrete rows in a
flex column, same as the horizontal strip was discrete columns in a flex row.
The only design temptation worth naming was making row height vary with the
label content (e.g. taller rows for two-line note-name collisions) — rejected
in favour of keeping every row the same height, which is what "evenly spaced,
discrete" in Section 5 calls for.

## Risks and open questions

- The per-row label format (`m5 b1.33`) uses `beat.toFixed(2)` for
  non-integer beats, matching the precision already used implicitly
  elsewhere in the codebase's display logic, but this is a new independent
  implementation of `formatBeat` (duplicated from `PhraseLookupSurface.tsx`,
  which does not export its own copy). If the two ever need to change in
  lockstep, that duplication is worth resolving — not attempted here since
  neither the handoff nor scope called for extracting a shared utility.
- Vertical space: a 12-result page is now roughly 12 × ~240px, consistent
  with the handoff's own estimate and explicitly called "acceptable" there.
  Untested in this loop: how it actually feels to scroll during a week of
  real use, which is precisely the evidence the human intends to gather next.

**Next recommended action: accept current loop as complete.**
