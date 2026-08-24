# Loop Spec 010: Adopt TypeScript Typechecking

Loop type: **Governance**
Status: engineered, awaiting executor assignment
Executor: **Codex**
Depends on: Loop 009 DONE
Blocks: nothing, but should land before Loop 006 — the largest UI surface planned

## Trigger

ADR 0003. The project is written in TypeScript, has **no `tsconfig.json` at all**, and has never been typechecked — `vite build` and `vitest` both strip types without checking them. Raised as a recommendation by Loops 004 and 009 and deliberately deferred, because adding a dependency needed an explicit decision.

## Goal

From **"the project is TypeScript in name only — nothing has ever verified a type"** to **"`npm run typecheck` runs under `strict: true` and exits clean, and the real bug that turning it on exposed is fixed."**

## Measured baseline — verify, do not trust

A macro-layer spike installed TypeScript in a throwaway clone and measured **11 errors at current head under `strict: true`**:

| # | File | Error | Nature |
|---|---|---|---|
| 1 | `components/ByKeyTab.tsx:161` | TS2339 `noteNames` does not exist | **real bug — see below** |
| 2 | `components/ui/alert.tsx:2` | TS2307 `class-variance-authority@0.7.1` | version-suffixed import |
| 3–4 | `components/ui/calendar.tsx:4,5` | TS2307 `lucide-react@0.487.0`, `react-day-picker@8.10.1` | version-suffixed import |
| 5–6 | `components/ui/calendar.tsx:63,66` | TS7031 implicit any on `className` | the two `strict` adds |
| 7–8 | `components/ui/carousel.tsx:6,7` | TS2307 `embla-carousel-react@8.6.0`, `lucide-react@0.487.0` | version-suffixed import |
| 9–10 | `components/ui/command.tsx:4,5` | TS2307 `cmdk@1.1.1`, `lucide-react@0.487.0` | version-suffixed import |
| 11 | `tests/musicxmlIngestion.test.ts:10` | TS2307 `../../scripts/ingest-musicxml.mjs` | config: `.mjs` outside `src` |

**Measure your own baseline first and record it.** A different `tsconfig` produces a different count; 11 is a guide, not a contract. If your baseline differs materially, say so before fixing.

Seven of these are one mechanical class: Figma exports wrote `from 'lucide-react@0.487.0'` instead of `from 'lucide-react'`. The packages are correctly declared in `package.json` without version suffixes. Strip the suffix; change nothing else.

## The real bug

`ByKeyTab.tsx:161` passes `noteNames={voicing.noteNames}`, but its source — `getChordVoicings` in `src/data/chordData.ts` — returns `{ name: string; notes: number[] }`. No `noteNames`. Always `undefined`.

`KeyboardDiagram` treats it as optional and falls back to sharp spelling. Meanwhile `ByNameTab.tsx:185` passes the same prop from `chordDatabase.ts`, whose `calculateVoicings` *does* return `noteNames`.

**By Key silently loses enharmonic spelling; By Name keeps it.** A D♭ chord renders C#/F/G# in one tab and D♭/F/A♭ in the other.

**Decided fix: extend `getChordVoicings` to return `noteNames`**, restoring correct enharmonics in By Key. Do not delete the prop. This changes rendering for flat keys — an intended improvement.

Inversions must carry their note names in the same rotation as their notes. `chordDatabase.ts`'s `calculateVoicings` already does exactly this — read it before writing, and follow it rather than inventing a second approach.

## Validated tsconfig

This config produced the 11-error baseline. Use it as the starting point; adjust only as needed to resolve error 11, and record any change.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

**`baseUrl` is deliberately absent.** TypeScript 7 removed it (`TS5102`). `paths` works without it, resolved relative to the tsconfig file. The `@/*` alias is in fact used by **zero** files in this repo, so `paths` could also be dropped entirely — it is kept only to match `vitest.config.ts`.

**Also required: `src/vite-env.d.ts`** containing exactly:

```
/// <reference types="vite/client" />
```

Without it, TypeScript 7 emits two `TS2882` errors for the CSS side-effect imports in `src/main.tsx`. Every standard Vite TypeScript template ships this file; this repo never had one because it never had TypeScript configured. Adding it is standard hygiene, not a workaround.

Error 11 needs a deliberate resolution — `allowJs` plus including `scripts`, a `.d.ts` declaration, or another approach. Choose, and say why.

## Scope

In scope: `package.json` (**`typescript` only**), `tsconfig.json`, the 7 version-suffixed import specifiers, `ui/calendar.tsx` type annotations, `src/data/chordData.ts`, `src/components/ByKeyTab.tsx`, and this loop's prompt archive and sprint output.

**The standing prohibition on editing `ByKeyTab.tsx` and `chordData.ts` is lifted for this loop and this bug only.** It otherwise remains in force.

Explicitly out of scope:

- Any dependency other than `typescript` — including `@types/*`, which are already declared
- Deleting or restructuring unused `ui/` scaffolding. Fix the import specifier; leave the component.
- Migrating `ByKeyTab` onto `chordDatabase` — the larger unification was considered and deliberately not chosen
- Reformatting, refactoring, or "tidying" any file you touch for a type error. **Change only what the error requires.**
- The two-row keyboard (006), fuzzy matching (007), ingestion, or the merged stream
- `ByNameTab.tsx`, `KeyboardDiagram.tsx`, `chordDatabase.ts`, `vite.config.ts`, `vitest.config.ts`
- `git push`, merging to `main`

## Verifier

| # | Check | Passing result |
|---|---|---|
| 1 | Baseline recorded | your own pre-fix error count and per-file breakdown, before any fix |
| 2 | `npm run typecheck` | **exits 0, zero errors** |
| 3 | `strict: true` | present in the committed `tsconfig.json` |
| 4 | `npm test` | all pass — the same suites as before, none skipped |
| 5 | `npm run build` | succeeds |
| 6 | Dependency delta | `git diff package.json` shows **exactly one addition, `typescript`**, in `devDependencies` |
| 7 | Lockfile | `package-lock.json` changed only as `npm install typescript` requires |
| 8 | Import fixes are specifier-only | the diff for each `ui/*` file touches only the import line |
| 9 | `getChordVoicings` | returns `noteNames` whose order matches its `notes` for **all three voicings**, inversions included |
| 10 | Enharmonic regression test | a new test asserting a flat-key chord yields flat names from `getChordVoicings` — not sharps |
| 11 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing |
| 12 | Music work untouched | `git diff --stat` shows no change under `src/lib/music/`, `src/data/pieces/`, or the ingestion script |
| 13 | Commit | one commit on `phrase-lookup`, unpushed |
| 14 | Browser — By Key enharmonics | select **D♭ Major**, toggle a chord, confirm the keyboard labels read **flats** (D♭, A♭) not sharps (C#, G#) |
| 15 | Browser — no regression | By Name and Phrase Lookup still render; Phrase Lookup still shows the single m12 b4 match |

Check 10 is what stops the enharmonic bug from silently returning — the type error is gone once `noteNames` exists at all, even if its *values* are wrong. Types prove shape, not correctness. Check 12 guards the verified music layer.

**Checks 14 and 15 need a browser and a running dev server.** Stated up front: without one, run 1–13, mark 14–15 `not run`, end at `BLOCKED`, and do not substitute inspection.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Never silence an error with `any`, `@ts-ignore`, `@ts-expect-error`, or by loosening `strict`.** If an error cannot be fixed honestly, stop at `NEEDS_HUMAN_DECISION` and show it.
- Do not add a dependency beyond `typescript`.
- Do not exclude a file from `tsconfig` to make it pass. Excluding `src/components/ui/**` would clear 9 of 11 errors and defeat the point.
- Do not touch `src/lib/music/` to satisfy the typechecker. That code is verified; if it errors, report it.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–15 pass, evidence recorded |
| `BLOCKED` | no browser or dev server for 14–15, with 1–13 passing |
| `NEEDS_HUMAN_DECISION` | an error cannot be fixed without `any`, an ignore comment, an exclusion, or loosening `strict`; or your baseline differs materially from 11 |
| `NEEDS_ARCHITECTURE_DECISION` | a clean typecheck appears to require restructuring the two parallel chord systems |
| `OUT_OF_SCOPE` | success appears to require a second dependency, or editing files outside the in-scope list |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

## Consequence to record

Once this lands, `npm run typecheck` is a verifier available to every future loop, and loop specs may **stop carrying the standing note that the build does not typecheck.** Loop 006 gets it before it is written rather than after.

Worth recording alongside: typechecking would **not** have caught Loop 009's staff/pitch desync. Both arrays were `number[]`, correctly typed, and wrongly paired. Types prove shape, never correctness — which is why the verifier discipline in these loops matters more than the compiler.
