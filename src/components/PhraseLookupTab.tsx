// Loop 004 smoke surface: proves the merged onset stream (ADR 0002) and the
// real ingested Moonlight Sonata movement (ADR 0001) find the founding query.
// Deliberately minimal — no pitch grid, no group builder, no undo/clear.
// Replaced entirely by Loop 006's two-row keyboard input surface.

import { moonlightSonata, MOONLIGHT_SONATA_NAME } from '../data/pieces/moonlight-sonata';
import { findPhraseMatches } from '../lib/music/phrase-search';
import { pitchToLabel } from '../lib/music/pitch-label';
import type { PhraseQuery } from '../lib/music/types';

// The founding query: an F# octave split across both staves, then C#4, E4.
// Exactly one match in the whole movement — measure 12, beat 4.
const foundingQuery: PhraseQuery = {
  groups: [{ notes: [54, 66] }, { notes: [61] }, { notes: [64] }],
};

export function PhraseLookupTab() {
  const matches = findPhraseMatches(moonlightSonata, foundingQuery);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Loop 004 smoke surface — temporary, replaced by Loop 006. Searching {MOONLIGHT_SONATA_NAME}.
      </p>
      <p>
        Founding query: [F#3+F#4] → [C#4] → [E4] — {matches.length} match
        {matches.length === 1 ? '' : 'es'}
      </p>
      <ul className="space-y-1">
        {matches.map((match) => (
          <li key={`${match.measure}-${match.beat}`}>
            Measure {match.measure}, beat {match.beat} — followed by{' '}
            {match.followingGroups
              .map((group) => `[${group.notes.map(pitchToLabel).join('+')}]`)
              .join(' ')}
          </li>
        ))}
      </ul>
    </div>
  );
}
