/**
 * API-Route: App-Einstellungen lesen und schreiben.
 * GET  – Einstellungen abrufen (ADMIN)
 * PUT  – Einstellungen aktualisieren (ADMIN)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';

const settingsSchema = z.object({
  rosterMaxLevel: z.number().int().min(1).max(200),
  discordPollIntervalMin: z.number().int().min(1).max(60),
});

/** Singleton-Einstellungen lesen oder mit Defaults anlegen */
async function getOrCreateSettings() {
  return prisma.appSettings.upsert({
    where: { id: 'default' },
    create: {},
    update: {},
  });
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  if (!can.manageConfig((session.user.appRoles ?? []) as AppRole[])) {
    return NextResponse.json({ error: 'Keine Berechtigung (ADMIN erforderlich)' }, { status: 403 });
  }

  const settings = await getOrCreateSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  if (!can.manageConfig((session.user.appRoles ?? []) as AppRole[])) {
    return NextResponse.json({ error: 'Keine Berechtigung (ADMIN erforderlich)' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: 'default' },
    create: {
      rosterMaxLevel: parsed.data.rosterMaxLevel,
      discordPollIntervalMin: parsed.data.discordPollIntervalMin,
    },
    update: {
      rosterMaxLevel: parsed.data.rosterMaxLevel,
      discordPollIntervalMin: parsed.data.discordPollIntervalMin,
    },
  });

  return NextResponse.json({ settings });
}
