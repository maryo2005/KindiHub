'use client';
// ============================================
// Generación de Reportes con IA
// ============================================
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ReportesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [evidences, setEvidences] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [periodo, setPeriodo] = useState('Semana actual');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') fetchData();
  }, [status]);

  const fetchData = async () => {
    const res = await fetch('/api/classrooms');
    if (res.ok) {
      const data = await res.json();
      setClassrooms(data);
      if (data.length > 0) {
        setSelectedClassroom(data[0].id);
        await fetchStudents(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchStudents = async (classroomId) => {
    setSelectedClassroom(classroomId);
    const res = await fetch(`/api/students?classroomId=${classroomId}`);
    if (res.ok) setStudents(await res.json());
  };

  const fetchStudentEvidences = async (studentId) => {
    setSelectedStudent(studentId);
    setReport(null);
    const res = await fetch(`/api/evidence?studentId=${studentId}&status=confirmada`);
    if (res.ok) setEvidences(await res.json());
  };

  const generateReport = async () => {
    if (evidences.length === 0) {
      alert('Este estudiante no tiene evidencias confirmadas. Confirma evidencias primero.');
      return;
    }
    setGenerating(true);
    const student = students.find(s => s.id === selectedStudent);

    try {
      const res = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante: student?.fullName || '',
          periodo,
          evidencias: evidences.map(e => ({
            fecha: new Date(e.createdAt).toLocaleDateString('es-PE'),
            competencia: e.session?.competency || '',
            criterio: e.criteria?.description || '',
            nivel: e.level || '',
            descripcion: e.confirmedDescription || e.observation || '',
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        const err = await res.json();
        alert(err.error || 'Error al generar reporte');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al conectar con la IA. Verifica tu API key.');
    }
    setGenerating(false);
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    const student = students.find(s => s.id === selectedStudent);
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Reporte - ${student?.fullName}</title>
      <style>body{font-family:Inter,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#333}
      h1{color:#1a1d2e;border-bottom:2px solid #4c6ef5;padding-bottom:8px}
      h2{color:#4c6ef5;margin-top:24px}
      .info{background:#f8f9fc;padding:16px;border-radius:8px;margin:16px 0}
      .evidence{border-left:3px solid #4c6ef5;padding:8px 16px;margin:8px 0;background:#fafafa}
      .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600}
      .report-section{margin:16px 0;white-space:pre-line;line-height:1.8}
      @media print{body{padding:20px}}</style></head><body>
      <h1>📊 Reporte de Evaluación</h1>
      <div class="info">
        <strong>Estudiante:</strong> ${student?.fullName}<br>
        <strong>Aula:</strong> ${classrooms.find(c => c.id === selectedClassroom)?.name}<br>
        <strong>Periodo:</strong> ${periodo}<br>
        <strong>Fecha de generación:</strong> ${new Date().toLocaleDateString('es-PE')}<br>
        <strong>Evidencias base:</strong> ${evidences.length}
      </div>
      <h2>📝 Reporte generado</h2>
      <div class="report-section">${report?.report || ''}</div>
      <h2>📋 Evidencias confirmadas</h2>
      ${evidences.map(e => `
        <div class="evidence">
          <strong>${e.session?.activityTitle}</strong> — ${new Date(e.createdAt).toLocaleDateString('es-PE')}<br>
          <span class="badge">${e.level || ''}</span><br>
          ${e.confirmedDescription || e.observation || ''}
          ${e.confirmedFeedback ? `<br><em>Retroalimentación: ${e.confirmedFeedback}</em>` : ''}
        </div>
      `).join('')}
      <hr><p style="text-align:center;color:#888;font-size:12px">Generado por KindiHub — Plataforma de Evaluación para Educación Inicial</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="spinner spinner-lg"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📈 Generación de Reportes</h1>
        <p className="page-subtitle">Genera reportes individuales con IA a partir de evidencias confirmadas</p>
      </div>

      <div className="grid-2">
        {/* Configuración */}
        <div>
          <div className="card mb-4">
            <h3 className="card-title mb-4">⚙️ Configuración del Reporte</h3>
            <div className="form-group">
              <label className="form-label">Aula</label>
              <select className="form-select" value={selectedClassroom}
                onChange={e => fetchStudents(e.target.value)}>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estudiante</label>
              <select className="form-select" value={selectedStudent}
                onChange={e => fetchStudentEvidences(e.target.value)}>
                <option value="">Seleccionar estudiante...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Periodo</label>
              <select className="form-select" value={periodo} onChange={e => setPeriodo(e.target.value)}>
                <option>Semana actual</option>
                <option>Periodo 1</option>
                <option>Periodo 2</option>
                <option>Periodo 3</option>
                <option>Bimestre 1</option>
                <option>Bimestre 2</option>
                <option>Anual</option>
              </select>
            </div>

            {selectedStudent && (
              <div className="alert alert-info mb-4">
                <span className="alert-icon">📝</span>
                <span>{evidences.length} evidencias confirmadas disponibles</span>
              </div>
            )}

            <button className={`btn btn-accent btn-full btn-lg ${generating ? 'btn-loading' : ''}`}
              onClick={generateReport} disabled={generating || !selectedStudent}>
              {generating ? (
                <><span className="spinner spinner-sm"></span> Generando con IA...</>
              ) : (
                '🤖 Generar Reporte con IA'
              )}
            </button>
          </div>
        </div>

        {/* Vista previa del reporte */}
        <div>
          {report ? (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📊 Reporte Generado</h3>
                <button className="btn btn-primary btn-sm" onClick={printReport}>
                  🖨️ Imprimir / PDF
                </button>
              </div>
              <div className="ai-suggestion mb-4">
                <div className="ai-suggestion-header">
                  🤖 Reporte generado por IA
                  <span className="ai-suggestion-badge">GPT-4o mini</span>
                </div>
                <div className="ai-suggestion-content" style={{ whiteSpace: 'pre-line' }}>
                  {report.report}
                </div>
              </div>
              {report.tokensUsed > 0 && (
                <p className="text-xs text-muted">Tokens utilizados: {report.tokensUsed}</p>
              )}
            </div>
          ) : selectedStudent ? (
            <div className="card">
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="empty-state-icon">📈</div>
                <h3 className="empty-state-title">Listo para generar</h3>
                <p className="empty-state-description">Presiona el botón para generar el reporte con IA</p>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="empty-state-icon">📈</div>
                <h3 className="empty-state-title">Selecciona un estudiante</h3>
                <p className="empty-state-description">Elige un estudiante para generar su reporte</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
