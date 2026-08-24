# Agent Handoff: Results as Onset Strips

**Assigned agent: Claude Code**
**Model: Opus 5 (`claude-opus-5`)** — four design decisions are deliberately left open, in Section 11.
Loop spec: `docs/planning/loops/014-onset-strips.md`
Sprint: 14
Prepared: 2026-08-03
Sprint output: `docs/sprints/output/014-onset-strips-output.md`

Self-contained. Execute from this document alone. Do not rely on prior conversation.

Repository: `/Users/b/dev/chord-selector-app`, branch `phrase-lookup`. **Do not push. Do not merge to `main`.**

Browser verification is `npm run test:e2e` — a headless Playwright suite added in Loop 013. **Do not add manual browser checks.** One machine step may be needed once: `npx playwright install chromium`.

## 1. Why

Results currently render as text: `matched: upper F#4 / lower F#3`, `then: upper — / lower C#4`.

**Wrong modality.** This project exists because the user's recall is spatial and muscle-memory based. Input became spatial in Loops 006 and 012. Results did not.

**The upper/lower framing actively misled.** At measure 13 the user read `lower F#3` and inferred left hand, while playing F#3 with his right. Staff is the transcription's layout, not a claim about hands — the confusion behind ADR 0002 and a bug report filed against correct behaviour.

**Results appear only after a full group is committed.** While assembling a chord the user gets a count and nothing else, even when only a handful of candidates remain.

## 2. Goal

> From "results are text, framed by staff, and only appear after a full group is committed" to "results are strips of onset keyboards, single-tone by default, appearing as soon as the candidate set is small enough to show."

## 3. One shared window — this is the loop

Each onset renders as a small keyboard. **Every keyboard on screen at one time uses the same pitch window**, computed from the min and max across all displayed notes.

Per-onset windows would make shapes incomparable — and comparing shapes across the strip is the entire reason for rendering results spatially rather than as text. If you take one thing from this handoff, take this.

Windows measured from the committed artifact:

| Situation | Window | White keys |
|---|---|---|
| Founding query, 3 matched + 3 following | **B1–F#4** | **19** |
| Partial `F#3+F#4`, its 6 onsets + 3 following each | F#1–F#4 | 21 |
| Worst rendered case: `[E4]`, first 12 of 78, + 3 following each | F#1–F#4 | **21** |
| Full keyboard, for comparison | F1–D#6 | 34 |

The window stays near 21 even at the cap — comfortably under 34. At 12px per white key that is ~252px per onset keyboard.

## 4. Cap at 12, always report the total

`[E4]` alone occurs **78** times. Render at most **12** and state the total: `"78 occurrences — showing 12"`. A one-note query is rarely the real question, so the cap costs little and protects against rendering ~470 mini-keyboards.

## 5. Progressive disclosure at 6

While a group is being assembled the surface currently shows only a containment count. **When that count is 6 or fewer, render the containing onsets as strips.** Above 6, count only.

| Selection | Onsets containing | Behaviour |
|---|---|---|
| F#4 | 87 | count only |
| B3 | 65 | count only |
| F#3 | 43 | count only |
| B1 + B2 | 13 | count only |
| **F#3 + F#4** | **6** | **strips** |

These counts are measured and are already asserted by the existing e2e suite.

## 6. Single tone by default; staff colouring opt-in

Matched notes render in **one tone**. A control enables two-tone colouring by staff.

- **Label it as staff, never as hands**, and carry a one-line note that staff is the transcription's layout and does not always match which hand plays. The absence of that sentence is what cost a whole exchange with the user.
- **Colour must not be the only differentiator.** Add a marker or distinguishable pattern so it survives colour-vision deficiency. Every UI loop here has protected accessibility deliberately; this would be the first place meaning rested on hue alone.
- Accessible names for result notes carry staff **only while the toggle is on**.
- **Session state only. No persistence.** No `localStorage`, `sessionStorage`, or `indexedDB` — this project has no storage layer and Loop 001 excluded one. A toggle surviving reload would quietly become a persistence decision.

## 7. Layout

Group onsets into **matched** and **following** (up to 3), each labelled and wrapping. Six onsets at ~228px exceeds the container; wrapping at the matched/following boundary reads better than an arbitrary break.

Small labels are hard to read. **Label matched onsets; following onsets may omit labels.** You know what you played; you are reading what comes next.

## 8. Constraints inherited from earlier loops

**No Tailwind build step.** `src/index.css` is a pre-compiled Tailwind v4 artifact. A utility class not already compiled into it **does nothing, silently** — no error, no warning. Use utilities confirmed present, or hand-author in `src/styles/globals.css` with a comment, as Loops 006, 011 and 012 did.

**The e2e suite is accessibility-first.** It uses `getByRole` and `getByText`, never `getByTestId` — that is what makes it double as the accessible-naming regression test. New tests must follow suit.

Nine unused `data-testid` attributes exist in `PhraseLookupSurface.tsx` from earlier loops. **Leave them; do not use them; do not remove them.** They are out of scope.

## 9. Tasks

**Task 0.** Copy `docs/agent-handoff.md` verbatim to `docs/prompts/sprint14-claude-code-onset-strips.md`. Verify with `cmp -s`, record the exit code.

**Task 1.** Add a pure window-computation helper — given the onsets to display, return one shared pitch range. Unit-test it.

**Task 2.** Build the onset-strip renderer.

**Task 3.** Replace the text results in `PhraseLookupSurface.tsx` with strips.

**Task 4.** Add progressive disclosure at the ≤6 threshold.

**Task 5.** Add the staff toggle per Section 6.

**Task 6.** Extend `e2e/` for the new behaviour, accessibility-first.

**Task 7.** Run Section 10, write the output, commit once.

## 10. Verification requirements

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 under `strict` |
| 2 | `npm test` | all pass, including existing suites |
| 3 | `npm run build` | succeeds |
| 4 | `npm run test:e2e` | all specs pass, existing **and** new |
| 5 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing |
| 6 | **Suite stays accessibility-first** | `grep -rn "getByTestId" e2e/` returns nothing |
| 7 | No fixed sleeps | `grep -rn "waitForTimeout\|setTimeout" e2e/` returns nothing |
| 8 | **Shared window** | all onset keyboards rendered at one time share an identical pitch range — assert on the computed window, not by eye |
| 9 | Founding query window | 3 matched + 3 following → **B1–F#4, 19 white keys** |
| 10 | Cap | `[E4]` → renders **12** results, reports **78** occurrences |
| 11 | Disclosure, above threshold | `B1+B2` (13 onsets) → count shown, **no strips** |
| 12 | Disclosure, at threshold | `F#3+F#4` (6 onsets) → **strips rendered** |
| 13 | Founding query | strips render for the single match at measure 12, beat 4 |
| 14 | Single tone by default | toggle off → no staff distinction in rendering **or** accessible names |
| 15 | Toggle on | staff distinction appears, **and is not carried by colour alone** |
| 16 | Toggle labelling | the control names staff; the staff-is-not-hand caveat is present |
| 17 | Session-only | `grep -rn "localStorage\|sessionStorage\|indexedDB" src/` returns nothing; reload resets it |
| 18 | **Vacuity** | break one new assertion, capture the failure output verbatim, revert, confirm a clean tree |
| 19 | Existing behaviour intact | undo, clear, and counts of 55 / 16 / 43 / 8 / 6 unchanged |

Check 8 is the loop. Check 6 applies Loop 013's lesson — it tests whether the suite *uses* test ids, not whether any exist. Check 18 is why anyone should believe checks 8–17.

## 11. Decisions left to you — record each with reasoning

- **SVG versus DOM** for the onset keyboards. `PhraseKeyboard` uses one; matching it is reasonable, and so is diverging for small static renders.
- **Whether onset keyboards reuse `keyLayout`** or a narrower variant. It is already pure and range-parameterised.
- **Marker shape** for the staff distinction when the toggle is on.
- **Wrap versus horizontal scroll** if a group exceeds the container.

## 12. Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not adjust a measured number to make a check pass.** Windows and counts come from the committed artifact. If you believe one is wrong, stop at `NEEDS_HUMAN_DECISION` and show the discrepancy.
- Do not relax matching to make a result appear.
- **Do not use `getByTestId` in a new test**, even where it is easier.
- Do not paper over e2e flakiness with retries, longer timeouts, or `test.slow()`. A flaky test is a finding.
- Never silence a type error with `any`, `@ts-ignore`, or `@ts-expect-error`.

## 13. Forbidden actions

- **Fuzzy, transposition-invariant, shape or relaxed matching** — Loop 007, and it must be built against an eval harness rather than by feel
- Inferring hands from pitch clustering — see Section 15
- Ranking or scoring; a second piece; Web MIDI, audio, score rendering
- Editing `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`, `chordVoicings.test.ts`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `vercel.json`
- Editing `phrase-search.ts`, `scripts/`, or the committed `moonlight-sonata.ts` artifact
- Any npm dependency; a Tailwind build step; any persistence or storage
- Removing or using the nine pre-existing `data-testid` attributes
- `git push`, merging to `main`, rewriting history
- Writing anything in `/Users/b/dev/chordsense`

## 14. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–19 pass, evidence recorded |
| `NEEDS_ARCHITECTURE_DECISION` | success appears to require a dependency, persistence, or a merged-stream contract change |
| `NEEDS_HUMAN_DECISION` | a measured number is unreachable and you believe it wrong |
| `OUT_OF_SCOPE` | success appears to require fuzzy matching, hand inference, ranking, or a second piece |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report it.** Do not resume against an amended contract — a prior loop failed exactly that way. See `docs/learning/never-mutate-an-active-handoff.md`.

## 15. What this loop does not resolve — do not attempt it

Staff colouring remains a *transcription* fact shown to a user who thinks in *hands*. The toggle makes it opt-in and honestly labelled; it does not make it correct.

There is a plausible heuristic — hand-span clustering separates `{B1,B2}` from `{F#3,F#4}` at measure 13 beat 1, where both span exactly 12 semitones while any other grouping exceeds a hand's reach. **Do not build it here.** A wrong hand assignment is worse than none, because the user would trust it. It needs ground truth and an eval harness, and is future work.

## 16. Output requirements

Write `docs/sprints/output/014-onset-strips-output.md`:

- exactly one terminal state
- the four Section 11 decisions and the reasoning for each
- Task 0 archive path and `cmp` exit code
- every changed file and whether it was in scope
- all 19 checks with **actual output** — quote the real windows and counts for 8–13, not "as expected"
- **the vacuity-proof failure output, verbatim**, and confirmation it was reverted with a clean tree
- how the staff distinction avoids resting on colour alone
- the new e2e test names and what each covers
- the commit SHA
- repair attempts used, including zero
- stop rules triggered, if any
- out-of-scope pressure encountered — particularly any temptation toward fuzzy matching or hand inference
- risks and open questions

When `DONE`, the next recommended action must be "accept current loop as complete."
