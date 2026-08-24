# Chordsense — standing context for any coding agent

Chordsense finds every occurrence of a remembered note phrase in a piece and shows what follows it. It is a reverse index over score data, not a practice app, notation editor, or playback engine.

Work arrives as a bounded loop. The active execution contract is `docs/agent-handoff.md`; the loop's intent lives in `docs/planning/loops/`. Read the handoff — do not infer scope from this file.

## Frozen contracts

Do not change these without an ADR in `docs/adr/`:

- Notes are MIDI integers internally, `C4 = 60`. Sharp spelling in the UI.
- The canonical event shape is `{ measure: number; beat: number; hand: 'left' | 'right'; notes: number[] }`.
- A note group is a deduplicated, order-independent set at one onset. Groups match in order, contiguously, with exact group equality and exact register.
- Search code stays pure TypeScript: no React, DOM, network, or filesystem dependency.
- No new npm dependency without an explicit decision recorded in the handoff.
- Fixture data is labelled as fixture data and is never asserted as score fact.

## Verification etiquette

Never substitute code inspection for a required check. If a check cannot be run, report it as `not run` with the reason — do not reason about what it would have shown.

If a handoff's verifier requires a capability your environment may not have — a browser, network access, hardware — say so **before** implementing, not after. Loop 001 finished its implementation and passed every automated check, then stranded at `BLOCKED` because the session had no browser backend for one interaction step. A verifier that can strand a finished loop should be flagged early or marked human-verified.


## Styling constraint — there is no Tailwind build step

Discovered in Loop 006 and verified: this project has **no `tailwindcss` dependency and no PostCSS or Tailwind config.** `src/index.css` is a 1,783-line **pre-compiled** Tailwind v4 artifact (`/*! tailwindcss v4.1.3 */`).

**A utility class that is not already compiled into `src/index.css` does nothing.** It will not error, it will not warn — the element simply renders unstyled.

When building UI:

- prefer utilities you have confirmed exist in `src/index.css`
- otherwise hand-author rules in `src/styles/globals.css`, with a comment saying why
- pseudo-classes such as `:focus-visible` cannot be expressed as inline styles and must be hand-authored
- do not add a Tailwind build step without an explicit decision

## Browser verification — `npm run test:e2e`

Loop 013 added a headless Playwright suite (`e2e/`) as the browser verifier, replacing "drive a browser by hand" in loop specs. It builds the app and serves it via `vite preview`, so it never pops a real browser window and never depends on which agent happens to have one attached.

One machine setup step is required once per environment and is **not** part of the repo: `npx playwright install chromium`. Without it, `npm run test:e2e` fails to launch the browser. See `docs/adr/0004-playwright-e2e.md`.
