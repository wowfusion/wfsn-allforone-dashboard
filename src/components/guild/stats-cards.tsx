'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, Sword, Shield, Zap, Swords } from 'lucide-react';
import type { GuildStats } from '@/lib/types';

interface StatsCardsProps {
  stats: GuildStats;
  guildName: string;
  realmName: string;
  faction: string;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const activePct = stats.totalMembers > 0
    ? Math.round((stats.activeMembersCount / stats.totalMembers) * 100)
    : 0;

  const raidLabel = stats.raidSummary
    ? `${stats.raidSummary.heroicCleared}x HC Clear`
    : '–';

  const cards = [
    {
      label: 'Aktive Spieler',
      value: `${stats.activeMembersCount}`,
      sub: `${activePct}% von ${stats.totalMembers} (7 Tage)`,
      icon: UserCheck,
      color: 'text-emerald-400',
    },
    {
      label: 'Level 80',
      value: stats.maxLevelCount,
      sub: `von ${stats.totalMembers} Mitgliedern`,
      icon: Users,
      color: 'text-cyan-400',
    },
    {
      label: 'Item Level',
      value: stats.avgItemLevel || '–',
      sub: stats.highestItemLevel ? `⌀ · Höchstes: ${stats.highestItemLevel}` : 'Durchschnitt',
      icon: Shield,
      color: 'text-purple-400',
    },
    {
      label: 'M+ Rating',
      value: stats.avgMythicRating || '–',
      sub: stats.highestMythicRating
        ? `⌀ von ${stats.membersWithMythicRating} · Best: ${stats.highestMythicRating}`
        : `${stats.membersWithMythicRating} Spieler`,
      icon: Zap,
      color: 'text-orange-400',
    },
    {
      label: stats.raidSummary?.raidName || 'Raid',
      value: stats.raidSummary ? `${stats.raidSummary.heroicRaiders}` : '–',
      sub: stats.raidSummary ? `HC Raider · ${raidLabel}` : 'Keine Daten',
      icon: Swords,
      color: 'text-red-400',
    },
    {
      label: 'Berufe',
      value: stats.professionDistribution.reduce((sum, p) => sum + p.count, 0),
      sub: `${stats.membersWithProfessions} Spieler · ${stats.professionDistribution.length} versch.`,
      icon: Sword,
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
