'use client';
// ============================================
// Portafolios por Aula
// ============================================
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PortafolioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStudents = async (classroomId) => {
    setSelectedClassroom(classroomId);
    const res = await fetch(`/api/students?classroomId=${classroomId}`);
    if (res.ok) setStudents(await res.json());
  };

  const fetchClassrooms = async () => {
    const res = await fetch('/api/classrooms');
    if (res.ok) {
      const data = await res.json();
      setClassrooms(data);
      if (data.length > 0) {
        setSelectedClassroom(data[0].id);
        fetchStudents(data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') {
      setTimeout(() => {
        fetchClassrooms();
      }, 0);
    }
  }, [status]);

  if (loading) {
    return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="spinner spinner-lg"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📂 Portafolios de Evidencias</h1>
        <p className="page-subtitle">Accede al portafolio individual de cada estudiante</p>
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

      {students.length > 0 ? (
        <div className="grid-3">
          {students.map(s => (
            <Link key={s.id} href={`/portafolio/${s.id}`} className="card card-clickable">
              <div className="flex items-center gap-4">
                <div className="student-chip-avatar" style={{ width: 52, height: 52, fontSize: 'var(--text-base)' }}>
                  {s.fullName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="font-semibold">{s.fullName}</div>
                  <div className="text-sm text-muted">{s._count?.evidences || 0} evidencias registradas</div>
                  <div className="progress-bar mt-2" style={{ width: 120 }}>
                    <div className="progress-bar-fill progress-bar-fill-primary"
                      style={{ width: `${Math.min(((s._count?.evidences || 0) / 10) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <h2 className="empty-state-title">Sin estudiantes</h2>
          <p className="empty-state-description">Agrega estudiantes a tus aulas para ver sus portafolios</p>
        </div>
      )}
    </div>
  );
}
