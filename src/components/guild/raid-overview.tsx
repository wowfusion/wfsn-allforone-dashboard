'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords } from 'lucide-react';
import { WOW_CLASSES } from '@/lib/types';
import type { GuildMemberData, GuildRaidSummary, RioRaidProgressionData, RioRaidRankingData } from '@/lib/types';

interface RaidOverviewProps {
  members: GuildMemberData[];
  raidSummary: GuildRaidSummary | null;
  rioRaidProgression: Record<string, RioRaidProgressionData> | null;
  rioRaidRankings: Record<string, RioRaidRankingData> | null;
  onMemberClick: (member: GuildMemberData) => void;
}

/** Gildenweite Raid-Übersicht: Boss-Progress + Raider.io Rankings + Spieler-Ranking */
export function RaidOverview({ members, raidSummary, rioRaidProgression, rioRaidRankings, onMemberClick }: RaidOverviewProps) {
  // Spieler mit Raid-Daten, sortiert nach heroischem Progress
  const raiders = useMemo(() =>
    members
      .filter((m) => m.raidProgress)
      .sort((a, b) => {
        const aH = parseInt(a.raidProgress!.heroic.split('/')[0]) || 0;
        const bH = parseInt(b.raidProgress!.heroic.split('/')[0]) || 0;
        if (bH !== aH) return bH - aH;
        const aM = parseInt(a.raidProgress!.mythic.split('/')[0]) || 0;
        const bM = parseInt(b.raidProgress!.mythic.split('/')[0]) || 0;
        return bM - aM;
      }),
    [members],
  );

  if (!raidSummary || !raiders.length) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-8 text-center text-muted-foreground">
          Keine Raid-Daten verfügbar.
        </CardContent>
      </Card>
    );
  }

  // Boss-Übersicht: Wie viele Spieler haben jeden Boss auf jeder Schwierigkeit gekillt?
  const bossStats = useMemo(() => {
    const bosses = new Map<number, { name: string; n: number; h: number; m: number }>();

    for (const m of raiders) {
      for (const enc of m.raidProgress!.encounters) {
        let entry = bosses.get(enc.id);
        if (!entry) {
          entry = { name: enc.name, n: 0, h: 0, m: 0 };
          bosses.set(enc.id, entry);
        }
        if (enc.normalKills > 0) entry.n++;
        if (enc.heroicKills > 0) entry.h++;
        if (enc.mythicKills > 0) entry.m++;
      }
    }

    return [...bosses.values()];
  }, [raiders]);

  // Raider.io Progression für den aktuellen Raid finden
  const rioEntry = useMemo(() => {
    if (!rioRaidProgression || !raidSummary) return null;
    // Suche den Eintrag der zum raidName passt
    const entries = Object.entries(rioRaidProgression);
    const match = entries.find(([key]) =>
      raidSummary.raidName.toLowerCase().includes(key.replace(/-/g, ' ').toLowerCase())
      || key.replace(/-/g, ' ').toLowerCase().includes(raidSummary.raidName.split(':')[0].trim().toLowerCase()),
    );
    return match ? { key: match[0], progression: match[1] } : entries.length > 0 ? { key: entries[entries.length - 1][0], progression: entries[entries.length - 1][1] } : null;
  }, [rioRaidProgression, raidSummary]);

  const rioRanking = useMemo(() => {
    if (!rioRaidRankings || !rioEntry) return null;
    return rioRaidRankings[rioEntry.key] || null;
  }, [rioRaidRankings, rioEntry]);

  return (
    <div className="space-y-4">
      {/* Raid Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold text-amber-400">{raidSummary.raidName}</p>
            {rioEntry && (
              <p className="text-sm font-semibold text-foreground mt-1">{rioEntry.progression.summary}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{raidSummary.totalBosses} Bosse</p>
          </CardContent>
        </Card>
        <DifficultyCard
          label="Normal"
          raiders={raidSummary.normalRaiders}
          cleared={raidSummary.normalCleared}
          color="text-foreground"
          ranking={rioRanking?.normal}
        />
        <DifficultyCard
          label="Heroisch"
          raiders={raidSummary.heroicRaiders}
          cleared={raidSummary.heroicCleared}
          color="text-amber-400"
          ranking={rioRanking?.heroic}
        />
        <DifficultyCard
          label="Mythisch"
          raiders={raidSummary.mythicRaiders}
          cleared={raidSummary.mythicCleared}
          color="text-purple-400"
          ranking={rioRanking?.mythic}
        />
      </div>

      {/* Boss-für-Boss Breakdown */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Swords className="h-4 w-4 text-red-400" />
            Boss-Übersicht: Spieler mit Kill
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bossStats.map((boss, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/10">
                <span className="text-sm truncate flex-1 mr-2">{boss.name}</span>
                <div className="flex gap-2 text-xs font-mono shrink-0">
                  <span className={boss.n > 0 ? 'text-foreground' : 'text-muted-foreground/30'}>
                    N:{boss.n}
                  </span>
                  <span className={boss.h > 0 ? 'text-amber-400' : 'text-muted-foreground/30'}>
                    H:{boss.h}
                  </span>
                  <span className={boss.m > 0 ? 'text-purple-400' : 'text-muted-foreground/30'}>
                    M:{boss.m}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Raider-Ranking */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Swords className="h-4 w-4 text-amber-400" />
            Raider-Ranking
            <Badge variant="secondary" className="text-xs ml-auto">{raiders.length} Spieler</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0.5">
            {raiders.map((m) => {
              const classInfo = WOW_CLASSES[m.classId] || { name: m.className, color: '#888' };
              return (
                <div
                  key={`${m.name}-${m.realmSlug}`}
                  className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => onMemberClick(m)}
                >
                  <span className="font-medium text-sm truncate flex-1" style={{ color: classInfo.color }}>
                    {m.name}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {m.activeSpec}
                  </span>
                  <div className="flex gap-2 text-xs font-mono shrink-0">
                    <RaidBadgeInline label="N" progress={m.raidProgress!.normal} />
                    <RaidBadgeInline label="H" progress={m.raidProgress!.heroic} />
                    <RaidBadgeInline label="M" progress={m.raidProgress!.mythic} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DifficultyCard({ label, raiders, cleared, color, ranking }: {
  label: string; raiders: number; cleared: number; color: string;
  ranking?: { world: number; region: number; realm: number };
}) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4 text-center">
        <p className={`text-2xl font-bold ${color}`}>{raiders}</p>
        <p className="text-xs text-muted-foreground">{label} Raider</p>
        {cleared > 0 && (
          <Badge className="mt-1 text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            {cleared}x Clear
          </Badge>
        )}
        {ranking && ranking.realm > 0 && (
          <div className="mt-1.5 text-[10px] text-muted-foreground space-y-0.5">
            {ranking.realm > 0 && <p>Realm #{ranking.realm}</p>}
            {ranking.region > 0 && <p>Region #{ranking.region}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RaidBadgeInline({ label, progress }: { label: string; progress: string }) {
  const [done, total] = progress.split('/').map(Number);
  const isComplete = done > 0 && done >= total;
  const hasProgress = done > 0;

  const color = isComplete
    ? label === 'M' ? 'text-purple-400' : label === 'H' ? 'text-amber-400' : 'text-emerald-400'
    : hasProgress
      ? label === 'M' ? 'text-purple-400/60' : label === 'H' ? 'text-amber-400/60' : 'text-foreground/60'
      : 'text-muted-foreground/30';

  return (
    <span className={`${color}`}>
      {label}:{progress}
    </span>
  );
}
