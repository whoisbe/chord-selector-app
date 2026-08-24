# ADR 0002: Search the merged onset stream — staff is not hand

Status: **Accepted**
Date: 2026-08-01
Supersedes: the single-hand search contract frozen in `docs/planning/loops/001-phrase-lookup-search-vertical-slice.md`

## Context

Loop 001 froze this semantic: *"Search is restricted to one selected hand."* The `/lookup` UI has a right/left selector, `PhraseQuery` carries a `hand` field, and `findPhraseMatches` filters the stream to that hand before matching.

The model was never tested against a real score. It was tested against a fixture hand-authored to satisfy it.

## The evidence that broke it

The user described the passage where he gets stuck: *"end of measure 12, right hand played F# octave followed by C# and E."*

Against the real score, at measure 12 beat 4:

```
m12 b4.00   staff 1 (upper): [F#4]      staff 2 (lower): [F#3]
m12 b4.33                                staff 2 (lower): [C#4]
m12 b4.67                                staff 2 (lower): [E4]
```

Two things are true at once:

1. **The F# octave he remembers spans both staves.** F#3 in the lower, F#4 in the upper, sounding together. Neither staff contains an octave on its own.
2. **The C# and E that follow are in the lower staff**, not the upper one where a pianist would say their right hand was.

Search results for `[F#3+F#4] → [C#4] → [E4]`:

| Stream model | Matches |
|---|---|
| Upper staff only (Loop 001's "right hand") | **0** |
| Lower staff only (Loop 001's "left hand") | **0** |
| Merged onset stream | **1 — measure 12, beat 4** |

Exactly one occurrence in the whole movement, at exactly the measure the user named. The user's memory was accurate to within one octave. The retrieval model was what failed.

## Decision

**The canonical searchable stream is the merged onset stream.** All notes sounding at one onset form one group, regardless of which staff they were written on.

Staff is retained as per-note metadata for display and ranking. It is **not** a search filter, and it is not renamed to "hand."

## Why staff is not hand

MusicXML's `<staff>` records notation layout, which is a publisher's choice. Pianists redistribute material between hands constantly, and cross-staff beaming, hand-crossing, and inner voices all break the correspondence. In this file the lower staff carries the arpeggio figure through measures 12–14 while the upper staff holds the melody — so "staff 2" is not "left hand" at that point in any performance sense.

More decisively: **the user does not know which staff their memory came from.** Asking them to pick one before searching asks a question they cannot answer, and a wrong answer silently returns zero results with no indication that the filter caused it. That is the worst possible failure mode for a recall tool.

## Consequences

- `PhraseQuery.hand` is removed as a required filter. Hand becomes an optional ranking or display facet.
- `findPhraseMatches` operates on the merged stream. Loop 001's other frozen semantics — deduplicated order-independent groups, ordered contiguous matching, exact group equality, register sensitivity — all survive unchanged.
- The merged stream for this movement is 823 events, down from 938 staff-split, because simultaneous cross-staff onsets collapse into single groups.
- Loop 001's `/lookup` hand selector is obsolete. It is not worth repairing in place; Loop 006 replaces that surface.
- **This strengthens the two-row keyboard design rather than weakening it.** Two rows are an input affordance matching where a player's hands sit, and they let the user enter a cross-staff octave naturally. But what they build is one group per onset, not two separate per-hand queries. Entry geometry and search partitioning are different concerns, and conflating them is what caused this bug.
- Loop 001's fixture remains valid as a unit-test artifact but is no longer representative. It was authored to satisfy the single-hand model.

## Learning

The general form, worth carrying beyond this project: **a fixture authored to satisfy a model cannot falsify that model.** Loop 001 passed ten tests and a full interaction check against data built to agree with it. The first contact with a real score overturned a frozen contract within minutes.

Ship a real-data probe earlier, even a throwaway one, whenever a contract is about to be frozen.
