// ============================================
// API: Extraer metadatos de la plantilla subida
// POST /api/ai/extract-fields
// ============================================
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractFieldsFromTemplate } from '@/lib/openai';
import { extractNotebookStructure } from '@/lib/docx';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId es requerido' }, { status: 400 });
    }

    // Cargar datos de la sesión
    const sessionData = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!sessionData) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    if (!sessionData.notebookFile) {
      return NextResponse.json({ error: 'La sesión no tiene un archivo de plantilla (.doc) subido' }, { status: 400 });
    }

    // 1. Extraer texto del documento
    let rawText = '';
    try {
      const structure = await extractNotebookStructure(sessionData.notebookFile);
      rawText = structure.rawText;
    } catch (err) {
      console.error('Error extrayendo texto del documento:', err);
      return NextResponse.json({ error: 'No se pudo leer el archivo Word: ' + err.message }, { status: 500 });
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'El documento está vacío o no se pudo extraer texto legible' }, { status: 400 });
    }

    // 2. Usar IA para extraer campos
    const aiFields = await extractFieldsFromTemplate(rawText);

    // 3. Actualizar la sesión en la base de datos
    // Primero, preparamos los criterios para insertarlos
    const criteriaCreates = Array.isArray(aiFields.criteria) 
      ? aiFields.criteria.filter(c => c.trim().length > 0).map(c => ({ description: c }))
      : [];

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        competency: aiFields.competency || sessionData.competency,
        standard: aiFields.standard || sessionData.standard,
        capacities: aiFields.capacities || sessionData.capacities,
        // Limpiamos los criterios anteriores y creamos los nuevos
        criteria: {
          deleteMany: {}, // Borra criterios previos si existían
          create: criteriaCreates
        }
      },
      include: {
        criteria: true
      }
    });

    return NextResponse.json({
      success: true,
      extractedFields: {
        competency: updatedSession.competency,
        standard: updatedSession.standard,
        capacities: updatedSession.capacities,
        criteria: updatedSession.criteria
      }
    });

  } catch (error) {
    console.error('Error extrayendo campos con IA:', error);
    return NextResponse.json({ error: 'Error interno: ' + error.message }, { status: 500 });
  }
}
