'use client';

/**
 * Übersicht aller Gildenmitglieder ohne Discord-Rollen-Zuordnung.
 * Hilft dabei, Discord-Namen mit Ingame-Namen abzugleichen.
 */

import { useState, useMemo } from 'react';
import type { Session } from 'next-auth';
import { UserX, Search, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from '@/lib/date-utils';

type UnmatchedReason = 'NOT_IN_DISCORD' | 'NAME_MISMATCH' | 'FORMER_MEMBER' | 'NO_CACHE';

const REASON_BADGE: Record<UnmatchedReason, { label: string; className: string; hint: string }> = {
  NOT_IN_DISCORD: {
    label: 'Nicht im Discord',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
    hint: 'Kein Discord-Mitglied mit diesem Namen gefunden',
  },
  NAME_MISMATCH: {
    label: 'Name stimmt nicht überein',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    hint: 'Ähnlicher Discord-Name gefunden – Schreibweise prüfen',
  },
  FORMER_MEMBER: {
    label: 'Ehemaliger',
    className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    hint: 'Nicht mehr im Battle.net Gilden-Roster',
  },
  NO_CACHE: {
    label: 'Kein Discord-Cache',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    hint: 'Discord-Rollen-Sync noch nicht durchgeführt',
  },
};

interface PlayerEntry {
  id: string;
  characterName: string;
  className: string;
  classId: number;
  level: number;
  isFormerMember: boolean;
  reasons: UnmatchedReason[];
  guildRank: number | null;
  itemLevel: number | null;
  mythicRating: number | null;
}

interface UnmatchedPageProps {
  players: PlayerEntry[];
  totalPlayers: number;
  discordMemberSyncedAt: Date | null;
  rosterSyncRequired: boolean;
  session: Session;
}

const CLASS_COLORS: Record<number, string> = {
  1: '#C79C6E', 2: '#F58CBA', 3: '#ABD473', 4: '#FFF569',
  5: '#FFFFFF', 6: '#C41F3B', 7: '#0070DE', 8: '#69CCF0',
  9: '#9482C9', 10: '#00FF96', 11: '#FF7D0A', 12: '#A330C9', 13: '#33937F',
};

export function UnmatchedPage({ players, totalPlayers, discordMemberSyncedAt, rosterSyncRequired, session: _session }: UnmatchedPageProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.characterName.toLowerCase().includes(q) ||
        p.className.toLowerCase().includes(q)
    );
  }, [players, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-amber-400">
          <UserX className="h-6 w-6" />
          Nicht zugeordnet
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {players.length} von {totalPlayers} Charakteren ohne Discord-Zuordnung
          {discordMemberSyncedAt && ` · Discord-Stand: ${format(new Date(discordMemberSyncedAt))}`}
        </p>
      </div>

      {/* Hinweis wenn Roster-Sync erforderlich */}
      {rosterSyncRequired && (
        <div className="flex items-center gap-2 p-3 rounded-lg border bg-amber-400/10 border-amber-400/20 text-amber-400 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Der <strong>Roster-Sync</strong> wurde seit der letzten Aktualisierung noch nicht ausgeführt.
          Ehemalige Spieler werden erst nach einem Sync korrekt markiert.
          Bitte unter <strong>Roster &amp; Sync → Roster sync</strong> klicken.
        </div>
      )}

      {/* Hinweis wenn kein Discord-Sync */}
      {!discordMemberSyncedAt && (
        <div className="flex items-center gap-2 p-3 rounded-lg border bg-amber-400/10 border-amber-400/20 text-amber-400 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Kein Discord-Mitglieder-Cache vorhanden. Bitte zuerst unter{' '}
          <strong>Roster &amp; Sync → Discord-Rollen sync</strong> ausführen.
        </div>
      )}

      {/* Erklärung */}
      <div className="text-sm text-muted-foreground bg-card/50 border border-border/30 rounded-lg p-4">
        Diese Spieler sind im Battle.net Gilden-Roster vorhanden, aber ihr Charaktername stimmt mit keinem
        Discord-Anzeigenamen oder -Benutzernamen überein. Mögliche Ursachen:
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>Der Discord-Anzeigename unterscheidet sich vom Charakternamen</li>
          <li>Der Spieler ist nicht im Discord-Server</li>
          <li>Schreibweisen stimmen nicht überein (z.B. Sonderzeichen)</li>
        </ul>
      </div>

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

      {/* Tabelle */}
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
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium">Level</th>
                  <th className="text-right px-4 py-2.5 font-medium">iLvl</th>
                  <th className="text-right px-4 py-2.5 font-medium">M+ Rating</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                      {discordMemberSyncedAt
                        ? 'Alle Charaktere sind zugeordnet 🎉'
                        : 'Kein Discord-Cache vorhanden'}
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
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          {player.reasons.map((r) => {
                            const b = REASON_BADGE[r];
                            return (
                              <span
                                key={r}
                                title={b.hint}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border cursor-help ${b.className}`}
                              >
                                {b.label}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {player.level}
                        </Badge>
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
