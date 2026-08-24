# Loop Spec 013: Playwright End-to-End Harness

Loop type: **Governance**
Status: engineered, awaiting executor assignment
Executor: **Claude Code** (Sonnet 5)
Depends on: Loop 012 DONE
Blocks: nothing, but should land before Loop 014 (results as onset strips), whose verification is otherwise six more manual browser checks

> Renumbering note: the onset-strips work discussed as "013" becomes **Loop 014**. This harness comes first so 014 inherits scripted verification instead of manual.

## Trigger

ADR 0004. Browser checks have been the weakest link in the verification chain — Loop 001 stranded at `BLOCKED` with correct work, Loop 010's checks 14–15 never ran, and Loop 012's took roughly twenty macro-layer tool calls and an initial false failure.

## Goal

From **"browser checks depend on which agent happened to draw a browser, and cost enough to run once"** to **"`npm run test:e2e` verifies the phrase-lookup surface headlessly, on any machine, on every loop."**

## The property that makes this valuable

The phrase keyboard exposes accessible names of the form `"{pitch}, {state}"`. Playwright selects on exactly those names via `getByRole`. **The suite therefore cannot pass unless the accessible names remain correct**, which converts a property protected by hand in Loops 006, 011 and 012 into one enforced continuously.

Write the suite accessibility-first for this reason. **Do not add `data-testid` attributes to the phrase-lookup surface** — a test id would let the suite pass while the accessible name rotted, destroying the main benefit.

## Known environment hazards — do not rediscover these

| Hazard | Detail |
|---|---|
| `server.open: true` in `vite.config.ts` | starting the dev server pops a real browser window. A Playwright `webServer` must not inherit this. Resolve it however you prefer — `BROWSER=none`, a preview build, an explicit override — and say which. |
| Port 3000 | `vite.config.ts` pins it. A developer's dev server may already hold it. Decide whether the suite reuses an existing server or owns its own port, and say why. |
| Two runners | `npm test` is `vitest run`. **`npm test` must not start a browser, and `test:e2e` must not run the unit suite.** |
| Browser binaries | `npx playwright install chromium` is a machine step, not a repo change. Document it. |
| No Tailwind build step | irrelevant here — no UI changes in this loop — but do not add any. |

## Scope

In scope: `package.json` (add `@playwright/test`, add a `test:e2e` script — **no other dependency**), `playwright.config.ts`, `e2e/**`, `.gitignore` for Playwright artefacts, `README` or `CLAUDE.md`/`AGENTS.md` for the browser-install step, plus prompt archive and sprint output.

Explicitly out of scope:

- **Any change to application source.** `src/**` is untouched. If a test cannot be written without changing the app, that is a finding to report, not a licence — stop at `NEEDS_HUMAN_DECISION`.
- Onset strips, the staff toggle (Loop 014); fuzzy or shape matching (Loop 007)
- CI configuration or workflow files
- Visual/screenshot-diff regression testing — too brittle for a first suite
- Any dependency other than `@playwright/test`
- `git push`, merging to `main`

## What the suite must cover

All values below are measured from the committed artifact at `HEAD` and verified live in the running app. Use them as assertions.

**Navigation**
1. The Phrase Lookup tab renders the keyboard surface.

**Initial state**
2. `55 possible next notes highlighted`.
3. Exactly **one** key row — no "Upper row" or "Lower row" text anywhere.

**Selection and convergence**
4. Select `F#3` → `16 possible next notes`, and `43 onsets in the piece contain the current selection`.
5. Additionally select `F#4` → `8 possible next notes`, `6 onsets`, and current group reads `[F#3+F#4]`.
6. `F#4` is selectable while `F#3` is selected — the cross-staff octave. Assert on the accessible name, not on position.

**The founding query**
7. `F#3`, `F#4`, Add group, `C#4`, Add group, `E4`, Add group → **`1 occurrence of [F#3+F#4] → [C#4] → [E4]`** and **`Measure 12, beat 4`**.

**Constraint behaviour**
8. With `F#3` selected, a pitch that does not co-occur with it — for example `E4` — carries the accessible name `does not occur together with the current selection`.

**Reset behaviour**
9. Undo removes the last committed group and the result set updates.
10. Clear returns the surface to `55 possible next notes` and an empty phrase.

**Accessible naming**
11. Keys are named `"{pitch}, {state}"` and **no name contains a row reference.**

## Anti-flake requirements

These are not style preferences. The macro layer hit exactly this failure mode verifying Loop 012 by hand.

- **No `page.waitForTimeout`, no fixed sleeps, no arbitrary retries.** Use web-first assertions (`await expect(locator).toHaveText(...)`) which auto-retry.
- Select by role and accessible name. No CSS/XPath selectors into the keyboard, no coordinate clicking.
- The suite must pass **three consecutive runs** with no code changes between them.

## Prove the suite is not vacuous

A passing test that would also pass when broken is worse than no test.

**Temporarily break something the suite claims to test** — change one accessible name in `PhraseKeyboard.tsx`, or change one asserted count — run the suite, **capture the failure output**, then revert. Include the failure output in the sprint output and confirm `git status` is clean afterwards.

Do this for at least two distinct assertions: one accessible-name assertion and one numeric assertion.

## Verifier

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run typecheck` | exits 0 |
| 2 | `npm test` | the existing suite passes and **does not launch a browser** |
| 3 | `npm run build` | succeeds |
| 4 | `npm run test:e2e` | all e2e specs pass headlessly |
| 5 | Dependency delta | `git diff package.json` shows exactly one addition, `@playwright/test`, plus the `test:e2e` script |
| 6 | Application source untouched | `git diff --stat HEAD~1 -- src/` is empty at commit time |
| 7 | No test ids | `grep -rn "data-testid" src/` returns nothing |
| 8 | No fixed sleeps | `grep -rn "waitForTimeout\|setTimeout" e2e/` returns nothing |
| 9 | Stability | three consecutive `npm run test:e2e` runs, all green |
| 10 | **Vacuity proof** | two deliberate breakages, their failure output captured, both reverted, `git status` clean |
| 11 | Coverage | every numbered item in "What the suite must cover" maps to a named test; list the mapping |
| 12 | Runner separation | `npm test` and `npm run test:e2e` do not invoke each other |

Check 10 is the one that matters most. Check 6 guards the boundary that makes this a verification loop rather than a refactor.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Do not adjust an asserted number to make a test pass.** These values are measured and independently confirmed. A mismatch means the app changed or the test is wrong — investigate, and if you believe a number is wrong, stop at `NEEDS_HUMAN_DECISION` with the discrepancy.
- **Do not modify `src/` to make a test easier to write.** Report the obstacle instead.
- Do not add a dependency beyond `@playwright/test`.
- Do not paper over flakiness with retries, longer timeouts, or `test.slow()`. A flaky test is a finding.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–12 pass, evidence recorded |
| `NEEDS_HUMAN_DECISION` | a test cannot be written without changing `src/`; or an asserted number is unreachable and you believe it wrong |
| `NEEDS_ARCHITECTURE_DECISION` | a working suite appears to need a second dependency or a change to the Vite config beyond server startup |
| `OUT_OF_SCOPE` | success appears to require strips, the staff toggle, CI config, or visual diffing |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |
| `BLOCKED` | Playwright browser binaries cannot be installed |

**If this handoff appears to change while you are executing, stop and report it.** See `docs/learning/never-mutate-an-active-handoff.md`.

## Consequence to record

Once this lands, loop specs stop carrying *"if you have no browser, mark these `not run` and end at `BLOCKED`."* That instruction has appeared in six consecutive handoffs. Loop 014's browser checks become `npm run test:e2e` plus whatever genuinely new behaviour it adds.

Note also what this does **not** cover: Playwright verifies behaviour through the UI and says nothing about the correctness of the music data — the parse, the merged stream, the continuation counts. Every real defect this project has produced was in that layer, found by unit tests and by macro-layer computation against the artifact. This improves verification delivery, not verification depth.
