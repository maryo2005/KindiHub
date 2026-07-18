'use client';
// ============================================
// SESIÓN ACTIVA - Captura Rápida de Evidencias
// Página principal durante la clase (mobile-first)
// ============================================
import { useState, useEffect, useRef, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ActiveSessionPage({ params }) {
  const { id, sessionId } = use(params);
  const { data: authSession, status } = useSession();
  const router = useRouter();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCriteria, setSelectedCriteria] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [showCapture, setShowCapture] = useState(null); // 'audio', 'photo', 'video', 'text'
  const [observation, setObservation] = useState('');
  const [transcription, setTranscription] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [extractingFields, setExtractingFields] = useState(false);
  const [generatingDocx, setGeneratingDocx] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Photo state
  const fileInputRef = useRef(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);

  const fetchSession = async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (res.ok) {
      const data = await res.json();
      setSessionData(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') {
      setTimeout(() => {
        fetchSession();
      }, 0);
    }
  }, [status]);

  // ---- AUDIO RECORDING ----
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
        setCapturedFile(file);
        setCapturedPreview(URL.createObjectURL(blob));
        
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
      // 1. Transcribe with Whisper
      const transcribeForm = new FormData();
      transcribeForm.append('audio', audioBlob, 'audio.webm');
      const transcribeRes = await fetch('/api/ai/transcribe', { method: 'POST', body: transcribeForm });
      
      let transcriptionText = '';
      if (transcribeRes.ok) {
        const transcribeData = await transcribeRes.json();
        transcriptionText = transcribeData.transcription;
      } else {
        const errData = await transcribeRes.json().catch(() => ({}));
        alert(`Error en Whisper: ${errData.error || transcribeRes.statusText}. Verifica que GROQ_API_KEY esté configurada en Vercel.`);
      }

      setTranscription(transcriptionText);
      setObservation(transcriptionText || 'Audio capturado');
      setShowCapture('review');
      
      // 2. Generate evidence with AI
      if (transcriptionText) {
        await generateAIEvidence(transcriptionText);
      }
    } catch (err) {
      console.error('Error procesando audio:', err);
      setObservation('Error al procesar audio. Puedes escribir la observación manualmente.');
      setShowCapture('text');
    }
    setAiLoading(false);
  };

  // ---- FILE CAPTURE ----
  const handleFileCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCapturedFile(file);
      setCapturedPreview(URL.createObjectURL(file));
      setShowCapture('review');
    }
  };

  // ---- AI GENERATION ----
  const generateAIEvidence = async (obs) => {
    setAiLoading(true);
    try {
      const student = sessionData?.notebook?.classroom?.students?.find(s => s.id === selectedStudent);
      const criteria = sessionData?.criteria?.find(c => c.id === selectedCriteria);

      const res = await fetch('/api/ai/generate-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante: student?.fullName || 'Estudiante',
          actividad: sessionData?.activityTitle || '',
          competencia: sessionData?.competency || '',
          criterio: criteria?.description || '',
          nivel: selectedLevel || 'Proceso',
          observacion: obs || observation,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
        setShowAiModal(true);
      }
    } catch (err) {
      console.error('Error generando evidencia IA:', err);
    }
    setAiLoading(false);
  };

  // ---- SAVE EVIDENCE ----
  const saveEvidence = async (useAI = false) => {
    if (!selectedStudent) {
      alert('Selecciona un estudiante');
      return;
    }
    setSaving(true);
    try {
      const body = {
        studentId: selectedStudent,
        sessionId,
        criteriaId: selectedCriteria || undefined,
        type: showCapture === 'audio' || showCapture === 'review' ? 'audio' : 
              showCapture === 'photo' ? 'foto' : showCapture === 'video' ? 'video' : 'texto',
        level: selectedLevel || undefined,
        observation: observation,
        transcription: transcription || undefined,
        aiDescription: useAI ? aiResult?.description : undefined,
        aiFeedback: useAI ? aiResult?.feedback : undefined,
        confirmedDescription: useAI ? aiResult?.description : observation,
        confirmedFeedback: useAI ? aiResult?.feedback : undefined,
        status: useAI ? 'confirmada' : 'pendiente',
      };

      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // Upload file if exists
        if (capturedFile) {
          const evidence = await res.json();
          const form = new FormData();
          form.append('file', capturedFile);
          form.append('evidenceId', evidence.id);
          
          let detectType = 'texto';
          if (capturedFile.type.startsWith('image/')) detectType = 'foto';
          else if (capturedFile.type.startsWith('audio/')) detectType = 'audio';
          else if (capturedFile.type.startsWith('video/')) detectType = 'video';
          
          form.append('type', detectType);
          await fetch('/api/upload', { method: 'POST', body: form });
        }

        // Reset
        setObservation('');
        setTranscription('');
        setSelectedLevel('');
        setShowCapture(null);
        setCapturedFile(null);
        setCapturedPreview(null);
        setAiResult(null);
        setShowAiModal(false);
        fetchSession();
      } else {
        alert('Error al guardar evidencia');
      }
    } catch (err) {
      console.error('Error guardando evidencia:', err);
      alert('Ocurrió un error al guardar');
    }
    setSaving(false);
  };

  const generateCuadernoDocx = async () => {
    if (!evidences || evidences.length === 0) {
      alert('Debes tener al menos una evidencia para generar el Cuaderno de Campo.');
      return;
    }
    setGeneratingDocx(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/generate-docx`, { method: 'POST' });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Cuaderno_de_Campo_${sessionData?.activityTitle || 'Sesion'}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        // Refrescar para obtener la ruta generada y guardada en BD
        fetchSession();
      } else {
        const errData = await res.json();
        alert('Error al generar: ' + errData.error);
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error en la comunicación con el servidor.');
    }
    setGeneratingDocx(false);
  };

  // ---- RENDER ----MPLATE UPLOAD & EXTRACTION ----
  const handleTemplateUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTemplate(true);
    try {
      // 1. Upload file
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch(`/api/sessions/${sessionId}/upload-notebook`, {
        method: 'POST',
        body: form,
      });

      if (!uploadRes.ok) {
        throw new Error('Error al subir la plantilla');
      }

      // 2. Extract fields with AI
      setUploadingTemplate(false);
      setExtractingFields(true);

      const extractRes = await fetch('/api/ai/extract-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (extractRes.ok) {
        await fetchSession(); // Recargar los datos con la competencia y criterios extraídos
      } else {
        alert('Error al extraer campos con IA. Puedes configurar manualmente más tarde.');
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
    setUploadingTemplate(false);
    setExtractingFields(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="spinner spinner-lg"></div></div>;
  }

  if (!sessionData) {
    return <div className="empty-state"><h2 className="empty-state-title">Sesión no encontrada</h2></div>;
  }

  const students = sessionData?.notebook?.classroom?.students || [];
  const evidences = sessionData?.evidences || [];
  const levels = [
    { value: 'inicio', label: 'Inicio', color: 'var(--level-inicio)' },
    { value: 'proceso', label: 'Proceso', color: 'var(--level-proceso)' },
    { value: 'logrado', label: 'Logrado', color: 'var(--level-logrado)' },
    { value: 'requiere_apoyo', label: 'Req. apoyo', color: 'var(--level-apoyo)' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-breadcrumb">
          <Link href="/aulas">Aulas</Link>
          <span className="page-breadcrumb-separator">›</span>
          <Link href={`/aulas/${id}`}>{sessionData?.notebook?.classroom?.name || 'Aula'}</Link>
          <span className="page-breadcrumb-separator">›</span>
          <Link href={`/aulas/${id}/cuadernos`}>Cuadernos de Campo</Link>
          <span className="page-breadcrumb-separator">›</span>
          <span>{sessionData?.activityTitle || 'Sesión'}</span>
        </div>
        <div className="page-header-top">
          <div>
            <h1 className="page-title">{sessionData.activityTitle}</h1>
            <p className="page-subtitle">
              {sessionData.notebook?.classroom?.name} · {sessionData.area} · {new Date(sessionData.sessionDate).toLocaleDateString('es-PE')}
            </p>
          </div>
          <div className="flex gap-2">
            <span className={`badge ${sessionData.status === 'activa' ? 'badge-success' : 'badge-warning'}`}>
              {sessionData.status === 'activa' ? '🟢 Activa' : sessionData.status}
            </span>
          </div>
        </div>
      </div>

      {!sessionData.competency || sessionData.competency.trim() === '' ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
          <h2 className="empty-state-title">Sube tu formato de Cuaderno de Campo</h2>
          <p className="empty-state-description" style={{ maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
            Para iniciar, sube la plantilla en formato Word (.docx). La Inteligencia Artificial leerá el documento para extraer automáticamente la <strong>Competencia, Estándar, Capacidades y Criterios de Evaluación</strong> que vas a calificar hoy.
          </p>
          
          {uploadingTemplate || extractingFields ? (
            <div className="flex flex-col items-center gap-3">
              <div className="spinner spinner-lg"></div>
              <p className="text-primary font-semibold">
                {uploadingTemplate ? 'Subiendo documento...' : '🤖 IA leyendo y extrayendo campos pedagógicos...'}
              </p>
            </div>
          ) : (
            <div>
              <input type="file" id="template-upload" accept=".doc,.docx" style={{ display: 'none' }} onChange={handleTemplateUpload} />
              <label htmlFor="template-upload" className="btn btn-primary" style={{ cursor: 'pointer' }}>
                📁 Subir Plantilla y Extraer con IA
              </label>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Info de sesión extraída */}
          <div className="card mb-6" style={{ background: 'linear-gradient(135deg, var(--primary-50), var(--accent-50))' }}>
            <div className="flex flex-col gap-2">
              <div className="text-sm"><strong>Competencia:</strong> {sessionData.competency}</div>
              {sessionData.standard && <div className="text-xs text-muted"><strong>Estándar:</strong> {sessionData.standard}</div>}
              {sessionData.criteria?.length > 0 && (
                <div className="text-xs text-muted">
                  <strong>Criterios Extraídos:</strong> {sessionData.criteria.map(c => c.description).join(' | ')}
                </div>
              )}
            </div>
          </div>

      <div className="grid-2">
        {/* Columna izquierda: Selección + Captura */}
        <div>
          {/* Seleccionar estudiante */}
          <div className="card mb-4">
            <h3 className="card-title mb-4">👧 Seleccionar Estudiante</h3>
            <div className="student-list">
              {students.map(s => {
                const evidenceCount = evidences.filter(e => e.studentId === s.id).length;
                return (
                  <div key={s.id}
                    className={`student-chip ${selectedStudent === s.id ? 'selected' : ''}`}
                    onClick={() => setSelectedStudent(s.id)}>
                    <div className="student-chip-avatar">
                      {s.fullName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <span className="student-chip-name">{s.fullName.split(' ')[0]}</span>
                    {evidenceCount > 0 && <span className="student-chip-count">{evidenceCount}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seleccionar criterio */}
          {sessionData.criteria?.length > 0 && (
            <div className="card mb-4">
              <h3 className="card-title mb-3">📌 Criterio de Evaluación</h3>
              <div className="flex flex-col gap-2">
                {sessionData.criteria.map(c => (
                  <div key={c.id}
                    className={`filter-chip ${selectedCriteria === c.id ? 'active' : ''}`}
                    onClick={() => setSelectedCriteria(selectedCriteria === c.id ? null : c.id)}
                    style={{ cursor: 'pointer', padding: 'var(--space-3)' }}>
                    {c.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nivel de logro */}
          <div className="card mb-4">
            <h3 className="card-title mb-3">📊 Nivel Observado</h3>
            <div className="level-selector">
              {levels.map(l => (
                <div key={l.value}
                  className={`level-option ${selectedLevel === l.value ? 'selected' : ''}`}
                  data-level={l.value}
                  onClick={() => setSelectedLevel(selectedLevel === l.value ? '' : l.value)}>
                  <span className="level-option-dot"></span>
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de captura */}
          <div className="card">
            <h3 className="card-title mb-4">📸 Capturar Evidencia</h3>
            <div className="capture-grid">
              <div className={`capture-btn capture-btn-audio ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}>
                <div className="capture-btn-icon">
                  {isRecording ? '⏹️' : '🎙️'}
                </div>
                {isRecording ? (
                  <div className="recording-indicator">
                    <span className="recording-dot"></span>
                    {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                  </div>
                ) : (
                  <span className="capture-btn-label">Grabar Audio</span>
                )}
              </div>

              <div className="capture-btn capture-btn-text"
                onClick={() => setShowCapture('text')}>
                <div className="capture-btn-icon">✏️</div>
                <span className="capture-btn-label">Escribir</span>
              </div>
            </div>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }}
              onChange={handleFileCapture} />
          </div>

          {/* Área de texto / revisión */}
          {(showCapture === 'text' || showCapture === 'review') && (
            <div className="card mt-4">
              <h3 className="card-title mb-3">
                {showCapture === 'review' ? '🔍 Revisar Captura' : '✏️ Observación Escrita'}
              </h3>
              {capturedPreview && (
                <div className="mb-4 flex justify-center" style={{ borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
                  {capturedFile?.type?.startsWith('image') ? (
                    <img src={capturedPreview} alt="Captura" style={{ maxHeight: 200, objectFit: 'cover', width: '100%' }} />
                  ) : capturedFile?.type?.startsWith('audio') ? (
                    <audio src={capturedPreview} controls style={{ width: '100%' }} />
                  ) : (
                    <video src={capturedPreview} controls style={{ maxHeight: 200, width: '100%' }} />
                  )}
                </div>
              )}
              <textarea className="form-textarea" rows={3}
                placeholder="Escribe tu observación breve..."
                value={observation}
                onChange={e => setObservation(e.target.value)} />
              <div className="flex gap-2 mt-4">
                <button className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
                  onClick={() => saveEvidence(false)} disabled={saving || !selectedStudent}>
                  {saving ? 'Guardando...' : '💾 Guardar'}
                </button>
                <button className="btn btn-ghost"
                  onClick={() => { setShowCapture(null); setObservation(''); setTranscription(''); setCapturedFile(null); setCapturedPreview(null); }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Quick mark */}
          {!showCapture && selectedStudent && selectedLevel && (
            <div className="card mt-4" style={{ background: 'var(--success-50)', border: '1px solid var(--success-200)' }}>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <strong>Marcación rápida:</strong> {students.find(s => s.id === selectedStudent)?.fullName?.split(' ')[0]} — {levels.find(l => l.value === selectedLevel)?.label}
                </div>
                <button className={`btn btn-success btn-sm ${saving ? 'btn-loading' : ''}`}
                  onClick={() => { setObservation(`Marcación rápida: ${selectedLevel}`); saveEvidence(false); }}
                  disabled={saving}>
                  ✅ Guardar Marcación
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: Evidencias de la sesión */}
        <div className="hide-mobile">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📝 Evidencias ({evidences.length})</h3>
            </div>
            {evidences.length > 0 ? (
              <div className="flex flex-col gap-3">
                {evidences.map(ev => (
                  <div key={ev.id} className="evidence-card">
                    <div className="evidence-card-header">
                      <div className="evidence-card-student">
                        <div className="evidence-card-avatar">
                          {ev.student?.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="evidence-card-name">{ev.student?.fullName}</div>
                          <div className="evidence-card-date">
                            {new Date(ev.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <span className={`badge badge-status-${ev.status}`}>{ev.status}</span>
                    </div>
                    <div className="evidence-card-body">
                      {ev.confirmedDescription || ev.aiDescription || ev.observation || 'Sin observación'}
                    </div>
                    {ev.files?.length > 0 && (
                      <div className="mt-2 flex flex-col gap-2" style={{ padding: '0 var(--space-3)' }}>
                        {ev.files.map(file => (
                          <div key={file.id} className="media-preview" style={{ maxWidth: '100%' }}>
                            {file.fileType.startsWith('image/') && (
                              <img src={file.filePath} alt="Adjunto" style={{ borderRadius: 'var(--border-radius-md)', width: '100%', maxHeight: '150px', objectFit: 'cover' }} />
                            )}
                            {file.fileType.startsWith('audio/') && (
                              <audio controls src={file.filePath} style={{ width: '100%' }} />
                            )}
                            {file.fileType.startsWith('video/') && (
                              <video controls src={file.filePath} style={{ width: '100%', maxHeight: '150px' }} />
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
                    <div className="evidence-card-footer">
                      <div className="evidence-card-tags">
                        {ev.level && (
                          <span className={`badge badge-${ev.level === 'logrado' ? 'success' : ev.level === 'proceso' ? 'warning' : ev.level === 'inicio' ? 'error' : 'purple'}`}>
                            {ev.level === 'inicio' ? 'Inicio' : ev.level === 'proceso' ? 'Proceso' : ev.level === 'logrado' ? 'Logrado' : 'Req. apoyo'}
                          </span>
                        )}
                        <span className="text-xs text-muted">
                          {ev.type === 'audio' ? '🎙️' : ev.type === 'foto' ? '📷' : ev.type === 'video' ? '🎥' : '✏️'} {ev.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <p className="text-muted">Sin evidencias aún. ¡Captura la primera!</p>
              </div>
            )}
            {/* Botón generar DOCX */}
            {evidences.length > 0 && (
              <div className="mt-4 flex flex-col gap-2" style={{ padding: '0 var(--space-4) var(--space-4) var(--space-4)' }}>
                <button 
                  className={`btn btn-primary btn-full btn-lg ${generatingDocx ? 'btn-loading' : ''}`}
                  onClick={generateCuadernoDocx}
                  disabled={generatingDocx}
                  style={{ background: 'linear-gradient(135deg, #4c6ef5, #5c7cfa)', color: 'white', border: 'none' }}
                >
                  {generatingDocx ? '🤖 Generando Cuaderno con IA...' : '📄 Generar Cuaderno de Campo con IA (.docx)'}
                </button>
                
                {sessionData?.generatedFile && (
                  <a 
                    href={sessionData.generatedFile} 
                    download={`Cuaderno_de_Campo_${sessionData.activityTitle}.docx`}
                    className="btn btn-outline btn-full btn-lg mt-2"
                    style={{ borderColor: '#4c6ef5', color: '#4c6ef5' }}
                  >
                    📥 Descargar Cuaderno Generado Previamente
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Review Modal */}
      {showAiModal && aiResult && (
        <div className="modal-overlay" onClick={() => setShowAiModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🤖 Sugerencia de IA</h2>
              <button className="modal-close" onClick={() => setShowAiModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="ai-suggestion mb-4">
                <div className="ai-suggestion-header">
                  ✨ Descripción de evidencia
                  <span className="ai-suggestion-badge">GPT-4o mini</span>
                </div>
                <div className="ai-suggestion-content">{aiResult.description}</div>
              </div>
              <div className="ai-suggestion">
                <div className="ai-suggestion-header">
                  💡 Aspectos a retroalimentar
                </div>
                <div className="ai-suggestion-content">{aiResult.feedback}</div>
              </div>
              {aiResult.tokensUsed > 0 && (
                <p className="text-xs text-muted mt-4">Tokens utilizados: {aiResult.tokensUsed}</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAiModal(false)}>
                Editar manualmente
              </button>
              <button className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
                onClick={() => saveEvidence(true)} disabled={saving}>
                {saving ? 'Guardando...' : '✅ Confirmar y Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Loading overlay */}
      {aiLoading && (
        <div className="modal-overlay">
          <div className="card text-center" style={{ padding: 'var(--space-10)', maxWidth: 320 }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto var(--space-4)' }}></div>
            <p className="font-semibold">🤖 IA procesando...</p>
            <p className="text-sm text-muted mt-2">Generando descripción y retroalimentación</p>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
