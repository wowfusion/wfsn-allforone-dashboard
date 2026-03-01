'use client';

/**
 * RSVP-Auswertungsseite – Anwesenheitsquote, Ranking, Abmeldemuster, iLvl-Entwicklung.
 */

import useSWR from 'swr';
import { useState } from 'react';
import { BarChart3, TrendingUp, Users, AlertTriangle, Trophy, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow } from '@/lib/date-utils';

// #region Typen

interface UserStat {
  discordUserId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  itemLevel: number | null;
  attended: number;
  declined: number;
  totalEvents: number;
  attendanceRate: number;
  lastDeclineAt: string | null;
}

interface IlvlEvent {
  eventId: string;
  title: string;
  type: string;
  startAt: string;
  avgItemLevel: number;
  maxItemLevel: number;
  minItemLevel: number;
  participantCount: number;
}

interface EventFill {
  eventId: string;
  title: string;
  type: string;
  startAt: string;
  status: string;
  active: number;
  declined: number;
  total: number;
}

interface StatsData {
  userStats: UserStat[];
  ilvlPerEvent: IlvlEvent[];
  eventFillRate: EventFill[];
}

// #endregion

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function RsvpStatsPage() {
  const { data, isLoading } = useSWR<StatsData>('/api/admin/stats', fetcher);
  const [rankingTab, setRankingTab] = useState<'attended' | 'rate' | 'declined'>('attended');

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-12">
        <BarChart3 className="h-4 w-4 animate-pulse" />
        Auswertungen werden geladen…
      </div>
    );
  }

  if (!data) return null;

  const { userStats, ilvlPerEvent, eventFillRate } = data;

  // Sortierung je nach Tab
  const rankedUsers = [...userStats].sort((a, b) => {
    if (rankingTab === 'attended') return b.attended - a.attended;
    if (rankingTab === 'rate') return b.attendanceRate - a.attendanceRate;
    return b.declined - a.declined;
  }).slice(0, 15);

  // Zusammenfassungs-Stats
  const totalEvents = eventFillRate.length;
  const avgAttendance = userStats.length > 0
    ? Math.round(userStats.reduce((s, u) => s + u.attendanceRate, 0) / userStats.length)
    : 0;
  const avgIlvl = ilvlPerEvent.length > 0
    ? Math.round(ilvlPerEvent.reduce((s, e) => s + e.avgItemLevel, 0) / ilvlPerEvent.length)
    : 0;
  const topDropper = [...userStats].sort((a, b) => b.declined - a.declined)[0];

  return (
    <div className="space-y-6">

      {/* KPI-Kacheln */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-amber-400" /> Ausgewertete Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">{totalEvents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-amber-400" /> Getrackte Spieler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">{userStats.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-amber-400" /> Ø Anwesenheitsquote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">{avgAttendance}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-amber-400" /> Ø Item-Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">{avgIlvl > 0 ? avgIlvl : '–'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Teilnehmer-Ranking */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                Spieler-Ranking
              </CardTitle>
              <Tabs value={rankingTab} onValueChange={(v) => setRankingTab(v as typeof rankingTab)}>
                <TabsList className="h-7">
                  <TabsTrigger value="attended" className="text-xs px-2 h-6">Präsenz</TabsTrigger>
                  <TabsTrigger value="rate" className="text-xs px-2 h-6">Quote</TabsTrigger>
                  <TabsTrigger value="declined" className="text-xs px-2 h-6">Absagen</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {rankedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Noch keine Daten.</p>
              ) : rankedUsers.map((u, i) => {
                const name = u.displayName ?? u.username;
                return (
                  <div key={u.discordUserId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                    {/* Rang */}
                    <span className={`text-xs font-bold w-5 text-center shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                      {i + 1}
                    </span>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={u.avatar ?? undefined} />
                      <AvatarFallback className="text-[10px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm flex-1 truncate">{name}</span>
                    {u.itemLevel && (
                      <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30 shrink-0">
                        {u.itemLevel}
                      </Badge>
                    )}
                    <div className="text-right shrink-0">
                      {rankingTab === 'attended' && (
                        <p className="text-sm font-bold text-green-400">{u.attended}×</p>
                      )}
                      {rankingTab === 'rate' && (
                        <p className={`text-sm font-bold ${u.attendanceRate >= 75 ? 'text-green-400' : u.attendanceRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {u.attendanceRate}%
                        </p>
                      )}
                      {rankingTab === 'declined' && (
                        <p className="text-sm font-bold text-red-400">{u.declined}×</p>
                      )}
                      <p className="text-xs text-muted-foreground">{u.totalEvents} Events</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Abmeldemuster */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Abmeldemuster
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {userStats.filter((u) => u.declined > 0).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Keine Abmeldungen vorhanden.</p>
              ) : (
                [...userStats]
                  .filter((u) => u.declined > 0)
                  .sort((a, b) => b.declined - a.declined)
                  .slice(0, 10)
                  .map((u) => {
                    const name = u.displayName ?? u.username;
                    return (
                      <div key={u.discordUserId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={u.avatar ?? undefined} />
                          <AvatarFallback className="text-[10px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          {u.lastDeclineAt && (
                            <p className="text-xs text-muted-foreground">
                              Letzte Abmeldung: {formatDistanceToNow(new Date(u.lastDeclineAt))}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-red-400">{u.declined}× Abmeldung{u.declined !== 1 ? 'en' : ''}</p>
                          <p className="text-xs text-muted-foreground">{u.attendanceRate}% Quote</p>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Event-Füllstand */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            Event-Füllstand (letzte 20)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground text-xs">
                  <th className="text-left px-4 py-2.5 font-medium">Event</th>
                  <th className="text-left px-4 py-2.5 font-medium">Datum</th>
                  <th className="text-right px-4 py-2.5 font-medium">Angemeldet</th>
                  <th className="text-right px-4 py-2.5 font-medium">Abgemeldet</th>
                  <th className="text-right px-4 py-2.5 font-medium">Gesamt</th>
                  <th className="px-4 py-2.5 font-medium w-32">Füllstand</th>
                </tr>
              </thead>
              <tbody>
                {eventFillRate.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Keine Events vorhanden.</td>
                  </tr>
                ) : eventFillRate.map((e) => {
                  const rate = e.total > 0 ? Math.round((e.active / e.total) * 100) : 0;
                  return (
                    <tr key={e.eventId} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span>{e.type === 'RAID' ? '⚔️' : '🎉'}</span>
                          <span className="font-medium truncate max-w-[200px]">{e.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {format(new Date(e.startAt))}
                      </td>
                      <td className="px-4 py-2.5 text-right text-green-400 font-medium">{e.active}</td>
                      <td className="px-4 py-2.5 text-right text-red-400">{e.declined}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{e.total}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${rate >= 75 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* iLvl-Entwicklung */}
      {ilvlPerEvent.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              Item-Level Entwicklung (letzte 10 Events)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground text-xs">
                    <th className="text-left px-4 py-2.5 font-medium">Event</th>
                    <th className="text-right px-4 py-2.5 font-medium">Datum</th>
                    <th className="text-right px-4 py-2.5 font-medium">Ø iLvl</th>
                    <th className="text-right px-4 py-2.5 font-medium">Min</th>
                    <th className="text-right px-4 py-2.5 font-medium">Max</th>
                    <th className="text-right px-4 py-2.5 font-medium">Teilnehmer</th>
                  </tr>
                </thead>
                <tbody>
                  {ilvlPerEvent.map((e) => (
                    <tr key={e.eventId} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span>{e.type === 'RAID' ? '⚔️' : '🎉'}</span>
                          <span className="truncate max-w-[200px]">{e.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                        {format(new Date(e.startAt))}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-amber-400">{e.avgItemLevel}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{e.minItemLevel}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{e.maxItemLevel}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{e.participantCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
