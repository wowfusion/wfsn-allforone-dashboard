'use client';

/**
 * Event-Formular – Erstellen und Bearbeiten von Raids/Events.
 * Verwendet React Hook Form + Zod für Validierung.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Save, Send, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createEventSchema, type CreateEventInput } from '@/lib/validations';
import { toInputDatetime } from '@/lib/date-utils';

interface EventFormProps {
  /** Vorhandenes Event für den Edit-Modus */
  defaultValues?: Partial<CreateEventInput & { id: string }>;
}

export function EventForm({ defaultValues }: EventFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = !!defaultValues?.id;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      type: 'RAID',
      ...defaultValues,
    },
  });

  const selectedType = watch('type');

  async function onSubmit(data: CreateEventInput, publish: boolean) {
    setServerError(null);
    const url = isEditing ? `/api/events/${defaultValues!.id}` : '/api/events';
    const method = isEditing ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, publish }),
    });

    if (!res.ok) {
      const body = await res.json();
      setServerError(body.error?.formErrors?.join(', ') ?? body.error ?? 'Fehler beim Speichern');
      return;
    }

    const saved = await res.json();
    router.push(`/events/${saved.id}`);
    router.refresh();
  }

  const now = new Date();
  const defaultStart = toInputDatetime(new Date(now.getTime() + 24 * 3600_000));
  const defaultEnd = toInputDatetime(new Date(now.getTime() + 27 * 3600_000));

  return (
    <Card>
      <CardContent className="pt-6">
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          {/* Typ */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Typ *</label>
            <div className="flex gap-2">
              {(['RAID', 'EVENT'] as const).map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-border/60 hover:bg-accent/40 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                >
                  <input
                    type="radio"
                    value={type}
                    {...register('type')}
                    className="sr-only"
                    defaultChecked={type === 'RAID'}
                  />
                  <span className="text-sm font-medium">
                    {type === 'RAID' ? '⚔️ Raid' : '🎉 Event'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Titel */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="title">
              Titel *
            </label>
            <Input
              id="title"
              placeholder="z.B. Nerubar Palace Heroic"
              {...register('title')}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Beschreibung */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="description">
              Beschreibung
            </label>
            <textarea
              id="description"
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              placeholder="Optionale Infos zum Event…"
              {...register('description')}
            />
          </div>

          {/* Start / Ende */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="startAt">
                Start *
              </label>
              <Input
                id="startAt"
                type="datetime-local"
                defaultValue={defaultStart}
                {...register('startAt')}
                aria-invalid={!!errors.startAt}
              />
              {errors.startAt && (
                <p className="text-xs text-destructive">{errors.startAt.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="endAt">
                Ende *
              </label>
              <Input
                id="endAt"
                type="datetime-local"
                defaultValue={defaultEnd}
                {...register('endAt')}
                aria-invalid={!!errors.endAt}
              />
              {errors.endAt && (
                <p className="text-xs text-destructive">{errors.endAt.message}</p>
              )}
            </div>
          </div>

          {/* Lock-Zeitpunkt */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="lockAt">
              Anmeldeschluss (optional)
            </label>
            <Input
              id="lockAt"
              type="datetime-local"
              {...register('lockAt')}
            />
            <p className="text-xs text-muted-foreground">
              Ab diesem Zeitpunkt werden Anmeldungen automatisch gesperrt.
            </p>
          </div>

          {/* Slots */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="maxSlots">
              Maximale Teilnehmer (optional)
            </label>
            <Input
              id="maxSlots"
              type="number"
              min={1}
              max={40}
              placeholder="z.B. 20"
              {...register('maxSlots', { valueAsNumber: true })}
            />
          </div>

          {/* Rollen-Slots – nur bei Raid */}
          {selectedType === 'RAID' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Rollen-Slots (optional)</label>
              <div className="grid grid-cols-3 gap-3">
                {(['tank', 'healer', 'dps'] as const).map((role) => (
                  <div key={role} className="space-y-1">
                    <label className="text-xs text-muted-foreground capitalize">{role === 'healer' ? 'Heiler' : role === 'tank' ? 'Tank' : 'DPS'}</label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      placeholder="0"
                      {...register(`roleSlots.${role}`, { valueAsNumber: true })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fehleranzeige */}
          {serverError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {serverError}
            </div>
          )}

          {/* Aktions-Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={isSubmitting}
              onClick={handleSubmit((data) => onSubmit(data, false))}
            >
              <Save className="h-4 w-4" />
              Als Entwurf speichern
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={isSubmitting}
              onClick={handleSubmit((data) => onSubmit(data, true))}
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Wird veröffentlicht…' : 'Veröffentlichen & Discord posten'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
