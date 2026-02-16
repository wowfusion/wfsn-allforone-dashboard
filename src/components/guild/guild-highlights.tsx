'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, Swords, BookOpen, Star } from 'lucide-react';
import { WOW_CLASSES } from '@/lib/types';
import type { GuildMemberData } from '@/lib/types';

interface GuildHighlightsProps {
  members: GuildMemberData[];
  onMemberClick: (member: GuildMemberData) => void;
}

interface HighlightEntry {
  label: string;
  member: GuildMemberData;
  value: string;
  icon: React.ElementType;
  color: string;
}

/** Top-Spieler Highlights: Höchstes iLvl, M+ Rating, Raid-Boss Kills, Rezepte */
export function GuildHighlights({ members, onMemberClick }: GuildHighlightsProps) {
  const highlights = useMemo(() => {
    const results: HighlightEntry[] = [];

    // Höchstes Item Level
    const topIlvl = [...members]
      .filter((m) => m.equippedItemLevel)
      .sort((a, b) => (b.equippedItemLevel ?? 0) - (a.equippedItemLevel ?? 0))[0];
    if (topIlvl) {
      results.push({
        label: 'Höchstes Item Level',
        member: topIlvl,
        value: `iLvl ${topIlvl.equippedItemLevel}`,
        icon: Shield,
        color: 'text-purple-400',
      });
    }

    // Höchstes M+ Rating
    const topMplus = [...members]
      .filter((m) => m.mythicRating && m.mythicRating > 0)
      .sort((a, b) => (b.mythicRating ?? 0) - (a.mythicRating ?? 0))[0];
    if (topMplus) {
      results.push({
        label: 'Höchstes M+ Rating',
        member: topMplus,
        value: `${topMplus.mythicRating}`,
        icon: Zap,
        color: 'text-orange-400',
      });
    }

    // Meiste HC Boss Kills
    const topRaider = [...members]
      .filter((m) => m.raidProgress)
      .sort((a, b) => {
        const aH = parseInt(a.raidProgress!.heroic.split('/')[0]) || 0;
        const bH = parseInt(b.raidProgress!.heroic.split('/')[0]) || 0;
        return bH - aH;
      })[0];
    if (topRaider?.raidProgress) {
      results.push({
        label: 'Bester HC Progress',
        member: topRaider,
        value: `HC ${topRaider.raidProgress.heroic}`,
        icon: Swords,
        color: 'text-amber-400',
      });
    }

    // Meiste Rezepte
    const topRecipes = [...members]
      .map((m) => ({
        member: m,
        count: m.professions?.reduce((sum, p) => sum + p.knownRecipes.length, 0) || 0,
      }))
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count)[0];
    if (topRecipes) {
      results.push({
        label: 'Meiste Rezepte',
        member: topRecipes.member,
        value: `${topRecipes.count} Rezepte`,
        icon: BookOpen,
        color: 'text-cyan-400',
      });
    }

    // Meiste Achievement Points
    const topAP = [...members]
      .filter((m) => m.achievementPoints && m.achievementPoints > 0)
      .sort((a, b) => (b.achievementPoints ?? 0) - (a.achievementPoints ?? 0))[0];
    if (topAP) {
      results.push({
        label: 'Meiste Erfolge',
        member: topAP,
        value: `${topAP.achievementPoints?.toLocaleString('de-DE')} AP`,
        icon: Star,
        color: 'text-amber-300',
      });
    }

    return results;
  }, [members]);

  if (!highlights.length) return null;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-400" />
          Gilden-Highlights
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {highlights.map((h) => {
          const classInfo = WOW_CLASSES[h.member.classId] || { name: h.member.className, color: '#888' };
          return (
            <div
              key={h.label}
              className="p-3 rounded-lg bg-muted/10 hover:bg-muted/20 cursor-pointer transition-colors"
              onClick={() => onMemberClick(h.member)}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <h.icon className={`h-3.5 w-3.5 ${h.color}`} />
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{h.label}</span>
              </div>
              <p className={`text-lg font-bold ${h.color}`}>{h.value}</p>
              <p className="text-xs mt-0.5">
                <span className="font-medium" style={{ color: classInfo.color }}>{h.member.name}</span>
                <span className="text-muted-foreground ml-1">{h.member.activeSpec}</span>
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
