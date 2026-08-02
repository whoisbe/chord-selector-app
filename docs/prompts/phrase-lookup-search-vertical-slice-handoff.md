# Agent Handoff: Phrase Lookup Search Vertical Slice

Loop spec: `docs/planning/loops/phrase-lookup-search-vertical-slice.md`  
Prepared: 2026-08-01  
Sprint output: `docs/sprints/output/phrase-lookup-search-vertical-slice-output.md`

## 1. Goal

Implement one bounded vertical slice of Chordsense Phrase Lookup: exact ordered-pitch lookup over a local development fixture, with a small interactive `/lookup` route and deterministic tests.

The required state transition is from “no phrase lookup capability” to “a user can enter the remembered right-hand sequence `[F#4 + F#5] -> [C#5] -> [E5]`, find the two fixture occurrences at measures 12 and 27, and see a short textual preview of what comes next.”

This is a product-mechanics proof, not an authoritative transcription of Beethoven's Moonlight Sonata.

## 2. Context Files

Read these files before editing:

1. `docs/planning/loops/phrase-lookup-search-vertical-slice.md`
2. `package.json`
3. `tsconfig.json`
4. `app/page.tsx`
5. `app/layout.tsx`
6. `app/globals.css`
7. `.gitignore`

The repository does not currently contain `docs/planning/product-loop-map.md`; it is not required for this loop.

Optional context, to inspect only if needed to resolve a build or style mismatch:

- `tailwind.config.js`
- `postcss.config.js`
- `next.config.js`

Forbidden context for this loop:

- External Sightread or MuseTrainer source code
- External Moonlight Sonata MIDI, MusicXML, or transcriptions
- `data/comprehensive_chords.csv`
- `data/comprehensive_chords.txt`

Record any optional context inspected and the reason in the sprint output.

## 3. Constraints

- Preserve the search semantics frozen in the loop spec exactly.
- Use MIDI integers internally with `C4 = 60`; display sharp note names in the UI.
- Keep the search engine pure TypeScript with no React, DOM, network, or filesystem dependency.
- Treat the local phrase data as an explicitly labeled development fixture.
- Use the existing Next.js App Router, React, TypeScript, and Tailwind setup.
- Add no runtime or development package dependencies.
- Make the minimum edits needed for this loop.
- Preserve any unrelated pre-existing working-tree changes.
- Do not claim the fixture reflects the actual notes at Moonlight Sonata measures 12 or 27.

## 4. Allowed Actions

Edits are restricted to these paths:

- `app/lookup/**`
- `components/phrase-lookup/**`
- `lib/music/**`
- `data/pieces/phrase-lookup-demo.ts`
- `tests/**`
- `app/page.tsx` only to add a Phrase Lookup link
- `package.json` only to add a `test` script; do not alter dependencies
- `tsconfig.test.json`
- `.gitignore` only to ignore the TypeScript test build directory
- `docs/prompts/phrase-lookup-search-vertical-slice-handoff.md`
- `docs/sprints/output/phrase-lookup-search-vertical-slice-output.md`

Environment preparation is allowed:

- Run `npm ci` if `node_modules/.bin/next` or `node_modules/.bin/tsc` is missing. This does not permit changing `package.json` or `package-lock.json`. If dependency restoration requires approval, request it through the execution environment.
- Start the local Next.js development server solely for the required interaction check, and stop it afterward.

Creating directories needed for allowed files is permitted.

## 5. Forbidden Actions

- Do not edit `package-lock.json` or add/update dependencies.
- Do not edit `README.md`, blog routes/content, Python scripts, chord datasets, Vercel configuration, or repository architecture documents.
- Do not add MusicXML or MIDI parsing, real score data, piano-roll rendering, playback, audio, MIDI hardware support, authentication, storage, analytics, API routes, server actions, or external services.
- Do not copy or adapt external project code.
- Do not add pitch-class, contains-note, fuzzy, approximate, or rhythm-aware matching.
- Do not refactor existing code outside the allowed paths.
- Do not commit, push, deploy, or create a pull request.

## 6. Implementation Tasks

Perform these tasks in order.

### Task 0: Archive This Handoff

Before implementation, create `docs/prompts/` if needed and copy the complete contents of `docs/agent-handoff.md` verbatim to:

`docs/prompts/phrase-lookup-search-vertical-slice-handoff.md`

The archive must be byte-for-byte identical to the handoff at the time execution begins.

### Task 1: Define the Domain Model and Pure Search

Create a small model under `lib/music/` with, at minimum:

```ts
type Hand = 'left' | 'right'

type NoteGroup = {
  measure: number
  beat: number
  hand: Hand
  notes: number[]
}

type PhraseQuery = {
  hand: Hand
  groups: Array<{ notes: number[] }>
}
```

Implement a pure sliding-window search that:

- filters the piece stream to the query hand while preserving event order;
- normalizes each group's notes by deduplicating and sorting;
- compares query groups contiguously and in order;
- requires exact group equality and exact register;
- returns every match, including measure and beat of the first matched group, the matched groups, and up to three following groups from the same hand;
- returns an empty array for an empty query or any query containing an empty group;
- does not mutate the query or piece data.

Keep pitch-to-label conversion in a separate pure helper and cover the `C4 = 60` convention.

### Task 2: Add the Development Fixture

Create `data/pieces/phrase-lookup-demo.ts` containing a short deterministic event stream for both hands.

Requirements:

- Include the exact right-hand sequence `[F#4 + F#5] -> [C#5] -> [E5]` twice, beginning at measures 12 and 27.
- Include following right-hand groups after both occurrences so the UI can show context.
- Include enough distractor events to prove the search is not returning every partial occurrence.
- Include left-hand events so hand filtering can be tested.
- Label the exported piece and its UI presentation as a development fixture, not score data.

Do not research or encode the real sonata in this task.

### Task 3: Build the `/lookup` Proof Surface

Create an accessible client-side lookup interface. It must support:

- a right/left hand selector, defaulting to right;
- labeled pitch buttons spanning at least `C4` through `B5` so the remembered phrase is enterable;
- toggling multiple pitches into the current simultaneous group;
- adding the current group to the ordered query;
- displaying the ordered query as note-group chips or equivalent text;
- undoing the most recently added group;
- clearing the current group, query, and results;
- running the pure search against the fixture;
- rendering all results in occurrence order with measure, beat, matched phrase, and up to three following groups;
- a clear empty-query message and a clear no-results message;
- a visible notice that this is development fixture data.

The UI may use labeled pitch buttons or a compact keyboard-like arrangement. Accurate piano-key geometry and a piano roll are explicitly not required.

Add a Phrase Lookup link to `app/page.tsx` without otherwise redesigning the home page.

### Task 4: Add Deterministic Tests Without Dependencies

Use Node's built-in `node:test` and the repository's existing TypeScript compiler. Add `tsconfig.test.json` that compiles only the pure music modules, fixture, and tests into `.test-dist/` using a Node-compatible module format. Add `.test-dist/` to `.gitignore`.

Add this package script or a functionally identical cross-platform script:

```json
"test": "tsc -p tsconfig.test.json && node --test .test-dist/tests/*.test.js"
```

Tests must cover:

1. the remembered query returns exactly two matches at measures 12 and 27 in order;
2. note ordering inside a simultaneous group does not matter;
3. group/event ordering does matter;
4. an event containing an extra note does not satisfy exact matching;
5. hand selection prevents cross-hand matches;
6. an empty query and a query containing an empty group return no matches;
7. a contiguous match can cross a measure boundary;
8. search does not mutate its inputs;
9. pitch labels observe `C4 = 60` and sharp spelling.

Do not test React rendering in this loop.

### Task 5: Verify and Record Evidence

Run every verifier in Section 7. If all pass, write the sprint output specified in Section 10 and end at `DONE`. Otherwise follow the repair policy and stop rules.

## 7. Verification Requirements

Run these exact automated checks from the repository root:

1. `npm test`
2. `npm run build`
3. `git diff --check`
4. `git status --short`

For the interaction check, run the development server and inspect `/lookup` in a browser at a desktop viewport:

1. Select `F#4` and `F#5`, add the group, add `C#5`, then add `E5`.
2. Search and confirm exactly two results appear in order: measure 12, then measure 27.
3. Confirm each result includes a following-groups preview.
4. Confirm undo removes the final query group.
5. Confirm clear resets the current selection, committed groups, results, and messages to the initial state.
6. Confirm the development-fixture notice is visible.

Capture the interaction result as a concise manual evidence note. A screenshot may be recorded if the available browser tooling supports it, but a screenshot is not mandatory.

For each check, record the command or method, pass/fail/not-run status, and relevant output in the sprint output. Do not substitute code inspection for a required check.

## 8. Repair Policy

- Initial implementation plus at most two repair attempts are allowed.
- A repair attempt begins only after a required verifier or interaction step fails.
- Each repair may edit only the allowed paths and must address the observed failure directly.
- Rerun the failed verifier after each repair; run the full verification set before declaring `DONE`.
- Do not weaken, delete, skip, or rewrite a valid test merely to obtain a pass.
- Do not add dependencies as a repair.
- Record the failure signal, diagnosis, change, and rerun result for every attempt.
- If verification still fails after two repair attempts, end at `FAILED_VERIFICATION`.

Restoring the locked dependencies with `npm ci` is environment preparation and does not consume a repair attempt. Failure to restore them is `BLOCKED`.

## 9. Stop Rules

Stop immediately and use the indicated terminal state if any condition occurs:

- `NEEDS_HUMAN_DECISION`: the frozen search semantics conflict with a newly discovered required behavior, or Task 0's source/target becomes ambiguous.
- `NEEDS_ARCHITECTURE_DECISION`: success requires choosing a MusicXML parser, real score schema, rendering technology, persistence model, or public API.
- `OUT_OF_SCOPE`: success requires editing a forbidden path, changing dependencies, fixing unrelated application behavior, or implementing an excluded feature.
- `BLOCKED`: required local tooling or locked dependencies cannot be made available, or the development server/browser interaction cannot be exercised with available tooling.
- `RISK_TOO_HIGH`: execution would require destructive, privileged, credentialed, or externally visible action not directly authorized by the user.
- `FAILED_VERIFICATION`: a required check still fails after the two permitted repair attempts.

Do not continue into MusicXML ingestion, authoritative score data, piano-roll visualization, or any follow-on loop after this loop reaches a terminal state.

## 10. Output Requirements

Write the evidence record to:

`docs/sprints/output/phrase-lookup-search-vertical-slice-output.md`

Use the bounded-handoff executor's sprint output template and include:

- exactly one terminal state;
- the attempted state transition and outcome;
- Task 0 archive path and byte-equality status;
- every changed file and whether it was in scope;
- all automated and interaction verification evidence;
- tests added;
- repair attempts used, including zero;
- stop rules triggered, if any;
- optional context inspected and why;
- out-of-scope pressure encountered;
- risks and open questions;
- exactly one next recommended action from the template's allowed list.

When the loop is `DONE`, the next recommended action must be “accept current loop as complete.” Do not propose or implement the next product loop in this output.
