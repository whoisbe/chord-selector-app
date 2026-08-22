# Agent Handoff: Read a Score at Runtime

**Assigned agent: Claude Code**
**Model: Opus 5 (`claude-opus-5`)** — this loop makes an architecture decision (where the ingestion lives, how the zip is read) and leaves four choices open in Section 11.
Loop spec: `docs/planning/loops/019-read-a-score-at-runtime.md`
Sprint: 19
Prepared: 2026-08-22
Sprint output: `docs/sprints/output/019-read-a-score-at-runtime-output.md`

Self-contained. Execute from this document alone. Do not rely on prior conversation.

Repository: `/Users/b/dev/chord-selector-app`, branch `phrase-lookup`. **Do not push. Do not merge to `main`.**

`npm run test:e2e` is a headless Playwright suite of 57 tests across four specs. **This loop must not change it or add to it.** One machine step may be needed once: `npx playwright install chromium`.

## 1. Why this is not "upload MusicXML"

The map carried "019 upload MusicXML" from the start. Loop 018 showed the name was wrong. **A file picker is the small half.**

`scripts/ingest-musicxml.mjs` constructs `new JSDOM()` inside itself, hardcodes its input path, its output path, and the export names `moonlightSonata` and `MOONLIGHT_SONATA_NAME` as literals in `renderArtifact`. It cannot read a `.mxl` at all — MuseScore's own download format — because `INPUT_PATH` points at an uncompressed `.musicxml` that exists only because a human extracted it by hand.

So the work splits:

- **This loop: make the app able to read a score at runtime.** No UI. It ends with a function that takes the bytes of a `.mxl` and returns a validated piece or a refusal a human can act on.
- **Loop 020: put a file picker in front of it.**

This loop is therefore verified **entirely by unit tests against two real files already in the repo**, with no browser.

## 2. Goal

> From "the piece is a TypeScript module generated on someone's laptop by a script that reads one hand-extracted file" to "the piece is produced by a function the app can call on the bytes of a MuseScore download, or refused with a reason."

## 3. The check that makes this loop honest

**The refactored parser, run on `data/spike/moonlight-sonata.mxl`, must produce a stream deep-equal to the committed `moonlightSonata` artifact.**

Not equivalent. Identical — same length, same order, same `measure`, `tick`, `beat`, `staves` and `notes` across all **823** groups.

That artifact is what every loop since 004 asserts against: the 55 / 16 / 43 / 8 / 6 counts, the B1–F#4 founding window, the m12 b4 match, the 78 occurrences of `[E4]`. Reproduce it exactly and the refactor provably changed nothing. Fail, and every downstream test has to be re-argued from scratch.

**This is the loop.** Everything else is scaffolding around it.

## 4. Measured facts, from Loop 018

| | Moonlight | Für Elise |
|---|---|---|
| File | `data/spike/moonlight-sonata.mxl` | `data/spike/beethoven-fur-elise-bagatelle-no-25-woo-59.mxl` |
| Encoder | MuseScore 2.0.3 | MuseScore 2.1.0 |
| Zip entry holding the score | `lg-30448188.xml` | `lg-76663811.xml` |
| Parts / staves | 1 / 2 | 1 / 2 |
| Pitched notes | 1,169 | 815 |
| Staff assignments inferred | **0** | **0** |
| Merged onsets | **823** | **598** |
| Measures | 69, numbered 1–69 | 106, numbered **0–105** |
| Pitch range | MIDI 29–87 | MIDI 33–100 |
| Distinct pitches | 55 | 56 |
| Divisions | 12 | 24 |
| Meter | 2/2 | 3/8 |
| Grace notes | 0 | 3 |
| Repeats / endings | 0 / 0 | **4 / 8** |

**The entry name inside the zip is arbitrary and must not be guessed.** `META-INF/container.xml` names it in `<rootfile full-path="…">`. Two files, two different names — that is the proof.

These figures were measured on 2026-08-22 against commit `6c41d39`. If anything you measure disagrees, **stop and report it** rather than adjusting a number to fit; a prior loop shipped against a stale measured table and it is written up in `docs/learning/measurements-expire.md`.

## 5. Frozen design

### 5a. The algorithm gets one implementation, not two

`parseRawNotes` currently builds its own DOM. It must instead **take an already-parsed XML document** and read from it. The browser hands it one from `DOMParser`; the script hands it one from `jsdom`; the tests hand it one from `jsdom`.

One algorithm, three callers, no second copy to drift. **A second implementation of the tick walk is the single worst outcome available in this loop** — it would look like success and rot silently.

`buildMergedGroups`, `buildStaffGroups` and the `(pitch, staff)` dedupe are already DOM-free and move across unchanged.

### 5b. Where it lives — and the purity check survives untouched

Loop 014's check 5 greps `src/lib/music/` case-insensitively for `react|document|window|fetch|jsdom` and requires no hits. **That check has real value and must not be relaxed or edited.**

**Put the ingestion in a new directory, `src/lib/musicxml/`, and leave `src/lib/music/` exactly as pure as it is.** This is not a workaround; it is the honest boundary. `src/lib/music/` holds pure functions over `NoteGroup[]`. `src/lib/musicxml/` turns a file into `NoteGroup[]`.

The document-taking parse function touches no global, so most of the new directory can carry the same purity property even though the directory as a whole does not.

### 5c. Reading the zip — prefer no dependency, but prove it

`.mxl` is a zip whose entries are deflate-compressed. Two routes:

1. **`DecompressionStream('deflate-raw')`** — native in browsers and in Node 22 — plus a small reader for the zip's local file headers. **Zero dependencies**, roughly sixty lines, testable against the two real files.
2. **A dependency.** `fflate` is small and dependency-free.

**Try route 1 first.** This project has added one dependency in eighteen loops. But hand-rolled binary parsing is a correctness risk, so route 1 is acceptable **only if it reads both committed `.mxl` files correctly and its failure modes are tested**. If it does not, take route 2 and record why — that is a legitimate outcome, not a failure.

**Do not hand-roll DEFLATE itself.** That is not what route 1 means.

### 5d. Validation exists to say no in a way you can act on

**The human has scoped this deliberately: the app may assume a MuseScore download. Validation's job is to refuse clearly, not to widen what the app accepts.** Do not write accommodation code for Finale, Sibelius, or optical recognition output.

Every refusal must name what is wrong and what was expected. **"Invalid file" is not a refusal; it is a shrug.**

Refuse, specifically:

| Condition | Because |
|---|---|
| Not a zip, or no `META-INF/container.xml` | it isn't a MuseScore `.mxl` |
| `container.xml` names no `<rootfile>` | the container is malformed |
| Root element is not `score-partwise` | `score-timewise` is legal MusicXML and this algorithm cannot read it |
| More than one `<part>` | Loop 018 finding 6 — extra parts are silently discarded today |
| No `<divisions>` anywhere | every tick is meaningless without it |
| Zero pitched notes | there is nothing to search |

Accept, and **carry a warning on the piece**:

| Condition | Warning |
|---|---|
| Any `<repeat>` or `<ending>` | what comes next follows the written page, not the performance |

The repeat warning is a decision the human made explicitly. Modelling performance order would renumber measures and break every control Loops 016 and 017 built. Warning is what the app can honestly offer.

### 5e. The pickup measure

A first measure with `implicit="yes"` — Für Elise's `number="0"` — is **kept in the stream** and **excluded from the numeric bounds**.

- It is real music. Dropping it would tell the user something they remember is not in the piece.
- It is labelled **"Pickup"**, not "Measure 0", because that is what MuseScore draws.
- `measureBounds` must report **1 to 105** for Für Elise, so the jump control offers what the score offers.
- The piece describes itself as **"105 measures and a pickup"**, not 106.

Everything after the pickup already matches MuseScore's numbering exactly; only the boundary needed fixing.

**This changes `src/lib/music/measures.ts`, which is otherwise frozen.** The change is additive, and the existing behaviour on Moonlight must be provably unchanged.

### 5f. Beat labels are not fixed here

Loop 018 found `beat = 1 + tick / divisions` is a quarter-note position rather than the meter's beat, in **both** pieces. The human decided to leave it now that it is documented. **Do not change the `beat` field** — check 1 requires byte-identical output.

### 5g. No persistence, and this is the loop that will argue for it

A piece read at runtime disappears on reload. **That is still the contract.**

Reversing an eighteen-loop contract inside a feature loop is how contracts erode quietly. If uploading every session hurts, that is evidence, and evidence is how this project decides things. It gets its own loop or it does not happen.

## 6. Constraints inherited

**No Tailwind build step** — irrelevant here, since this loop touches no UI, and that is itself a check.

**The e2e suite must not change.** 57 tests, four specs. This loop adds none and breaks none.

## 7. Tasks

**Task 0.** Copy `docs/agent-handoff.md` verbatim to `docs/prompts/sprint19-claude-code-runtime-score.md`. Verify with `cmp -s`, record the exit code. **Check first that `docs/agent-handoff.md` is this Sprint 19 document** — in Sprint 17 it was still the previous sprint's contract, and archiving it would have preserved the wrong one.

**Task 1.** Extract the tick walk into a document-taking function in `src/lib/musicxml/`. The script imports it.

**Task 2.** Add `.mxl` reading via `META-INF/container.xml`, per Section 5c.

**Task 3.** Add validation and the repeat warning, per Section 5d.

**Task 4.** Add pickup-aware bounds in `src/lib/music/measures.ts`, per Section 5e.

**Task 5.** Unit-test all of it, including check 1 against the committed artifact and check 4 against Für Elise.

**Task 6.** Run Section 8, write the output, commit once.

## 8. Verification requirements

| # | Check | Passing result |
|---|---|---|
| 1 | **Artifact reproduced** | parsing `moonlight-sonata.mxl` through the new path is **deep-equal to the committed `moonlightSonata`** — 823 groups, every field |
| 2 | **The script still works** | `node scripts/ingest-musicxml.mjs` regenerates the artifact with **no diff** — `git diff --exit-code src/data/pieces/moonlight-sonata.ts` |
| 3 | **One implementation** | the tick walk exists **once**; the script imports it rather than repeating it |
| 4 | Für Elise parses | 598 onsets, 106 measures numbered 0–105, MIDI 33–100, 56 distinct pitches, **0 inferred staves** |
| 5 | Container is read | the rootfile name comes from `META-INF/container.xml`, not guessed — the two files' differing entry names are the proof |
| 6 | **Purity check untouched** | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing, and the check itself is unmodified |
| 7 | Parse takes a document | the parse function accepts a parsed XML document; it constructs no DOM and reaches for no global |
| 8 | Zip route recorded | either zero dependencies with both files read correctly, or a dependency with the reason stated |
| 9 | Refusals are specific | each Section 5d refusal names what was wrong and what was expected; no generic "invalid file" |
| 10 | Refusals are tested | each refusal has a test with a crafted input |
| 11 | Repeat warning | Für Elise loads **and** warns; Moonlight loads without a warning |
| 12 | Pickup kept | Für Elise's measure 0 is in the stream, with its onsets |
| 13 | **Pickup bounds** | `measureBounds` reports **1 to 105** for Für Elise and **1 to 69** for Moonlight |
| 14 | Pickup labelled | it renders as **"Pickup"**, not "Measure 0" — a pure label function, no component |
| 15 | Measure helpers unchanged | `measuresWithOnsets`, `onsetsInMeasure`, `adjacentMeasure`, `onsetKey` behave identically on Moonlight |
| 16 | `beat` unchanged | no change to `beat = 1 + tick / divisions` |
| 17 | No persistence | `grep -rn "localStorage\|sessionStorage\|indexedDB" src/` returns nothing |
| 18 | **No UI** | `git status` shows no file under `src/components/` changed |
| 19 | `npm run typecheck` | exits 0 under `strict`; no `any`, no ignore comments |
| 20 | `npm test` | all pass, existing **and** new |
| 21 | `npm run build` | succeeds |
| 22 | `npm run test:e2e` | all **57** pass, unchanged — this loop adds no e2e |
| 23 | **Vacuity** | break one new assertion, capture the failure verbatim, revert, confirm a clean tree |

**Check 1 is the loop.** Check 2 is its twin — a refactor that reproduces the artifact once but cannot regenerate it has moved the problem, not solved it. **Check 3 exists because two copies of the tick walk is the failure mode that would look like success.**

## 9. Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Never edit the committed `moonlight-sonata.ts` to make check 1 pass.** It is the oracle. If output differs, the refactor is wrong.
- Do not relax check 6 or edit Loop 014's purity check.
- Do not add a second copy of the tick walk to make the script simpler.
- Do not add UI to make something testable.
- Do not broaden a refusal message to make its test pass.
- Never silence a type error with `any`, `@ts-ignore`, or `@ts-expect-error`.

## 10. Forbidden actions

- **All UI** — no file input, no drag-and-drop, no error surface, no piece switching. That is Loop 020.
- Editing the committed `moonlight-sonata.ts`, `onset-range.ts`, `phrase-search.ts`, `continuations.ts`, or anything under `src/components/`
- Changing the `beat` computation, the 12-result cap, or the 6-onset disclosure threshold
- Expanding repeats into performance order
- Any persistence
- Editing `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `vercel.json`, `KeyboardDiagram.tsx`, `ByKeyTab.tsx`, `ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`
- Adding or changing an e2e test
- `git push`, merging to `main`, rewriting history
- Writing anything in `/Users/b/dev/chordsense`

## 11. Decisions left to you — record each with reasoning

- **Zip route** — native `DecompressionStream` or a dependency. Try native first; record which and why.
- **The shape of the result type** — a discriminated union of piece and refusal, exceptions, or something else. One caller today (the script), one tomorrow (Loop 020's UI); pick for that.
- **Whether warnings live on the piece or beside it**, given Loop 020 must render them.
- **How the pickup is represented** — a flag, a sentinel, or a derived predicate. Whatever survives `NoteGroup` staying as it is.

## 12. Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–23 pass, evidence recorded |
| `NEEDS_ARCHITECTURE_DECISION` | reproducing the artifact appears to require changing `src/lib/music/`'s purity contract or the `beat` computation |
| `NEEDS_HUMAN_DECISION` | check 1 fails and you believe the **committed artifact** is wrong rather than the parser |
| `OUT_OF_SCOPE` | success appears to require UI, persistence, or performance-order expansion of repeats |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report it.** Do not resume against an amended contract — a prior loop failed exactly that way. See `docs/learning/never-mutate-an-active-handoff.md`.

## 13. Output requirements

Write `docs/sprints/output/019-read-a-score-at-runtime-output.md`:

- exactly one terminal state
- the four Section 11 decisions and the reasoning for each
- Task 0 archive path and `cmp` exit code
- every changed file and whether it was in scope
- all 23 checks with **actual output** — for check 1, state how deep-equality was established and on how many groups; for check 4, quote the real counts
- **the vacuity-proof failure output, verbatim**, and confirmation it was reverted with a clean tree
- the exact refusal message for each Section 5d condition
- which zip route was taken and why
- the commit SHA
- repair attempts used, including zero
- stop rules triggered, if any
- out-of-scope pressure encountered — particularly any pull toward UI or persistence
- risks and open questions

When `DONE`, the next recommended action must be "accept current loop as complete."
