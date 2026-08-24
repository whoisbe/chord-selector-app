# Sprint Output: Loop 004 — MusicXML Ingestion

**Terminal state: `DONE`**

State transition attempted: `revision 2, awaiting executor` → `DONE`. Outcome: reached on the initial implementation, zero repair attempts needed. All 15 verification checks pass, including check 15 (browser).

## Task 0 — archive the handoff

Copied `docs/agent-handoff.md` to `docs/prompts/sprint4-claude-code-ingestion.md`.

`cmp -s docs/agent-handoff.md docs/prompts/sprint4-claude-code-ingestion.md` → **exit 0**.

## Changed files

| File | In scope | Note |
|---|---|---|
| `docs/agent-handoff.md` | n/a | Already at loop-004 content when this session started (macro-layer prep, not edited here). |
| `docs/planning/loops/004-musicxml-ingestion.md` | n/a | Same — pre-existing sprint prep, not edited in this session. |
| `docs/planning/product-loop-map.md` | n/a | Same — pre-existing sprint prep, not edited in this session. |
| `docs/sprints/kickoff/sprint4-ingestion.md` | n/a | Same — pre-existing untracked sprint-kickoff doc, not edited in this session. |
| `docs/prompts/sprint4-claude-code-ingestion.md` | ✅ Task 0 | New — verbatim handoff archive. |
| `data/spike/moonlight-sonata.musicxml` | ✅ Task 1 | New — extracted from `moonlight-sonata.mxl` via `unzip`. 596,498 bytes. `.mxl` retained unchanged as provenance. |
| `scripts/ingest-musicxml.mjs` | ✅ Task 2 | New — plain JS ESM ingestion script, uses jsdom for XML parsing. |
| `src/data/pieces/moonlight-sonata.ts` | ✅ Task 2 | New — committed, regeneratable artifact (823 `NoteGroup`s). |
| `src/lib/music/types.ts` | ✅ Task 3 | `NoteGroup` gains optional `tick` and `staves`; `hand` becomes optional on both `NoteGroup` and `PhraseQuery`. |
| `src/lib/music/phrase-search.ts` | ✅ Task 4 | `findPhraseMatches` filters by hand only when `query.hand` is present; otherwise searches the piece as given (the merged stream, for real pieces). `copyGroup` now spreads the group generically instead of hardcoding `hand`. |
| `src/components/PhraseLookupTab.tsx` | ✅ Task 6 | Points at `moonlightSonata` and the founding query; still marked temporary, still minimal. |
| `src/tests/phraseSearch.test.ts` | ✅ Task 4/5 | One test replaced (see below); one import line added; every other test body unchanged. |
| `src/tests/musicxmlIngestion.test.ts` | ✅ Task 5 | New — covers the parser/ingestion verification numbers. |

## Design note: why `hand`/`staff` became *optional*, not removed

The loop spec (line 86) says `PhraseQuery.hand` "stops being a **required** filter," and ADR 0002's Consequences section says it "is removed as a required filter... becomes an optional ranking or display facet" — not that the field is deleted. Making it optional (rather than deleting it) is what let every other ported test in `phraseSearch.test.ts` stay byte-for-byte unchanged: those tests still construct fixture objects with `hand: 'right'`/`'left'` against `phraseLookupDemo`, and `findPhraseMatches` still honors `query.hand` when present (Loop 001's fixture path). For the real, merged-stream piece the founding query simply omits `hand`, and the search runs over the whole array unfiltered — which is what ADR 0002 actually requires.

`NoteGroup.staves` is the new per-note staff metadata (parallel array to `notes`), populated only by the ingestion script; `NoteGroup.hand` is the old per-group fixture metadata, populated only by `phrase-lookup-demo.ts`. Neither is read by the matching loop itself except `hand` via the query-level filter described above.

## Verification results (all 15, with actual output)

| # | Check | Result |
|---|---|---|
| 1 | `npm test` | **34 passed** (3 test files: `phraseSearch.test.ts` 10, `chordVoicings.test.ts` 14, `musicxmlIngestion.test.ts` 10) |
| 2 | `npm run build` | **succeeded** — `vite v6.3.5 building for production... ✓ 1692 modules transformed... ✓ built in 742ms`. Not treated as a typecheck (see open decision below). |
| 3 | Measures parsed | **69** |
| 4 | Pitched notes placed | **1169** |
| 5 | Staff inference count | **0** (1210 of 1210 notes carry explicit `<staff>`) |
| 6 | Merged onset events | **823** |
| 7 | Pitch range | **MIDI 29–87**, 55 distinct pitches |
| 8 | **Founding query** | **exactly 1 match** — measure 12, beat 4 |
| 9 | **Staff-split control** | **0** matches in staff 1 alone (719 groups), **0** in staff 2 alone (219 groups); 719+219 = 938 total staff-split events |
| 10 | Measure 1 spot-check | staff 1: `[56] [61] [64]` (G#3, C#4, E4) × 4 triplets; staff 2: `[37, 49]` (C#2+C#3) — exact match |
| 11 | Tick storage | confirmed by inspection: `phrase-search.ts` never reads `beat` for comparison, only copies it to output; every test assertion on `.beat` targets a whole-number beat (1 or 4), exact by construction since those ticks are multiples of `divisions` |
| 12 | `git diff --exit-code package.json package-lock.json` | **exit 0** |
| 13 | Purity: `grep -rniE "react\|document\|window\|fetch\|jsdom" src/lib/music/` | **no matches** (grep exit 1) |
| 14 | Reproducibility | re-ran `node scripts/ingest-musicxml.mjs`; `diff` against the pre-rerun artifact — **byte-identical** |
| 15 | Smoke surface (browser) | **confirmed** — see below |

### Founding query and staff-split control, verbatim

```
node script output:
measures parsed: 69
pitched notes placed: 1169
staff assignments inferred: 0
merged onset events: 823
pitch range: 29 - 87
distinct pitches: 55
```

```
merged count 823
staff1 count 719
staff2 count 219
staff-split total 938
measure 12 merged groups include:
  { measure:12, tick:36, beat:4,                staves:[1,2], notes:[66,54] }   ← F#4+F#3
  { measure:12, tick:40, beat:4.333333333333334, staves:[2],   notes:[61] }     ← C#4
  { measure:12, tick:44, beat:4.666666666666666, staves:[2],   notes:[64] }     ← E4
```

`findPhraseMatches(merged, { groups: [{notes:[54,66]},{notes:[61]},{notes:[64]}] })` → 1 match, measure 12, beat 4.
`findPhraseMatches(staff1, sameQuery)` → `[]`. `findPhraseMatches(staff2, sameQuery)` → `[]`. (F#3 and F#4 never co-occur within a single staff — they are, by construction, split across staves at this passage — so the control is guaranteed, not incidental.)

### Check 15 — browser confirmation

Ran `npm run dev`, navigated to `http://localhost:3000/`, clicked "Phrase Lookup". Rendered:

> Loop 004 smoke surface — temporary, replaced by Loop 006. Searching Beethoven, Piano Sonata No. 14 in C# minor, Op. 27 No. 2 ("Moonlight"), movement I.
> **Founding query: [F#3+F#4] → [C#4] → [E4] — 1 match**
> **Measure 12, beat 4** — followed by [B1+B2+F#3+F#4] [B3] [D4]

Dev server stopped after verification.

## Test replacement (ADR 0002)

Loop 001's `"hand selection prevents cross-hand matches"` test (asserted that querying `phraseLookupDemo` with `hand: 'right'` vs `hand: 'left'` produced different, hand-restricted results) is **removed**.

Replaced with `"a query spanning both staves is found in the merged stream without a hand filter"` in the same file, which runs the real founding query (no `hand` field) against the real `moonlightSonata` merged stream and asserts exactly one match at measure 12, beat 4 — the motivating case from ADR 0002.

A second, complementary test — `"the founding query returns exactly one match..."` plus the `"staff-split control"` test — lives in the new `musicxmlIngestion.test.ts`, exercising the raw parser output directly (not just the committed artifact), per the verifier's emphasis that a parser returning the right answer for the wrong reason is worse than one that fails.

Every other ported test in `phraseSearch.test.ts` is unchanged except for one added import line (`moonlightSonata`), required to run the replacement test.

## Repair attempts

**Zero.** All target numbers matched on the first run of `scripts/ingest-musicxml.mjs` against the real file; no `<backup>`/`<forward>`/`<chord>` handling adjustments were needed.

## Stop rules triggered

None — reached `DONE` directly.

## Out-of-scope pressure encountered

None. No pull toward the two-row keyboard, fuzzy/ranked matching, or a second piece.

## Risks and open questions

- The committed artifact (`src/data/pieces/moonlight-sonata.ts`) is large (823 entries) and hand-inspecting it for review is impractical past a spot check — reproducibility (check 14) is the real safety net here, not code review.
- `NoteGroup` now carries two parallel but distinct optional metadata shapes (`hand` for the Loop 001 fixture, `staves` for real pieces). This is intentional per ADR 0002 but is worth collapsing or documenting further whenever the Loop 001 fixture is retired.
- The measure-1 spot-check and founding-query tests both import the `.mjs` ingestion script directly into a `.ts` vitest file. This works today (vitest/Vite resolve `.mjs` ESM imports natively) but is an unusual cross-extension import; flagging it as a spot to watch if the test tooling changes.

## Open decision recorded, not acted on

This repo has no TypeScript typechecking. `typescript` is not a declared dependency, and `vite build` only strips types — it does not check them. A `tsc --noEmit` script would be a real improvement (this loop's own `NoteGroup`/`PhraseQuery` shape change is exactly the kind of edit a typechecker would want to gate), and adding it requires a new dependency, which the standing "no new dependency without an ADR" contract forbids without an explicit decision. Recommending it; not doing it here.

## Next recommended action

**Accept current loop as complete.**
