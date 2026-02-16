'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ExternalLink, Timer, Shield, Swords, Star, Trophy, Skull, ChevronRight } from 'lucide-react';
import {
  WOW_CLASSES,
  WOW_RACES,
  PROFESSION_ICONS,
  PROFESSION_NAMES_DE,
  GUILD_RANKS,
} from '@/lib/types';
import type {
  GuildMemberData,
  CharacterDetailData,
  EquipmentSlotData,
  CharacterAchievementData,
} from '@/lib/types';
import type { RioCharacterProfile, RioMythicRun } from '@/lib/raiderio';

// #region Quality-Farben (WoW Item-Qualität)
const QUALITY_COLORS: Record<string, string> = {
  POOR: '#9d9d9d',
  COMMON: '#ffffff',
  UNCOMMON: '#1eff00',
  RARE: '#0070dd',
  EPIC: '#a335ee',
  LEGENDARY: '#ff8000',
  ARTIFACT: '#e6cc80',
  HEIRLOOM: '#00ccff',
};

/** Linke Seite des Arsenals */
const LEFT_SLOTS = ['HEAD', 'NECK', 'SHOULDER', 'BACK', 'CHEST', 'WRIST', 'TABARD', 'SHIRT'];
/** Rechte Seite des Arsenals */
const RIGHT_SLOTS = ['HANDS', 'WAIST', 'LEGS', 'FEET', 'FINGER_1', 'FINGER_2', 'TRINKET_1', 'TRINKET_2'];
/** Waffen unten */
const WEAPON_SLOTS = ['MAIN_HAND', 'OFF_HAND'];
// #endregion

// #region Response Type (API liefert CharacterDetailData + raiderIo)
interface CharacterApiResponse extends CharacterDetailData {
  raiderIo: RioCharacterProfile | null;
}
// #endregion

interface MemberDetailDialogProps {
  member: GuildMemberData | null;
  open: boolean;
  onClose: () => void;
}

/** Detailansicht für einen Charakter – Arsenal-Style mit Tabs */
export function MemberDetailDialog({ member, open, onClose }: MemberDetailDialogProps) {
  const [detail, setDetail] = useState<CharacterApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('equipment');

  const loadDetail = useCallback(async (realmSlug: string, name: string) => {
    setLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(name.toLowerCase())}`);
      if (res.ok) {
        const data: CharacterApiResponse = await res.json();
        setDetail(data);
      }
    } catch {
      // Equipment + Rio sind optional
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (member && open) {
      setActiveTab('equipment');
      loadDetail(member.realmSlug, member.name);
    } else {
      setDetail(null);
    }
  }, [member, open, loadDetail]);

  // Wowhead Tooltips refreshen
  useEffect(() => {
    if (detail?.equipment?.length || activeTab) {
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).$WowheadPower) {
          ((window as unknown as Record<string, unknown>).$WowheadPower as { refreshLinks: () => void }).refreshLinks();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [detail, activeTab]);

  if (!member) return null;

  const classInfo = WOW_CLASSES[member.classId] || { name: member.className, color: '#888' };
  const raceName = WOW_RACES[member.raceId] || '?';
  const rankName = GUILD_RANKS[member.rank] || `Rang ${member.rank}`;
  const lastLoginStr = member.lastLogin ? formatRelativeTime(member.lastLogin) : null;
  const hasRaid = member.raidProgress;
  const allProfs = member.professions || [];
  const rioProfile = detail?.raiderIo || null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-[calc(100vw-2rem)]! max-w-[1600px]! h-[92vh] overflow-y-auto overflow-x-hidden p-0">

        {/* Header: Avatar + Name + Badges */}
        <div className="px-6 py-3 border-b border-border/30 bg-linear-to-r from-background to-muted/10">
          <div className="flex items-center gap-3">
            {detail?.avatarUrl ? (
              <img
                src={detail.avatarUrl}
                alt={member.name}
                className="w-12 h-12 rounded-full border-2 shrink-0 shadow-lg"
                style={{ borderColor: classInfo.color, boxShadow: `0 0 16px ${classInfo.color}30` }}
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full border-2 shrink-0 flex items-center justify-center text-xl font-bold"
                style={{ borderColor: classInfo.color, backgroundColor: `${classInfo.color}15` }}
              >
                {member.name.charAt(0)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-bold tracking-tight" style={{ color: classInfo.color }}>
                    {member.name}
                  </span>
                  <span className="text-sm text-muted-foreground font-normal">{member.realm}</span>
                  {rioProfile?.profileUrl && (
                    <a href={rioProfile.profileUrl} target="_blank" rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <Badge variant="outline" className="text-[11px] border-border/40">{raceName} {classInfo.name}</Badge>
                {member.activeSpec && <Badge variant="outline" className="text-[11px] border-border/40">{member.activeSpec}</Badge>}
                <Badge variant="outline" className="text-[11px] border-border/40">Lvl {member.level}</Badge>
                <Badge variant="outline" className="text-[11px] border-border/40">{rankName}</Badge>
                {member.equippedItemLevel && (
                  <Badge className="text-[11px] bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    iLvl {member.equippedItemLevel}
                  </Badge>
                )}
                {member.mythicRating && (
                  <Badge className="text-[11px] font-mono border" style={{
                    color: member.mythicRatingColor || '#fff',
                    borderColor: `${member.mythicRatingColor || '#fff'}40`,
                    backgroundColor: `${member.mythicRatingColor || '#fff'}15`,
                  }}>
                    M+ {member.mythicRating}
                  </Badge>
                )}
                {member.achievementPoints && (
                  <Badge variant="outline" className="text-[11px] border-border/40">
                    {member.achievementPoints.toLocaleString('de-DE')} AP
                  </Badge>
                )}
                {lastLoginStr && (
                  <Badge variant="outline" className="text-[11px] border-border/40">Online: {lastLoginStr}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 pt-2 pb-4">
          <TabsList className="bg-muted/20 p-1 gap-0.5 mb-3 h-auto">
            <TabsTrigger value="equipment" className="text-xs px-4 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">Ausrüstung</TabsTrigger>
            <TabsTrigger value="mplus" className="text-xs px-4 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">Mythic+</TabsTrigger>
            {hasRaid && <TabsTrigger value="raid" className="text-xs px-4 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">Raid</TabsTrigger>}
            {allProfs.length > 0 && <TabsTrigger value="professions" className="text-xs px-4 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">Berufe</TabsTrigger>}
            <TabsTrigger value="achievements" className="text-xs px-4 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">Erfolge</TabsTrigger>
          </TabsList>

          {/* Ausrüstung – Arsenal-Style */}
          <TabsContent value="equipment">
            <ArsenalEquipment
              equipment={detail?.equipment || null}
              renderUrl={detail?.renderUrl || detail?.insetUrl || null}
              loading={loading}
              classColor={classInfo.color}
            />
          </TabsContent>

          {/* Mythic+ */}
          <TabsContent value="mplus">
            <MythicPlusTab member={member} rioProfile={rioProfile} />
          </TabsContent>

          {/* Raid */}
          {hasRaid && (
            <TabsContent value="raid">
              <RaidTab member={member} />
            </TabsContent>
          )}

          {/* Berufe */}
          {allProfs.length > 0 && (
            <TabsContent value="professions">
              <ProfessionsTab member={member} />
            </TabsContent>
          )}

          {/* Erfolge */}
          <TabsContent value="achievements">
            <AchievementsTab achievements={detail?.achievements || []} loading={loading} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// #region Arsenal-Style Equipment
function ArsenalEquipment({ equipment, renderUrl, loading, classColor }: {
  equipment: EquipmentSlotData[] | null;
  renderUrl: string | null;
  loading: boolean;
  classColor: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Lade Ausrüstung...</span>
      </div>
    );
  }

  if (!equipment || !equipment.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Keine Ausrüstungsdaten verfügbar.</p>;
  }

  const itemMap = new Map(equipment.map((i) => [i.slot, i]));

  const leftItems = LEFT_SLOTS.map((s) => itemMap.get(s)).filter(Boolean) as EquipmentSlotData[];
  const rightItems = RIGHT_SLOTS.map((s) => itemMap.get(s)).filter(Boolean) as EquipmentSlotData[];
  const weaponItems = WEAPON_SLOTS.map((s) => itemMap.get(s)).filter(Boolean) as EquipmentSlotData[];

  return (
    <div className="relative">
      {/* Hauptlayout: Items – Charakter – Items */}
      <div className="grid grid-cols-[minmax(0,320px)_1fr_minmax(0,320px)] gap-1 mx-auto max-w-[1200px]" style={{ minHeight: 480 }}>
        {/* Linke Slots */}
        <div className="flex flex-col justify-center gap-1 min-w-0">
          {leftItems.map((item) => (
            <ItemRow key={item.slot} item={item} align="left" />
          ))}
        </div>

        {/* Charakter-Bild – groß und zentral, overflow geclippt */}
        <div className="flex items-center justify-center relative overflow-hidden">
          {renderUrl ? (
            <img
              src={renderUrl}
              alt="Charakter"
              className="h-[480px] w-auto object-contain"
              style={{ filter: `drop-shadow(0 0 16px ${classColor}50)` }}
            />
          ) : (
            <div
              className="w-full h-80 rounded-lg border border-border/20 flex items-center justify-center"
              style={{ backgroundColor: `${classColor}08` }}
            >
              <span className="text-6xl text-muted-foreground/20">?</span>
            </div>
          )}
        </div>

        {/* Rechte Slots */}
        <div className="flex flex-col justify-center gap-1 min-w-0">
          {rightItems.map((item) => (
            <ItemRow key={item.slot} item={item} align="right" />
          ))}
        </div>
      </div>

      {/* Waffen unten zentriert */}
      {weaponItems.length > 0 && (
        <div className="flex justify-center gap-4 mt-2 pt-2 border-t border-border/20">
          {weaponItems.map((item) => (
            <div key={item.slot} className="min-w-0 max-w-[320px] flex-1">
              <ItemRow item={item} align="center" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Baut den korrekten data-wowhead String für Tooltips mit Item-Level, Enchants, Gems, Bonus */
function buildWowheadData(item: EquipmentSlotData): string {
  const parts: string[] = ['domain=de'];
  // Item ID
  parts.push(`item=${item.itemId}`);
  // Korrektes Item-Level (wichtig! Ohne das zeigt Wowhead das Base-Level)
  if (item.itemLevel > 0) parts.push(`ilvl=${item.itemLevel}`);
  // Bonus IDs (z.B. Warforged, Socket, Tertiary) — essentiell für korrekte Tooltip-Anzeige
  if (item.bonusIds.length > 0) parts.push(`bonus=${item.bonusIds.join(':')}`);
  // Verzauberung
  if (item.enchantmentIds.length > 0) parts.push(`ench=${item.enchantmentIds[0]}`);
  // Sockel (Gems)
  if (item.gemIds.length > 0) parts.push(`gems=${item.gemIds.join(':')}`);
  // Set-Teile
  if (item.setItemIds.length > 0) parts.push(`pcs=${item.setItemIds.join(':')}`);
  return parts.join('&');
}

/** Einzelner Item-Slot im Arsenal-Layout */
function ItemRow({ item, align }: { item: EquipmentSlotData; align: 'left' | 'right' | 'center' }) {
  const color = QUALITY_COLORS[item.quality] || '#fff';
  const whData = buildWowheadData(item);
  const hasExtras = item.enchantments.length > 0 || item.gems.length > 0;

  return (
    <div className={`flex items-center gap-2 py-1 px-2 rounded-md hover:bg-muted/15 transition-colors min-w-0 ${
      align === 'right' ? 'flex-row-reverse text-right' : ''
    }`}>
      <div className="flex flex-col min-w-0 flex-1">
        <a
          href={`https://www.wowhead.com/item=${item.itemId}`}
          data-wowhead={whData}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-medium truncate hover:underline leading-tight"
          style={{ color }}
        >
          {item.name}
        </a>
        {hasExtras && (
          <div className={`flex gap-1.5 mt-0.5 flex-wrap ${align === 'right' ? 'justify-end' : ''}`}>
            {item.enchantments.map((e, i) => (
              <span key={i} className="text-[10px] text-emerald-400/80 truncate max-w-[180px]">
                Verzaubert: {e}
              </span>
            ))}
            {item.gems.map((g, i) => (
              <span key={i} className="text-[10px] text-cyan-400/80">💎 {g}</span>
            ))}
          </div>
        )}
      </div>
      <div className={`flex flex-col shrink-0 ${align === 'right' ? 'items-start' : 'items-end'}`}>
        <span className="text-[10px] text-muted-foreground/50 leading-none">{item.slotName}</span>
        <span className="text-sm font-mono font-bold" style={{ color }}>{item.itemLevel}</span>
      </div>
    </div>
  );
}
// #endregion

// #region Mythic+ Tab
function MythicPlusTab({ member, rioProfile }: { member: GuildMemberData; rioProfile: RioCharacterProfile | null }) {
  const hasBlizzardRuns = member.mythicBestRuns && member.mythicBestRuns.length > 0;
  const hasRioRuns = rioProfile && rioProfile.mythicPlusBestRuns.length > 0;
  const rioRecent = rioProfile?.mythicPlusRecentRuns || [];
  const bestRuns = hasRioRuns ? rioProfile!.mythicPlusBestRuns : null;

  if (!member.mythicRating && !hasBlizzardRuns && !hasRioRuns) {
    return <p className="text-sm text-muted-foreground text-center py-12">Keine M+ Daten verfügbar.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Rating Header Card */}
      {member.mythicRating && (
        <Card className="bg-card/50 border-border/30 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Season Rating</p>
                {/* Rollen-Scores */}
                {rioProfile?.mythicPlusScores && (
                  <div className="flex gap-2 pt-1">
                    {rioProfile.mythicPlusScores.dps > 0 && (
                      <Badge variant="outline" className="text-[11px] gap-1 border-red-500/20 text-red-400">
                        <Swords className="h-3 w-3" /> {Math.round(rioProfile.mythicPlusScores.dps)}
                      </Badge>
                    )}
                    {rioProfile.mythicPlusScores.healer > 0 && (
                      <Badge variant="outline" className="text-[11px] gap-1 border-emerald-500/20 text-emerald-400">
                        <Star className="h-3 w-3" /> {Math.round(rioProfile.mythicPlusScores.healer)}
                      </Badge>
                    )}
                    {rioProfile.mythicPlusScores.tank > 0 && (
                      <Badge variant="outline" className="text-[11px] gap-1 border-cyan-500/20 text-cyan-400">
                        <Shield className="h-3 w-3" /> {Math.round(rioProfile.mythicPlusScores.tank)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <span className="font-mono text-4xl font-black tracking-tighter" style={{ color: member.mythicRatingColor || '#fff' }}>
                {member.mythicRating}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Beste Runs */}
      {bestRuns && bestRuns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h4 className="text-sm font-semibold">Beste Runs</h4>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {bestRuns.map((run, idx) => (
              <RioRunRow key={idx} run={run} />
            ))}
          </div>
        </div>
      )}

      {/* Fallback: Blizzard Runs */}
      {!bestRuns && hasBlizzardRuns && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h4 className="text-sm font-semibold">Beste Runs</h4>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {member.mythicBestRuns!.map((run, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                <span className="truncate flex-1">{run.dungeon}</span>
                <span className={`font-mono ml-2 font-bold ${run.inTime ? 'text-emerald-400' : 'text-red-400'}`}>
                  +{run.level}
                </span>
                <span className="text-muted-foreground font-mono ml-3 w-12 text-right">{run.rating}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Letzte Runs */}
      {rioRecent.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Letzte Runs</h4>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {rioRecent.slice(0, 10).map((run, idx) => (
              <RioRunRow key={idx} run={run} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Einzelner Raider.io M+ Run als Card-Row */
function RioRunRow({ run }: { run: RioMythicRun }) {
  const inTime = run.numKeystoneUpgrades > 0;
  const upgrades = run.numKeystoneUpgrades > 0 ? '+'.repeat(Math.min(run.numKeystoneUpgrades, 3)) : '';
  const clearMin = Math.floor(run.clearTimeMs / 60000);
  const clearSec = Math.floor((run.clearTimeMs % 60000) / 1000);
  const timeStr = `${clearMin}:${clearSec.toString().padStart(2, '0')}`;

  return (
    <a
      href={run.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 py-2.5 px-3.5 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors group border border-transparent hover:border-border/30"
    >
      <span className="truncate flex-1 text-sm group-hover:text-foreground transition-colors">{run.dungeon}</span>
      <span className={`font-mono text-sm font-bold ${inTime ? 'text-emerald-400' : 'text-red-400'}`}>
        +{run.mythicLevel}
      </span>
      {upgrades && <span className="text-emerald-400/70 text-xs font-mono">{upgrades}</span>}
      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
        <Timer className="h-3 w-3" />{timeStr}
      </span>
      <span className="text-xs font-mono w-10 text-right text-muted-foreground">{Math.round(run.score)}</span>
    </a>
  );
}
// #endregion

// #region Raid Tab
function RaidTab({ member }: { member: GuildMemberData }) {
  if (!member.raidProgress) return null;

  const { raidProgress } = member;
  const nParts = raidProgress.normal.split('/');
  const hParts = raidProgress.heroic.split('/');
  const mParts = raidProgress.mythic.split('/');
  const total = parseInt(nParts[1]) || parseInt(hParts[1]) || parseInt(mParts[1]) || 1;

  const difficulties = [
    { label: 'Normal', short: 'N', progress: raidProgress.normal, killed: parseInt(nParts[0]) || 0, color: 'bg-foreground/60', textColor: 'text-foreground' },
    { label: 'Heroisch', short: 'H', progress: raidProgress.heroic, killed: parseInt(hParts[0]) || 0, color: 'bg-amber-500', textColor: 'text-amber-400' },
    { label: 'Mythisch', short: 'M', progress: raidProgress.mythic, killed: parseInt(mParts[0]) || 0, color: 'bg-purple-500', textColor: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Raid Header mit Fortschritt */}
      <Card className="bg-card/50 border-border/30">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Skull className="h-5 w-5 text-red-400" />
              <h3 className="text-lg font-bold">{raidProgress.raidName}</h3>
            </div>
            <div className="flex gap-2">
              {difficulties.map((d) => (
                <Badge key={d.short} variant="outline" className={`text-xs font-mono ${d.textColor} border-current/30`}>
                  {d.short} {d.progress}
                </Badge>
              ))}
            </div>
          </div>
          {/* Fortschrittsbalken pro Schwierigkeit */}
          <div className="space-y-2.5">
            {difficulties.map((d) => (
              <div key={d.short} className="flex items-center gap-3">
                <span className={`text-xs font-medium w-16 ${d.textColor}`}>{d.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${d.color} transition-all duration-500`}
                    style={{ width: `${(d.killed / total) * 100}%`, opacity: 0.8 }}
                  />
                </div>
                <span className={`text-xs font-mono w-10 text-right ${d.textColor}`}>{d.progress}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Boss-Liste */}
      {raidProgress.encounters.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            Boss-Übersicht
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {raidProgress.encounters.map((enc) => {
              const maxKills = Math.max(enc.normalKills, enc.heroicKills, enc.mythicKills);
              return (
                <div key={enc.id} className="flex items-center gap-3 py-2.5 px-3.5 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                  <span className={`truncate flex-1 text-sm ${maxKills > 0 ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                    {enc.name}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <KillBadge label="N" kills={enc.normalKills} color="text-foreground" />
                    <KillBadge label="H" kills={enc.heroicKills} color="text-amber-400" />
                    <KillBadge label="M" kills={enc.mythicKills} color="text-purple-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Kill-Badge für Boss-Encounter */
function KillBadge({ label, kills, color }: { label: string; kills: number; color: string }) {
  const active = kills > 0;
  return (
    <span className={`font-mono text-xs w-10 text-center rounded px-1 py-0.5 ${
      active ? `${color} bg-current/10 font-bold` : 'text-muted-foreground/20'
    }`}>
      {label}:{kills}
    </span>
  );
}
// #endregion

// #region Professions Tab
function ProfessionsTab({ member }: { member: GuildMemberData }) {
  const allProfs = member.professions || [];
  const profsWithRecipes = allProfs.filter((p) => p.knownRecipes.length > 0);

  return (
    <div className="space-y-6">
      {/* Skill-Übersicht als Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {allProfs.map((prof) => {
          const icon = PROFESSION_ICONS[prof.name] || '';
          const deName = PROFESSION_NAMES_DE[prof.name] || prof.name;
          const pct = prof.maxSkill > 0 ? Math.round((prof.skill / prof.maxSkill) * 100) : 0;
          const isMaxed = prof.skill >= prof.maxSkill;
          return (
            <Card key={prof.id} className="bg-card/50 border-border/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{icon} {deName}</span>
                  <span className={`font-mono text-xs font-bold ${isMaxed ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    {prof.skill}/{prof.maxSkill}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isMaxed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${pct}%`, opacity: 0.7 }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rezepte mit Wowhead Tooltips */}
      {profsWithRecipes.length > 0 && (
        <div className="space-y-5">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400" />
            Bekannte Rezepte
          </h4>
          {profsWithRecipes.map((prof) => {
            const icon = PROFESSION_ICONS[prof.name] || '';
            const deName = PROFESSION_NAMES_DE[prof.name] || prof.name;
            return (
              <Card key={prof.id} className="bg-card/30 border-border/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{icon} {deName}</span>
                    <Badge variant="secondary" className="text-[10px]">{prof.knownRecipes.length} Rezepte</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {prof.knownRecipes.map((r) => (
                      <a
                        key={r.id}
                        href={`https://www.wowhead.com/recipe/${r.id}`}
                        data-wowhead={`spell=${r.id}&domain=de`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md bg-muted/15 hover:bg-muted/30 border border-border/20 hover:border-border/40 text-foreground/80 hover:text-foreground transition-all cursor-pointer"
                      >
                        {r.name}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
// #endregion

// #region Achievements Tab
function AchievementsTab({ achievements, loading }: { achievements: CharacterAchievementData[]; loading: boolean }) {
  const [visibleCount, setVisibleCount] = useState(50);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Lade Erfolge...</span>
      </div>
    );
  }

  if (!achievements.length) {
    return <p className="text-sm text-muted-foreground text-center py-12">Keine Erfolgsdaten verfügbar.</p>;
  }

  const visible = achievements.slice(0, visibleCount);
  const hasMore = visibleCount < achievements.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-card/50 border-border/30">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-semibold">Erfolge</span>
          </div>
          <Badge variant="outline" className="text-xs font-mono">{achievements.length} freigeschaltet</Badge>
        </CardContent>
      </Card>

      {/* Erfolge-Liste */}
      <div className="space-y-1">
        {visible.map((ach, idx) => (
          <a
            key={`${ach.id}-${idx}`}
            href={`https://www.wowhead.com/achievement=${ach.id}`}
            data-wowhead={`achievement=${ach.id}&domain=de`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors group"
          >
            <span className="text-sm truncate flex-1 group-hover:text-amber-300 transition-colors">
              {ach.name}
            </span>
            {ach.completedAt && (
              <span className="text-xs text-muted-foreground font-mono ml-3 shrink-0">
                {formatAchievementDate(ach.completedAt)}
              </span>
            )}
          </a>
        ))}
      </div>

      {/* Mehr laden */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + 50)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg bg-muted/10 hover:bg-muted/20"
          >
            Weitere laden ({achievements.length - visibleCount} verbleibend)
          </button>
        </div>
      )}
    </div>
  );
}

/** Formatiert ein ISO-Datum als dd.MM.yyyy HH:mm */
function formatAchievementDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}
// #endregion

// #region Helpers
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (hours < 1) return 'gerade eben';
  if (hours < 24) return `vor ${hours}h`;
  if (days < 7) return `vor ${days}d`;
  if (days < 30) return `vor ${Math.floor(days / 7)}w`;
  return `vor ${Math.floor(days / 30)}m`;
}
// #endregion
