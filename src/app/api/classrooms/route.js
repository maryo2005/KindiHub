// ============================================
// API: Gestión de Aulas
// GET /api/classrooms - Listar aulas
// POST /api/classrooms - Crear aula
// ============================================
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const classrooms = await prisma.classroom.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { students: true, notebooks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(classrooms);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { name, section, age, year } = body;

    if (!name || !section || !age) {
      return NextResponse.json({ error: 'Nombre, sección y edad son requeridos' }, { status: 400 });
    }

    const classroom = await prisma.classroom.create({
      data: {
        name,
        section,
        age,
        year: year || new Date().getFullYear(),
        userId: session.user.id,
      },
    });

    return NextResponse.json(classroom, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
