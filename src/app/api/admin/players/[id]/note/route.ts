import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const NoteSchema = z.object({
  note: z.string().max(1000).nullable(),
});

/**
 * PATCH /api/admin/players/[id]/note
 * Setzt oder löscht die manuelle Notiz eines Spielers (OFFICER+).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!can.syncGuild((session?.user?.appRoles ?? []) as AppRole[])) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = NoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 });
  }

  try {
    const player = await prisma.player.update({
      where: { id },
      data: { note: parsed.data.note },
      select: { id: true, note: true },
    });
    return NextResponse.json(player);
  } catch (err) {
    console.error('[PATCH /api/admin/players/[id]/note]', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
