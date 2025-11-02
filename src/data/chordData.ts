// Chord data based on the CHORD KEY CHART
export interface KeyData {
  name: string;
  type: 'Major' | 'Minor';
  chords: string[];
}

export const CHORD_CHART: KeyData[] = [
  // Major Keys
  { name: 'C', type: 'Major', chords: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°'] },
  { name: 'D♭', type: 'Major', chords: ['D♭', 'E♭m', 'Fm', 'G♭', 'A♭', 'B♭m', 'C°'] },
  { name: 'D', type: 'Major', chords: ['D', 'Em', 'F♯m', 'G', 'A', 'Bm', 'C♯°'] },
  { name: 'E♭', type: 'Major', chords: ['E♭', 'Fm', 'Gm', 'A♭', 'B♭', 'Cm', 'D°'] },
  { name: 'E', type: 'Major', chords: ['E', 'F♯m', 'G♯m', 'A', 'B', 'C♯m', 'D♯°'] },
  { name: 'F', type: 'Major', chords: ['F', 'Gm', 'Am', 'B♭', 'C', 'Dm', 'E°'] },
  { name: 'G♭', type: 'Major', chords: ['G♭', 'A♭m', 'B♭m', 'B', 'D♭', 'E♭m', 'F°'] },
  { name: 'G', type: 'Major', chords: ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F♯°'] },
  { name: 'A♭', type: 'Major', chords: ['A♭', 'B♭m', 'Cm', 'D♭', 'E♭', 'Fm', 'G°'] },
  { name: 'A', type: 'Major', chords: ['A', 'Bm', 'C♯m', 'D', 'E', 'F♯m', 'G♯°'] },
  { name: 'B♭', type: 'Major', chords: ['B♭', 'Cm', 'Dm', 'E♭', 'F', 'Gm', 'A°'] },
  { name: 'B', type: 'Major', chords: ['B', 'C♯m', 'D♯m', 'E', 'F♯', 'G♯m', 'A♯°'] },
  
  // Minor Keys
  { name: 'Am', type: 'Minor', chords: ['Am', 'B°', 'C', 'Dm', 'Em', 'F', 'G'] },
  { name: 'B♭m', type: 'Minor', chords: ['B♭m', 'C°', 'D♭', 'E♭m', 'Fm', 'G♭', 'A♭'] },
  { name: 'Bm', type: 'Minor', chords: ['Bm', 'C♯°', 'D', 'Em', 'F♯m', 'G', 'A'] },
  { name: 'Cm', type: 'Minor', chords: ['Cm', 'D°', 'E♭', 'Fm', 'Gm', 'A♭', 'B♭'] },
  { name: 'C♯m', type: 'Minor', chords: ['C♯m', 'D♯°', 'E', 'F♯m', 'G♯m', 'A', 'B'] },
  { name: 'Dm', type: 'Minor', chords: ['Dm', 'E°', 'F', 'Gm', 'Am', 'B♭', 'C'] },
  { name: 'D♯m', type: 'Minor', chords: ['D♯m', 'E♯°', 'F♯', 'G♯m', 'A♯m', 'B', 'C♯'] },
  { name: 'Em', type: 'Minor', chords: ['Em', 'F♯°', 'G', 'Am', 'Bm', 'C', 'D'] },
  { name: 'Fm', type: 'Minor', chords: ['Fm', 'G°', 'A♭', 'B♭m', 'Cm', 'D♭', 'E♭'] },
  { name: 'F♯m', type: 'Minor', chords: ['F♯m', 'G♯°', 'A', 'Bm', 'C♯m', 'D', 'E'] },
  { name: 'Gm', type: 'Minor', chords: ['Gm', 'A°', 'B♭', 'Cm', 'Dm', 'E♭', 'F'] },
  { name: 'G♯m', type: 'Minor', chords: ['G♯m', 'A♯°', 'B', 'C♯m', 'D♯m', 'E', 'F♯'] },
];

// Note to MIDI number mapping
export const NOTE_TO_MIDI: { [key: string]: number } = {
  'C': 60, 'C♯': 61, 'D♭': 61, 'D': 62, 'D♯': 63, 'E♭': 63,
  'E': 64, 'E♯': 65, 'F': 65, 'F♯': 66, 'G♭': 66, 'G': 67,
  'G♯': 68, 'A♭': 68, 'A': 69, 'A♯': 70, 'B♭': 70, 'B': 71,
};

// Function to get notes for a chord (root position)
export function getChordNotes(chord: string): number[] {
  const root = chord.replace(/[°m]/g, '');
  const rootMidi = NOTE_TO_MIDI[root];
  
  if (rootMidi === undefined) return [];
  
  if (chord.includes('°')) {
    // Diminished chord: root, minor 3rd, diminished 5th
    return [rootMidi, rootMidi + 3, rootMidi + 6];
  } else if (chord.includes('m')) {
    // Minor chord: root, minor 3rd, perfect 5th
    return [rootMidi, rootMidi + 3, rootMidi + 7];
  } else {
    // Major chord: root, major 3rd, perfect 5th
    return [rootMidi, rootMidi + 4, rootMidi + 7];
  }
}

// Get chord voicings (root, 1st inversion, 2nd inversion)
export function getChordVoicings(chord: string): { name: string; notes: number[] }[] {
  const rootNotes = getChordNotes(chord);
  
  return [
    { name: 'Root', notes: rootNotes },
    { name: '1st Inv', notes: [rootNotes[1], rootNotes[2], rootNotes[0] + 12] },
    { name: '2nd Inv', notes: [rootNotes[2], rootNotes[0] + 12, rootNotes[1] + 12] },
  ];
}
