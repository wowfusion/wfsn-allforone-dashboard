'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Heart, Swords } from 'lucide-react';
import type { GuildMemberData } from '@/lib/types';

interface RoleDistributionProps {
  members: GuildMemberData[];
}

// #region Spec → Rolle Mapping
/** Tank-Spezialisierungen (DE + EN) */
const TANK_SPECS = new Set([
  'Protection', 'Schutz',
  'Blood', 'Blut',
  'Vengeance', 'Rachsucht',
  'Guardian', 'Wächter',
  'Brewmaster', 'Braumeister',
]);

/** Heiler-Spezialisierungen (DE + EN) */
const HEALER_SPECS = new Set([
  'Holy', 'Heilig',
  'Discipline', 'Disziplin',
  'Restoration', 'Wiederherstellung',
  'Mistweaver', 'Nebelwirker',
  'Preservation', 'Bewahrung',
]);
// #endregion

type Role = 'tank' | 'healer' | 'dps';

function getRole(spec: string | null): Role {
  if (!spec) return 'dps';
  if (TANK_SPECS.has(spec)) return 'tank';
  if (HEALER_SPECS.has(spec)) return 'healer';
  return 'dps';
}

/** Übersicht der Rollenverteilung: Tank / Heiler / DD */
export function RoleDistribution({ members }: RoleDistributionProps) {
  const roles = useMemo(() => {
    // Nur Level 80 Spieler zählen
    const maxLevel = members.filter((m) => m.level >= 80 && m.activeSpec);
    let tanks = 0;
    let healers = 0;
    let dps = 0;

    for (const m of maxLevel) {
      const role = getRole(m.activeSpec);
      if (role === 'tank') tanks++;
      else if (role === 'healer') healers++;
      else dps++;
    }

    const total = tanks + healers + dps;
    return { tanks, healers, dps, total };
  }, [members]);

  if (roles.total === 0) return null;

  const items = [
    { label: 'Tank', count: roles.tanks, icon: Shield, color: 'text-cyan-400', bg: 'bg-cyan-400' },
    { label: 'Heiler', count: roles.healers, icon: Heart, color: 'text-emerald-400', bg: 'bg-emerald-400' },
    { label: 'DD', count: roles.dps, icon: Swords, color: 'text-red-400', bg: 'bg-red-400' },
  ];

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Rollenverteilung</CardTitle>
        <p className="text-xs text-muted-foreground">{roles.total} Spieler (Lvl 80)</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const pct = roles.total > 0 ? Math.round((item.count / roles.total) * 100) : 0;
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className="font-mono text-xs">
                  <span className={item.color}>{item.count}</span>
                  <span className="text-muted-foreground ml-1">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.bg} transition-all duration-500`}
                  style={{ width: `${pct}%`, opacity: 0.7 }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
