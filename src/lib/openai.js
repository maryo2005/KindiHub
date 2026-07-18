import OpenAI from 'openai';

const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || 'temporary_key_for_build';
const isGroq = apiKey.startsWith('gsk_') || !!process.env.GROQ_API_KEY;

const openai = new OpenAI({
  apiKey,
  baseURL: isGroq ? 'https://api.groq.com/openai/v1' : undefined,
});

// ---- PROMPT OPTIMIZADO PARA AHORRO DE TOKENS ----

/**
 * Procesa un cuaderno de campo completo con IA
 * Recibe la estructura del cuaderno y todas las evidencias de la sesión
 * Devuelve los datos para completar las tablas del cuaderno
 */
export async function processNotebookWithAI({ sessionData, notebookStructure, evidencesByStudent }) {
  // Construir resumen de evidencias por estudiante
  const evidenciasSummary = evidencesByStudent.map(({ studentName, evidences }) => {
    const evText = evidences.map(e => {
      let desc = '';
      if (e.type === 'audio' && e.transcription) desc = `[Audio transcrito]: ${e.transcription}`;
      else if (e.type === 'marcacion') desc = `[Marcación rápida]: Nivel ${e.level || 'no especificado'}`;
      else desc = `[${e.type}]: ${e.observation || 'Sin observación'}`;
      if (e.level) desc += ` | Nivel: ${e.level}`;
      if (e.competency) desc += ` | Competencia: ${e.competency}`;
      return desc;
    }).join('\n    ');
    return `  ${studentName}:\n    ${evText}`;
  }).join('\n');

  // Estructura del cuaderno (tablas)
  let notebookContext = '';
  if (notebookStructure?.tables?.length > 0) {
    notebookContext = `\nEstructura del cuaderno de campo (tablas encontradas):\n`;
    notebookStructure.tables.forEach((table, i) => {
      notebookContext += `Tabla ${i + 1}:\n`;
      table.forEach(row => {
        notebookContext += `  | ${row.join(' | ')} |\n`;
      });
    });
  } else if (notebookStructure?.rawText) {
    notebookContext = `\nContenido del cuaderno de campo:\n${notebookStructure.rawText.substring(0, 2000)}`;
  }

  const prompt = `Eres un asistente pedagógico experto en Educación Inicial en Perú.

Tu tarea es completar el cuaderno de campo de una sesión de aprendizaje basándote en las evidencias registradas por la docente.

DATOS DE LA SESIÓN:
- Actividad: ${sessionData.activityTitle}
- Área: ${sessionData.area}
- Competencia: ${sessionData.competency}
${sessionData.standard ? `- Estándar: ${sessionData.standard}` : ''}
${sessionData.capacities ? `- Capacidades: ${sessionData.capacities}` : ''}
${notebookContext}

EVIDENCIAS REGISTRADAS POR ESTUDIANTE:
${evidenciasSummary}

INSTRUCCIONES:
1. Para CADA estudiante con evidencias, genera:
   - "evidence": Una descripción pedagógica clara y profesional de la evidencia observada (máximo 60 palabras)
   - "feedback": Aspectos específicos a retroalimentar para este estudiante (máximo 40 palabras)
   - "level": El nivel de logro consolidado (inicio, proceso, logrado, o requiere_apoyo)

2. Genera "generalObservations": Observaciones generales de la sesión (máximo 80 palabras)

3. Basa TODO en las evidencias proporcionadas. NO inventes datos.
4. Usa lenguaje docente profesional y claro.

RESPONDE EN JSON EXACTAMENTE con este formato:
{
  "studentEntries": [
    {
      "studentName": "nombre del estudiante",
      "level": "nivel de logro",
      "evidence": "descripción de evidencia",
      "feedback": "aspectos a retroalimentar"
    }
  ],
  "generalObservations": "observaciones generales de la sesión"
}`;

  const completion = await openai.chat.completions.create({
    model: isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const responseText = completion.choices[0].message.content;

  try {
    const parsed = JSON.parse(responseText);
    return {
      ...parsed,
      usage: completion.usage,
    };
  } catch (e) {
    // Si falla el parseo JSON, intentar extraerlo
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return {
        ...JSON.parse(jsonMatch[0]),
        usage: completion.usage,
      };
    }
    throw new Error('No se pudo parsear la respuesta de la IA');
  }
}

/**
 * Genera descripción de evidencia individual (simplificada)
 */
export async function generateEvidenceDescription({ estudiante, actividad, competencia, nivel, observacion }) {
  const prompt = `Eres asistente pedagógico para Educación Inicial.
Con base en la observación, genera una descripción de evidencia pedagógica clara. Máximo 60 palabras.
No inventes datos. Usa lenguaje docente claro.

Datos:
Estudiante: ${estudiante}
Actividad: ${actividad}
Competencia: ${competencia}
Nivel observado: ${nivel}
Observación: ${observacion}`;

  const completion = await openai.chat.completions.create({
    model: isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 150,
    temperature: 0.3,
  });

  return {
    description: completion.choices[0].message.content.trim(),
    usage: completion.usage,
  };
}

import { toFile } from 'openai';

/**
 * Transcribe audio usando Whisper
 */
export async function transcribeAudio(audioBuffer, filename = 'audio.webm') {
  const file = await toFile(audioBuffer, filename, { type: 'audio/webm' });

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: isGroq ? 'whisper-large-v3' : 'whisper-1',
    language: 'es',
  });

  return {
    text: transcription.text,
  };
}

/**
 * Extrae campos pedagógicos (competencia, estándar, capacidades, criterios)
 * desde el texto de una plantilla de cuaderno de campo subida por el docente.
 */
export async function extractFieldsFromTemplate(rawText) {
  const prompt = `Eres un asistente pedagógico experto en Educación Inicial en Perú.
Tu tarea es leer el contenido de una plantilla de sesión o cuaderno de campo y extraer de manera precisa los siguientes datos pedagógicos.

CONTENIDO DE LA PLANTILLA:
${rawText.substring(0, 4000)}

INSTRUCCIONES:
Extrae exactamente lo que dice el documento para los siguientes campos:
1. "competency": La competencia a evaluar.
2. "standard": El estándar de aprendizaje (si está presente, de lo contrario vacío).
3. "capacities": Las capacidades asociadas (separadas por comas, si existen, de lo contrario vacío).
4. "criteria": Una lista (array de strings) con los criterios de evaluación literales que encuentres.

RESPONDE EN JSON EXACTAMENTE con este formato:
{
  "competency": "Competencia encontrada",
  "standard": "Estándar encontrado o vacío",
  "capacities": "Capacidad 1, Capacidad 2 o vacío",
  "criteria": [
    "Criterio 1",
    "Criterio 2"
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  const responseText = completion.choices[0].message.content;

  try {
    const parsed = JSON.parse(responseText);
    return {
      ...parsed,
      usage: completion.usage,
    };
  } catch (e) {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return {
        ...JSON.parse(jsonMatch[0]),
        usage: completion.usage,
      };
    }
    throw new Error('No se pudo parsear la respuesta de la IA (Extracción de campos)');
  }
}

export default openai;
