# Agent Handoff: Stack the Following Onsets

**Assigned agent: Claude Code**
**Model: Sonnet 5 (`claude-sonnet-5`)** — a bounded layout change with two open questions, in Section 9.
Loop spec: `docs/planning/loops/015-stacked-following.md`
Sprint: 15
Prepared: 2026-08-04
Sprint output: `docs/sprints/output/015-stacked-following-output.md`

Self-contained. Execute from this document alone. Do not rely on prior conversation.

Repository: `/Users/b/dev/chord-selector-app`, branch `phrase-lookup`. **Do not push. Do not merge to `main`.**

Browser verification is `npm run test:e2e` — a headless Playwright suite. **Do not add manual browser checks.** One machine step may be needed once: `npx playwright install chromium`.

## 1. Why

Loop 014 replaced text results with strips of onset keyboards sharing one pitch window. Both groups — `matched` and `then` — render left to right.

After using it, the human asked for one change: **stack the `then` onsets vertically, one below the other.**

## 2. Why this is more than a preference

The shared window already guarantees every keyboard covers the same pitch range. Horizontally, that guarantee buys less than it should — to see how onset *n+1* differs from *n*, the eye crosses a gap and re-locates the pitch in a new keyboard.

Stacked, the keyboards sit **directly above and below each other on the same x axis**. A note moving up a third becomes a visible shift right, one row down. Contour becomes shape rather than something to reconstruct.

**This makes the shared window more load-bearing, not less.** Vertical alignment is the entire mechanism. A misaligned window would make the stack *actively misleading* — implying movement that is an artefact of differing ranges — where horizontally it would merely be unhelpful.

## 3. What changes

**`matched` stays horizontal.** Short (1–3 onsets), and it confirms what you already played rather than being read.

**`then` stacks vertically**, up to 3 onsets, in `src/components/phrase-lookup/OnsetStrip.tsx`.

**Per-onset labels come back.** Loop 014 turned note names off for following onsets — the code comment reads `// Note names under the keys. On for matched onsets, off for what follows` — because horizontal strips forced ~8px labels. A stacked column has free horizontal space beside each row, so each can carry a readable measure/beat label such as `m12 b4.33`, and note names become legible again.

## 4. Space

At 12px per white key over a ~19–21 white-key window, one onset keyboard is ~252px wide, ~46px tall.

| Layout | Width | Height |
|---|---|---|
| 3 following, horizontal (current) | ~756px | ~60px |
| 3 following, stacked | **~252px** | ~180px |

Stacking removes the width problem — no wrapping, no horizontal scroll.

**Vertical space becomes the limiting dimension.** A result is roughly 240px, so twelve is a long page. Acceptable. If it proves unwieldy in use, **reduce the cap rather than un-stacking** — the cap is a tuning knob, the stack is the feature. Do not change the cap in this loop.

## 5. Explicitly not a piano roll

Stacked onsets sharing one pitch window is structurally a discrete piano roll, and piano-roll rendering has been out of scope since Loop 001.

**The human has stated this will not become one.** That is a settled product decision, not an open question.

Concretely, do not add: note durations, a continuous time axis, proportional vertical spacing by rhythm, a scrolling timeline, or playback. **One row per onset, evenly spaced, discrete.**

## 6. Constraints inherited

**No Tailwind build step.** `src/index.css` is a pre-compiled Tailwind v4 artifact. A utility class not already compiled into it **does nothing, silently** — no error, no warning. Use utilities confirmed present, or hand-author in `src/styles/globals.css` with a comment, as Loops 006, 011, 012 and 014 did.

**The e2e suite is accessibility-first** — `getByRole` and `getByText`, never `getByTestId`. That is what makes it double as the accessible-naming regression test. Nine unused `data-testid` attributes exist in `PhraseLookupSurface.tsx` from earlier loops: leave them, do not use them, do not remove them.

## 7. Tasks

**Task 0.** Copy `docs/agent-handoff.md` verbatim to `docs/prompts/sprint15-claude-code-stacked-following.md`. Verify with `cmp -s`, record the exit code.

**Task 1.** Stack the `then` onsets vertically in `OnsetStrip.tsx`. Leave `matched` horizontal.

**Task 2.** Restore per-onset labelling for stacked rows, per Section 9.

**Task 3.** Extend `e2e/onset-strips.spec.ts` for the new layout, accessibility-first.

**Task 4.** Run Section 8, write the output, commit once.

## 8. Verification requirements

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
| 12 | Window unchanged | founding query still computes **B1–F#4, 19 white keys**; `src/lib/music/onset-range.ts` untouched |
| 13 | Cap unchanged | `[E4]` still reports **78 occurrences — showing 12** |
| 14 | Disclosure unchanged | `B1+B2` (13) → count only; `F#3+F#4` (6) → strips |
| 15 | Not a piano roll | no durations, no proportional vertical spacing, no timeline, no playback |
| 16 | **Vacuity** | break one new assertion, capture the failure output verbatim, revert, confirm a clean tree |
| 17 | Existing behaviour intact | undo, clear, and counts of 55 / 16 / 43 / 8 / 6 unchanged |

**Checks 8 and 9 are the loop.** Check 7 alone would pass for a column of *misaligned* keyboards — which would be worse than the row it replaced, because it would imply movement that isn't there.

## 9. Decisions left to you — record each with reasoning

- **Note names on stacked rows**: restore them, or show only the measure/beat label? The 014 compromise existed solely because of a width constraint this loop removes.
- **Label placement**: beside each row, or above it.

## 10. Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not change `onset-range.ts`** to make an alignment check pass. If windows disagree, the bug is in rendering.
- Do not change the cap or the disclosure threshold.
- Do not use `getByTestId` in a new test, even where it is easier.
- Do not paper over e2e flakiness with retries, longer timeouts, or `test.slow()`. A flaky test is a finding.
- Never silence a type error with `any`, `@ts-ignore`, or `@ts-expect-error`.

## 11. Forbidden actions

- Editing `src/lib/music/onset-range.ts`, `phrase-search.ts`, `scripts/`, or the committed `moonlight-sonata.ts` artifact
- Piano-roll features per Section 5
- Fuzzy, transposition-invariant, shape or relaxed matching (Loop 007); hand inference; ranking; a second piece
- Changing the staff toggle's behaviour
- Editing `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `vercel.json`
- Any npm dependency; a Tailwind build step; any persistence
- Using or removing the nine pre-existing `data-testid` attributes
- `git push`, merging to `main`, rewriting history
- Writing anything in `/Users/b/dev/chordsense`

## 12. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–17 pass, evidence recorded |
| `NEEDS_ARCHITECTURE_DECISION` | stacking appears to require a dependency or a change to the window contract |
| `OUT_OF_SCOPE` | success appears to require piano-roll features, fuzzy matching, or hand inference |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report it.** See `docs/learning/never-mutate-an-active-handoff.md`.

## 13. Output requirements

Write `docs/sprints/output/015-stacked-following-output.md`:

- exactly one terminal state
- the two Section 9 decisions and the reasoning for each
- Task 0 archive path and `cmp` exit code
- every changed file and whether it was in scope
- all 17 checks with **actual output** — quote the measured geometry for 7–10, not "as expected"
- **the vacuity-proof failure output, verbatim**, and confirmation it was reverted with a clean tree
- the new e2e test names and what each covers
- the commit SHA
- repair attempts used, including zero
- stop rules triggered, if any
- out-of-scope pressure encountered — particularly any pull toward piano-roll features
- risks and open questions

When `DONE`, the next recommended action must be "accept current loop as complete."

**Note for whoever reviews this:** the human intends a week of real use afterwards. Nothing further should be specced until that produces evidence.
