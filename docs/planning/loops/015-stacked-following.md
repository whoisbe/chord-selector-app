# Loop Spec 015: Stack the Following Onsets

> **SUPERSEDED IN PART, 2026-08-07, by the human directly.** This spec froze
> *"`matched` stays horizontal"*. During a week of use that was reversed:
> `matched` is now a **column** too, and the two columns sit **side by side**,
> top-aligned — phrase on the left, what follows on the right, readable in one
> glance across. The e2e assertions were rewritten to match with equal rigor
> (increasing y, identical x and width) plus a new test for the side-by-side
> property. Everything else in this spec still holds. See the product loop map,
> "Week of use".


Loop type: **Completion**
Status: engineered, awaiting executor assignment
Executor: **Claude Code** (Sonnet 5)
Depends on: Loop 014 DONE

## Trigger

Loop 014 replaced text results with strips of onset keyboards, sharing one pitch window. Both groups — `matched` and `then` — render left to right.

Using it, the human asked for one change: **stack the `then` onsets vertically, one below the other.**

## Goal

From **"following onsets sit side by side, so comparing consecutive onsets means crossing a gap and re-locating the pitch"** to **"following onsets stack in a column, so the same pitch sits at the same x on every row and melodic movement reads as a left/right shift travelling down."**

## Why this is more than a layout preference

The shared window already guarantees every keyboard covers the same pitch range. Laid out horizontally, that guarantee buys less than it should: to see how onset *n+1* differs from *n*, the eye crosses a gap and re-finds the pitch position in a new keyboard.

Stacked, the two keyboards are **directly above and below each other on the same x axis**. A note moving up a third becomes a visible shift right, one row down. Contour becomes shape rather than something to reconstruct.

**This makes the shared window more load-bearing, not less.** Vertical alignment is the entire mechanism. A misaligned window would make the stack *actively misleading* — implying movement that is an artefact of differing ranges — rather than merely unhelpful, which is what misalignment costs in the horizontal layout. Loop 014's window computation must not change.

## What changes

**`matched` stays horizontal.** It is short (1–3 onsets), and it is confirmation of what you already played rather than something being read.

**`then` stacks vertically**, up to 3 onsets, in `OnsetStrip.tsx`.

**Per-onset labels come back.** Loop 014 turned note names off for following onsets — `// Note names under the keys. On for matched onsets, off for what follows` — because horizontal strips forced ~8px labels. A stacked column has free horizontal space beside each row, so each row can carry a readable measure/beat label such as `m12 b4.33`, and note names become legible again.

**Decide and record** whether note names return for stacked rows, or only the measure/beat label. Either is defensible; the 014 compromise existed only because of a constraint this loop removes.

## Space

At 12px per white key and a ~19–21 white-key window, one onset keyboard is ~252px wide and ~46px tall.

| Layout | Width | Height |
|---|---|---|
| 3 following, horizontal (current) | ~756px | ~60px |
| 3 following, stacked | **~252px** | ~180px |

Stacking removes the width problem entirely — no wrapping, no horizontal scroll.

**Vertical space becomes the limiting dimension.** A result is roughly one matched row plus three stacked rows, ~240px, so twelve results is a long page. That is acceptable. If it proves unwieldy in use, **reduce the rendered cap rather than un-stacking** — the cap is a tuning knob, the stack is the feature.

## Explicitly not a piano roll

Stacked onsets sharing one pitch window is structurally a discrete piano roll — time down, pitch across. Piano-roll rendering has been out of scope since Loop 001.

**The human has stated this will not become one.** That boundary is a product decision, recorded here so it is not rediscovered as an open question.

Concretely, do not add: note durations, a continuous time axis, proportional vertical spacing by rhythm, a scrolling timeline, or playback. One row per onset, evenly spaced, discrete.

## Scope

In scope: `src/components/phrase-lookup/OnsetStrip.tsx`, `src/styles/globals.css`, `e2e/onset-strips.spec.ts`, `src/tests/**`, plus prompt archive and sprint output.

Explicitly out of scope:

- **Any change to `src/lib/music/onset-range.ts`** — the window computation is correct and verified
- Fuzzy, transposition-invariant, shape or relaxed matching (Loop 007); hand inference; ranking; a second piece
- The staff toggle's behaviour — it stays as 014 built it
- `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`, `phrase-search.ts`, `scripts/`, the committed artifact
- Any npm dependency; a Tailwind build step; any persistence

## Constraints inherited

**No Tailwind build step.** `src/index.css` is a pre-compiled Tailwind v4 artifact; a utility class not already compiled into it does nothing, silently. Use utilities confirmed present, or hand-author in `src/styles/globals.css` with a comment — as Loops 006, 011, 012 and 014 did.

**The e2e suite is accessibility-first.** `getByRole` and `getByText`, never `getByTestId`. That is what makes it double as the accessible-naming regression test.

## Verifier

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 under `strict` |
| 2 | `npm test` | all pass, including existing suites |
| 3 | `npm run build` | succeeds |
| 4 | `npm run test:e2e` | all specs pass, existing **and** new |
| 5 | Suite stays accessibility-first | `grep -rn "getByTestId" e2e/` returns nothing |
| 6 | No fixed sleeps | `grep -rn "waitForTimeout\|setTimeout" e2e/` returns nothing |
| 7 | **Following onsets stack** | each successive `then` onset's bounding box has a strictly greater `y` than its predecessor |
| 8 | **Stacked rows share x** | successive `then` onsets have the **same** `x` and the same width |
| 9 | **A pitch aligns across rows** | a pitch present in two stacked onsets occupies the same x in both — assert on measured geometry, not by eye |
| 10 | Matched stays horizontal | `matched` onsets share a `y` and have increasing `x` |
| 11 | Per-onset labels | every stacked row carries a readable measure/beat label |
| 12 | Window unchanged | founding query still computes **B1–F#4, 19 white keys**; `onset-range.ts` untouched |
| 13 | Cap unchanged | `[E4]` still reports **78 occurrences — showing 12** |
| 14 | Disclosure unchanged | `B1+B2` (13) → count only; `F#3+F#4` (6) → strips |
| 15 | Not a piano roll | no durations, no proportional vertical spacing, no timeline, no playback |
| 16 | Vacuity | break one new assertion, capture the failure output verbatim, revert, confirm a clean tree |
| 17 | Existing behaviour intact | undo, clear, and counts of 55 / 16 / 43 / 8 / 6 unchanged |

Checks 8 and 9 are the loop. Check 7 alone would pass for a column of *misaligned* keyboards, which is the failure mode that would make the stack worse than the row it replaced.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not change `onset-range.ts`** to make an alignment check pass. If windows disagree, the bug is in rendering.
- Do not use `getByTestId` in a new test.
- Do not paper over e2e flakiness with retries or timeouts. A flaky test is a finding.
- Never silence a type error with `any` or an ignore comment.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–17 pass, evidence recorded |
| `NEEDS_ARCHITECTURE_DECISION` | stacking appears to require a dependency or a change to the window contract |
| `OUT_OF_SCOPE` | success appears to require piano-roll features, fuzzy matching, or hand inference |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report it.** See `docs/learning/never-mutate-an-active-handoff.md`.

## After this loop

The human intends **a week of real use** before the next loop. Nothing should be specced in the meantime; the next decision — whether Loop 007's shape matching still earns its place, or whether a second piece matters more — should come from that week rather than from further analysis.
