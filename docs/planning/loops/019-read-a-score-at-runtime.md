# Loop Spec 019: Read a Score at Runtime

Loop type: **Enabling**
Status: engineered, handed off
Executor: **Claude Code** (Opus 5, `claude-opus-5`) — assigned Sprint 19
Depends on: Loop 018 DONE
Blocks: Loop 020 (upload UI)

## Why this is 019 and not "upload MusicXML"

The map has carried "019 upload MusicXML" since Loop 001. Loop 018 showed that
name is wrong. **A file picker is the small half.**

The ingestion today is a build-time Node script that constructs `new JSDOM()`
inside itself, hardcodes its input path, its output path, and the export names
`moonlightSonata` and `MOONLIGHT_SONATA_NAME` as string literals in
`renderArtifact`. It cannot read a `.mxl` at all — MuseScore's own download
format — because `INPUT_PATH` points at an uncompressed `.musicxml` that exists
only because someone extracted it by hand.

So the work splits cleanly:

- **019 (this loop): make the app able to read a score at runtime.** No UI.
  Ends with a function that takes the bytes of a `.mxl` and returns either a
  validated piece or a refusal a human can act on.
- **020: put a file picker in front of it.** Drag-and-drop, error surface,
  switching the loaded piece, re-anchoring browse and results.

Splitting them means 019 can be verified **entirely by unit tests against two
real files already in the repo**, with no browser and no UI, and 020 becomes a
genuinely small UI loop instead of a UI loop with a parser hidden inside it.

## Goal

> From "the piece is a TypeScript module generated on someone's laptop by a
> script that only reads one hand-extracted file" to "the piece is produced by a
> function the app itself can call on the bytes of a MuseScore download, or
> refused with a reason."

## The check that makes this loop honest

**The refactored parser, run on `data/spike/moonlight-sonata.mxl`, must produce
a stream identical to the committed `moonlightSonata` artifact.**

Not "equivalent". Identical — same length, same order, same `measure`, `tick`,
`beat`, `staves` and `notes` on every one of the 823 groups.

That artifact is the foundation every loop since 004 has asserted against: the
55 / 16 / 43 / 8 / 6 counts, the B1–F#4 founding window, the m12 b4 match, the
78 occurrences of `[E4]`. If the new path reproduces it exactly, the refactor
provably changed nothing. If it does not, the refactor broke the product and
every downstream test would have to be re-argued from scratch.

This is the loop. Everything else is scaffolding around it.

## Measured facts from Loop 018

| | Moonlight | Für Elise |
|---|---|---|
| Encoder | MuseScore 2.0.3 | MuseScore 2.1.0 |
| Zip entry holding the score | `lg-30448188.xml` | `lg-76663811.xml` |
| Parts / staves | 1 / 2 | 1 / 2 |
| Pitched notes | 1,169 | 815 |
| Staff assignments inferred | 0 | 0 |
| Merged onsets | **823** | **598** |
| Measures | 69, numbered 1–69 | 106, numbered **0–105** |
| Pitch range | MIDI 29–87 | MIDI 33–100 |
| Distinct pitches | 55 | 56 |
| Divisions | 12 | 24 |
| Meter | 2/2 | 3/8 |
| Grace notes | 0 | 3 |
| Repeats / endings | 0 / 0 | **4 / 8** |

**The entry name inside the zip is arbitrary and must not be guessed.**
`META-INF/container.xml` names it in `<rootfile full-path="…">`.

## Frozen design

### The algorithm gets one implementation, not two

`parseRawNotes` currently builds its own DOM. It must instead **take a parsed
XML document** and read from it. The browser hands it one from `DOMParser`; the
script hands it one from `jsdom`; the unit tests hand it one from `jsdom`.

One algorithm, three callers, no second copy to drift. A second implementation
of the tick walk is the single worst outcome available in this loop.

`buildMergedGroups`, `buildStaffGroups` and the `(pitch, staff)` dedupe are
already free of the DOM and move across unchanged.

### Where it lives, and why the purity check survives untouched

Loop 014's check 5 greps `src/lib/music/` case-insensitively for
`react|document|window|fetch|jsdom` and requires no hits. That check has real
value and **must not be relaxed.**

**Put the ingestion in a new directory — `src/lib/musicxml/` — and leave
`src/lib/music/` exactly as pure as it is now.** The split is not a workaround;
it is the honest boundary. `src/lib/music/` holds pure functions over
`NoteGroup[]`. `src/lib/musicxml/` holds the messy business of turning a file
into `NoteGroup[]`.

The document-taking parse function itself touches no global, so most of
`src/lib/musicxml/` can carry the same purity property even though the
directory as a whole does not.

### Reading the zip: prefer no dependency, but prove it

`.mxl` is a zip whose entries are deflate-compressed. Two routes:

1. **`DecompressionStream('deflate-raw')`**, available natively in browsers and
   in Node 22, plus a small reader for the zip's local file headers. **Zero
   dependencies**, roughly sixty lines, and testable against the two real files
   in `data/spike/`.
2. **A dependency** — `fflate` is small and dependency-free.

**Try route 1 first.** This project has added one dependency in eighteen loops
and that record is worth something. But hand-rolled binary parsing is a
correctness risk, so route 1 is only acceptable if it reads **both** committed
`.mxl` files correctly and its failure modes are tested. If it does not, take
route 2 and record why — that is a legitimate outcome, not a failure.

Do **not** hand-roll DEFLATE itself. That is not what route 1 means.

### Validation exists to say no in a way you can act on

**The human has scoped this deliberately: the app may assume a MuseScore
download. Validation's job is to refuse clearly, not to widen what the app
accepts.** Do not write accommodation code for Finale, Sibelius or OMR output.

Every refusal must name what is wrong and what was expected. "Invalid file" is
not a refusal; it is a shrug.

Refuse, with a specific message:

| Condition | Because |
|---|---|
| Not a zip, or no `META-INF/container.xml` | It isn't a MuseScore `.mxl` |
| `container.xml` names no `<rootfile>` | The container is malformed |
| Root element is not `score-partwise` | `score-timewise` is legal MusicXML and this algorithm cannot read it |
| More than one `<part>` | Loop 018 finding 6 — today the extra parts are silently discarded |
| No `<divisions>` anywhere | Every tick is meaningless without it |
| Zero pitched notes | There is nothing to search |

Accept, and **carry a warning on the piece**:

| Condition | Warning |
|---|---|
| Any `<repeat>` or `<ending>` | What comes next follows the written page, not the performance |

The repeat warning is a decision the human made explicitly. Modelling
performance order would renumber measures and break every control Loops 016 and
017 built. Warning is what the app can honestly offer.

### The pickup measure

A first measure with `implicit="yes"` — Für Elise's `number="0"` — is **kept in
the stream** and **excluded from the numeric bounds**.

- It is real music; dropping it would tell a user that something they remember
  is not in the piece.
- It is labelled **"Pickup"**, not "Measure 0", because that is what MuseScore
  draws.
- `measureBounds` must report **1 to 105** for Für Elise, so the jump control
  offers what the score offers.
- The piece describes itself as **"105 measures and a pickup"**, not 106.

Everything after the pickup already matches MuseScore's numbering exactly;
only the boundary needed fixing.

**This changes `src/lib/music/measures.ts`, which is otherwise frozen.** The
change is additive — a pickup-aware bounds function — and the existing
`measuresWithOnsets`, `onsetsInMeasure`, `adjacentMeasure` and `onsetKey`
behaviour on Moonlight must be provably unchanged.

### Beat labels are not fixed in this loop

Loop 018 found that `beat = 1 + tick / divisions` is a quarter-note position
rather than the meter's beat, in **both** pieces. The human has decided to
leave it, now that it is documented. Do not fix it here. Do not change the
`beat` field — check 1 requires byte-identical output.

### No persistence, and this is the loop that will argue for it

A piece read at runtime disappears on reload. **That is still the contract.**

OPEN DECISION 10 is now genuinely live — re-dragging a file every session is a
much larger cost than re-scrolling — but reversing an eighteen-loop contract
inside a feature loop is how contracts erode quietly. **If uploading every
session hurts, that is evidence, and evidence is how this project decides
things.** It gets its own loop or it does not happen.

## Scope

In scope: `src/lib/musicxml/**` (new), `scripts/ingest-musicxml.mjs`,
`src/lib/music/measures.ts` (pickup bounds only), `src/lib/music/types.ts` (if a
piece-level type is needed), `src/tests/**`, plus prompt archive and output.

Out of scope: **all UI** — no file input, no drag-and-drop, no error surface,
no piece switching. That is Loop 020. A loop that quietly grows a UI is a loop
whose verification no longer matches its contract.

Also out of scope: the committed `moonlight-sonata.ts` artifact (it is the
oracle, not an editable file), `onset-range.ts`, `phrase-search.ts`,
`continuations.ts`, every phrase-lookup component, every config file, any
change to the `beat` computation, any persistence, performance-order expansion
of repeats.

## Verifier

| # | Check | Passing result |
|---|---|---|
| 1 | **Artifact reproduced** | parsing `moonlight-sonata.mxl` through the new path yields a stream **deep-equal to the committed `moonlightSonata`** — 823 groups, every field |
| 2 | **The script still works** | `node scripts/ingest-musicxml.mjs` regenerates `moonlight-sonata.ts` with **no diff** (`git diff --exit-code` on it) |
| 3 | **One implementation** | the tick walk exists **once**; the script imports it rather than repeating it |
| 4 | Für Elise parses | 598 onsets, 106 measures numbered 0–105, MIDI 33–100, 56 distinct pitches, **0 inferred staves** |
| 5 | `.mxl` read via container | the rootfile name is taken from `META-INF/container.xml`, **not** guessed or hardcoded — proven by both files having different entry names |
| 6 | **Purity check untouched** | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` returns nothing, and the check itself is unmodified |
| 7 | Parse takes a document | the parse function accepts a parsed XML document; it does not construct a DOM or reach for a global |
| 8 | Zip route recorded | either zero dependencies with both files read correctly, or a dependency with the reason stated |
| 9 | Refusals are specific | each Section refusal returns a message naming what was wrong and what was expected; no generic "invalid file" |
| 10 | Refusals are tested | each refusal has a test with a crafted input |
| 11 | Repeat warning | Für Elise loads **and** carries the repeat warning; Moonlight loads without it |
| 12 | Pickup kept | Für Elise's measure 0 is in the stream, with its onsets |
| 13 | **Pickup bounds** | `measureBounds` reports **1 to 105** for Für Elise and **1 to 69** for Moonlight |
| 14 | Pickup labelled | the pickup renders as **"Pickup"**, not "Measure 0" — as a pure label function, no component |
| 15 | Measure helpers unchanged | `measuresWithOnsets`, `onsetsInMeasure`, `adjacentMeasure`, `onsetKey` behave identically on Moonlight |
| 16 | `beat` unchanged | no change to `beat = 1 + tick / divisions` |
| 17 | No persistence | `grep -rn "localStorage\|sessionStorage\|indexedDB" src/` returns nothing |
| 18 | No UI | `git status` shows no file under `src/components/` changed |
| 19 | `npm run typecheck` | exits 0 under `strict`, no `any`, no ignore comments |
| 20 | `npm test` | all pass, existing **and** new |
| 21 | `npm run build` | succeeds |
| 22 | `npm run test:e2e` | all 57 pass, **unchanged** — this loop adds no e2e |
| 23 | **Vacuity** | break one new assertion, capture the failure verbatim, revert, confirm a clean tree |

**Check 1 is the loop.** Check 2 is its twin: a refactor that reproduces the
artifact once but cannot regenerate it has moved the problem rather than solved
it. **Check 3 exists because two copies of the tick walk is the failure mode
that would look like success.**

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- **Never edit the committed `moonlight-sonata.ts` to make check 1 pass.** It is
  the oracle. If output differs, the refactor is wrong.
- Do not relax check 6 or edit Loop 014's purity check.
- Do not add a second copy of the tick walk to make the script simpler.
- Do not add UI to make something testable.
- Do not paper over a failing refusal test by broadening the message.
- Never silence a type error with `any`, `@ts-ignore`, or `@ts-expect-error`.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–23 pass, evidence recorded |
| `NEEDS_ARCHITECTURE_DECISION` | reproducing the artifact appears to require changing `src/lib/music/`'s purity contract, or the `beat` computation |
| `NEEDS_HUMAN_DECISION` | check 1 fails and you believe the **committed artifact** is wrong rather than the parser |
| `OUT_OF_SCOPE` | success appears to require UI, persistence, or performance-order expansion of repeats |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

**If this handoff appears to change while you are executing, stop and report
it.** See `docs/learning/never-mutate-an-active-handoff.md`.

## Left to the executor

- **Zip route** — native `DecompressionStream` or a dependency. Try native
  first; record which and why.
- **The shape of the result type** — a discriminated union of piece and
  refusal, exceptions, or something else. It has one caller today (the script)
  and one tomorrow (Loop 020's UI), so pick for that.
- **Whether warnings live on the piece or beside it**, given Loop 020 must
  render them.
- **How the pickup is represented** — a flag on the piece, a sentinel measure
  number, or a derived predicate. Whatever survives `NoteGroup` staying as it is.

## After this loop

Loop 020 puts a file picker in front of it: drag-and-drop, the error surface
these refusals feed, switching the loaded piece, and re-anchoring browse and
results when it changes.

OPEN DECISION 10 comes due at the same time. A piece that vanishes on reload is
a much sharper version of a scroll position that vanishes on reload, and 020's
week of use is where that gets answered.
