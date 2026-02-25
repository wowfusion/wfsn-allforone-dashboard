'use client';

/**
 * Admin/Officer Auswertungsseite – Short-Notice Drop Statistiken.
 * Aggregiert DropHistory pro User und zeigt Chronik.
 */

import { useState } from 'react';
import Link from 'next/link';
import type { Session } from 'next-auth';
import { BarChart3, AlertTriangle, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from '@/lib/date-utils';

interface DropUser {
  id: string;
  name: string;
  avatar: string | null;
  discordId: string;
}

interface DropEvent {
  id: string;
  title: string;
  startAt: Date;
  type: 'RAID' | 'EVENT';
}

interface DropItem {
  id: string;
  userId: string;
  droppedAt: Date;
  previousStatus: string;
  isShortNotice: boolean;
  reason: string | null;
  user: DropUser;
  event: DropEvent;
}

interface AdminStatsPageProps {
  drops: DropItem[];
  session: Session;
}

interface UserDropStats {
  user: DropUser;
  totalDrops: number;
  drops: DropItem[];
}

export function AdminStatsPage({ drops }: AdminStatsPageProps) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Aggregation pro User
  const userMap = new Map<string, UserDropStats>();
  for (const drop of drops) {
    if (!userMap.has(drop.userId)) {
      userMap.set(drop.userId, { user: drop.user, totalDrops: 0, drops: [] });
    }
    const entry = userMap.get(drop.userId)!;
    entry.totalDrops++;
    entry.drops.push(drop);
  }

  const stats = Array.from(userMap.values()).sort((a, b) => b.totalDrops - a.totalDrops);

  /** CSV-Export */
  function handleExport() {
    const rows = [
      ['User', 'DiscordId', 'Event', 'Datum', 'Vorheriger Status', 'Kurzfristig', 'Grund'],
      ...drops.map((d) => [
        d.user.name,
        d.user.discordId,
        d.event.title,
        new Date(d.droppedAt).toISOString(),
        d.previousStatus,
        d.isShortNotice ? 'Ja' : 'Nein',
        d.reason ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drops_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-amber-400">
            <BarChart3 className="h-6 w-6 text-amber-400" />
            Short-Notice Drop Auswertung
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Spieler die sich nach dem Lock oder kurzfristig vor Eventbeginn abgemeldet haben.
          </p>
        </div>
        {drops.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            CSV Export
          </Button>
        )}
      </div>

      {/* Gesamt-Statistik */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Gesamte Drops</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">{drops.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Betroffene User</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">{stats.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ø Drops / User</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              <span className="text-amber-400">{stats.length > 0 ? (drops.length / stats.length).toFixed(1) : '0'}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User-Liste */}
      {stats.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Keine kurzfristigen Absagen gefunden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stats.map(({ user, totalDrops, drops: userDrops }) => {
            const isExpanded = expandedUser === user.id;

            return (
              <Card key={user.id} className={totalDrops >= 3 ? 'border-orange-400/40' : ''}>
                <CardContent className="p-4">
                  {/* User-Zeile */}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.discordId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={totalDrops >= 3 ? 'destructive' : totalDrops >= 2 ? 'outline' : 'secondary'}
                        className="gap-1"
                      >
                        {totalDrops >= 3 && <AlertTriangle className="h-3 w-3" />}
                        {totalDrops} Drop{totalDrops !== 1 ? 's' : ''}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Drop-Chronik */}
                  {isExpanded && (
                    <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
                      {userDrops.map((drop) => (
                        <div
                          key={drop.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/30 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span>{drop.event.type === 'RAID' ? '⚔️' : '🎉'}</span>
                            <div>
                              <Link
                                href={`/events/${drop.event.id}`}
                                className="font-medium hover:text-primary transition-colors text-xs"
                              >
                                {drop.event.title}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                Event: {format(new Date(drop.event.startAt))}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Abgesagt: {format(new Date(drop.droppedAt))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              War: {drop.previousStatus === 'GOING' ? '✅ Angemeldet' : '❓ Vielleicht'}
                            </p>
                            {drop.reason && (
                              <p className="text-xs text-muted-foreground/60 italic mt-0.5">
                                „{drop.reason}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
