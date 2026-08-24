# A check that lives only in prose stops running

**Loop 019, 2026-08-22.** The purity check on `src/lib/music/` had been failing
since Loop 016 and nobody found out for three loops — because it was not in
those loops' verifiers at all.

## What happened

Loop 014 wrote check 5:

```
grep -rniE "react|document|window|fetch|jsdom" src/lib/music/   # returns nothing
```

It passed at Loop 014's commit. Verified after the fact:

```
$ git grep -niE "react|document|window|fetch|jsdom" 7903cad -- src/lib/music/
(no output, exit 1)
```

Loop 016 added `src/lib/music/measures.ts`, whose header comment reads *"the
focused view is drawn on a fixed window"*. The grep is case-insensitive and
matches substrings, so that sentence is a hit:

```
$ git grep -niE "react|document|window|fetch|jsdom" 31b1539 -- src/lib/music/
31b1539:src/lib/music/measures.ts:10:// pitch range — the focused view is drawn on a fixed window, which is the
```

It stayed there through Loops 016, 017 and 018, and was found by Loop 019 —
which found it only because Loop 019's handoff happened to reintroduce the
check as its check 6.

## The part that is not "an executor missed something"

**Loops 015, 016 and 017 did not fail this check. They never ran it.** Their
verifier tables do not contain it:

```
$ grep -c jsdom docs/planning/loops/01{4,5,6,7,9}*.md
014: 1
015: 0
016: 0
017: 0
019: 3
```

Each handoff is written fresh, and a check survives into the next loop only if
the macro layer retypes it. Three times in a row it was not retyped. **The
check did not weaken; it evaporated.**

## The detail that makes the point

Loop 017's `src/lib/music/browse.ts` carries this comment, written by its
executor:

> `onset-range.ts` records that this directory is grepped case-insensitively
> for browser and framework identifiers, and the obvious noun for "the stretch
> of measures currently on the page" is one of the banned substrings. The
> wording here says span, stretch or slice instead, deliberately.

That executor **knew about the trap and stepped around it** — while the actual
violation sat two files away in the same directory, undetected, because Loop
017's verifier did not include the check that would have caught it.

Care is not a substitute for a check that runs.

## The rule

**A check that only exists as a sentence in a handoff is a check that runs at
most once.** If a property is worth protecting across loops, it has to live
somewhere that executes on every loop — a test, an npm script, a CI step —
not in prose that the next contract may or may not repeat.

Concretely, for this project:

- Move standing invariants out of verifier tables and into `npm test`. The
  purity boundary, the accessibility-first e2e rule (`getByTestId`), the
  no-persistence rule and the no-fixed-sleeps rule are all greps, and all four
  are retyped by hand into handoff after handoff.
- A per-loop verifier should assert what *this loop* changed. Standing
  properties belong to the suite.
- When a handoff does carry a standing check, that is a signal the check is not
  yet automated — not a reason to feel covered.

## The pattern this belongs to

The fourth entry in the same family, and the one that explains the other three.

`never-mutate-an-active-handoff.md` — the contract changed underneath a run.
`specify-the-property-not-the-proxy.md` — a check tested the wrong thing.
`measurements-expire.md` — a spec reasoned from facts that had gone stale.
This one — a check simply stopped being asked.

Every check passed or failed honestly, and the thing that mattered sat just
outside what was measured.
