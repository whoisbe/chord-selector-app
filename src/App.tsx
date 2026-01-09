import { useState } from 'react';
import { Tabs, TabsContent } from './components/ui/tabs';
import { Header } from './components/Header';
import { ByKeyTab } from './components/ByKeyTab';
import { ByNameTab } from './components/ByNameTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('by-key');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="by-key">
              <ByKeyTab />
            </TabsContent>
            
            <TabsContent value="by-name">
              <ByNameTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
