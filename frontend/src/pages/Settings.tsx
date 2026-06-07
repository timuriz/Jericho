import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromptEditor } from '@/components/settings/PromptEditor';
import { RecoverySettings } from '@/components/settings/RecoverySettings';
import { AppointmentTypeSettings } from '@/components/settings/AppointmentTypeSettings';

export default function Settings() {
  return (
    <div className="max-w-3xl space-y-6">
      <Tabs defaultValue="recovery">
        <TabsList>
          <TabsTrigger value="recovery">Recovery Engine</TabsTrigger>
          <TabsTrigger value="voice">AI Voice Prompt</TabsTrigger>
          <TabsTrigger value="types">Appointment Types</TabsTrigger>
        </TabsList>
        <TabsContent value="recovery" className="mt-6">
          <RecoverySettings />
        </TabsContent>
        <TabsContent value="voice" className="mt-6">
          <PromptEditor />
        </TabsContent>
        <TabsContent value="types" className="mt-6">
          <AppointmentTypeSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
