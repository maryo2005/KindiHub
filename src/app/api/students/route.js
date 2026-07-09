// ============================================
// API: Gestión de Estudiantes
// GET /api/students?classroomId=xxx - Listar estudiantes
// POST /api/students - Crear estudiante
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

    const students = await prisma.student.findMany({
      where,
      include: {
        classroom: { select: { name: true } },
        _count: { select: { evidences: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    return NextResponse.json(students);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { fullName, classroomId, dni } = body;

    if (!fullName || !classroomId) {
      return NextResponse.json({ error: 'Nombre y aula son requeridos' }, { status: 400 });
    }

    const student = await prisma.student.create({
      data: { fullName, classroomId, dni },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
