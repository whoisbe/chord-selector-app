# Chord Selector Application

Live version running [here](https://chords.still.codes/)

Chord Selector is an interactive web tool for piano chord lookup and visualization. Designed for musicians, students, and composers, it allows you to search and explore a wide variety of piano chords by musical key or chord name, with instant feedback through visual keyboard diagrams and chord voicings.

## Features

- **Chord Lookup by Key:** Select a key (Major or Minor) to quickly view and toggle all diatonic chords available in that key.
- **Chord Lookup by Name:** Search for thousands of supported chords by name, including extensions and variations. Intelligent autocomplete and sorting prioritize relevant results.
- **Visual Keyboard Diagrams:** Every selected chord renders a diagram showing the notes on a piano keyboard. Multiple voicings (root, inversions, etc.) are displayed when available.
- **Chord Voicings:** See root position and inversions for all chords to aid voicing practice and arrangement.
- **Chord Collections:** Build a custom set of chords (either by key or by name) to view together or compare.
- **Responsive UI:** Built using modern React and Typescript with a clean, accessible design.

## Demo & Design

Original design concept available at [Figma: Chord Selector Application](https://www.figma.com/design/NOoxImScZ7zaWpPthcEAcB/Chord-Selector-Application).

## Getting Started

### Prerequisites

- [Node.js & npm](https://nodejs.org/)
- Any modern web browser

### Setup

Clone the repository:
```sh
git clone https://github.com/whoisbe/chord-selector-app.git
cd chord-selector-app
```

Install dependencies:
```sh
npm i
```

Start the development server:
```sh
npm run dev
```

Open your browser and navigate to `http://localhost:5173` (or shown address).

## Usage

1. Launch the app; you'll land on the Chord Lookup interface.
2. Use the tabs to select "By Key" or "By Name".
    - **By Key:** Pick a key and toggle any diatonic chord you wish to explore.
    - **By Name:** Start typing a chord name in the search, select matches, and add them to your collection.
3. Selected chords appear with visual keyboard diagrams, showing notes played and their musical names.
4. Use the diagrams to learn fingerings, study voicings, or craft progressions.

## Project Structure

- `src/App.tsx`: Main UI, routing between tabs.
- `src/components/ByKeyTab.tsx`: Key-based chord selection, UI logic.
- `src/components/ByNameTab.tsx`: Chord name search, collection UI.
- `src/components/KeyboardDiagram.tsx`: Renders the visual piano keyboard for chords.
- `src/data/chordData.ts` and `src/data/chordDatabase.ts`: Chord definitions, parsing routines, voicing calculations.
- `/chords.csv`: Data file containing all supported chords (read and parsed at runtime).

## Contributing

Pull requests and issues are welcome! Feel free to fork, improve documentation, add new chord sets, or help refactor the code.

## License

MIT License

## Acknowledgments

Thanks to the Figma design inspiration and open musical data sources. This project is open for extension to cover other instruments, chord types, or pedagogical features.
