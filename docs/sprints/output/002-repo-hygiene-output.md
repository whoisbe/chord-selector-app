# Sprint Output: Repo Hygiene and First Commit

Loop spec: docs/planning/loops/002-repo-hygiene-and-first-commit.md
Handoff: docs/agent-handoff.md
Date: 2026-08-01
Executor: Codex
Terminal state: DONE

## Summary

Transitioned the repository from an uncommitted Loop 001 phrase-lookup slice with silently ignored `lib/music/` sources to two coherent local commits on `main`. All Loop 001 source files are tracked, the user-confirmed `data/spike/moonlight-sonata.mxl` belongs to the Loop 001 commit, the root README now describes Chordsense, and the Python chord-generator README survives byte-for-byte under `scripts/`. Nothing was pushed.

## Task 0: Prompt Archive

- Archived prompt path: `docs/prompts/sprint2-codex-repo-hygiene.md`
- Status: done; `cmp -s docs/agent-handoff.md docs/prompts/sprint2-codex-repo-hygiene.md` exited 0 with no output.

## Task 1: Pre-State Capture

`git status --short` (exit 0):

```text
 M .gitignore
 M app/page.tsx
 M package.json
?? app/lookup/
?? components/
?? data/pieces/
?? data/spike/
?? docs/
?? tests/
?? tsconfig.test.json
```

`git status --ignored --short | grep '^!!'` (exit 0):

```text
!! .DS_Store
!! .next/
!! .test-dist/
!! data/.DS_Store
!! lib/
!! node_modules/
```

`git log --oneline -3` (exit 0):

```text
f03a28e modify .gitignore
eadf238 Add Vercel configuration
83b0305 Fix TypeScript error in blog page
```

`git check-ignore -v lib/music/types.ts lib/music/phrase-search.ts lib/music/pitch-label.ts` (exit 0):

```text
.gitignore:21:lib/	lib/music/types.ts
.gitignore:21:lib/	lib/music/phrase-search.ts
.gitignore:21:lib/	lib/music/pitch-label.ts
```

The collapsed `?? data/spike/` entry expanded to `data/spike/moonlight-sonata.mxl`. Execution paused at the decision gate, and the user confirmed that this file belongs in the Loop 001 commit. It was committed unchanged.

## Commits

| Commit | Message | Contents |
|---|---|---|
| `71b2270` | `Add exact phrase lookup vertical slice` | Loop 001 application, fixture, user-confirmed score spike, pure search sources, and tests |
| `HEAD` | `Document repo hygiene and project identity` | Ignore-rule repair, README split, standing agent context, planning records, archived prompts, and sprint evidence |

Both commits are local on `main`; no push, tag, branch, remote, PR, or deployment action was performed.

## Changed Files

| File | Change | In scope? |
|---|---|---|
| `app/page.tsx` | Added the Phrase Lookup link from Loop 001. | yes |
| `app/lookup/page.tsx` | Added the lookup route from Loop 001. | yes |
| `components/phrase-lookup/PhraseLookup.tsx` | Added the Loop 001 lookup interface. | yes |
| `data/pieces/phrase-lookup-demo.ts` | Added the Loop 001 development fixture. | yes |
| `data/spike/moonlight-sonata.mxl` | Included unchanged in Loop 001 after explicit human provenance confirmation. | yes |
| `lib/music/types.ts` | Added the Loop 001 domain model and made it trackable. | yes |
| `lib/music/phrase-search.ts` | Added the Loop 001 pure phrase search and made it trackable. | yes |
| `lib/music/pitch-label.ts` | Added the Loop 001 pitch labelling and made it trackable. | yes |
| `tests/phrase-search.test.ts` | Added the Loop 001 deterministic tests. | yes |
| `tsconfig.test.json` | Added the Loop 001 isolated test compilation configuration. | yes |
| `package.json` | Added the Loop 001 dependency-free test script. | yes |
| `.gitignore` | Preserved Loop 001's `.test-dist/` rule and deleted only `lib/` and `lib64/`. | yes |
| `README.md` | Replaced the root Python-tool identity with the specified Chordsense README. | yes |
| `scripts/README.md` | Preserved the former root README byte-for-byte. | yes |
| `CLAUDE.md` | Added the specified durable cross-loop context. | yes |
| `AGENTS.md` | Added content identical to `CLAUDE.md`. | yes |
| `docs/agent-handoff.md` | Committed the active governance handoff. | yes |
| `docs/planning/loops/001-phrase-lookup-search-vertical-slice.md` | Committed the accepted Loop 001 spec. | yes |
| `docs/planning/loops/002-repo-hygiene-and-first-commit.md` | Committed the active Loop 002 spec. | yes |
| `docs/planning/loops/003-score-data-source-decision.md` | Preserved and committed the pre-existing planning document without editing it. | yes |
| `docs/planning/product-loop-map.md` | Preserved and committed the pre-existing product loop map without editing it. | yes |
| `docs/prompts/phrase-lookup-search-vertical-slice-handoff.md` | Committed the Loop 001 archived handoff. | yes |
| `docs/prompts/sprint2-codex-repo-hygiene.md` | Archived this handoff byte-for-byte. | yes |
| `docs/sprints/kickoff/sprint2-repo-hygiene.md` | Preserved and committed the pre-existing Sprint 2 kickoff without editing it. | yes |
| `docs/sprints/output/phrase-lookup-search-vertical-slice-output.md` | Committed the accepted Loop 001 evidence. | yes |
| `docs/sprints/output/002-repo-hygiene-output.md` | Recorded Loop 002 implementation and verification evidence. | yes |

No application-behaviour file was edited during Loop 002.

## Verification Evidence

| # | Command | Result | Actual output |
|---|---|---|---|
| 1 | `git check-ignore -v lib/music/phrase-search.ts` | pass | Exit 1; no output. |
| 2 | `git ls-files lib/music/` | pass | `lib/music/phrase-search.ts`, `lib/music/pitch-label.ts`, `lib/music/types.ts`, and no other paths. |
| 3 | `git check-ignore -v node_modules .next .test-dist` | pass | All three matched: `node_modules/`, `.next/`, and `.test-dist/`. |
| 4 | `git ls-files --error-unmatch node_modules` | pass | Exit 1: `error: pathspec 'node_modules' did not match any file(s) known to git`. |
| 5 | `npm test` | pass | TAP: `tests 10`, `pass 10`, `fail 0`; exit 0. |
| 6 | `npm run build` | pass | Next.js 15.5.4 compiled, type-checked, generated 6 pages, and listed `○ /lookup` as prerendered static content; exit 0. |
| 7 | `git status --short` | pass | Exit 0; no output. |
| 8 | `git log --oneline -3` | pass | Output showed `Document repo hygiene and project identity`, `71b2270 Add exact phrase lookup vertical slice`, and `f03a28e modify .gitignore`. |
| 9 | `git show --stat HEAD` and `git show --stat HEAD~1` | pass | The two commit stats together list every Loop 001 changed-file entry, all three `lib/music/` sources, and the user-confirmed `data/spike/moonlight-sonata.mxl`. |
| 10 | `git status -sb` | pass | `## main...origin/main [ahead 2]`; no remote-visible action was taken. |
| 11 | `diff <(git show HEAD:scripts/README.md) <(git show f03a28e:README.md)` | pass | Exit 0; no output. |
| 12 | `git diff --check` | pass | Exit 0; no output. |

### Check 2 output

```text
lib/music/phrase-search.ts
lib/music/pitch-label.ts
lib/music/types.ts
```

### Check 3 output

```text
.gitignore:118:node_modules/	node_modules
.gitignore:192:.next/	.next
.gitignore:170:.test-dist/	.test-dist
```

### Check 5 output

```text
1..10
# tests 10
# suites 0
# pass 10
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

### Check 6 route evidence

```text
Route (app)                                 Size  First Load JS
┌ ○ /                                      127 B         102 kB
├ ○ /_not-found                            993 B         103 kB
├ ○ /blog                                3.46 kB         105 kB
├ ƒ /blog/[slug]                           127 B         102 kB
└ ○ /lookup                              2.58 kB         104 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Repair Attempts

Allowed attempts: 2
Used attempts: 0

No numbered verifier failed, so no repair attempt began. A zero-byte stale `.git/index.lock` blocked the first staging command; read-only inspection found no Git writer, the lock was removed with approval, and the identical staging command then succeeded. This was environment recovery before numbered verification, not a repair attempt.

## Stop Rules Triggered

- The Task 1 unknown-change decision gate triggered for `data/spike/moonlight-sonata.mxl` and was cleared by the user's explicit confirmation that it belongs in Loop 001.

No terminal stop rule remained active.

## Additional Context Inspected

None of the handoff's optional repository context files were inspected. A read-only expansion of `data/spike/` was used only to identify the exact path behind the collapsed status entry.

## Out-of-Scope Pressure

The production build suggested optional browser-data dependency updates. No dependency or lockfile update was made. No product behaviour, score ingestion, follow-on loop, remote, PR, or deployment work was attempted.

## Risks and Open Questions

The score-spike file is now tracked based on the user's explicit provenance decision. It remains separate from the labelled development fixture and was not inspected, edited, or asserted as authoritative score data in this loop.

## Next Recommended Action

accept current loop as complete.
