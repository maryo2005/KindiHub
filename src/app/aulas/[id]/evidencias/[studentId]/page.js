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
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // New Evidence Form State
  const [form, setForm] = useState({
    sessionId: '',
    criteriaId: '',
    level: '',
    observation: '',
    transcription: '',
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
  const videoInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      setTimeout(() => {
        fetchData();
      }, 0);
    }
  }, [status]);

  // Direct file upload handler
  const handleDirectUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedSessionId) {
      alert('Por favor selecciona una sesión.');
      return;
    }

    setSaving(true);
    try {
      let detectType = 'foto';
      if (file.type.startsWith('image/')) detectType = 'foto';
      else if (file.type.startsWith('video/')) detectType = 'video';

      // Create empty evidence specifically for the file
      const body = {
        studentId,
        sessionId: selectedSessionId,
        type: detectType,
        observation: 'Archivo multimedia subido en clase',
        status: 'pendiente'
      };

      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const createdEvidence = await res.json();
        
        // Upload the actual file
        const uploadForm = new FormData();
        uploadForm.append('file', file);
        uploadForm.append('evidenceId', createdEvidence.id);
        uploadForm.append('type', detectType);
        
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadForm });
        if (uploadRes.ok) {
          fetchData(); // Refresh the list
        } else {
          const errData = await uploadRes.json().catch(() => ({}));
          alert(`Error al subir: ${errData.error || uploadRes.statusText}`);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Error al crear la evidencia: ${errData.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Error in direct upload:', err);
      alert('Error inesperado al subir el archivo.');
    } finally {
      setSaving(false);
      // Reset input so the user can select the same file again if they want
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

      setForm(prev => ({ 
        ...prev, 
        observation: transcription || 'Audio grabado',
        transcription: transcription
      }));
      
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
        transcription: form.transcription || undefined,
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
          transcription: '',
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
          <Link href="/aulas">Aulas</Link>
          <span className="page-breadcrumb-separator">›</span>
          <Link href={`/aulas/${student?.classroomId}`}>{student?.classroom?.name || 'Aula'}</Link>
          <span className="page-breadcrumb-separator">›</span>
          <Link href={`/aulas/${student?.classroomId}/evidencias`}>Evidencias</Link>
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

      {/* Main Content Area */}
      {!selectedSessionId ? (
        <>
          <h2 className="card-title mb-4">📋 Lista de Sesiones</h2>
          {sessionsList.length > 0 ? (
            <div className="grid-2">
              {sessionsList.map(session => {
                const sessionEvidences = bySession[session.id]?.evidences?.length || 0;
                return (
                  <div key={session.id} className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--border-color)' }} onClick={() => setSelectedSessionId(session.id)} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg" style={{ color: 'var(--primary-600)' }}>{session.activityTitle}</h3>
                      <span className="text-xs text-muted bg-gray-100 px-2 py-1 rounded">
                        {new Date(session.sessionDate).toLocaleDateString('es-PE')}
                      </span>
                    </div>
                    <div className="text-sm text-muted mb-4">{session.area}</div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-primary">📝 {sessionEvidences} evidencias</span>
                      <span className="text-xs text-primary font-medium ml-auto">Ver detalles →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <h2 className="empty-state-title">No hay sesiones</h2>
              <p className="empty-state-description">Aún no se han creado sesiones en esta aula.</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <button className="btn btn-outline btn-sm" onClick={() => setSelectedSessionId(null)}>
              ← Volver a Sesiones
            </button>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleDirectUpload} />
              <input ref={videoInputRef} type="file" accept="video/*" capture="environment" style={{ display: 'none' }} onChange={handleDirectUpload} />
              <button className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} onClick={() => fileInputRef.current.click()} disabled={saving}>
                {saving ? 'Subiendo...' : '📸 Tomar Foto'}
              </button>
              <button className={`btn btn-outline ${saving ? 'btn-loading' : ''}`} onClick={() => videoInputRef.current.click()} disabled={saving}>
                {saving ? 'Subiendo...' : '🎥 Grabar Video'}
              </button>
            </div>
          </div>

          <div className="card" style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-200)', marginBottom: 'var(--space-6)' }}>
            <h3 className="font-semibold text-xl mb-1">{sessionsList.find(s => s.id === selectedSessionId)?.activityTitle}</h3>
            <p className="text-sm text-muted">{sessionsList.find(s => s.id === selectedSessionId)?.competency || 'Sin competencia extraída'}</p>
          </div>

          <h2 className="card-title mb-4">📝 Evidencias de esta Sesión</h2>
          {bySession[selectedSessionId]?.evidences?.length > 0 ? (
            <div className="flex flex-col gap-3">
              {bySession[selectedSessionId].evidences.map(ev => (
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
                    <div className="mt-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                      {ev.files.map(file => (
                        <div key={file.id} className="media-preview" style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          {file.fileType.startsWith('image/') && (
                            <a href={file.filePath} target="_blank" rel="noreferrer">
                              <img src={file.filePath} alt="Adjunto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </a>
                          )}
                          {file.fileType.startsWith('video/') && (
                            <a href={file.filePath} target="_blank" rel="noreferrer" style={{ position: 'relative', display: 'block', width: '100%', height: '100%' }}>
                              <video src={file.filePath} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                                <span style={{ color: 'white', fontSize: '20px' }}>▶️</span>
                              </div>
                            </a>
                          )}
                          {!file.fileType.startsWith('image/') && !file.fileType.startsWith('audio/') && !file.fileType.startsWith('video/') && (
                            <a href={file.filePath} download className="btn btn-outline btn-sm flex items-center justify-center h-full text-xs text-center">
                              📄 Doc
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
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📂</div>
              <h2 className="empty-state-title">Sin evidencias</h2>
              <p className="empty-state-description">Este estudiante aún no tiene evidencias registradas en esta sesión.</p>
            </div>
          )}
        </>
      )}

    </div>
  );
}
