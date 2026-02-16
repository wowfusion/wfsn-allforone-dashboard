/**
 * API Route: GET /api/character/[realm]/[name]
 * On-Demand: Lädt Equipment + Character Media + Raider.io Daten
 * für einen einzelnen Charakter. Wird vom Detail-Dialog aufgerufen.
 */

import { NextResponse } from 'next/server';
import { fetchCharacterDetail } from '@/lib/blizzard';
import { fetchRioCharacterProfile } from '@/lib/raiderio';
import type { RioCharacterProfile } from '@/lib/raiderio';
import type { CharacterDetailData } from '@/lib/types';

// Kurzzeit-Cache pro Charakter (5 Min)
const cache = new Map<string, { data: unknown; at: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export interface CharacterApiResponse extends CharacterDetailData {
  raiderIo: RioCharacterProfile | null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ realm: string; name: string }> },
) {
  const { realm, name } = await params;

  if (!realm || !name) {
    return NextResponse.json({ error: 'realm und name sind Pflichtfelder' }, { status: 400 });
  }

  const key = `${realm}:${name.toLowerCase()}`;

  // Cache prüfen
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // Blizzard + Raider.io parallel laden
    const [blizzardData, rioData] = await Promise.all([
      fetchCharacterDetail(realm, name),
      fetchRioCharacterProfile(name, realm),
    ]);

    const data: CharacterApiResponse = {
      ...blizzardData,
      raiderIo: rioData,
    };

    cache.set(key, { data, at: Date.now() });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    console.error(`[API /character/${realm}/${name}] Fehler:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
