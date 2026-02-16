'use client';

import { useState } from 'react';
import { useGuildData } from '@/hooks/use-guild-data';
import { StatsCards } from './stats-cards';
import { ProfessionDistribution } from './profession-distribution';
import { SkillOverview } from './skill-overview';
import { MemberTable } from './member-table';
import { ActivityFeed } from './activity-feed';
import { ClassDistribution } from './class-distribution';
import { MplusLeaderboard } from './mplus-leaderboard';
import { RaidOverview } from './raid-overview';
import { MemberDetailDialog } from './member-detail-dialog';
import { RoleDistribution } from './role-distribution';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, AlertCircle, Swords, Trophy, ExternalLink } from 'lucide-react';
import type { GuildMemberData } from '@/lib/types';

export function GuildDashboard() {
  const { guildData, isLoading, isError, error, refresh } = useGuildData();
  const [selectedMember, setSelectedMember] = useState<GuildMemberData | null>(null);

  const handleMemberClick = (member: GuildMemberData) => setSelectedMember(member);
  const handleDialogClose = () => setSelectedMember(null);

  // #region Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-amber-400 mx-auto" />
          <div>
            <h2 className="text-xl font-bold text-amber-400">Lade Gildendaten...</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Roster, Berufe, M+ und Raid-Daten werden abgerufen.
              <br />Das kann beim ersten Aufruf bis zu 30 Sekunden dauern.
            </p>
          </div>
        </div>
      </div>
    );
  }
  // #endregion

  // #region Error State
  if (isError || !guildData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-red-400">Fehler beim Laden</h2>
          <p className="text-sm text-muted-foreground">
            {error?.message || 'Die Gildendaten konnten nicht geladen werden.'}
          </p>
          <Button onClick={() => refresh()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }
  // #endregion

  const { guildName, realmName, faction, stats, members, fetchedAt, guildAchievementPoints, recentActivity, rioProfileUrl, rioRaidProgression, rioRaidRankings } = guildData;
  const fetchedDate = new Date(fetchedAt).toLocaleString('de-DE');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30">
        <div className="max-w-[1600px] mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Swords className="h-8 w-8 text-amber-400 shrink-0" />
              <div>
                <h1 className="text-2xl font-bold text-amber-400">{guildName}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{realmName}</span>
                  <span>·</span>
                  <span>{faction === 'ALLIANCE' ? '🔵 Allianz' : '🔴 Horde'}</span>
                  {guildAchievementPoints > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-amber-400" />
                        {guildAchievementPoints.toLocaleString('de-DE')} AP
                      </span>
                    </>
                  )}
                  {rioProfileUrl && (
                    <>
                      <span>·</span>
                      <a
                        href={rioProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> Raider.io
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Stand: {fetchedDate}</span>
              <Button
                onClick={() => refresh()}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Aktualisieren
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1600px] mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Stats Cards */}
        <StatsCards stats={stats} guildName={guildName} realmName={realmName} faction={faction} />

        <Separator className="opacity-30" />

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="overview" className="data-[state=active]:bg-card">
              Übersicht
            </TabsTrigger>
            <TabsTrigger value="members" className="data-[state=active]:bg-card">
              Mitglieder
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{members.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="mplus" className="data-[state=active]:bg-card">
              M+ Ranking
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{stats.membersWithMythicRating}</Badge>
            </TabsTrigger>
            <TabsTrigger value="raid" className="data-[state=active]:bg-card">
              Raid
              {stats.raidSummary && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{stats.raidSummary.heroicRaiders}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="professions" className="data-[state=active]:bg-card">
              Berufe
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{stats.membersWithProfessions}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Übersicht */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <ActivityFeed activities={recentActivity} />
              </div>
              <div className="space-y-6">
                <RoleDistribution members={members} />
                <ClassDistribution distribution={stats.classDistribution} totalMembers={stats.totalMembers} />
              </div>
            </div>
          </TabsContent>

          {/* Mitglieder */}
          <TabsContent value="members">
            <MemberTable members={members} stats={stats} onMemberClick={handleMemberClick} />
          </TabsContent>

          {/* M+ Ranking */}
          <TabsContent value="mplus">
            <MplusLeaderboard members={members} onMemberClick={handleMemberClick} />
          </TabsContent>

          {/* Raid */}
          <TabsContent value="raid">
            <RaidOverview members={members} raidSummary={stats.raidSummary} rioRaidProgression={rioRaidProgression} rioRaidRankings={rioRaidRankings} onMemberClick={handleMemberClick} />
          </TabsContent>

          {/* Berufe */}
          <TabsContent value="professions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProfessionDistribution distribution={stats.professionDistribution} />
              <SkillOverview members={members} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Zentraler Detail-Dialog (wird von allen Tabs geteilt) */}
      <MemberDetailDialog
        member={selectedMember}
        open={!!selectedMember}
        onClose={handleDialogClose}
      />
    </div>
  );
}
