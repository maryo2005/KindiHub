'use client';
// ============================================
// Cuadernos de Campo
// ============================================
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CuadernoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notebooks, setNotebooks] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', classroomId: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') fetchData();
  }, [status]);

  const fetchData = async () => {
    const [nbRes, clRes] = await Promise.all([
      fetch('/api/notebooks'),
      fetch('/api/classrooms'),
    ]);
    if (nbRes.ok) setNotebooks(await nbRes.json());
    if (clRes.ok) setClassrooms(await clRes.json());
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/notebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowModal(false);
      setForm({ title: '', classroomId: '' });
      fetchData();
    }
    setSaving(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    
    // Subir archivo
    const uploadForm = new FormData();
    uploadForm.append('file', file);
    uploadForm.append('type', 'documento');
    
    try {
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadForm });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        setForm(prev => ({ ...prev, title: file.name.replace('.docx', '').replace('.doc', ''), originalFile: uploadData.filePath }));
        alert('✅ Archivo subido. Completa el nombre y aula del cuaderno.');
      }
    } catch (err) {
      console.error('Error subiendo archivo:', err);
    }
    setUploading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="spinner spinner-lg"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">📓 Cuadernos de Campo</h1>
            <p className="page-subtitle">Organiza tus cuadernos de campo por aula</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" id="btn-new-notebook">
            + Nuevo Cuaderno
          </button>
        </div>
      </div>

      {notebooks.length > 0 ? (
        <div className="grid-3">
          {notebooks.map(nb => (
            <Link key={nb.id} href={`/cuaderno/${nb.id}`} className="card card-clickable">
              <div className="flex items-center gap-3 mb-3">
                <div className="card-icon card-icon-accent">📓</div>
                <div>
                  <h3 className="card-title" style={{ fontSize: 'var(--text-base)' }}>{nb.title}</h3>
                  <p className="card-subtitle">{nb.classroom?.name}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{nb._count?.sessions || 0} sesiones</span>
                <span className="text-xs text-muted">{new Date(nb.createdAt).toLocaleDateString('es-PE')}</span>
              </div>
              {nb.originalFile && (
                <div className="mt-2">
                  <span className="badge badge-primary">📄 Archivo Word adjunto</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📓</div>
          <h2 className="empty-state-title">Sin cuadernos de campo</h2>
          <p className="empty-state-description">Crea un cuaderno de campo o sube un archivo Word</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">+ Crear Cuaderno</button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nuevo Cuaderno de Campo</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="file-upload mb-4" onClick={() => document.getElementById('word-upload').click()}>
                  <div className="file-upload-icon">📄</div>
                  <div className="file-upload-text">
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="spinner spinner-sm"></span> Subiendo...
                      </span>
                    ) : (
                      <>
                        <strong>Sube tu cuaderno de campo</strong> (archivo Word .docx)
                        <br />o créalo manualmente
                      </>
                    )}
                  </div>
                  <input id="word-upload" type="file" accept=".docx,.doc" style={{ display: 'none' }}
                    onChange={handleFileUpload} />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-required">Título del cuaderno</label>
                  <input className="form-input" placeholder="Ej: Cuaderno de Campo — Aula Celeste 2026"
                    value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-required">Aula</label>
                  <select className="form-select" value={form.classroomId}
                    onChange={e => setForm({...form, classroomId: e.target.value})} required>
                    <option value="">Seleccionar aula...</option>
                    {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} — {c.age}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} disabled={saving}>
                  {saving ? 'Creando...' : 'Crear Cuaderno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
