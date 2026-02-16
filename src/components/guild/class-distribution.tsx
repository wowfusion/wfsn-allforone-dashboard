'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import type { ClassCount } from '@/lib/types';

interface ClassDistributionProps {
  distribution: ClassCount[];
  totalMembers: number;
}

/** Balkendiagramm der Klassen-Verteilung mit WoW-Klassenfarben */
export function ClassDistribution({ distribution, totalMembers }: ClassDistributionProps) {
  const maxCount = distribution.length > 0 ? distribution[0].count : 1;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan-400" />
          Klassen-Verteilung
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {distribution.map((c) => {
          const pct = Math.round((c.count / totalMembers) * 100);
          const barWidth = Math.round((c.count / maxCount) * 100);

          return (
            <div key={c.classId} className="space-y-0.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium" style={{ color: c.color }}>
                  {c.className}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {c.count} <span className="text-muted-foreground/50">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%`, backgroundColor: c.color, opacity: 0.7 }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
