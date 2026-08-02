// Loop 008 smoke surface: proves the ported phrase-search modules work end to end.
// Deliberately minimal — no pitch grid, no group builder, no undo/clear, no hand selector.
// Replaced entirely by Loop 006's two-row keyboard input surface.

import { phraseLookupDemo, PHRASE_LOOKUP_DEMO_NOTICE } from '../data/pieces/phrase-lookup-demo';
import { findPhraseMatches } from '../lib/music/phrase-search';
import { pitchToLabel } from '../lib/music/pitch-label';
import type { PhraseQuery } from '../lib/music/types';

const fixtureQuery: PhraseQuery = {
  hand: 'right',
  groups: [{ notes: [66, 78] }, { notes: [73] }, { notes: [76] }],
};

export function PhraseLookupTab() {
  const matches = findPhraseMatches(phraseLookupDemo, fixtureQuery);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Loop 008 smoke surface — temporary, replaced by Loop 006. {PHRASE_LOOKUP_DEMO_NOTICE}
      </p>
      <p>
        Fixture query: [F#4+F#5] → [C#5] → [E5] — {matches.length} match
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
