# Sprint 11 Output: Group-Wise Key Constraint

**Terminal state: `DONE`**

Next recommended action: accept current loop as complete.

## Section 6 design decision

Two constraints now compose (Section 3): sequence (Loop 006, unchanged) and co-occurrence
(new). A key can be dimmed for either reason, and they are genuinely different — a
sequence-blocked key can never follow the phrase at all; a co-occurrence-blocked key can
follow the phrase, just not alongside what is already picked for this chord.

**Decision: one dimmed visual treatment, two truthful accessible names, and one behavioural
difference — a co-occurrence dead end is a no-op to activate.**

Reasoning:

- Visually, a sighted user only needs "don't press this." A third colour/border state would
  require new CSS — this project has no Tailwind build step (`CLAUDE.md`), so anything not
  already compiled into `src/index.css` silently does nothing, and hand-authoring a third
  state in `globals.css` was judged not worth the risk for information a user does not act on
  differently either way.
- For assistive technology, the reason is worth surfacing for free: `accessibleName` now reads
  `"E4, Lower row, does not occur together with the current selection"` for a co-occurrence
  block, versus the existing `"not available next"` for a sequence block. This costs nothing
  in new styling and keeps every name truthful (Section 6's requirement).
- Loop 006 deliberately kept every key focusable and clickable, including sequence-blocked
  ones, specifically to keep the full key set in the accessibility tree (see its output doc,
  "Disabling unavailable keys — resisted"). Loop 011 does not revisit that decision for
  sequence blocks. But co-occurrence blocks are a new, stronger kind of dead end — Section 2's
  goal is explicitly "a dead-end group cannot be built" — so clicking one is now a no-op
  (`isDeadEnd` in `PhraseKeyboard.tsx`) rather than silently adding a pitch that can never
  match. The button stays in the DOM, stays focusable, keeps a truthful name; only the click
  handler declines to act. This satisfies check 12 (still focusable, still in the a11y tree)
  while satisfying the new check 11 (not activatable).

## Task 0 — archive

`docs/agent-handoff.md` copied verbatim to `docs/prompts/sprint11-claude-code-group-constraint.md`.
`cmp -s` exit code: **0**.

## Changed files

| File | In scope | Notes |
|---|---|---|
| `docs/prompts/sprint11-claude-code-group-constraint.md` | Yes (Task 0) | New, byte-identical archive |
| `src/lib/music/continuations.ts` | Yes (Task 1) | Added `currentSelection` param to `possibleContinuations` / `possibleContinuationsByStaff`, `groupContainsAll` helper. Pure — no new imports beyond the existing `normalizeNotes` |
| `src/tests/continuations.test.ts` | Yes (Task 2) | New `describe` block with checks 5–9 as fixtures |
| `src/components/phrase-lookup/PhraseKeyboard.tsx` | Yes (Task 3) | `UnavailableReason` type, `blockedByCoOccurrenceByStaff` prop, truthful reason in accessible name, dead-end click no-op |
| `src/components/phrase-lookup/PhraseLookupSurface.tsx` | Yes (Task 3) | Wires `selectionPitches(selection)` into the continuation calls, computes `blockedByCoOccurrenceByStaff`, updated the on-screen explanatory text |

Not committed (pre-existing working-tree state from before this loop started, same convention
noted in the Loop 006 output doc): `AGENTS.md`, `CLAUDE.md`, `docs/agent-handoff.md`,
`docs/planning/loops/006-two-row-keyboard-input.md`, `docs/planning/product-loop-map.md`,
`docs/learning/`, `docs/planning/loops/011-group-wise-highlighting.md`,
`docs/sprints/kickoff/sprint11-group-constraint.md`, `docs/sprints/kickoff/sprint6-keyboard.md`,
`docs/sprints/output/006-keyboard-input-output.md`, `docs/sprints/output/010-typescript-typechecking-output.md`.
This output file itself is written after the commit (so it can record the real SHA) and is
therefore also left uncommitted.

Forbidden files were not touched: verified none of `KeyboardDiagram.tsx`, `ByKeyTab.tsx`,
`ByNameTab.tsx`, `chordData.ts`, `chordDatabase.ts`, `chordVoicings.test.ts`, `vite.config.ts`,
`vitest.config.ts`, `tsconfig.json`, `vercel.json`, `phrase-search.ts`, `scripts/`, or
`moonlight-sonata.ts` appear in the diff.

## Verification — all 12 checks

### Check 1 — `npm run typecheck`

```
> Chord Selector Application@0.1.0 typecheck
> tsc --noEmit
```
Exit 0, zero output. **Pass.**

### Check 2 — `npm test`

```
Test Files  7 passed (7)
     Tests  72 passed (72)
```
72 = 63 pre-existing + 9 new (`continuations.test.ts` grew from 16 tests to 25). All pass,
none skipped. **Pass.**

### Check 3 — `npm run build`

```
> vite build
✓ 1697 modules transformed.
✓ built in 779ms
```
**Pass.**

### Check 4 — Purity

```
$ grep -rniE "react|document|window|fetch|jsdom" src/lib/music/
$ echo $?
1
```
No matches. **Pass.**

### Check 5 — Empty selection unchanged

```ts
possibleContinuations(moonlightSonata, []).length === 55
```
Actual: **55**. **Pass.**

### Check 6 — Single selection (F#3)

```ts
possibleContinuations(moonlightSonata, [], [54])
```
Actual:
```
[30, 32, 33, 35, 36, 37, 42, 44, 45, 47, 48, 61, 66, 68, 72, 73]
```
Matches Section 4 exactly. **Pass.**

### Check 7 — Cross-staff octave survives

```ts
possibleContinuations(moonlightSonata, [], [54]).includes(66)
```
Actual: **true** — 66 is present in the list above. Also confirmed live in the browser: after
clicking F#3, the accessible name of the F#4 key (upper row) read `"F#4, Upper row, available
next"`. **Pass.**

### Check 8 — Constraints compose

```ts
possibleContinuations(moonlightSonata, [{ notes: [54, 66] }])          // → [61]
possibleContinuations(moonlightSonata, [], [54, 66])                    // → 8 pitches
```
Actual:
```
[61]
[30, 33, 35, 36, 42, 45, 47, 48]
```
Both match Section 4 exactly. **Pass.**

### Check 9 — No false negatives

Test iterated all **823** groups in `moonlightSonata` (`expect(exercised).toBe(823)` — passed).
For each group, every prefix of its (deduplicated) note list was used as `currentSelection`,
and every pitch still to be selected in that group was required to appear in
`possibleContinuations(moonlightSonata, [], selectedSoFar)`.

**Failure count: 0.**

The property is monotonic and therefore this prefix-based test is exhaustive over selection
order, not just the one order tested: `groupContainsAll` only gets harder to satisfy as more
pitches are added to `currentSelection` (a group that contains a superset of required pitches
necessarily contains every subset too), so availability for a fixed target pitch can only
shrink as more of the same group's pitches are added — regardless of the order they were
added in. Testing the natural-order prefixes, ending at "every other pitch of the group
selected," covers the worst case for every pitch in every group. **Pass.**

### Check 10 — Founding query enterable (browser)

Entry sequence, executed entirely via `find`/element refs (no coordinate clicks on any key):

1. Click `"F#3, Lower row, available next"`
2. Click `"F#4, Upper row, available next"` — current group becomes `[F#3+F#4]`, 8 possible
   next keys highlighted (matches check 8)
3. Click "Add group" — phrase `[F#3+F#4]`, 1 occurrence, **Measure 12, beat 4**, 1 possible
   next key highlighted
4. Click `"C#4, Lower row, available next"`
5. Click "Add group" — phrase `[F#3+F#4] → [C#4]`, still 1 occurrence, **Measure 12, beat 4**
6. Click `"E4, Lower row, available next"`
7. Click "Add group" — phrase `[F#3+F#4] → [C#4] → [E4]`, still **1 occurrence, Measure 12,
   beat 4**

Result verbatim from the page:
```
1 occurrence of [F#3+F#4] → [C#4] → [E4]
Measure 12, beat 4
matched  upper F#4 / lower F#3    upper — / lower C#4    upper — / lower E4
then     upper F#4 / lower B1 + B2 + F#3    upper — / lower B3    upper — / lower D4
```
**Pass.**

### Check 11 — Dead end unreachable (browser)

After Clear all, clicked `"F#3, Lower row, available next"`. Re-read the accessibility tree:
the E4 key on the lower row now read `"E4, Lower row, does not occur together with the current
selection"`. Clicked it (via its element ref). Result: current group remained `[F#3]` — the
click was a no-op, E4 was not added. Screenshot confirmed "Current group: [F#3]" and "16
possible next keys highlighted" (matching check 6) after the click. **Pass.**

### Check 12 — Accessibility

Read the full interactive-element tree (`read_page`, filter `interactive`) after Clear all: 118
key buttons plus Add group / Undo last group / Clear all / Search, every key still a real
`<button type="button">` with a non-empty, truthful `aria-label` (verified names above and in
the raw tree dump — e.g. `"F1, Upper row, not available next, outside staff 1 range"`,
`"C3, Upper row, available next"`). No `disabled` or `aria-disabled` was added anywhere.

The founding query (check 10) was then re-run a second time using only element refs obtained
from `find`/`read_page` — F#3, F#4, Add group, C#4, Add group, E4, Add group — with zero
coordinate-based clicks, and produced the identical result: 1 occurrence, Measure 12, beat 4.
**Pass.**

## Repair attempts

**Zero.** Section 4's four numbers (55, 16, 8, `[61]`) were independently verified with a
from-scratch brute-force script before writing the real implementation (not reusing any of
`continuations.ts`'s own logic), confirming all four matched exactly once the rule "exclude
already-selected pitches from the result" was applied — the same rule the module's docstring
now states. The implementation, tests, wiring, and all 12 checks passed on the first pass.

## Stop rules triggered

None. Completed at `DONE`.

## Out-of-scope pressure encountered

**A third visual state for co-occurrence-blocked keys** — the natural instinct once two block
reasons exist. Resisted per Section 6 reasoning above: no new CSS class exists in the
pre-compiled `src/index.css`, hand-authoring one for a distinction only assistive tech needs
was judged unnecessary, and the accessible name carries the information at zero styling risk.

**Disabling co-occurrence-blocked keys** — `disabled` would have been the obvious one-attribute
fix for "not activatable" (check 11), but it removes an element from the focus order and (in
most browsers) narrows how it is exposed to assistive tech, which risked failing check 12's
"every key remains a focusable control." Used a click-handler no-op instead, keeping the
button focusable and in the tree.

**Nothing else came close** — no fuzzy/transposition matching, no ranking, no second piece, no
new dependency, no forbidden file touched.

## Commit

SHA: **`5f4b0e84caf85402f233ea5d89679d2ef6dd63e1`**

Exactly one commit, on `phrase-lookup`. Not pushed. Nothing merged to `main`.

## Risks and open questions

- The co-occurrence constraint is checked against the piece's actual onset groups, at exact
  register, per the frozen contract — a group selected one octave off from a real occurrence
  will still be correctly rejected as non-existent, same as before this loop.
- `possibleContinuations` (the non-staff variant) also gained the `currentSelection` parameter
  for symmetry with `possibleContinuationsByStaff`, though only the staff-aware version is
  currently wired into the UI. Both are covered by the same test fixtures.
- The on-screen explanatory paragraph was updated to mention the chord dimension explicitly
  (previously it described only the sequence constraint, which Section 1 called out as now
  false). This is a one-sentence wording change, not a new UI element.
