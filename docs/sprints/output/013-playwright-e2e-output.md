# Sprint 13 Output: Playwright End-to-End Harness

**Terminal state: `DONE`**, with one flagged caveat (Check 7 — see below). Per an explicit human decision made mid-execution (see Section 0), this is reported as `DONE` rather than `NEEDS_HUMAN_DECISION`, because the check-7 failure predates this loop, is unrelated to any work performed here, and cannot be fixed without violating the loop's own "no changes to `src/`" prohibition.

**Next recommended action: accept current loop as complete.**

## 0. A discrepancy flagged before implementation

Before writing any suite code, `git diff HEAD -- src/` and `git log` on `src/components/phrase-lookup/PhraseLookupSurface.tsx` showed that file already carries 9 `data-testid` attributes, committed in prior loops, present at `HEAD` before this loop began. Check 7 (`grep -rn "data-testid" src/` returns nothing) can therefore never pass without editing `src/` — which the handoff separately forbids outside the two temporary vacuity-proof breakages.

This was surfaced to the human before any implementation work, per the handoff's own etiquette ("say so before implementing, not after"). The human's decision: proceed with the full suite, do not touch `src/` to work around it, and report Check 7 as a pre-existing failure unrelated to this loop's work. That is what follows.

## 1. Section 4 hazards — how each was resolved

| Hazard | Resolution | Why |
|---|---|---|
| `server.open: true` pops a browser | The suite serves the app via `vite preview` (`npm run build && npx vite preview …`), never `vite dev`. `open` lives under Vite's `server` options, which govern only the `dev` command — `preview` has its own separate `open` option, left unset. Confirmed empirically: no window popped across ~10 suite runs. | Chosen over `BROWSER=none` because it also verifies the actual production build, not the dev server. |
| Port 3000 pinned | The suite owns port `4173` (Vite's own default `preview` port), fully separate from the `3000` `vite.config.ts` pins for `dev`. `reuseExistingServer: false` means the suite always starts (and tears down) its own fresh instance rather than attaching to whatever a developer already has running. | Avoids colliding with, or silently testing against, a developer's already-running dev server. |
| Two runners | `vitest.config.ts` gained `exclude: [...configDefaults.exclude, 'e2e/**']`. Without it, vitest's default `*.spec.ts` glob picked up `e2e/phrase-lookup.spec.ts` and failed with "Playwright Test did not expect test.beforeEach() to be called here" — found on the first `npm test` run after the suite was written, fixed immediately. | `npm test` (vitest) and `npm run test:e2e` (playwright) must stay fully separate per Check 12; this was the one point where they collided. |
| Browser binaries | `npx playwright install chromium` documented as a one-time machine setup step in both `AGENTS.md` and `CLAUDE.md`, under a new "Browser verification" section, alongside a pointer to ADR 0004. | Not a repo change — every executor needs to run it once locally. |
| Singular/plural counts | No config change needed; the suite asserts the exact rendered strings (`"55 possible next notes highlighted"`, `"1 occurrence of …"`), which already exercises the singular/plural branches correctly since the app's own pluralisation logic produces them. | — |

One additional, unlisted wiring issue surfaced during Check 4 and was fixed as part of Task 2's config (see Section 9, repair attempts): `vite preview`'s default `localhost` bind resolved to the IPv6 loopback (`::1`) in this environment, while Playwright's `webServer.url`/`baseURL` used `http://127.0.0.1:4173`, so the readiness probe timed out. Fixed by passing `--host 127.0.0.1` to `vite preview` so the server and the probe target the same socket.

## 2. Task 0 — handoff archive

Copied `docs/agent-handoff.md` to `docs/prompts/sprint13-claude-code-playwright.md`.

`cmp -s docs/agent-handoff.md docs/prompts/sprint13-claude-code-playwright.md` → **exit code 0** (identical).

## 3. Every changed file, and whether it was in scope

| File | In scope? | Why |
|---|---|---|
| `package.json` | Yes (Task 1/2) | Adds `@playwright/test` devDependency and the `test:e2e` script — the only dependency change permitted. |
| `package-lock.json` | Yes | Mechanical side effect of `npm install --save-dev @playwright/test`. |
| `playwright.config.ts` (new) | Yes (Task 2) | Resolves Section 4 hazards; see Section 1 above. |
| `e2e/phrase-lookup.spec.ts` (new) | Yes (Task 3) | The suite itself; covers all 11 Section 5 items — see Section 7 mapping. |
| `vitest.config.ts` | Yes (hazard "Two runners") | Excludes `e2e/**` from vitest's default test glob so the two runners stay separate (Check 12). Not one of the Task 0–5 bullets verbatim, but required to satisfy the handoff's own runner-separation requirement once the suite existed. |
| `.gitignore` | Yes (Task 4) | Adds `test-results/`, `playwright-report/`, `blob-report/`, `.playwright/`. |
| `docs/prompts/sprint13-claude-code-playwright.md` (new) | Yes (Task 0) | Handoff archive. |
| `docs/sprints/output/013-playwright-e2e-output.md` (new) | Yes (Task 5) | This document. |
| `AGENTS.md`, `CLAUDE.md` | Yes (hazard "Browser binaries") | Added a short "Browser verification" section documenting `npx playwright install chromium` as a one-time machine step, per the hazard table's explicit instruction. Both files are kept as plain duplicates (not a symlink) in this repo, so both needed the addition; the section was appended after existing, unrelated pre-session edits to both files (a Tailwind-constraint section neither authored nor touched by this loop). |
| `src/components/phrase-lookup/PhraseKeyboard.tsx` | Temporary only | Touched once, reverted, for the Check-10 vacuity proof (Section 8). `git diff --stat -- src/` is empty at commit time. |

**Pre-existing, untouched by this loop** (already modified/untracked at session start, per the initial `git status`, and never opened or edited during this work): `docs/agent-handoff.md`, `docs/planning/loops/006-two-row-keyboard-input.md`, `docs/planning/product-loop-map.md`, `docs/adr/0004-playwright-e2e.md`, `docs/learning/`, `docs/planning/loops/011-group-wise-highlighting.md`, `docs/planning/loops/012-single-row-input.md`, `docs/planning/loops/013-playwright-e2e.md`, `docs/sprints/kickoff/*`, `docs/sprints/output/006-keyboard-input-output.md`, `docs/sprints/output/010-typescript-typechecking-output.md`, `docs/sprints/output/011-group-wise-highlighting-output.md`. These are left as found.

## 4. All 12 checks, with actual output

**Check 1 — `npm run typecheck` exits 0.**
```
> Chord Selector Application@0.1.0 typecheck
> tsc --noEmit
```
Exit 0, no diagnostics. **Pass.**

**Check 2 — `npm test` passes and launches no browser.**
```
 Test Files  7 passed (7)
      Tests  80 passed (80)
```
All pre-existing vitest suites pass; `e2e/` is excluded (see Section 1). **Pass.**

**Check 3 — `npm run build` succeeds.**
```
vite v6.3.5 building for production...
✓ 1697 modules transformed.
build/index.html                                    0.92 kB
build/assets/index-3E8VvgsS.css                    38.18 kB
build/assets/index-zPrsUKGk.js                    339.28 kB
✓ built in 772ms
```
**Pass.**

**Check 4 — `npm run test:e2e` passes headlessly.**
```
Running 11 tests using 5 workers

  ✓  the Phrase Lookup tab renders the keyboard surface
  ✓  the initial state highlights 55 possible next notes
  ✓  the initial state has exactly one key row and no row labels
  ✓  selecting F#3 narrows to 16 possible next notes and 43 containing onsets
  ✓  adding F#4 to the selection narrows to 8 possible next notes, 6 onsets, and shows [F#3+F#4]
  ✓  F#4 stays selectable across the staff boundary while F#3 is selected
  ✓  the founding query finds 1 occurrence of [F#3+F#4] → [C#4] → [E4] at Measure 12, beat 4
  ✓  E4 does not occur together with F#3 in the current selection
  ✓  undo removes the last committed group and updates the phrase
  ✓  clear all returns to 55 possible next notes and an empty phrase
  ✓  every key name matches "{pitch}, {state}" and none names a row

  11 passed (3.1s)
```
Every measured value from Section 5 — 55, 16/43, 8/6, 1 occurrence, Measure 12 beat 4 — matched on the first real run against the live app, with no test tuned to fit an observed number. **Pass.**

**Check 5 — dependency delta.**
```diff
 "devDependencies": {
+    "@playwright/test": "^1.62.1",
     ...
 "scripts": {
     "test:ui": "vitest --ui",
+    "test:e2e": "playwright test"
```
Exactly one dependency added, plus the `test:e2e` script. **Pass.**

**Check 6 — application source untouched.**
`git diff --stat -- src/` → empty, at commit time (after both vacuity-proof breakages were reverted). **Pass.**

**Check 7 — no test ids.**
```
$ grep -rn "data-testid" src/
src/components/phrase-lookup/PhraseLookupSurface.tsx:229:  data-testid="current-selection"
src/components/phrase-lookup/PhraseLookupSurface.tsx:235:  data-testid="containment-count"
src/components/phrase-lookup/PhraseLookupSurface.tsx:241:  data-testid="current-query"
src/components/phrase-lookup/PhraseLookupSurface.tsx:247:  data-testid="notice"
src/components/phrase-lookup/PhraseLookupSurface.tsx:253:  data-testid="results"
src/components/phrase-lookup/PhraseLookupSurface.tsx:255:  data-testid="empty-query-message"
src/components/phrase-lookup/PhraseLookupSurface.tsx:259:  data-testid="no-results-message"
src/components/phrase-lookup/PhraseLookupSurface.tsx:264:  data-testid="result-count"
src/components/phrase-lookup/PhraseLookupSurface.tsx:276:  data-testid="result-item"
```
**Fails literally**, but for reasons entirely outside this loop: all 9 attributes predate this loop (present at `HEAD` before any work started; confirmed via `git diff HEAD -- src/` returning empty and `git log` showing them introduced across Loops 006/011/012). None was added by this loop, and `e2e/phrase-lookup.spec.ts` uses none of them — every locator in the new suite is role- or text-based. Reported here rather than worked around, per the human decision recorded in Section 0.

**Check 8 — no fixed sleeps.**
```
$ grep -rn "waitForTimeout\|setTimeout" e2e/
(no output, exit 1)
```
**Pass.**

**Check 9 — stability, three consecutive runs.** See Section 6. **Pass.**

**Check 10 — vacuity proof.** See Section 8. **Pass.**

**Check 11 — coverage mapping.** See Section 7. **Pass.**

**Check 12 — runner separation.**
`"test": "vitest run"` does not invoke Playwright; `"test:e2e": "playwright test"` does not invoke vitest. Confirmed by running each independently (Checks 2 and 4 above) — `npm test` never launched a browser, `npm run test:e2e` never ran a vitest test file. **Pass.**

## 5. Repair attempts used: 2 (within the allowed 2)

1. **Runner collision.** First `npm test` run after writing `e2e/phrase-lookup.spec.ts` failed — vitest's default glob picked up the Playwright spec file and errored on `test.beforeEach`. Fixed by excluding `e2e/**` in `vitest.config.ts` (Section 1).
2. **`webServer` readiness timeout.** First `npm run test:e2e` run timed out after 120s waiting for `http://127.0.0.1:4173`. Root cause: `vite preview`'s default `localhost` bind resolved to the IPv6 loopback in this environment, not `127.0.0.1`. Fixed by adding `--host 127.0.0.1` to the preview command in `playwright.config.ts` (Section 1), confirmed manually with `curl` before rerunning the suite.

Neither repair touched `src/`, adjusted an asserted number, or added a dependency.

## 6. Three consecutive `npm run test:e2e` runs

All three ran back-to-back with no changes between them, immediately after the port-binding fix:

- **Run 1:** 11 passed (3.1s)
- **Run 2:** 11 passed (3.1s)
- **Run 3:** 11 passed (3.1s)

No flake observed.

## 7. Section 5 → test name coverage mapping

| # | Scenario | Test name |
|---|---|---|
| 1 | Phrase Lookup tab renders the keyboard | `the Phrase Lookup tab renders the keyboard surface` |
| 2 | Initial state: 55 possible next notes | `the initial state highlights 55 possible next notes` |
| 3 | Initial state: one key row, no row text | `the initial state has exactly one key row and no row labels` |
| 4 | Select F#3 → 16/43 | `selecting F#3 narrows to 16 possible next notes and 43 containing onsets` |
| 5 | Also select F#4 → 8/6, [F#3+F#4] | `adding F#4 to the selection narrows to 8 possible next notes, 6 onsets, and shows [F#3+F#4]` |
| 6 | Cross-staff: F#4 selectable | `F#4 stays selectable across the staff boundary while F#3 is selected` |
| 7 | Founding query | `the founding query finds 1 occurrence of [F#3+F#4] → [C#4] → [E4] at Measure 12, beat 4` |
| 8 | Co-occurrence block on E4 | `E4 does not occur together with F#3 in the current selection` |
| 9 | Undo | `undo removes the last committed group and updates the phrase` |
| 10 | Clear | `clear all returns to 55 possible next notes and an empty phrase` |
| 11 | Naming, no row reference | `every key name matches "{pitch}, {state}" and none names a row` |

## 8. Vacuity proof (Check 10) — verbatim failure output, both reverted

**Breakage 1 — accessible name.** In `src/components/phrase-lookup/PhraseKeyboard.tsx`, changed `'available next'` to `'ready to play'`. Ran `npm run test:e2e`:

```
✘  11 [chromium] › e2e/phrase-lookup.spec.ts:146:5 › every key name matches "{pitch}, {state}" and none names a row (211ms)
✘   6 [chromium] › e2e/phrase-lookup.spec.ts:80:5 › F#4 stays selectable across the staff boundary while F#3 is selected (5.5s)

  1) [chromium] › e2e/phrase-lookup.spec.ts:80:5 › F#4 stays selectable across the staff boundary while F#3 is selected

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: 'F#4, available next' })
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

      81 |   await keyByPitch(page, 'F#3').click();
      82 |
    > 83 |   await expect(page.getByRole('button', { name: 'F#4, available next' })).toBeVisible();
         |                                                                           ^

  2) [chromium] › e2e/phrase-lookup.spec.ts:146:5 › every key name matches "{pitch}, {state}" and none names a row

    Error: expect(received).toMatch(expected)

    Expected pattern: /^[A-G]#?-?\d+, (entered|available next|not available next|does not occur together with the current selection)$/
    Received string:  "F1, ready to play"

      156 |
      157 |   for (const name of names) {
    > 158 |     expect(name).toMatch(validState);
          |                  ^

  2 failed
  9 passed (8.1s)
```

Reverted `PhraseKeyboard.tsx` to `'available next'`. Confirmed with `git status --short src/` and `git diff --stat src/` — both empty.

**Breakage 2 — asserted number.** In `e2e/phrase-lookup.spec.ts`, changed the expected count in the F#3 test from `'16 possible next notes highlighted'` to `'17 possible next notes highlighted'`. Ran `npm run test:e2e`:

```
✘   3 [chromium] › e2e/phrase-lookup.spec.ts:54:5 › selecting F#3 narrows to 16 possible next notes and 43 containing onsets (5.4s)

  1) [chromium] › e2e/phrase-lookup.spec.ts:54:5 › selecting F#3 narrows to 16 possible next notes and 43 containing onsets

    Error: expect(locator).toBeVisible() failed

    Locator: getByText('17 possible next notes highlighted')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

      57 |   await keyByPitch(page, 'F#3').click();
      58 |
    > 59 |   await expect(page.getByText('17 possible next notes highlighted')).toBeVisible();
         |                                                                      ^

  1 failed
  10 passed (7.7s)
```

Reverted the assertion to `'16 possible next notes highlighted'`. Confirmed with `git diff --stat -- src/ e2e/` — empty. A follow-up `npm run test:e2e` run showed 11/11 passing again.

## 9. Commit

Single commit, made after all checks above (including the reverted vacuity-proof breakages) were verified clean.

**Commit SHA: `cc01bc1`** (branch `phrase-lookup`). Note: a commit that records its own hash inside its own tree cannot be exactly self-consistent — each edit to this line changes the tree, which changes the hash. This is the final value after the last such edit; confirm with `git log --oneline -1` if it must match exactly.

## 10. Stop rules triggered

None of the terminal-state stop rules in Section 12 of the handoff were triggered by this loop's own work. The one deviation from a literal `DONE` — Check 7 — was raised and resolved as a human decision *before* implementation (Section 0), not as a stop condition hit during execution.

## 11. Out-of-scope pressure encountered

- **Temptation to remove the 9 pre-existing `data-testid` attributes** from `PhraseLookupSurface.tsx` to make Check 7 pass cleanly. Not done — forbidden by the handoff's "any change to `src/`" rule outside the two temporary breakages, and by Check 6.
- **Temptation to loosen the e2e suite's locators** to also match on those existing test ids, as a hedge in case role/text locators proved brittle. Not done — the suite uses role and text locators exclusively, matching the handoff's accessibility-first requirement in spirit even though the raw `grep` in Check 7 still finds pre-existing matches elsewhere.
- No other pressure to touch `src/`, add a test id, add a second dependency, or reach for onset strips / the staff toggle / fuzzy matching (all explicitly out of scope) arose during this loop.

## 12. Risks and open questions

- **Check 7 is structurally unfixable within this loop's constraints.** Resolving it for real requires either an explicit decision to allow removing the pre-existing test ids from `src/` (a small, separate, reviewable change) or a redefinition of Check 7 to mean "no *new* test ids added" rather than "zero test ids anywhere." Recommend the human make that call explicitly in a future loop rather than leaving Check 7 permanently red.
- **`webServer.reuseExistingServer: false` means every `npm run test:e2e` invocation runs a full `npm run build` first.** Current build is fast (~0.8s) so this is unnoticeable now; if the app grows substantially, consider whether the suite should instead build once and reuse a preview server across a CI job — no action needed today.
- **The suite is intentionally corpus-specific** (ADR 0004): every asserted number is tied to the committed Moonlight Sonata artifact. Regenerating that artifact or ingesting a second piece will require updating these tests, which is correct behavior, not a defect — flagging so it isn't mistaken for flakiness later.


---

# Macro-layer amendment — 2026-08-03

**Accepted as `DONE`. Check 7 is withdrawn — it was a macro-layer spec error, not a failure of this work.**

## Check 7 tested a proxy, not the property

The property wanted: *the e2e suite selects by accessible name, so it cannot pass while accessible names rot.*
The check written: `grep -rn "data-testid" src/` returns nothing.

Those are not the same thing, and the gap is the whole error. Independently confirmed:

- the nine attributes **predate this loop** — `git grep -c data-testid e70ebba -- src/` returns 9, committed across Loops 006/011/012 when no prohibition existed
- `src/components/phrase-lookup/PhraseKeyboard.tsx` — the component whose names are the selectors — carries **zero**
- the suite uses **17** `getByRole`, **15** `getByText`, **0** `getByTestId`, and **0** CSS locators

**The property held perfectly.** The correct check was always `grep -rn "getByTestId" e2e/` returns nothing, and by that measure this loop passes cleanly.

Recorded in `docs/learning/specify-the-property-not-the-proxy.md`, alongside the same error in Loop 010's check 6b.

## What the executor did right

Detected the conflict **before implementing**, surfaced it, obtained a human decision, and reported the literal failure rather than editing `src/` to make a grep pass. That is the cheapest possible moment to catch a bad check, and the alternative — quietly deleting nine attributes to satisfy a grep — would have been a silent scope violation.

## Independently verified by the macro layer

- `src/` untouched at commit time; both vacuity-proof breakages reverted, tree clean
- exactly one dependency added, `@playwright/test`, plus the `test:e2e` script
- no `waitForTimeout` or `setTimeout` anywhere in `e2e/`
- 11 tests, one per Section 5 scenario, names matching the mapping
- every asserted value matches figures measured from the artifact and confirmed live during the Loop 012 review: 55, 16, 43, 8, 6, `1 occurrence of [F#3+F#4] → [C#4] → [E4]`, `Measure 12, beat 4`
- the vacuity proof is genuine — two tests failed for the right reasons with real output, including the regex assertion rejecting `"F1, ready to play"`
- three consecutive runs, 11 passed, 3.1s each

`npm run test:e2e` itself was **not** run by the macro layer: Playwright ships platform-native browser binaries, so a Linux sandbox cannot execute what is installed on the developer's Mac — the same constraint as TypeScript 7.

## Config decisions worth keeping

Port **4173** rather than 3000, so the suite never collides with a running dev server. `vite preview` against a real build rather than `vite dev`, which sidesteps `server.open: true` popping a browser *and* means the suite verifies the built artifact. `reuseExistingServer: false` for a guaranteed-fresh instance. `retries: 0`, with a comment recording why: a flaky test is a finding, not something to absorb.
