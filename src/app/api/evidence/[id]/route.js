// ============================================
// API: Evidencia individual - GET/PUT/DELETE
// ============================================
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const evidence = await prisma.evidence.findUnique({
      where: { id },
      include: {
        student: true,
        session: { include: { criteria: true } },
        criteria: true,
        files: true,
      },
    });

    if (!evidence) return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 });
    return NextResponse.json(evidence);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // Si se confirma, registrar timestamp
    if (body.status === 'confirmada' || body.status === 'corregida') {
      body.confirmedAt = new Date();
    }

    const updated = await prisma.evidence.update({
      where: { id },
      data: body,
      include: {
        student: { select: { fullName: true } },
        criteria: { select: { description: true } },
        files: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    await prisma.evidence.delete({ where: { id } });
    return NextResponse.json({ message: 'Evidencia eliminada' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
