'use client';

/**
 * Roster-Verwaltung – zeigt alle Max-Level Spieler und ermöglicht manuelle Synchronisation.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import { RefreshCw, Users, Search, AlertTriangle, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
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

type SortKey = 'characterName' | 'className' | 'itemLevel' | 'mythicRating';
type SortDir = 'asc' | 'desc';

/** Sortier-Icon je nach aktivem Zustand */
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  return sortDir === 'asc'
    ? <ChevronUp className="h-3 w-3 text-amber-400" />
    : <ChevronDown className="h-3 w-3 text-amber-400" />;
}

export function RosterPage({ players, lastSync, session: _session, rosterMaxLevel }: RosterPageProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ total?: number; created?: number; updated?: number; error?: string } | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('characterName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  /** Spalte anklicken – bei gleicher Spalte Richtung umkehren, sonst neue Spalte aufsteigend */
  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = players.filter((p) =>
      p.characterName.toLowerCase().includes(q) ||
      p.className.toLowerCase().includes(q)
    );

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'characterName') {
        cmp = a.characterName.localeCompare(b.characterName);
      } else if (sortKey === 'className') {
        cmp = a.className.localeCompare(b.className);
      } else if (sortKey === 'itemLevel') {
        cmp = (a.itemLevel ?? -1) - (b.itemLevel ?? -1);
      } else if (sortKey === 'mythicRating') {
        cmp = (a.mythicRating ?? -1) - (b.mythicRating ?? -1);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [players, search, sortKey, sortDir]);

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
                  {([
                    { key: 'characterName' as SortKey, label: 'Charakter', align: 'left' },
                    { key: 'className' as SortKey, label: 'Klasse', align: 'left' },
                    { key: 'itemLevel' as SortKey, label: 'iLvl', align: 'right' },
                    { key: 'mythicRating' as SortKey, label: 'M+ Rating', align: 'right' },
                  ]).map(({ key, label, align }) => (
                    <th
                      key={key}
                      className={`px-4 py-2.5 font-medium cursor-pointer select-none hover:text-foreground transition-colors ${
                        align === 'right' ? 'text-right' : 'text-left'
                      }`}
                      onClick={() => handleSort(key)}
                    >
                      <span className={`inline-flex items-center gap-1 ${
                        align === 'right' ? 'flex-row-reverse' : ''
                      }`}>
                        {label}
                        <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-muted-foreground text-sm">
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
