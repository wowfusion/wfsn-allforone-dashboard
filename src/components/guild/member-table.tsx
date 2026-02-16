'use client';

import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, ArrowUpDown } from 'lucide-react';
import {
  WOW_CLASSES,
  WOW_RACES,
  PROFESSION_ICONS,
  PROFESSION_NAMES_DE,
} from '@/lib/types';
import type { GuildMemberData, ProfessionData, GuildStats } from '@/lib/types';

// #region Types
type SortKey = 'name' | 'level' | 'class' | 'rank' | 'ilvl' | 'mythic' | 'raid' | 'lastLogin' | 'prof1' | 'prof2';
type SortDir = 'asc' | 'desc';

interface MemberTableProps {
  members: GuildMemberData[];
  stats: GuildStats;
  onMemberClick: (member: GuildMemberData) => void;
}
// #endregion

export function MemberTable({ members, stats, onMemberClick }: MemberTableProps) {
  const [search, setSearch] = useState('');
  const [profFilter, setProfFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('ilvl');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // #region Sortierung
  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir(key === 'name' ? 'asc' : 'desc');
      return key;
    });
  }, []);

  const SortHeader = useCallback(({ label, sortField }: { label: string; sortField: SortKey }) => (
    <button
      onClick={(e) => { e.stopPropagation(); handleSort(sortField); }}
      className="flex items-center gap-1 hover:text-amber-400 transition-colors"
    >
      {label}
      <ArrowUpDown className="h-3 w-3 opacity-50" />
    </button>
  ), [handleSort]);
  // #endregion

  // #region Filtern & Sortieren
  const filteredMembers = useMemo(() => {
    let result = [...members];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.className.toLowerCase().includes(q) ||
        m.activeSpec?.toLowerCase().includes(q) ||
        m.professions?.some((p) => {
          const deName = PROFESSION_NAMES_DE[p.name] || p.name;
          return p.name.toLowerCase().includes(q) || deName.toLowerCase().includes(q);
        }),
      );
    }

    if (profFilter !== 'all') {
      result = result.filter((m) =>
        m.professions?.some((p) => p.name === profFilter && p.type === 'primary'),
      );
    }

    if (levelFilter === '80') {
      result = result.filter((m) => m.level >= 80);
    } else if (levelFilter === '70') {
      result = result.filter((m) => m.level >= 70);
    }

    result.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name': return dir * a.name.localeCompare(b.name, 'de');
        case 'level': return dir * (a.level - b.level);
        case 'class': return dir * a.className.localeCompare(b.className, 'de');
        case 'rank': return dir * (a.rank - b.rank);
        case 'ilvl': return dir * ((a.equippedItemLevel ?? -1) - (b.equippedItemLevel ?? -1));
        case 'mythic': return dir * ((a.mythicRating ?? -1) - (b.mythicRating ?? -1));
        case 'raid': {
          const aP = parseRaidProgress(a.raidProgress?.heroic);
          const bP = parseRaidProgress(b.raidProgress?.heroic);
          return dir * (aP - bP);
        }
        case 'lastLogin': {
          const aT = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          const bT = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          return dir * (aT - bT);
        }
        case 'prof1': {
          const ap = a.professions?.find((p) => p.type === 'primary')?.skill ?? -1;
          const bp = b.professions?.find((p) => p.type === 'primary')?.skill ?? -1;
          return dir * (ap - bp);
        }
        case 'prof2': {
          const ap = a.professions?.filter((p) => p.type === 'primary')[1]?.skill ?? -1;
          const bp = b.professions?.filter((p) => p.type === 'primary')[1]?.skill ?? -1;
          return dir * (ap - bp);
        }
        default: return 0;
      }
    });

    return result;
  }, [members, search, profFilter, levelFilter, sortKey, sortDir]);
  // #endregion

  return (
    <div className="space-y-4">
      {/* Filter-Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Spieler, Klasse, Spec oder Beruf suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={profFilter} onValueChange={setProfFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle Berufe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Berufe</SelectItem>
            {stats.professionDistribution.map((p) => (
              <SelectItem key={p.name} value={p.name}>
                {PROFESSION_ICONS[p.name]} {PROFESSION_NAMES_DE[p.name] || p.name} ({p.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Alle Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Level</SelectItem>
            <SelectItem value="80">Level 80</SelectItem>
            <SelectItem value="70">Level 70+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredMembers.length} von {members.length} Mitgliedern
      </p>

      {/* Tabelle */}
      <div className="rounded-md border border-border/50 overflow-auto max-h-[70vh]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead><SortHeader label="Name" sortField="name" /></TableHead>
              <TableHead className="text-center w-12"><SortHeader label="Lvl" sortField="level" /></TableHead>
              <TableHead><SortHeader label="Klasse" sortField="class" /></TableHead>
              <TableHead className="text-center w-16"><SortHeader label="iLvl" sortField="ilvl" /></TableHead>
              <TableHead className="text-center w-16"><SortHeader label="M+" sortField="mythic" /></TableHead>
              <TableHead className="text-center"><SortHeader label="Raid" sortField="raid" /></TableHead>
              <TableHead><SortHeader label="Beruf 1" sortField="prof1" /></TableHead>
              <TableHead><SortHeader label="Beruf 2" sortField="prof2" /></TableHead>
              <TableHead><SortHeader label="Online" sortField="lastLogin" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => {
              const key = `${member.name}-${member.realmSlug}`;
              const classInfo = WOW_CLASSES[member.classId] || { name: member.className, color: '#888' };
              const raceName = WOW_RACES[member.raceId] || '?';
              const primaries = member.professions?.filter((p) => p.type === 'primary') || [];
              const lastLoginStr = member.lastLogin ? formatLastLogin(member.lastLogin) : null;

              return (
                <TableRow
                  key={key}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onMemberClick(member)}
                >
                  <TableCell>
                    <span className="font-semibold text-sm" style={{ color: classInfo.color }}>{member.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {member.activeSpec ? `${member.activeSpec} · ` : ''}{raceName}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">{member.level}</TableCell>
                  <TableCell>
                    <span className="text-sm" style={{ color: classInfo.color }}>{classInfo.name}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {member.equippedItemLevel ? (
                      <span className="font-mono text-sm font-semibold text-purple-300">{member.equippedItemLevel}</span>
                    ) : <span className="text-muted-foreground text-xs">–</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {member.mythicRating ? (
                      <span className="font-mono text-sm font-bold" style={{ color: member.mythicRatingColor || '#fff' }}>
                        {member.mythicRating}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">–</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {member.raidProgress ? (
                      <div className="text-xs leading-tight">
                        <RaidBadge label="N" progress={member.raidProgress.normal} />
                        <RaidBadge label="H" progress={member.raidProgress.heroic} />
                        <RaidBadge label="M" progress={member.raidProgress.mythic} />
                      </div>
                    ) : <span className="text-muted-foreground text-xs">–</span>}
                  </TableCell>
                  <TableCell>{primaries[0] ? <ProfessionCell prof={primaries[0]} /> : <span className="text-muted-foreground text-xs">–</span>}</TableCell>
                  <TableCell>{primaries[1] ? <ProfessionCell prof={primaries[1]} /> : <span className="text-muted-foreground text-xs">–</span>}</TableCell>
                  <TableCell>
                    {lastLoginStr ? (
                      <span className={`text-xs ${lastLoginStr.stale ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {lastLoginStr.relative}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">–</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}

// #region Profession Cell (Tabelle)
function ProfessionCell({ prof }: { prof: ProfessionData }) {
  const icon = PROFESSION_ICONS[prof.name] || '';
  const deName = PROFESSION_NAMES_DE[prof.name] || prof.name;
  const pct = prof.maxSkill > 0 ? Math.round((prof.skill / prof.maxSkill) * 100) : 0;

  return (
    <div className="space-y-1 min-w-[120px]">
      <div className="flex items-center gap-1 text-xs">
        <span>{icon}</span>
        <span className="font-medium">{deName}</span>
        <span className="text-muted-foreground font-mono ml-auto">{prof.skill}/{prof.maxSkill}</span>
      </div>
      <Progress value={pct} className="h-1" />
    </div>
  );
}
// #endregion

// #region Helpers
function parseRaidProgress(progress?: string): number {
  if (!progress) return 0;
  return parseInt(progress.split('/')[0]) || 0;
}

function formatLastLogin(iso: string): { relative: string; full: string; stale: boolean } {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);

  const full = date.toLocaleString('de-DE');
  const stale = days > 30;

  if (hours < 1) return { relative: 'gerade eben', full, stale };
  if (hours < 24) return { relative: `vor ${hours}h`, full, stale };
  if (days < 7) return { relative: `vor ${days}d`, full, stale };
  if (days < 30) return { relative: `vor ${Math.floor(days / 7)}w`, full, stale };
  return { relative: `vor ${Math.floor(days / 30)}m`, full, stale };
}
// #endregion

// #region Raid Badge (Tabelle)
function RaidBadge({ label, progress }: { label: string; progress: string }) {
  const [done, total] = progress.split('/').map(Number);
  const isComplete = done > 0 && done >= total;
  const hasProgress = done > 0;

  const color = isComplete
    ? 'text-emerald-400'
    : hasProgress
      ? 'text-amber-400'
      : 'text-muted-foreground/50';

  return (
    <span className={`font-mono ${color} mr-1`}>
      {label}:{progress}
    </span>
  );
}
// #endregion
