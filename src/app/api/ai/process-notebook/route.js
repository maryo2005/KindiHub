// ============================================
// API: Procesar cuaderno de campo con IA
// POST /api/ai/process-notebook
// ============================================
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processNotebookWithAI } from '@/lib/openai';
import { extractNotebookStructure, generateCompletedNotebook } from '@/lib/docx';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId es requerido' }, { status: 400 });
    }

    // Cargar datos de la sesión con evidencias
    const sessionData = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        criteria: true,
        notebook: {
          include: {
            classroom: {
              include: {
                students: { orderBy: { fullName: 'asc' } }
              }
            }
          }
        },
        evidences: {
          where: { status: 'confirmada' },
          include: {
            student: { select: { id: true, fullName: true } },
            criteria: { select: { description: true } },
            files: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!sessionData) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    if (sessionData.evidences.length === 0) {
      return NextResponse.json({ error: 'No hay evidencias confirmadas para procesar' }, { status: 400 });
    }

    // 1. Extraer estructura del cuaderno Word (si hay archivo subido)
    let notebookStructure = null;
    if (sessionData.notebookFile) {
      try {
        notebookStructure = await extractNotebookStructure(sessionData.notebookFile);
      } catch (err) {
        console.warn('No se pudo leer el archivo Word:', err.message);
        // Continuar sin estructura del cuaderno
      }
    }

    // 2. Agrupar evidencias por estudiante
    const studentMap = {};
    sessionData.evidences.forEach(ev => {
      const studentId = ev.student.id;
      if (!studentMap[studentId]) {
        studentMap[studentId] = {
          studentName: ev.student.fullName,
          evidences: [],
        };
      }
      studentMap[studentId].evidences.push({
        type: ev.type,
        level: ev.level,
        competency: ev.competency,
        observation: ev.observation,
        transcription: ev.transcription,
        criteria: ev.criteria?.description,
      });
    });
    const evidencesByStudent = Object.values(studentMap);

    // 3. Procesar con IA
    const aiResult = await processNotebookWithAI({
      sessionData: {
        activityTitle: sessionData.activityTitle,
        area: sessionData.area,
        competency: sessionData.competency,
        standard: sessionData.standard,
        capacities: sessionData.capacities,
      },
      notebookStructure,
      evidencesByStudent,
    });

    // 4. Generar archivo Word completado
    const docBuffer = await generateCompletedNotebook(sessionData, aiResult);

    // 5. Guardar archivo generado
    const classroomId = sessionData.notebook.classroom.id;
    const outputDir = path.join(
      process.cwd(), 'public', 'uploads', 'aulas',
      classroomId, 'cuaderno-de-campo', sessionId
    );
    await mkdir(outputDir, { recursive: true });

    const outputFilename = `cuaderno_generado_${Date.now()}.docx`;
    const outputPath = path.join(outputDir, outputFilename);
    await writeFile(outputPath, docBuffer);

    const publicPath = `/uploads/aulas/${classroomId}/cuaderno-de-campo/${sessionId}/${outputFilename}`;

    // 6. Actualizar sesión
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        generatedFile: publicPath,
        aiProcessedAt: new Date(),
        status: 'cerrada',
      },
    });

    return NextResponse.json({
      generatedFile: publicPath,
      aiResult: {
        studentEntries: aiResult.studentEntries,
        generalObservations: aiResult.generalObservations,
      },
      tokensUsed: aiResult.usage?.total_tokens || 0,
    });
  } catch (error) {
    console.error('Error procesando cuaderno:', error);
    return NextResponse.json({ error: 'Error al procesar: ' + error.message }, { status: 500 });
  }
}
