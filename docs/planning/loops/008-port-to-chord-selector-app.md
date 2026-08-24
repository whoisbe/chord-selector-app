# Loop Spec 008: Port Phrase Lookup to chord-selector-app

Loop type: **Completion** (repository migration)
Status: engineered, awaiting executor assignment
Executor: TBD
Depends on: nothing
Blocks: **Loops 004 and 006, both of which need their paths and build assumptions revised against the new repo after this lands**

> Loop IDs are assigned in creation order, not execution order. This is loop 008 by ID and runs **next**. The map carries execution order.

## Trigger

Loops 001 and 002 were executed in `whoisbe/chordsense`. The intended home is `whoisbe/chord-selector-app`. These are not two clones of one project — they are different applications with unrelated histories:

| | chordsense | chord-selector-app |
|---|---|---|
| Build | Next.js 15 App Router | Vite 6 + React 18 |
| UI | Tailwind v4, **broken** | Tailwind + Radix, working |
| Tests | `node:test` + `tsconfig.test.json` | vitest + jsdom, configured |
| Shell | App Router routes + MDX blog | 29-line `App.tsx` tab shell |

Repointing the remote would not work. This is a port.

**Nothing was ever pushed to `chordsense`.** Both commits are local, `main...origin/main [ahead 2]`. No remote cleanup is required, and none is authorised.

## Goal

From **"the phrase lookup work lives in the wrong repository, on an incompatible framework"** to **"the pure music modules, their tests, and the entire macro-layer document tree live on a `phrase-lookup` branch of chord-selector-app, with the founding query demonstrably working there."**

## Guiding constraint

**Port faithfully. Do not improve anything in transit.**

Every temptation to fix, refactor, rename, or modernise during a migration is a temptation to make the port unverifiable. If the ported code is byte-identical (or mechanically transformed in a stated way), a failure afterwards is a port defect. If it was "improved," the failure could be anything.

Known-pending changes — removing the hand filter per ADR 0002, replacing the input surface per Loop 006 — belong to their own loops. **Port the single-hand tests unchanged even though ADR 0002 supersedes them.** Loop 004 changes them deliberately.

## Source and destination

Source repo: `/Users/b/dev/chordsense` — read-only for this loop.
Destination repo: `/Users/b/dev/chord-selector-app`, branch `phrase-lookup`, cut from `main`.

| Source | Destination | Transform |
|---|---|---|
| `lib/music/types.ts` | `src/lib/music/types.ts` | none |
| `lib/music/phrase-search.ts` | `src/lib/music/phrase-search.ts` | none |
| `lib/music/pitch-label.ts` | `src/lib/music/pitch-label.ts` | none |
| `data/pieces/phrase-lookup-demo.ts` | `src/data/pieces/phrase-lookup-demo.ts` | import paths only |
| `data/spike/moonlight-sonata.mxl` | `data/spike/moonlight-sonata.mxl` | none — repo root, not app data |
| `tests/phrase-search.test.ts` | `src/tests/phraseSearch.test.ts` | `node:test` → vitest |
| `docs/**` (all 15 files) | `docs/**` | none |
| `CLAUDE.md`, `AGENTS.md` | repo root | none |

Not ported, deliberately: `app/lookup/page.tsx`, `components/phrase-lookup/PhraseLookup.tsx`, `tsconfig.test.json`, the `.gitignore` edits, `README.md`, `scripts/README.md`, and everything Next.js- or MDX-specific.

`chord-selector-app`'s `.gitignore` was checked and contains no `lib/` rule, so the Loop 002 defect does not recur.

## Test conversion

The only non-trivial transform. Existing style in `src/tests/chordVoicings.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
```

`vitest.config.ts` already sets `globals: true` and `environment: 'jsdom'`, and `npm test` runs `vitest run`. Convert `node:test`'s `test()`/`assert` to vitest's `it()`/`expect()`. **All ten assertions must survive with identical meaning.** Do not merge, split, or drop a case.

## The smoke surface

Add a third tab so the port is verifiable end to end rather than only at the unit level.

- `src/components/PhraseLookupTab.tsx` — **deliberately minimal and explicitly temporary.** It runs the fixture query `[F#4+F#5] → [C#5] → [E5]` against the ported fixture and renders the matches. No pitch grid, no builder, no undo/clear.
- Wire it into `App.tsx` as a third `TabsContent` alongside `by-key` and `by-name`, plus the matching `Header` nav entry.
- A visible note in the component and a comment at the top of the file stating it is a Loop 008 smoke surface, replaced by Loop 006.

Resist building the real UI here. Loop 006 replaces this entirely, and anything more elaborate is work thrown away twice.

## Scope

In scope: everything in the destination table above, `src/components/PhraseLookupTab.tsx`, `src/App.tsx`, `src/components/Header.tsx`, and this loop's prompt archive and sprint output.

Explicitly out of scope:

- Any change to `ByKeyTab.tsx`, `ByNameTab.tsx`, `KeyboardDiagram.tsx`, `chordData.ts`, `chordDatabase.ts`, or `chordVoicings.test.ts`
- MusicXML ingestion — Loop 004
- The two-row keyboard — Loop 006
- Removing the hand filter — Loop 004, per ADR 0002
- Any npm dependency, in either repo
- **Any write, commit, push, or branch operation in `chordsense`.** It is read-only.
- `git push` anywhere, including chord-selector-app
- Merging `phrase-lookup` into `main`
- Deleting the chordsense clone — the human does that

## Verifier

Run from `/Users/b/dev/chord-selector-app` unless stated.

| # | Check | Passing result |
|---|---|---|
| 1 | `git rev-parse --abbrev-ref HEAD` | `phrase-lookup` |
| 2 | `git merge-base --is-ancestor origin/main HEAD` | exit 0 — branched from `main` |
| 3 | `npm ci` | succeeds from the existing lockfile |
| 4 | `git diff --exit-code package.json package-lock.json` | exit 0 — no dependency added |
| 5 | `npm test` | the pre-existing chordVoicings suite passes **and** 10 ported assertions pass |
| 6 | `npm run build` | vite build succeeds |
| 7 | Pure-module fidelity | `diff` each of the three `lib/music/*.ts` against its chordsense original — **no differences** |
| 8 | Docs fidelity | every file under `docs/` diffs clean against its chordsense original |
| 9 | Purity | `grep -rniE "react\|document\|window\|fetch\|node:" src/lib/music/` returns nothing |
| 10 | Assertion count | the ported test file contains 10 distinct cases, matching the source one-for-one |
| 11 | Regression | dev server: By Key and By Name tabs still function |
| 12 | Smoke surface | the Phrase Lookup tab renders **2 matches, measures 12 and 27**, from the fixture |
| 13 | chordsense untouched | in `/Users/b/dev/chordsense`: `git status --short` and `git log --oneline -3` are unchanged from the pre-state captured in Task 1, and `git status -sb` still reads `ahead 2` |
| 14 | Nothing pushed | `git log origin/phrase-lookup..HEAD` errors or shows the branch has no remote |

Checks 7 and 8 are the whole point — they are what make this a *port* rather than a rewrite. Check 13 is the safety rail. Checks 11 and 12 need a browser; **stated up front** per the Loop 001 learning — if the executor has no browser backend, run 1–10 and 13–14, mark 11–12 `not run`, and end at `BLOCKED` without substituting inspection.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- If check 7 or 8 fails, **restore from source.** Do not hand-edit the destination to converge — that is how a port silently becomes a rewrite.
- If a ported test fails under vitest, the conversion is wrong. Do not change the assertion to match the behaviour; the behaviour passed 10/10 in the source repo minutes ago.
- Do not add a dependency to make a test or build pass.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | all 14 checks pass, evidence recorded |
| `BLOCKED` | `/Users/b/dev/chord-selector-app` is absent or not a clone of `whoisbe/chord-selector-app`; or no browser backend for 11–12 with everything else passing |
| `NEEDS_ARCHITECTURE_DECISION` | the pure modules cannot compile under this repo's TypeScript config without a dependency or a source change |
| `NEEDS_HUMAN_DECISION` | a ported test cannot be expressed in vitest without changing its meaning |
| `OUT_OF_SCOPE` | success appears to require touching existing chord-selector components, ingestion, or the keyboard |
| `RISK_TOO_HIGH` | success appears to require writing to `chordsense`, pushing, or merging to `main` |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

## Downstream consequences to record, not act on

- **Loop 005 is dead.** The Tailwind v3/v4 defect was chordsense-specific. Mark superseded; do not port it.
- **Loop 004 needs revision** before it can run: paths become `src/lib/music/`, and build-time `.mxl` handling is a Vite question, not a Next.js one. Its evidence and target numbers stay valid.
- **Loop 006 gets cheaper.** `src/components/KeyboardDiagram.tsx` already implements piano geometry at `C4 = 60` with the exact white/black patterns the spec names, plus active-note highlighting. It is display-only — no click handling — so Loop 006 becomes an extension, not a build.

Note these in the sprint output. Do not implement them.
