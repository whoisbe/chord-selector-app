# Sprint 14 output — Results as Onset Strips

Loop spec: `docs/planning/loops/014-onset-strips.md`
Handoff: `docs/agent-handoff.md`
Executor: Claude Code (Opus 5, `claude-opus-5`)
Branch: `phrase-lookup` — not pushed, not merged
Date: 2026-08-04

## Terminal state

**`DONE`** — checks 1–19 pass, evidence below.

Repair attempts used: **0**. The implementation passed every check on its first
run of the verifier. One defect was found and fixed by looking at the rendering
rather than by a failing check (see *Fix made from looking, not from a check*).

## Task 0 — prompt archive

Archive path: `docs/prompts/sprint14-claude-code-onset-strips.md`

```
$ cp docs/agent-handoff.md docs/prompts/sprint14-claude-code-onset-strips.md
$ cmp -s docs/agent-handoff.md docs/prompts/sprint14-claude-code-onset-strips.md
CMP_EXIT=0

b2376eb38bcf44d9bd3d61fda12bc7ee507eceaf37e1697a21584efc3c55a76f  docs/agent-handoff.md
b2376eb38bcf44d9bd3d61fda12bc7ee507eceaf37e1697a21584efc3c55a76f  docs/prompts/sprint14-claude-code-onset-strips.md
```

`cmp` exit code: **0**. The handoff did not change during execution.

## The four Section 11 decisions

### 1. SVG, not DOM

**Decision: SVG, one `<svg>` per onset.**

`PhraseKeyboard` uses absolutely positioned `<button>`s because every key there
is a real, focusable control — that was the point of Loop 006. Nothing in a
result strip is interactive, and the capped case puts **48–72 keyboards on
screen at once**, each spanning 32–37 keys. As DOM that is ~2,600 positioned
elements and, worse, a decision about whether they are focusable; as SVG it is
one element per drawn shape and no new focus targets at all.

SVG also made the accessible naming cleaner rather than harder: each sounding
note is a `<g role="img">` with its own name, so the strips are readable by
screen reader note-by-note without minting a single tab stop.

### 2. Reuse `keyLayout`, scaled at render

**Decision: reuse it unchanged, scale the coordinates on the way out.**

`keyLayout` is already pure and range-parameterised, and reusing it is what
makes an onset strip and the input keyboard agree about where a pitch sits — a
property worth more than any saving from a narrower variant. Its constants are
sized for the interactive surface (21px per white step), which is far too wide
for a strip, so `OnsetStrip.tsx` multiplies the returned coordinates by a
single `SCALE`. The layout stays the one source of truth for relative position;
only absolute size changes.

Scale chosen: **14px per white key** (`SCALE = 14/21`). The handoff sized the
worst case at 12px → ~252px; 14px puts it at ~294px, still comfortably inside
the container once rows wrap, and it is the smallest size at which the two
staff markers stay tellable apart. Recorded as a deviation from an illustrative
figure, not from a measured one.

### 3. Marker shape

**Decision: upper staff = filled dot, lower staff = horizontal bar.** Both are
drawn in white on top of the note's coloured cap.

Dot versus bar is a shape contrast that survives greyscale, every colour-vision
deficiency, and the ~9px cap the marker has to live in. Hue (teal for upper,
burnt orange for lower) is carried as the *redundant* channel, not the carrier.

### 4. Wrap, not horizontal scroll

**Decision: wrap.**

A horizontal scroller would hide exactly the onsets the strip exists to let you
compare, and you cannot compare shapes you have to scroll between. Six onsets
at ~294px overflow the container, so `.onset-strip-onsets` wraps, at the
matched/following boundary first because each section is its own flex row. The
one horizontal scroller on this surface stays the input keyboard, which is a
single row that genuinely cannot wrap.

## Changed files

| File | In scope | What |
|---|---|---|
| `src/lib/music/onset-range.ts` | yes — `src/lib/music/**` for the range helper | **new.** `sharedPitchRange`, `whiteKeyCount`, `describePitchRange` |
| `src/lib/music/continuations.ts` | yes | added `containingOccurrences` — the onsets behind progressive disclosure |
| `src/components/phrase-lookup/OnsetStrip.tsx` | yes | **new.** the onset-keyboard renderer |
| `src/components/phrase-lookup/PhraseLookupSurface.tsx` | yes | text results → strips; disclosure; staff toggle; cap 20 → 12 |
| `src/styles/globals.css` | yes | hand-authored strip and toggle rules |
| `src/tests/onsetRange.test.ts` | yes — `src/tests/**` | **new.** 17 unit tests |
| `e2e/onset-strips.spec.ts` | yes — `e2e/**` | **new.** 11 Playwright specs |
| `docs/prompts/sprint14-claude-code-onset-strips.md` | yes | Task 0 archive |
| `docs/sprints/output/014-onset-strips-output.md` | yes | this file |

Nothing outside scope was touched. `phrase-search.ts`, `scripts/`, the
committed `moonlight-sonata.ts` artifact, `KeyboardDiagram.tsx`, the config
files and the nine pre-existing `data-testid` attributes are all unmodified —
the nine are still present, still unused by any test. No npm dependency was
added; `package.json` is unchanged.

`GroupByStaff` — the `matched: upper F#4 / lower F#3` component this loop
exists to replace — was deleted from `PhraseLookupSurface.tsx`.

## Verification — all 19 checks, with actual output

### 1. `npm run typecheck` — PASS

```
$ npm run typecheck ; echo $?
> tsc --noEmit
0
```

Exit 0 under `strict`. No `any`, no `@ts-ignore`, no `@ts-expect-error` was
added anywhere.

### 2. `npm test` — PASS

```
 Test Files  8 passed (8)
      Tests  97 passed (97)
```

Baseline before this loop was 7 files / 80 tests; the 17 new tests are
`src/tests/onsetRange.test.ts`. Every pre-existing suite still passes.

### 3. `npm run build` — PASS

```
$ npm run build ; echo $?
✓ 1699 modules transformed.
build/assets/index-4WXD5Ie6.js   343.06 kB │ gzip: 100.58 kB
✓ built in 702ms
0
```

### 4. `npm run test:e2e` — PASS

```
Running 22 tests using 5 workers
...
  22 passed (4.1s)
```

11 pre-existing specs plus 11 new ones. No retries, no flakes observed across
the four full runs made during this loop.

### 5. Purity — PASS

```
$ grep -rniE "react|document|window|fetch|jsdom" src/lib/music/
grep_exit=1   (no matches)
```

Worth flagging for the next executor: this grep is **case-insensitive and
matches substrings**, and `window` is the obvious name for what the new helper
computes. `src/lib/music/onset-range.ts` is named and worded around that
deliberately — it says "range" and "span" throughout, and carries a comment
saying why. A future edit that reintroduces the natural word will fail check 5
without the code being wrong.

### 6. Suite stays accessibility-first — PASS

```
$ grep -rn "getByTestId" e2e/
grep_exit=1   (no matches)
```

Every new locator is a role plus an accessible name. The two structural ones
are `getByRole('group', { name: 'Onset keyboard' })` for a whole keyboard and
`getByRole('img', { name: 'F#4, upper staff' })` for a single sounding note.

### 7. No fixed sleeps — PASS

```
$ grep -rn "waitForTimeout\|setTimeout" e2e/
grep_exit=1   (no matches)
```

### 8. Shared range — PASS *(the loop)*

Asserted on what the keyboards were drawn to, never by eye, at three levels.

**Unit**, on the computed range — `sharedPitchRange` collapses several
independent sets into one, is order-independent, and agrees with the
concatenation of its inputs.

**e2e, founding query** — all six keyboards report one distinct width:

```
✓ every onset keyboard on screen is drawn to one identical range (717ms)
   widths.length = 6, new Set(widths).size = 1
```

**e2e, at the cap** — the largest set the surface will ever draw at once:

```
✓ the shared range holds across all twelve capped results (605ms)
   widths.length > 12, new Set(widths).size = 1
```

The range is computed across **both** display sections at once, not per
section, because a phrase can be committed while a new group is part-way
assembled and both sets of strips are then on screen together.

### 9. Founding query range — PASS

Rendered text, verbatim from the page:

```
Same range on every keyboard: B1 to F#4, 19 white keys
```

**B1–F#4, 19 white keys** — exactly the measured figure. Confirmed
independently against the committed artifact before implementation began:
`B1(35)-F#4(66) white=19`.

### 10. Cap — PASS

```
✓ a one-note query reports all 78 occurrences and renders 12 (577ms)
```

Page reports `78 occurrences of [E4] — showing 12`; the occurrence list
contains exactly **12** `listitem`s. `MAX_RENDERED_RESULTS` went 20 → 12.

### 11. Disclosure, above threshold — PASS

`B1 + B2` → `13 onsets in the piece contain the current selection`, and:

- `getByRole('list', { name: 'Containing onset list' })` → count **0**
- `getByRole('group', { name: 'Onset keyboard' })` → count **0**

Count shown, no strips.

### 12. Disclosure, at threshold — PASS

`F#3 + F#4` → `6 onsets in the piece contain the current selection`, and:

- containing-onset list → **6** listitems
- onset keyboards → **24** (6 containing onsets × 1, plus 3 following each)
- `Same range on every keyboard: F#1 to F#4, 21 white keys`

Strips render before any group has been committed — which is the behaviour
change this check exists for.

### 13. Founding query result — PASS

```
✓ the founding query renders onset strips for the match at measure 12, beat 4
```

`1 occurrence of [F#3+F#4] → [C#4] → [E4]`, `Measure 12, beat 4`, **6** onset
keyboards, groups named `Matched onsets` and `Following onsets`, and the notes
of what comes next (`B3`, `D4`) individually named.

### 14. Single tone by default — PASS

With the toggle off:

- `getByRole('img', { name: /staff/ })` → count **0** — no accessible name
  anywhere carries a staff
- markers drawn across all keyboards (`circle, line`) → **0**

Neither the drawing nor the naming makes a staff claim unless asked.

### 15. Toggle on — PASS

`F#4` is engraved on the upper staff at measure 12 beat 4 and `F#3` on the
lower — the exact pair that misled. With the toggle on:

| Note | Accessible name | `circle` | `line` |
|---|---|---|---|
| F#4 | `F#4, upper staff` | **1** | 0 |
| F#3 | `F#3, lower staff` | 0 | **1** |

### 16. Toggle labelling — PASS

Control: `getByRole('switch', { name: 'Colour by staff' })` — it names staff,
never hands.

Caveat, present whenever strips are on screen, toggle on **or** off:

```
Staff is how the piece was written down. It does not always match which hand plays a note.
```

Legend, shown when the toggle is on:

```
Upper staff: dot marker. Lower staff: bar marker.
```

### 17. Session-only — PASS

```
$ grep -rn "localStorage\|sessionStorage\|indexedDB" src/
grep_exit=1   (no matches)
```

Plus a behavioural check, not just a grep: `the staff toggle resets on reload`
turns it on, calls `page.reload()`, rebuilds the selection, and asserts
`aria-checked="false"`.

### 18. Vacuity — PASS

Done twice: once against the assertion, once against the implementation.

**(a) Broke the assertion.** `toBe(1)` → `toBe(2)` in the shared-range spec:

```
  1) [chromium] › e2e/onset-strips.spec.ts:91:5 › every onset keyboard on screen is drawn to one identical range

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: 2
    Received: 1

       98 |
       99 |   expect(widths).toHaveLength(6);
    > 100 |   expect(new Set(widths).size).toBe(2);
          |                                ^
      101 | });
```

**(b) Broke the implementation** — the more informative of the two. Made each
keyboard compute its own range, `keyLayout(range.minPitch, range.maxPitch)` →
`keyLayout(Math.min(...group.notes), Math.max(...group.notes))`, which is
precisely the regression check 8 exists to catch. Both shared-range specs
caught it:

```
  1) [chromium] › e2e/onset-strips.spec.ts:91:5 › every onset keyboard on screen is drawn to one identical range

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: 1
    Received: 4

       98 |
       99 |   expect(widths).toHaveLength(6);
    > 100 |   expect(new Set(widths).size).toBe(1);
          |                                ^
      101 | });

  2) [chromium] › e2e/onset-strips.spec.ts:105:5 › the shared range holds across all twelve capped results

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: 1
    Received: 6

      116 |
      117 |   expect(widths.length).toBeGreaterThan(12);
    > 118 |   expect(new Set(widths).size).toBe(1);
          |                                ^
      119 | });

  2 failed
```

4 distinct ranges among 6 keyboards, and 6 among 48 — the strips would have
been decorative rather than comparable, and the suite says so.

**Both reverted.** `git status` shows no unintended modification, the reverted
lines were re-greped (`toBe(1)` at both sites, `keyLayout(range.minPitch,
range.maxPitch)` in `OnsetStrip.tsx`), the `test-results/` directory Playwright
wrote for the failures was removed, and the full suite was re-run clean
afterwards: **22 passed**.

### 19. Existing behaviour intact — PASS

All 11 pre-existing specs pass **unmodified** — `e2e/phrase-lookup.spec.ts` was
not edited by this loop. That covers every count named in the check:

| Count | Spec | Result |
|---|---|---|
| 55 | initial state | ✓ |
| 16 | selecting F#3 | ✓ |
| 43 | onsets containing F#3 | ✓ |
| 8 | adding F#4 | ✓ |
| 6 | onsets containing F#3+F#4 | ✓ |

Undo and clear-all likewise pass untouched.

## How the staff distinction avoids resting on colour alone

Three independent channels, only one of which is hue:

1. **Shape** — an upper-staff note carries a filled dot, a lower-staff note a
   horizontal bar. Drawn white on the note's cap, so both read in greyscale.
2. **Text** — the accessible name becomes `F#4, upper staff` / `F#3, lower
   staff`, and only while the toggle is on.
3. **Hue** — teal for upper, burnt orange for lower. Redundant, deliberately.

The e2e check asserts on **shape**, not colour: it locates a note by its
accessible name and counts the `circle` and `line` elements inside it. A change
that kept the two colours but dropped the markers would fail.

## New e2e tests

`e2e/onset-strips.spec.ts`, 11 specs:

| Test | Covers |
|---|---|
| the founding query renders onset strips for the match at measure 12, beat 4 | 13 |
| the founding query draws every keyboard on B1 to F#4, 19 white keys | 9 |
| every onset keyboard on screen is drawn to one identical range | 8 |
| the shared range holds across all twelve capped results | 8, at the cap |
| a one-note query reports all 78 occurrences and renders 12 | 10 |
| B1 plus B2 shows 13 containing onsets as a count, with no strips | 11 |
| F#3 plus F#4 renders strips for all 6 containing onsets before commit | 12 |
| with the toggle off no staff distinction appears in names or markers | 14 |
| turning the toggle on distinguishes staff by marker shape, not colour alone | 15 |
| the toggle names staff and carries the staff-is-not-hand caveat | 16 |
| the staff toggle resets on reload | 17 |

## Fix made from looking, not from a check

Every automated check passed before this was found. Rendering the surface and
looking at it showed that at measure 14 beat 3 the leftmost note label rendered
as `'#1` — a name centred on the outermost key of the range overruns the SVG's
left edge and is clipped. Labels now anchor to the edge instead of centring
when they would overrun. No check catches this, which is worth saying plainly:
the suite verifies naming, counts and the shared range, not legibility.

## Commit

One commit on `phrase-lookup`, not pushed, not merged:

- subject: **Render phrase-lookup results as onset strips**
- parent: `8ccc9d4` (*Add Playwright e2e suite for the phrase-lookup surface*)

The commit is identified here by subject and parent rather than by its own
hash, deliberately: this file is *inside* that commit, so any amend that
writes the hash in changes the hash. `git log -1 --format=%H` on
`phrase-lookup` is the authority. At hand-off it read `48c9260…`, and the
final amend that inserted this paragraph moved it once more.

Staged only the nine files listed above; the unrelated modified and untracked
docs already in the working tree when this loop began were left alone.

## Repair attempts

**Zero.** No check failed on a first run.

## Stop rules triggered

None. No measured number was unreachable, no dependency or persistence was
needed, and nothing pushed toward fuzzy matching or hand inference.

## Out-of-scope pressure encountered

**Hand inference — the real pull, and it is strong.** Every screenshot taken
during this loop shows it. At measure 13 beat 1, `{B1, B2}` and `{F#3, F#4}`
sit as two visually obvious clusters with a two-octave gap between them, and
the strip now makes that gap plain. The marker layer says F#3 is *lower staff*
while it is plainly part of the upper cluster a right hand takes. The temptation
to cluster by span and label the two groups as hands is immediate once results
are spatial — the picture practically asks for it. Not built, per Sections 13
and 15: a wrong hand assignment is worse than none because the user would
trust it, and it needs ground truth and an eval harness.

No pressure toward fuzzy matching arose. Progressive disclosure could have been
mistaken for it — showing "nearby" onsets before a group is committed — but
containment is exact set membership at exact register, and it reuses the same
`groupContainsAll` predicate Loop 011 introduced. Nothing was relaxed.

One small pull toward `getByTestId`: `data-testid="results"` already exists and
would have scoped several locators in one step. Not used; the specs scope by
named lists and groups instead, which is what forced the surface to name them.

## Risks and open questions

- **The purity grep bans the natural vocabulary.** Check 5 matches `window`
  case-insensitively inside `src/lib/music/`, which is the word the domain
  wants for what `onset-range.ts` computes. The module works around it and says
  so, but this will trip someone. Worth deciding whether check 5 should be
  anchored to imports rather than to any substring.
- **The cap is not adaptive.** 12 results is right for `[E4]`'s 78; for a query
  with 14 occurrences it hides two for no real benefit. Adaptive capping was
  not in scope.
- **Marker size at the low end.** At 14px per white key the markers are ~7px.
  They are distinguishable, and the e2e check asserts their presence
  structurally, but a narrower `SCALE` would make the shape contrast the
  accessibility argument depends on genuinely marginal. Treat 14px as a floor,
  not a default.
- **Two sections, one range, and a possible surprise.** Because the range spans
  both the committed-phrase results and the disclosure strips, starting a new
  selection can widen the range under the results already on screen. That is
  correct — they must stay comparable — but it means results can visibly
  rescale in response to something happening elsewhere on the page. No check
  covers it; nobody has used it in anger yet.
- **Staff is still a transcription fact.** Unchanged by this loop, as Section 15
  says. The toggle makes it opt-in, labelled, and off by default; it does not
  make it correct.

## Next recommended action

**Accept current loop as complete.**
