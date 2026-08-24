# Loop Spec 002: Repo Hygiene and First Commit

Loop type: **Governance**
Status: engineered, awaiting executor assignment
Executor: TBD
Depends on: Loop 001 accepted
Blocks: Loop 003, Loop 005

## Trigger

Loop 001's slice exists only in the working tree, and `git check-ignore -v` confirms that three of its mandated source files are silently ignored. The repo cannot record its own work until this is fixed.

## Goal

Transition the repository from **"the Loop 001 slice exists but git cannot see all of it and nothing is committed"** to **"every Loop 001 source file is tracked, the slice is committed as a coherent unit, and the repo's root documentation names what this project actually is."**

## Starting state, verified 2026-08-01

- `.gitignore` line 21 is `lib/` and line 22 is `lib64/`, inherited from a Python packaging template.
- `git check-ignore -v lib/music/types.ts` returns `.gitignore:21:lib/`. Same for `phrase-search.ts` and `pitch-label.ts`.
- `find . -maxdepth 3 -type d -name lib` outside `node_modules` and `.next` returns exactly `./lib` and `./.test-dist/lib`. The latter stays ignored via the separate `.test-dist/` rule. **No other directory hides behind the `lib/` rule.**
- `git status --short` shows ` M .gitignore`, ` M app/page.tsx`, ` M package.json`, and untracked `app/lookup/`, `components/`, `data/pieces/`, `docs/`, `tests/`, `tsconfig.test.json`.
- `git log -1` is `f03a28e modify .gitignore` on branch `main`.
- `README.md` documents a Python chord generator. `scripts/` contains `chord_generator.py`, `chord_demo.py`, `analyze_chords.py`. Neither is wrong; the root README simply does not mention Chordsense.

## Target state

- `lib/music/*.ts` is tracked by git.
- `node_modules/`, `.next/`, `.test-dist/`, and Python artefacts remain ignored.
- The Loop 001 slice plus this loop's hygiene changes are committed on `main` in at most two commits, unpushed.
- The root `README.md` describes Chordsense. The Python chord generator documentation survives verbatim at `scripts/README.md`.
- `npm test` and `npm run build` still pass, unchanged in behaviour.

## Scope

In scope:

- `.gitignore` — removal of the `lib/` and `lib64/` lines only
- `README.md` — replacement
- `scripts/README.md` — new, verbatim copy of the current root README
- `CLAUDE.md`, `AGENTS.md` — new, containing the durable executor learning from Loop 001
- git operations: `add`, `commit`
- `docs/sprints/output/002-repo-hygiene-output.md`
- `docs/prompts/sprint2-<executor>-repo-hygiene.md`

Explicitly out of scope:

- Any change to `lib/music/`, `components/`, `app/`, `data/`, `tests/`, `tsconfig*.json`, `package.json`, `package-lock.json`
- Any other `.gitignore` line, including the duplicate `.next/` entries at lines 128 and 194
- `git push`, `git tag`, branch creation, remote configuration, PR creation, deployment
- Rewriting history, amending existing commits, `git rebase`, `git filter-branch`
- Any product feature work

## Verifier

Every check runs from the repository root. All must pass.

| # | Check | Passing result |
|---|---|---|
| 1 | `git check-ignore -v lib/music/phrase-search.ts` | exit code 1, no output |
| 2 | `git ls-files lib/music/` | exactly `lib/music/phrase-search.ts`, `lib/music/pitch-label.ts`, `lib/music/types.ts` |
| 3 | `git check-ignore -v node_modules .next .test-dist` | all three still matched by a rule |
| 4 | `git ls-files --error-unmatch node_modules 2>&1` | fails; node_modules is not tracked |
| 5 | `npm test` | 10 tests, 10 passed, 0 failed |
| 6 | `npm run build` | succeeds, `/lookup` prerendered |
| 7 | `git status --short` | empty output |
| 8 | `git log --oneline -3` | new commits present, `f03a28e` still reachable |
| 9 | `git show --stat HEAD` and `HEAD~1` | between them, every Loop 001 file from the sprint output's changed-files table appears |
| 10 | `git log origin/main..HEAD --oneline` or `git status -sb` | commits are local and unpushed |
| 11 | `diff <(git show HEAD:scripts/README.md) <(git show f03a28e:README.md)` | no differences |
| 12 | `git diff --check` | exit 0 |

Check 11 is the one that proves the README was moved, not rewritten. Check 4 is the one that proves loosening `.gitignore` did not open a floodgate.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- A repair begins only after a numbered verifier fails, and must address that specific failure.
- If `npm test` or `npm run build` fails, that is a signal the loop touched something out of scope. Revert the offending change rather than fixing forward.
- Never use `git add -f` to satisfy check 2. Force-adding hides the `.gitignore` defect instead of fixing it; if check 1 does not pass on its own, the loop has not done its job.
- Record failure signal, diagnosis, change, and rerun result for each attempt.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | all 12 verifier checks pass and the evidence record is written |
| `OUT_OF_SCOPE` | success appears to require editing a forbidden path or changing product behaviour |
| `NEEDS_HUMAN_DECISION` | removing `lib/` and `lib64/` would un-ignore a file outside `lib/music/`; or the working tree contains changes not attributable to Loop 001 |
| `RISK_TOO_HIGH` | success appears to require history rewriting, force-push, or any remote-visible action |
| `FAILED_VERIFICATION` | a required check still fails after 2 repair attempts |
| `BLOCKED` | git or npm tooling is unavailable |

## Escalation

`NEEDS_HUMAN_DECISION` specifically if the executor finds working-tree changes that Loop 001's sprint output does not account for. Committing an unknown change is worse than stopping.

## Memory and update behaviour

`CLAUDE.md` and `AGENTS.md` must be created with identical content, carrying only durable cross-loop facts, not this loop's instructions:

- the project frame in two sentences
- `C4 = 60`, MIDI integers internally, sharp spelling in the UI
- search code stays pure, no React/DOM/network/filesystem
- no new dependencies without an explicit decision
- fixture data is never asserted as score fact
- the Loop 001 learning: if a handoff's verifier needs a capability the executor may lack (browser, network, hardware), the handoff must say so up front and mark the check human-verified rather than letting it strand a finished loop

## Handoff artifact

At the end: `docs/sprints/output/002-repo-hygiene-output.md`, containing one terminal state, all 12 verifier results with actual command output, files changed, repair attempts used including zero, stop rules triggered, out-of-scope pressure, and exactly one next recommended action.
