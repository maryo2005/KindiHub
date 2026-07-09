'use client';
// ============================================
// Seguimiento del Progreso Individual
// ============================================
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SeguimientoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [evidences, setEvidences] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') fetchData();
  }, [status]);

  const fetchData = async () => {
    const [clRes, evRes] = await Promise.all([
      fetch('/api/classrooms'),
      fetch('/api/evidence'),
    ]);
    if (clRes.ok) {
      const data = await clRes.json();
      setClassrooms(data);
      if (data.length > 0) {
        setSelectedClassroom(data[0].id);
        fetchStudents(data[0].id);
      }
    }
    if (evRes.ok) setEvidences(await evRes.json());
    setLoading(false);
  };

  const fetchStudents = async (classroomId) => {
    setSelectedClassroom(classroomId);
    const res = await fetch(`/api/students?classroomId=${classroomId}`);
    if (res.ok) setStudents(await res.json());
  };

  if (loading) {
    return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="spinner spinner-lg"></div></div>;
  }

  // Calcular progreso por estudiante
  const studentProgress = students.map(s => {
    const studentEvs = evidences.filter(e => e.studentId === s.id);
    const confirmed = studentEvs.filter(e => e.status === 'confirmada');
    const levels = { inicio: 0, proceso: 0, logrado: 0, requiere_apoyo: 0 };
    studentEvs.forEach(e => { if (e.level) levels[e.level]++; });
    
    const competencies = {};
    studentEvs.forEach(e => {
      const comp = e.session?.competency;
      if (comp) {
        if (!competencies[comp]) competencies[comp] = { count: 0, lastLevel: '' };
        competencies[comp].count++;
        competencies[comp].lastLevel = e.level || '';
      }
    });

    const lastEvidence = studentEvs[0];
    const total = studentEvs.length;
    const dominantLevel = Object.entries(levels).sort((a, b) => b[1] - a[1])[0];

    return {
      ...s,
      total,
      confirmed: confirmed.length,
      levels,
      competencies,
      lastEvidence,
      dominantLevel: dominantLevel?.[1] > 0 ? dominantLevel[0] : null,
    };
  }).sort((a, b) => b.total - a.total);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 Seguimiento del Progreso</h1>
        <p className="page-subtitle">Visualiza el avance de cada estudiante por competencia</p>
      </div>

      {classrooms.length > 0 && (
        <div className="tabs mb-6">
          {classrooms.map(c => (
            <div key={c.id} className={`tab ${selectedClassroom === c.id ? 'active' : ''}`}
              onClick={() => fetchStudents(c.id)}>
              {c.name}
            </div>
          ))}
        </div>
      )}

      {/* Vista general del aula */}
      <div className="stats-grid mb-8">
        <div className="stat-card">
          <div className="stat-icon card-icon-primary">👧</div>
          <div>
            <div className="stat-value">{students.length}</div>
            <div className="stat-label">Estudiantes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon card-icon-success">📝</div>
          <div>
            <div className="stat-value">{studentProgress.reduce((sum, s) => sum + s.total, 0)}</div>
            <div className="stat-label">Total evidencias</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon card-icon-warning">⏳</div>
          <div>
            <div className="stat-value">{studentProgress.filter(s => s.total === 0).length}</div>
            <div className="stat-label">Sin evidencia</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon card-icon-accent">✅</div>
          <div>
            <div className="stat-value">{studentProgress.reduce((sum, s) => sum + s.confirmed, 0)}</div>
            <div className="stat-label">Confirmadas</div>
          </div>
        </div>
      </div>

      {/* Tabla de progreso */}
      {studentProgress.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Evidencias</th>
                <th>Inicio</th>
                <th>Proceso</th>
                <th>Logrado</th>
                <th className="hide-mobile">Nivel dominante</th>
                <th className="hide-mobile">Última evidencia</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {studentProgress.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="student-chip-avatar" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>
                        {s.fullName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <span className="font-semibold text-sm">{s.fullName}</span>
                    </div>
                  </td>
                  <td><strong>{s.total}</strong></td>
                  <td>
                    <span style={{ color: 'var(--level-inicio)', fontWeight: 700 }}>{s.levels.inicio}</span>
                  </td>
                  <td>
                    <span style={{ color: '#e8590c', fontWeight: 700 }}>{s.levels.proceso}</span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--level-logrado)', fontWeight: 700 }}>{s.levels.logrado}</span>
                  </td>
                  <td className="hide-mobile">
                    {s.dominantLevel && (
                      <span className={`badge badge-${s.dominantLevel === 'logrado' ? 'success' : s.dominantLevel === 'proceso' ? 'warning' : s.dominantLevel === 'inicio' ? 'error' : 'purple'}`}>
                        {s.dominantLevel === 'inicio' ? 'Inicio' : s.dominantLevel === 'proceso' ? 'Proceso' : s.dominantLevel === 'logrado' ? 'Logrado' : 'Req. apoyo'}
                      </span>
                    )}
                  </td>
                  <td className="hide-mobile text-xs text-muted">
                    {s.lastEvidence ? new Date(s.lastEvidence.createdAt).toLocaleDateString('es-PE') : 'Sin evidencia'}
                  </td>
                  <td>
                    <Link href={`/portafolio/${s.id}`} className="btn btn-outline btn-sm">Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h2 className="empty-state-title">Sin datos de seguimiento</h2>
          <p className="empty-state-description">Registra evidencias para ver el progreso de los estudiantes</p>
        </div>
      )}

      {/* Alertas */}
      {studentProgress.filter(s => s.total === 0).length > 0 && (
        <div className="alert alert-warning mt-6">
          <span className="alert-icon">⚠️</span>
          <div>
            <strong>Estudiantes sin evidencia:</strong>
            <div className="text-sm mt-1">
              {studentProgress.filter(s => s.total === 0).map(s => s.fullName).join(', ')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
