import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';

const TEMPLATE_VARIABLES = [
  { var: '{{customerName}}', desc: 'Full name of the patient being called' },
  { var: '{{locationName}}', desc: 'Clinic or practice name' },
  { var: '{{appointmentType}}', desc: 'Type of appointment (e.g., Cleaning, Checkup)' },
  { var: '{{slotDate}}', desc: 'Date of the available slot' },
  { var: '{{slotTime}}', desc: 'Time of the available slot' },
  { var: '{{lastVisitSummary}}', desc: "Summary of the patient's last appointment" },
];

export function PromptEditor() {
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  const [prompt, setPrompt] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings?.aiSystemPrompt !== undefined) {
      setPrompt(settings.aiSystemPrompt);
      setDirty(false);
    }
  }, [settings]);

  const handleChange = (value: string) => {
    setPrompt(value);
    setDirty(true);
  };

  const handleSave = () => {
    update.mutate(
      { aiSystemPrompt: prompt },
      { onSuccess: () => setDirty(false) }
    );
  };

  const handleReset = () => {
    if (settings?.aiSystemPrompt !== undefined) {
      setPrompt(settings.aiSystemPrompt);
      setDirty(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Voice Prompt</CardTitle>
          <CardDescription>System prompt used to guide the Fonio AI voice agent</CardDescription>
        </CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Voice Prompt</CardTitle>
        <CardDescription>
          System prompt used to guide the Fonio AI voice agent when calling patients.
          Use template variables to personalize each call.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Available variables: </span>
            {TEMPLATE_VARIABLES.map((v, i) => (
              <span key={v.var}>
                <code className="rounded bg-muted px-1 py-0.5 text-xs">{v.var}</code>
                {i < TEMPLATE_VARIABLES.length - 1 && ', '}
              </span>
            ))}
          </AlertDescription>
        </Alert>

        <div className="space-y-1.5">
          <Label htmlFor="system-prompt">System Prompt</Label>
          <Textarea
            id="system-prompt"
            value={prompt}
            onChange={(e) => handleChange(e.target.value)}
            rows={14}
            className="font-mono text-sm resize-none"
            placeholder="Enter the system prompt for the AI voice agent..."
          />
          <p className="text-xs text-muted-foreground">{prompt.length} characters</p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Variable reference</p>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {TEMPLATE_VARIABLES.map((v) => (
              <div key={v.var} className="flex items-start gap-2 text-xs">
                <code className="rounded bg-muted px-1 py-0.5 shrink-0">{v.var}</code>
                <span className="text-muted-foreground">{v.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {dirty && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Discard changes
            </Button>
          )}
          <Button onClick={handleSave} loading={update.isPending} disabled={!dirty}>
            Save prompt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
