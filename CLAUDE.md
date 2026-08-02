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
