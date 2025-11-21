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

// Convert chord notes to MIDI preserving voicing order
// Ensures all notes are in ascending order by moving them up octaves as needed
function convertChordNotesToMidi(notes: string[]): number[] {
  if (notes.length === 0) return [];
  
  const midiNotes: number[] = [];
  
  // Convert first note (root) normally
  const rootMidi = noteToMidi(notes[0]);
  midiNotes.push(rootMidi);
  
  // For subsequent notes, ensure each is higher than the previous
  for (let i = 1; i < notes.length; i++) {
    let noteMidi = noteToMidi(notes[i]);
    
    // Keep moving the note up octaves until it's higher than the previous note
    while (noteMidi <= midiNotes[midiNotes.length - 1]) {
      noteMidi += 12;
    }
    
    midiNotes.push(noteMidi);
  }
  
  return midiNotes;
}

// Parse CSV data into chord objects
async function parseChordData(): Promise<ChordData[]> {
  try {
    let csvText: string;
    
    // Check if we're in a Node.js environment (for testing)
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // Node.js environment - read file directly
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', 'chords.csv');
      csvText = fs.readFileSync(filePath, 'utf-8');
    } else {
      // Browser environment - use fetch
      const response = await fetch('/chords.csv');
      csvText = await response.text();
    }
    
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
      const midiNotes = convertChordNotesToMidi(notes);
      
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
  
  // Keep original order for root position (CSV order is root position)
  // The CSV should have notes in root position order (root, 3rd, 5th, etc.)
  const rootNotes = [...midiNotes];
  
  // Keyboard range: C4 (MIDI 60) to B5 (MIDI 83) - 2 octaves
  const KEYBOARD_MIN = 60;
  const KEYBOARD_MAX = 83;
  
  const voicings: ChordVoicing[] = [];
  
  // Root position - keep original order from CSV
  voicings.push({
    name: 'Root',
    notes: rootNotes
  });
  
  // Generate inversions by rotating notes and ensuring ascending order
  const numInversions = Math.min(rootNotes.length, 4); // Max 4 voicings
  
  for (let inv = 1; inv < numInversions; inv++) {
    const invNotes = [...rootNotes];
    
    // Move the first 'inv' notes up an octave
    for (let i = 0; i < inv; i++) {
      invNotes[i] += 12;
    }
    
    // Rotate array by moving first 'inv' notes to the end
    const rotatedNotes = invNotes.slice(inv).concat(invNotes.slice(0, inv));
    
    // Ensure notes are in ascending order by adjusting octaves if needed
    const sortedInversion: number[] = [rotatedNotes[0]];
    for (let i = 1; i < rotatedNotes.length; i++) {
      let note = rotatedNotes[i];
      // If this note is lower than the previous, move it up an octave
      while (note <= sortedInversion[sortedInversion.length - 1]) {
        note += 12;
      }
      sortedInversion.push(note);
    }
    
    // If the highest note exceeds the keyboard range, shift all notes down an octave
    const highestNote = Math.max(...sortedInversion);
    if (highestNote > KEYBOARD_MAX) {
      const adjustedNotes = sortedInversion.map(note => note - 12);
      
      const inversionName = inv === 1 ? '1st Inv' : inv === 2 ? '2nd Inv' : '3rd Inv';
      voicings.push({
        name: inversionName,
        notes: adjustedNotes
      });
    } else {
      const inversionName = inv === 1 ? '1st Inv' : inv === 2 ? '2nd Inv' : '3rd Inv';
      voicings.push({
        name: inversionName,
        notes: sortedInversion
      });
    }
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