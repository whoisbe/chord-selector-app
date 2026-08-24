# Agent Handoff: Port Phrase Lookup to chord-selector-app

**Assigned agent: Claude Code**
Loop spec: `docs/planning/loops/008-port-to-chord-selector-app.md`
Sprint: 8
Prepared: 2026-08-01
Sprint output: `docs/sprints/output/008-port-output.md` (in the **destination** repo)

This handoff is self-contained. Execute from this document alone. Do not rely on `CLAUDE.md`, `AGENTS.md`, or any prior conversation.

## 0. The two repositories

| Role | Path | Rule |
|---|---|---|
| Source | `/Users/b/dev/chordsense` | **READ ONLY.** Never write, commit, branch, or push here. |
| Destination | `/Users/b/dev/chord-selector-app` | All work happens here, on branch `phrase-lookup`. |

Already verified, so you do not need to create them: the destination is a clone of `whoisbe/chord-selector-app`, currently on branch `phrase-lookup`, cut from `origin/main`, with a clean working tree and no `node_modules`.

**Do not `git push` anywhere.** Not to either repo, not to any branch. Do not merge into `main`.

## 1. Goal

Loops 001 and 002 were executed in the wrong repository. They are not two clones of one project — `chordsense` is Next.js 15 App Router with an MDX blog; `chord-selector-app` is Vite 6 + React 18 + Radix. Unrelated histories, incompatible frameworks.

Move the framework-independent work across:

> from "the phrase lookup work lives in the wrong repository, on an incompatible framework"
> to "the pure music modules, their tests, and the macro-layer document tree live on `phrase-lookup` in chord-selector-app, with the fixture query demonstrably working there."

Nothing was ever pushed to `chordsense`, so there is no remote cleanup to perform, and none is authorised.

## 2. The one constraint that governs everything

**Port faithfully. Do not improve anything in transit.**

Every urge to fix, refactor, rename, reformat, or modernise during a migration makes the port unverifiable. If ported code is byte-identical, a later failure is a port defect. If it was "improved," a later failure could be anything.

Two changes are known to be pending and are **explicitly not yours**:

- Removing the single-hand filter (ADR 0002) — that is Loop 004.
- Replacing the input surface with a two-row keyboard — that is Loop 006.

**Port the single-hand tests unchanged even though ADR 0002 supersedes them.** Loop 004 will change them deliberately, and it should be the diff that shows it.

## 3. Context files

Read before editing:

1. `/Users/b/dev/chordsense/docs/planning/loops/008-port-to-chord-selector-app.md`
2. `/Users/b/dev/chord-selector-app/package.json`
3. `/Users/b/dev/chord-selector-app/vitest.config.ts`
4. `/Users/b/dev/chord-selector-app/src/App.tsx`
5. `/Users/b/dev/chord-selector-app/src/components/Header.tsx`
6. `/Users/b/dev/chord-selector-app/src/tests/chordVoicings.test.ts` — the vitest style to match
7. `/Users/b/dev/chordsense/tests/phrase-search.test.ts` — the tests to convert

Record any other file you inspect, and why, in the sprint output.

## 4. Tasks

### Task 0: Archive this handoff

Copy `docs/agent-handoff.md` verbatim to `docs/prompts/sprint8-claude-code-port.md` **in the destination repo** (`/Users/b/dev/chord-selector-app/docs/prompts/`). Create directories as needed. Verify with `cmp -s` and record the exit code.

### Task 1: Capture the source pre-state

In `/Users/b/dev/chordsense`, capture and save into your sprint output:

```
git status --short
git status -sb
git log --oneline -3
```

You will re-run these at the end as check 13. It must read `## main...origin/main [ahead 2]`. If it does not, stop at `NEEDS_HUMAN_DECISION`.

### Task 2: Copy files

| Source (in chordsense) | Destination (in chord-selector-app) | Transform |
|---|---|---|
| `lib/music/types.ts` | `src/lib/music/types.ts` | none |
| `lib/music/phrase-search.ts` | `src/lib/music/phrase-search.ts` | none |
| `lib/music/pitch-label.ts` | `src/lib/music/pitch-label.ts` | none |
| `data/pieces/phrase-lookup-demo.ts` | `src/data/pieces/phrase-lookup-demo.ts` | import paths only, if any |
| `data/spike/moonlight-sonata.mxl` | `data/spike/moonlight-sonata.mxl` (repo root) | none |
| `docs/**` — all files | `docs/**` | none |
| `CLAUDE.md`, `AGENTS.md` | repo root | none |

The three `lib/music/*.ts` files and everything under `docs/` must end up byte-identical. Verified by checks 7 and 8.

Do **not** port: `app/lookup/page.tsx`, `components/phrase-lookup/PhraseLookup.tsx`, `tsconfig.test.json`, `README.md`, `scripts/README.md`, `.gitignore`, or anything Next.js- or MDX-specific.

### Task 3: Convert the tests

`chordsense/tests/phrase-search.test.ts` → `src/tests/phraseSearch.test.ts`.

Source uses Node's `node:test` with `assert`. Destination uses vitest — `vitest.config.ts` already sets `globals: true` and `environment: 'jsdom'`, and `npm test` runs `vitest run`. Match the existing style:

```ts
import { describe, it, expect } from 'vitest';
```

**All ten cases must survive with identical meaning.** Do not merge, split, reorder, drop, or reword an assertion's intent. If a case cannot be expressed in vitest without changing its meaning, stop at `NEEDS_HUMAN_DECISION` rather than approximating it.

### Task 4: Add the smoke surface

`src/components/PhraseLookupTab.tsx` — **deliberately minimal and explicitly temporary.**

It runs the fixture query `[F#4+F#5] → [C#5] → [E5]` against the ported fixture and renders the matches. No pitch grid, no group builder, no undo, no clear, no hand selector. Roughly 30 lines.

Open the file with a comment, and show a visible note in the UI, stating it is a Loop 008 smoke surface replaced by Loop 006.

Wire it into `src/App.tsx` as a third `TabsContent` alongside `by-key` and `by-name`, with the matching entry in `src/components/Header.tsx`.

Do not build the real interface. Loop 006 replaces this entirely; anything more elaborate is work thrown away twice.

### Task 5: Commit

Commit on `phrase-lookup` in the destination repo only. One or two commits, real messages. **Do not push. Do not merge to main.**

### Task 6: Verify and record

Run every check in Section 5, then write the sprint output.

## 5. Verification requirements

From `/Users/b/dev/chord-selector-app` unless stated. Record command, status, and actual output for each.

| # | Check | Passing result |
|---|---|---|
| 1 | `git rev-parse --abbrev-ref HEAD` | `phrase-lookup` |
| 2 | `git merge-base --is-ancestor origin/main HEAD` | exit 0 |
| 3 | `npm ci` | succeeds from the existing lockfile |
| 4 | `git diff --exit-code package.json package-lock.json` | exit 0 — no dependency added |
| 5 | `npm test` | pre-existing chordVoicings suite passes **and** 10 ported cases pass |
| 6 | `npm run build` | vite build succeeds |
| 7 | `diff` each `src/lib/music/*.ts` against its chordsense original | no differences |
| 8 | `diff` every `docs/` file against its chordsense original | no differences |
| 9 | `grep -rniE "react\|document\|window\|fetch\|node:" src/lib/music/` | no output |
| 10 | Ported test file | 10 distinct cases, one-for-one with the source |
| 11 | Regression, dev server | By Key and By Name tabs still function |
| 12 | Smoke surface, dev server | Phrase Lookup tab renders **2 matches, measures 12 and 27** |
| 13 | Source untouched | in chordsense: `git status --short`, `git log --oneline -3` identical to Task 1; `git status -sb` still `ahead 2` |
| 14 | Nothing pushed | `phrase-lookup` has no remote tracking branch |

Checks 7 and 8 are what make this a port rather than a rewrite. Check 13 is the safety rail.

**Checks 11 and 12 require a browser.** Stated up front deliberately: Loop 001 completed its implementation, passed every automated check, then stranded at `BLOCKED` because its session had no browser backend for one interaction step. If you have no browser, run 1–10 and 13–14, mark 11–12 `not run` with the reason, and end at `BLOCKED`. **Do not substitute code inspection for a required check.** The macro layer will close them, as it did for Loop 001.

## 6. Repair policy

- Initial implementation plus at most 2 repair attempts.
- **If check 7 or 8 fails, re-copy from source.** Do not hand-edit the destination to converge — that is how a port silently becomes a rewrite.
- If a ported test fails under vitest, the conversion is wrong. Do not change the assertion to match observed behaviour; these tests passed 10/10 in the source repo.
- Do not add a dependency to make anything pass.
- Record failure signal, diagnosis, change, and rerun result for each attempt.

`npm ci` is environment preparation and does not consume a repair attempt.

## 7. Forbidden actions

- Any write, commit, branch, checkout, stash, or push in `/Users/b/dev/chordsense`
- `git push` anywhere; merging `phrase-lookup` into `main`; rewriting history
- Adding, removing, or updating any npm dependency in either repo
- Editing `ByKeyTab.tsx`, `ByNameTab.tsx`, `KeyboardDiagram.tsx`, `chordData.ts`, `chordDatabase.ts`, `chordVoicings.test.ts`, `vite.config.ts`, `vitest.config.ts`, or `vercel.json`
- MusicXML ingestion (Loop 004), the two-row keyboard (Loop 006), removing the hand filter (Loop 004)
- Deleting the chordsense clone — the human does that
- Improving, reformatting, or refactoring any ported file

## 8. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | all 14 checks pass and the evidence record is written |
| `BLOCKED` | destination missing or not the right clone; or no browser backend for 11–12 with all else passing |
| `NEEDS_ARCHITECTURE_DECISION` | the pure modules cannot compile under this repo's TypeScript config without a dependency or a source change |
| `NEEDS_HUMAN_DECISION` | a test cannot be expressed in vitest without changing its meaning; or chordsense's pre-state is not `ahead 2` |
| `OUT_OF_SCOPE` | success appears to require touching existing chord-selector components, ingestion, or the keyboard |
| `RISK_TOO_HIGH` | success appears to require writing to chordsense, pushing, or merging to `main` |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

Do not continue into Loop 004 or Loop 006 after reaching a terminal state.

## 9. Output requirements

Write to `/Users/b/dev/chord-selector-app/docs/sprints/output/008-port-output.md`:

- exactly one terminal state
- the attempted state transition and outcome
- Task 0 archive path and `cmp` exit code
- the Task 1 source pre-state, verbatim
- every file ported, with its transform, and every file deliberately not ported
- all 14 verification results with actual output
- the test conversion: how each of the 10 cases maps from `node:test` to vitest
- repair attempts used, including zero
- stop rules triggered, if any
- out-of-scope pressure encountered
- risks and open questions
- exactly one next recommended action

Also record, **without acting on them**, these downstream consequences:

- Loop 005 (Tailwind v3→v4 repair) is dead — that defect was chordsense-specific; this repo's Tailwind works.
- Loop 004 needs path and build revision: `src/lib/music/`, and `.mxl` handling is a Vite question now, not Next.js. Its evidence and target numbers remain valid.
- Loop 006 gets cheaper: `src/components/KeyboardDiagram.tsx` already implements piano geometry at `C4 = 60` with white pattern `[0,2,4,5,7,9,11]` and black `[1,3,6,8,10]`, plus active-note highlighting. It is display-only, with no click handling.

When `DONE`, the next recommended action must be "accept current loop as complete."
