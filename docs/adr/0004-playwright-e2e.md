# ADR 0004: Adopt Playwright for browser verification

Status: **Accepted**
Date: 2026-08-03
Decided by: the human, on a proposal to automate Loop 012's browser checks

## Context

Every UI loop since 006 has ended with checks that require a browser and a running dev server. Those checks have been the weakest link in an otherwise disciplined verification chain:

- **Loop 001** finished its implementation, passed every automated check, then ended at `BLOCKED` because its session had no browser backend. The loop was correct and could not say so.
- **Loop 010** ended at `FAILED_VERIFICATION` with checks 14–15 marked `not run`, for the same reason.
- **Loop 012's** browser checks were initially unverifiable by the macro layer — four failed tab switches, an internal error, a screenshot deserialisation failure. On retry they passed, and the cause turned out to be a one-render lag rather than a fault. Roughly twenty tool calls to verify five checks.

The pattern: the checks that exercise the actual product are the ones least reliably run, and they depend on which agent happened to draw a browser.

## Decision

**Adopt Playwright as the end-to-end verifier.** Add `@playwright/test` as a devDependency, an `e2e/` suite, and a `test:e2e` script. Browser checks in future loop specs become "run `npm run test:e2e`" rather than "drive a browser."

`@playwright/test` is the only package added. The standing "no new dependencies without an explicit decision" contract is otherwise unchanged.

## Why this is worth a dependency

**It removes the `BLOCKED`-on-browser failure mode.** Any executor can run a headless Playwright suite. The verification no longer depends on which agent has a browser attached, which has stranded two loops.

**The suite doubles as the accessibility regression test — and this is the strongest reason.** The phrase keyboard exposes accessible names of the form `"F#3, available next"`. Playwright's `getByRole('button', { name: ... })` selects on exactly those names. So the e2e tests can only pass if the accessible names remain correct and complete.

Accessibility has been protected by hand in every loop since 001 — Loop 006's check 16, Loop 011's check 12, Loop 012's check 14 — each verified manually by the macro layer driving the accessibility tree. Playwright makes that property continuously enforced rather than periodically inspected. Breaking an accessible name becomes a failing test rather than a thing someone might notice.

**It makes verification cheap enough to repeat.** Manual browser verification costs enough that it happens once, at review. A scripted suite runs on every loop, catching regressions in features nobody is currently editing.

## Consequences

- Two test runners: **vitest for unit, Playwright for e2e**. They must stay separate — `npm test` must not start a browser, and `npm run test:e2e` must not run the unit suite.
- Playwright browser binaries are a machine setup step (`npx playwright install chromium`), not a repository change. Executors and CI need it.
- `vite.config.ts` sets `server.open: true`, which pops a real browser window on start. A Playwright `webServer` must not inherit that behaviour.
- E2E assertions are written against the ingested Moonlight Sonata artifact. They are corpus-specific by design, and a second piece or a regenerated artifact would require updating them. That is correct — they are regression tests for known-good values.
- Future loop specs stop carrying "if you have no browser, mark these `not run` and end at `BLOCKED`." That instruction has appeared in six consecutive handoffs and can be retired once this lands.

## The risk that matters

**A flaky e2e suite is worse than no e2e suite**, because it trains executors to retry or ignore failures — exactly the habit these loops exist to prevent.

The macro layer hit real flakiness while verifying Loop 012 by hand: clicks registering a render late, producing page text that looked like a failure and was not. Playwright's auto-waiting and web-first assertions handle this correctly *if used*, and defeat it entirely if the suite is written with fixed sleeps.

Loop 013 therefore forbids `waitForTimeout` and requires web-first assertions throughout, and requires the executor to demonstrate the suite actually fails when the thing it tests is broken.

## What this does not change

Playwright verifies behaviour through the UI. It says nothing about the correctness of the underlying music data — the parse, the merged stream, the continuation counts. Those remain unit-tested and macro-verified against independent computation, which is where the real defects have been found. This is a verification-delivery improvement, not a new source of truth.
