'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Trophy, Swords } from 'lucide-react';
import type { ActivityItem } from '@/lib/types';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

/** Letzte Gilden-Aktivitäten (Achievements, Boss-Kills) */
export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (!activities.length) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-amber-400" />
            Letzte Aktivitäten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Keine Aktivitäten verfügbar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-amber-400" />
          Letzte Aktivitäten
          <Badge variant="secondary" className="text-xs ml-auto">{activities.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {activities.map((a, i) => (
            <div
              key={`${a.timestamp}-${i}`}
              className="flex items-start gap-3 text-sm py-1.5 border-b border-border/20 last:border-0"
            >
              <div className="mt-0.5">
                {a.type === 'achievement' ? (
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <Swords className="h-3.5 w-3.5 text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate">
                  {a.characterName && (
                    <span className="font-medium text-foreground">{a.characterName} </span>
                  )}
                  <span className="text-muted-foreground">{a.description}</span>
                </p>
                <time className="text-[11px] text-muted-foreground/60">
                  {formatTimestamp(a.timestamp)}
                </time>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (hours < 1) return 'gerade eben';
  if (hours < 24) return `vor ${hours}h`;
  if (days < 7) return `vor ${days}d`;
  return date.toLocaleDateString('de-DE');
}
