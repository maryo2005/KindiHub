// ============================================
// API: Subida de archivos (reorganizada por carpetas)
// POST /api/upload
// Estructura: /uploads/aulas/{classroomId}/evidencias/{studentId}/
// ============================================
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');
    const evidenceId = formData.get('evidenceId');
    const studentId = formData.get('studentId');
    const classroomId = formData.get('classroomId');
    const type = formData.get('type') || 'general'; // audio, foto, video, documento

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Convertir a Base64 para almacenar directamente en la base de datos
    // Esto soluciona el error ENOENT de Vercel (sistema de archivos de solo lectura)
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString('base64');
    const publicPath = `data:${file.type};base64,${base64Data}`;
    const filename = file.name || 'archivo_multimedia';

    // Si hay evidenceId, crear registro en BD
    if (evidenceId) {
      await prisma.evidenceFile.create({
        data: {
          evidenceId,
          filePath: publicPath,
          fileType: file.type,
          fileSize: buffer.length,
        },
      });
    }

    return NextResponse.json({
      filePath: publicPath,
      fileName: filename,
      fileSize: buffer.length,
      fileType: file.type,
    });
  } catch (error) {
    console.error('Error subiendo archivo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
