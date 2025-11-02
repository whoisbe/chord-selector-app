// For now, we'll read the CSV data at build time and embed it
// In a production app, you'd typically fetch this from an API or use a bundler plugin

export interface ChordData {
  name: string;
  notes: string[];
  midiNotes: number[];
  type: string;
  extension: string;
}

export interface ChordVoicing {
  name: string;
  notes: number[];
}

// Convert note name to MIDI number (C4 = 60)
function noteToMidi(noteName: string): number {
  const noteMap: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11
  };
  
  const cleanNote = noteName.trim();
  const baseNote = noteMap[cleanNote];
  
  if (baseNote === undefined) {
    console.warn(`Unknown note: ${cleanNote}`);
    return 60; // Default to C4
  }
  
  return baseNote + 60; // Place in 4th octave (C4 = 60)
}

// Parse CSV data into chord objects
async function parseChordData(): Promise<ChordData[]> {
  try {
    const response = await fetch('/chords.csv');
    const csvText = await response.text();
    
    const lines = csvText.trim().split('\n');
    const chords: ChordData[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line (handle quoted fields with commas)
      const matches = line.match(/^([^,]+),\"([^\"]+)\",([^,]+),(.+)$/);
      if (!matches) {
        console.warn(`Could not parse line: ${line}`);
        continue;
      }
      
      const [, name, notesStr, type, extension] = matches;
      const notes = notesStr.split(',').map((note: string) => note.trim());
      const midiNotes = notes.map(noteToMidi);
      
      chords.push({
        name: name.trim(),
        notes,
        midiNotes,
        type: type.trim(),
        extension: extension.trim()
      });
    }
    
    return chords;
  } catch (error) {
    console.error('Failed to load chord data:', error);
    return [];
  }
}

// Calculate chord inversions
export function calculateVoicings(chord: ChordData): ChordVoicing[] {
  const { name, midiNotes } = chord;
  
  if (midiNotes.length === 0) {
    return [];
  }
  
  // Sort notes to ensure consistent ordering
  const sortedNotes = [...midiNotes].sort((a, b) => a - b);
  
  const voicings: ChordVoicing[] = [];
  
  // Root position
  voicings.push({
    name: 'Root',
    notes: sortedNotes
  });
  
  // First inversion - move lowest note up an octave
  if (sortedNotes.length > 1) {
    const firstInv = [...sortedNotes];
    firstInv[0] += 12; // Move root up an octave
    firstInv.sort((a, b) => a - b);
    voicings.push({
      name: '1st Inv',
      notes: firstInv
    });
  }
  
  // Second inversion - move two lowest notes up an octave
  if (sortedNotes.length > 2) {
    const secondInv = [...sortedNotes];
    secondInv[0] += 12; // Move root up an octave
    secondInv[1] += 12; // Move second note up an octave
    secondInv.sort((a, b) => a - b);
    voicings.push({
      name: '2nd Inv',
      notes: secondInv
    });
  }
  
  return voicings;
}

// Chord database singleton
let chordDatabase: ChordData[] | null = null;

// Load chord database
export async function loadChordDatabase(): Promise<ChordData[]> {
  if (chordDatabase) return chordDatabase;
  
  chordDatabase = await parseChordData();
  return chordDatabase;
}

// Search chords by name (for autocomplete)
export async function searchChords(query: string): Promise<ChordData[]> {
  if (!query.trim()) return [];
  
  const chords = await loadChordDatabase();
  const lowerQuery = query.toLowerCase();
  
  const results = chords.filter((chord: ChordData) => 
    chord.name.toLowerCase().includes(lowerQuery)
  );
  
  // Sort results to prioritize better matches
  const sortedResults = results.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    
    // 1. Exact matches first
    if (aName === lowerQuery && bName !== lowerQuery) return -1;
    if (bName === lowerQuery && aName !== lowerQuery) return 1;
    
    // 2. Starts with query second
    const aStartsWith = aName.startsWith(lowerQuery);
    const bStartsWith = bName.startsWith(lowerQuery);
    if (aStartsWith && !bStartsWith) return -1;
    if (bStartsWith && !aStartsWith) return 1;
    
    // 3. Prefer simpler chords (Major/Minor triads)
    const aIsSimple = a.type === 'Major' && a.extension === 'Triad';
    const bIsSimple = b.type === 'Major' && b.extension === 'Triad';
    if (aIsSimple && !bIsSimple) return -1;
    if (bIsSimple && !aIsSimple) return 1;
    
    // 4. Shorter names first (simpler chords)
    if (aName.length !== bName.length) {
      return aName.length - bName.length;
    }
    
    // 5. Alphabetical order
    return aName.localeCompare(bName);
  });
  
  return sortedResults.slice(0, 20); // Limit results for performance
}