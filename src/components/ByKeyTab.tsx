import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { CHORD_CHART, getChordVoicings } from '../data/chordData';
import { KeyboardDiagram } from './KeyboardDiagram';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import { cn } from './ui/utils';

interface SelectedChord {
  chord: string;
  order: number;
}

export function ByKeyTab() {
  const [open, setOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [selectedChords, setSelectedChords] = useState<Map<string, SelectedChord>>(new Map());
  const [selectionOrder, setSelectionOrder] = useState(0);

  const currentKeyData = CHORD_CHART.find(k => `${k.name} ${k.type}` === selectedKey);
  const diatonicChords = currentKeyData?.chords || [];

  const handleKeySelect = (keyName: string) => {
    setSelectedKey(keyName);
    setSelectedChords(new Map());
    setSelectionOrder(0);
    setOpen(false);
  };

  const toggleChord = (chord: string) => {
    const newSelected = new Map(selectedChords);
    
    if (newSelected.has(chord)) {
      newSelected.delete(chord);
    } else {
      newSelected.set(chord, { chord, order: selectionOrder });
      setSelectionOrder(selectionOrder + 1);
    }
    
    setSelectedChords(newSelected);
  };

  // Sort selected chords by selection order
  const sortedSelectedChords = Array.from(selectedChords.values())
    .sort((a, b) => a.order - b.order)
    .map(item => item.chord);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        {/* Key Selector Dropdown */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[280px] justify-between"
            >
              {selectedKey || "Select a key..."}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0">
            <Command>
              <CommandInput placeholder="Search keys..." />
              <CommandList>
                <CommandEmpty>No key found.</CommandEmpty>
                <CommandGroup heading="Major Keys">
                  {CHORD_CHART.filter(k => k.type === 'Major').map((key) => {
                    const keyName = `${key.name} ${key.type}`;
                    return (
                      <CommandItem
                        key={keyName}
                        value={keyName}
                        onSelect={() => handleKeySelect(keyName)}
                      >
                        {keyName}
                        <Check
                          className={cn(
                            'ml-auto',
                            selectedKey === keyName ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandGroup heading="Minor Keys">
                  {CHORD_CHART.filter(k => k.type === 'Minor').map((key) => {
                    const keyName = `${key.name} ${key.type}`;
                    return (
                      <CommandItem
                        key={keyName}
                        value={keyName}
                        onSelect={() => handleKeySelect(keyName)}
                      >
                        {keyName}
                        <Check
                          className={cn(
                            'ml-auto',
                            selectedKey === keyName ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Chord Toggle Chips */}
        {diatonicChords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {diatonicChords.map((chord) => {
              const isSelected = selectedChords.has(chord);
              return (
                <Button
                  key={chord}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleChord(chord)}
                  className="min-w-[60px]"
                >
                  {chord}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Keyboard Diagrams */}
      {sortedSelectedChords.length > 0 && (
        <div className="space-y-8">
          <h2 className="text-2xl font-semibold">Keyboard Diagrams</h2>
          {sortedSelectedChords.map((chord) => {
            const voicings = getChordVoicings(chord);
            return (
              <div key={chord} className="space-y-3">
                <h3 className="text-lg font-medium">{chord}</h3>
                <div className="flex gap-6">
                  {voicings.map((voicing, index) => (
                    <KeyboardDiagram
                      key={`${chord}-${index}`}
                      notes={voicing.notes}
                      voicingName={voicing.name}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!selectedKey && (
        <div className="text-center text-muted-foreground py-12">
          <p>Select a key to get started</p>
        </div>
      )}
      
      {selectedKey && sortedSelectedChords.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <p>Toggle chord chips to view keyboard diagrams</p>
        </div>
      )}
    </div>
  );
}