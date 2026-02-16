/**
 * SWR Hook zum Abrufen der Gildendaten von der API Route.
 */

'use client';

import useSWR from 'swr';
import type { GuildData } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`Fehler ${res.status}`);
  return res.json();
});

export function useGuildData() {
  const { data, error, isLoading, mutate } = useSWR<GuildData>(
    '/api/guild',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    },
  );

  return {
    guildData: data,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}
