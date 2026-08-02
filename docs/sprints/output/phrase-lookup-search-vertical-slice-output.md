# Sprint Output: Phrase Lookup Search Vertical Slice

Loop spec: docs/planning/loops/001-phrase-lookup-search-vertical-slice.md
Handoff: docs/prompts/phrase-lookup-search-vertical-slice-handoff.md
Date: 2026-08-01
Executor: Codex
Terminal state: **DONE** (amended 2026-08-01; originally BLOCKED — see Amendment below)

## Summary

Attempted the transition from no phrase lookup capability to an interactive exact ordered-pitch lookup over a local development fixture. The pure search, fixture, /lookup interface, home-page link, and deterministic tests were implemented, and every automated verifier passed. Completion was initially blocked because no browser backend was available to perform the required interaction check. That check was subsequently executed by the macro layer against a human-hosted dev server and passed in full. See the Amendment.

## Task 0: Prompt Archive

- Archived prompt path: docs/prompts/phrase-lookup-search-vertical-slice-handoff.md
- Status: done; cmp -s docs/agent-handoff.md docs/prompts/phrase-lookup-search-vertical-slice-handoff.md exited 0, confirming byte-for-byte equality.

## Changed Files

| File | Change | In scope? |
|---|---|---|
| .gitignore | Ignored the TypeScript test build directory. | yes |
| app/page.tsx | Added the Phrase Lookup link. | yes |
| app/lookup/page.tsx | Added the /lookup route and metadata. | yes |
| components/phrase-lookup/PhraseLookup.tsx | Added the accessible client-side phrase builder, search controls, messages, results, and fixture notice. | yes |
| data/pieces/phrase-lookup-demo.ts | Added the labeled two-hand development fixture with intended matches and distractors. | yes |
| lib/music/types.ts | Added the phrase lookup domain model. | yes |
| lib/music/phrase-search.ts | Added pure normalized exact sliding-window search. | yes |
| lib/music/pitch-label.ts | Added pure MIDI-to-sharp-label conversion using C4 = 60. | yes |
| tests/phrase-search.test.ts | Added 10 deterministic search and pitch-label tests. | yes |
| tsconfig.test.json | Added the isolated CommonJS test compilation configuration. | yes |
| package.json | Added the dependency-free test script. | yes |
| docs/prompts/phrase-lookup-search-vertical-slice-handoff.md | Archived the active handoff verbatim. | yes |
| docs/sprints/output/phrase-lookup-search-vertical-slice-output.md | Recorded implementation and verification evidence. | yes |

## Verification Evidence

| Check | Command or method | Result | Evidence |
|---|---|---|---|
| Locked dependency restoration | npm ci | pass | Added 202 packages from the existing lockfile; package.json and package-lock.json were not changed by restoration. |
| Automated tests | npm test | pass | TypeScript compilation succeeded; Node TAP reported 10 tests, 10 passed, 0 failed. |
| Production build | npm run build | pass | Next.js 15.5.4 compiled, type-checked, generated 6 static pages, and listed /lookup as statically prerendered. |
| Patch whitespace | git diff --check | pass | Exited 0 with no output. |
| Working-tree inventory | git status --short | pass | Reported the expected visible scoped modifications/new paths plus the pre-existing untracked docs/ tree. The handoff-mandated lib/music files are omitted because the repository's pre-existing lib/ ignore rule matches them. |
| Development server | npm run dev | pass | Next.js reported ready at http://localhost:3000; the server was stopped after browser discovery failed. |
| Required /lookup interaction | In-app browser connection and browser backend discovery | not run (superseded — see Amendment) | Browser connection returned "No browser is available"; the prescribed discovery check returned an empty browser list ([]). No code-inspection substitute was used. |

Tests added cover the remembered matches at measures 12 and 27, order-independent and deduplicated notes within a group, group order, contiguity, exact group equality, hand filtering, invalid empty queries, cross-measure matching, input immutability, and sharp pitch labels with C4 = 60.

## Repair Attempts

Allowed attempts: 2
Used attempts: 1

| Attempt | Failure signal | Diagnosis | Change made | Result |
|---|---|---|---|---|
| 1 | npm run build rejected spread iteration over Set<number> under the repository's ES5 target. | normalizeNotes used syntax requiring downlevelIteration or an ES2015+ target. | Replaced spread over the Set with Array.from without changing semantics or compiler configuration. | The failed build rerun passed; the full automated verification set then passed. |

## Stop Rules Triggered

- BLOCKED (subsequently cleared): "the development server/browser interaction cannot be exercised with available tooling." The server ran, but the browser runtime exposed no usable browser backend.

## Additional Context Inspected

None. No optional repository context files were needed.

## Out-of-Scope Pressure

The build emitted optional dependency-data update suggestions during the initial failed run. No dependency or lockfile updates were made because they are outside this loop. No authoritative score data, rendering, playback, storage, service, or follow-on-loop work was attempted.

The pre-existing .gitignore rule for lib/ also matches the handoff-mandated lib/music files. Changing that rule was not allowed; the files were left present and functional without staging or force-adding them.

---

# Amendment — 2026-08-01, macro layer

Executed by: Cowork macro layer (Claude), not the loop's assigned executor.
Reason: the only outstanding item was an interaction check that Codex's environment could not run. The macro layer had a browser backend and a human-hosted dev server available.

## Independent re-verification of the automated claims

The macro layer does not accept an executor's self-report as evidence. These were re-run independently against the working tree.

| Check | Result | Evidence |
|---|---|---|
| npm test | pass | 10 tests, 10 pass, 0 fail, duration 29.9ms. Independently re-run, not quoted from the executor. |
| Search semantics probe | pass | Direct invocation of `findPhraseMatches` against the compiled fixture, outside the test suite. |

The semantics probe was written fresh rather than reusing the loop's own tests, to avoid confirming the tests with the tests:

| Probe | Result |
|---|---|
| Remembered query, right hand | 2 matches: m12 beat 1, m27 beat 1 |
| Same phrase transposed down one octave | 0 matches — register sensitivity holds |
| Query group with an extra note (F#4 + F#5 + G#5) | 0 matches — exact group equality holds |
| Two-group prefix only | 3 matches — the fixture contains a genuine distractor that the 3-group query correctly rejects |
| Remembered query, left hand | 1 match — distinct from the right-hand result set, so hand filtering discriminates rather than passing everything through |
| Following groups on match 1 | m12 beat 4 [C#5 + E5] → m13 beat 1 [B4] → m13 beat 2 [G#4] — crosses a measure boundary as specified |

The two-group-prefix result is the strongest single piece of evidence here: it shows the fixture's distractors are real and that the search is not simply returning every partial occurrence.

## Required /lookup interaction check — executed

Method: human ran `npm run dev` on the host machine; the macro layer drove Chrome against `http://localhost:3000/lookup` at a 1512x862 desktop viewport.

| # | Prescribed step | Result | Evidence |
|---|---|---|---|
| 1 | Select F#4 and F#5, add group, add C#5, add E5 | pass | Ordered query rendered `1. [F#4 + F#5]  2. [C#5]  3. [E5]` |
| 2 | Search, confirm exactly two results in order m12 then m27 | pass | "2 results" — "Measure 12, beat 1" then "Measure 27, beat 1" |
| 3 | Each result includes a following-groups preview | pass | m12: `m. 12 beat 4: [C#5 + E5] → m. 13 beat 1: [B4] → m. 13 beat 2: [G#4]`. m27: `m. 27 beat 4: [D#5] → m. 28 beat 1: [B4 + E5] → m. 28 beat 2: [G#4]` |
| 4 | Undo removes the final query group | pass | Query became `1. [F#4 + F#5]  2. [C#5]`; results cleared |
| 5 | Clear resets selection, groups, results, messages | pass | Returned to "No pitches selected." and "No groups added yet." |
| 6 | Development-fixture notice visible | pass | "Development fixture: Development fixture only — these events are not authoritative Moonlight Sonata score data." rendered above the controls |

Additional acceptance criteria confirmed beyond the six prescribed steps:

| Criterion | Result | Evidence |
|---|---|---|
| Clear empty-query message | pass | Searching with no groups yields "Add at least one note group before searching." |
| Clear no-results message | pass | Query `[C4]` yields "No exact matches found in the development fixture." |
| Home page links to Phrase Lookup | pass | `/` renders a "Try Phrase Lookup" link to `/lookup` |
| Pitch buttons span C4–B5 | pass | 24 buttons, C4 through B5, all reachable in the accessibility tree |
| Accessible without text entry | pass | Entire query constructed via named buttons resolved from the accessibility tree, never by coordinate guessing |

## Terminal state

`BLOCKED` is cleared. All automated verifiers and all six prescribed interaction steps pass. **Terminal state: DONE.**

## Defects found during the interaction check

Neither fails a stated acceptance criterion. Both are recorded for the loop map rather than repaired here, because repairing them is outside this loop's allowed paths.

1. **Ordered query list renders doubled numbering, cosmetic.** The query displays as `1. 1. [F#4 + F#5]2. [C#5]3. [E5]` — an ordered list whose items also carry literal index labels, run together without separation. The information is correct and the acceptance criterion ("display the ordered query as chips or equivalent text") is met. Fix belongs to Loop 005, which replaces this input surface anyway.

2. **Tailwind utility classes are not applying anywhere in the application. Pre-existing, not caused by this loop.** Buttons, lists, and links render with browser defaults on `/lookup` *and* on `/`, which predates Loop 001. Base styles from `globals.css` do apply. This was verified by comparing both routes; attributing it to Loop 001 would be wrong.

## Risks and open questions

The `lib/music` tracking defect stands and is unchanged by this amendment: three required source files remain matched by `.gitignore:21:lib/`, confirmed with `git check-ignore -v`. This is the entire subject of Loop 002 and must be fixed by removing the rule, not by force-adding.

## Next Recommended Action

Accept current loop as complete.
