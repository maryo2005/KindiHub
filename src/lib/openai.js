// ============================================
// OpenAI Client + Prompts optimizados
// ============================================
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---- PROMPT OPTIMIZADO PARA AHORRO DE TOKENS ----
// Solo envía datos mínimos: estudiante, actividad, competencia, criterio, nivel, observación

/**
 * Genera descripción de evidencia y retroalimentación
 * Envía SOLO los datos mínimos necesarios al LLM
 */
export async function generateEvidence({ estudiante, actividad, competencia, criterio, nivel, observacion }) {
  const prompt = `Eres asistente pedagógico para Educación Inicial.
Con base en la observación, genera:
1. Descripción de evidencia: máximo 60 palabras.
2. Aspectos a retroalimentar: máximo 40 palabras.
No inventes datos. Usa lenguaje docente claro.

Datos:
Estudiante: ${estudiante}
Actividad: ${actividad}
Competencia: ${competencia}
Criterio: ${criterio}
Nivel observado: ${nivel}
Observación: ${observacion}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 250,
    temperature: 0.3,
  });

  const response = completion.choices[0].message.content;
  
  // Parsear la respuesta para separar descripción y retroalimentación
  const parts = parseAIResponse(response);
  
  return {
    description: parts.description,
    feedback: parts.feedback,
    rawResponse: response,
    usage: completion.usage,
  };
}

/**
 * Genera reporte semanal o por periodo
 * Solo envía evidencias confirmadas, sin historial completo
 */
export async function generateReport({ estudiante, periodo, evidencias }) {
  // Preparar evidencias como texto compacto
  const evidenciasTexto = evidencias.map((e, i) => 
    `${i + 1}. ${e.fecha} | ${e.competencia} | ${e.criterio} | Nivel: ${e.nivel} | ${e.descripcion}`
  ).join('\n');

  const prompt = `Eres asistente pedagógico. Genera un reporte de evaluación.

Estudiante: ${estudiante}
Periodo: ${periodo}
Evidencias confirmadas:
${evidenciasTexto}

Genera:
1. Resumen del avance (máximo 80 palabras)
2. Competencias destacadas (máximo 40 palabras)
3. Dificultades observadas (máximo 40 palabras)
4. Recomendaciones para próximas sesiones (máximo 50 palabras)

No inventes datos. Basa todo en las evidencias proporcionadas.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
    temperature: 0.3,
  });

  return {
    report: completion.choices[0].message.content,
    usage: completion.usage,
  };
}

/**
 * Transcribe audio usando Whisper
 */
export async function transcribeAudio(audioBuffer, filename = 'audio.webm') {
  const file = new File([audioBuffer], filename, { type: 'audio/webm' });
  
  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: 'whisper-1',
    language: 'es',
  });

  return {
    text: transcription.text,
  };
}

/**
 * Sugiere criterio de evaluación basado en la observación
 */
export async function suggestCriteria({ observacion, criteriosDisponibles }) {
  const prompt = `Eres asistente pedagógico. Dada la observación, indica cuál criterio es más relevante. Responde SOLO con el número del criterio.

Observación: ${observacion}

Criterios:
${criteriosDisponibles.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 10,
    temperature: 0.1,
  });

  return {
    suggestedIndex: parseInt(completion.choices[0].message.content.trim()) - 1,
    usage: completion.usage,
  };
}

// ---- Utilidad: Parsear respuesta de IA ----
function parseAIResponse(text) {
  let description = '';
  let feedback = '';

  // Intentar separar por numeración
  const descMatch = text.match(/1\.\s*(?:Descripción de evidencia:?\s*)?(.+?)(?=2\.|$)/s);
  const feedMatch = text.match(/2\.\s*(?:Aspectos a retroalimentar:?\s*)?(.+?)$/s);

  if (descMatch) description = descMatch[1].trim();
  if (feedMatch) feedback = feedMatch[1].trim();

  // Si no se pudieron separar, usar todo como descripción
  if (!description && !feedback) {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length >= 2) {
      description = lines.slice(0, Math.ceil(lines.length / 2)).join(' ').trim();
      feedback = lines.slice(Math.ceil(lines.length / 2)).join(' ').trim();
    } else {
      description = text.trim();
      feedback = '';
    }
  }

  return { description, feedback };
}

export default openai;
