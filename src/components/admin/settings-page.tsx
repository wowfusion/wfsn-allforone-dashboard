'use client';

/**
 * Settings-Seite – App-weite Konfiguration für OFFICER/ADMIN.
 * Lädt Einstellungen per SWR und speichert Änderungen via PUT /api/settings.
 */

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// #region Schema & Typen

const settingsSchema = z.object({
  rosterMaxLevel: z
    .number({ message: 'Muss eine Zahl sein' })
    .int()
    .min(1, 'Mindestens 1')
    .max(200, 'Maximal 200'),
  discordPollIntervalMin: z
    .number({ message: 'Muss eine Zahl sein' })
    .int()
    .min(1, 'Mindestens 1 Minute')
    .max(60, 'Maximal 60 Minuten'),
});

type SettingsInput = z.infer<typeof settingsSchema>;

interface AppSettingsData {
  id: string;
  rosterMaxLevel: number;
  discordPollIntervalMin: number;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// #endregion

export function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data, isLoading, mutate } = useSWR<{ settings: AppSettingsData }>(
    '/api/settings',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { rosterMaxLevel: 90, discordPollIntervalMin: 5 },
  });

  // Formular einmalig befüllen sobald die Daten geladen sind
  useEffect(() => {
    if (data?.settings) {
      reset({
        rosterMaxLevel: data.settings.rosterMaxLevel,
        discordPollIntervalMin: data.settings.discordPollIntervalMin,
      });
    }
  }, [data?.settings, reset]);

  async function onSubmit(values: SettingsInput) {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const responseData = await res.json();

      if (!res.ok) {
        setSaveError(responseData.error ?? 'Speichern fehlgeschlagen');
        return;
      }

      await mutate({ settings: responseData.settings });
      reset(values);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">Einstellungen</h1>
        <p className="text-muted-foreground text-sm mt-1">
          App-weite Konfiguration – nur für Offiziere und Admins sichtbar.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Einstellungen werden geladen…
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Roster-Einstellungen */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Raid Roster</CardTitle>
              <CardDescription>
                Konfiguration für den Gilden-Roster und Battle.net Sync.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Max. Charakter-Level für Roster-Filter
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    className="w-28"
                    {...register('rosterMaxLevel', { valueAsNumber: true })}
                  />
                  <span className="text-xs text-muted-foreground">
                    Nur Charaktere ab diesem Level werden im Roster angezeigt.
                  </span>
                </div>
                {errors.rosterMaxLevel && (
                  <p className="text-xs text-destructive">{errors.rosterMaxLevel.message}</p>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md bg-muted/30 border border-border/40">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <strong>The War Within (Patch 11.x):</strong> Max. Level 80 &nbsp;·&nbsp;
                  <strong>Dragonflight:</strong> 70 &nbsp;·&nbsp;
                  <strong>Shadowlands:</strong> 60
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Discord-Einstellungen */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Discord RSVP Sync</CardTitle>
              <CardDescription>
                Konfiguration für den serverseitigen Cron-Job der Discord-Interessenten synchronisiert.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Poll-Intervall (Minuten)
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    className="w-28"
                    {...register('discordPollIntervalMin', { valueAsNumber: true })}
                  />
                  <span className="text-xs text-muted-foreground">
                    Wie oft der Cron-Job Discord-RSVPs aktualisiert (1–60 Minuten).
                  </span>
                </div>
                {errors.discordPollIntervalMin && (
                  <p className="text-xs text-destructive">{errors.discordPollIntervalMin.message}</p>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md bg-muted/30 border border-border/40">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    Der Cron-Job wird unter <code className="bg-muted px-1 rounded">/api/cron/discord-rsvp-sync</code> aufgerufen
                    und muss von einem externen Scheduler getriggert werden.
                  </p>
                  <p>
                    Absichern via <code className="bg-muted px-1 rounded">CRON_SECRET</code> in <code className="bg-muted px-1 rounded">.env.local</code> &nbsp;→&nbsp;
                    Header: <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;CRON_SECRET&gt;</code>
                  </p>
                </div>
              </div>

              {/* Cron-Konfigurations-Beispiele */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Setup-Beispiele:</p>
                <div className="grid gap-2 text-xs">
                  <div className="p-2 rounded bg-muted/20 border border-border/30">
                    <p className="font-medium mb-0.5">Vercel Cron (vercel.json)</p>
                    <code className="text-muted-foreground break-all">
                      {`{"crons": [{"path": "/api/cron/discord-rsvp-sync", "schedule": "*/5 * * * *"}]}`}
                    </code>
                  </div>
                  <div className="p-2 rounded bg-muted/20 border border-border/30">
                    <p className="font-medium mb-0.5">cron-job.org / GitHub Actions</p>
                    <code className="text-muted-foreground">
                      {'*/5 * * * *'} → GET {typeof window !== 'undefined' ? window.location.origin : 'https://deine-domain.de'}/api/cron/discord-rsvp-sync
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aktionsleiste */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              {data?.settings?.updatedAt && (
                <>Zuletzt gespeichert: {new Date(data.settings.updatedAt).toLocaleString('de-DE')}</>
              )}
            </div>
            <div className="flex items-center gap-3">
              {saveError && (
                <p className="text-xs text-destructive">{saveError}</p>
              )}
              {saveSuccess && (
                <p className="text-xs text-green-400">Einstellungen gespeichert ✓</p>
              )}
              <Button
                type="submit"
                size="sm"
                className="gap-2"
                disabled={saving || !isDirty}
              >
                {saving ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saving ? 'Wird gespeichert…' : 'Speichern'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
