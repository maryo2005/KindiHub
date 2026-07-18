// ============================================
// API: Subir archivo de cuaderno de campo para sesión
// POST /api/sessions/[id]/upload-notebook
// ============================================
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;

    // Verificar que la sesión existe
    const sessionData = await prisma.session.findUnique({
      where: { id },
      include: {
        notebook: {
          include: { classroom: true }
        }
      }
    });

    if (!sessionData) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Estructura: /uploads/aulas/{classroomId}/cuaderno-de-campo/{sessionId}/
    const classroomId = sessionData.notebook.classroom.id;
    const uploadDir = path.join(
      process.cwd(), 'public', 'uploads', 'aulas',
      classroomId, 'cuaderno-de-campo', id
    );
    await mkdir(uploadDir, { recursive: true });

    // Guardar archivo
    const ext = file.name.split('.').pop();
    const filename = `cuaderno_original_${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/aulas/${classroomId}/cuaderno-de-campo/${id}/${filename}`;

    // Actualizar sesión con la ruta del archivo
    await prisma.session.update({
      where: { id },
      data: { notebookFile: publicPath },
    });

    return NextResponse.json({
      filePath: publicPath,
      fileName: filename,
      fileSize: buffer.length,
    });
  } catch (error) {
    console.error('Error subiendo cuaderno:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
