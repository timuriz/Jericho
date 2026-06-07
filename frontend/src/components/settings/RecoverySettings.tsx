import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { Skeleton } from '@/components/ui/skeleton';
import type { Settings } from '@/types';

type VoiceSettings = Settings['voiceSettings'];

const DEFAULT_VOICE: VoiceSettings = {
  voiceId: 'alloy',
  language: 'en-US',
  speakingStyle: 'conversational',
  tone: 'friendly',
};

export function RecoverySettings() {
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();

  const [maxRetries, setMaxRetries] = useState(2);
  const [callbackDelayMinutes, setCallbackDelayMinutes] = useState(30);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(DEFAULT_VOICE);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setMaxRetries(settings.maxRetries ?? 2);
      setCallbackDelayMinutes(settings.callbackDelayMinutes ?? 30);
      setVoiceSettings(settings.voiceSettings ?? DEFAULT_VOICE);
      setDirty(false);
    }
  }, [settings]);

  const mark = () => setDirty(true);

  const handleSave = () => {
    update.mutate(
      { maxRetries, callbackDelayMinutes, voiceSettings },
      { onSuccess: () => setDirty(false) }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recovery Settings</CardTitle>
          <CardDescription>Configure how the recovery engine behaves</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recovery Settings</CardTitle>
        <CardDescription>Configure retry logic and voice agent behavior</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold mb-4">Call Logic</h4>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Max retries per candidate</Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={maxRetries}
                onChange={(e) => { setMaxRetries(Number(e.target.value)); mark(); }}
              />
              <p className="text-xs text-muted-foreground">
                How many times to retry before moving to the next candidate
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Callback delay (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={1440}
                value={callbackDelayMinutes}
                onChange={(e) => { setCallbackDelayMinutes(Number(e.target.value)); mark(); }}
              />
              <p className="text-xs text-muted-foreground">
                Delay before calling a candidate who requested a callback
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-semibold mb-4">Voice Agent</h4>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Voice</Label>
              <Select
                value={voiceSettings.voiceId}
                onValueChange={(v) => { setVoiceSettings((s) => ({ ...s, voiceId: v })); mark(); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alloy">Alloy (neutral)</SelectItem>
                  <SelectItem value="echo">Echo (male)</SelectItem>
                  <SelectItem value="nova">Nova (female)</SelectItem>
                  <SelectItem value="shimmer">Shimmer (female, warm)</SelectItem>
                  <SelectItem value="onyx">Onyx (male, deep)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select
                value={voiceSettings.language}
                onValueChange={(v) => { setVoiceSettings((s) => ({ ...s, language: v })); mark(); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                  <SelectItem value="es-US">Spanish (US)</SelectItem>
                  <SelectItem value="fr-FR">French</SelectItem>
                  <SelectItem value="de-DE">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Speaking style</Label>
              <Select
                value={voiceSettings.speakingStyle}
                onValueChange={(v) => { setVoiceSettings((s) => ({ ...s, speakingStyle: v })); mark(); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select
                value={voiceSettings.tone}
                onValueChange={(v) => { setVoiceSettings((s) => ({ ...s, tone: v })); mark(); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={update.isPending} disabled={!dirty}>
            Save settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
