// ============================================
// API: IA - Generación de Reportes (GPT-4o mini)
// POST /api/ai/generate-report
// ============================================
import { NextResponse } from 'next/server';
import { generateReport } from '@/lib/openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { estudiante, periodo, evidencias } = body;

    if (!evidencias || evidencias.length === 0) {
      return NextResponse.json({ error: 'Se necesitan evidencias confirmadas para generar el reporte' }, { status: 400 });
    }

    const result = await generateReport({
      estudiante: estudiante || 'Estudiante',
      periodo: periodo || 'Periodo actual',
      evidencias,
    });

    return NextResponse.json({
      report: result.report,
      tokensUsed: result.usage?.total_tokens || 0,
    });
  } catch (error) {
    console.error('Error generando reporte:', error);
    return NextResponse.json({ error: 'Error al generar reporte: ' + error.message }, { status: 500 });
  }
}
