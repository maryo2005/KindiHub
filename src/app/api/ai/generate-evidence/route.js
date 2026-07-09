// ============================================
// API: IA - Generación de Evidencia (GPT-4o mini)
// POST /api/ai/generate-evidence
// Solo envía datos mínimos para ahorrar tokens
// ============================================
import { NextResponse } from 'next/server';
import { generateEvidence } from '@/lib/openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { estudiante, actividad, competencia, criterio, nivel, observacion } = body;

    if (!observacion) {
      return NextResponse.json({ error: 'La observación es requerida' }, { status: 400 });
    }

    const result = await generateEvidence({
      estudiante: estudiante || 'Estudiante',
      actividad: actividad || 'Actividad del día',
      competencia: competencia || '',
      criterio: criterio || '',
      nivel: nivel || 'Proceso',
      observacion,
    });

    return NextResponse.json({
      description: result.description,
      feedback: result.feedback,
      tokensUsed: result.usage?.total_tokens || 0,
    });
  } catch (error) {
    console.error('Error generando evidencia:', error);
    return NextResponse.json({ error: 'Error al generar evidencia: ' + error.message }, { status: 500 });
  }
}
