/**
 * API Route: GET /api/guild
 * Ruft die kompletten Gildendaten inkl. aller Berufe ab.
 * Cached das Ergebnis für 10 Minuten im Memory.
 */

import { NextResponse } from 'next/server';
import { fetchGuildData } from '@/lib/blizzard';
import { prisma } from '@/lib/prisma';
import type { GuildData } from '@/lib/types';

// #region In-Memory Cache
let cachedData: GuildData | null = null;
let cachedAt = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 Minuten
let isFetching = false;
// #endregion

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get('force') === '1';

  try {
    // Cache prüfen (force=1 umgeht den Cache)
    if (!force && cachedData && Date.now() - cachedAt < CACHE_TTL) {
      return NextResponse.json(cachedData);
    }

    // Verhindern, dass mehrere parallele Requests gleichzeitig fetchen
    if (isFetching && cachedData) {
      return NextResponse.json(cachedData);
    }

    isFetching = true;
    const settings = await prisma.appSettings.upsert({ where: { id: 'default' }, create: {}, update: {} });
    const data = await fetchGuildData(settings.rosterMaxLevel);
    cachedData = data;
    cachedAt = Date.now();
    isFetching = false;

    return NextResponse.json(data);
  } catch (err) {
    isFetching = false;
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    console.error('[API /guild] Fehler:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
