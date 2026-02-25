'use client';

/**
 * Event-Detailansicht – Anmeldungen, Signup-Formular, Lock-Funktion.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import { Lock, Edit, Trash2, Users, Clock, CheckCircle, XCircle, HelpCircle, Hourglass, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { format, formatDistanceToNow } from '@/lib/date-utils';
import Link from 'next/link';

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
}

interface EventDetailProps {
  event: EventData;
  session: Session;
  players: PlayerOption[];
}

// #endregion

const STATUS_GOING = ['GOING', 'MAYBE'] as const;

const SIGNUP_ICONS: Record<string, React.ElementType> = {
  GOING: CheckCircle,
  MAYBE: HelpCircle,
  DECLINED: XCircle,
  WAITLIST: Hourglass,
};

const SIGNUP_COLORS: Record<string, string> = {
  GOING: 'text-green-400',
  MAYBE: 'text-yellow-400',
  DECLINED: 'text-red-400',
  WAITLIST: 'text-blue-400',
};

export function EventDetail({ event, session, players }: EventDetailProps) {
  const router = useRouter();
  const roles = (session.user.appRoles ?? []) as AppRole[];
  const isLocked = event.status === 'LOCKED' || event.status === 'DONE';

  const mySignup = event.signups.find((s) => s.userId === session.user.id);
  const [submitting, setSubmitting] = useState(false);
  const [locking, setLocking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const going = event.signups.filter((s) => s.status === 'GOING');
  const maybe = event.signups.filter((s) => s.status === 'MAYBE');
  const declined = event.signups.filter((s) => s.status === 'DECLINED');
  const waitlist = event.signups.filter((s) => s.status === 'WAITLIST');

  /** Anmeldung setzen */
  async function handleSignup(status: 'GOING' | 'MAYBE' | 'DECLINED') {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${event.id}/signups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Fehler beim Anmelden');
      } else {
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

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
    <div className="space-y-6 max-w-4xl">
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
          {event.description && (
            <p className="text-muted-foreground text-sm max-w-2xl">{event.description}</p>
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

      {/* Anmeldung */}
      {event.status === 'PUBLISHED' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Deine Anmeldung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              {(['GOING', 'MAYBE', 'DECLINED'] as const).map((status) => {
                const Icon = SIGNUP_ICONS[status];
                const isActive = mySignup?.status === status;
                return (
                  <Button
                    key={status}
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    className={`gap-2 ${isActive ? '' : SIGNUP_COLORS[status]}`}
                    onClick={() => handleSignup(status)}
                    disabled={submitting}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {status === 'GOING' ? 'Anmelden' : status === 'MAYBE' ? 'Vielleicht' : 'Absagen'}
                  </Button>
                );
              })}
              {mySignup && (
                <span className="text-xs text-muted-foreground ml-2">
                  Aktuell: <strong className={SIGNUP_COLORS[mySignup.status]}>
                    {mySignup.status === 'GOING' ? 'Angemeldet' : mySignup.status === 'MAYBE' ? 'Vielleicht' : mySignup.status === 'DECLINED' ? 'Abgesagt' : 'Warteliste'}
                  </strong>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teilnehmer-Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Teilnehmer ({going.length} angemeldet)
            {event.maxSlots && (
              <span className="text-muted-foreground font-normal">/ {event.maxSlots} Slots</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="going">
            <TabsList className="mb-4">
              <TabsTrigger value="going" className="gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                Dabei ({going.length})
              </TabsTrigger>
              <TabsTrigger value="maybe" className="gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-yellow-400" />
                Vielleicht ({maybe.length})
              </TabsTrigger>
              <TabsTrigger value="declined" className="gap-1">
                <XCircle className="h-3.5 w-3.5 text-red-400" />
                Abgesagt ({declined.length})
              </TabsTrigger>
              {waitlist.length > 0 && (
                <TabsTrigger value="waitlist" className="gap-1">
                  <Hourglass className="h-3.5 w-3.5 text-blue-400" />
                  Warteliste ({waitlist.length})
                </TabsTrigger>
              )}
            </TabsList>

            {[
              { key: 'going', items: going },
              { key: 'maybe', items: maybe },
              { key: 'declined', items: declined },
              { key: 'waitlist', items: waitlist },
            ].map(({ key, items }) => (
              <TabsContent key={key} value={key}>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Keine Einträge</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((signup) => (
                      <div
                        key={signup.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40"
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={signup.user.avatar ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {signup.user.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{signup.user.name}</p>
                            {signup.player && (
                              <p className="text-xs text-muted-foreground">
                                {signup.player.characterName} – {signup.player.className}
                              </p>
                            )}
                          </div>
                        </div>
                        {signup.note && (
                          <p className="text-xs text-muted-foreground italic max-w-[200px] truncate">
                            „{signup.note}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
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
