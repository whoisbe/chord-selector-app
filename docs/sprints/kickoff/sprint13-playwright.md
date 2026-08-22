# Agent Handoff: Playwright End-to-End Harness

**Assigned agent: Claude Code**
**Model: Sonnet 5 (`claude-sonnet-5`)**
Loop spec: `docs/planning/loops/013-playwright-e2e.md`
Decision record: `docs/adr/0004-playwright-e2e.md`
Sprint: 13
Prepared: 2026-08-03
Sprint output: `docs/sprints/output/013-playwright-e2e-output.md`

Self-contained. Execute from this document alone. Do not rely on prior conversation.

Repository: `/Users/b/dev/chord-selector-app`, branch `phrase-lookup`. **Do not push. Do not merge to `main`.**

## 1. Why

Browser checks have been the weakest link in this project's verification. Loop 001 finished correct work and ended at `BLOCKED` because its session had no browser. Loop 010's checks 14–15 never ran, for the same reason. Loop 012's took roughly twenty macro-layer tool calls and produced an initial *false* failure — clicks were registering one render late and the page text read stale.

## 2. Goal

> From "browser checks depend on which agent happened to draw a browser, and cost enough to run once" to "`npm run test:e2e` verifies the phrase-lookup surface headlessly, on any machine, on every loop."

## 3. The property that makes this valuable — do not undermine it

The phrase keyboard exposes accessible names of the form `"{pitch}, {state}"`. Playwright's `getByRole('button', { name: ... })` selects on exactly those. **The suite therefore cannot pass unless the accessible names stay correct**, converting a property protected by hand in Loops 006, 011 and 012 into one enforced continuously.

**Write the suite accessibility-first. Do not add `data-testid` anywhere in `src/`.** A test id would let the suite pass while the accessible name rotted, which destroys the main benefit and is checked for explicitly.

The four states, exactly as the app emits them:

```
"F#3, entered"
"F#3, available next"
"F#3, not available next"                                    ← blocked by the sequence constraint
"F#3, does not occur together with the current selection"    ← blocked by co-occurrence
```

## 4. Hazards, already diagnosed — don't burn a repair attempt

| Hazard | Detail |
|---|---|
| `server.open: true` in `vite.config.ts` | starting the dev server **pops a real browser window**. A Playwright `webServer` must not inherit this. `BROWSER=none`, a preview build, or an explicit override all work — pick one and say which. |
| Port 3000 pinned | `vite.config.ts` sets it. A developer's dev server may already hold it. Decide whether the suite reuses an existing server or owns its own port, and say why. |
| Two runners | `npm test` is `vitest run`. **`npm test` must not launch a browser; `test:e2e` must not run the unit suite.** |
| Browser binaries | `npx playwright install chromium` is a machine setup step, not a repo change. Document it in `CLAUDE.md`/`AGENTS.md`. |
| Singular/plural | the count text is `"55 possible next notes highlighted"` but `"1 possible next note highlighted"`. Assert accordingly. |

## 5. What the suite must cover

Every value below was measured from the committed artifact **and confirmed live in the running app**. Use as assertions.

| # | Scenario | Assert |
|---|---|---|
| 1 | Phrase Lookup tab | the keyboard surface renders |
| 2 | Initial state | `55 possible next notes highlighted` |
| 3 | Initial state | exactly one key row; **no "Upper row" or "Lower row" text anywhere** |
| 4 | Select `F#3` | `16 possible next notes`, and `43 onsets in the piece contain the current selection` |
| 5 | Also select `F#4` | `8 possible next notes`, `6 onsets…`, current group reads `[F#3+F#4]` |
| 6 | Cross-staff octave | `F#4` is selectable while `F#3` is selected — assert via accessible name, never position |
| 7 | **Founding query** | `F#3`, `F#4`, Add group, `C#4`, Add group, `E4`, Add group → **`1 occurrence of [F#3+F#4] → [C#4] → [E4]`** and **`Measure 12, beat 4`** |
| 8 | Co-occurrence block | with `F#3` selected, `E4` carries the name `does not occur together with the current selection` |
| 9 | Undo | removes the last committed group; results update |
| 10 | Clear | returns to `55 possible next notes` and an empty phrase |
| 11 | Naming | key names match `"{pitch}, {state}"` and **no name contains a row reference** |

Control names as the app emits them: `Add group`, `Undo last group`, `Clear all`, `Search`, and the tab `Phrase Lookup`.

## 6. Anti-flake requirements

Not style preferences. The macro layer hit exactly this failure mode verifying Loop 012 by hand.

- **No `page.waitForTimeout`, no fixed sleeps, no arbitrary retries.** Use web-first assertions — `await expect(locator).toHaveText(...)` — which auto-retry.
- Select by role and accessible name. No CSS or XPath selectors into the keyboard. No coordinate clicking.
- The suite must pass **three consecutive runs** with no changes between them.
- **Do not paper over flakiness** with longer timeouts, `test.retry`, or `test.slow()`. A flaky test is a finding to report.

## 7. Prove the suite is not vacuous

A passing test that would also pass when broken is worse than no test. This project has been bitten twice by checks that passed honestly while missing what mattered.

**Break two things the suite claims to test, one at a time:**

1. change one accessible name in `src/components/phrase-lookup/PhraseKeyboard.tsx`
2. change one asserted number in the suite

For each: run the suite, **capture the failure output verbatim**, then revert. Include both failure outputs in the sprint output, and confirm `git status` is clean afterwards.

## 8. Tasks

**Task 0.** Copy `docs/agent-handoff.md` verbatim to `docs/prompts/sprint13-claude-code-playwright.md`. Verify with `cmp -s`, record the exit code.

**Task 1.** `npm install --save-dev @playwright/test`, then `npx playwright install chromium`. **This is the only dependency added.**

**Task 2.** Add `playwright.config.ts`, resolving the Section 4 hazards. Add a `test:e2e` script.

**Task 3.** Write `e2e/` covering all eleven Section 5 items.

**Task 4.** Ignore Playwright artefacts in `.gitignore` (`test-results/`, `playwright-report/`, `blob-report/`, `.playwright/`).

**Task 5.** Run the Section 9 checks including the vacuity proof, write the output, commit once.

## 9. Verification requirements

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 |
| 2 | `npm test` | existing suite passes and **does not launch a browser** |
| 3 | `npm run build` | succeeds |
| 4 | `npm run test:e2e` | all specs pass headlessly |
| 5 | Dependency delta | `git diff package.json` shows exactly one addition — `@playwright/test` — plus the `test:e2e` script |
| 6 | **Application source untouched** | `git diff --stat` shows no change under `src/` at commit time |
| 7 | No test ids | `grep -rn "data-testid" src/` returns nothing |
| 8 | No fixed sleeps | `grep -rn "waitForTimeout\|setTimeout" e2e/` returns nothing |
| 9 | Stability | three consecutive `npm run test:e2e` runs, all green |
| 10 | **Vacuity proof** | two deliberate breakages, failure output captured for each, both reverted, `git status` clean |
| 11 | Coverage mapping | every Section 5 item maps to a named test; list the mapping |
| 12 | Runner separation | `npm test` and `npm run test:e2e` do not invoke each other |

Check 10 matters most. Check 6 is the boundary that keeps this a verification loop rather than a refactor.

## 10. Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not adjust an asserted number to make a test pass.** These values are measured and independently confirmed. A mismatch means the app changed or the test is wrong. If you believe a number is wrong, stop at `NEEDS_HUMAN_DECISION` with the discrepancy.
- **Do not modify `src/` to make a test easier to write.** Report the obstacle instead.
- Do not add a dependency beyond `@playwright/test`.
- Never silence a type error with `any` or an ignore comment.

## 11. Forbidden actions

- **Any change to `src/`** other than the two temporary, reverted breakages in Section 7
- Adding `data-testid` anywhere
- Any dependency other than `@playwright/test`
- Onset strips or the staff toggle (Loop 014); fuzzy or shape matching (Loop 007)
- CI configuration or workflow files
- Visual or screenshot-diff regression testing — too brittle for a first suite
- Editing `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`, `phrase-search.ts`, `scripts/`, or the committed artifact
- Adding a Tailwind build step
- `git push`, merging to `main`, rewriting history
- Writing anything in `/Users/b/dev/chordsense`

## 12. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–12 pass, evidence recorded |
| `NEEDS_HUMAN_DECISION` | a test cannot be written without changing `src/`; or an asserted number is unreachable and you believe it wrong |
| `NEEDS_ARCHITECTURE_DECISION` | a working suite appears to need a second dependency or a Vite config change beyond server startup |
| `OUT_OF_SCOPE` | success appears to require strips, the toggle, CI config, or visual diffing |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |
| `BLOCKED` | Playwright browser binaries cannot be installed |

**If this handoff appears to change while you are executing, stop and report it.** See `docs/learning/never-mutate-an-active-handoff.md`.

## 13. Output requirements

Write `docs/sprints/output/013-playwright-e2e-output.md`:

- exactly one terminal state
- how each Section 4 hazard was resolved, and why
- Task 0 archive path and `cmp` exit code
- every changed file and whether it was in scope
- all 12 checks with **actual output**
- **the two vacuity-proof failure outputs, verbatim**, and confirmation both were reverted
- the Section 11 coverage mapping — each scenario to its test name
- the three consecutive-run results
- the commit SHA
- repair attempts used, including zero
- stop rules triggered, if any
- out-of-scope pressure encountered — particularly any temptation to touch `src/` or add a test id
- risks and open questions

Also record: with this landed, future loop specs can stop carrying *"if you have no browser, mark these `not run` and end at `BLOCKED`."* That line has appeared in six consecutive handoffs.

When `DONE`, the next recommended action must be "accept current loop as complete."
