'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PROFESSION_ICONS, PROFESSION_NAMES_DE, WOW_CLASSES } from '@/lib/types';
import type { GuildMemberData } from '@/lib/types';

interface SkillOverviewProps {
  members: GuildMemberData[];
}

interface ProfessionPlayer {
  name: string;
  classId: number;
  skill: number;
  maxSkill: number;
  recipeCount: number;
}

export function SkillOverview({ members }: SkillOverviewProps) {
  const [openProf, setOpenProf] = useState<string | null>(null);

  /** Gruppiert Spieler nach Beruf (nur Primaries) */
  const professionGroups = useMemo(() => {
    const map = new Map<string, ProfessionPlayer[]>();

    for (const m of members) {
      if (!m.professions) continue;
      for (const p of m.professions) {
        if (p.type !== 'primary') continue;
        const list = map.get(p.name) || [];
        list.push({
          name: m.name,
          classId: m.classId,
          skill: p.skill,
          maxSkill: p.maxSkill,
          recipeCount: p.knownRecipes.length,
        });
        map.set(p.name, list);
      }
    }

    // Sortiere Spieler innerhalb jeder Profession nach Skill desc
    for (const [, players] of map) {
      players.sort((a, b) => b.skill - a.skill);
    }

    // Sortiere Professionen alphabetisch
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [members]);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span>📈</span> Skill-Übersicht nach Beruf
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {professionGroups.map(([profName, players]) => {
          const icon = PROFESSION_ICONS[profName] || '🔧';
          const deName = PROFESSION_NAMES_DE[profName] || profName;
          const isOpen = openProf === profName;
          const maxed = players.filter((p) => p.skill >= p.maxSkill).length;

          return (
            <div key={profName} className="rounded-md border border-border/30 overflow-hidden">
              <button
                onClick={() => setOpenProf(isOpen ? null : profName)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <span>{icon}</span>
                  <span>{deName}</span>
                </span>
                <div className="flex items-center gap-2">
                  {maxed > 0 && (
                    <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {maxed}x Max
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {players.length} Spieler
                  </Badge>
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-3 space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                  {players.map((player, idx) => {
                    const classInfo = WOW_CLASSES[player.classId] || { name: '?', color: '#888' };
                    const pct = player.maxSkill > 0 ? Math.round((player.skill / player.maxSkill) * 100) : 0;

                    return (
                      <div key={`${player.name}-${idx}`} className="flex items-center gap-3 text-sm">
                        <span
                          className="w-[120px] truncate font-medium text-xs"
                          style={{ color: classInfo.color }}
                          title={player.name}
                        >
                          {player.name}
                        </span>
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground font-mono w-[55px] text-right">
                          {player.skill}/{player.maxSkill}
                        </span>
                        <span className="text-[10px] text-muted-foreground w-[50px] text-right">
                          {player.recipeCount} Rez.
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
