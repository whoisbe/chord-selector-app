// Phrase lookup: point at where your hands went, across two rows, and the
// keyboard shows what can come next.
//
// Rows are an input and display affordance only. The query that reaches
// findPhraseMatches carries no staff at all (ADR 0002) — a group selected as
// F#3 on the lower row plus F#4 on the upper row is simply [54, 66].

import { useCallback, useMemo, useState } from 'react';

import { Button } from '../ui/button';
import { MOONLIGHT_SONATA_NAME, moonlightSonata } from '../../data/pieces/moonlight-sonata';
import {
  applyCapture,
  selectionPitches,
  type PitchCapture,
  type SelectedKey,
  type StaffRow,
} from '../../lib/music/capture';
import {
  possibleContinuationsByStaff,
  staffPitchRanges,
  streamPitchRange,
  type PitchRange,
  type StaffContinuation,
} from '../../lib/music/continuations';
import { keyLayout } from '../../lib/music/keyboard';
import { findPhraseMatches } from '../../lib/music/phrase-search';
import { pitchToLabel } from '../../lib/music/pitch-label';
import type { NoteGroup, PhraseQuery } from '../../lib/music/types';
import { PhraseKeyboard, type KeyboardRow } from './PhraseKeyboard';

// Exact matching on a one-note prefix hits many places; the count is the
// honest signal and the list is only a sample of it.
const MAX_RENDERED_RESULTS = 20;

const FULL_RANGE: PitchRange = streamPitchRange(moonlightSonata) ?? { minPitch: 29, maxPitch: 87 };
const STAFF_RANGES = staffPitchRanges(moonlightSonata);

function formatBeat(beat: number): string {
  return Number.isInteger(beat) ? String(beat) : beat.toFixed(2);
}

function formatGroup(notes: readonly number[]): string {
  return `[${notes.map(pitchToLabel).join('+')}]`;
}

// StaffContinuation entries carry no staff data for a piece that carries
// none itself (ADR 0002) — that reads as "light on both rows", same as the
// availability lookup this backs.
function toStaffPitchMap(continuations: readonly StaffContinuation[]): Map<StaffRow, Set<number>> {
  const byStaff = new Map<StaffRow, Set<number>>([
    [1, new Set<number>()],
    [2, new Set<number>()],
  ]);

  for (const continuation of continuations) {
    const staves: StaffRow[] =
      continuation.staves.length === 0
        ? [1, 2]
        : continuation.staves.filter((staff): staff is StaffRow => staff === 1 || staff === 2);

    for (const staff of staves) {
      byStaff.get(staff)?.add(continuation.pitch);
    }
  }

  return byStaff;
}

function rangeCaption(staff: StaffRow): string {
  const range = STAFF_RANGES.get(staff);
  if (!range) {
    return 'full range';
  }

  return `staff ${staff} · ${pitchToLabel(range.minPitch)}–${pitchToLabel(range.maxPitch)}`;
}

// A matched group drawn across the two rows: which notes each hand takes is
// what you need in order to actually play it.
function GroupByStaff({ group }: { group: NoteGroup }) {
  const rows: Array<{ staff: StaffRow; notes: number[] }> = [1, 2].map((staff) => ({
    staff: staff as StaffRow,
    notes: group.notes.filter((_, index) => group.staves?.[index] === staff),
  }));
  const unattributed = group.notes.filter((_, index) => group.staves?.[index] === undefined);

  return (
    <span
      className="inline-flex flex-col rounded-lg border border-border px-2 text-xs"
      style={{ paddingTop: '4px', paddingBottom: '4px', lineHeight: 1.35 }}
    >
      {rows.map((row) => (
        <span key={row.staff} className={row.notes.length === 0 ? 'text-muted-foreground' : ''}>
          <span className="text-muted-foreground">{row.staff === 1 ? 'upper' : 'lower'} </span>
          {row.notes.length === 0 ? '—' : row.notes.map(pitchToLabel).join(' + ')}
        </span>
      ))}
      {unattributed.length > 0 ? <span>{unattributed.map(pitchToLabel).join(' + ')}</span> : null}
    </span>
  );
}

export function PhraseLookupSurface() {
  const [selection, setSelection] = useState<readonly SelectedKey[]>([]);
  const [committed, setCommitted] = useState<readonly SelectedKey[][]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  // The search control is a fallback only — results already update on commit.
  const [searchNonce, setSearchNonce] = useState(0);

  const keys = useMemo(() => keyLayout(FULL_RANGE.minPitch, FULL_RANGE.maxPitch), []);

  const rows: KeyboardRow[] = useMemo(
    () => [
      { staff: 1, title: 'Upper row', caption: rangeCaption(1), extent: STAFF_RANGES.get(1) },
      { staff: 2, title: 'Lower row', caption: rangeCaption(2), extent: STAFF_RANGES.get(2) },
    ],
    [],
  );

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
  // whatever is already picked for the group in progress. Kept separately
  // so a key blocked by co-occurrence can be told apart from one blocked by
  // sequence alone (Section 6): the same call with an empty selection is
  // what Loop 006 always computed.
  const sequenceOnlyByStaff = useMemo(
    () => toStaffPitchMap(possibleContinuationsByStaff(moonlightSonata, prefix)),
    [prefix],
  );

  // Both constraints composed — the group being assembled must actually
  // occur, not just be able to follow the committed phrase.
  const availableByStaff = useMemo(
    () =>
      toStaffPitchMap(
        possibleContinuationsByStaff(moonlightSonata, prefix, currentSelectionPitches),
      ),
    [prefix, currentSelectionPitches],
  );

  // Sequence-continuable but excluded once co-occurrence is applied: a dead
  // end that exists only because of what is already selected, not because
  // it can never follow the phrase. Empty whenever nothing is selected yet,
  // which is what keeps the empty-selection behaviour identical to Loop 006.
  const blockedByCoOccurrenceByStaff = useMemo(() => {
    const blocked = new Map<StaffRow, Set<number>>([
      [1, new Set<number>()],
      [2, new Set<number>()],
    ]);

    if (currentSelectionPitches.length === 0) {
      return blocked;
    }

    for (const staff of [1, 2] as StaffRow[]) {
      const sequenceSet = sequenceOnlyByStaff.get(staff)!;
      const availableSet = availableByStaff.get(staff)!;
      const blockedSet = blocked.get(staff)!;

      for (const pitch of sequenceSet) {
        if (!availableSet.has(pitch) && !currentSelectionPitches.includes(pitch)) {
          blockedSet.add(pitch);
        }
      }
    }

    return blocked;
  }, [sequenceOnlyByStaff, availableByStaff, currentSelectionPitches]);

  const availableCount = availableByStaff.get(1)!.size + availableByStaff.get(2)!.size;

  const handleCapture = useCallback((capture: PitchCapture) => {
    setNotice(null);
    setSelection((current) => applyCapture(current, capture));
  }, []);

  const commitGroup = useCallback(() => {
    if (selection.length === 0) {
      setNotice('Select at least one key on either row before adding a group.');
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
          Click where your hands went. Highlighted keys are the notes that can actually come next
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
        rows={rows}
        selection={selection}
        availableByStaff={availableByStaff}
        blockedByCoOccurrenceByStaff={blockedByCoOccurrenceByStaff}
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
            {availableCount} possible next {availableCount === 1 ? 'key' : 'keys'} highlighted
          </span>
        </div>

        <p className="text-sm" data-testid="current-selection">
          <span className="text-muted-foreground">Current group: </span>
          {selectionText ?? 'nothing selected'}
        </p>

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
        {prefix.length === 0 ? (
          <p className="text-muted-foreground text-sm" data-testid="empty-query-message">
            No groups entered yet. Select the keys of one onset on either row, then press Add
            group.
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
                ? ` — showing the first ${MAX_RENDERED_RESULTS}`
                : ''}
            </p>
            <ul className="space-y-3">
              {matches.slice(0, MAX_RENDERED_RESULTS).map((match, index) => (
                <li
                  key={`${match.measure}-${match.beat}-${index}`}
                  className="rounded-lg border border-border"
                  style={{ padding: '0.75rem' }}
                  data-testid="result-item"
                >
                  <p className="text-sm font-medium">
                    Measure {match.measure}, beat {formatBeat(match.beat)}
                  </p>
                  <div
                    className="flex flex-wrap items-center gap-2"
                    style={{ marginTop: '0.5rem' }}
                  >
                    <span className="text-muted-foreground text-xs">matched</span>
                    {match.matchedGroups.map((group, position) => (
                      <GroupByStaff key={`matched-${position}`} group={group} />
                    ))}
                  </div>
                  <div
                    className="flex flex-wrap items-center gap-2"
                    style={{ marginTop: '0.5rem' }}
                  >
                    <span className="text-muted-foreground text-xs">then</span>
                    {match.followingGroups.length === 0 ? (
                      <span className="text-xs">end of movement</span>
                    ) : (
                      match.followingGroups.map((group, position) => (
                        <GroupByStaff key={`following-${position}`} group={group} />
                      ))
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
