# Sprint 8 Output: Port Phrase Lookup to chord-selector-app

## Terminal state

**DONE**

## Attempted state transition and outcome

From "the phrase lookup work lives in the wrong repository, on an incompatible framework" to "the pure music modules, their tests, and the macro-layer document tree live on `phrase-lookup` in chord-selector-app, with the fixture query demonstrably working there."

Outcome: achieved. All 14 verification checks pass, including the two that require a browser.

## Task 0: Archive this handoff

- Source: `/Users/b/dev/chordsense/docs/agent-handoff.md`
- Destination: `/Users/b/dev/chord-selector-app/docs/prompts/sprint8-claude-code-port.md`
- `cmp -s` exit code: `0` (identical)

## Task 1: Source pre-state (verbatim)

```
$ git status --short
 M docs/agent-handoff.md
 M docs/planning/loops/003-score-data-source-decision.md
 M docs/planning/product-loop-map.md
?? docs/adr/
?? docs/planning/loops/004-musicxml-ingestion.md
?? docs/planning/loops/005-tailwind-v4-repair.md
?? docs/planning/loops/006-two-row-keyboard-input.md
?? docs/planning/loops/008-port-to-chord-selector-app.md
?? docs/sprints/kickoff/sprint8-port.md

$ git status -sb
## main...origin/main [ahead 2]
 M docs/agent-handoff.md
 M docs/planning/loops/003-score-data-source-decision.md
 M docs/planning/product-loop-map.md
?? docs/adr/
?? docs/planning/loops/004-musicxml-ingestion.md
?? docs/planning/loops/005-tailwind-v4-repair.md
?? docs/planning/loops/006-two-row-keyboard-input.md
?? docs/planning/loops/008-port-to-chord-selector-app.md
?? docs/sprints/kickoff/sprint8-port.md

$ git log --oneline -3
4b273b3 Document repo hygiene and project identity
71b2270 Add exact phrase lookup vertical slice
f03a28e modify .gitignore
```

`ahead 2` confirmed — proceeded without stopping at `NEEDS_HUMAN_DECISION`. Note the working tree in chordsense was not clean (modified/untracked doc files, evidently in-progress human editing of the loop-map and ADR docs) — the loop spec only gates on the `ahead 2` condition, not tree cleanliness, and this loop never wrote to chordsense, so it was left exactly as found.

## Files ported

| Source (chordsense) | Destination (chord-selector-app) | Transform | Verified |
|---|---|---|---|
| `lib/music/types.ts` | `src/lib/music/types.ts` | none | byte-identical (check 7) |
| `lib/music/phrase-search.ts` | `src/lib/music/phrase-search.ts` | none | byte-identical (check 7) |
| `lib/music/pitch-label.ts` | `src/lib/music/pitch-label.ts` | none | byte-identical (check 7) |
| `data/pieces/phrase-lookup-demo.ts` | `src/data/pieces/phrase-lookup-demo.ts` | none needed — its `../../lib/music/types` import resolves identically at the new depth (`src/data/pieces/` → `src/lib/music/`, same two-level-up shape as `data/pieces/` → `lib/music/`) | byte-identical |
| `data/spike/moonlight-sonata.mxl` | `data/spike/moonlight-sonata.mxl` (repo root) | none | byte-identical |
| `docs/**` (17 files: adr/0001, adr/0002, agent-handoff.md, planning/loops/{001,002,003,004,005,006,008}, planning/product-loop-map.md, prompts/{phrase-lookup-search-vertical-slice-handoff,sprint2-codex-repo-hygiene}.md, sprints/kickoff/{sprint2-repo-hygiene,sprint8-port}.md, sprints/output/{002-repo-hygiene-output,phrase-lookup-search-vertical-slice-output}.md) | `docs/**` | none | byte-identical (check 8) |
| `CLAUDE.md` | repo root `CLAUDE.md` | none | byte-identical |
| `AGENTS.md` | repo root `AGENTS.md` | none | byte-identical |
| `tests/phrase-search.test.ts` | `src/tests/phraseSearch.test.ts` | `node:test`/`assert` → `vitest` `describe`/`it`/`expect` | 10/10 cases pass (check 5, 10) |

New, not a port:

- `src/components/PhraseLookupTab.tsx` — the Task 4 smoke surface, written fresh per spec, not copied from chordsense (chordsense's `components/phrase-lookup/PhraseLookup.tsx` was explicitly excluded).

## Files deliberately not ported

- `app/lookup/page.tsx` — Next.js App Router route, no equivalent needed
- `components/phrase-lookup/PhraseLookup.tsx` — the real UI; superseded by the Loop 008 smoke surface, real build is Loop 006
- `tsconfig.test.json` — chordsense's `node:test` config, irrelevant under vitest
- `README.md`, `scripts/README.md` — chordsense-specific
- `.gitignore` edits — chord-selector-app's `.gitignore` already has no `lib/` rule (checked, confirmed no Loop 002 defect recurrence)
- Anything Next.js- or MDX-specific

## Other files inspected and why

- `/Users/b/dev/chordsense/docs/planning/loops/008-port-to-chord-selector-app.md` — the loop spec itself, cross-checked against the handoff for consistency (they agree)
- `/Users/b/dev/chord-selector-app/src/components/ByNameTab.tsx` — checked existing component style/conventions before writing `PhraseLookupTab.tsx`, to keep the smoke surface visually consistent without over-building it

## Verification results (all 14 checks)

| # | Check | Command | Result |
|---|---|---|---|
| 1 | Branch | `git rev-parse --abbrev-ref HEAD` | `phrase-lookup` — **PASS** |
| 2 | Ancestor of main | `git merge-base --is-ancestor origin/main HEAD` | exit 0 — **PASS** |
| 3 | `npm ci` | `npm ci` | "added 233 packages, and audited 234 packages in 3s" — **PASS** |
| 4 | No dependency added | `git diff --exit-code package.json package-lock.json` | exit 0 — **PASS** |
| 5 | Tests | `npm test` | "Test Files 2 passed (2)", "Tests 24 passed (24)" — 14 pre-existing chordVoicings + 10 ported phraseSearch — **PASS** |
| 6 | Build | `npm run build` | "✓ 1692 modules transformed... ✓ built in 704ms" — **PASS** (pre-existing `fs`/`path` externalization warnings from `chordDatabase.ts`, unrelated to this port) |
| 7 | Pure-module fidelity | `diff` on each `src/lib/music/*.ts` vs chordsense original | no differences, all three — **PASS** |
| 8 | Docs fidelity | `diff` on every file under `docs/` vs chordsense original | no differences across all 17 files — **PASS** |
| 9 | Purity | `grep -rniE "react\|document\|window\|fetch\|node:" src/lib/music/` | no output — **PASS** |
| 10 | Assertion count | `grep -c "^  it(" src/tests/phraseSearch.test.ts` | `10` — **PASS** |
| 11 | Regression (browser) | Loaded dev server, clicked By Key (selected C Major, chord chips rendered) and By Name (search box present, empty-state message shown) | both tabs function — **PASS** |
| 12 | Smoke surface (browser) | Loaded Phrase Lookup tab | rendered "Fixture query: [F#4+F#5] → [C#5] → [E5] — 2 matches", "Measure 12, beat 1 ...", "Measure 27, beat 1 ..." — **PASS**, exact required output |
| 13 | Source untouched | re-ran Task 1 commands in chordsense | `git status --short`, `git log --oneline -3` identical to Task 1; `git status -sb` still `ahead 2` — **PASS** |
| 14 | Nothing pushed | `git rev-parse --abbrev-ref --symbolic-full-name @{u}` | "fatal: no upstream configured for branch 'phrase-lookup'" (exit 128) — no remote tracking branch exists — **PASS** |

## Test conversion: node:test → vitest, case by case

All 10 cases preserved 1:1, same assertions, same order, wrapped in a single `describe('phrase search', ...)` block (matching the existing `chordVoicings.test.ts` style) instead of bare top-level `test()` calls.

| # | Source case name | Conversion |
|---|---|---|
| 1 | "the remembered query returns exactly measures 12 and 27 in order" | `test()` → `it()`; 3× `assert.deepEqual(...)` → 3× `expect(...).toEqual(...)` |
| 2 | "note order and duplicate notes inside a simultaneous group do not matter" | `test()` → `it()`; `assert.deepEqual` → `expect(...).toEqual(...)` |
| 3 | "group ordering matters" | `test()` → `it()`; `assert.deepEqual(..., [])` → `expect(...).toEqual([])` |
| 4 | "groups must be contiguous in the selected hand event stream" | `test()` → `it()`; `assert.deepEqual(..., [])` → `expect(...).toEqual([])` |
| 5 | "an event containing an extra note does not satisfy exact matching" | `test()` → `it()`; `assert.deepEqual(..., [])` → `expect(...).toEqual([])` |
| 6 | "hand selection prevents cross-hand matches" | `test()` → `it()`; 2× `assert.deepEqual` → 2× `expect(...).toEqual(...)` |
| 7 | "empty queries and queries with an empty group return no matches" | `test()` → `it()`; 2× `assert.deepEqual(..., [])` → 2× `expect(...).toEqual([])` |
| 8 | "a contiguous match can cross a measure boundary" | `test()` → `it()`; `assert.equal` (length, measure, beat) → `expect(...).toBe(...)` |
| 9 | "search does not mutate the piece or query inputs" | `test()` → `it()`; `structuredClone` calls kept as-is (native, available in vitest's jsdom env); `assert.deepEqual` → `expect(...).toEqual(...)` |
| 10 | "pitch labels use C4 = 60 with sharp spelling" | `test()` → `it()`; 5× `assert.equal` → 5× `expect(...).toBe(...)` |

No case was merged, split, reordered, dropped, or reworded. `assert.equal`/`assert.deepEqual` (Node's strict-mode equal/deepEqual under `node:assert/strict`) map to vitest's `toBe`/`toEqual` respectively without changing assertion semantics for the primitive/array/object values involved.

## Repair attempts

Zero. No check failed on first run; no repair cycle was needed.

## Stop rules triggered

None — reached `DONE` directly.

## Out-of-scope pressure encountered

None. The task boundaries were clear and the existing By Key/By Name components, `chordData.ts`, `chordDatabase.ts`, `KeyboardDiagram.tsx`, and config files (`vite.config.ts`, `vitest.config.ts`, `vercel.json`) were not touched. `App.tsx` and `Header.tsx` were edited only as explicitly scoped (adding the third tab), not refactored otherwise.

## Risks and open questions

- The chordsense working tree has uncommitted human edits (modified `docs/agent-handoff.md`, `docs/planning/loops/003-score-data-source-decision.md`, `docs/planning/product-loop-map.md`, plus several untracked doc files). This port copied from the on-disk state at the time of Task 2, which matches what Task 1 captured — but if those edits are later committed with different content, the ported `docs/` tree here will silently drift from chordsense's committed history. Not a defect of this loop, just a fact worth flagging.
- `npm audit` reports 10 vulnerabilities (8 high, 2 critical) in the existing dependency tree — pre-existing, unrelated to this port, not touched per the "no new/updated dependency" constraint.
- The Phrase Lookup smoke surface has no error handling for a missing/malformed fixture — acceptable given it's explicitly temporary and Loop 006 replaces it.

## Downstream consequences (recorded, not acted on)

- **Loop 005 is dead.** The Tailwind v3→v4 defect was chordsense-specific; chord-selector-app's Tailwind setup already works.
- **Loop 004 needs path and build revision.** Paths become `src/lib/music/`, and `.mxl` handling is now a Vite question, not a Next.js one. Its evidence and target numbers remain valid.
- **Loop 006 gets cheaper.** `src/components/KeyboardDiagram.tsx` already implements piano geometry at `C4 = 60` with white pattern `[0,2,4,5,7,9,11]` and black pattern `[1,3,6,8,10]`, plus active-note highlighting. It is display-only, with no click handling.

## Next recommended action

Accept current loop as complete.
