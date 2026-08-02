# Loop Spec: Phrase Lookup Search Vertical Slice

## Purpose

Prove the smallest useful Chordsense Phrase Lookup workflow: a user enters an ordered sequence of simultaneous note groups for one hand, the app finds every exact occurrence in a deterministic local fixture, and the app shows the location plus a short textual preview of what follows.

This loop validates the product's reverse-index interaction before committing to score ingestion or piano-roll rendering.

## Starting State

- Chordsense is a minimal Next.js App Router application.
- No phrase-search domain model, lookup route, score fixture, or JavaScript/TypeScript test command exists.
- The repository contains Python chord-generation utilities, but they are not part of this loop.
- `package-lock.json` exists, while local dependencies may need to be restored with `npm ci`.

## Target State

- `/lookup` provides a local, interactive proof of ordered, exact-pitch phrase lookup.
- A user can build simultaneous note groups from labeled pitch buttons, add groups in sequence, choose right or left hand, search, undo, and clear.
- Exact ordered matching is implemented as a pure TypeScript function independent of React.
- A clearly labeled development fixture contains two occurrences of the remembered example `[F#4 + F#5] -> [C#5] -> [E5]`, at measures 12 and 27, with following events available for preview.
- Automated tests cover the matching rules.
- The production build succeeds.

## Search Semantics Frozen for This Loop

- Notes are represented by MIDI integers using the convention `C4 = 60`.
- A note group represents notes sounding at one onset.
- Notes inside a group are compared as a deduplicated, order-independent set.
- Groups are compared in order and must be contiguous in the selected hand's event stream.
- Group equality is exact: a query group does not match an event with additional notes.
- Register matters; pitch-class-only matching is excluded.
- Rhythm and duration are ignored.
- Search is restricted to one selected hand.
- An empty query returns no matches.
- A match may cross a measure boundary.

## Acceptance Criteria

1. Pure search tests prove all frozen semantics, including results at measures 12 and 27 for the remembered example.
2. The `/lookup` interface can construct and submit that example without text entry.
3. Search results are ordered by occurrence and show measure, beat, matched groups, and up to three following groups.
4. The fixture and UI state plainly that the data is a development fixture, not an authoritative Moonlight Sonata transcription.
5. The home page links to Phrase Lookup.
6. No runtime service, database, API route, MIDI interface, playback, MusicXML parser, or score renderer is introduced.

## Invariants

- Search code has no React or browser dependency.
- No existing Python chord data or generator behavior changes.
- No score facts are asserted from the development fixture.
- No code is copied from Sightread, MuseTrainer, or another external project.
- No new package dependency is added.

## Explicit Exclusions

- Authoritative Moonlight Sonata data and MusicXML ingestion
- Piano-roll or staff-notation rendering
- Approximate, pitch-class, rhythm-sensitive, or contains-note matching
- MIDI hardware, audio, playback, tempo, scoring, and practice modes
- Authentication, persistence, analytics, databases, and external services
- Mobile polish beyond a usable responsive layout

## Completion Signal

The loop is complete only when the exact automated verifiers and the required interaction check in `docs/agent-handoff.md` pass and the sprint evidence record is written.

