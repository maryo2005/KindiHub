// ============================================
// API: Estudiante individual - GET
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
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        classroom: { select: { name: true, age: true, section: true } },
        _count: { select: { evidences: true } },
      },
    });

    if (!student) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
    return NextResponse.json(student);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
