# Measurements expire

**Loop 017, 2026-08-22.** The macro layer wrote a handoff whose design argument
rested on a table of measured pixel heights. Every figure in it was roughly
half the truth by the time the loop ran.

## What happened

Loop 017's Section 3 stated the whole movement renders at ~49,400px, that three
measures is ~2,160px, and that reaching measure 34 by scrolling costs
~24,100px. Those numbers were measured honestly. They were taken when
`OnsetStrip.tsx` drew a 14px white key.

Commit `1188094` — "Match phrase-lookup result keyboards to By Key / By Name
styling", made by the human during the week of use and **already on the branch
when the loop started** — set `SCALE = 1`. A row became 112px tall on a 120px
pitch. The real figures are ~98,800px, ~4,300px and ~48,200px.

The executor re-measured against the production build before designing, found
the discrepancy, and restated the table. Nobody had noticed in between.

## Why it did not cause damage this time, and why that was luck

The argument the numbers supported was *directional*: scrolling cannot serve
the use case, and rendering everything is a ceiling. Doubling every figure made
both conclusions stronger. The spec survived.

But one decision was **quantitative** — how many measures load initially — and
it was wrong. The handoff offered 3, 5 or 8 and its own reasoning pointed at 5,
because at the stale scale 5 was "barely three screens". At the real scale 5 is
~7,300px. The executor picked 3 and said so plainly: *the scale doubled; the
span halved.*

Had that decision been frozen in the handoff rather than left open in Section
10, the loop would have shipped a first page twice the size intended, and every
check would still have passed. The checks measured what the spec asked for. The
spec asked for the wrong number.

## The rule

**A measured fact is a fact about a commit, not about a project.** When a spec
reasons from measurements, the measurements must be taken against the branch
the loop will actually run on — re-taken at handoff time, not inherited from
whenever the analysis happened.

Concretely, for this project:

- Regenerate the measured table when writing a handoff, not when writing the
  loop spec, and note the commit SHA the figures came from.
- A week of real use is a week of commits. Any handoff written after one is
  written against a branch the macro layer has not measured.
- Where a number is load-bearing and cheap to re-derive, prefer leaving it to
  the executor with the derivation stated, rather than freezing a value.

## The pattern this belongs to

The fourth entry in the same family. `specify-the-property-not-the-proxy.md`
recorded a check that tested the wrong thing. This records a spec that reasoned
from the right thing at the wrong time.

Every check passed or failed honestly, and the thing that mattered sat just
outside what was measured.
