'use client';
// ============================================
// Cuadernos de Campo - Lista de Sesiones
// ============================================
import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CuadernoSesionesPage({ params }) {
  const { id } = use(params);
  const { data: authSession, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    activityTitle: '',
    sessionDate: new Date().toISOString().split('T')[0],
    area: '',
  });

  const fetchData = async () => {
    try {
      const [sessRes, clRes] = await Promise.all([
        fetch(`/api/sessions?classroomId=${id}`),
        fetch('/api/classrooms'),
      ]);
      if (sessRes.ok) setSessions(await sessRes.json());
      if (clRes.ok) {
        const classrooms = await clRes.json();
        setClassroom(classrooms.find(c => c.id === id));
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') {
      setTimeout(() => {
        fetchData();
      }, 0);
    }
  }, [status, id]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Obtener cuadernos de este aula
      let notebookId = null;
      const nbRes = await fetch(`/api/notebooks?classroomId=${id}`);
      if (nbRes.ok) {
        const notebooks = await nbRes.json();
        if (notebooks.length > 0) {
          notebookId = notebooks[0].id;
        }
      }

      // 2. Si no hay cuaderno, crearlo
      if (!notebookId) {
        const createNbRes = await fetch('/api/notebooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Cuaderno de Campo - ${classroom?.name}`,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            classroomId: id
          }),
        });
        if (createNbRes.ok) {
          const newNb = await createNbRes.json();
          notebookId = newNb.id;
        }
      }

      // 3. Crear la sesión
      if (notebookId) {
        const sessRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            notebookId
          }),
        });
        
        if (sessRes.ok) {
          setShowModal(false);
          setForm({
            activityTitle: '',
            sessionDate: new Date().toISOString().split('T')[0],
            area: '',
          });
          fetchData(); // Recargar la lista
        } else {
          alert('Error al crear la sesión');
        }
      }
    } catch (error) {
      console.error(error);
      alert('Error inesperado al crear la sesión');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="spinner spinner-lg"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-breadcrumb">
          <Link href="/aulas">Aulas</Link>
          <span className="page-breadcrumb-separator">›</span>
          <Link href={`/aulas/${id}`}>{classroom?.name || 'Aula'}</Link>
          <span className="page-breadcrumb-separator">›</span>
          <span>Cuadernos de Campo</span>
        </div>
        <div className="page-header-top">
          <div>
            <h1 className="page-title">📓 Cuadernos de Campo</h1>
            <p className="page-subtitle">Sesiones de aprendizaje — {classroom?.name}</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            + Nueva Sesión
          </button>
        </div>
      </div>

      {sessions.length > 0 ? (
        <div className="flex flex-col gap-3 mt-4">
          {sessions.map(s => (
            <Link key={s.id} href={`/aulas/${id}/cuadernos/${s.id}`} className="card card-clickable">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="card-title text-lg">📋 {s.activityTitle}</h3>
                  <p className="text-sm text-muted mt-1">
                    {new Date(s.sessionDate).toLocaleDateString('es-PE')} · Área: {s.area}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`badge badge-status-${s.status}`}>{s.status}</span>
                  <div className="text-xs text-muted mt-2">{s._count?.evidences || 0} evidencias</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h2 className="empty-state-title">Sin sesiones</h2>
          <p className="empty-state-description">Aún no hay sesiones registradas en este cuaderno de campo</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva Sesión de Aprendizaje</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSession}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label form-label-required">Título / Actividad de la Sesión</label>
                  <input className="form-input" placeholder="Ej. Explorando los colores de la naturaleza"
                    value={form.activityTitle} onChange={e => setForm(prev => ({ ...prev, activityTitle: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-required">Fecha</label>
                  <input type="date" className="form-input" 
                    value={form.sessionDate} onChange={e => setForm(prev => ({ ...prev, sessionDate: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Área Curricular</label>
                  <select className="form-select" value={form.area} onChange={e => setForm(prev => ({ ...prev, area: e.target.value }))}>
                    <option value="">Seleccionar área...</option>
                    <option value="Comunicación">Comunicación</option>
                    <option value="Matemática">Matemática</option>
                    <option value="Personal Social">Personal Social</option>
                    <option value="Ciencia y Tecnología">Ciencia y Tecnología</option>
                    <option value="Psicomotricidad">Psicomotricidad</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} disabled={saving}>
                  {saving ? 'Guardando...' : 'Crear Sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
