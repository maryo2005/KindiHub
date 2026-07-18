'use client';
// ============================================
// Dashboard Principal
// ============================================
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      setTimeout(() => {
        fetchDashboard();
      }, 0);
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="spinner spinner-lg"></div>
          <p className="text-muted">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const stats = data?.stats || {};

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">
              ¡Bienvenida, {session.user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="page-subtitle">
              Resumen de tu actividad pedagógica
            </p>
          </div>
          <Link href="/aulas" className="btn btn-primary" id="btn-new-session">
            📋 Ir a Mis Aulas
          </Link>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon card-icon-primary">🏫</div>
          <div>
            <div className="stat-value">{stats.classrooms || 0}</div>
            <div className="stat-label">Aulas</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon card-icon-accent">👧</div>
          <div>
            <div className="stat-value">{stats.students || 0}</div>
            <div className="stat-label">Estudiantes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon card-icon-success">📝</div>
          <div>
            <div className="stat-value">{stats.totalEvidences || 0}</div>
            <div className="stat-label">Evidencias totales</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon card-icon-warning">⏳</div>
          <div>
            <div className="stat-value">{stats.pendingEvidences || 0}</div>
            <div className="stat-label">Pendientes de revisión</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Sesiones activas */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">📋 Sesiones Activas</h2>
              <p className="card-subtitle">Sesiones del día en curso</p>
            </div>
            <Link href="/aulas" className="btn btn-outline btn-sm">Ver aulas</Link>
          </div>
          {data?.todaySessions?.length > 0 ? (
            <div className="flex flex-col gap-3">
              {data.todaySessions.map(s => (
                <Link
                  key={s.id}
                  href={`/aulas/${s.notebook?.classroomId}/cuadernos/${s.id}`}
                  className="card card-clickable"
                  style={{ padding: 'var(--space-4)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{s.activityTitle}</div>
                      <div className="text-xs text-muted">
                        {s.notebook?.classroom?.name} · {s._count?.evidences || 0} evidencias
                      </div>
                    </div>
                    <span className="badge badge-success">Activa</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
              <div className="empty-state-icon">📋</div>
              <p className="empty-state-title">No hay sesiones activas</p>
              <p className="empty-state-description">Crea una nueva sesión para empezar a registrar evidencias</p>
              <Link href="/aulas" className="btn btn-primary btn-sm">Ir a Aulas</Link>
            </div>
          )}
        </div>

        {/* Alertas pedagógicas */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">🔔 Alertas Pedagógicas</h2>
              <p className="card-subtitle">Puntos que requieren atención</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {stats.pendingEvidences > 0 && (
              <div className="alert alert-warning">
                <span className="alert-icon">⏳</span>
                <span>Tienes <strong>{stats.pendingEvidences}</strong> evidencias pendientes de revisión</span>
              </div>
            )}
            {data?.studentsWithoutRecent?.length > 0 && (
              <div className="alert alert-info">
                <span className="alert-icon">👀</span>
                <div>
                  <strong>{data.studentsWithoutRecent.length} estudiantes</strong> sin evidencia en los últimos 7 días:
                  <div className="text-xs mt-2" style={{ opacity: 0.8 }}>
                    {data.studentsWithoutRecent.slice(0, 5).map(s => s.fullName).join(', ')}
                    {data.studentsWithoutRecent.length > 5 && ` y ${data.studentsWithoutRecent.length - 5} más`}
                  </div>
                </div>
              </div>
            )}
            {stats.confirmedEvidences > 0 && (
              <div className="alert alert-success">
                <span className="alert-icon">✅</span>
                <span><strong>{stats.confirmedEvidences}</strong> evidencias confirmadas listas para reportes</span>
              </div>
            )}
            {stats.pendingEvidences === 0 && (!data?.studentsWithoutRecent || data.studentsWithoutRecent.length === 0) && (
              <div className="alert alert-success">
                <span className="alert-icon">🎉</span>
                <span>¡Todo al día! No hay alertas pendientes.</span>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Quick actions para mobile */}
      <div className="show-mobile mt-6">
        <h3 className="card-title mb-4">⚡ Acciones Rápidas</h3>
        <div className="grid-2">
          <Link href="/aulas" className="card card-clickable text-center" style={{ padding: 'var(--space-4)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>🏫</div>
            <div className="font-semibold text-sm">Entrar a mis Aulas</div>
            <div className="text-xs text-muted mt-1">Sesiones y Cuadernos</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
