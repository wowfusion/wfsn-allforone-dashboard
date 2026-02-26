'use client';

/**
 * Dashboard-Übersicht – zeigt anstehende Events, Statistiken und Schnellzugriffe.
 */

import Link from 'next/link';
import type { Session } from 'next-auth';
import { Calendar, Plus, Users, Clock, ChevronRight, Sword } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { formatDistanceToNow, format } from '@/lib/date-utils';

interface EventSummary {
  id: string;
  title: string;
  type: 'RAID' | 'EVENT';
  startAt: Date;
  status: 'DRAFT' | 'PUBLISHED' | 'LOCKED' | 'DONE';
  creator: { id: string; name: string; avatar: string | null };
  _count: { signups: number };
}

interface DashboardOverviewProps {
  session: Session;
  upcomingEvents: EventSummary[];
  totalPlayers: number;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT: { label: 'Entwurf', variant: 'secondary' },
  PUBLISHED: { label: 'Offen', variant: 'default' },
  LOCKED: { label: 'Gesperrt', variant: 'outline' },
  DONE: { label: 'Abgeschlossen', variant: 'secondary' },
};

export function DashboardOverview({ session, upcomingEvents, totalPlayers }: DashboardOverviewProps) {
  const roles = (session.user.appRoles ?? []) as AppRole[];

  return (
    <div className="space-y-6">
      {/* Begrüßung */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">
            Willkommen, {session.user.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gildendashboard – All for One, Festung der Stürme
          </p>
        </div>
        {can.createEvent(roles) && (
          <Button asChild size="sm" className="gap-2">
            <Link href="/events/new">
              <Plus className="h-4 w-4" />
              Neues Event
            </Link>
          </Button>
        )}
      </div>

      {/* Stats-Karten */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-400" />
              Anstehende Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">{upcomingEvents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-400" />
              Max-Level Spieler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">{totalPlayers}</p>
            <p className="text-xs text-muted-foreground">Level 80 im Roster</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sword className="h-4 w-4 text-amber-400" />
              Deine Rolle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400 capitalize">{roles[0] ?? 'Member'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Anstehende Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-amber-400" />Nächste Raids & Events</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/events" className="gap-1 text-xs">
              Alle anzeigen
              <ChevronRight className="h-3 w-3 text-amber-400" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Keine anstehenden Events geplant
            </div>
          ) : (
            upcomingEvents.map((event) => {
              const statusInfo = STATUS_BADGE[event.status];
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors border border-border/40 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-lg">
                      {event.type === 'RAID' ? '⚔️' : '🎉'}
                    </div>
                    <div>
                      <p className="font-medium text-sm group-hover:text-amber-400 transition-colors">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.startAt))}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({formatDistanceToNow(new Date(event.startAt))})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {event._count.signups} Anm.
                    </span>
                    <Badge variant={statusInfo.variant} className="text-xs">
                      {statusInfo.label}
                    </Badge>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Schnelllinks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button variant="outline" asChild className="h-auto py-3 flex-col gap-1">
          <Link href="/events">
            <Calendar className="h-4 w-4" />
            <span className="text-xs">Alle Events</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto py-3 flex-col gap-1">
          <Link href="/my-signups">
            <Users className="h-4 w-4" />
            <span className="text-xs">Teilnahme</span>
          </Link>
        </Button>
        {can.viewStats(roles) && (
          <>
            <Button variant="outline" asChild className="h-auto py-3 flex-col gap-1">
              <Link href="/admin">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Auswertungen</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-3 flex-col gap-1">
              <Link href="/admin/roster">
                <Users className="h-4 w-4" />
                <span className="text-xs">Roster & Sync</span>
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
