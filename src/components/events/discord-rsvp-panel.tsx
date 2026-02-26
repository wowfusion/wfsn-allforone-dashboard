'use client';

/**
 * Discord RSVP Panel – zeigt Discord-Interessenten und ermöglicht Kaderplanung.
 * RSVP-User werden per Bot-Token von Discord geholt, kein Login nötig.
 * Auto-Polling alle 5 Minuten via SWR. Zeitstempel der Erst-Anmeldung wird angezeigt.
 * Für Raids: Kaderplaner mit Tank/Heiler/DPS-Zuweisung.
 */

import { useState } from 'react';
import useSWR from 'swr';
import { RefreshCw, Shield, Heart, Sword, X, UserCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDistanceToNow } from '@/lib/date-utils';

// #region Typen

type RaidRole = 'TANK' | 'HEALER' | 'DPS';

interface RaidSlot {
  id: string;
  role: RaidRole;
  position: number;
  note: string | null;
  discordRsvp: DiscordRsvpEntry;
}

interface DiscordRsvpEntry {
  id: string;
  discordUserId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  discordRoles: string[];
  raidSlots: RaidSlot[];
  suggestedRoles?: RaidRole[];
  createdAt: string;
  leftAt: string | null;
}

interface DiscordRsvpPanelProps {
  eventId: string;
  eventType: 'RAID' | 'EVENT';
  roleSlots: { tank?: number; healer?: number; dps?: number } | null;
  hasDiscordEvent: boolean;
  canManage: boolean;
}

// #endregion

// #region Hilfsfunktionen

const ROLE_CONFIG: Record<RaidRole, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  TANK: { label: 'Tank', icon: Shield, color: 'text-blue-400', bgColor: 'bg-blue-400/10 border-blue-400/30' },
  HEALER: { label: 'Heiler', icon: Heart, color: 'text-green-400', bgColor: 'bg-green-400/10 border-green-400/30' },
  DPS: { label: 'DPS', icon: Sword, color: 'text-red-400', bgColor: 'bg-red-400/10 border-red-400/30' },
};

function displayName(user: DiscordRsvpEntry) {
  return user.displayName ?? user.username;
}

function avatarFallback(user: DiscordRsvpEntry) {
  return displayName(user).slice(0, 2).toUpperCase();
}

// #endregion

/** SWR-Fetcher */
const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Fallback falls Settings noch nicht geladen */
const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000;

export function DiscordRsvpPanel({
  eventId,
  eventType,
  roleSlots,
  hasDiscordEvent,
  canManage,
}: DiscordRsvpPanelProps) {
  const [assigningSlot, setAssigningSlot] = useState<{ role: RaidRole; position: number } | null>(null);
  const [saving, setSaving] = useState(false);

  /** Poll-Intervall aus den App-Einstellungen lesen */
  const { data: publicSettings } = useSWR<{ discordPollIntervalMin: number }>(
    '/api/settings/public',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
  const pollIntervalMs = (publicSettings?.discordPollIntervalMin ?? 5) * 60 * 1000;

  /**
   * SWR holt RSVP-User automatisch beim Mount und danach im konfigurierten Intervall.
   * revalidateOnFocus sorgt dafür dass beim Tab-Wechsel zurück sofort aktualisiert wird.
   * Polling nur aktiv wenn ein Discord-Event verknüpft ist.
   */
  const {
    data: rsvpData,
    isLoading: rsvpLoading,
    isValidating,
    mutate: mutateRsvp,
    error: rsvpError,
  } = useSWR<{ rsvps: DiscordRsvpEntry[]; synced: boolean; error?: string }>(
    hasDiscordEvent ? `/api/events/${eventId}/discord-rsvp` : null,
    fetcher,
    {
      refreshInterval: pollIntervalMs || DEFAULT_POLL_INTERVAL_MS,
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
    }
  );

  const {
    data: slotsData,
    mutate: mutateSlots,
  } = useSWR<{ slots: RaidSlot[] }>(
    hasDiscordEvent ? `/api/events/${eventId}/raid-slots` : null,
    fetcher,
    {
      refreshInterval: pollIntervalMs || DEFAULT_POLL_INTERVAL_MS,
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
    }
  );

  const rsvps = rsvpData?.rsvps ?? [];
  const synced = rsvpData?.synced ?? false;
  const slots = slotsData?.slots ?? [];
  const loading = rsvpLoading || isValidating;
  const error = rsvpData?.error ?? (rsvpError ? String(rsvpError) : null);

  /** Manueller Refresh – triggert sofortigen Sync */
  async function handleManualSync() {
    await mutateRsvp();
    await mutateSlots();
  }

  /** Slot einem RSVP-User zuweisen */
  async function assignSlot(rsvpId: string, role: RaidRole, position: number) {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/raid-slots`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordRsvpId: rsvpId, role, position }),
      });
      if (res.ok) {
        await mutateSlots();
      }
    } finally {
      setSaving(false);
      setAssigningSlot(null);
    }
  }

  /** Slot leeren */
  async function clearSlot(role: RaidRole, position: number) {
    setSaving(true);
    try {
      await fetch(`/api/events/${eventId}/raid-slots`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, position }),
      });
      await mutateSlots();
    } finally {
      setSaving(false);
    }
  }

  function getSlot(role: RaidRole, position: number) {
    return slots.find((s) => s.role === role && s.position === position) ?? null;
  }

  // #region Render: Kaderplaner

  function renderRosterSection(role: RaidRole, count: number) {
    const cfg = ROLE_CONFIG[role];
    const Icon = cfg.icon;

    return (
      <div key={role} className="space-y-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${cfg.bgColor}`}>
          <Icon className={`h-4 w-4 ${cfg.color}`} />
          <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
          <span className="text-xs text-muted-foreground ml-auto">{count} Slots</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: count }, (_, i) => i + 1).map((pos) => {
            const slot = getSlot(role, pos);
            const isAssigning = assigningSlot?.role === role && assigningSlot?.position === pos;

            return (
              <div
                key={pos}
                className="relative p-2 rounded-lg border border-border/50 bg-muted/20 min-h-[56px] flex flex-col gap-1"
              >
                <span className="text-[10px] text-muted-foreground/60 absolute top-1 right-2">#{pos}</span>

                {slot ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={slot.discordRsvp.avatar ?? undefined} />
                      <AvatarFallback className="text-[9px]">
                        {avatarFallback(slot.discordRsvp)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate flex-1">
                      {displayName(slot.discordRsvp)}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => clearSlot(role, pos)}
                        disabled={saving}
                        className="text-muted-foreground/40 hover:text-destructive transition-colors ml-auto shrink-0"
                        title="Slot leeren"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-8">
                    {canManage ? (
                      <button
                        onClick={() => setAssigningSlot({ role, position: pos })}
                        className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1"
                      >
                        <UserCheck className="h-3 w-3" />
                        Zuweisen
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground/30">Leer</span>
                    )}
                  </div>
                )}

                {/* Auswahl-Popup */}
                {isAssigning && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-popover shadow-lg p-2 space-y-1">
                    <p className="text-xs text-muted-foreground px-1 pb-1 border-b border-border/50">
                      Spieler auswählen
                    </p>
                    {rsvps.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-1 py-2">Keine RSVP-User geladen</p>
                    ) : (
                      rsvps.map((rsvp) => (
                        <button
                          key={rsvp.id}
                          onClick={() => assignSlot(rsvp.id, role, pos)}
                          disabled={saving}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50 transition-colors text-left"
                        >
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarImage src={rsvp.avatar ?? undefined} />
                            <AvatarFallback className="text-[8px]">{avatarFallback(rsvp)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs truncate">{displayName(rsvp)}</span>
                        </button>
                      ))
                    )}
                    <button
                      onClick={() => setAssigningSlot(null)}
                      className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground pt-1 text-center"
                    >
                      Abbrechen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // #endregion

  return (
    <div className="space-y-4">
      {/* Sync-Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {synced
              ? `${rsvps.length} Interessent${rsvps.length !== 1 ? 'en' : ''} von Discord`
              : hasDiscordEvent
              ? 'Noch nicht synchronisiert'
              : 'Kein Discord-Event verknüpft'}
          </span>
          {synced && <Badge variant="outline" className="text-green-400 border-green-400/40 text-xs">Synchronisiert</Badge>}
          {hasDiscordEvent && <span className="text-xs text-muted-foreground/50 flex items-center gap-1"><Clock className="h-3 w-3" />alle 5 min</span>}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={handleManualSync}
          disabled={loading || !hasDiscordEvent}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Wird geladen…' : 'Synchronisieren'}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
          {error}
        </p>
      )}

      {!hasDiscordEvent && (
        <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border/50 rounded-lg">
          Dieses Event ist nicht mit einem Discord Scheduled Event verknüpft.
        </p>
      )}

      {hasDiscordEvent && (
        <Tabs defaultValue="rsvp">
          <TabsList>
            <TabsTrigger value="rsvp" className="gap-1.5">
              Interessenten ({rsvps.length})
            </TabsTrigger>
            {eventType === 'RAID' && (
              <TabsTrigger value="roster" className="gap-1.5">
                Kaderplanung
              </TabsTrigger>
            )}
          </TabsList>

          {/* RSVP-Liste */}
          <TabsContent value="rsvp" className="mt-4">
            {rsvps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {synced ? 'Noch niemand hat Interesse gezeigt.' : 'Synchronisieren um Interessenten zu laden.'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {rsvps.map((rsvp) => (
                  <div
                    key={rsvp.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/40"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={rsvp.avatar ?? undefined} />
                      <AvatarFallback className="text-xs">{avatarFallback(rsvp)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${rsvp.leftAt ? 'line-through text-muted-foreground' : ''}`}>
                        {displayName(rsvp)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        Angemeldet: {new Date(rsvp.createdAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                        {rsvp.leftAt && (
                          <span className="text-destructive flex items-center gap-0.5 ml-1">
                            · Abgemeldet: {new Date(rsvp.leftAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {rsvp.leftAt && (
                        <Badge variant="destructive" className="text-xs opacity-70">Abgemeldet</Badge>
                      )}
                      {rsvp.raidSlots.length === 0 && !rsvp.leftAt && rsvp.suggestedRoles?.map((role) => {
                        const cfg = ROLE_CONFIG[role];
                        const Icon = cfg.icon;
                        return (
                          <Badge key={role} variant="outline" className={`text-xs gap-1 ${cfg.color} border-current/30`}>
                            <Icon className="h-2.5 w-2.5" />
                            {cfg.label}
                          </Badge>
                        );
                      })}
                      {rsvp.raidSlots.length > 0 && !rsvp.leftAt && (
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_CONFIG[rsvp.raidSlots[0].role as RaidRole].label} #{rsvp.raidSlots[0].position}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Kaderplaner – nur für Raids */}
          {eventType === 'RAID' && (
            <TabsContent value="roster" className="mt-4">
              {!roleSlots || (!roleSlots.tank && !roleSlots.healer && !roleSlots.dps) ? (
                <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border/50 rounded-lg">
                  Keine Rollen-Slots definiert. Bearbeite das Event um Tank/Heiler/DPS-Slots festzulegen.
                </p>
              ) : (
                <div className="space-y-5">
                  {roleSlots.tank && roleSlots.tank > 0 && renderRosterSection('TANK', roleSlots.tank)}
                  {roleSlots.healer && roleSlots.healer > 0 && renderRosterSection('HEALER', roleSlots.healer)}
                  {roleSlots.dps && roleSlots.dps > 0 && renderRosterSection('DPS', roleSlots.dps)}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
