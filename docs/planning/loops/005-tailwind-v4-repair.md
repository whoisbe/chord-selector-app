# Loop Spec 005: Tailwind v3 → v4 Repair

> **DEAD 2026-08-02.** The v3/v4 mismatch was a `chordsense` defect. The project moved to `whoisbe/chord-selector-app` (Loop 008), whose Tailwind works. This loop will never run. Kept for the record.


Loop type: **Repair**
Status: engineered, awaiting executor assignment
Executor: TBD
Depends on: Loop 002 DONE
Blocks: Loop 006 (the keyboard is a layout-heavy component and cannot be built on a dead stylesheet)

## Trigger

During the Loop 001 interaction check, the macro layer observed that Tailwind utility classes render as browser defaults on `/lookup` **and** on `/`, which predates Loop 001. This was initially logged as a pre-existing cosmetic issue. It is now a prerequisite.

## Diagnosis — cause, not symptom

Already established by inspection, so the executor does not need to rediscover it:

- `package.json` installs `tailwindcss ^4.1.14` and `@tailwindcss/postcss ^4.1.14`. **Tailwind v4.**
- `app/globals.css` opens with the **v3** directives:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
  These do not exist in v4. The v4 PostCSS plugin finds no `@import "tailwindcss"`, so it emits no utilities. The build succeeds silently — nothing errors, nothing is generated.
- `tailwind.config.js` is v3-shaped (`content` globs, `theme.extend`, `require('@tailwindcss/typography')`). v4 uses CSS-first configuration and automatic content detection, so this file is largely inert.

The fix is a v3→v4 CSS migration, not a config tweak.

## Goal

From **"utility classes generate nothing on any route"** to **"utilities generate, the typography plugin works on the blog, and both routes render as their markup intends."**

## Scope

In scope: `app/globals.css`, `tailwind.config.js` (including deletion if v4 makes it redundant), `postcss.config.js`, `docs/sprints/output/005-tailwind-repair-output.md`, `docs/prompts/sprint5-<executor>-tailwind.md`.

Explicitly out of scope:

- **Changing any `className` in any component.** The markup is the specification. If a class does not produce its intended effect after the migration, that is a finding to report, not a licence to rewrite JSX. This is the single most important boundary in this loop — a repair loop that starts restyling components is no longer a repair loop.
- Redesigning any page, adding a design system, or changing colours and spacing beyond restoring intent.
- `package.json` and `package-lock.json`. v4 is already installed; no version change is needed or permitted.
- Anything under `lib/`, `data/`, `tests/`, `scripts/`.

## Expected shape of the fix

Directional, not prescriptive. The executor verifies against the installed version's actual behaviour.

- Replace the three `@tailwind` directives with `@import "tailwindcss";`.
- Register the typography plugin the v4 way, `@plugin "@tailwindcss/typography";`, since `/blog` uses `prose` classes.
- Port anything worth keeping from `tailwind.config.js` into CSS-first config (`@theme`), then delete or empty the file.
- Confirm the existing `@layer utilities` block still behaves under v4.

## Verifier

| # | Check | Passing result |
|---|---|---|
| 1 | `npm run build` | succeeds |
| 2 | Generated CSS contains utilities | the built stylesheet contains rules for classes actually used in the app — not merely a non-empty file |
| 3 | `npm test` | unchanged, all pass |
| 4 | `git diff --exit-code package.json package-lock.json` | exit 0 |
| 5 | `git diff --stat` | no `.tsx` or `.jsx` file appears |
| 6 | `/` renders styled | dev server + browser: the home page links render as styled elements, not default blue underlined text |
| 7 | `/lookup` renders styled | the pitch buttons render as styled buttons, not default browser buttons |
| 8 | `/blog` renders styled | `prose` typography applies |
| 9 | Loop 001 interaction still passes | building and searching the founding phrase still works end to end |

**Checks 6–9 require a browser.** Per the Loop 001 learning, this is stated up front rather than discovered at the end: if the assigned executor has no browser backend, it must run checks 1–5, mark 6–9 as `not run`, and end at `BLOCKED` **without** substituting code inspection. The macro layer will close them, as it did for Loop 001.

Check 5 is the boundary guard. Any component diff means the loop went out of scope.

## Repair policy

- Initial implementation plus at most 2 repair attempts.
- If a class renders differently under v4 than the markup intends, **record it, do not fix it in the component.** v4 renamed and removed some utilities; a list of affected classes is a valuable finding and belongs in the output for Loop 006 to absorb.
- Do not downgrade to Tailwind v3 as a repair. That is `NEEDS_ARCHITECTURE_DECISION`.

## Stop rules

| Terminal state | Condition |
|---|---|
| `DONE` | checks 1–9 pass, evidence recorded |
| `BLOCKED` | no browser backend for checks 6–9, with 1–5 passing |
| `NEEDS_ARCHITECTURE_DECISION` | the fix appears to require a Tailwind version change or a build-pipeline replacement |
| `OUT_OF_SCOPE` | the fix appears to require editing components |
| `FAILED_VERIFICATION` | a check still fails after 2 repairs |

## Handoff artifact

`docs/sprints/output/005-tailwind-repair-output.md`, including the before/after of `globals.css`, evidence for check 2 showing actual generated rules, and any v4 utility-rename findings for Loop 006.
