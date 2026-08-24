# Agent Handoff: Repo Hygiene and First Commit

**Assigned agent: Codex**
Loop spec: `docs/planning/loops/002-repo-hygiene-and-first-commit.md`
Sprint: 2
Prepared: 2026-08-01
Sprint output: `docs/sprints/output/002-repo-hygiene-output.md`

This handoff is self-contained. Execute from this document alone. Do not assume you have read `CLAUDE.md`, `AGENTS.md`, or any prior conversation — neither of those two files exists yet, and creating them is one of your tasks.

## 1. Goal

Loop 001 built a phrase-lookup vertical slice. It was forbidden from committing, and it surfaced a defect it was forbidden from fixing.

The required state transition is from:

> the Loop 001 slice exists in the working tree, three of its source files are silently ignored by git, and nothing is committed

to:

> every Loop 001 source file is tracked, the slice is committed as a coherent unit on `main`, unpushed, and the root README names what this project actually is.

This is a governance loop. **You are not implementing product features.** Any change to application behaviour is a failure of this loop.

## 2. The defect, already diagnosed

`.gitignore` line 21 is `lib/` and line 22 is `lib64/`. Both come from a Python packaging template that predates the Next.js application. In a Next.js repo, `lib/` is a normal source directory.

Verified on 2026-08-01:

```
$ git check-ignore -v lib/music/types.ts
.gitignore:21:lib/	lib/music/types.ts
```

Same for `lib/music/phrase-search.ts` and `lib/music/pitch-label.ts`.

Also verified: outside `node_modules` and `.next`, the only directories named `lib` are `./lib` (the application source you need tracked) and `./.test-dist/lib` (which stays ignored via the separate `.test-dist/` rule at line 172). **Nothing else is hiding behind this rule.**

The fix is to delete lines 21 and 22. It is not to force-add the files.

## 3. Context files

Read before editing:

1. `docs/planning/loops/002-repo-hygiene-and-first-commit.md`
2. `docs/sprints/output/phrase-lookup-search-vertical-slice-output.md` — the changed-files table there is your inventory of what must end up committed
3. `.gitignore`
4. `README.md`
5. `package.json`

Optional, only if a verifier fails and you need to understand why:

- `docs/planning/product-loop-map.md`
- `docs/planning/loops/001-phrase-lookup-search-vertical-slice.md`

Record any optional context inspected, and why, in the sprint output.

## 4. Constraints

- Do not change application behaviour. Not one line of `lib/`, `app/`, `components/`, `data/`, or `tests/`.
- Do not touch `package.json`, `package-lock.json`, `tsconfig.json`, or `tsconfig.test.json`.
- Do not modify any `.gitignore` line other than 21 and 22, including the duplicated `.next/` entries at lines 128 and 194. They are untidy and they are not this loop's business.
- Do not rewrite history. No `amend`, `rebase`, `reset --hard`, `filter-branch`, or `push --force`.
- Do not push, tag, create branches, configure remotes, open a PR, or deploy.
- Preserve any working-tree change you cannot attribute to Loop 001 — see stop rules.
- `git add -f` is forbidden. It would satisfy the tracking check while leaving the defect in place.

## 5. Allowed actions

Edits restricted to:

- `.gitignore` — deletion of the `lib/` and `lib64/` lines only
- `README.md` — replacement, content specified in Task 3
- `scripts/README.md` — new file
- `CLAUDE.md` — new file
- `AGENTS.md` — new file
- `docs/prompts/sprint2-codex-repo-hygiene.md`
- `docs/sprints/output/002-repo-hygiene-output.md`

Git operations allowed: `status`, `log`, `show`, `diff`, `check-ignore`, `ls-files`, `add`, `commit`, `mv`.

Environment preparation allowed: `npm ci` if `node_modules/.bin/next` or `node_modules/.bin/tsc` is missing. This does not permit changing `package.json` or `package-lock.json`.

## 6. Forbidden actions

- `git add -f`, `git push`, `git tag`, `git branch`, `git remote`, `git rebase`, `git reset --hard`, `git commit --amend`
- Adding, removing, or updating any npm dependency
- Editing `lib/`, `app/`, `components/`, `data/`, `tests/`, `scripts/*.py`, `vercel.json`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`
- Deleting or weakening any test
- Any product feature work

## 7. Implementation tasks

Perform in order.

### Task 0: Archive this handoff

Copy the complete contents of `docs/agent-handoff.md` verbatim to:

`docs/prompts/sprint2-codex-repo-hygiene.md`

Must be byte-for-byte identical. Verify with `cmp -s` and record the exit code.

### Task 1: Record the pre-state

Before changing anything, capture and save into your sprint output:

```
git status --short
git status --ignored --short | grep '^!!'
git log --oneline -3
git check-ignore -v lib/music/types.ts lib/music/phrase-search.ts lib/music/pitch-label.ts
```

If `git status --short` shows any modified or untracked path **not** accounted for by the changed-files table in `docs/sprints/output/phrase-lookup-search-vertical-slice-output.md`, stop at `NEEDS_HUMAN_DECISION` and report the path. Do not commit changes of unknown origin.

### Task 2: Fix the ignore rule

Delete exactly the two lines `lib/` and `lib64/` from `.gitignore`. Leave the surrounding Python section otherwise intact.

Then confirm:

- `git check-ignore -v lib/music/phrase-search.ts` exits 1 with no output
- `git check-ignore -v node_modules .next .test-dist` still matches all three
- `git status --short` now shows `lib/` as untracked

### Task 3: Split the README identity

`scripts/README.md`: the current root `README.md`, copied verbatim. Do not edit its content — a verifier diffs it against the committed original.

Then replace the root `README.md` with exactly this:

````markdown
# Chordsense

Chordsense answers one question: *"I'm at the piano, I remember this fragment — what comes next?"*

You enter an ordered sequence of notes you remember. Chordsense finds every place that phrase occurs in a piece and shows you what follows. It is a reverse index over score data — not a practice app, notation editor, or playback engine.

## Status

Early. One vertical slice exists: `/lookup` performs exact, ordered, register-sensitive phrase search over a hand-authored development fixture.

There is no score ingestion yet. The fixture at `data/pieces/phrase-lookup-demo.ts` is development data and is **not** an authoritative transcription of any piece.

See `docs/planning/product-loop-map.md` for where this is going.

## Running locally

```bash
npm ci
npm run dev     # http://localhost:3000/lookup
npm test        # pure search tests, no test framework dependency
npm run build
```

## How search works

Semantics are frozen and deliberately strict:

- Notes are MIDI integers internally, `C4 = 60`. The UI shows sharp spellings.
- A note group is the set of notes sounding at one onset. Within a group, order and duplicates are ignored.
- Groups must match in order and be contiguous in the selected hand's event stream.
- Group equality is exact — a query group does not match an event that has extra notes.
- Register matters. Pitch-class-only matching is not supported.
- Rhythm and duration are ignored.
- Search is restricted to one hand at a time.
- A match may cross a measure boundary.

The search engine is pure TypeScript with no React, DOM, network, or filesystem dependency.

## Layout

| Path | Contents |
|---|---|
| `app/` | Next.js App Router pages, including `/lookup` |
| `components/phrase-lookup/` | The lookup interface |
| `lib/music/` | Pure domain model, search, and pitch labelling |
| `data/pieces/` | Development fixtures |
| `tests/` | Node `node:test` suites over the pure modules |
| `docs/planning/` | Product loop map and loop specs |
| `docs/sprints/` | Sprint kickoffs and evidence records |
| `scripts/` | Python chord-generation utilities, documented in `scripts/README.md` |

## Chord generator

This repository also carries a standalone Python chord-generation tool under `scripts/`, with its output in `data/`. It is independent of the Next.js application. Its documentation lives at [`scripts/README.md`](scripts/README.md).
````

### Task 4: Write the agent memory files

Create `CLAUDE.md` and `AGENTS.md` with **identical** content. These carry durable cross-loop facts only — never loop-specific instructions.

Write exactly this into both:

````markdown
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
````

### Task 5: Commit

Stage and commit in at most two commits on `main`. Suggested split:

1. the Loop 001 slice — `app/lookup/`, `components/`, `lib/music/`, `data/pieces/`, `tests/`, `tsconfig.test.json`, and the Loop 001 edits to `app/page.tsx` and `package.json`
2. the hygiene work — `.gitignore`, `README.md`, `scripts/README.md`, `CLAUDE.md`, `AGENTS.md`, `docs/`

Write real commit messages describing what changed and why. Do not push.

### Task 6: Verify and record

Run every check in Section 8. If all pass, write the sprint output and end at `DONE`.

## 8. Verification requirements

Run all twelve from the repository root and record the command, the pass/fail/not-run status, and the actual output for each.

1. `git check-ignore -v lib/music/phrase-search.ts` → exit 1, no output
2. `git ls-files lib/music/` → exactly `phrase-search.ts`, `pitch-label.ts`, `types.ts`
3. `git check-ignore -v node_modules .next .test-dist` → all three still matched
4. `git ls-files --error-unmatch node_modules` → fails
5. `npm test` → 10 tests, 10 passed, 0 failed
6. `npm run build` → succeeds, `/lookup` listed as prerendered
7. `git status --short` → empty output
8. `git log --oneline -3` → new commits present, `f03a28e` still reachable
9. `git show --stat HEAD` and `git show --stat HEAD~1` → between them, every file from the Loop 001 changed-files table appears
10. `git status -sb` → branch is ahead of / not synced with any remote; nothing pushed
11. `diff <(git show HEAD:scripts/README.md) <(git show f03a28e:README.md)` → no differences
12. `git diff --check` → exit 0

Check 11 proves the Python README was moved rather than rewritten. Check 4 proves loosening `.gitignore` did not open a floodgate. Neither may be skipped.

## 9. Repair policy

- Initial implementation plus at most 2 repair attempts.
- A repair begins only after a numbered check fails, and addresses that specific failure.
- If check 5 or 6 fails, you have touched something out of scope. **Revert the offending change** rather than fixing forward, and record it as out-of-scope pressure.
- Never satisfy check 2 with `git add -f`.
- Record failure signal, diagnosis, change made, and rerun result for every attempt.
- If a check still fails after 2 repairs, end at `FAILED_VERIFICATION`.

`npm ci` is environment preparation and does not consume a repair attempt.

## 10. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | all 12 checks pass and the evidence record is written |
| `NEEDS_HUMAN_DECISION` | the working tree contains a change Loop 001's output does not account for; or removing `lib/`/`lib64/` would un-ignore a file outside `lib/music/` |
| `OUT_OF_SCOPE` | success appears to require editing a forbidden path or changing product behaviour |
| `RISK_TOO_HIGH` | success appears to require history rewriting, force-push, or any remote-visible action |
| `FAILED_VERIFICATION` | a required check still fails after 2 repair attempts |
| `BLOCKED` | git or npm tooling cannot be made available |

Do not continue into Loop 003, score ingestion, or any product work after reaching a terminal state.

## 11. Output requirements

Write to `docs/sprints/output/002-repo-hygiene-output.md`:

- exactly one terminal state
- the attempted state transition and outcome
- Task 0 archive path and `cmp` exit code
- the Task 1 pre-state capture, verbatim
- every changed file and whether it was in scope
- all 12 verification results with actual output
- repair attempts used, including zero
- stop rules triggered, if any
- optional context inspected and why
- out-of-scope pressure encountered
- risks and open questions
- exactly one next recommended action

When `DONE`, the next recommended action must be "accept current loop as complete." Do not propose or begin the next loop.
