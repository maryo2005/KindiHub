// ============================================
// API: Gestión de Evidencias (simplificado)
// GET /api/evidence - Listar con filtros
// POST /api/evidence - Crear evidencia
// PUT /api/evidence - Actualizar evidencia
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
    const classroomId = searchParams.get('classroomId');

    const where = {};
    if (sessionId) where.sessionId = sessionId;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    if (classroomId) {
      where.session = { notebook: { classroomId } };
    }

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
    const { studentId, sessionId, criteriaId, type, level, competency,
            observation, transcription, status: evidenceStatus } = body;

    if (!studentId || !sessionId) {
      return NextResponse.json({ error: 'Estudiante y sesión son requeridos' }, { status: 400 });
    }

    const evidence = await prisma.evidence.create({
      data: {
        studentId,
        sessionId,
        criteriaId,
        type: type || 'texto',
        level,
        competency,
        observation,
        transcription,
        status: evidenceStatus || 'pendiente',
        confirmedAt: evidenceStatus === 'confirmada' ? new Date() : undefined,
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

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de evidencia es requerido' }, { status: 400 });
    }

    // Si se confirma, agregar fecha
    if (updateData.status === 'confirmada') {
      updateData.confirmedAt = new Date();
    }

    const evidence = await prisma.evidence.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { fullName: true } },
        criteria: { select: { description: true } },
        files: true,
      },
    });

    return NextResponse.json(evidence);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
