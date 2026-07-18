// ============================================
// Utilidades para lectura y generación de .docx
// Usa mammoth para leer y docx para generar
// ============================================
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, BorderStyle, AlignmentType, HeadingLevel } from 'docx';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Extrae la estructura y contenido de un archivo Word (.docx)
 * Devuelve el texto plano y las tablas encontradas
 */
export async function extractNotebookStructure(filePath) {
  const absolutePath = path.join(process.cwd(), 'public', filePath);
  const buffer = await readFile(absolutePath);

  // Extraer HTML para analizar tablas
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const textResult = await mammoth.extractRawText({ buffer });

  // Parsear tablas del HTML
  const tables = parseTablesFromHtml(htmlResult.value);

  return {
    rawText: textResult.value,
    html: htmlResult.value,
    tables,
    warnings: htmlResult.messages,
  };
}

/**
 * Parsea tablas desde HTML generado por mammoth
 * Retorna un array de tablas, cada una con sus filas y columnas
 */
function parseTablesFromHtml(html) {
  const tables = [];
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHtml = tableMatch[1];
    const rows = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[1];
      const cells = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;

      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        // Limpiar HTML de la celda
        const cellText = cellMatch[1]
          .replace(/<[^>]+>/g, '') // Quitar tags HTML
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        cells.push(cellText);
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }
    if (rows.length > 0) {
      tables.push(rows);
    }
  }

  return tables;
}

/**
 * Genera un archivo Word (.docx) con el cuaderno de campo completado
 * @param {Object} sessionData - Datos de la sesión
 * @param {Object} aiData - Datos generados por la IA (tablas completadas)
 * @returns {Buffer} Buffer del archivo .docx generado
 */
export async function generateCompletedNotebook(sessionData, aiData) {
  const children = [];

  // Título del cuaderno
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'CUADERNO DE CAMPO', bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Info de la sesión
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Actividad: ${sessionData.activityTitle}`, bold: true, size: 24 })],
      spacing: { after: 100 },
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Fecha: ${new Date(sessionData.sessionDate).toLocaleDateString('es-PE')}`, size: 20 }),
        new TextRun({ text: `  |  Área: ${sessionData.area}`, size: 20 }),
      ],
      spacing: { after: 100 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Competencia: ${sessionData.competency}`, size: 20 })],
      spacing: { after: 100 },
    })
  );
  if (sessionData.standard) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Estándar: ${sessionData.standard}`, size: 20 })],
        spacing: { after: 100 },
      })
    );
  }

  children.push(
    new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 200 } })
  );

  // Tabla de evidencias por estudiante generada por IA
  if (aiData.studentEntries && aiData.studentEntries.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'REGISTRO DE EVIDENCIAS POR ESTUDIANTE', bold: true, size: 24 })],
        spacing: { after: 200 },
      })
    );

    // Crear tabla
    const headerRow = new TableRow({
      children: [
        createHeaderCell('N°'),
        createHeaderCell('Estudiante'),
        createHeaderCell('Nivel de Logro'),
        createHeaderCell('Evidencia / Observación'),
        createHeaderCell('Aspectos a Retroalimentar'),
      ],
    });

    const dataRows = aiData.studentEntries.map((entry, index) =>
      new TableRow({
        children: [
          createDataCell(String(index + 1)),
          createDataCell(entry.studentName),
          createDataCell(entry.level || '—'),
          createDataCell(entry.evidence || '—'),
          createDataCell(entry.feedback || '—'),
        ],
      })
    );

    const table = new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    children.push(table);
  }

  // Observaciones generales de la IA
  if (aiData.generalObservations) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 200 } })
    );
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'OBSERVACIONES GENERALES', bold: true, size: 24 })],
        spacing: { after: 100 },
      })
    );
    children.push(
      new Paragraph({
        children: [new TextRun({ text: aiData.generalObservations, size: 20 })],
        spacing: { after: 200 },
      })
    );
  }

  // Generar el documento
  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

// ---- Helpers para celdas de tabla ----
function createHeaderCell(text) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18, font: 'Arial' })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    shading: { fill: 'D9E2F3' },
  });
}

function createDataCell(text) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 18, font: 'Arial' })],
      }),
    ],
  });
}
