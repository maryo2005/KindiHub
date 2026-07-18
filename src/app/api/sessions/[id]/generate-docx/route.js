import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel } from 'docx';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;

    // Fetch session data and evidences
    const sessionData = await prisma.session.findUnique({
      where: { id },
      include: {
        notebook: {
          include: { classroom: true }
        },
        criteria: true,
        evidences: {
          include: { student: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!sessionData) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    if (!sessionData.evidences || sessionData.evidences.length === 0) {
      return NextResponse.json({ error: 'No hay evidencias para generar el cuaderno.' }, { status: 400 });
    }

    // Prepare Document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            text: "CUADERNO DE CAMPO - EDUCACIÓN INICIAL",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // General Info
          new Paragraph({
            children: [
              new TextRun({ text: "Aula: ", bold: true }),
              new TextRun(`${sessionData.notebook?.classroom?.name || 'N/A'}\n`),
              new TextRun({ text: "Fecha: ", bold: true }),
              new TextRun(`${new Date(sessionData.sessionDate).toLocaleDateString('es-PE')}\n`),
              new TextRun({ text: "Actividad: ", bold: true }),
              new TextRun(`${sessionData.activityTitle}\n`),
              new TextRun({ text: "Área: ", bold: true }),
              new TextRun(`${sessionData.area || 'N/A'}`),
            ],
            spacing: { after: 400 },
          }),

          // Competencies & Criteria
          new Paragraph({ text: "Marco Curricular", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "Competencia: ", bold: true }),
              new TextRun(`${sessionData.competency || 'No definida'}\n`),
              new TextRun({ text: "Estándar: ", bold: true }),
              new TextRun(`${sessionData.standard || 'No definido'}`),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({ text: "Criterios de Evaluación:", bold: true, spacing: { after: 100 } }),
          ...sessionData.criteria.map(c => new Paragraph({ text: `• ${c.description}`, spacing: { after: 100 } })),

          // Evidences Table
          new Paragraph({ text: "Evidencias Recolectadas", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header Row
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Estudiante", bold: true })], shading: { fill: "EEEEEE" } }),
                  new TableCell({ children: [new Paragraph({ text: "Observación / Evidencia", bold: true })], shading: { fill: "EEEEEE" } }),
                  new TableCell({ children: [new Paragraph({ text: "Nivel", bold: true })], shading: { fill: "EEEEEE" } }),
                  new TableCell({ children: [new Paragraph({ text: "Sugerencia de Mejora", bold: true })], shading: { fill: "EEEEEE" } }),
                ],
              }),
              // Data Rows
              ...sessionData.evidences.map(ev => {
                const observationText = ev.confirmedDescription || ev.aiDescription || ev.observation || 'Sin observación';
                const feedbackText = ev.confirmedFeedback || ev.aiFeedback || '-';
                const levelText = ev.level ? ev.level.toUpperCase() : 'NO EVALUADO';

                return new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(ev.student?.fullName || 'Desconocido')] }),
                    new TableCell({ children: [new Paragraph(observationText)] }),
                    new TableCell({ children: [new Paragraph(levelText)] }),
                    new TableCell({ children: [new Paragraph(feedbackText)] }),
                  ],
                });
              })
            ],
          }),
        ],
      }],
    });

    // Generate Buffer
    const buffer = await Packer.toBuffer(doc);

    // Return as downloadable file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Cuaderno_de_Campo_${sessionData.activityTitle}.docx"`,
      },
    });

  } catch (error) {
    console.error('Error al generar DOCX:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
