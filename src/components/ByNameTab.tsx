import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ChordData, searchChords, calculateVoicings } from '../data/chordDatabase';
import { KeyboardDiagram } from './KeyboardDiagram';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface SelectedChord {
  chord: ChordData;
  order: number;
  isDisplayed: boolean;
}

export function ByNameTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChordData[]>([]);
  const [chordCollection, setChordCollection] = useState<Map<string, SelectedChord>>(new Map());
  const [selectionOrder, setSelectionOrder] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Perform search with debouncing
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          const results = await searchChords(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error('Search failed:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery]);

  const addToCollection = (chord: ChordData) => {
    if (chordCollection.size >= 7) {
      alert('Maximum 7 chords allowed in collection');
      return;
    }

    if (chordCollection.has(chord.name)) {
      alert('Chord already in collection');
      return;
    }

    const newCollection = new Map(chordCollection);
    newCollection.set(chord.name, {
      chord,
      order: selectionOrder,
      isDisplayed: false
    });
    setChordCollection(newCollection);
    setSelectionOrder(selectionOrder + 1);
    setSearchQuery(''); // Clear search after adding
    setSearchResults([]);
  };

  const removeFromCollection = (chordName: string) => {
    const newCollection = new Map(chordCollection);
    newCollection.delete(chordName);
    setChordCollection(newCollection);
  };

  const toggleChordDisplay = (chordName: string) => {
    const newCollection = new Map(chordCollection);
    const chordItem = newCollection.get(chordName);
    if (chordItem) {
      newCollection.set(chordName, {
        ...chordItem,
        isDisplayed: !chordItem.isDisplayed
      });
      setChordCollection(newCollection);
    }
  };

  // Get chords to display, sorted by selection order
  const displayedChords = Array.from(chordCollection.values())
    .filter(item => item.isDisplayed)
    .sort((a, b) => a.order - b.order);

  // Get collection items sorted by selection order for filter chips
  const collectionChords = Array.from(chordCollection.values())
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-8">
      {/* Search and Filter Chips Section */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search Input */}
        <Input
          placeholder="Search chords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[180px]"
        />

        {/* Filter Chips */}
        {collectionChords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center">
              Collection ({collectionChords.length}/7):
            </span>
            {collectionChords.map(({ chord, isDisplayed }) => (
              <Badge
                key={chord.name}
                variant={isDisplayed ? "default" : "outline"}
                className="px-3 py-1 cursor-pointer flex items-center gap-2"
              >
                <span onClick={() => toggleChordDisplay(chord.name)}>
                  {chord.name}
                </span>
                <X
                  className="w-3 h-3 hover:text-destructive cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCollection(chord.name);
                  }}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="max-w-md">
          {isSearching ? (
            <div className="text-sm text-muted-foreground p-2">Searching...</div>
          ) : searchResults.length > 0 ? (
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {searchResults.map((chord) => (
                <div
                  key={chord.name}
                  className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                  onClick={() => addToCollection(chord)}
                >
                  <div>
                    <span className="font-medium">{chord.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({chord.notes.join(', ')})
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs">
                    Add
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-2">No chords found</div>
          )}
        </div>
      )}

      {/* Keyboard Diagrams */}
      {displayedChords.length > 0 && (
        <div className="space-y-8">
          <h2 className="text-2xl font-semibold">Keyboard Diagrams</h2>
          {displayedChords.map(({ chord }) => {
            const voicings = calculateVoicings(chord);
            return (
              <div key={chord.name} className="space-y-3">
                <h3 className="text-lg font-medium">
                  {chord.name}
                  <span className="text-sm text-muted-foreground ml-2">
                    ({chord.notes.join(', ')})
                  </span>
                </h3>
                <div className="flex gap-6">
                  {voicings.map((voicing, index) => (
                    <KeyboardDiagram
                      key={`${chord.name}-${index}`}
                      notes={voicing.notes}
                      voicingName={voicing.name}
                      noteNames={voicing.noteNames}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty States */}
      {collectionChords.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <p>Search and add chords to your collection to get started</p>
        </div>
      )}

      {collectionChords.length > 0 && displayedChords.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <p>Click on the chord chips above to view their keyboard diagrams</p>
        </div>
      )}
    </div>
  );
}