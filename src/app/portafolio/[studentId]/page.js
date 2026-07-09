'use client';
// ============================================
// Portafolio Individual del Estudiante
// ============================================
import { useState, useEffect, useRef, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudentPortfolioPage({ params }) {
  const { studentId } = use(params);
  const { data: authSession, status } = useSession();
  const router = useRouter();

  // State lists
  const [evidences, setEvidences] = useState([]);
  const [student, setStudent] = useState(null);
  const [sessionsList, setSessionsList] = useState([]);
  const [selectedSessionCriteria, setSelectedSessionCriteria] = useState([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Modal toggle state
  const [showModal, setShowModal] = useState(false);

  // New Evidence Form State
  const [form, setForm] = useState({
    sessionId: '',
    criteriaId: '',
    level: '',
    observation: '',
    type: 'texto', // texto, audio, foto, video, marcacion
    aiDescription: '',
    aiFeedback: '',
    confirmedDescription: '',
    confirmedFeedback: '',
    status: 'pendiente'
  });

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // File Upload State
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const [evRes, stRes] = await Promise.all([
        fetch(`/api/evidence?studentId=${studentId}`),
        fetch(`/api/students/${studentId}`),
      ]);
      
      let studentData = null;
      if (stRes.ok) {
        studentData = await stRes.json();
        setStudent(studentData);
      }
      
      if (evRes.ok) {
        setEvidences(await evRes.json());
      }

      // If student loaded, get sessions for their classroom
      if (studentData?.classroomId) {
        const sessRes = await fetch(`/api/sessions?classroomId=${studentData.classroomId}`);
        if (sessRes.ok) {
          setSessionsList(await sessRes.json());
        }
      }
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
    }
    setLoading(false);
  };

  // When session selection changes, update criteria
  const handleSessionChange = (sessId) => {
    const selectedSess = sessionsList.find(s => s.id === sessId);
    setForm(prev => ({ ...prev, sessionId: sessId, criteriaId: '' }));
    setSelectedSessionCriteria(selectedSess?.criteria || []);
  };

  // Audio logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        
        // Save recording as file state
        const file = new File([blob], 'grabacion_audio.webm', { type: 'audio/webm' });
        setSelectedFile(file);
        setFilePreview(URL.createObjectURL(blob));
        setForm(prev => ({ ...prev, type: 'audio' }));

        await processAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      alert('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const processAudio = async (audioBlob) => {
    setAiLoading(true);
    try {
      const transcribeForm = new FormData();
      transcribeForm.append('audio', audioBlob, 'audio.webm');
      const transcribeRes = await fetch('/api/ai/transcribe', { method: 'POST', body: transcribeForm });
      
      let transcription = '';
      if (transcribeRes.ok) {
        const transcribeData = await transcribeRes.json();
        transcription = transcribeData.transcription;
      }

      setForm(prev => ({ ...prev, observation: transcription || 'Audio grabado' }));
      
      // Auto generate with AI if transcription was successful
      if (transcription) {
        await generateAIEvidence(transcription);
      }
    } catch (err) {
      console.error('Error transcribing audio:', err);
    }
    setAiLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      
      // Auto detect type
      let detectType = 'texto';
      if (file.type.startsWith('image/')) detectType = 'foto';
      else if (file.type.startsWith('audio/')) detectType = 'audio';
      else if (file.type.startsWith('video/')) detectType = 'video';
      
      setForm(prev => ({ ...prev, type: detectType }));
    }
  };

  const generateAIEvidence = async (obsText) => {
    const activeObs = obsText || form.observation;
    if (!activeObs) return;

    setAiLoading(true);
    try {
      const selectedSess = sessionsList.find(s => s.id === form.sessionId);
      const selectedCrit = selectedSessionCriteria.find(c => c.id === form.criteriaId);

      const res = await fetch('/api/ai/generate-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante: student?.fullName || 'Estudiante',
          actividad: selectedSess?.activityTitle || '',
          competencia: selectedSess?.competency || '',
          criterio: selectedCrit?.description || '',
          nivel: form.level || 'Proceso',
          observacion: activeObs,
        }),
      });

      if (res.ok) {
        const aiData = await res.json();
        setForm(prev => ({
          ...prev,
          aiDescription: aiData.description,
          aiFeedback: aiData.feedback,
          confirmedDescription: aiData.description,
          confirmedFeedback: aiData.feedback,
          status: 'confirmada'
        }));
      }
    } catch (err) {
      console.error('Error generating AI text:', err);
    }
    setAiLoading(false);
  };

  const handleSaveEvidence = async (e) => {
    e.preventDefault();
    if (!form.sessionId) {
      alert('Por favor selecciona una sesión de aprendizaje.');
      return;
    }
    
    setSaving(true);
    try {
      const body = {
        studentId,
        sessionId: form.sessionId,
        criteriaId: form.criteriaId || undefined,
        type: form.type,
        level: form.level || undefined,
        observation: form.observation,
        aiDescription: form.aiDescription || undefined,
        aiFeedback: form.aiFeedback || undefined,
        confirmedDescription: form.confirmedDescription || form.observation,
        confirmedFeedback: form.confirmedFeedback || undefined,
        status: form.status || 'pendiente'
      };

      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const createdEvidence = await res.json();

        // Upload file if selected
        if (selectedFile) {
          const uploadForm = new FormData();
          uploadForm.append('file', selectedFile);
          uploadForm.append('evidenceId', createdEvidence.id);
          uploadForm.append('type', form.type);
          await fetch('/api/upload', { method: 'POST', body: uploadForm });
        }

        // Reset and refresh
        setShowModal(false);
        setForm({
          sessionId: '',
          criteriaId: '',
          level: '',
          observation: '',
          type: 'texto',
          aiDescription: '',
          aiFeedback: '',
          confirmedDescription: '',
          confirmedFeedback: '',
          status: 'pendiente'
        });
        setSelectedFile(null);
        setFilePreview(null);
        fetchData();
      } else {
        alert('Error al guardar evidencia.');
      }
    } catch (err) {
      console.error('Error saving evidence:', err);
      alert('Error inesperado.');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="spinner spinner-lg"></div></div>;
  }

  // Group by session
  const bySession = {};
  evidences.forEach(ev => {
    const key = ev.sessionId;
    if (!bySession[key]) bySession[key] = { session: ev.session, evidences: [] };
    bySession[key].evidences.push(ev);
  });

  // Statistics
  const levelCounts = { inicio: 0, proceso: 0, logrado: 0, requiere_apoyo: 0 };
  evidences.forEach(ev => { if (ev.level) levelCounts[ev.level]++; });
  const total = evidences.length;

  // Unique competencies
  const competencies = [...new Set(evidences.map(e => e.session?.competency).filter(Boolean))];

  return (
    <div>
      <div className="page-header">
        <div className="page-breadcrumb">
          <Link href="/portafolio">Portafolios</Link>
          <span className="page-breadcrumb-separator">›</span>
          <span>{student?.fullName || 'Estudiante'}</span>
        </div>
        <div className="page-header-top">
          <div className="flex items-center gap-4">
            <div className="student-chip-avatar" style={{ width: 56, height: 56, fontSize: 'var(--text-lg)' }}>
              {student?.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h1 className="page-title">{student?.fullName}</h1>
              <p className="page-subtitle">{student?.classroom?.name} · {total} evidencias registradas</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" id="btn-add-evidence-portfolio">
            + Registrar Evidencia
          </button>
        </div>
      </div>

      {/* Student stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255,135,135,0.15)', color: 'var(--level-inicio)' }}>📊</div>
          <div>
            <div className="stat-value">{levelCounts.inicio}</div>
            <div className="stat-label">Inicio</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255,212,59,0.15)', color: '#e8590c' }}>📊</div>
          <div>
            <div className="stat-value">{levelCounts.proceso}</div>
            <div className="stat-label">Proceso</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(105,219,124,0.15)', color: 'var(--level-logrado)' }}>📊</div>
          <div>
            <div className="stat-value">{levelCounts.logrado}</div>
            <div className="stat-label">Logrado</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(229,153,247,0.15)', color: 'var(--level-apoyo)' }}>📊</div>
          <div>
            <div className="stat-value">{levelCounts.requiere_apoyo}</div>
            <div className="stat-label">Req. apoyo</div>
          </div>
        </div>
      </div>

      {/* Competencies list */}
      {competencies.length > 0 && (
        <div className="card mb-6">
          <h3 className="card-title mb-3">🎯 Competencias evaluadas</h3>
          <div className="flex gap-2 flex-wrap">
            {competencies.map((c, i) => <span key={i} className="badge badge-primary">{c}</span>)}
          </div>
        </div>
      )}

      {/* Evidences list grouped by session */}
      <h2 className="card-title mb-4">📝 Historial de Evidencias</h2>
      {Object.entries(bySession).length > 0 ? (
        <div className="flex flex-col gap-6">
          {Object.entries(bySession).map(([key, group]) => (
            <div key={key}>
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary">📋 {group.session?.activityTitle}</span>
                <span className="text-xs text-muted">
                  {group.session?.sessionDate && new Date(group.session.sessionDate).toLocaleDateString('es-PE')}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {group.evidences.map(ev => (
                  <div key={ev.id} className="evidence-card">
                    <div className="evidence-card-header">
                      <div className="evidence-card-type">
                        {ev.type === 'audio' ? '🎙️' : ev.type === 'foto' ? '📷' : ev.type === 'video' ? '🎥' : '✏️'}
                        <span>{ev.type}</span>
                        <span>·</span>
                        <span>{new Date(ev.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex gap-2">
                        {ev.level && (
                          <span className={`badge badge-${ev.level === 'logrado' ? 'success' : ev.level === 'proceso' ? 'warning' : ev.level === 'inicio' ? 'error' : 'purple'}`}>
                            {ev.level === 'inicio' ? 'Inicio' : ev.level === 'proceso' ? 'Proceso' : ev.level === 'logrado' ? 'Logrado' : 'Req. apoyo'}
                          </span>
                        )}
                        <span className={`badge badge-status-${ev.status}`}>{ev.status}</span>
                      </div>
                    </div>
                    {ev.confirmedDescription && (
                      <div className="text-sm mb-2">
                        <strong className="text-xs text-muted">Descripción:</strong>
                        <p>{ev.confirmedDescription}</p>
                      </div>
                    )}
                    {ev.confirmedFeedback && (
                      <div className="text-sm">
                        <strong className="text-xs text-muted">Retroalimentación:</strong>
                        <p>{ev.confirmedFeedback}</p>
                      </div>
                    )}
                    {!ev.confirmedDescription && ev.observation && (
                      <div className="text-sm"><p>{ev.observation}</p></div>
                    )}

                    {/* Media attachments */}
                    {ev.files?.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
                        {ev.files.map(file => (
                          <div key={file.id} className="media-preview" style={{ maxWidth: '400px' }}>
                            {file.fileType.startsWith('image/') && (
                              <img src={file.filePath} alt="Adjunto" style={{ borderRadius: 'var(--border-radius-md)', width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                            )}
                            {file.fileType.startsWith('audio/') && (
                              <audio controls src={file.filePath} style={{ width: '100%' }} />
                            )}
                            {file.fileType.startsWith('video/') && (
                              <video controls src={file.filePath} style={{ width: '100%', maxHeight: '200px' }} />
                            )}
                            {!file.fileType.startsWith('image/') && !file.fileType.startsWith('audio/') && !file.fileType.startsWith('video/') && (
                              <a href={file.filePath} download className="btn btn-outline btn-sm flex items-center justify-center gap-2">
                                📄 Descargar archivo
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {ev.criteria?.description && (
                      <div className="text-xs text-muted mt-2">📌 {ev.criteria.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <h2 className="empty-state-title">Sin evidencias</h2>
          <p className="empty-state-description">Este estudiante aún no tiene evidencias registradas</p>
        </div>
      )}

      {/* Modal - Registrar Nueva Evidencia */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Registrar Nueva Evidencia</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveEvidence}>
              <div className="modal-body">
                
                {/* Select Session */}
                <div className="form-group">
                  <label className="form-label form-label-required">Sesión de Aprendizaje</label>
                  <select className="form-select" value={form.sessionId} onChange={e => handleSessionChange(e.target.value)} required>
                    <option value="">Seleccionar sesión...</option>
                    {sessionsList.map(s => (
                      <option key={s.id} value={s.id}>{s.activityTitle} ({new Date(s.sessionDate).toLocaleDateString('es-PE')})</option>
                    ))}
                  </select>
                </div>

                {/* Select Criteria */}
                {selectedSessionCriteria.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Criterio de Evaluación</label>
                    <select className="form-select" value={form.criteriaId} onChange={e => setForm(prev => ({ ...prev, criteriaId: e.target.value }))}>
                      <option value="">Seleccionar criterio...</option>
                      {selectedSessionCriteria.map(c => (
                        <option key={c.id} value={c.id}>{c.description}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Level selection */}
                <div className="form-group">
                  <label className="form-label">Nivel de Logro Observado</label>
                  <div className="level-selector">
                    {[
                      { value: 'inicio', label: 'Inicio' },
                      { value: 'proceso', label: 'Proceso' },
                      { value: 'logrado', label: 'Logrado' },
                      { value: 'requiere_apoyo', label: 'Req. Apoyo' }
                    ].map(l => (
                      <div key={l.value}
                        className={`level-option ${form.level === l.value ? 'selected' : ''}`}
                        data-level={l.value}
                        onClick={() => setForm(prev => ({ ...prev, level: l.value }))}>
                        <span className="level-option-dot"></span>
                        <span>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observation / Text Input */}
                <div className="form-group">
                  <label className="form-label form-label-required">Observación / Descripción</label>
                  <textarea className="form-textarea" rows={3} placeholder="Describe lo observado en el estudiante..." value={form.observation} onChange={e => setForm(prev => ({ ...prev, observation: e.target.value }))} required />
                </div>

                {/* Capture multimodal & upload section */}
                <div className="form-group">
                  <label className="form-label">Multimedia (Subir archivo o grabar audio)</label>
                  
                  {/* File Upload Preview */}
                  {filePreview && (
                    <div className="mb-3 p-2 border rounded text-center bg-gray-50">
                      {selectedFile?.type.startsWith('image/') && (
                        <img src={filePreview} alt="Vista previa" style={{ maxHeight: '120px', margin: '0 auto', display: 'block' }} />
                      )}
                      {selectedFile?.type.startsWith('audio/') && (
                        <audio controls src={filePreview} className="mt-1" style={{ width: '100%' }} />
                      )}
                      {selectedFile?.type.startsWith('video/') && (
                        <video controls src={filePreview} style={{ maxHeight: '120px', width: '100%' }} />
                      )}
                      {!selectedFile?.type.startsWith('image/') && !selectedFile?.type.startsWith('audio/') && !selectedFile?.type.startsWith('video/') && (
                        <div className="text-sm font-semibold text-primary">📄 {selectedFile?.name}</div>
                      )}
                      <button type="button" className="btn btn-ghost btn-sm mt-2 text-error" onClick={() => { setSelectedFile(null); setFilePreview(null); setForm(prev => ({ ...prev, type: 'texto' })); }}>
                        Quitar archivo
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {/* Audio recording button */}
                    <button type="button" 
                      className={`btn ${isRecording ? 'btn-danger' : 'btn-outline'} flex-1`}
                      onClick={isRecording ? stopRecording : startRecording}>
                      {isRecording ? (
                        <>Detener ({recordingTime}s)</>
                      ) : (
                        <>🎙️ Grabar Audio</>
                      )}
                    </button>

                    {/* General file upload button */}
                    <button type="button" className="btn btn-outline flex-1" onClick={() => fileInputRef.current.click()}>
                      📁 Subir Archivo
                    </button>
                    <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
                  </div>
                </div>

                {/* AI Assistant Fields */}
                {form.observation && (
                  <div className="mb-4">
                    <button type="button" className={`btn btn-accent btn-sm ${aiLoading ? 'btn-loading' : ''}`} onClick={() => generateAIEvidence()} disabled={aiLoading}>
                      {aiLoading ? '🤖 Procesando IA...' : '🤖 Optimizar descripción con IA'}
                    </button>
                  </div>
                )}

                {/* AI Outputs */}
                {(form.aiDescription || form.aiFeedback) && (
                  <div className="p-3 bg-primary-50 border rounded mb-3">
                    <h4 className="text-xs font-semibold text-primary-700 mb-2">🤖 Propuesta de la IA</h4>
                    <div className="form-group mb-2">
                      <label className="form-label text-xs">Descripción sugerida (confirmar/editar)</label>
                      <textarea className="form-textarea text-sm" rows={2} value={form.confirmedDescription} onChange={e => setForm(prev => ({ ...prev, confirmedDescription: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-xs">Retroalimentación sugerida</label>
                      <textarea className="form-textarea text-sm" rows={2} value={form.confirmedFeedback} onChange={e => setForm(prev => ({ ...prev, confirmedFeedback: e.target.value }))} />
                    </div>
                  </div>
                )}
                
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} disabled={saving || isRecording}>
                  {saving ? 'Guardando...' : '💾 Guardar Evidencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
