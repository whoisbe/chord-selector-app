# Sprint 6 Output — Two-Row Virtual Keyboard Input

Loop: `docs/planning/loops/006-two-row-keyboard-input.md` (revision 2)
Handoff executed: `docs/agent-handoff.md`, archived verbatim at `docs/prompts/sprint6-claude-code-keyboard.md`
Agent: Claude Code (Opus 5, `claude-opus-5`)
Branch: `phrase-lookup`. Not pushed, not merged.
Date: 2026-08-02

## Terminal state

**`DONE`** — checks 1–16 all pass, evidence below.

Next recommended action: **accept current loop as complete.**

## Pre-flight

The handoff requires a browser for checks 11–16, and `CLAUDE.md` requires flagging a missing
capability *before* implementing. Browser backend availability was confirmed first: the Chrome
automation backend responded, and `http://localhost:3000` returned `200`. Only then did
implementation start. No check was ever substituted with code inspection.

The handoff on disk was read in full and matches the handoff given at invocation
(`shasum` `cac6a311fb71f46b8cf58690cee4171ba74bc500`, 220 lines). It did not change during
execution.

## Task 0 — archive

| Item | Value |
|---|---|
| Archive path | `docs/prompts/sprint6-claude-code-keyboard.md` |
| Command | `cp docs/agent-handoff.md docs/prompts/sprint6-claude-code-keyboard.md && cmp -s ...` |
| `cmp -s` exit code | **0** |

## Corpus facts re-derived before implementing

Every number the handoff quotes was re-measured against the committed
`src/data/pieces/moonlight-sonata.ts` rather than taken on trust. All confirmed:

| Handoff claim | Measured |
|---|---|
| 823 events | 823 |
| 119 distinct groups | 119 |
| 55 distinct pitches, MIDI 29–87 | 55, min 29, max 87 |
| staff 1 = 48–87, staff 2 = 29–64 | `{"1":[48,87],"2":[29,64]}` |
| `[66]` → 77 occurrences, 20 continuations | 77, 20 |
| `[54,66]` → 1 occurrence, continuation `61` on staff 2 | 1, `[61]`, staves `[2]` |
| `[54,66]→[61]` → continuation `64` on staff 2 | 1, `[64]`, staves `[2]` |

## The four decisions left open (Section 11)

### 1. SVG versus DOM → **DOM, absolutely-positioned real `<button>` elements**

Check 16 is the strictest verifier in this loop, and it is the one that decides the choice.
Native `<button>` gives focusability, tab order, Enter/Space activation, `aria-pressed`, and an
accessible name with nothing reimplemented. The SVG route would need `role="button"`,
`tabIndex`, and hand-rolled key handling on 118 elements to reach the same place, and every one
of those is a chance to reproduce exactly the failure the handoff warns about.

SVG's advertised advantages did not pay here. Responsive `viewBox` scaling buys little: the
layout is 719.5px and already fits the existing `max-w-7xl` container, and a horizontal scroll
container covers narrower viewports without scaling the keys to illegibility. Hit-testing across
59 keys is solved by z-index — black keys above white — the same way the reference component
does it, minus the `pointer-events-none`.

Alignment did **not** enter this decision, because it does not depend on it: check 7 makes it
structural. Both rows consume one `keyLayout` result.

### 2. Black-key x offsets → **boundary-midpoint placement**

Each black key is centred on the boundary between the two white keys either side of it, 12px
wide against the 20px white key / 1px gap. Two reasons. It is the placement the app's existing
keyboard already uses, so the new surface reads as native rather than as a foreign widget. And
with a uniform 21px white step it makes the 2-black/3-black grouping unmistakable, because the
E|F and B|C boundaries carry no black key at all — the resulting gaps *are* the spatial cue the
whole feature depends on.

Exact piano geometry (asymmetric offsets within each group of two and three) is more physically
faithful, but at 12px key width the difference is a pixel or two, and it would replace one line
of arithmetic with a lookup table — worse for the purity that checks 7 and 8 rest on.

### 3. Label policy → **C landmarks always, entered white keys, everything else on demand**

Every C is labelled on both rows at all times (`C2` … `C6`), as required. Entered white keys
also show their name. Every key without exception carries its full name in `title` (hover) and
in `aria-label` (assistive tech), and the current group and phrase are spelled out in text
below the keyboard.

Labelling all 118 keys inline was tried against the constraint and rejected: at 20px white and
12px black, permanent labels are illegible and they fight the spatial reading that is the point
of the surface. Landmarks give orientation; hover and the accessibility tree give exact naming
whenever it is actually wanted.

### 4. Simultaneous selection → **click-to-toggle, then explicit commit**

The safe default, as the handoff suggests, and it is also the only thing that expresses the
founding gesture: a cross-staff group needs two clicks on two different rows before it means
anything, so an explicit "Add group" is what makes "one onset" sayable at all. Toggling gives
free correction — click a key again to remove it — with no separate delete affordance.

The toggle rule itself is not in the click handler; it is `applyCapture` in the pure capture
module (see below).

## Files changed

| File | Change | In scope |
|---|---|---|
| `docs/prompts/sprint6-claude-code-keyboard.md` | new — Task 0 verbatim archive | yes (Task 0) |
| `src/lib/music/keyboard.ts` | new — pure geometry | yes (Task 1) |
| `src/tests/keyboardGeometry.test.ts` | new — 8 tests | yes (Task 1) |
| `src/lib/music/continuations.ts` | new — pure corpus queries | yes (Task 2) |
| `src/tests/continuations.test.ts` | new — 16 tests (continuations + capture) | yes (Task 2) |
| `src/lib/music/capture.ts` | new — pure input-capture seam | yes (Section 9, "Web MIDI must not be designed out") |
| `src/components/phrase-lookup/PhraseKeyboard.tsx` | new — two rows, three states, real buttons | yes (Task 3) |
| `src/components/phrase-lookup/PhraseLookupSurface.tsx` | new — selection, commit, undo, clear, results, messages | yes (Task 4) |
| `src/components/PhraseLookupTab.tsx` | rewritten — Loop 004 smoke surface replaced by the real thing | yes (Task 5) |
| `src/styles/globals.css` | appended — hand-authored keyboard rules | **not named by any task; see below** |
| `docs/sprints/output/006-keyboard-input-output.md` | this file | yes (Task 6) |

Nothing on the forbidden list was touched. `KeyboardDiagram.tsx`, `ByKeyTab.tsx`,
`ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`, `chordVoicings.test.ts`, `vite.config.ts`,
`vitest.config.ts`, `tsconfig.json`, `vercel.json`, `phrase-search.ts`, the ingestion script and
the committed `moonlight-sonata.ts` artifact are all unmodified. No npm dependency was added.

### Two departures worth naming explicitly

**A third pure module.** The handoff specifies two (`keyboard.ts`, `continuations.ts`). I added
`capture.ts` because Section 9 requires the capture path to be "a seam the component consumes,
not logic buried inside click handlers", and the natural home for a pure toggle rule is a pure
module rather than either of the other two — it is neither geometry nor corpus analysis. It is
pure, browser-free, and covered by the same purity check.

**`globals.css` was edited.** Not forbidden, but not requested either, and it needs
justification: `src/index.css` is a **checked-in, pre-compiled Tailwind v4 artifact** and this
project has no Tailwind build step in Vite. Utility classes not already compiled into that file
do not exist and fail silently. 19 of the classes I first used were in that category. The
alternative to hand-authored CSS was hand-editing a generated artifact, which is worse. The
appended block is scoped to three `phrase-*` class names and includes `:focus-visible`, which an
inline style cannot express at all. See the risks section.

## Verification — all 16 checks

Checks 1–4 and the browser checks were re-run after the final code change; the numbers below are
from those final runs.

| # | Check | Result | Actual output |
|---|---|---|---|
| 1 | `npm run typecheck` | **pass** | exit `0` under `strict: true` |
| 2 | `npm test` | **pass** | `Test Files 7 passed (7)` / `Tests 63 passed (63)` — the 39 pre-existing tests plus 24 new |
| 3 | `npm run build` | **pass** | exit `0`, `✓ 1697 modules transformed`, `✓ built in 733ms` |
| 4 | Purity | **pass** | `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` → no output, exit `1` |
| 5 | Key count | **pass** | `keyLayout(29,87).length = 59 | white = 34 | black = 25 | pixel width = 719.5` |
| 6 | Black-key identity | **pass** | keys disagreeing with `pitch%12 ∈ {1,3,6,8,10}`: `0`; black classes present `[1,3,6,8,10]`, white classes present `[0,2,4,5,7,9,11]` |
| 7 | Alignment by construction | **pass** | two calls: `JSON identical = true`, `same object reference = false`. First three keys `[{"pitch":29,"x":0,"width":20,"isBlack":false},{"pitch":30,"x":14.5,"width":12,"isBlack":true},{"pitch":31,"x":21,"width":20,"isBlack":false}]` |
| 8 | Ordering | **pass** | white x strictly increasing `true`, distinct white steps `[21]`, blacks bracketed by both white neighbours `24`, range-edge blacks `1` (D#6 — E6 is outside the range), violations `0` |
| 9 | Continuations collapse | **pass** | `[[54,66]]` → occurrences `1`, continuations `[61]`, byStaff `[{"pitch":61,"staves":[2]}]`. `[[54,66],[61]]` → occurrences `1`, continuations `[64]`, byStaff `[{"pitch":64,"staves":[2]}]` |
| 10 | Continuations breadth | **pass** | `[[66]]` → occurrences `77`, continuations **20** distinct of 55 pitches in the piece: `[32,35,36,37,44,47,48,49,55,56,57,59,60,61,63,67,68,69,71,72]` |
| 11 | Two rows render, aligned | **pass** | screenshot + measurement, below |
| 12 | Founding cross-staff entry | **pass** | 1 result, measure 12, beat 4 — full sequence below |
| 13 | Highlighting collapses | **pass** | exactly one available key, C#4, lower row — below |
| 14 | Search-as-you-type | **pass** | below |
| 15 | Undo and clear | **pass** | below |
| 16 | Accessibility | **pass** | below |

### Check 11 — two rows render, x-aligned

Screenshot evidence: both rows render the full MIDI 29–87 range, with the upper row dimmed
below C3 and the lower row dimmed above E4 (each row's own staff extent, read off the piece, not
hardcoded). Black-key columns line up vertically between the rows under visual inspection, and a
zoomed capture of the F#3–F#4 region confirms it at key level.

Measured, rather than eyeballed, over all 59 pitches:

```
totalKeyButtons: 118      (59 pitches × 2 rows)
tagNames:        ["BUTTON"]
misalignedPitches: 0      (pitches whose left or width differs between rows)
```

Sample probes (viewport px, `left` / `width`):

| Pitch | Upper row | Lower row |
|---|---|---|
| F1 (29) | 116 / 20 | 116 / 20 |
| F#3 (54) | 424.5 / 12 | 424.5 / 12 |
| C4 (60) | 494 / 20 | 494 / 20 |
| F#4 (66) | 571.5 / 12 | 571.5 / 12 |

### Check 12 — the founding cross-staff entry

Entry sequence performed with the mouse, in the running app:

1. Clicked **F#3 on the lower row** → readout `Current group: [F#3]`
2. Clicked **F#4 on the upper row** → readout `Current group: [F#3+F#4]`
3. Pressed **Add group** → `Phrase: [F#3+F#4]`, `1 occurrence of [F#3+F#4]`
4. Clicked **C#4 on the lower row** → `Current group: [C#4]`; pressed **Add group** → `Phrase: [F#3+F#4] → [C#4]`, `1 occurrence of [F#3+F#4] → [C#4]`
5. Clicked **E4 on the lower row** → `Current group: [E4]`; pressed **Add group**

Final result, verbatim from the page:

```
query:   "Phrase: [F#3+F#4] → [C#4] → [E4]"
count:   "1 occurrence of [F#3+F#4] → [C#4] → [E4]"
resultItems: 1
heading: "Measure 12, beat 4"

Measure 12, beat 4
matched
upper F#4
lower F#3
upper —
lower C#4
upper —
lower E4
then
upper F#4
lower B1 + B2 + F#3
upper —
lower B3
upper —
lower D4
```

**Exactly 1 result, measure 12, beat 4.** Matching was never relaxed to get there; the query is
the merged stream searched exactly, through the unmodified `findPhraseMatches`.

Note the matched group rendered across two rows: `upper F#4 / lower F#3` is the hand
distribution you need in order to actually play it — the third reason the handoff gives for two
rows existing.

### Check 13 — highlighting collapses

After committing `[F#3+F#4]` and nothing else:

```
availableCount: 1
available: [ { "label": "C#4, Lower row, available next", "pitch": 61, "staff": 2 } ]
```

**One key highlighted: C#4, on the lower row** — staff 2, as the corpus says. The on-screen
counter reads `1 possible next key highlighted`, and the screenshot shows the entire 118-key
instrument dimmed except that one key. After the next commit the same thing happens again:
`["E4, Lower row, available next"]`.

The breadth case behaves as measured too: with `[F#4]` committed, 20 keys light — 20 distinct
pitches, each on exactly one row, low ones on the lower row and high ones on the upper.

### Check 14 — search-as-you-type

Results updated at every `Add group` in the check 12 sequence with the Search button never
pressed: `1 occurrence of [F#3+F#4]` after commit 1, `1 occurrence of [F#3+F#4] → [C#4]` after
commit 2, `1 occurrence of [F#3+F#4] → [C#4] → [E4]` after commit 3.

The Search control was then pressed once as a fallback and is harmless — result unchanged:
`1 occurrence of [F#3+F#4] → [C#4] → [E4]`.

Result capping was verified on a broad prefix: `[F#4]` alone gives
`77 occurrences of [F#4] — showing the first 20`, with `renderedItems: 20`. True count shown, list
capped, no ranking.

### Check 15 — undo and clear

Undo, from the three-group state:

```
afterUndo1: query "Phrase: [F#3+F#4] → [C#4]", count "1 occurrence of [F#3+F#4] → [C#4]", items 1
```

The last committed group was removed and results recomputed.

Clear, from a state with two committed groups, a pending selection, and results on screen:

```
beforeClear: selection "Current group: [F#3]", query "Phrase: [F#3+F#4] → [C#4]", count "1 occurrence ..."
afterClear:  selection "Current group: nothing selected"
             query     "Phrase: empty"
             resultCount null
             emptyMessage "No groups entered yet. Select the keys of one onset on either row, then press Add group."
             notice null, items 0, entered keys 0, available keys 69
```

Selection, groups, results and messages all reset, and highlighting returned to the whole
corpus (69 = the per-row union across both rows of the 55 pitches in the piece).

Both messages were exercised: pressing Add group with nothing selected gives
`"Select at least one key on either row before adding a group."` (`role="status"`), and entering a
group that does not occur gives `"No occurrences of [F1+D#6] in this movement."`

### Check 16 — accessibility

Structural audit of all 118 keys in the live page:

```
keys: 118 | notButton: 0 | missingAccessibleName: 0 | notFocusable: 0
pointerEventsNone: 0 | nameHasNoteName: true | ariaPressedPresent: true
sample: "F1, Upper row, not available next, outside staff 1 range"
```

Every key is a real `<button>`, in the tab order, with an accessible name that begins with its
note name and states its row and its availability. No key is `disabled` or `aria-disabled`
(which would remove it from the tree), and nothing on the surface has `pointer-events: none` —
the `KeyboardDiagram` pattern the handoff singles out is absent.

**The founding query was then completed entirely from the accessibility tree**, with no
coordinate clicking. Each control was located by accessible name and activated by element
reference:

1. `find "F#3, Lower row"` → `ref_104` → activate
2. `find "F#4, Upper row"` → `ref_54` → activate → `Current group: [F#3+F#4]`
3. `find "Add group"` → `ref_138` → activate → `Phrase: [F#3+F#4]`
4. `find "C#4, Lower row"` → `ref_111` → activate; `ref_138` → activate
5. `find "E4, Lower row"` → `ref_114` → activate; `ref_138` → activate

Final state: `1 occurrence of [F#3+F#4] → [C#4] → [E4]`, `Measure 12, beat 4`.

Keyboard-only operation was verified separately, with no pointing device at all. From F#4 on the
upper row:

```
Tab    → focus moves to "G4, Upper row, available next"   (focus order follows pitch)
Return → "Current group: [F#3+F#4+G4]", focused "G4, Upper row, entered"
Space  → "Current group: [F#3+F#4]"                        (toggles back off)
```

Focus order runs low to high by pitch because the keys are emitted in pitch order and raised by
z-index rather than by DOM order.

## Repair attempts

Two repair cycles were used, of the two allowed. **Neither was triggered by a numbered check
failing** — both were caught during authoring and manual verification, before the check they
would have broken was recorded. Reported as repairs anyway, since the budget exists to be
accounted for honestly.

### Repair 1 — my own test asserted a false invariant at the range edge

- **Failure signal.** `keyboardGeometry.test.ts` → "places every black key between its
  neighbouring white keys": `AssertionError: expected undefined to be false`.
- **Diagnosis.** A defect in the test, not in `keyLayout`. The range's last key, D#6 (87), is
  black, so its upper white neighbour E6 (88) is outside the rendered range and
  `byPitch.get(88)` is `undefined`. The blanket assertion that every black key has two white
  neighbours is simply untrue at a range edge.
- **Change.** Assert the bracketing invariant on whichever neighbours exist, count the
  comparisons made, and assert the edge case explicitly (`byPitch.get(88) === undefined`).
- **Rerun.** `24 passed (24)`. Verified independently in check 8: 24 blacks bracketed on both
  sides, 1 range-edge black, 0 violations.

### Repair 2 — Tailwind utility classes that do not exist

- **Failure signal.** In the running app, the `C4` octave landmark rendered vertically centred
  inside the white key instead of at its foot, where the black key overlapping that key's right
  side clipped the "4". Measured: label at `top 241–250` against a black key ending at `249`,
  label right edge `512.5` against the black key starting at `508.5`.
- **Diagnosis.** Not a layout bug. `src/index.css` is a checked-in, pre-compiled Tailwind v4
  stylesheet (`/*! tailwindcss v4.1.3 */`) and there is no Tailwind plugin in `vite.config.ts`,
  so the available utility classes are frozen to whatever was compiled into that file. `absolute`
  and `pointer-events-none` happened to exist because other components use them;
  `bottom-1`, `inset-x-0` and `text-center` did not, so the span fell back to a button's default
  centred content. An audit of my two components against the compiled CSS found **19 missing
  classes** — including every `focus-visible:` ring, `overflow-x-auto`, `transition-colors`,
  `mt-2`, `p-3` and `space-y-6`.
- **Change.** Appended three hand-authored rules to `src/styles/globals.css`
  (`.phrase-keyboard-scroll`, `.phrase-key`, `.phrase-key-label`) covering positioning, the
  transition, and `:focus-visible` — which no inline style can express — and replaced every
  remaining missing class in both components with inline styles or with a class verified present.
  Notably `.phrase-key-label` puts the label at `bottom: 4px`, below the 48px black keys, so
  nothing can overlap it. Editing the generated `src/index.css` was rejected as the worse option.
- **Rerun.** Re-audited: 0 classes missing apart from the three hand-authored names. In the app,
  `C2`–`C6` landmarks render at the foot of the white keys on both rows, unclipped. Checks 1–4
  re-run after the change: all pass.

## Verification notes — one thing that looked like a bug and was not

The first attempt at check 12 produced `Current group: [G#3+G#4]` from clicks aimed at F#3 and
F#4 — every click landing exactly one black key to the right. This looked like a geometry or
hit-testing defect in the keyboard.

It was not. The browser automation tool's coordinate space is the screenshot (1456×830) while
the page viewport is 1512×862, a factor of 0.963. Verified from inside the page:
`document.elementFromPoint(431, 369)` returns `"F#3, Lower row, available next"` — the element
was exactly where the layout said it was, and my clicks were being scaled into the neighbouring
key. Converting the coordinates resolved it immediately, and the same clicks then landed
correctly every time.

Recorded because the first, wrong conclusion — "the keyboard's hit targets are off" — would have
sent a repair attempt at code that was already correct.

## Out-of-scope pressure encountered

**Reusing `KeyboardDiagram` — real pressure, resisted.** It already draws a piano at exactly the
20px/1px sizing this surface wanted, and the pull to add an `interactive` prop was genuine. It
was read closely and imported from not at all. What it could not have provided, concretely: no
interaction of any kind, a `pointer-events-none` black-key layer (the precise pattern check 16
exists to reject), a hardcoded two-octave range against the 59 keys needed, two visual states
against three, and chord-relative naming against absolute pitch. Making it serve both would have
put two shipping tabs at risk to save one file. The duplication is accepted, as instructed, and
is a finding for a future loop rather than something to fix here.

**Relaxed matching — the strongest pull, resisted.** The handoff predicted this correctly. The
moment the keyboard collapses to a single available key, the next thought is "what if he
misremembers the octave" — and the keyboard makes octave-shifting feel like a one-line change.
Nothing of the sort was added: no fuzzy, transposition-invariant, shape or relaxed matching, no
ranking, no scoring. Worth noting that this loop's real answer to the same problem is the
opposite one: corpus-constrained highlighting prevents the misremembered note at entry, so
relaxation has less to do. Fuzzy matching remains Loop 007's job, against an eval harness.

**Disabling unavailable keys — a smaller one, resisted.** Greying out keys that cannot follow is
the obvious UI move, and `disabled` would have expressed it in one attribute. It would also have
pulled 98 of 118 keys out of the accessibility tree and failed check 16. Availability is
conveyed through the visual state and the accessible name instead; every key stays operable.

Nothing else in the forbidden list came close: no MIDI adapter, no audio, no score rendering, no
computer-keyboard mapping, no key-aware enharmonic spelling, no new dependency.

## Commit

Commit SHA: **`1de04ff7eca70b4cb3f25d48e9c138e17ada666c`**
Message: `Replace phrase lookup with two-row keyboard input`
Exactly one commit was created on `phrase-lookup`. It was not pushed and nothing was merged to
`main`.

This output file is written after that commit so it can record the real SHA, and is therefore
uncommitted — the same convention loops 009 and 010 used.

Also left uncommitted, deliberately, because they were already modified in the working tree
before this loop began and are not this loop's work: `docs/agent-handoff.md`,
`docs/planning/loops/006-two-row-keyboard-input.md`, `docs/planning/product-loop-map.md`,
`docs/learning/`, `docs/sprints/kickoff/sprint6-keyboard.md`,
`docs/sprints/output/010-typescript-typechecking-output.md`. Traceability does not depend on
them: the Task 0 archive captures the executed handoff verbatim inside the commit.

One incidental repo action: a stale, empty `.git/index.lock` dated 35 minutes before any git use
in this session was blocking `git add`. No git process was running; it was removed.

## Stop rules triggered

None. `BLOCKED` was avoided because the browser backend was confirmed working before
implementation. `NEEDS_ARCHITECTURE_DECISION`, `OUT_OF_SCOPE` and `FAILED_VERIFICATION` were
never approached — no dependency was needed, the merged-stream contract was untouched, and the
pure geometry/continuations split held throughout.

## Risks and open questions

1. **`src/index.css` is a pre-compiled artifact with no build step.** This is the biggest
   standing hazard the loop uncovered, and it is not specific to this loop: *any* future agent or
   author who writes a Tailwind class not already in that file gets silent, invisible failure —
   no error, no warning, just a style that does not apply. It cost this loop a repair cycle. The
   durable fixes are to add `@tailwindcss/vite` (a dependency, so an ADR) or to record the
   constraint prominently. Recommended as a candidate for its own loop or an ADR.
2. **Highlighting keys off the committed prefix only, not the pending selection.** After
   selecting one note of a two-note group, the remaining keys are not narrowed to pitches that
   co-occur with it at that onset. Deliberate — it keeps check 13's semantics simple and the
   entry predictable — but the narrower behaviour would be strictly more helpful and is a clean
   follow-up.
3. **The staff→row mapping assumes exactly staves 1 and 2.** `possibleContinuationsByStaff`
   returns whatever staves the piece uses; the surface is where the two-row assumption lives. A
   three-stave piece would need that widened, not the pure module.
4. **The capture seam requires a row.** `PitchCapture.staff` is required, so a future MIDI
   adapter must choose a row for the pitches it reports — real hardware has no staff information
   and would need a split-point policy. The shape is deliberately usable, not free of that
   decision.
5. **Beat display rounds.** `beat` is a float derived from `tick`; the surface shows `3.67` for
   `3.6666…`. Display only, and `tick` remains the exact value, but a reader comparing against a
   score should know.
6. **The result list caps at 20 with the true count shown.** Which 20 is stream order, since
   ranking is forbidden. Fine for the founding query (1 result); less useful at 77.
7. **Duplication with `KeyboardDiagram` is now real and deliberate.** Two components know the
   same white/black pitch-class sets and the same 20px/1px sizing. If a third keyboard ever
   appears, that is the moment to extract — not before.
