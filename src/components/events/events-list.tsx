'use client';

/**
 * Events-Liste – zeigt alle Raids & Events mit Filter und Aktionen.
 */

import Link from 'next/link';
import type { Session } from 'next-auth';
import { useState } from 'react';
import { Calendar, Plus, Search, Lock, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { format, formatDistanceToNow } from '@/lib/date-utils';

interface EventItem {
  id: string;
  title: string;
  type: 'RAID' | 'EVENT';
  startAt: Date;
  endAt: Date;
  status: 'DRAFT' | 'PUBLISHED' | 'LOCKED' | 'DONE';
  description: string | null;
  creator: { id: string; name: string; avatar: string | null };
  _count: { signups: number };
}

interface MySignup {
  eventId: string;
  status: 'GOING' | 'MAYBE' | 'DECLINED' | 'WAITLIST';
}

interface EventsListProps {
  events: EventItem[];
  mySignups: MySignup[];
  session: Session;
}

const STATUS_CONFIG = {
  DRAFT: { label: 'Entwurf', variant: 'secondary' as const, color: 'text-muted-foreground' },
  PUBLISHED: { label: 'Offen', variant: 'default' as const, color: 'text-green-400' },
  LOCKED: { label: '🔒 Gesperrt', variant: 'outline' as const, color: 'text-orange-400' },
  DONE: { label: 'Abgeschlossen', variant: 'secondary' as const, color: 'text-muted-foreground' },
};

const SIGNUP_STATUS_LABEL: Record<string, string> = {
  GOING: '✅ Angemeldet',
  MAYBE: '❓ Vielleicht',
  DECLINED: '❌ Abgesagt',
  WAITLIST: '⏳ Warteliste',
};

export function EventsList({ events, mySignups, session }: EventsListProps) {
  const roles = (session.user.appRoles ?? []) as AppRole[];
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'upcoming' | 'all' | 'mine'>('upcoming');

  const mySignupMap = new Map(mySignups.map((s) => [s.eventId, s.status]));

  const filtered = events.filter((e) => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    const now = new Date();
    if (tab === 'upcoming') return new Date(e.startAt) >= now || e.status === 'PUBLISHED';
    if (tab === 'mine') return mySignupMap.has(e.id);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Raids & Events</h1>
          <p className="text-muted-foreground text-sm mt-1">{events.length} Events gesamt</p>
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

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Events suchen…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="upcoming">Anstehend</TabsTrigger>
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="mine">Meine</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Event-Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Keine Events gefunden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => {
            const statusCfg = STATUS_CONFIG[event.status];
            const mySignupStatus = mySignupMap.get(event.id);
            const isLocked = event.status === 'LOCKED';

            return (
              <Card key={event.id} className={`transition-colors hover:border-border ${isLocked ? 'opacity-80' : ''}`}>
                <CardContent className="p-4">
                  <Link href={`/events/${event.id}`} className="flex items-start justify-between gap-4 group">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="text-2xl mt-0.5">
                        {event.type === 'RAID' ? '⚔️' : '🎉'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm group-hover:text-amber-400 transition-colors truncate">
                            {event.title}
                          </h3>
                          <Badge variant={statusCfg.variant} className="text-xs shrink-0">
                            {statusCfg.label}
                          </Badge>
                          {mySignupStatus && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {SIGNUP_STATUS_LABEL[mySignupStatus]}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(event.startAt))}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event._count.signups} Anmeldungen
                          </span>
                          <span className="text-muted-foreground/60">
                            {formatDistanceToNow(new Date(event.startAt))}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isLocked && <Lock className="h-4 w-4 text-orange-400 shrink-0 mt-1" />}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
