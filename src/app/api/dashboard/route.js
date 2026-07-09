// ============================================
// API: Dashboard / Estadísticas
// GET /api/dashboard
// ============================================
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId = session.user.id;

    // Estadísticas generales
    const [classrooms, students, totalEvidences, pendingEvidences, confirmedEvidences, activeSessions] = await Promise.all([
      prisma.classroom.count({ where: { userId } }),
      prisma.student.count({ where: { classroom: { userId } } }),
      prisma.evidence.count({ where: { session: { notebook: { classroom: { userId } } } } }),
      prisma.evidence.count({ where: { status: 'pendiente', session: { notebook: { classroom: { userId } } } } }),
      prisma.evidence.count({ where: { status: 'confirmada', session: { notebook: { classroom: { userId } } } } }),
      prisma.session.count({ where: { status: 'activa', notebook: { classroom: { userId } } } }),
    ]);

    // Evidencias recientes
    const recentEvidences = await prisma.evidence.findMany({
      where: { session: { notebook: { classroom: { userId } } } },
      include: {
        student: { select: { fullName: true } },
        session: { select: { activityTitle: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Estudiantes sin evidencia reciente (últimos 7 días)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const studentsWithoutRecent = await prisma.student.findMany({
      where: {
        classroom: { userId },
        evidences: {
          none: {
            createdAt: { gte: weekAgo }
          }
        }
      },
      select: { fullName: true, classroom: { select: { name: true } } },
      take: 10,
    });

    // Sesiones activas del día
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySessions = await prisma.session.findMany({
      where: {
        status: 'activa',
        notebook: { classroom: { userId } },
      },
      include: {
        notebook: { select: { classroom: { select: { name: true } } } },
        _count: { select: { evidences: true } },
      },
    });

    return NextResponse.json({
      stats: {
        classrooms,
        students,
        totalEvidences,
        pendingEvidences,
        confirmedEvidences,
        activeSessions,
      },
      recentEvidences,
      studentsWithoutRecent,
      todaySessions,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
