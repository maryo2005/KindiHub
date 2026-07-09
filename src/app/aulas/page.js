'use client';
// ============================================
// Página de Gestión de Aulas
// ============================================
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AulasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', section: '', age: '5 años', year: new Date().getFullYear() });
  const [saving, setSaving] = useState(false);

  const fetchClassrooms = async () => {
    const res = await fetch('/api/classrooms');
    if (res.ok) setClassrooms(await res.json());
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/classrooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowModal(false);
      setForm({ name: '', section: '', age: '5 años', year: new Date().getFullYear() });
      fetchClassrooms();
    }
    setSaving(false);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">🏫 Mis Aulas</h1>
            <p className="page-subtitle">Gestiona tus aulas y secciones</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" id="btn-new-classroom">
            + Nueva Aula
          </button>
        </div>
      </div>

      {classrooms.length > 0 ? (
        <div className="grid-3">
          {classrooms.map(c => (
            <Link key={c.id} href={`/aulas/${c.id}`} className="card card-clickable" id={`classroom-${c.id}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="card-icon card-icon-primary">🏫</div>
                <div>
                  <h3 className="card-title">{c.name}</h3>
                  <p className="card-subtitle">Sección {c.section} · {c.age}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="font-bold text-lg">{c._count?.students || 0}</div>
                  <div className="text-xs text-muted">Estudiantes</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{c._count?.notebooks || 0}</div>
                  <div className="text-xs text-muted">Cuadernos</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🏫</div>
          <h2 className="empty-state-title">No tienes aulas registradas</h2>
          <p className="empty-state-description">Crea tu primera aula para comenzar a registrar estudiantes y evidencias</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">+ Crear Aula</button>
        </div>
      )}

      {/* Modal crear aula */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva Aula</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label form-label-required">Nombre del aula</label>
                  <input className="form-input" placeholder="Ej: Aula Celeste" value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})} required id="input-classroom-name" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label form-label-required">Sección</label>
                    <input className="form-input" placeholder="Ej: A" value={form.section}
                      onChange={e => setForm({...form, section: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label form-label-required">Edad</label>
                    <select className="form-select" value={form.age}
                      onChange={e => setForm({...form, age: e.target.value})}>
                      <option value="3 años">3 años</option>
                      <option value="4 años">4 años</option>
                      <option value="5 años">5 años</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Año escolar</label>
                  <input type="number" className="form-input" value={form.year}
                    onChange={e => setForm({...form, year: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} disabled={saving}>
                  {saving ? 'Guardando...' : 'Crear Aula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
