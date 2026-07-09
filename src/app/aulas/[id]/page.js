'use client';
// ============================================
// Detalle de Aula - Gestión de Estudiantes
// ============================================
import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AulaDetailPage({ params }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkNames, setBulkNames] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') fetchData();
  }, [status]);

  const fetchData = async () => {
    const [studentsRes, classroomsRes] = await Promise.all([
      fetch(`/api/students?classroomId=${id}`),
      fetch('/api/classrooms'),
    ]);
    if (studentsRes.ok) setStudents(await studentsRes.json());
    if (classroomsRes.ok) {
      const classrooms = await classroomsRes.json();
      setClassroom(classrooms.find(c => c.id === id));
    }
    setLoading(false);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    if (bulkMode) {
      const names = bulkNames.split('\n').map(n => n.trim()).filter(n => n.length > 0);
      for (const name of names) {
        await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName: name, classroomId: id }),
        });
      }
    } else {
      await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: newName, classroomId: id }),
      });
    }
    
    setNewName('');
    setBulkNames('');
    setShowModal(false);
    fetchData();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-breadcrumb">
          <Link href="/aulas">Aulas</Link>
          <span className="page-breadcrumb-separator">›</span>
          <span>{classroom?.name || 'Aula'}</span>
        </div>
        <div className="page-header-top">
          <div>
            <h1 className="page-title">👧 Estudiantes — {classroom?.name}</h1>
            <p className="page-subtitle">{classroom?.age} · Sección {classroom?.section} · {students.length} estudiantes</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" id="btn-add-student">
            + Agregar Estudiante
          </button>
        </div>
      </div>

      {students.length > 0 ? (
        <div className="grid-3">
          {students.map(s => (
            <Link key={s.id} href={`/portafolio/${s.id}`} className="card card-clickable">
              <div className="flex items-center gap-3">
                <div className="student-chip-avatar" style={{ width: 44, height: 44 }}>
                  {s.fullName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="font-semibold">{s.fullName}</div>
                  <div className="text-xs text-muted">{s._count?.evidences || 0} evidencias</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">👧</div>
          <h2 className="empty-state-title">Sin estudiantes</h2>
          <p className="empty-state-description">Agrega estudiantes a esta aula para poder registrar evidencias</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">+ Agregar Estudiantes</button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Agregar Estudiante(s)</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="modal-body">
                <div className="flex gap-2 mb-4">
                  <button type="button" className={`btn btn-sm ${!bulkMode ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setBulkMode(false)}>Individual</button>
                  <button type="button" className={`btn btn-sm ${bulkMode ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setBulkMode(true)}>Masivo</button>
                </div>
                {bulkMode ? (
                  <div className="form-group">
                    <label className="form-label">Nombres (uno por línea)</label>
                    <textarea className="form-textarea" rows={8}
                      placeholder="Gabriel Mendoza&#10;María Fernanda López&#10;Jesús Alejandro Torres"
                      value={bulkNames} onChange={e => setBulkNames(e.target.value)} required />
                    <span className="form-hint">{bulkNames.split('\n').filter(n => n.trim()).length} estudiantes</span>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label form-label-required">Nombre completo</label>
                    <input className="form-input" placeholder="Nombre del estudiante"
                      value={newName} onChange={e => setNewName(e.target.value)} required id="input-student-name" />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} disabled={saving}>
                  {saving ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
