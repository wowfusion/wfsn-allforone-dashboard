'use client';

/**
 * Signup-Aktivitätslog – zeigt An-/Abmeldungen mit Counter und letzter Änderung.
 * Nur sichtbar für OFFICER+.
 */

import useSWR from 'swr';
import { formatDistanceToNow } from '@/lib/date-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

// #region Typen

interface ActivityEntry {
  id: string;
  newStatus: 'GOING' | 'MAYBE' | 'DECLINED' | 'WAITLIST';
  previousStatus: 'GOING' | 'MAYBE' | 'DECLINED' | 'WAITLIST' | null;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
}

interface StatEntry {
  newStatus: 'GOING' | 'MAYBE' | 'DECLINED' | 'WAITLIST';
  _count: { id: number };
}

interface ActivityResponse {
  activities: ActivityEntry[];
  stats: StatEntry[];
}

interface SignupActivityLogProps {
  eventId: string;
}

// #endregion

// #region Hilfsfunktionen

const STATUS_LABEL: Record<string, string> = {
  GOING: '✅ Zugesagt',
  MAYBE: '🤔 Vielleicht',
  DECLINED: '❌ Abgesagt',
  WAITLIST: '⏳ Warteliste',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  GOING: 'bg-green-500/10 text-green-400 border-green-500/20',
  MAYBE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  DECLINED: 'bg-red-500/10 text-red-400 border-red-500/20',
  WAITLIST: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// #endregion

export function SignupActivityLog({ eventId }: SignupActivityLogProps) {
  const { data, isLoading } = useSWR<ActivityResponse>(
    `/api/events/${eventId}/signup-activity`,
    fetcher,
    { refreshInterval: 30_000 }
  );

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4 text-sm text-muted-foreground">Lade Aktivitäten…</CardContent>
      </Card>
    );
  }

  const activities = data?.activities ?? [];
  const stats = data?.stats ?? [];

  // Letzte Abmeldung ermitteln
  const lastDecline = activities.find((a) => a.newStatus === 'DECLINED');

  // Counter aus Stats
  const getCount = (status: string) =>
    stats.find((s) => s.newStatus === status)?._count.id ?? 0;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-amber-400" />
          Anmeldungsaktivität
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Counter-Übersicht */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['GOING', 'MAYBE', 'DECLINED', 'WAITLIST'] as const).map((status) => (
            <div
              key={status}
              className={`rounded-lg border px-3 py-2 text-center ${STATUS_BADGE_CLASS[status]}`}
            >
              <div className="text-lg font-bold">{getCount(status)}</div>
              <div className="text-xs opacity-80">{STATUS_LABEL[status]}</div>
            </div>
          ))}
        </div>

        {/* Letzte Abmeldung hervorheben */}
        {lastDecline && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/15 text-sm">
            <span className="text-red-400 font-medium">Letzte Abmeldung:</span>
            <span className="text-muted-foreground">
              {lastDecline.user.name} –{' '}
              {formatDistanceToNow(new Date(lastDecline.createdAt))}
            </span>
          </div>
        )}

        {/* Aktivitätsliste */}
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Noch keine Anmeldungsaktivität.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {activities.map((entry) => (
              <div key={entry.id} className="flex items-center gap-2.5 text-sm">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={entry.user.avatar ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {entry.user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium truncate flex-1">{entry.user.name}</span>
                {entry.previousStatus && (
                  <>
                    <span className="text-xs text-muted-foreground truncate">
                      {STATUS_LABEL[entry.previousStatus]}
                    </span>
                    <span className="text-muted-foreground/40">→</span>
                  </>
                )}
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${STATUS_BADGE_CLASS[entry.newStatus]}`}
                >
                  {STATUS_LABEL[entry.newStatus]}
                </Badge>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(entry.createdAt))}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
