// ============================================
// API: Cuadernos de campo
// GET /api/notebooks?classroomId=xxx
// POST /api/notebooks
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
    const classroomId = searchParams.get('classroomId');

    const where = classroomId ? { classroomId } : {};

    const notebooks = await prisma.fieldNotebook.findMany({
      where,
      include: {
        classroom: { select: { name: true } },
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notebooks);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { title, classroomId, originalFile } = body;

    if (!title || !classroomId) {
      return NextResponse.json({ error: 'Título y aula son requeridos' }, { status: 400 });
    }

    const notebook = await prisma.fieldNotebook.create({
      data: { title, classroomId, originalFile },
    });

    return NextResponse.json(notebook, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
