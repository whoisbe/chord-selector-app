# Agent Handoff: Focused Occurrence with Measure Navigation

**Assigned agent: Claude Code**
**Model: Opus 5 (`claude-opus-5`)** — this loop introduces a new interaction mode and leaves three design decisions open, in Section 10. Tier follows loop type.
Loop spec: `docs/planning/loops/016-measure-navigation.md`
Sprint: 16
Prepared: 2026-08-04
Sprint output: `docs/sprints/output/016-measure-navigation-output.md`

Self-contained. Execute from this document alone. Do not rely on prior conversation.

Repository: `/Users/b/dev/chord-selector-app`, branch `phrase-lookup`. **Do not push. Do not merge to `main`.**

Browser verification is `npm run test:e2e` — a headless Playwright suite. **Do not add manual browser checks.** One machine step may be needed once: `npx playwright install chromium`.

## 1. Why

Results render as strips of onset keyboards — matched across, following stacked, sharing one pitch window. Each occurrence shows up to three following onsets.

Three onsets does not answer "what comes next." The user asked for `<` / `>` navigation by measure, on the model of Kibana Discover's surrounding-documents view: anchor on a hit, see context around it, page outward.

## 2. Goal

> From "an occurrence shows a fixed three onsets of context" to "an occurrence can be focused and paged through the piece a measure at a time, in a frame that never moves."

## 3. Measured facts that shape the design

| Fact | Value |
|---|---|
| Measures in the movement | 69 |
| Onsets per measure | median **12**, max 13, min 1 |
| Per-measure pitch window | varies **11 to 32** white keys |
| Full-piece window | F1–D#6, **34** white keys |
| One measure stacked | ~**720px** tall |

**These drove two decisions. Both are load-bearing.**

### 3a. The frame must be fixed while navigating

Per-measure windows vary widely — m40 spans 17 white keys, m20 spans 25. If the window recomputes as the user pages, keys resize and shift beneath them and apparent melodic movement becomes partly an artefact of the frame.

That is **worse than no navigation**, because it misinforms rather than merely underinforms.

**While an occurrence is focused, use a fixed window: MIDI 29–87, F1–D#6, 34 white keys.** The frame never moves; only the notes do.

This range is **identical to the input keyboard's**. Results and input become the same geometry — a genuine unification, not a coincidence.

### 3b. Navigation requires a focus

Six occurrences each showing a measure would be ~4,300px of stacked keyboards. Kibana does not put context controls on every hit; you click one to enter the context view.

## 4. Frozen design

**Click an occurrence to focus it.**

- The default results view is **unchanged** — compact strip, matched across, up to three following stacked.
- Clicking focuses one occurrence: it expands into the navigable context view. Others collapse to a compact summary line but stay visible and re-selectable.
- Focusing is **reversible** — there must be an obvious way back.
- Focus is **session state only. No persistence.**

**Two context mechanisms, kept deliberately.**

The compact default keeps its **three following onsets** — the immediate neighbourhood. This matters because a match can sit mid-measure: the founding query's match is at measure 12 **beat 4**, near the end of the bar, so paging straight to m13 would skip what directly follows it.

The focused view adds `<` / `>` paging **by measure**. These answer different questions — *what comes immediately next* versus *let me read forward*. Keep both.

**Navigation behaviour.**

- `>` advances to the next measure, `<` to the previous; the focused occurrence's own measure is the starting point.
- **The anchor stays identifiable** — when the matched onsets are in view they remain visually distinguished from surrounding context, so the user never loses what they searched for.
- At measure 1 `<` is **disabled and still present**; at 69 `>` likewise. **Disabled, not hidden** — a control that vanishes at a boundary is indistinguishable from a crash.
- The displayed measure number is always labelled.

**Accessibility.**

`<` and `>` must be real focusable controls with accessible names stating action and target — `"Previous measure, 11"`, `"Next measure, 13"` — not bare glyphs. The e2e suite selects on accessible names, so unnamed icon buttons are both inaccessible and untestable.

Occurrence cards must be focusable and activatable from the keyboard, since focusing is now an interaction rather than a display.

## 5. Still not a piano roll

Paging discrete onsets adds no durations, no continuous time axis, no proportional spacing by rhythm, no scrolling timeline, no playback. **One row per onset, evenly spaced, discrete.** The user has settled this; it is not an open question.

Recorded honestly: this does widen the product from *lookup* to *lookup plus read-forward*. That serves the original problem — three onsets never answered "what comes next" — but it is a real change of purpose, not a neutral addition.

## 6. Constraints inherited

**No Tailwind build step.** `src/index.css` is a pre-compiled Tailwind v4 artifact. A utility class not already compiled into it **does nothing, silently** — no error, no warning. Use utilities confirmed present, or hand-author in `src/styles/globals.css` with a comment, as Loops 006, 011, 012, 014 and 015 did.

**The e2e suite is accessibility-first** — `getByRole` and `getByText`, never `getByTestId`. That is what makes it double as the accessible-naming regression test. Nine unused `data-testid` attributes exist in `PhraseLookupSurface.tsx` from earlier loops: leave them, do not use them, do not remove them.

## 7. Tasks

**Task 0.** Copy `docs/agent-handoff.md` verbatim to `docs/prompts/sprint16-claude-code-measure-navigation.md`. Verify with `cmp -s`, record the exit code.

**Task 1.** Add a pure helper for onsets-in-measure and measure bounds. Unit-test it.

**Task 2.** Add focus state to the results surface — expand one, collapse the rest, reversible.

**Task 3.** Build the focused context view on the fixed F1–D#6 window.

**Task 4.** Add `<` / `>` measure navigation with bounds, labels and accessible names.

**Task 5.** Extend `e2e/` accessibility-first.

**Task 6.** Run Section 8, write the output, commit once.

## 8. Verification requirements

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 under `strict` |
| 2 | `npm test` | all pass |
| 3 | `npm run build` | succeeds |
| 4 | `npm run test:e2e` | all specs pass, existing **and** new |
| 5 | Suite accessibility-first | `grep -rn "getByTestId" e2e/` returns nothing |
| 6 | No fixed sleeps | `grep -rn "waitForTimeout\|setTimeout" e2e/` returns nothing |
| 7 | Default view unchanged | unfocused results still show matched across, up to 3 following stacked |
| 8 | Focus expands one | clicking an occurrence expands it; others collapse but remain present |
| 9 | Focus reversible | a control returns to the unfocused list |
| 10 | **Fixed frame** | the focused view spans **F1–D#6, 34 white keys**, and that range is **identical before and after** pressing `>` |
| 11 | **A pitch holds its x** | a pitch rendered in measure 12 and again in measure 13 occupies the same x — assert on measured geometry, not by eye |
| 12 | Measure stepping | from the founding match, `>` shows measure 13; `>` again 14; `<` returns to 13 |
| 13 | Measure labelled | the displayed measure number is visible in every navigation state |
| 14 | Anchor identifiable | when matched onsets are in view they are visually distinguished from surrounding context |
| 15 | Bounds | at measure 1 `<` is **disabled and present**; at 69 `>` is disabled and present |
| 16 | Control naming | `<` / `>` accessible names state action and target measure |
| 17 | Keyboard operable | an occurrence can be focused and navigated entirely from the keyboard |
| 18 | Session-only | `grep -rn "localStorage\|sessionStorage\|indexedDB" src/` returns nothing |
| 19 | Not a piano roll | no durations, no proportional spacing, no timeline, no playback |
| 20 | **Vacuity** | break one new assertion, capture the failure output verbatim, revert, confirm a clean tree |
| 21 | Existing behaviour intact | cap still `78 occurrences — showing 12`; disclosure 13 → count, 6 → strips; counts 55 / 16 / 43 / 8 / 6 unchanged |

**Checks 10 and 11 are the loop.** Navigation whose frame shifts underneath it is worse than none. Check 15 exists because a disappearing control at a boundary reads as a crash.

## 9. Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not change `src/lib/music/onset-range.ts`** to make check 10 pass. The focused view uses a *fixed* range; it does not alter how ranges are computed elsewhere.
- Do not change the 12-result cap or the ≤6 disclosure threshold.
- Do not use `getByTestId` in a new test, even where it is easier.
- Do not paper over e2e flakiness with retries, longer timeouts, or `test.slow()`. A flaky test is a finding.
- Never silence a type error with `any`, `@ts-ignore`, or `@ts-expect-error`.

## 10. Decisions left to you — record each with reasoning

- **How collapsed occurrences summarise themselves** while another is focused.
- **Where `<` / `>` sit** — above, below, or beside the focused strip.
- **How the anchor is distinguished** from surrounding context. It must **not rely on colour alone**; every UI loop here has protected that.

## 11. Forbidden actions

- Editing `src/lib/music/onset-range.ts`, `phrase-search.ts`, `scripts/`, or the committed `moonlight-sonata.ts` artifact
- Piano-roll features per Section 5
- Fuzzy, transposition-invariant, shape or relaxed matching (Loop 007); hand inference; ranking; a second piece
- Changing the staff toggle, the cap, or the disclosure threshold
- Editing `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `vercel.json`
- Any npm dependency; a Tailwind build step; any persistence
- Using or removing the nine pre-existing `data-testid` attributes
- `git push`, merging to `main`, rewriting history
- Writing anything in `/Users/b/dev/chordsense`

## 12. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–21 pass, evidence recorded |
| `NEEDS_ARCHITECTURE_DECISION` | focus or navigation appears to require a dependency, persistence, or a merged-stream contract change |
| `OUT_OF_SCOPE` | success appears to require piano-roll features, fuzzy matching, or hand inference |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report it.** Do not resume against an amended contract — a prior loop failed exactly that way. See `docs/learning/never-mutate-an-active-handoff.md`.

## 13. Output requirements

Write `docs/sprints/output/016-measure-navigation-output.md`:

- exactly one terminal state
- the three Section 10 decisions and the reasoning for each
- Task 0 archive path and `cmp` exit code
- every changed file and whether it was in scope
- all 21 checks with **actual output** — quote the measured geometry for 10, 11 and 15, not "as expected"
- **the vacuity-proof failure output, verbatim**, and confirmation it was reverted with a clean tree
- how the anchor is distinguished without relying on colour alone
- the new e2e test names and what each covers
- the commit SHA
- repair attempts used, including zero
- stop rules triggered, if any
- out-of-scope pressure encountered — particularly any pull toward piano-roll features
- risks and open questions

When `DONE`, the next recommended action must be "accept current loop as complete."

**Note for whoever reviews this:** the human intends a week of real use afterwards. Nothing further should be specced until that produces evidence.
