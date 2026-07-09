// ============================================
// API: Sesiones de aprendizaje
// GET /api/sessions?notebookId=xxx
// POST /api/sessions
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
    const notebookId = searchParams.get('notebookId');
    const status = searchParams.get('status');
    const classroomId = searchParams.get('classroomId');

    const where = {};
    if (notebookId) where.notebookId = notebookId;
    if (status) where.status = status;
    if (classroomId) where.notebook = { classroomId };

    const sessions = await prisma.session.findMany({
      where,
      include: {
        criteria: true,
        notebook: { select: { title: true, classroomId: true, classroom: { select: { name: true } } } },
        _count: { select: { evidences: true } },
      },
      orderBy: { sessionDate: 'desc' },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { activityTitle, sessionDate, area, competency, standard, capacities, notebookId, criteria } = body;

    if (!activityTitle || !notebookId) {
      return NextResponse.json({ error: 'Título y cuaderno son requeridos' }, { status: 400 });
    }

    const newSession = await prisma.session.create({
      data: {
        activityTitle,
        sessionDate: new Date(sessionDate || Date.now()),
        area: area || '',
        competency: competency || '',
        standard,
        capacities,
        notebookId,
        status: 'preparada',
        criteria: criteria ? {
          create: criteria.map(c => ({ description: c }))
        } : undefined,
      },
      include: { criteria: true },
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
