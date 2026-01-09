import React from 'react';

interface KeyboardDiagramProps {
  notes: number[];
  voicingName: string;
  noteNames?: string[];
}

export function KeyboardDiagram({ notes, voicingName, noteNames }: KeyboardDiagramProps) {
  // Generate 2 octaves of keys starting from C (MIDI 60)
  const startNote = 60; // C4
  const numOctaves = 2;
  const totalKeys = numOctaves * 12;
  
  const whiteKeyPattern = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
  const blackKeyPattern = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#
  
  const whiteKeys: number[] = [];
  const blackKeys: number[] = [];
  
  for (let i = 0; i < totalKeys; i++) {
    const noteInOctave = i % 12;
    const midiNote = startNote + i;
    
    if (whiteKeyPattern.includes(noteInOctave)) {
      whiteKeys.push(midiNote);
    } else if (blackKeyPattern.includes(noteInOctave)) {
      blackKeys.push(midiNote);
    }
  }
  
  const getNoteName = (midi: number) => {
    // If noteNames are provided, use them for correct enharmonics
    if (noteNames) {
      const noteIndex = notes.indexOf(midi);
      if (noteIndex !== -1 && noteIndex < noteNames.length) {
        return noteNames[noteIndex];
      }
    }
    // Fallback to default sharp notation
    const defaultNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
    return defaultNames[midi % 12];
  };
  
  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted-foreground text-sm">{voicingName}</div>
      <div className="relative inline-block" style={{ minHeight: '80px' }}>
        {/* White keys */}
        <div className="flex gap-[1px] relative z-0">
          {whiteKeys.map((midiNote) => {
            const isActive = notes.includes(midiNote);
            return (
              <div
                key={`white-${midiNote}`}
                className={`w-5 h-20 border border-border rounded-b transition-all relative ${
                  isActive 
                    ? 'shadow-lg' 
                    : 'bg-white shadow-sm'
                }`}
                style={isActive ? {
                  background: 'linear-gradient(135deg, rgba(31, 112, 95, 0.85) 0%, rgba(31, 112, 95, 0.95) 50%, rgba(20, 80, 70, 0.9) 100%)',
                  borderColor: '#1f705f',
                  backdropFilter: 'blur(10px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                  boxShadow: `
                    inset 0 1px 0 rgba(255, 255, 255, 0.4),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.3),
                    0 4px 12px rgba(31, 112, 95, 0.4),
                    0 2px 4px rgba(0, 0, 0, 0.2)
                  `,
                } : undefined}
              >
                {isActive && (
                  <div 
                    className="absolute inset-0 rounded-b pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%)',
                      mixBlendMode: 'overlay',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Black keys */}
        <div className="absolute top-0 left-0 pointer-events-none z-10" style={{ width: '100%', height: '80px' }}>
          {whiteKeys.map((whiteKeyMidi, index) => {
            const noteInOctave = whiteKeyMidi % 12;
            
            // Determine if there should be a black key between this white key and the next
            // Black keys exist between: C-D, D-E, F-G, G-A, A-B
            // No black keys between: E-F, B-C
            let blackKeyMidi = null;
            
            if (noteInOctave === 0) blackKeyMidi = whiteKeyMidi + 1; // C# between C and D
            else if (noteInOctave === 2) blackKeyMidi = whiteKeyMidi + 1; // D# between D and E
            else if (noteInOctave === 5) blackKeyMidi = whiteKeyMidi + 1; // F# between F and G
            else if (noteInOctave === 7) blackKeyMidi = whiteKeyMidi + 1; // G# between G and A
            else if (noteInOctave === 9) blackKeyMidi = whiteKeyMidi + 1; // A# between A and B
            
            const hasBlackKey = blackKeyMidi && blackKeys.includes(blackKeyMidi);
            const isActive = blackKeyMidi && notes.includes(blackKeyMidi);
            
            if (!hasBlackKey) return null;
            
            // Calculate exact position: each white key is 20px (w-5) + 1px gap
            // Position black key exactly between this white key and the next
            const whiteKeyWidth = 20; // w-5 = 20px
            const gapWidth = 1; // gap-[1px] = 1px
            const leftPosition = index * (whiteKeyWidth + gapWidth) + whiteKeyWidth + (gapWidth / 2);
            
            return (
              <div
                key={`black-key-${blackKeyMidi}`}
                className={`absolute w-3 h-12 rounded-b transition-all ${
                  isActive 
                    ? 'shadow-lg' 
                    : 'bg-black shadow-md'
                }`}
                style={{
                  left: `${leftPosition}px`,
                  top: '0px',
                  transform: 'translateX(-50%)',
                  ...(isActive ? {
                    background: 'linear-gradient(135deg, rgba(31, 112, 95, 0.9) 0%, rgba(31, 112, 95, 1) 50%, rgba(15, 60, 50, 0.95) 100%)',
                    borderColor: '#1f705f',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    backdropFilter: 'blur(10px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                    boxShadow: `
                      inset 0 1px 0 rgba(255, 255, 255, 0.3),
                      inset 0 -1px 0 rgba(0, 0, 0, 0.4),
                      0 4px 12px rgba(31, 112, 95, 0.5),
                      0 2px 4px rgba(0, 0, 0, 0.3)
                    `,
                  } : {})
                }}
              >
                {isActive && (
                  <div 
                    className="absolute inset-0 rounded-b pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 50%, rgba(0, 0, 0, 0.15) 100%)',
                      mixBlendMode: 'overlay',
                    }}
                  />
                )}
              </div>
            );
          }).filter(Boolean)}
        </div>
        
        {/* Note labels below keyboard */}
        <div className="relative mt-1" style={{ marginTop: '4px' }}>
          {/* White key labels */}
          <div className="flex gap-[1px]">
            {whiteKeys.map((midiNote) => {
              const isActive = notes.includes(midiNote);
              return (
                <div
                  key={`label-${midiNote}`}
                  className={`w-5 text-center text-xs ${
                    isActive ? 'text-[#1f705f] font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {isActive ? getNoteName(midiNote) : ''}
                </div>
              );
            })}
          </div>
          
          {/* Black key labels */}
          <div className="absolute top-0 left-0 pointer-events-none">
            {whiteKeys.map((whiteKeyMidi, index) => {
              const noteInOctave = whiteKeyMidi % 12;
              
              let blackKeyMidi = null;
              if (noteInOctave === 0) blackKeyMidi = whiteKeyMidi + 1; // C#
              else if (noteInOctave === 2) blackKeyMidi = whiteKeyMidi + 1; // D#
              else if (noteInOctave === 5) blackKeyMidi = whiteKeyMidi + 1; // F#
              else if (noteInOctave === 7) blackKeyMidi = whiteKeyMidi + 1; // G#
              else if (noteInOctave === 9) blackKeyMidi = whiteKeyMidi + 1; // A#
              
              const hasBlackKey = blackKeyMidi && blackKeys.includes(blackKeyMidi);
              const isActive = blackKeyMidi && notes.includes(blackKeyMidi);
              
              if (!hasBlackKey || !isActive) return null;
              
              const whiteKeyWidth = 20;
              const gapWidth = 1;
              const leftPosition = index * (whiteKeyWidth + gapWidth) + whiteKeyWidth + (gapWidth / 2);
              
              return (
                <div
                  key={`black-label-${blackKeyMidi}`}
                  className="absolute text-xs text-[#1f705f] font-semibold"
                  style={{
                    left: `${leftPosition}px`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {getNoteName(blackKeyMidi!)}
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      </div>
    </div>
  );
}
