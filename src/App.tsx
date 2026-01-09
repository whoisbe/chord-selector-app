import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Header } from './components/Header';
import { ByKeyTab } from './components/ByKeyTab';
import { ByNameTab } from './components/ByNameTab';
import { DrillTab } from './components/DrillTab';

export default function App() {
  const [activeMode, setActiveMode] = useState('lookup');
  const [activeTab, setActiveTab] = useState('by-key');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeMode} onValueChange={setActiveMode} className="w-full">
            <TabsList className="mb-6 justify-start gap-0 bg-muted/50 p-1 rounded-full inline-flex w-fit">
              <TabsTrigger 
                value="lookup" 
                className="!rounded-none !rounded-l-full !rounded-r-none flex-1 min-w-0 bg-white text-foreground border-0 data-[state=active]:!bg-foreground data-[state=active]:!text-background data-[state=inactive]:bg-white data-[state=inactive]:text-foreground transition-colors"
              >
                Lookup
              </TabsTrigger>
              <TabsTrigger 
                value="drill" 
                className="!rounded-none !rounded-r-full !rounded-l-none flex-1 min-w-0 bg-white text-foreground border-0 data-[state=active]:!bg-foreground data-[state=active]:!text-background data-[state=inactive]:bg-white data-[state=inactive]:text-foreground transition-colors"
              >
                Drill
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="lookup">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-6 justify-start gap-0 bg-muted/50 p-1 rounded-full inline-flex w-fit">
                  <TabsTrigger 
                    value="by-key" 
                    className="!rounded-none !rounded-l-full !rounded-r-none flex-1 min-w-0 bg-white text-foreground border-0 data-[state=active]:!bg-foreground data-[state=active]:!text-background data-[state=inactive]:bg-white data-[state=inactive]:text-foreground transition-colors"
                  >
                    By Key
                  </TabsTrigger>
                  <TabsTrigger 
                    value="by-name" 
                    className="!rounded-none !rounded-r-full !rounded-l-none flex-1 min-w-0 bg-white text-foreground border-0 data-[state=active]:!bg-foreground data-[state=active]:!text-background data-[state=inactive]:bg-white data-[state=inactive]:text-foreground transition-colors"
                  >
                    By Name
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="by-key">
                  <ByKeyTab />
                </TabsContent>
                
                <TabsContent value="by-name">
                  <ByNameTab />
                </TabsContent>
              </Tabs>
            </TabsContent>
            
            <TabsContent value="drill">
              <DrillTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
