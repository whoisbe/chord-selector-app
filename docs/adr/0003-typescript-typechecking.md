# ADR 0003: Adopt TypeScript typechecking

Status: **Accepted**
Date: 2026-08-02
Decided by: the human, on a recommendation raised by Loops 004 and 009

## Context

`chord-selector-app` is written in TypeScript and **has never been typechecked.**

- `typescript` is not a declared dependency.
- There is **no `tsconfig.json` in the repository at all.**
- `npm run build` is `vite build`, and esbuild strips types without checking them.
- `npm test` is `vitest run`, which likewise transpiles without checking.

So the project compiles and ships, and no tool has ever verified a single type.

This was raised as a recommendation twice — by Loop 004 and again by Loop 009 — and deliberately not acted on, because adding a dependency required an explicit decision under the standing "no new dependencies" contract.

The concrete motivation came from Loop 001, in the previous repository. `next build` typechecked there, and it caught an ES5 spread-iteration error that consumed that loop's one repair attempt. When the project moved to Vite in Loop 008, that safety net silently disappeared. Nothing announced it.

## Decision

**Adopt TypeScript typechecking.** Add `typescript` as a devDependency, add a `tsconfig.json`, and add a `typecheck` script. Configure with **`strict: true`**.

`@types/node`, `@types/react`, and `@types/react-dom` are already declared, so **`typescript` is the only package added.**

## Evidence gathered before deciding

A macro-layer spike installed TypeScript in a throwaway clone, wrote a standard Vite `tsconfig.json`, and measured the actual blast radius rather than guessing at it.

**11 errors at current head under `strict: true`** (9 under `strict: false`):

| Class | Count | Nature |
|---|---|---|
| TS2307 — unresolved module | 7 | Figma-export artifacts: imports carry version suffixes, e.g. `from 'lucide-react@0.487.0'`. Mechanical. |
| TS2307 — unresolved module | 1 | `musicxmlIngestion.test.ts` importing `scripts/ingest-musicxml.mjs`, which sits outside `src`. A config question. |
| TS7031 — implicit any | 2 | `ui/calendar.tsx`, an unused component. The two errors `strict` adds. |
| TS2339 — property does not exist | 1 | **A real, user-visible bug.** See below. |

Only **one** error is in code this project wrote. Ten are pre-existing and were invisible until now.

## The bug typechecking found immediately

`src/components/ByKeyTab.tsx:161` passes `noteNames={voicing.noteNames}` — but its data source, `getChordVoicings` in `chordData.ts`, returns `{ name: string; notes: number[] }`. There is no `noteNames`. The value is always `undefined`.

`KeyboardDiagram` treats `noteNames` as optional and falls back to sharp spelling when absent.

Meanwhile `ByNameTab.tsx:185` passes the same prop from `chordDatabase.ts`, whose `calculateVoicings` *does* return `noteNames`.

**Result: the By Key tab silently loses enharmonic spelling while By Name keeps it.** A D♭ chord renders C#/F/G# in one tab and D♭/F/A♭ in the other. Two parallel chord systems, one of which quietly drops a feature the other has.

The repository's history contains commits titled "Fix Enharmonics for black key notes" and "Fix black key label position". This is a bug the project has already paid attention to, shipped anyway, and could not see.

**Resolution:** `getChordVoicings` will be extended to return `noteNames`, restoring correct enharmonics in By Key rather than deleting the dead prop. This changes rendering for flat keys — an intended improvement, not a regression.

## TypeScript version: 7.0.2 — decided, with evidence

The original spike ran **TypeScript 5.9.3**. The registry now serves **7.0.2** (6.0.3 also exists). Codex raised the mismatch rather than papering over it, which was the right call.

**Decision: keep 7.0.2. Do not pin to 5.9.3.**

Re-measured against this exact repository at current head:

| Configuration | Errors | Classes |
|---|---|---|
| TS 5.9.3, original tsconfig | 11 | 7×TS2307, 1×TS2339, 2×TS7031, 1×TS2307 (.mjs) |
| TS 7.0.2, original tsconfig | **fails to start** | TS5102 — `baseUrl` has been removed |
| TS 7.0.2, `baseUrl` dropped | 13 | the same 11, plus 2×TS2882 for CSS imports in `main.tsx` |
| **TS 7.0.2, `baseUrl` dropped + `vite-env.d.ts`** | **11** | **8×TS2307, 1×TS2339, 2×TS7031 — identical to the 5.9.3 baseline** |

`vitest run` was also confirmed green under 7.0.2 (14/14 on the pre-existing suite).

So 7.0.2 is not a compromise — it lands on **exactly the same 11-error baseline**, in the same files, once two adjustments are made. Both are standard rather than workarounds: `baseUrl` is genuinely removed from the language's config surface, and `vite-env.d.ts` ships in every Vite TypeScript template.

Pinning to 5.9.3 would begin a brand-new typechecking adoption two majors behind, to reproduce a baseline that 7.0.2 reproduces anyway.

**Record the exact resolved version in the sprint output.** `^7.0.2` is the expected specifier; the baseline claim is version-dependent, so the number in the record must be the version actually used.

## Consequences

- One new devDependency: `typescript`. The standing "no new dependencies without an explicit decision" contract is otherwise unchanged and still in force.
- A `tsconfig.json` enters the repo for the first time. Its `include` must cover `src`, and must resolve `scripts/*.mjs` or the ingestion test's import stays broken.
- `npm run typecheck` becomes a verifier available to every future loop. **Loop specs may stop saying "the build does not typecheck."**
- `strict: true` from the start. Retrofitting strictness onto a grown codebase is far more expensive than adopting it at 11 errors.
- Loop 006, the largest UI surface planned, gets typechecking before it is written rather than after.
- Fixing the `ByKeyTab` error requires editing a file that every recent loop listed as forbidden. That prohibition is lifted **for this one loop and this one bug only**; it otherwise remains.

## What this evidence does not establish

- The 11 errors were measured with one specific `tsconfig.json`. A different `lib`, `moduleResolution`, or `jsx` setting would produce a different count. The number is a guide, not a contract — Loop 010 measures its own baseline before fixing.
- Typechecking says nothing about runtime correctness. It would not have caught the staff/pitch desync in Loop 009: both arrays were `number[]`, correctly typed, and wrongly paired.
