# Agent Handoff: Adopt TypeScript Typechecking

**Assigned agent: Codex**
Loop spec: `docs/planning/loops/010-typescript-typechecking.md`
Decision record: `docs/adr/0003-typescript-typechecking.md`
Sprint: 10
Prepared: 2026-08-02
Sprint output: `docs/sprints/output/010-typescript-typechecking-output.md`

Self-contained. Execute from this document alone. Do not rely on prior conversation.

Repository: `/Users/b/dev/chord-selector-app`, branch `phrase-lookup`. **Do not push. Do not merge to `main`.**

## 1. Situation

This project is written in TypeScript and **has never been typechecked.**

- `typescript` is not a declared dependency.
- There is **no `tsconfig.json` in the repository at all.**
- `npm run build` is `vite build`; esbuild strips types without checking them.
- `npm test` is `vitest run`; likewise.

It compiles and ships, and no tool has ever verified a type. ADR 0003 decides to fix that.

`@types/node`, `@types/react`, and `@types/react-dom` are already declared, so **`typescript` is the only package you add.**

## 2. Goal

> From "the project is TypeScript in name only" to "`npm run typecheck` runs under `strict: true` and exits clean, and the real bug that turning it on exposed is fixed."

## 3. Measured baseline — reproduce it, don't trust it

A macro-layer spike measured **11 errors at current head under `strict: true`**:

| # | File | Error | Nature |
|---|---|---|---|
| 1 | `components/ByKeyTab.tsx:161` | TS2339 `noteNames` does not exist | **real bug — Section 5** |
| 2 | `components/ui/alert.tsx:2` | TS2307 `class-variance-authority@0.7.1` | version-suffixed import |
| 3–4 | `components/ui/calendar.tsx:4,5` | TS2307 `lucide-react@0.487.0`, `react-day-picker@8.10.1` | version-suffixed import |
| 5–6 | `components/ui/calendar.tsx:63,66` | TS7031 implicit any on `className` | the two `strict` adds |
| 7–8 | `components/ui/carousel.tsx:6,7` | TS2307 `embla-carousel-react@8.6.0`, `lucide-react@0.487.0` | version-suffixed import |
| 9–10 | `components/ui/command.tsx:4,5` | TS2307 `cmdk@1.1.1`, `lucide-react@0.487.0` | version-suffixed import |
| 11 | `tests/musicxmlIngestion.test.ts:10` | TS2307 `../../scripts/ingest-musicxml.mjs` | config: `.mjs` outside `src` |

**Task 2 is to measure your own baseline and record it before fixing anything.** A different tsconfig yields a different count; 11 is a guide, not a contract. If yours differs materially, stop and report rather than pressing on.

Seven errors are one mechanical class: Figma exports wrote `from 'lucide-react@0.487.0'` instead of `from 'lucide-react'`. The packages are correctly declared in `package.json` without suffixes. **Strip the suffix and change nothing else on those lines.**

## 4. Validated tsconfig

This exact config produced the 11-error baseline. Start here.

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
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

Error 11 needs a deliberate resolution — `allowJs` plus including `scripts`, a `.d.ts` declaration, or another approach. Choose one, and say why in the output.

Add the script: `"typecheck": "tsc --noEmit"`.

## 5. The real bug

`ByKeyTab.tsx:161` passes `noteNames={voicing.noteNames}`. Its source — `getChordVoicings` in `src/data/chordData.ts` — returns `{ name: string; notes: number[] }`. There is no `noteNames`. It is always `undefined`.

`KeyboardDiagram` treats `noteNames` as optional and falls back to sharp spelling. Meanwhile `ByNameTab.tsx:185` passes the same prop from `chordDatabase.ts`, whose `calculateVoicings` *does* return `noteNames`.

**By Key silently loses enharmonic spelling; By Name keeps it.** A D♭ chord renders C#/F/G# in one tab and D♭/F/A♭ in the other.

**Fix: extend `getChordVoicings` to return `noteNames`.** Do not delete the prop — that would make the types honest while leaving the bug.

`getChordVoicings` builds three voicings — Root, 1st Inv, 2nd Inv — by rotating notes and adding octaves. **`noteNames` must rotate in exactly the same order as `notes` for each voicing.** `calculateVoicings` in `chordDatabase.ts` already solves this; read it and mirror its approach rather than inventing a second one.

## 6. Tasks

**Task 0.** Copy `docs/agent-handoff.md` verbatim to `docs/prompts/sprint10-codex-typecheck.md`. Verify with `cmp -s`, record the exit code.

**Task 1.** `npm install --save-dev typescript`. This is the one authorised dependency addition.

**Task 2.** Add `tsconfig.json` from Section 4 and the `typecheck` script. Run `npm run typecheck` and **record the full baseline output** — count and per-file breakdown — before fixing anything.

**Task 3.** Fix the 7 version-suffixed imports. Specifier only.

**Task 4.** Fix the 2 implicit-any annotations in `ui/calendar.tsx`.

**Task 5.** Resolve the `scripts/ingest-musicxml.mjs` resolution error. Say which approach and why.

**Task 6.** Fix the real bug per Section 5.

**Task 7.** Add the enharmonic regression test — see check 10.

**Task 8.** Run Section 7, write the output, commit once.

## 7. Verification requirements

| # | Check | Passing result |
|---|---|---|
| 1 | Baseline recorded | pre-fix count and per-file breakdown, before any fix |
| 2 | `npm run typecheck` | **exits 0, zero errors** |
| 3 | `strict: true` | present in the committed `tsconfig.json` |
| 4 | `npm test` | all suites pass, none skipped |
| 5 | `npm run build` | succeeds |
| 6 | Dependency delta | `git diff package.json` shows **exactly one addition — `typescript`** — in `devDependencies` |
| 7 | Lockfile | changed only as installing `typescript` requires |
| 8 | Import fixes | each `ui/*` diff touches only the import line |
| 9 | `getChordVoicings` | returns `noteNames` ordered to match `notes` for **all three voicings**, inversions included |
| 10 | Enharmonic regression test | a new test asserting a flat-key chord yields **flat** names from `getChordVoicings`, not sharps |
| 11 | Purity | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing |
| 12 | Music work untouched | `git diff --stat` shows no change under `src/lib/music/`, `src/data/pieces/`, or `scripts/ingest-musicxml.mjs` |
| 13 | Commit | exactly one, on `phrase-lookup`, unpushed |
| 14 | Browser — By Key enharmonics | select **D♭ Major**, toggle a chord, confirm keyboard labels read **flats** (D♭, A♭) not sharps (C#, G#) |
| 15 | Browser — no regression | By Name and Phrase Lookup still render; Phrase Lookup still shows the single m12 b4 match |

**Check 10 is the one that matters most.** The type error disappears the moment `noteNames` exists at all — even if every value in it is wrong. Types prove shape, not correctness. Without a value-level test, this bug can silently return.

**Checks 14 and 15 need a browser and a running dev server.** Stated up front deliberately: an earlier loop finished, passed every automated check, then stranded at `BLOCKED` for want of a browser. Without one, run 1–13, mark 14–15 `not run` with the reason, end at `BLOCKED`, and **do not substitute code inspection**. The macro layer closes them.

## 8. Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Never silence an error with `any`, `@ts-ignore`, `@ts-expect-error`, or by loosening `strict`.** If an error cannot be fixed honestly, stop at `NEEDS_HUMAN_DECISION` and show it. Getting to green dishonestly is worse than stopping.
- **Do not exclude files from `tsconfig` to pass.** Excluding `src/components/ui/**` would clear 9 of 11 and defeat the entire loop.
- Do not add a dependency beyond `typescript`.
- Do not touch `src/lib/music/` to satisfy the compiler. That code is independently verified; if it errors, report it.
- Record failure signal, diagnosis, change, and rerun result per attempt.

## 9. Forbidden actions

- Any dependency other than `typescript`, including `@types/*` (already declared)
- Deleting or restructuring unused `ui/` scaffolding — fix the specifier, keep the component
- Migrating `ByKeyTab` onto `chordDatabase`; the larger unification was considered and deliberately not chosen
- Reformatting, refactoring, or tidying any file beyond what its error requires
- Editing `ByNameTab.tsx`, `KeyboardDiagram.tsx`, `chordDatabase.ts`, `vite.config.ts`, `vitest.config.ts`, `vercel.json`
- Editing anything under `src/lib/music/`, `src/data/pieces/`, or `scripts/`
- The two-row keyboard, fuzzy matching, ingestion, or the merged stream
- `git push`, merging to `main`, rewriting history
- Writing anything in `/Users/b/dev/chordsense`

**Note:** the standing prohibition on editing `ByKeyTab.tsx` and `chordData.ts` is **lifted for this loop and this bug only.** It otherwise remains in force.

## 10. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–15 pass, evidence recorded |
| `BLOCKED` | no browser or dev server for 14–15, with 1–13 passing |
| `NEEDS_HUMAN_DECISION` | an error cannot be fixed without `any`, an ignore comment, an exclusion, or loosening `strict`; or your baseline differs materially from 11 |
| `NEEDS_ARCHITECTURE_DECISION` | a clean typecheck appears to require restructuring the two parallel chord systems |
| `OUT_OF_SCOPE` | success appears to require a second dependency or files outside the in-scope list |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

## 11. Output requirements

Write `docs/sprints/output/010-typescript-typechecking-output.md`:

- exactly one terminal state
- **the full pre-fix baseline**, verbatim
- the tsconfig committed, and any deviation from Section 4 with the reason
- how error 11 was resolved and why
- how `noteNames` rotation was implemented for the two inversions, and how you confirmed the order matches `notes`
- every changed file and whether it was in scope
- all 15 checks with **actual output**
- the commit SHA
- repair attempts used, including zero
- stop rules triggered, if any
- out-of-scope pressure encountered
- risks and open questions

Also record: once this lands, `npm run typecheck` is available to every future loop, and specs may **stop carrying the standing note that the build does not typecheck**.

When `DONE`, the next recommended action must be "accept current loop as complete."
