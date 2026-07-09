'use client';
// ============================================
// Página de Sesiones de Aprendizaje
// ============================================
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SesionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [form, setForm] = useState({
    activityTitle: '', sessionDate: new Date().toISOString().split('T')[0],
    area: '', competency: '', standard: '', capacities: '', notebookId: '', criteria: ['']
  });

  const fetchData = async () => {
    const [sessRes, classRes] = await Promise.all([
      fetch('/api/sessions'),
      fetch('/api/classrooms'),
    ]);
    if (sessRes.ok) setSessions(await sessRes.json());
    if (classRes.ok) setClassrooms(await classRes.json());
    setLoading(false);
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') {
      setTimeout(() => {
        fetchData();
      }, 0);
    }
  }, [status]);

  const fetchNotebooks = async (classroomId) => {
    setSelectedClassroom(classroomId);
    const res = await fetch(`/api/notebooks?classroomId=${classroomId}`);
    if (res.ok) setNotebooks(await res.json());
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    const criteria = form.criteria.filter(c => c.trim().length > 0);
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, criteria }),
    });
    if (res.ok) {
      setShowModal(false);
      fetchData();
    }
    setSaving(false);
  };

  const activateSession = async (sessionId) => {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'activa' }),
    });
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="spinner spinner-lg"></div></div>;
  }

  const activeSessions = sessions.filter(s => s.status === 'activa');
  const otherSessions = sessions.filter(s => s.status !== 'activa');

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">📋 Sesiones de Aprendizaje</h1>
            <p className="page-subtitle">Gestiona y accede a tus sesiones del día</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" id="btn-new-session">
            + Nueva Sesión
          </button>
        </div>
      </div>

      {/* Sesiones activas */}
      {activeSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="card-title mb-4">🟢 Sesiones Activas</h2>
          <div className="grid-2">
            {activeSessions.map(s => (
              <Link key={s.id} href={`/sesion/${s.id}`} className="card card-clickable"
                style={{ borderLeft: '4px solid var(--success-500)' }}>
                <h3 className="card-title">{s.activityTitle}</h3>
                <p className="text-sm text-muted mt-2">{s.notebook?.classroom?.name} · {s.area}</p>
                <p className="text-sm mt-2"><strong>Competencia:</strong> {s.competency}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="badge badge-success">Activa · {s._count?.evidences || 0} evidencias</span>
                  <span className="text-xs text-muted">{new Date(s.sessionDate).toLocaleDateString('es-PE')}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Otras sesiones */}
      <h2 className="card-title mb-4">📅 Historial de Sesiones</h2>
      {otherSessions.length > 0 ? (
        <div className="flex flex-col gap-3">
          {otherSessions.map(s => (
            <div key={s.id} className="card">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div style={{ flex: 1 }}>
                  <h3 className="font-semibold">{s.activityTitle}</h3>
                  <p className="text-sm text-muted">{s.notebook?.classroom?.name} · {s.area} · {s.competency}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${s.status === 'preparada' ? 'badge-warning' : 'badge-primary'}`}>
                    {s.status === 'preparada' ? 'Preparada' : 'Cerrada'}
                  </span>
                  <span className="text-xs text-muted">{s._count?.evidences || 0} evidencias</span>
                  {s.status === 'preparada' && (
                    <button className="btn btn-success btn-sm" onClick={() => activateSession(s.id)}>
                      Activar
                    </button>
                  )}
                  <Link href={`/sesion/${s.id}`} className="btn btn-outline btn-sm">Ver</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h2 className="empty-state-title">Sin sesiones</h2>
          <p className="empty-state-description">Crea tu primera sesión para empezar</p>
        </div>
      )}

      {/* Modal crear sesión */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva Sesión de Aprendizaje</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label form-label-required">Aula</label>
                  <select className="form-select" value={selectedClassroom}
                    onChange={e => fetchNotebooks(e.target.value)} required>
                    <option value="">Seleccionar aula...</option>
                    {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} — {c.age}</option>)}
                  </select>
                </div>
                {selectedClassroom && (
                  <div className="form-group">
                    <label className="form-label form-label-required">Cuaderno de campo</label>
                    <select className="form-select" value={form.notebookId}
                      onChange={e => setForm({...form, notebookId: e.target.value})} required>
                      <option value="">Seleccionar cuaderno...</option>
                      {notebooks.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label form-label-required">Título de actividad</label>
                    <input className="form-input" placeholder="Ej: Cuidamos nuestra planta"
                      value={form.activityTitle} onChange={e => setForm({...form, activityTitle: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha</label>
                    <input type="date" className="form-input" value={form.sessionDate}
                      onChange={e => setForm({...form, sessionDate: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Área</label>
                    <input className="form-input" placeholder="Ej: Personal Social"
                      value={form.area} onChange={e => setForm({...form, area: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Competencia</label>
                    <input className="form-input" placeholder="Ej: Convive y participa..."
                      value={form.competency} onChange={e => setForm({...form, competency: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Estándar de aprendizaje</label>
                  <textarea className="form-textarea" rows={2} placeholder="Estándar..."
                    value={form.standard} onChange={e => setForm({...form, standard: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacidades (separadas por Enter)</label>
                  <textarea className="form-textarea" rows={2} placeholder="Una capacidad por línea"
                    value={form.capacities} onChange={e => setForm({...form, capacities: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Criterios de evaluación</label>
                  {form.criteria.map((c, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input className="form-input" placeholder={`Criterio ${i + 1}`} value={c}
                        onChange={e => {
                          const newCriteria = [...form.criteria];
                          newCriteria[i] = e.target.value;
                          setForm({...form, criteria: newCriteria});
                        }} />
                      {i > 0 && <button type="button" className="btn btn-ghost btn-icon-sm"
                        onClick={() => setForm({...form, criteria: form.criteria.filter((_, j) => j !== i)})}>✕</button>}
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => setForm({...form, criteria: [...form.criteria, '']})}>
                    + Agregar criterio
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} disabled={saving}>
                  {saving ? 'Creando...' : 'Crear Sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
