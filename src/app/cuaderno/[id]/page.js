'use client';
// ============================================
// Detalle del Cuaderno de Campo
// Muestra sesiones vinculadas, info del cuaderno
// ============================================
import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CuadernoDetailPage({ params }) {
  const { id } = use(params);
  const { data: authSession, status } = useSession();
  const router = useRouter();
  const [notebook, setNotebook] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    activityTitle: '', sessionDate: new Date().toISOString().split('T')[0],
    area: '', competency: '', standard: '', capacities: '', criteria: ['']
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') fetchData();
  }, [status]);

  const fetchData = async () => {
    try {
      const [nbRes, sessRes] = await Promise.all([
        fetch('/api/notebooks'),
        fetch(`/api/sessions?notebookId=${id}`),
      ]);
      if (nbRes.ok) {
        const notebooks = await nbRes.json();
        const found = notebooks.find(n => n.id === id);
        setNotebook(found || null);
      }
      if (sessRes.ok) setSessions(await sessRes.json());
    } catch (err) {
      console.error('Error cargando cuaderno:', err);
    }
    setLoading(false);
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSaving(true);
    const criteria = form.criteria.filter(c => c.trim().length > 0);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, notebookId: id, criteria }),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({
          activityTitle: '', sessionDate: new Date().toISOString().split('T')[0],
          area: '', competency: '', standard: '', capacities: '', criteria: ['']
        });
        fetchData();
      }
    } catch (err) {
      console.error('Error creando sesión:', err);
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

  const handleDeleteNotebook = async (e) => {
    e.preventDefault();
    if (deleteConfirmText !== 'eliminar') {
      alert('Debes escribir "eliminar" para poder proceder con la eliminación.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/notebooks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowDeleteModal(false);
        router.push('/cuaderno');
      } else {
        alert('Error al intentar eliminar el cuaderno de campo.');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error inesperado al eliminar.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📓</div>
        <h2 className="empty-state-title">Cuaderno no encontrado</h2>
        <Link href="/cuaderno" className="btn btn-primary mt-4">Volver a Cuadernos</Link>
      </div>
    );
  }

  const activeSessions = sessions.filter(s => s.status === 'activa');
  const otherSessions = sessions.filter(s => s.status !== 'activa');

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-breadcrumb">
          <Link href="/cuaderno">Cuadernos de Campo</Link>
          <span className="page-breadcrumb-separator">›</span>
          <span>{notebook.title}</span>
        </div>
        <div className="page-header-top">
          <div>
            <h1 className="page-title">📓 {notebook.title}</h1>
            <p className="page-subtitle">
              {notebook.classroom?.name} · Creado el {new Date(notebook.createdAt).toLocaleDateString('es-PE')}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setDeleteConfirmText(''); setShowDeleteModal(true); }} className="btn btn-outline" style={{ borderColor: 'var(--error-500)', color: 'var(--error-500)' }} id="btn-delete-notebook">
              🗑️ Eliminar Cuaderno
            </button>
            <button onClick={() => setShowModal(true)} className="btn btn-primary" id="btn-new-session-from-notebook">
              + Nueva Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Info del cuaderno */}
      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, var(--primary-50), var(--accent-50))' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="card-icon card-icon-accent" style={{ width: 56, height: 56, fontSize: '1.5rem' }}>📓</div>
            <div>
              <div className="text-sm"><strong>Aula:</strong> {notebook.classroom?.name}</div>
              <div className="text-sm"><strong>Sesiones registradas:</strong> {sessions.length}</div>
              <div className="text-sm"><strong>Sesiones activas:</strong> {activeSessions.length}</div>
            </div>
          </div>
          {notebook.originalFile && (
            <a href={notebook.originalFile} download className="btn btn-outline">
              📄 Descargar archivo Word
            </a>
          )}
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
                <p className="text-sm text-muted mt-2">{s.area} · {new Date(s.sessionDate).toLocaleDateString('es-PE')}</p>
                <p className="text-sm mt-2"><strong>Competencia:</strong> {s.competency}</p>
                {s.criteria?.length > 0 && (
                  <div className="text-xs text-muted mt-2">
                    <strong>Criterios:</strong> {s.criteria.map(c => c.description).join(' | ')}
                  </div>
                )}
                <div className="flex items-center justify-between mt-4">
                  <span className="badge badge-success">Activa · {s._count?.evidences || 0} evidencias</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Historial de sesiones */}
      <h2 className="card-title mb-4">📅 Sesiones del Cuaderno ({otherSessions.length})</h2>
      {otherSessions.length > 0 ? (
        <div className="flex flex-col gap-3">
          {otherSessions.map(s => (
            <div key={s.id} className="card">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div style={{ flex: 1 }}>
                  <h3 className="font-semibold">{s.activityTitle}</h3>
                  <p className="text-sm text-muted">{s.area} · {s.competency}</p>
                  <p className="text-xs text-muted mt-1">{new Date(s.sessionDate).toLocaleDateString('es-PE')}</p>
                  {s.criteria?.length > 0 && (
                    <div className="text-xs text-muted mt-1">
                      Criterios: {s.criteria.map(c => c.description).join(' | ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${s.status === 'preparada' ? 'badge-warning' : 'badge-primary'}`}>
                    {s.status === 'preparada' ? 'Preparada' : s.status === 'cerrada' ? 'Cerrada' : s.status}
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
          <h2 className="empty-state-title">Sin sesiones en este cuaderno</h2>
          <p className="empty-state-description">Crea la primera sesión de aprendizaje para este cuaderno</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">+ Crear Sesión</button>
        </div>
      )}

      {/* Modal crear sesión */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva Sesión — {notebook.title}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSession}>
              <div className="modal-body">
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

      {/* Modal confirmar eliminación */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--error-500)' }}>⚠️ Eliminar Cuaderno de Campo</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <form onSubmit={handleDeleteNotebook}>
              <div className="modal-body">
                <p className="mb-4 text-sm" style={{ lineHeight: '1.6' }}>
                  Esta acción es permanente y **no se puede deshacer**. Se eliminará el cuaderno de campo y todas las sesiones de aprendizaje vinculadas a él.
                </p>
                <div className="form-group">
                  <label className="form-label form-label-required">
                    Para confirmar la eliminación, escribe la palabra <strong>eliminar</strong> a continuación:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder='Escribe "eliminar"'
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    required
                    style={{ borderColor: deleteConfirmText === 'eliminar' ? 'var(--success-500)' : 'var(--border-color)' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    backgroundColor: deleteConfirmText === 'eliminar' ? 'var(--error-500)' : 'var(--gray-300)',
                    color: 'white',
                    cursor: deleteConfirmText === 'eliminar' ? 'pointer' : 'not-allowed'
                  }}
                  disabled={deleteConfirmText !== 'eliminar' || saving}
                >
                  {saving ? 'Eliminando...' : '🗑️ Confirmar Eliminación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
