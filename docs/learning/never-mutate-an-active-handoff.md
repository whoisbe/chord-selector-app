# Learning: never mutate an active handoff

Date: 2026-08-02
Source: Loop 010, `FAILED_VERIFICATION`
Layer: macro

## What happened

Codex began executing Loop 010 from `docs/agent-handoff.md`. Task 0 archived that file verbatim to `docs/prompts/sprint10-codex-typecheck.md`, as every handoff in this project requires.

Mid-execution, Codex hit a version mismatch — the spec's baseline was measured on TypeScript 5.9.3, and `npm install typescript` now serves 7.0.2 — and stopped to ask. That was correct.

The macro layer then **edited `docs/agent-handoff.md` in place** to answer: it revised the tsconfig block, added a version section, changed Task 2, and inserted a new verifier check `6b`.

Codex resumed against a contract that no longer matched what it had archived. Three checks then failed, none of them for anything Codex did:

1. **Task 0 archive** — `cmp` against the handoff fails by construction, because the source file changed after archiving.
2. **Check 1, baseline recorded** — the amendment retroactively demanded a TypeScript 7.0.2 pre-fix baseline, at a point already past.
3. **Check 6b** — added after Codex had already resolved the same underlying error a different, equally valid way.

Codex detected the amendment, declined to rewrite history or add a second commit (both forbidden by the contract), and reported `FAILED_VERIFICATION` honestly rather than claiming `DONE`. Its behaviour was exemplary. The loop's substantive goal was fully achieved.

## Why this is a real methodology failure

The byte-identical prompt archive exists precisely so a sprint's evidence can be tied to the exact contract that produced it. Editing the handoff during execution destroys that guarantee — and it does so silently, since the executor has no reason to re-read a file it already archived.

An execution contract is **immutable for the duration of a run**. That is not ceremony; it is the property that makes the evidence record meaningful.

## The rule

> **Once a loop starts, its handoff is frozen. Do not edit `docs/agent-handoff.md` while an executor is running against it.**

When an executor stops mid-run with a question the contract cannot answer:

1. Answer **in conversation**, not by editing the contract, when the answer fits inside the existing spec.
2. If the contract genuinely must change, **stop the loop**, amend the handoff, and **re-issue it as a fresh run** with a new Task 0 archive. Accept the cost of the restart.
3. Never add a verifier check mid-run. A check the executor could not have read is not a check; it is a retroactive trap.

## A second, separate error in the same incident

Check `6b` mandated a specific file — `src/vite-env.d.ts` — rather than the property that mattered: *no `TS2882` errors*.

Codex instead set `"types": ["vite/client"]` in `tsconfig.json`, which satisfies the invariant and, combined with `allowJs` and including `scripts`, also resolved the separate `.mjs` import error in one place rather than two.

**Its solution was better than the one the check demanded.**

Loop 009's spec had explicitly stated the principle — *"specify the invariant, not the implementation"* — and Loop 010's own spec repeated it. The macro layer then violated it one turn later, under time pressure, while unblocking an executor.

> **A verifier should assert the property, never the mechanism.** When a check names a filename, a function name, or a specific technique, ask whether the underlying property could be satisfied another way. If it could, the check is over-specified and will reject correct work.

## Cost

One loop marked `FAILED_VERIFICATION` whose work was entirely correct, plus the review effort to establish that. No code was lost and no wrong code shipped — but the sprint record required a macro-layer amendment to be truthful, which is exactly the kind of correction the archive was meant to make unnecessary.

## Related

- `docs/adr/0003-typescript-typechecking.md` — the version evidence that prompted the mid-run amendment
- Loop 001: a fixture authored to satisfy a model cannot falsify it
- Loop 004 → 009: a facet verified at rest was not verified in motion
- Loop 009 review: verify against `git show <sha>:<path>`, never a working-tree or staged snapshot

All four share a shape. Every check passed honestly, and the thing that mattered sat just outside the checks.
