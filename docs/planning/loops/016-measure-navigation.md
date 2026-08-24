# Loop Spec 016: Focused Occurrence with Measure Navigation

Loop type: **Completion**
Status: engineered, awaiting executor assignment
Executor: **Claude Code** (Opus 5)
Depends on: Loop 015 DONE

## Trigger

Loops 014 and 015 render results as strips of onset keyboards — matched across, following stacked, sharing one pitch window. Each occurrence shows up to three following onsets.

Three onsets is not enough to answer "what comes next." The user asked for `<` and `>` navigation by measure, drawing an explicit analogy to Kibana Discover's surrounding-documents view: anchor on a hit, see context around it, page outward.

## Goal

From **"an occurrence shows a fixed three onsets of context"** to **"an occurrence can be focused and paged through the piece a measure at a time, in a frame that never moves."**

## Measured facts that shape the design

| Fact | Value |
|---|---|
| Measures in the movement | 69 |
| Onsets per measure | median **12**, max 13, min 1 |
| Per-measure pitch window | varies **11 to 32** white keys |
| Full-piece window | F1–D#6, **34** white keys |
| One measure stacked | ~**720px** tall |

Two consequences follow, and both are load-bearing.

### The window must be fixed while navigating

Per-measure windows vary widely — m40 spans 17 white keys, m20 spans 25. If the window recomputes as the user pages, keys resize and shift beneath them, and apparent melodic movement becomes partly an artefact of the frame. That is worse than no navigation, because it misinforms.

**While an occurrence is focused, use the full-piece window: MIDI 29–87, F1–D#6, 34 white keys.** The frame never moves; only the notes do.

This range is **identical to the input keyboard's**. Results and input become the same frame, which is a genuine unification rather than a coincidence to be worked around.

### Navigation requires focus

Six occurrences each showing a measure would be ~4,300px of stacked keyboards. Kibana does not put surrounding-context controls on every hit; you click one to enter the context view. Same here.

## Design decisions, frozen

### Click an occurrence to focus it

- The default results view is **unchanged** — the compact strip from Loops 014/015, with matched across and up to three following stacked.
- Clicking an occurrence **focuses** it: it expands into the navigable context view; the others collapse to a compact summary line but remain visible and re-selectable.
- Focusing is reversible. There must be an obvious way back to the unfocused list.
- Focus is **session state only. No persistence.**

### Two context mechanisms, deliberately

The compact default keeps **three following onsets** — the immediate neighbourhood, which matters because a match can sit mid-measure. The founding query's match is at measure 12 **beat 4**, near the end of the bar; paging straight to m13 would skip what directly follows it.

The focused view adds `<` and `>` paging **by measure**.

These answer different questions — *what comes immediately next* versus *let me read forward* — and both are kept.

### Navigation behaviour

- `>` advances the focused view to the next measure; `<` to the previous.
- The focused occurrence's own measure is the starting point.
- **The anchor stays identifiable.** When the view includes the matched onsets, they remain visually distinguished from surrounding context, so the user never loses the thing they searched for.
- At m1, `<` is disabled. At m69, `>` is disabled. Disabled, not hidden — a missing control reads as a bug.
- The measure being displayed is always labelled.

### Accessibility

`<` and `>` must be real focusable controls with accessible names that state the action and target — for example `"Previous measure, 11"` and `"Next measure, 13"` — not bare glyphs. The e2e suite selects on accessible names, so unnamed icon buttons would be both inaccessible and untestable.

Occurrence cards must be focusable and activatable from the keyboard, since focusing is now an interaction rather than a display.

## Scope

In scope: `src/components/phrase-lookup/**`, `src/lib/music/**` for any pure helper (for example, onsets-in-measure lookup), `src/tests/**`, `e2e/**`, `src/styles/globals.css`, plus prompt archive and sprint output.

Explicitly out of scope:

- **Any change to `src/lib/music/onset-range.ts`** — the shared-window computation is correct and verified; the focused view uses a *fixed* range instead, it does not change how ranges are computed
- Fuzzy, transposition-invariant, shape or relaxed matching (Loop 007); hand inference; ranking; a second piece
- The staff toggle's behaviour
- The 12-result cap and the ≤6 disclosure threshold — unchanged
- `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`, `phrase-search.ts`, `scripts/`, the committed artifact
- Any npm dependency; a Tailwind build step; any persistence

## Still not a piano roll

Paging through discrete onsets adds no durations, no continuous time axis, no proportional spacing by rhythm, no scrolling timeline, no playback. **One row per onset, evenly spaced, discrete.** The user has settled this; it is not an open question.

Note honestly what does change: the product moves from *lookup* to *lookup plus read-forward*. That serves the original problem — "I forgot what comes next" was never fully answered by three onsets — but it is a real widening of purpose, recorded here rather than discovered later.

## Constraints inherited

**No Tailwind build step.** `src/index.css` is a pre-compiled Tailwind v4 artifact; a utility class not already compiled into it does nothing, silently. Use utilities confirmed present, or hand-author in `src/styles/globals.css` with a comment.

**The e2e suite is accessibility-first** — `getByRole` and `getByText`, never `getByTestId`.

## Verifier

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 under `strict` |
| 2 | `npm test` | all pass |
| 3 | `npm run build` | succeeds |
| 4 | `npm run test:e2e` | all specs pass, existing **and** new |
| 5 | Suite accessibility-first | `grep -rn "getByTestId" e2e/` returns nothing |
| 6 | No fixed sleeps | `grep -rn "waitForTimeout\|setTimeout" e2e/` returns nothing |
| 7 | Default view unchanged | unfocused results still show matched across, up to 3 following stacked |
| 8 | Focus expands one occurrence | clicking an occurrence expands it; others collapse but remain present |
| 9 | Focus is reversible | there is a control that returns to the unfocused list |
| 10 | **Fixed frame while focused** | the focused view's keyboards span **F1–D#6, 34 white keys**, and that range is **identical before and after** pressing `>` |
| 11 | **A pitch holds its x across measures** | a pitch rendered in measure 12 and again in measure 13 occupies the same x — assert on measured geometry |
| 12 | Navigation steps measures | from the founding match, `>` shows measure 13; `>` again shows 14; `<` returns to 13 |
| 13 | Measure is labelled | the displayed measure number is visible in every navigation state |
| 14 | Anchor stays identifiable | when the matched onsets are in view, they are visually distinguished from surrounding context |
| 15 | Bounds | at measure 1 `<` is **disabled and present**; at 69 `>` is disabled and present |
| 16 | Control naming | `<` and `>` have accessible names stating action and target measure |
| 17 | Keyboard operable | an occurrence can be focused, and navigated, entirely from the keyboard |
| 18 | Session-only | `grep -rn "localStorage\|sessionStorage\|indexedDB" src/` returns nothing |
| 19 | Not a piano roll | no durations, no proportional spacing, no timeline, no playback |
| 20 | **Vacuity** | break one new assertion, capture the failure output verbatim, revert, confirm a clean tree |
| 21 | Existing behaviour intact | cap still reports `78 occurrences — showing 12`; disclosure still 13 → count, 6 → strips; counts 55 / 16 / 43 / 8 / 6 unchanged |

**Checks 10 and 11 are the loop.** Navigation whose frame shifts underneath it is worse than no navigation — it implies movement that is not in the music. Check 15 exists because a disappearing control at a boundary is indistinguishable from a crash.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not change `onset-range.ts`** to make check 10 pass. The focused view uses a fixed range; it does not alter how ranges are computed.
- Do not change the cap or the disclosure threshold.
- Do not use `getByTestId` in a new test.
- Do not paper over e2e flakiness with retries or timeouts. A flaky test is a finding.
- Never silence a type error with `any` or an ignore comment.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–21 pass, evidence recorded |
| `NEEDS_ARCHITECTURE_DECISION` | focus or navigation appears to require a dependency, persistence, or a change to the merged-stream contract |
| `OUT_OF_SCOPE` | success appears to require piano-roll features, fuzzy matching, or hand inference |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report it.** See `docs/learning/never-mutate-an-active-handoff.md`.

## Left to the executor

- How collapsed occurrences summarise themselves while another is focused.
- Whether `<` `>` sit above, below, or beside the focused strip.
- How the anchor is visually distinguished from surrounding context — it must not rely on colour alone.

Record each choice and its reasoning.

## After this loop

The human intends **a week of real use**. Nothing further should be specced until that produces evidence. The two candidates waiting are whether Loop 007's shape matching still earns its place now that guided entry removes most ways to enter a wrong phrase, and whether a second piece matters more — which would also close ADR 0001's untested caveat that MuseScore's MusicXML is the clean case rather than proof about the format generally.
