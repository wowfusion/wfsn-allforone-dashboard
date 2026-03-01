/**
 * Öffentliche Settings-Endpunkt – gibt nur für den Client benötigte,
 * nicht-sensitive Konfigurationswerte zurück (kein Auth erforderlich).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const settings = await prisma.appSettings.upsert({
    where: { id: 'default' },
    create: {},
    update: {},
    select: { discordPollIntervalMin: true, rosterMaxLevel: true },
  });

  return NextResponse.json({
    discordPollIntervalMin: settings.discordPollIntervalMin,
    rosterMaxLevel: settings.rosterMaxLevel,
  });
}
