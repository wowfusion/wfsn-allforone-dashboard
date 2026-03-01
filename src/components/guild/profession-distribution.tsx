'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PROFESSION_ICONS, PROFESSION_NAMES_DE } from '@/lib/types';
import type { ProfessionCount } from '@/lib/types';

interface ProfessionDistributionProps {
  distribution: ProfessionCount[];
}

export function ProfessionDistribution({ distribution }: ProfessionDistributionProps) {
  const maxCount = distribution.length > 0 ? distribution[0].count : 1;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span>📊</span> Berufe-Verteilung (Midnight)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {distribution.map((prof) => {
          const icon = PROFESSION_ICONS[prof.name] || '🔧';
          const deName = PROFESSION_NAMES_DE[prof.name] || prof.name;
          const pct = Math.round((prof.count / maxCount) * 100);

          return (
            <div key={prof.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span>{icon}</span>
                  <span className="font-medium">{deName}</span>
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-mono">
                    ⌀ {prof.avgSkill}
                  </Badge>
                  {prof.maxedCount > 0 && (
                    <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {prof.maxedCount}x Max
                    </Badge>
                  )}
                  <span className="font-bold text-amber-400 w-8 text-right">{prof.count}</span>
                </div>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
