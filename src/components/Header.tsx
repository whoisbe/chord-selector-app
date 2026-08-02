import { Button } from './ui/button';
import { cn } from './ui/utils';

interface HeaderProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="w-full bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo/Title on the left */}
        <div className="logo-title text-xl">
          CHORDLAB
        </div>

        {/* Tab Navigation on the right */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'by-key' ? 'default' : 'outline'}
            onClick={() => onTabChange('by-key')}
            className="rounded-lg"
          >
            By Key
          </Button>
          <Button
            variant={activeTab === 'by-name' ? 'default' : 'outline'}
            onClick={() => onTabChange('by-name')}
            className="rounded-lg"
          >
            By Name
          </Button>
          <Button
            variant={activeTab === 'phrase-lookup' ? 'default' : 'outline'}
            onClick={() => onTabChange('phrase-lookup')}
            className="rounded-lg"
          >
            Phrase Lookup
          </Button>
        </div>
      </div>
    </header>
  );
}
