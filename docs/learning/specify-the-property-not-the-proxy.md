# Learning: specify the property, not a proxy for it

Date: 2026-08-03
Sources: Loop 010 check 6b, Loop 013 check 7
Layer: macro

## The pattern

Twice now the macro layer has written a verifier check that names an *observable stand-in* for the property it cares about, rather than the property itself. Both times the executor's work was correct and the check failed anyway.

### Loop 010 — check 6b

**Property wanted:** no `TS2882` errors from CSS side-effect imports.
**Check written:** `src/vite-env.d.ts` exists, containing the `vite/client` reference.

Codex satisfied the property a different way — `"types": ["vite/client"]` in `tsconfig.json` — which also resolved a second, unrelated error in the same place. Its solution was better than the one demanded. The check failed. The loop ended at `FAILED_VERIFICATION` with correct work.

### Loop 013 — check 7

**Property wanted:** the e2e suite selects by accessible name, so it cannot pass while accessible names rot.
**Check written:** `grep -rn "data-testid" src/` returns nothing.

Nine `data-testid` attributes already existed in `PhraseLookupSurface.tsx`, committed in Loops 006/011/012, when no prohibition against them existed. The check could never pass without editing `src/`, which the same handoff forbade.

Meanwhile the property held **perfectly**: the suite contains **17** `getByRole` calls, **15** `getByText`, and **zero** `getByTestId`. Not one of the nine attributes is used.

The check tested for the *presence of an affordance* rather than its *use*. The right check was `grep -rn "getByTestId" e2e/` returns nothing.

## Why this keeps happening

A proxy is easier to write. "Does file X exist" and "does string Y appear" are cheap greps; "is the suite accessibility-first" needs a moment's thought about what would actually distinguish a suite that is from one that isn't.

The proxy is also easier to *verify*, which is exactly what makes it seductive to a macro layer optimising for checks it can confirm without running anything.

## The rule

> **Before writing a check, ask: could the property hold while this check fails? Could this check pass while the property is violated?**
>
> If either answer is yes, the check is a proxy. Rewrite it to test the property.

Applied to the two cases:

- 6b: *could no-TS2882 hold while `vite-env.d.ts` is absent?* Yes — via tsconfig. Proxy.
- 7: *could the suite be accessibility-first while `data-testid` exists in src?* Yes — the ids can simply go unused. Proxy. And could it pass while the suite used them? Only if they were absent — but their absence in `src/` says nothing about `e2e/`. Proxy in both directions.

## Related, and the reason this is worth a doc

This is the same shape as the two costliest lessons already recorded:

- **Loop 001** — a fixture authored to satisfy a model cannot falsify it. Ten passing tests, honest, against data built to agree with them.
- **Loop 004 → 009** — a facet verified at rest was never verified in motion. Fifteen passing checks, honest, none following `staves` through `copyGroup`.

All four share a structure: **every check passed or failed honestly, and the thing that mattered sat just outside what was being measured.** The failure is never dishonesty. It is always a gap between the measurement and the intent.

## Cost

Loop 010 recorded `FAILED_VERIFICATION` on correct work and needed a macro-layer amendment. Loop 013 needed a mid-execution human decision to proceed past a check that could not pass.

Both executors behaved correctly — each flagged the conflict rather than silently working around it, and Loop 013's flagged it *before* implementing, which is the cheapest possible moment.

## Follow-up for Loop 014 and later

The nine `data-testid` attributes in `PhraseLookupSurface.tsx` are unused and harmless, but they are an attractive nuisance: a future test author may reach for them and quietly lose the accessibility guarantee.

The durable guard is the corrected check — **`grep -rn "getByTestId" e2e/` returns nothing** — which should appear in every loop that touches the e2e suite. Removing the attributes is optional cleanup, not a fix.
