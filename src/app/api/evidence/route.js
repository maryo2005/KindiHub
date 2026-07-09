// ============================================
// API: Gestión de Evidencias
// GET /api/evidence - Listar con filtros
// POST /api/evidence - Crear evidencia
// ============================================
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const level = searchParams.get('level');

    const where = {};
    if (sessionId) where.sessionId = sessionId;
    if (studentId) where.studentId = studentId;
    if (status) {
      if (status === 'confirmada') {
        where.status = { in: ['confirmada', 'corregida'] };
      } else {
        where.status = status;
      }
    }
    if (type) where.type = type;
    if (level) where.level = level;

    const evidences = await prisma.evidence.findMany({
      where,
      include: {
        student: { select: { fullName: true } },
        session: { select: { activityTitle: true, sessionDate: true, competency: true } },
        criteria: { select: { description: true } },
        files: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(evidences);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { studentId, sessionId, criteriaId, type, level, observation, transcription,
            aiDescription, aiFeedback, confirmedDescription, confirmedFeedback, status: evidenceStatus } = body;

    if (!studentId || !sessionId) {
      return NextResponse.json({ error: 'Estudiante y sesión son requeridos' }, { status: 400 });
    }

    const finalStatus = evidenceStatus || 'pendiente';

    const evidence = await prisma.evidence.create({
      data: {
        studentId,
        sessionId,
        criteriaId,
        type: type || 'texto',
        level,
        observation,
        transcription,
        aiDescription,
        aiFeedback,
        confirmedDescription,
        confirmedFeedback,
        status: finalStatus,
        confirmedAt: finalStatus === 'confirmada' ? new Date() : undefined,
        createdBy: session.user.id,
      },
      include: {
        student: { select: { fullName: true } },
        criteria: { select: { description: true } },
        files: true,
      },
    });

    return NextResponse.json(evidence, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
