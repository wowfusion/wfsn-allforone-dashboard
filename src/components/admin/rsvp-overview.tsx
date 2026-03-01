'use client';

/**
 * RSVP-Übersicht – filterbare Tabelle aller Discord-RSVP-Einträge je Event.
 */

import { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow } from '@/lib/date-utils';

// #region Typen

type EventType = 'RAID' | 'EVENT';
type RsvpStatus = 'active' | 'left';
type RaidRole = 'TANK' | 'HEALER' | 'DPS';

interface EventSummary {
  id: string;
  title: string;
  type: EventType;
  startAt: Date;
  status: string;
}

interface RsvpEntry {
  id: string;
  discordUserId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  itemLevel: number | null;
  createdAt: Date;
  leftAt: Date | null;
  lastLeftAt: Date | null;
  event: { id: string; title: string; type: EventType; startAt: Date };
  raidSlots: { role: RaidRole }[];
}

interface SignupActivityEntry {
  id: string;
  eventId: string;
  userId: string;
  newStatus: string;
  previousStatus: string | null;
  createdAt: Date;
  user: { name: string; discordId: string };
}

interface RsvpOverviewProps {
  events: EventSummary[];
  rsvps: RsvpEntry[];
  signupActivities: SignupActivityEntry[];
}

// #endregion

const ROLE_CONFIG: Record<RaidRole, { label: string; color: string }> = {
  TANK: { label: 'Tank', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  HEALER: { label: 'Heiler', color: 'text-green-400 border-green-400/30 bg-green-400/10' },
  DPS: { label: 'DPS', color: 'text-red-400 border-red-400/30 bg-red-400/10' },
};

export function RsvpOverview({ events, rsvps, signupActivities }: RsvpOverviewProps) {

  // Aktivitäten pro discordId + eventId aggregieren
  const activityMap = useMemo(() => {
    // Key: discordId|eventId
    const map = new Map<string, { signups: number; declines: number; lastDeclineAt: Date | null }>();
    for (const a of signupActivities) {
      const key = `${a.user.discordId}|${a.eventId}`;
      const existing = map.get(key) ?? { signups: 0, declines: 0, lastDeclineAt: null };
      if (a.newStatus === 'GOING' || a.newStatus === 'MAYBE') existing.signups++;
      if (a.newStatus === 'DECLINED') {
        existing.declines++;
        const t = new Date(a.createdAt);
        if (!existing.lastDeclineAt || t > existing.lastDeclineAt) existing.lastDeclineAt = t;
      }
      map.set(key, existing);
    }
    return map;
  }, [signupActivities]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | RsvpStatus>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | RaidRole>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return rsvps.filter((r) => {
      if (selectedEventId !== 'all' && r.event.id !== selectedEventId) return false;
      if (statusFilter === 'active' && r.leftAt !== null) return false;
      if (statusFilter === 'left' && r.leftAt === null) return false;
      if (roleFilter !== 'all' && !r.raidSlots.some((s) => s.role === roleFilter)) return false;
      if (search) {
        const name = (r.displayName ?? r.username).toLowerCase();
        if (!name.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [rsvps, selectedEventId, statusFilter, roleFilter, search]);

  // Statistik für das gewählte Event
  const activeCount = filtered.filter((r) => r.leftAt === null).length;
  const leftCount = filtered.filter((r) => r.leftAt !== null).length;

  return (
    <div className="space-y-4">
      {/* Filter-Bereich */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Event-Filter */}
            <div className="space-y-1 min-w-[220px] flex-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" /> Event
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Alle Events ({rsvps.length} Einträge)</option>
                {events.map((e) => {
                  const count = rsvps.filter((r) => r.event.id === e.id).length;
                  return (
                    <option key={e.id} value={e.id}>
                      {e.type === 'RAID' ? '⚔️' : '🎉'} {e.title} – {new Date(e.startAt).toLocaleDateString('de-DE')} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Rollen-Filter */}
            <div className="space-y-1 min-w-[140px]">
              <label className="text-xs text-muted-foreground">Kader-Rolle</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | RaidRole)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Alle Rollen</option>
                <option value="TANK">🛡️ Tank</option>
                <option value="HEALER">💚 Heiler</option>
                <option value="DPS">⚔️ DPS</option>
              </select>
            </div>

            {/* Suche */}
            <div className="space-y-1 min-w-[180px] flex-1">
              <label className="text-xs text-muted-foreground">Suche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Name suchen…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status-Tabs + Statistik */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <TabsList>
            <TabsTrigger value="all">Alle ({filtered.length})</TabsTrigger>
            <TabsTrigger value="active">✅ Interessiert ({statusFilter === 'all' ? activeCount : filtered.filter(r => r.leftAt === null).length})</TabsTrigger>
            <TabsTrigger value="left">❌ Abgemeldet ({statusFilter === 'all' ? leftCount : filtered.filter(r => r.leftAt !== null).length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs text-muted-foreground">
          {filtered.length} Einträge
        </p>
      </div>

      {/* Tabelle */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Keine Einträge für die gewählten Filter.
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Spieler</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Event</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">iLvl</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Kader-Rolle</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Letzte Abmeldung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map((r) => {
                const name = r.displayName ?? r.username;
                const isActive = r.leftAt === null;
                return (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    {/* Spieler */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={r.avatar ?? undefined} />
                          <AvatarFallback className="text-xs">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate max-w-[140px]">{name}</span>
                      </div>
                    </td>

                    {/* Event */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span>{r.event.type === 'RAID' ? '⚔️' : '🎉'}</span>
                        <span className="truncate max-w-[180px] text-muted-foreground">{r.event.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {new Date(r.event.startAt).toLocaleDateString('de-DE')}
                      </p>
                    </td>

                    {/* iLvl */}
                    <td className="px-4 py-2.5">
                      {r.itemLevel ? (
                        <Badge variant="outline" className="text-amber-400 border-amber-400/30 bg-amber-400/10 text-xs">
                          {r.itemLevel}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">–</span>
                      )}
                    </td>

                    {/* Kader-Rollen */}
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {r.raidSlots.length > 0 ? (
                          r.raidSlots.map((s, i) => (
                            <Badge key={i} variant="outline" className={`text-xs ${ROLE_CONFIG[s.role].color}`}>
                              {ROLE_CONFIG[s.role].label}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">–</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5">
                      {isActive ? (
                        <Badge className="bg-green-500/15 text-green-400 border-green-400/30 text-xs">
                          ✅ Interessiert
                        </Badge>
                      ) : (
                        <div>
                          <Badge variant="outline" className="text-muted-foreground text-xs">
                            ❌ Abgemeldet
                          </Badge>
                          {r.leftAt && (
                            <p className="text-xs text-muted-foreground/50 mt-0.5">
                              {format(new Date(r.leftAt))}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Letzte Abmeldung – aus SignupActivity oder Discord leftAt */}
                    <td className="px-4 py-2.5 text-xs">
                      {(() => {
                        const act = activityMap.get(`${r.discordUserId}|${r.event.id}`);
                        // Priorität: letzter App-Decline → lastLeftAt (persistent) → leftAt (aktuell)
                        const lastDeclineAt = act?.lastDeclineAt
                          ?? (r.lastLeftAt ? new Date(r.lastLeftAt) : null)
                          ?? (r.leftAt ? new Date(r.leftAt) : null);
                        if (!lastDeclineAt) {
                          return <span className="text-muted-foreground/40">–</span>;
                        }
                        return (
                          <div>
                            <span className="text-red-400">{format(lastDeclineAt)}</span>
                            <p className="text-muted-foreground/50 mt-0.5">{formatDistanceToNow(lastDeclineAt)}</p>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
