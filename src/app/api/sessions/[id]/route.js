// ============================================
// API: Sesión individual - GET/PUT
// GET /api/sessions/[id]
// PUT /api/sessions/[id] (actualizar estado, datos)
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
    const sessionData = await prisma.session.findUnique({
      where: { id },
      include: {
        criteria: true,
        notebook: {
          include: {
            classroom: {
              include: {
                students: {
                  orderBy: { fullName: 'asc' },
                  include: {
                    _count: {
                      select: {
                        evidences: {
                          where: { sessionId: id }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        evidences: {
          include: {
            student: { select: { fullName: true } },
            criteria: { select: { description: true } },
            files: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sessionData) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    return NextResponse.json(sessionData);
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

    const updated = await prisma.session.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
