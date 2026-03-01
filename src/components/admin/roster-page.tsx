'use client';

/**
 * Roster-Verwaltung – zeigt alle Max-Level Spieler und ermöglicht manuelle Synchronisation.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import { RefreshCw, Users, Search, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from '@/lib/date-utils';

interface PlayerEntry {
  id: string;
  characterName: string;
  realm: string;
  faction: string | null;
  classId: number;
  className: string;
  specName: string | null;
  role: string | null;
  level: number;
  isMaxLevel: boolean;
  guildRank: number | null;
  itemLevel: number | null;
  mythicRating: number | null;
  lastSync: Date;
}

interface RosterPageProps {
  players: PlayerEntry[];
  lastSync: Date | null;
  session: Session;
  rosterMaxLevel: number;
}

const CLASS_COLORS: Record<number, string> = {
  1: '#C79C6E', 2: '#F58CBA', 3: '#ABD473', 4: '#FFF569',
  5: '#FFFFFF', 6: '#C41F3B', 7: '#0070DE', 8: '#69CCF0',
  9: '#9482C9', 10: '#00FF96', 11: '#FF7D0A', 12: '#A330C9', 13: '#33937F',
};

export function RosterPage({ players, lastSync, session: _session, rosterMaxLevel }: RosterPageProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ total?: number; created?: number; updated?: number; error?: string } | null>(null);
  const [search, setSearch] = useState('');

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/guild/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setSyncResult({ error: data.error ?? 'Sync fehlgeschlagen' });
      } else {
        setSyncResult(data);
        router.refresh();
      }
    } finally {
      setSyncing(false);
    }
  }

  const filtered = players.filter((p) =>
    p.characterName.toLowerCase().includes(search.toLowerCase()) ||
    p.className.toLowerCase().includes(search.toLowerCase())
  );

  const rankGroups = new Map<number, PlayerEntry[]>();
  for (const p of filtered) {
    const rank = p.guildRank ?? 99;
    if (!rankGroups.has(rank)) rankGroups.set(rank, []);
    rankGroups.get(rank)!.push(p);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-amber-400">
            <Users className="h-6 w-6 text-amber-400" />
            Gilden-Roster
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {players.length} Max-Level Charaktere (Level {rosterMaxLevel})
            {lastSync && ` · Letzter Sync: ${format(new Date(lastSync))}`}
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          className="gap-2"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Synchronisiert…' : 'Jetzt synchronisieren'}
        </Button>
      </div>

      {/* Sync-Ergebnis */}
      {syncResult && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
            syncResult.error
              ? 'bg-destructive/10 border-destructive/20 text-destructive'
              : 'bg-green-500/10 border-green-500/20 text-green-400'
          }`}
        >
          {syncResult.error ? (
            <>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {syncResult.error}
            </>
          ) : (
            <>
              ✅ Sync abgeschlossen: {syncResult.total} Charaktere ({syncResult.created} neu, {syncResult.updated} aktualisiert)
            </>
          )}
        </div>
      )}

      {/* Suche */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Charakter oder Klasse suchen…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Spieler-Tabelle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {filtered.length} Charaktere
            {search && ` (gefiltert von ${players.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground text-xs">
                  <th className="text-left px-4 py-2.5 font-medium">Charakter</th>
                  <th className="text-left px-4 py-2.5 font-medium">Klasse</th>
                  <th className="text-left px-4 py-2.5 font-medium">Realm</th>
                  <th className="text-left px-4 py-2.5 font-medium">Rang</th>
                  <th className="text-right px-4 py-2.5 font-medium">iLvl</th>
                  <th className="text-right px-4 py-2.5 font-medium">M+ Rating</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                      Keine Charaktere gefunden
                    </td>
                  </tr>
                ) : (
                  filtered.map((player) => (
                    <tr
                      key={player.id}
                      className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium" style={{ color: CLASS_COLORS[player.classId] ?? '#888' }}>
                        {player.characterName}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{player.className}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{player.realm}</td>
                      <td className="px-4 py-2.5">
                        {player.guildRank !== null && (
                          <Badge variant="secondary" className="text-xs">
                            Rang {player.guildRank}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {player.itemLevel ?? '–'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {player.mythicRating ? player.mythicRating.toFixed(0) : '–'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
