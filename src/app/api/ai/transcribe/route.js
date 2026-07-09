// ============================================
// API: IA - Transcripción de Audio (Whisper)
// POST /api/ai/transcribe
// ============================================
import { NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      return NextResponse.json({ error: 'No se proporcionó archivo de audio' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const result = await transcribeAudio(buffer, audioFile.name || 'audio.webm');

    return NextResponse.json({
      transcription: result.text,
    });
  } catch (error) {
    console.error('Error en transcripción:', error);
    return NextResponse.json({ error: 'Error al transcribir audio: ' + error.message }, { status: 500 });
  }
}
