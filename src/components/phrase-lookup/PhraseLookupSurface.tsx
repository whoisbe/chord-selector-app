// Phrase lookup: click the notes of one onset on one keyboard, and the
// keyboard shows what can come next.
//
// Loop 012 removed staff from input entirely. Staff was never part of the
// query (ADR 0002) — a group selected as F#3 plus F#4 is simply [54, 66],
// whether the two rows this used to take existed or not. Two rows only ever
// encoded a transcription detail (which staff a note was engraved on) that
// does not match which hand plays it; asking the user to answer that
// question bought nothing and, at measure 13 beat 1, actively misled.

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '../ui/button';
import { MOONLIGHT_SONATA_NAME, moonlightSonata } from '../../data/pieces/moonlight-sonata';
import {
  applyCapture,
  selectionPitches,
  type PitchCapture,
  type SelectedKey,
} from '../../lib/music/capture';
import {
  containingOccurrences,
  containmentCount,
  possibleContinuations,
  streamPitchRange,
  type PitchRange,
} from '../../lib/music/continuations';
import { keyLayout } from '../../lib/music/keyboard';
import { describePitchRange, sharedPitchRange } from '../../lib/music/onset-range';
import { findPhraseMatches } from '../../lib/music/phrase-search';
import { pitchToLabel } from '../../lib/music/pitch-label';
import type { NoteGroup, PhraseQuery } from '../../lib/music/types';
import { FocusedOccurrence } from './FocusedOccurrence';
import { OnsetStrip } from './OnsetStrip';
import { PhraseKeyboard } from './PhraseKeyboard';

// Exact matching on a one-note prefix hits many places — [E4] alone occurs 78
// times — so the count stays the honest signal and the strips are a sample of
// it. A one-note query is rarely the real question, which is what makes the
// cap cheap: it costs little, and it is what stops a stray single note from
// asking the browser to draw several hundred keyboards.
const MAX_RENDERED_RESULTS = 12;

// Loop 014: while a group is still being assembled the surface used to show a
// containment count and nothing else, even when only a handful of places were
// left. Below this many, the places themselves are worth drawing.
const DISCLOSURE_THRESHOLD = 6;

const FULL_RANGE: PitchRange = streamPitchRange(moonlightSonata) ?? { minPitch: 29, maxPitch: 87 };

// The input keyboard is a full 88-key piano, A0 to C8, rather than a window cut
// to whatever this piece happens to span. Result keyboards keep using the
// piece-derived ranges above: those exist to make two shapes comparable, and
// padding them with keys no occurrence can ever use would only shrink the part
// that carries meaning. The input surface has the opposite job — it is the
// instrument you are searching from, and a familiar left and right edge is
// worth more there than a tight fit. Pitches outside FULL_RANGE simply render
// permanently unavailable, which is already how any note that cannot follow the
// phrase is drawn.
const INPUT_RANGE: PitchRange = { minPitch: 21, maxPitch: 108 };

function formatBeat(beat: number): string {
  return Number.isInteger(beat) ? String(beat) : beat.toFixed(2);
}

function formatGroup(notes: readonly number[]): string {
  return `[${notes.map(pitchToLabel).join('+')}]`;
}

// Loop 016: what a collapsed occurrence says about itself while another is
// focused.
//
// Exact matching means every occurrence of a query has the *same* matched
// notes — repeating them on each line would distinguish nothing. What
// actually differs between two occurrences is where they are and what
// happens next, so a collapsed line carries its place and the one onset that
// immediately follows it. That is the smallest thing that still lets you pick
// the right occurrence to open, and it is the same "what comes immediately
// next" question the compact strip answers, reduced to one line.
function summariseFollowing(followingGroups: readonly NoteGroup[]): string {
  if (followingGroups.length === 0) {
    return 'end of movement';
  }

  return `then ${formatGroup(followingGroups[0].notes)}`;
}

export function PhraseLookupSurface() {
  const [selection, setSelection] = useState<readonly SelectedKey[]>([]);
  const [committed, setCommitted] = useState<readonly SelectedKey[][]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  // The search control is a fallback only — results already update on commit.
  const [searchNonce, setSearchNonce] = useState(0);
  // Staff colouring is opt-in and lives only in this component's state. No
  // storage of any kind: the project has no persistence layer, Loop 001
  // excluded one, and a toggle that survived a reload would quietly become a
  // persistence decision made by a rendering loop.
  const [showStaff, setShowStaff] = useState(false);
  // Loop 016: which rendered occurrence is open, by index. Session state
  // only, for the same reason the staff toggle above is — and it is a single
  // index rather than a set because the focused view is nearly a thousand
  // pixels of keyboards, which is exactly why Kibana's surrounding-documents
  // view opens one hit at a time instead of putting context controls on all
  // of them.
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const keys = useMemo(() => keyLayout(INPUT_RANGE.minPitch, INPUT_RANGE.maxPitch), []);

  const prefix = useMemo(
    () => committed.map((group) => ({ notes: selectionPitches(group) })),
    [committed],
  );

  const matches = useMemo(() => {
    if (prefix.length === 0) {
      return [];
    }

    const query: PhraseQuery = { groups: prefix };
    return findPhraseMatches(moonlightSonata, query);
    // searchNonce lets the fallback control force a fresh search.
  }, [prefix, searchNonce]);

  const currentSelectionPitches = useMemo(() => selectionPitches(selection), [selection]);

  // Sequence-only availability — Loop 006's original constraint, ignoring
  // whatever is already picked for the group in progress. Kept separately so
  // a key blocked by co-occurrence can be told apart from one blocked by
  // sequence alone (Section 6): the same call with an empty selection is what
  // Loop 006 always computed.
  const sequenceOnly = useMemo(
    () => new Set(possibleContinuations(moonlightSonata, prefix)),
    [prefix],
  );

  // Both constraints composed — the group being assembled must actually
  // occur, not just be able to follow the committed phrase.
  const available = useMemo(
    () => new Set(possibleContinuations(moonlightSonata, prefix, currentSelectionPitches)),
    [prefix, currentSelectionPitches],
  );

  // Sequence-continuable but excluded once co-occurrence is applied: a dead
  // end that exists only because of what is already selected, not because it
  // can never follow the phrase. Empty whenever nothing is selected yet,
  // which is what keeps the empty-selection behaviour identical to Loop 006.
  const blockedByCoOccurrence = useMemo(() => {
    const blocked = new Set<number>();

    if (currentSelectionPitches.length === 0) {
      return blocked;
    }

    for (const pitch of sequenceOnly) {
      if (!available.has(pitch) && !currentSelectionPitches.includes(pitch)) {
        blocked.add(pitch);
      }
    }

    return blocked;
  }, [sequenceOnly, available, currentSelectionPitches]);

  const availableCount = available.size;

  // Loop 012: how many onsets in the whole piece contain the current
  // selection — the convergence signal while a group is still being
  // assembled. Null (and hidden) while nothing is selected, since every onset
  // vacuously contains an empty selection and the number would say nothing.
  const containmentCountValue = useMemo(
    () =>
      currentSelectionPitches.length === 0
        ? null
        : containmentCount(moonlightSonata, currentSelectionPitches),
    [currentSelectionPitches],
  );

  // Progressive disclosure (Loop 014): once the containment count is small
  // enough, the containing onsets are drawn instead of merely counted. Above
  // the threshold the count stays the only honest thing to show — 43 strips
  // would be a wall, not an answer.
  const disclosureOccurrences = useMemo(
    () =>
      containmentCountValue !== null && containmentCountValue <= DISCLOSURE_THRESHOLD
        ? containingOccurrences(moonlightSonata, currentSelectionPitches)
        : [],
    [containmentCountValue, currentSelectionPitches],
  );

  const renderedMatches = useMemo(
    () => matches.slice(0, MAX_RENDERED_RESULTS),
    [matches],
  );

  // The loop's central rule: every onset keyboard on screen at one time is
  // drawn on the same pitch range, computed across everything being shown.
  // Both sections feed it, because both can be on screen at once — a phrase
  // can be committed while a new group is part-way assembled, and two strips
  // drawn to different rulers would be worse than useless.
  const sharedRange = useMemo(() => {
    const shown = [
      ...renderedMatches,
      ...disclosureOccurrences,
    ].flatMap((occurrence) => [...occurrence.matchedGroups, ...occurrence.followingGroups]);

    return sharedPitchRange(shown);
  }, [renderedMatches, disclosureOccurrences]);

  // A focus belongs to one occurrence of one query. When either the committed
  // phrase or the group being assembled changes, the results underneath it
  // are different results, so the focus is dropped rather than silently
  // re-pointed at whatever now sits at that index.
  //
  // Dropping it on a selection change also keeps the surface to one pitch
  // window at a time. The focused view is drawn on the fixed full-piece
  // window while the containment strips are drawn on their own shared range;
  // both on screen together would put two rulers in front of the reader,
  // which is precisely what Loop 014 exists to prevent.
  useEffect(() => {
    setFocusedIndex(null);
  }, [matches, disclosureOccurrences]);

  const focusedMatch =
    focusedIndex !== null ? (renderedMatches[focusedIndex] ?? null) : null;

  const handleCapture = useCallback((capture: PitchCapture) => {
    setNotice(null);
    setSelection((current) => applyCapture(current, capture));
  }, []);

  const commitGroup = useCallback(() => {
    if (selection.length === 0) {
      setNotice('Select at least one key before adding a group.');
      return;
    }

    setCommitted((current) => [...current, [...selection]]);
    setSelection([]);
    setNotice(null);
  }, [selection]);

  const undoGroup = useCallback(() => {
    if (committed.length === 0) {
      setNotice('There is no committed group to undo.');
      return;
    }

    setCommitted((current) => current.slice(0, -1));
    setNotice(null);
  }, [committed.length]);

  const clearAll = useCallback(() => {
    setSelection([]);
    setCommitted([]);
    setNotice(null);
    setSearchNonce(0);
  }, []);

  const queryText = prefix.map((group) => formatGroup(group.notes)).join(' → ');
  const selectionText = selection.length === 0 ? null : formatGroup(selectionPitches(selection));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">Phrase lookup</h2>
        <p className="text-muted-foreground text-sm">
          Click the notes of one onset. Highlighted keys are the notes that can actually come next
          in this piece; dimmed keys cannot follow what you have entered so far, whether alone or
          together with what you have already picked for the current chord.
        </p>
        <p className="text-muted-foreground text-xs">
          Searching {MOONLIGHT_SONATA_NAME} — {moonlightSonata.length} onsets ingested from
          MusicXML, searched as one merged stream across both staves.
        </p>
      </div>

      <PhraseKeyboard
        keys={keys}
        selection={selection}
        available={available}
        blockedByCoOccurrence={blockedByCoOccurrence}
        onCapture={handleCapture}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2" style={{ rowGap: '0.5rem' }}>
          <Button type="button" onClick={commitGroup}>
            Add group
          </Button>
          <Button type="button" variant="outline" onClick={undoGroup}>
            Undo last group
          </Button>
          <Button type="button" variant="outline" onClick={clearAll}>
            Clear all
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSearchNonce((n) => n + 1)}>
            Search
          </Button>
          <span className="text-muted-foreground text-xs">
            {availableCount} possible next {availableCount === 1 ? 'note' : 'notes'} highlighted
          </span>
        </div>

        <p className="text-sm" data-testid="current-selection">
          <span className="text-muted-foreground">Current group: </span>
          {selectionText ?? 'nothing selected'}
        </p>

        {containmentCountValue !== null ? (
          <p className="text-muted-foreground text-xs" data-testid="containment-count">
            {containmentCountValue} {containmentCountValue === 1 ? 'onset' : 'onsets'} in the piece
            contain the current selection
          </p>
        ) : null}

        <p className="text-sm" data-testid="current-query">
          <span className="text-muted-foreground">Phrase: </span>
          {queryText === '' ? 'empty' : queryText}
        </p>

        {notice ? (
          <p className="text-sm" role="status" data-testid="notice">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="space-y-3" data-testid="results">
        {sharedRange ? (
          <div className="space-y-2">
            {/* While an occurrence is focused it is the only thing drawing
                keyboards, and it draws them on the fixed full-piece window
                rather than on a range computed from what is shown — so the
                sentence has to say which window is actually in force. Saying
                "fixed" here is the promise check 10 tests: the frame is the
                same before and after a step. */}
            {focusedMatch ? (
              <p className="text-muted-foreground text-xs">
                Same range on every result keyboard: {describePitchRange(FULL_RANGE)} — fixed while an
                occurrence is focused, so paging between measures moves the notes and never the
                frame.
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Same range on every result keyboard: {describePitchRange(sharedRange)}. Shapes below can be
                compared directly.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2" style={{ rowGap: '0.5rem' }}>
              <button
                type="button"
                role="switch"
                aria-checked={showStaff}
                onClick={() => setShowStaff((current) => !current)}
                className="staff-toggle"
              >
                Colour by staff
              </button>
              {showStaff ? (
                <span className="text-muted-foreground text-xs">
                  Upper staff: dot marker. Lower staff: bar marker.
                </span>
              ) : null}
            </div>
            {/* The caveat is always present, not only while the toggle is on:
                staff is the transcription's layout, and reading it as a hand
                is exactly the mistake this surface has already caused once. */}
            <p className="text-muted-foreground text-xs">
              Staff is how the piece was written down. It does not always match which hand plays a
              note.
            </p>
          </div>
        ) : null}

        {prefix.length === 0 ? (
          <p className="text-muted-foreground text-sm" data-testid="empty-query-message">
            No groups entered yet. Select the keys of one onset, then press Add group.
          </p>
        ) : matches.length === 0 ? (
          <p className="text-sm" data-testid="no-results-message">
            No occurrences of {queryText} in this movement.
          </p>
        ) : (
          <>
            <p className="text-sm" data-testid="result-count">
              {matches.length} {matches.length === 1 ? 'occurrence' : 'occurrences'} of {queryText}
              {matches.length > MAX_RENDERED_RESULTS
                ? ` — showing ${MAX_RENDERED_RESULTS}`
                : ''}
            </p>
            <p className="text-muted-foreground text-xs">
              Open an occurrence to read forward from it, a measure at a time.
            </p>
            <ul className="space-y-3" aria-label="Occurrence list">
              {renderedMatches.map((match, index) => {
                const isFocused = focusedIndex === index;
                // Every occurrence keeps a real button as its heading,
                // focused or not: focusing is an interaction now, so it has
                // to be reachable and activatable from the keyboard, and
                // keeping the same button in both states means opening one
                // never moves focus out from under the person who pressed it.
                const heading = (
                  <button
                    type="button"
                    className="occurrence-heading-button"
                    aria-expanded={isFocused}
                    onClick={() => setFocusedIndex(isFocused ? null : index)}
                  >
                    <span className="text-sm font-medium">
                      Measure {match.measure}, beat {formatBeat(match.beat)}
                    </span>
                    {focusedIndex !== null && !isFocused ? (
                      <span className="text-muted-foreground text-xs">
                        {summariseFollowing(match.followingGroups)}
                      </span>
                    ) : null}
                  </button>
                );

                return (
                  <li
                    key={`${match.measure}-${match.beat}-${index}`}
                    className="rounded-lg border border-border"
                    style={{ padding: '0.75rem' }}
                    data-testid="result-item"
                    // Escape closes the focused occurrence from anywhere
                    // inside the card, including from its heading button —
                    // the same way out that every other collapsible thing on
                    // the web has, at the cost of one handler.
                    onKeyDown={(event) => {
                      if (event.key === 'Escape' && focusedIndex !== null) {
                        setFocusedIndex(null);
                      }
                    }}
                  >
                    {heading}
                    {isFocused ? (
                      <FocusedOccurrence
                        occurrence={match}
                        stream={moonlightSonata}
                        range={FULL_RANGE}
                        showStaff={showStaff}
                        onClose={() => setFocusedIndex(null)}
                      />
                    ) : focusedIndex === null && sharedRange ? (
                      <OnsetStrip
                        occurrence={match}
                        range={sharedRange}
                        showStaff={showStaff}
                        matchedLabel="matched"
                        matchedGroupName="Matched onsets"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {disclosureOccurrences.length > 0 && sharedRange ? (
          <div className="space-y-2">
            <p className="text-sm">
              {disclosureOccurrences.length === 1 ? 'The onset' : 'The onsets'} containing{' '}
              {selectionText}, and what follows{' '}
              {disclosureOccurrences.length === 1 ? 'it' : 'each'}:
            </p>
            <ul className="space-y-3" aria-label="Containing onset list">
              {disclosureOccurrences.map((occurrence, index) => (
                <li
                  key={`containing-${occurrence.measure}-${occurrence.beat}-${index}`}
                  className="rounded-lg border border-border"
                  style={{ padding: '0.75rem' }}
                >
                  <p className="text-sm font-medium">
                    Measure {occurrence.measure}, beat {formatBeat(occurrence.beat)}
                  </p>
                  <OnsetStrip
                    occurrence={occurrence}
                    range={sharedRange}
                    showStaff={showStaff}
                    matchedLabel="contains"
                    matchedGroupName="Containing onsets"
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
