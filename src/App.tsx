import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { ByKeyTab } from './components/ByKeyTab';
import { ByNameTab } from './components/ByNameTab';

export default function App() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Chord Lookup</h1>
        
        <Tabs defaultValue="by-key" className="w-full">
          <TabsList className="mb-8 w-full">
            <TabsTrigger value="by-key">
              By Key
            </TabsTrigger>
            <TabsTrigger value="by-name">
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
      </div>
    </div>
  );
}
