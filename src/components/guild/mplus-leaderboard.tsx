'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { WOW_CLASSES } from '@/lib/types';
import type { GuildMemberData } from '@/lib/types';

interface MplusLeaderboardProps {
  members: GuildMemberData[];
  onMemberClick: (member: GuildMemberData) => void;
}

/** M+ Leaderboard – Ranking aller Gildenmitglieder nach M+ Rating */
export function MplusLeaderboard({ members, onMemberClick }: MplusLeaderboardProps) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const ranked = useMemo(() =>
    members
      .filter((m) => m.mythicRating && m.mythicRating > 0)
      .sort((a, b) => (b.mythicRating ?? 0) - (a.mythicRating ?? 0)),
    [members],
  );

  if (!ranked.length) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-8 text-center text-muted-foreground">
          Keine M+ Daten verfügbar.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top 3 Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ranked.slice(0, 3).map((m, idx) => {
          const classInfo = WOW_CLASSES[m.classId] || { name: m.className, color: '#888' };
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <Card
              key={`${m.name}-${m.realmSlug}`}
              className="bg-card/50 border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onMemberClick(m)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{medals[idx]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate" style={{ color: classInfo.color }}>
                      {m.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.activeSpec} {classInfo.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold font-mono" style={{ color: m.mythicRatingColor || '#fff' }}>
                      {m.mythicRating}
                    </p>
                    {m.equippedItemLevel && (
                      <p className="text-xs text-muted-foreground">iLvl {m.equippedItemLevel}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Vollständiges Ranking */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-400" />
            M+ Ranking
            <Badge variant="secondary" className="text-xs ml-auto">
              {ranked.length} Spieler
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Tabellen-Header */}
          <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-muted-foreground uppercase tracking-wider border-b border-border/20 font-medium">
            <span className="w-8 text-right">#</span>
            <span className="flex-1">Name</span>
            <span className="w-32 hidden sm:block">Spezialisierung</span>
            <span className="w-12 text-center hidden md:block">iLvl</span>
            <span className="w-16 text-right">Rating</span>
            <span className="w-5" />
          </div>

          {ranked.map((m, idx) => {
            const classInfo = WOW_CLASSES[m.classId] || { name: m.className, color: '#888' };
            const key = `${m.name}-${m.realmSlug}`;
            const isExpanded = expandedPlayer === key;
            const hasRuns = m.mythicBestRuns && m.mythicBestRuns.length > 0;

            return (
              <div key={key} className={`border-b border-border/10 last:border-0 ${isExpanded ? 'bg-muted/10' : ''}`}>
                {/* Spieler-Zeile */}
                <div
                  className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/15 cursor-pointer transition-colors"
                  onClick={() => {
                    if (hasRuns) setExpandedPlayer(isExpanded ? null : key);
                    else onMemberClick(m);
                  }}
                >
                  <span className="text-xs text-muted-foreground font-mono w-8 text-right">
                    #{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span
                      className="font-semibold text-sm truncate cursor-pointer hover:underline"
                      style={{ color: classInfo.color }}
                      onClick={(e) => { e.stopPropagation(); onMemberClick(m); }}
                    >
                      {m.name}
                    </span>
                  </div>
                  <span className="w-32 text-xs text-muted-foreground hidden sm:block truncate">
                    {m.activeSpec} {classInfo.name}
                  </span>
                  <span className="w-12 text-center text-xs font-mono text-purple-300 hidden md:block">
                    {m.equippedItemLevel || '–'}
                  </span>
                  <span
                    className="w-16 text-right font-bold font-mono text-sm"
                    style={{ color: m.mythicRatingColor || '#fff' }}
                  >
                    {m.mythicRating}
                  </span>
                  {hasRuns ? (
                    isExpanded
                      ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : <div className="w-3.5 shrink-0" />}
                </div>

                {/* Aufgeklappte Runs – 2-spaltig wie im Armory */}
                {isExpanded && hasRuns && (
                  <div className="px-4 pb-3 animate-in slide-in-from-top-1 duration-150">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-0 ml-10">
                      {m.mythicBestRuns!.map((run, ri) => (
                        <div key={ri} className="flex items-center justify-between text-xs py-1 border-b border-border/10">
                          <span className="truncate flex-1 mr-2">{run.dungeon}</span>
                          <span className={`font-mono font-bold mr-1 ${run.inTime ? 'text-emerald-400' : 'text-red-400'}`}>
                            +{run.level}
                          </span>
                          <span className="text-muted-foreground font-mono w-10 text-right">
                            {run.rating}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
