'use client';
// ============================================
// Panel de Revisión de Evidencias
// ============================================
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function RevisionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [evidences, setEvidences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pendiente, confirmada, revisada
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') fetchEvidences();
  }, [status]);

  const fetchEvidences = async () => {
    const res = await fetch('/api/evidence');
    if (res.ok) setEvidences(await res.json());
    setLoading(false);
  };

  const updateEvidence = async (id, data) => {
    setSaving(true);
    const res = await fetch(`/api/evidence/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      fetchEvidences();
      setEditingId(null);
    }
    setSaving(false);
  };

  const regenerateAI = async (ev) => {
    setAiLoading(ev.id);
    try {
      const res = await fetch('/api/ai/generate-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante: ev.student?.fullName || '',
          actividad: ev.session?.activityTitle || '',
          competencia: ev.session?.competency || '',
          criterio: ev.criteria?.description || '',
          nivel: ev.level || 'Proceso',
          observacion: ev.observation || ev.transcription || '',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await updateEvidence(ev.id, {
          aiDescription: data.description,
          aiFeedback: data.feedback,
          status: 'revisada',
        });
      }
    } catch (err) {
      console.error('Error regenerando IA:', err);
    }
    setAiLoading(null);
  };

  const deleteEvidence = async (id) => {
    if (!confirm('¿Eliminar esta evidencia?')) return;
    await fetch(`/api/evidence/${id}`, { method: 'DELETE' });
    fetchEvidences();
  };

  if (loading) {
    return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="spinner spinner-lg"></div></div>;
  }

  const filtered = filter === 'all' ? evidences : evidences.filter(e => e.status === filter);
  const counts = {
    all: evidences.length,
    pendiente: evidences.filter(e => e.status === 'pendiente').length,
    revisada: evidences.filter(e => e.status === 'revisada').length,
    confirmada: evidences.filter(e => e.status === 'confirmada').length,
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📝 Revisión de Evidencias</h1>
        <p className="page-subtitle">Revisa, edita y confirma las evidencias capturadas</p>
      </div>

      {/* Filtros */}
      <div className="tabs mb-6">
        {[
          { key: 'all', label: `Todas (${counts.all})` },
          { key: 'pendiente', label: `⏳ Pendientes (${counts.pendiente})` },
          { key: 'revisada', label: `👁️ Revisadas (${counts.revisada})` },
          { key: 'confirmada', label: `✅ Confirmadas (${counts.confirmada})` },
        ].map(f => (
          <div key={f.key} className={`tab ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}>
            {f.label}
          </div>
        ))}
      </div>

      {/* Lista de evidencias */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filtered.map(ev => (
            <div key={ev.id} className="evidence-card">
              <div className="evidence-card-header">
                <div className="evidence-card-student">
                  <div className="evidence-card-avatar">
                    {ev.student?.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="evidence-card-name">{ev.student?.fullName}</div>
                    <div className="evidence-card-date">
                      {ev.session?.activityTitle} · {new Date(ev.createdAt).toLocaleDateString('es-PE')} {new Date(ev.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge badge-status-${ev.status}`}>{ev.status}</span>
                  {ev.level && (
                    <span className={`badge badge-${ev.level === 'logrado' ? 'success' : ev.level === 'proceso' ? 'warning' : ev.level === 'inicio' ? 'error' : 'purple'}`}>
                      {ev.level === 'inicio' ? 'Inicio' : ev.level === 'proceso' ? 'Proceso' : ev.level === 'logrado' ? 'Logrado' : 'Req. apoyo'}
                    </span>
                  )}
                </div>
              </div>

              {/* Observación original */}
              {ev.observation && (
                <div className="text-sm mb-3">
                  <strong className="text-xs text-muted">Observación:</strong>
                  <p>{ev.observation}</p>
                </div>
              )}

              {/* Transcripción */}
              {ev.transcription && (
                <div className="text-sm mb-3">
                  <strong className="text-xs text-muted">🎙️ Transcripción:</strong>
                  <p>{ev.transcription}</p>
                </div>
              )}

              {/* Sugerencia IA */}
              {(ev.aiDescription || ev.aiFeedback) && (
                <div className="ai-suggestion mb-3" style={{ padding: 'var(--space-3)' }}>
                  <div className="ai-suggestion-header" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
                    🤖 Sugerencia IA
                  </div>
                  {ev.aiDescription && <p className="text-sm mb-2"><strong>Descripción:</strong> {ev.aiDescription}</p>}
                  {ev.aiFeedback && <p className="text-sm"><strong>Retroalimentación:</strong> {ev.aiFeedback}</p>}
                </div>
              )}

              {/* Descripción confirmada */}
              {ev.confirmedDescription && (
                <div className="text-sm mb-3" style={{ padding: 'var(--space-3)', background: 'var(--success-50)', borderRadius: 'var(--border-radius-md)' }}>
                  <strong className="text-xs" style={{ color: 'var(--success-700)' }}>✅ Confirmado:</strong>
                  <p>{ev.confirmedDescription}</p>
                  {ev.confirmedFeedback && <p className="mt-2"><strong>Retroalimentación:</strong> {ev.confirmedFeedback}</p>}
                </div>
              )}

              {/* Edición inline */}
              {editingId === ev.id && (
                <div className="card mt-3" style={{ background: 'var(--gray-50)', padding: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-label">Descripción confirmada</label>
                    <textarea className="form-textarea" rows={3}
                      value={editForm.confirmedDescription || ''} 
                      onChange={e => setEditForm({...editForm, confirmedDescription: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Retroalimentación confirmada</label>
                    <textarea className="form-textarea" rows={2}
                      value={editForm.confirmedFeedback || ''} 
                      onChange={e => setEditForm({...editForm, confirmedFeedback: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nivel</label>
                    <select className="form-select" value={editForm.level || ''}
                      onChange={e => setEditForm({...editForm, level: e.target.value})}>
                      <option value="">Sin nivel</option>
                      <option value="inicio">Inicio</option>
                      <option value="proceso">Proceso</option>
                      <option value="logrado">Logrado</option>
                      <option value="requiere_apoyo">Requiere apoyo</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button className={`btn btn-success btn-sm ${saving ? 'btn-loading' : ''}`}
                      onClick={() => updateEvidence(ev.id, { ...editForm, status: 'corregida' })} disabled={saving}>
                      ✅ Confirmar
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="evidence-card-footer mt-3">
                <div className="evidence-card-tags">
                  <span className="text-xs text-muted">
                    {ev.type === 'audio' ? '🎙️ Audio' : ev.type === 'foto' ? '📷 Foto' : ev.type === 'video' ? '🎥 Video' : '✏️ Texto'}
                  </span>
                  {ev.criteria?.description && <span className="text-xs text-muted">· {ev.criteria.description}</span>}
                </div>
                <div className="evidence-card-actions">
                  {ev.status !== 'confirmada' && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        setEditingId(ev.id);
                        setEditForm({
                          confirmedDescription: ev.aiDescription || ev.observation || '',
                          confirmedFeedback: ev.aiFeedback || '',
                          level: ev.level || '',
                        });
                      }}>✏️ Editar</button>
                      <button className={`btn btn-ghost btn-sm ${aiLoading === ev.id ? 'btn-loading' : ''}`}
                        onClick={() => regenerateAI(ev)} disabled={aiLoading === ev.id}>
                        🤖 Regenerar IA
                      </button>
                      <button className="btn btn-success btn-sm"
                        onClick={() => updateEvidence(ev.id, {
                          confirmedDescription: ev.aiDescription || ev.observation,
                          confirmedFeedback: ev.aiFeedback || '',
                          status: 'confirmada',
                        })}>
                        ✅ Confirmar
                      </button>
                    </>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error-500)' }}
                    onClick={() => deleteEvidence(ev.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h2 className="empty-state-title">Sin evidencias {filter !== 'all' ? 'con este filtro' : ''}</h2>
          <p className="empty-state-description">Captura evidencias desde una sesión activa</p>
        </div>
      )}
    </div>
  );
}
