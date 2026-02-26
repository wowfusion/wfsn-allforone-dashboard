/**
 * API-Route: Kaderplanung – Raid-Slots verwalten.
 * GET    – Alle aktuellen Raid-Slots des Events abrufen.
 * PUT    – Slot setzen/aktualisieren (discordRsvpId + role + position).
 * DELETE – Slot leeren (via ?role=TANK&position=1).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const slotSchema = z.object({
  discordRsvpId: z.string(),
  role: z.enum(['TANK', 'HEALER', 'DPS']),
  position: z.number().int().min(1),
  note: z.string().max(100).optional(),
});

const deleteSchema = z.object({
  role: z.enum(['TANK', 'HEALER', 'DPS']),
  position: z.number().int().min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: RouteParams
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id: eventId } = await params;

  const slots = await prisma.raidSlot.findMany({
    where: { eventId },
    include: { discordRsvp: true },
    orderBy: [{ role: 'asc' }, { position: 'asc' }],
  });

  return NextResponse.json({ slots });
}

export async function PUT(
  req: NextRequest,
  { params }: RouteParams
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  if (!can.lockEvent(session.user.appRoles)) {
    return NextResponse.json({ error: 'Keine Berechtigung (OFFICER+ erforderlich)' }, { status: 403 });
  }

  const { id: eventId } = await params;
  const body = await req.json();
  const parsed = slotSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { discordRsvpId, role, position, note } = parsed.data;

  // Sicherstellen dass der RSVP zum Event gehört
  const rsvp = await prisma.discordRsvp.findFirst({
    where: { id: discordRsvpId, eventId },
  });

  if (!rsvp) {
    return NextResponse.json({ error: 'RSVP nicht gefunden' }, { status: 404 });
  }

  const slot = await prisma.raidSlot.upsert({
    where: { eventId_role_position: { eventId, role, position } },
    create: { eventId, discordRsvpId, role, position, note },
    update: { discordRsvpId, note },
    include: { discordRsvp: true },
  });

  return NextResponse.json({ slot });
}

export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  if (!can.lockEvent(session.user.appRoles)) {
    return NextResponse.json({ error: 'Keine Berechtigung (OFFICER+ erforderlich)' }, { status: 403 });
  }

  const { id: eventId } = await params;
  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { role, position } = parsed.data;

  await prisma.raidSlot.deleteMany({
    where: { eventId, role, position },
  });

  return NextResponse.json({ success: true });
}
