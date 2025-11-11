import { describe, it, expect, beforeAll } from 'vitest';
import { loadChordDatabase, calculateVoicings, ChordData } from '../data/chordDatabase';

describe('Chord Voicings Test Suite', () => {
  let allChords: ChordData[] = [];

  beforeAll(async () => {
    allChords = await loadChordDatabase();
    console.log(`Loaded ${allChords.length} chords from database`);
  });

  it('should load chord database successfully', () => {
    expect(allChords.length).toBeGreaterThan(0);
  });

  it('should have valid MIDI notes for all chords', () => {
    allChords.forEach((chord) => {
      expect(chord.midiNotes.length).toBeGreaterThan(0);
      
      chord.midiNotes.forEach((midi, index) => {
        expect(midi).toBeGreaterThanOrEqual(0);
        expect(midi).toBeLessThanOrEqual(127);
        
        // Check that notes are in ascending order for root position
        if (index > 0) {
          if (midi <= chord.midiNotes[index - 1]) {
            console.log(`Chord ${chord.name} has non-ascending notes: ${chord.notes.join(', ')} → MIDI: ${chord.midiNotes.join(', ')}`);
          }
          expect(midi).toBeGreaterThan(chord.midiNotes[index - 1]);
        }
      });
    });
  });

  it('should generate correct number of inversions for each chord', () => {
    allChords.forEach((chord) => {
      const voicings = calculateVoicings(chord);
      const numNotes = chord.midiNotes.length;
      
      // Expected inversions: root + inversions (up to number of notes)
      // Triad (3 notes): Root, 1st, 2nd = 3 voicings
      // 7th chord (4 notes): Root, 1st, 2nd, 3rd = 4 voicings
      const expectedVoicings = Math.min(numNotes, 4); // Max 4 voicings (root + 3 inversions)
      
      expect(voicings.length).toBe(expectedVoicings);
    });
  });

  it('should have root position as first voicing', () => {
    allChords.forEach((chord) => {
      const voicings = calculateVoicings(chord);
      
      expect(voicings[0].name).toBe('Root');
      expect(voicings[0].notes).toEqual(chord.midiNotes);
    });
  });

  it('should maintain chord notes across all inversions', () => {
    allChords.forEach((chord) => {
      const voicings = calculateVoicings(chord);
      
      voicings.forEach((voicing) => {
        // Each voicing should have the same number of notes
        expect(voicing.notes.length).toBe(chord.midiNotes.length);
        
        // Normalize notes to pitch classes (mod 12) and sort
        const originalPitches = chord.midiNotes.map(n => n % 12).sort((a, b) => a - b);
        const voicingPitches = voicing.notes.map(n => n % 12).sort((a, b) => a - b);
        
        // Both should have the same pitch classes
        expect(voicingPitches).toEqual(originalPitches);
      });
    });
  });

  it('should have notes in ascending order for all inversions', () => {
    allChords.forEach((chord) => {
      const voicings = calculateVoicings(chord);
      
      voicings.forEach((voicing) => {
        for (let i = 1; i < voicing.notes.length; i++) {
          expect(voicing.notes[i]).toBeGreaterThan(voicing.notes[i - 1]);
        }
      });
    });
  });

  it('should have unique lowest note for each inversion', () => {
    allChords.forEach((chord) => {
      const voicings = calculateVoicings(chord);
      const lowestNotes = voicings.map(v => v.notes[0] % 12);
      
      // For chords with enough unique notes, each inversion should have a different bass note
      if (chord.midiNotes.length >= voicings.length) {
        const uniqueLowestNotes = new Set(lowestNotes);
        expect(uniqueLowestNotes.size).toBe(voicings.length);
      }
    });
  });

  describe('Specific Chord Tests', () => {
    it('should correctly voice Fm6 chord', async () => {
      const fm6 = allChords.find(c => c.name === 'Fm6');
      expect(fm6).toBeDefined();
      
      if (fm6) {
        // Fm6 should be F, Ab, C, D
        expect(fm6.notes).toEqual(['F', 'G#', 'C', 'D']); // G# = Ab
        
        const voicings = calculateVoicings(fm6);
        expect(voicings.length).toBe(4); // 4 notes = 4 voicings
        
        // Root position: F, Ab, C, D (all ascending)
        expect(voicings[0].name).toBe('Root');
        const rootPitches = voicings[0].notes.map(n => n % 12);
        expect(rootPitches[0]).toBe(5);  // F
        expect(rootPitches[1]).toBe(8);  // Ab/G#
        expect(rootPitches[2]).toBe(0);  // C
        expect(rootPitches[3]).toBe(2);  // D
        
        // 1st inversion: Ab, C, D, F
        expect(voicings[1].name).toBe('1st Inv');
        expect(voicings[1].notes[0] % 12).toBe(8);  // Ab is lowest
        
        // 2nd inversion: C, D, F, Ab
        expect(voicings[2].name).toBe('2nd Inv');
        expect(voicings[2].notes[0] % 12).toBe(0);  // C is lowest
        
        // 3rd inversion: D, F, Ab, C
        expect(voicings[3].name).toBe('3rd Inv');
        expect(voicings[3].notes[0] % 12).toBe(2);  // D is lowest
      }
    });

    it('should correctly voice Fdim7 chord', async () => {
      const fdim7 = allChords.find(c => c.name === 'Fdim7');
      expect(fdim7).toBeDefined();
      
      if (fdim7) {
        // Fdim7 should be F, Ab, B, D
        expect(fdim7.notes).toEqual(['F', 'G#', 'B', 'D']); // G# = Ab
        
        const voicings = calculateVoicings(fdim7);
        expect(voicings.length).toBe(4);
        
        // Check root position
        const rootPitches = voicings[0].notes.map(n => n % 12);
        expect(rootPitches[0]).toBe(5);  // F
        expect(rootPitches[1]).toBe(8);  // Ab/G#
        expect(rootPitches[2]).toBe(11); // B
        expect(rootPitches[3]).toBe(2);  // D
      }
    });

    it('should correctly voice F major triad', async () => {
      const f = allChords.find(c => c.name === 'F' && c.type === 'Major' && c.extension === 'Triad');
      expect(f).toBeDefined();
      
      if (f) {
        // F major should be F, A, C
        expect(f.notes).toEqual(['F', 'A', 'C']);
        
        const voicings = calculateVoicings(f);
        expect(voicings.length).toBe(3); // 3 notes = 3 voicings
        
        // Root: F, A, C
        expect(voicings[0].notes[0] % 12).toBe(5);  // F
        expect(voicings[0].notes[1] % 12).toBe(9);  // A
        expect(voicings[0].notes[2] % 12).toBe(0);  // C
        
        // 1st inv: A, C, F
        expect(voicings[1].notes[0] % 12).toBe(9);  // A
        
        // 2nd inv: C, F, A
        expect(voicings[2].notes[0] % 12).toBe(0);  // C
      }
    });

    it('should correctly voice C major triad', async () => {
      const c = allChords.find(c => c.name === 'C' && c.type === 'Major' && c.extension === 'Triad');
      expect(c).toBeDefined();
      
      if (c) {
        expect(c.notes).toEqual(['C', 'E', 'G']);
        
        const voicings = calculateVoicings(c);
        expect(voicings.length).toBe(3);
        
        // Root: C, E, G (should all be in same octave)
        const root = voicings[0].notes;
        expect(root[0] % 12).toBe(0);  // C
        expect(root[1] % 12).toBe(4);  // E
        expect(root[2] % 12).toBe(7);  // G
        expect(root[0]).toBeLessThan(root[1]);
        expect(root[1]).toBeLessThan(root[2]);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle chords with all notes in ascending order', () => {
      // Chords like C major (C, E, G) where all notes naturally ascend
      const cMajor = allChords.find(c => c.name === 'C' && c.type === 'Major' && c.extension === 'Triad');
      
      if (cMajor) {
        const voicings = calculateVoicings(cMajor);
        voicings.forEach(voicing => {
          for (let i = 1; i < voicing.notes.length; i++) {
            expect(voicing.notes[i]).toBeGreaterThan(voicing.notes[i - 1]);
          }
        });
      }
    });

    it('should handle chords with octave wrapping', () => {
      // Chords like F6 (F, A, C, D) where some notes wrap to next octave
      const f6 = allChords.find(c => c.name === 'F6');
      
      if (f6) {
        expect(f6.notes.length).toBeGreaterThan(0);
        const voicings = calculateVoicings(f6);
        
        voicings.forEach(voicing => {
          // All notes should be in ascending order
          for (let i = 1; i < voicing.notes.length; i++) {
            expect(voicing.notes[i]).toBeGreaterThan(voicing.notes[i - 1]);
          }
        });
      }
    });
  });

  describe('Statistical Summary', () => {
    it('should provide chord database statistics', () => {
      const stats = {
        total: allChords.length,
        byType: {} as Record<string, number>,
        byExtension: {} as Record<string, number>,
        byNoteCount: {} as Record<number, number>,
      };

      allChords.forEach(chord => {
        // Count by type
        stats.byType[chord.type] = (stats.byType[chord.type] || 0) + 1;
        
        // Count by extension
        stats.byExtension[chord.extension] = (stats.byExtension[chord.extension] || 0) + 1;
        
        // Count by number of notes
        const noteCount = chord.midiNotes.length;
        stats.byNoteCount[noteCount] = (stats.byNoteCount[noteCount] || 0) + 1;
      });

      console.log('\n=== Chord Database Statistics ===');
      console.log(`Total Chords: ${stats.total}`);
      console.log('\nBy Type:', stats.byType);
      console.log('\nBy Extension:', stats.byExtension);
      console.log('\nBy Note Count:', stats.byNoteCount);

      expect(stats.total).toBeGreaterThan(0);
    });
  });
});
