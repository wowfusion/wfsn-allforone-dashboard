'use client';

/**
 * Event-Detailansicht – Anmeldungen, Signup-Formular, Lock-Funktion.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import { Lock, Edit, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { format, formatDistanceToNow } from '@/lib/date-utils';
import Link from 'next/link';
import { DiscordRsvpPanel } from './discord-rsvp-panel';

// #region Typen

interface PlayerOption {
  id: string;
  characterName: string;
  realm: string;
  className: string;
  role: string | null;
}

interface SignupUser {
  id: string;
  name: string;
  avatar: string | null;
}

interface EventSignup {
  id: string;
  userId: string;
  playerId: string | null;
  status: 'GOING' | 'MAYBE' | 'DECLINED' | 'WAITLIST';
  note: string | null;
  createdAt: Date;
  user: SignupUser;
  player: PlayerOption | null;
}

interface LockSnapshot {
  id: string;
  lockedAt: Date;
  lockedBy: string;
  snapshotJson: unknown;
}

interface EventData {
  id: string;
  title: string;
  type: 'RAID' | 'EVENT';
  description: string | null;
  startAt: Date;
  endAt: Date;
  lockAt: Date | null;
  maxSlots: number | null;
  roleSlots: unknown;
  status: 'DRAFT' | 'PUBLISHED' | 'LOCKED' | 'DONE';
  creator: SignupUser;
  signups: EventSignup[];
  lockSnapshot: LockSnapshot | null;
  discordSyncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  discordEventId: string | null;
  raidLeadName: string | null;
}

interface EventDetailProps {
  event: EventData;
  session: Session;
  players: PlayerOption[];
}

// #endregion


export function EventDetail({ event, session, players }: EventDetailProps) {
  const router = useRouter();
  const roles = (session.user.appRoles ?? []) as AppRole[];
  const isLocked = event.status === 'LOCKED' || event.status === 'DONE';

  const [locking, setLocking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Event löschen */
  async function handleDelete() {
    if (!confirm('Event wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Fehler beim Löschen');
      } else {
        router.push('/events');
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  /** Event sperren */
  async function handleLock() {
    if (!confirm('Event jetzt festschreiben? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    setLocking(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${event.id}/lock`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Fehler beim Sperren');
      } else {
        router.refresh();
      }
    } finally {
      setLocking(false);
    }
  }

  /** Status-Badge des Events */
  const StatusBadge = () => {
    if (event.status === 'LOCKED') return <Badge variant="outline" className="text-orange-400 border-orange-400/40">🔒 Festgeschrieben</Badge>;
    if (event.status === 'DONE') return <Badge variant="secondary">Abgeschlossen</Badge>;
    if (event.status === 'DRAFT') return <Badge variant="secondary">Entwurf</Badge>;
    return <Badge>Anmeldung offen</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">{event.type === 'RAID' ? '⚔️' : '🎉'}</span>
            <h1 className="text-2xl font-bold text-amber-400">{event.title}</h1>
            <StatusBadge />
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(event.startAt))} – {format(new Date(event.endAt))}
            </span>
            <span className="text-muted-foreground/60">
              ({formatDistanceToNow(new Date(event.startAt))})
            </span>
            {event.lockAt && (
              <span className="flex items-center gap-1 text-orange-400/80">
                <Lock className="h-3 w-3" />
                Lock: {format(new Date(event.lockAt))}
              </span>
            )}
          </div>
          {event.raidLeadName && (
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-amber-400 border-amber-400/40 gap-1">
                🎯 Raidlead: {event.raidLeadName}
              </Badge>
            </div>
          )}
          {event.description && (
            <p className="text-muted-foreground text-sm max-w-2xl whitespace-pre-line">{event.description}</p>
          )}
        </div>

        {/* Aktionen */}
        <div className="flex items-center gap-2 flex-wrap">
          {can.editEvent(roles) && !isLocked && (
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href={`/events/${event.id}/edit`}>
                <Edit className="h-3.5 w-3.5" />
                Bearbeiten
              </Link>
            </Button>
          )}
          {can.editEvent(roles) && (!isLocked || can.manageConfig(roles)) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive hover:border-destructive/50"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? 'Wird gelöscht…' : 'Löschen'}
            </Button>
          )}
          {can.lockEvent(roles) && event.status === 'PUBLISHED' && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-2"
              onClick={handleLock}
              disabled={locking}
            >
              <Lock className="h-3.5 w-3.5" />
              {locking ? 'Wird gesperrt…' : 'Jetzt sperren'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Discord-Sync-Warnung */}
      {event.discordSyncStatus === 'FAILED' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Discord-Sync fehlgeschlagen – Event wurde gespeichert, aber nicht gepostet.
        </div>
      )}

      {/* Discord RSVP & Kaderplanung */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <span>🎮</span>
            Discord Anmeldungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DiscordRsvpPanel
            eventId={event.id}
            eventType={event.type}
            roleSlots={event.roleSlots as { tank?: number; healer?: number; dps?: number } | null}
            hasDiscordEvent={!!event.discordEventId}
            canManage={can.lockEvent(roles)}
          />
        </CardContent>
      </Card>

      {/* Lock-Snapshot */}
      {event.lockSnapshot && (
        <Card className="border-orange-400/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-400">
              <Lock className="h-4 w-4" />
              Festgeschriebener Stand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Gesperrt am {format(new Date(event.lockSnapshot.lockedAt))}
            </p>
            <Separator className="mb-3" />
            <pre className="text-xs text-muted-foreground bg-muted/30 rounded p-3 overflow-auto max-h-48">
              {JSON.stringify(event.lockSnapshot.snapshotJson, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
