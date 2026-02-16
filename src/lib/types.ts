/**
 * TypeScript Typen für die Battle.net WoW API Responses und App-Datenmodelle.
 */

// #region Battle.net API Responses
export interface BnetTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface BnetRosterResponse {
  _links: Record<string, unknown>;
  guild: {
    key: { href: string };
    name: string;
    id: number;
    realm: {
      key: { href: string };
      name: string;
      id: number;
      slug: string;
    };
    faction: { type: string; name: string };
  };
  members: BnetRosterMember[];
}

export interface BnetRosterMember {
  character: {
    key: { href: string };
    name: string;
    id: number;
    realm: {
      key: { href: string };
      id: number;
      slug: string;
      name?: string;
    };
    level: number;
    playable_class: { key: { href: string }; id: number };
    playable_race: { key: { href: string }; id: number };
    faction?: { type: string };
  };
  rank: number;
}

export interface BnetProfessionsResponse {
  _links: Record<string, unknown>;
  character: {
    key: { href: string };
    name: string;
    id: number;
    realm: { key: { href: string }; name: string; id: number; slug: string };
  };
  primaries: BnetProfession[];
  secondaries: BnetProfession[];
}

export interface BnetProfession {
  profession: {
    key: { href: string };
    name: string;
    id: number;
  };
  tiers: BnetProfessionTier[];
}

export interface BnetProfessionTier {
  skill_points: number;
  max_skill_points: number;
  tier: {
    name: string;
    id: number;
  };
  known_recipes?: BnetRecipe[];
}

export interface BnetRecipe {
  key: { href: string };
  name: string;
  id: number;
}

export interface BnetCharacterProfile {
  _links: Record<string, unknown>;
  id: number;
  name: string;
  realm: { name: string; id: number; slug: string };
  level: number;
  active_spec?: { name: string; id: number };
  active_title?: { display_string: string };
  average_item_level?: number;
  equipped_item_level?: number;
  achievement_points?: number;
  last_login_timestamp?: number;
}

export interface BnetMythicKeystoneProfile {
  _links: Record<string, unknown>;
  /** Season-Endpoint: "mythic_rating", Base-Endpoint: "current_mythic_rating" */
  mythic_rating?: {
    color: { r: number; g: number; b: number; a: number };
    rating: number;
  };
  current_mythic_rating?: {
    color: { r: number; g: number; b: number; a: number };
    rating: number;
  };
  best_runs?: BnetMythicRun[];
}

export interface BnetMythicRun {
  completed_timestamp: number;
  duration: number;
  keystone_level: number;
  keystone_affix?: { key: { href: string }; name: string; id: number };
  dungeon: { name: string; id: number };
  is_completed_within_time: boolean;
  mythic_rating: { color: { r: number; g: number; b: number; a: number }; rating: number };
  map_rating: { color: { r: number; g: number; b: number; a: number }; rating: number };
}

export interface BnetRaidEncountersResponse {
  _links: Record<string, unknown>;
  expansions?: BnetRaidExpansion[];
}

/** Equipment Response – ausgerüstete Items */
export interface BnetEquipmentResponse {
  _links: Record<string, unknown>;
  character: { name: string; id: number; realm: { slug: string } };
  equipped_items?: BnetEquippedItem[];
}

export interface BnetEquippedItem {
  item: { key: { href: string }; id: number };
  slot: { type: string; name: string };
  quantity: number;
  name: string;
  quality: { type: string; name: string };
  level: { value: number; display_string: string };
  item_class?: { name: string; id: number };
  item_subclass?: { name: string; id: number };
  media?: { key: { href: string }; id: number };
  enchantments?: { display_string: string; enchantment_id: number; source_item?: { key: { href: string }; id: number } }[];
  sockets?: { socket_type: { type: string; name: string }; item?: { name: string; id: number }; display_string?: string }[];
  set?: { item_set: { name: string; id: number }; items: { item: { name: string; id: number }; is_equipped: boolean }[]; display_string: string };
  stats?: { type: { type: string; name: string }; value: number }[];
  bonus_list?: number[];
  modified_appearance_id?: number;
  name_description?: { display_string: string; color: { r: number; g: number; b: number; a: number } };
}

/** Character Media – Render-Bild URLs */
export interface BnetCharacterMedia {
  _links: Record<string, unknown>;
  character: { name: string; id: number };
  assets?: { key: string; value: string }[];
}

/** Character Achievements (on-demand) */
export interface BnetCharacterAchievementsResponse {
  _links: Record<string, unknown>;
  total_quantity: number;
  total_points: number;
  achievements: BnetCharacterAchievementEntry[];
}

export interface BnetCharacterAchievementEntry {
  id: number;
  achievement: { key: { href: string }; name: string; id: number };
  criteria?: { id: number; is_completed: boolean };
  completed_timestamp?: number;
}

/** Guild Achievements */
export interface BnetGuildAchievementsResponse {
  _links: Record<string, unknown>;
  total_quantity: number;
  total_points: number;
  achievements: BnetGuildAchievement[];
}

export interface BnetGuildAchievement {
  id: number;
  achievement: { key: { href: string }; name: string; id: number };
  criteria?: { id: number; is_completed: boolean; child_criteria?: { id: number; amount: number; is_completed: boolean }[] };
  completed_timestamp?: number;
}

/** Guild Activity Feed */
export interface BnetGuildActivityResponse {
  _links: Record<string, unknown>;
  activities: BnetGuildActivity[];
}

export interface BnetGuildActivity {
  character_achievement?: {
    character: { name: string; id: number; realm: { slug: string } };
    achievement: { key: { href: string }; name: string; id: number };
  };
  encounter_completed?: {
    encounter: { name: string; id: number };
    mode: { type: string; name: string };
  };
  activity?: { type: string };
  timestamp: number;
}

export interface BnetRaidExpansion {
  expansion: { name: string; id: number };
  instances: BnetRaidInstance[];
}

export interface BnetRaidInstance {
  instance: { name: string; id: number };
  modes: BnetRaidMode[];
}

export interface BnetRaidMode {
  difficulty: { type: string; name: string };
  status: { type: string; name: string };
  progress: { completed_count: number; total_count: number; encounters: BnetRaidEncounter[] };
}

export interface BnetRaidEncounter {
  encounter: { name: string; id: number };
  completed_count: number;
  last_kill_timestamp?: number;
}
// #endregion

// #region App-Datenmodelle (für Frontend)
export interface GuildData {
  guildName: string;
  realmName: string;
  faction: string;
  memberCount: number;
  fetchedAt: string;
  members: GuildMemberData[];
  stats: GuildStats;
  guildAchievementPoints: number;
  recentActivity: ActivityItem[];
  rioProfileUrl: string | null;
  rioRaidProgression: Record<string, RioRaidProgressionData> | null;
  rioRaidRankings: Record<string, RioRaidRankingData> | null;
}

/** Raider.io Raid-Progression (pro Raid) */
export interface RioRaidProgressionData {
  summary: string;
  totalBosses: number;
  normalBossesKilled: number;
  heroicBossesKilled: number;
  mythicBossesKilled: number;
}

/** Raider.io Raid-Rankings (pro Raid pro Schwierigkeit) */
export interface RioRaidRankingData {
  normal: { world: number; region: number; realm: number };
  heroic: { world: number; region: number; realm: number };
  mythic: { world: number; region: number; realm: number };
}

export interface GuildMemberData {
  name: string;
  realm: string;
  realmSlug: string;
  level: number;
  classId: number;
  className: string;
  raceId: number;
  rank: number;
  faction: string;
  professions: ProfessionData[] | null;
  // Charakter-Details
  activeSpec: string | null;
  averageItemLevel: number | null;
  equippedItemLevel: number | null;
  achievementPoints: number | null;
  lastLogin: string | null;
  // M+ Daten
  mythicRating: number | null;
  mythicRatingColor: string | null;
  mythicBestRuns: MythicRunData[] | null;
  // Raid Progress (aktueller Raid)
  raidProgress: RaidProgressData | null;
  error?: string;
}

export interface MythicRunData {
  dungeon: string;
  level: number;
  inTime: boolean;
  rating: number;
}

export interface RaidProgressData {
  raidName: string;
  raidId: number;
  normal: string;
  heroic: string;
  mythic: string;
  encounters: RaidEncounterData[];
}

export interface RaidEncounterData {
  name: string;
  id: number;
  normalKills: number;
  heroicKills: number;
  mythicKills: number;
  lastKill: string | null;
}

export interface ProfessionData {
  name: string;
  id: number;
  type: 'primary' | 'secondary';
  skill: number;
  maxSkill: number;
  knownRecipes: RecipeData[];
}

export interface RecipeData {
  name: string;
  id: number;
}

/** On-Demand Character Details (Equipment + Media + Achievements) */
export interface CharacterDetailData {
  name: string;
  realm: string;
  renderUrl: string | null;
  avatarUrl: string | null;
  insetUrl: string | null;
  equipment: EquipmentSlotData[];
  achievements: CharacterAchievementData[];
}

/** Einzelner Charakter-Erfolg (aufbereitet) */
export interface CharacterAchievementData {
  id: number;
  name: string;
  completedAt: string | null;
}

export interface EquipmentSlotData {
  slot: string;
  slotName: string;
  itemId: number;
  name: string;
  quality: string;
  itemLevel: number;
  enchantments: string[];
  enchantmentIds: number[];
  gems: string[];
  gemIds: number[];
  setName: string | null;
  setItemIds: number[];
  bonusIds: number[];
  stats: { name: string; value: number }[];
}

export interface GuildStats {
  totalMembers: number;
  activeMembersCount: number;
  membersWithProfessions: number;
  membersWithoutData: number;
  professionDistribution: ProfessionCount[];
  classDistribution: ClassCount[];
  maxLevelCount: number;
  avgItemLevel: number;
  highestItemLevel: number;
  avgMythicRating: number;
  highestMythicRating: number;
  membersWithMythicRating: number;
  raidSummary: GuildRaidSummary | null;
}

export interface ClassCount {
  classId: number;
  className: string;
  color: string;
  count: number;
}

export interface GuildRaidSummary {
  raidName: string;
  totalBosses: number;
  /** Wie viele Spieler haben mindestens 1 Boss auf Normal/Heroisch/Mythisch */
  normalRaiders: number;
  heroicRaiders: number;
  mythicRaiders: number;
  /** Wie viele Spieler haben den Raid auf N/H/M komplett */
  normalCleared: number;
  heroicCleared: number;
  mythicCleared: number;
}

export interface ActivityItem {
  type: 'achievement' | 'encounter' | 'unknown';
  characterName: string;
  description: string;
  timestamp: string;
}

export interface ProfessionCount {
  name: string;
  count: number;
  avgSkill: number;
  maxedCount: number;
}
// #endregion

// #region Konstanten
/** WoW Klassen-ID → Name + Farbe */
export const WOW_CLASSES: Record<number, { name: string; color: string }> = {
  1: { name: 'Krieger', color: '#C79C6E' },
  2: { name: 'Paladin', color: '#F58CBA' },
  3: { name: 'Jäger', color: '#ABD473' },
  4: { name: 'Schurke', color: '#FFF569' },
  5: { name: 'Priester', color: '#FFFFFF' },
  6: { name: 'Todesritter', color: '#C41F3B' },
  7: { name: 'Schamane', color: '#0070DE' },
  8: { name: 'Magier', color: '#69CCF0' },
  9: { name: 'Hexenmeister', color: '#9482C9' },
  10: { name: 'Mönch', color: '#00FF96' },
  11: { name: 'Druide', color: '#FF7D0A' },
  12: { name: 'Dämonenjäger', color: '#A330C9' },
  13: { name: 'Rufer', color: '#33937F' },
};

/** WoW Rassen-ID → Name */
export const WOW_RACES: Record<number, string> = {
  1: 'Mensch', 2: 'Orc', 3: 'Zwerg', 4: 'Nachtelf', 5: 'Untoter',
  6: 'Tauren', 7: 'Gnom', 8: 'Troll', 9: 'Goblin', 10: 'Blutelf',
  11: 'Draenei', 22: 'Worgen', 24: 'Pandaren', 25: 'Pandaren', 26: 'Pandaren',
  27: 'Nachtgeborener', 28: 'Hochbergtauren', 29: 'Leerenelf',
  30: 'Lichtgeschmiedeter Draenei', 31: 'Zandalari-Troll', 32: 'Kul Tiraner',
  34: 'Dunkeleisenzwerg', 35: 'Vulpera', 36: 'Mag\'har-Orc',
  37: 'Mechagnome', 52: 'Dracthyr',
  70: 'Dracthyr', 84: 'Irdener', 85: 'Irdener',
};

/** Berufs-Emojis */
export const PROFESSION_ICONS: Record<string, string> = {
  Alchemy: '⚗️', Blacksmithing: '🔨', Enchanting: '✨',
  Engineering: '⚙️', Inscription: '📜', Jewelcrafting: '💎',
  Leatherworking: '🧵', Tailoring: '🪡', Mining: '⛏️',
  Herbalism: '🌿', Skinning: '🔪', Fishing: '🎣',
  Cooking: '🍳', Archaeology: '🏺',
};

/** Berufe auf Deutsch */
export const PROFESSION_NAMES_DE: Record<string, string> = {
  Alchemy: 'Alchemie', Blacksmithing: 'Schmiedekunst', Enchanting: 'Verzauberkunst',
  Engineering: 'Ingenieurskunst', Inscription: 'Inschriftenkunde',
  Jewelcrafting: 'Juwelenschleifen', Leatherworking: 'Lederverarbeitung',
  Tailoring: 'Schneiderei', Mining: 'Bergbau', Herbalism: 'Kräuterkunde',
  Skinning: 'Kürschnerei', Fishing: 'Angeln', Cooking: 'Kochen',
  Archaeology: 'Archäologie',
};

/** Gildenränge (typisches Setup) */
export const GUILD_RANKS: Record<number, string> = {
  0: 'Gildenmeister', 1: 'Offizier', 2: 'Veteran', 3: 'Mitglied',
  4: 'Rekrut', 5: 'Rang 5', 6: 'Rang 6', 7: 'Rang 7', 8: 'Rang 8', 9: 'Rang 9',
};

/** Aktueller Content-Tier Prefix */
export const CURRENT_TIER_PREFIX = 'Khaz Algar';
// #endregion
