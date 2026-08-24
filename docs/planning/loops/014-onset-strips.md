# Loop Spec 014: Results as Onset Strips

Loop type: **Completion**
Status: engineered, awaiting executor assignment
Executor: **Claude Code** (Opus 5)
Depends on: Loops 012 and 013 DONE

## Trigger

Results currently render as text — `matched: upper F#4 / lower F#3`, `then: upper — / lower C#4`. Three problems.

**It is the wrong modality.** The entire premise of this project is that the user's recall is spatial and muscle-memory based. Input became spatial in Loops 006 and 012. Results did not.

**The upper/lower framing actively misled.** At measure 13 the user reads `lower F#3` and infers left hand, while playing F#3 with his right. Staff is the transcription's layout, not a statement about hands — the same confusion that produced ADR 0002 and a bug report against correct behaviour.

**Results appear only after committing a whole group.** While assembling a chord the user gets a count and nothing else, even when only a handful of places remain.

## Goal

From **"results are text, framed by staff, and only appear after a full group is committed"** to **"results are strips of onset keyboards, single-tone by default, appearing as soon as the candidate set is small enough to show."**

## Design decisions, frozen

### One shared window across every rendered onset

Each onset renders as a small keyboard. **Every keyboard currently on screen uses the same pitch window**, computed from the min and max across all displayed notes. Per-onset windows would make shapes incomparable, which is the entire reason for showing them spatially.

Measured windows, from the committed artifact:

| Situation | Window | White keys |
|---|---|---|
| Founding query, 3 matched + 3 following | B1–F#4 | 19 |
| Partial `F#3+F#4`, its 6 onsets + 3 following each | F#1–F#4 | 21 |
| Worst rendered case: `[E4]`, first 12 of 78, + 3 following each | F#1–F#4 | **21** |
| Full keyboard, for comparison | F1–D#6 | 34 |

The window stays near 21 even at the cap, comfortably under the full 34. At 12px per white key that is ~252px per onset keyboard.

### Cap at 12 rendered results, always report the total

`[E4]` alone occurs **78** times. Render at most 12 and state the total — `"78 occurrences — showing 12"`. A one-note query is rarely the real question, so the cap costs little.

### Progressive disclosure at 6

While a group is being assembled, the surface currently shows only a containment count. **When that count is 6 or fewer, render the containing onsets as strips.** Above 6, count only.

| Selection | Onsets containing | Behaviour |
|---|---|---|
| F#4 | 87 | count only |
| B3 | 65 | count only |
| F#3 | 43 | count only |
| B1 + B2 | 13 | count only |
| **F#3 + F#4** | **6** | **strips** |

### Single tone by default; staff colouring opt-in

Matched notes render in **one tone**. A control — labelled as **staff**, never as hands — enables two-tone colouring by staff.

Requirements when the toggle is on:

- the label must say staff, and carry a one-line note that staff is the transcription's layout and does not always match which hand plays
- **colour must not be the only differentiator.** A marker, or a distinguishable pattern, so the distinction survives colour-vision deficiency
- accessible names for result notes carry the staff only while the toggle is on

**Session state only. No persistence, no storage.** The project has no storage layer and Loop 001 excluded one; a toggle that survives reload would quietly become a persistence decision.

### Layout

Group onsets into **matched** and **following** (up to 3), each group labelled and wrapping. Six onsets at 228px exceeds the container, and wrapping at the matched/following boundary reads better than an arbitrary break.

Note labels at small sizes are hard to read. **Labels on matched onsets; following onsets may omit them.** You know what you played; you are reading what comes next.

## Scope

In scope: `src/components/phrase-lookup/**`, `src/lib/music/**` if a pure helper is needed for window computation, `src/tests/**`, `e2e/**`, `src/styles/globals.css`, plus prompt archive and sprint output.

Explicitly out of scope:

- **Fuzzy, transposition-invariant, shape or relaxed matching** — Loop 007
- Inferring hands from pitch clustering — needs ground truth and an eval
- Ranking or scoring; a second piece; Web MIDI, audio, score rendering
- `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`
- `phrase-search.ts`, `scripts/`, the committed artifact
- Any npm dependency; a Tailwind build step; any persistence
- Removing the nine pre-existing `data-testid` attributes — unused, out of scope

## Constraints inherited from earlier loops

**No Tailwind build step.** `src/index.css` is a pre-compiled Tailwind v4 artifact; a utility class not already compiled into it does nothing, silently. Use utilities confirmed present, or hand-author in `src/styles/globals.css` with a comment.

**Browser verification is `npm run test:e2e`.** Loop 013 added a headless Playwright suite. Extend it — do not add manual browser checks.

**The e2e suite is accessibility-first.** It uses `getByRole` and `getByText`, never `getByTestId`. New tests must do the same, so the suite continues to enforce accessible naming.

## Verifier

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 under `strict` |
| 2 | `npm test` | all pass, including existing suites |
| 3 | `npm run build` | succeeds |
| 4 | `npm run test:e2e` | all specs pass, existing **and** new |
| 5 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing |
| 6 | **Suite stays accessibility-first** | `grep -rn "getByTestId" e2e/` returns nothing |
| 7 | No fixed sleeps | `grep -rn "waitForTimeout\|setTimeout" e2e/` returns nothing |
| 8 | Shared window | all onset keyboards rendered at one time share an identical pitch range — assert on the computed window, not by eye |
| 9 | Founding query window | 3 matched + 3 following → window **B1–F#4, 19 white keys** |
| 10 | Cap | `[E4]` → renders **12** results and reports **78** occurrences |
| 11 | Progressive disclosure, above threshold | `B1+B2` selected (13 onsets) → count shown, **no strips** |
| 12 | Progressive disclosure, at threshold | `F#3+F#4` selected (6 onsets) → **strips rendered** |
| 13 | Founding query result | strips render for the single match at measure 12, beat 4 |
| 14 | Single tone by default | with the toggle off, no staff distinction appears in the rendering or in accessible names |
| 15 | Toggle on | staff distinction appears, **and is not carried by colour alone** |
| 16 | Toggle labelling | the control names staff, and the staff-is-not-hand caveat is present |
| 17 | Toggle is session-only | `grep -rn "localStorage\|sessionStorage\|indexedDB" src/` returns nothing; a reload resets it |
| 18 | Vacuity | break one new assertion, capture the failure output, revert, confirm a clean tree |
| 19 | Existing behaviour intact | undo, clear, counts of 55 / 16 / 43 / 8 / 6 unchanged |

Check 8 is the loop — without a shared window the strips are decorative rather than comparable. Check 6 applies the lesson from Loop 013: it tests whether the suite *uses* test ids, not whether any exist.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not adjust a measured number to make a check pass.** Windows and counts come from the committed artifact.
- Do not relax matching to make a result appear.
- Do not use `getByTestId` in a new test, even if it is easier.
- Do not paper over e2e flakiness with retries or timeouts. A flaky test is a finding.
- Never silence a type error with `any` or an ignore comment.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–19 pass, evidence recorded |
| `NEEDS_ARCHITECTURE_DECISION` | success appears to require a dependency, persistence, or a merged-stream contract change |
| `NEEDS_HUMAN_DECISION` | a measured number is unreachable and you believe it wrong |
| `OUT_OF_SCOPE` | success appears to require fuzzy matching, hand inference, ranking, or a second piece |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report it.** See `docs/learning/never-mutate-an-active-handoff.md`.

## Deliberately left to the executor

- **SVG versus DOM** for the onset keyboards. `PhraseKeyboard` uses one; matching it is reasonable, and so is diverging for small static renders.
- **Whether onset keyboards reuse `keyLayout`** or a narrower variant. It is already pure and range-parameterised.
- **Marker shape** for the staff distinction when the toggle is on.
- **Wrap versus horizontal scroll** if a group exceeds the container.

Record each choice and its reasoning.

## What this loop does not resolve

Staff colouring remains a *transcription* fact presented to a user who thinks in *hands*. The toggle makes it opt-in and honestly labelled; it does not make it correct. Deriving hands is a real problem with a plausible heuristic — hand-span clustering separates `{B1,B2}` from `{F#3,F#4}` at measure 13 beat 1, where both span exactly 12 semitones and any other grouping exceeds a hand's reach — but a wrong hand assignment is worse than none, because the user would trust it. That needs ground truth and an eval harness, and remains future work.

