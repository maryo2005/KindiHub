'use client';
// ============================================
// Landing Page (Pantalla de Inicio)
// ============================================
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .main-content {
          margin-left: 0 !important;
          padding: 0 !important;
        }
      `}</style>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, var(--primary-50) 0%, #ffffff 100%)',
    }}>
      {/* Top Navbar */}
      <header style={{
        padding: 'var(--space-4) var(--space-8)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '2rem' }}>🎓</span>
          <span className="font-bold text-xl" style={{ color: 'var(--primary-700)' }}>KindiHub</span>
        </div>
        
        <div className="flex gap-4">
          {status === 'authenticated' ? (
            <Link href="/dashboard" className="btn btn-primary">
              Ir a mi Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">Iniciar Sesión</Link>
              <Link href="/register" className="btn btn-primary">Registrarse</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'var(--primary-100)',
          color: 'var(--primary-700)',
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: '100px',
          fontWeight: '600',
          fontSize: '0.875rem',
          marginBottom: 'var(--space-6)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ✨ La nueva forma de evaluar en Educación Inicial
        </div>
        
        <h1 style={{
          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          fontWeight: '800',
          color: 'var(--text-color)',
          lineHeight: '1.1',
          maxWidth: '800px',
          marginBottom: 'var(--space-6)'
        }}>
          Transforma la evaluación de tus pequeños con Inteligencia Artificial
        </h1>
        
        <p style={{
          fontSize: '1.25rem',
          color: 'var(--text-muted)',
          maxWidth: '600px',
          marginBottom: 'var(--space-8)',
          lineHeight: '1.6'
        }}>
          KindiHub te permite capturar evidencias rápidamente en clase, extraer competencias desde tus plantillas y generar evaluaciones personalizadas en segundos.
        </p>

        {status === 'authenticated' ? (
          <div className="flex flex-col items-center gap-4">
            <Link href="/dashboard" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
              Entrar al Dashboard →
            </Link>
            <p className="text-sm text-muted">Sesión iniciada como {session.user?.name}</p>
          </div>
        ) : (
          <div className="flex gap-4">
            <Link href="/register" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
              Comenzar ahora
            </Link>
            <Link href="/login" className="btn btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.125rem', background: 'white' }}>
              Ya tengo cuenta
            </Link>
          </div>
        )}

        {/* Features Preview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--space-6)',
          width: '100%',
          maxWidth: '1000px',
          marginTop: 'var(--space-12)'
        }}>
          <div className="card" style={{ background: 'white', textAlign: 'left', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📸</div>
            <h3 className="font-semibold text-lg mb-2">Captura Rápida</h3>
            <p className="text-muted text-sm">Sube fotos o videos directamente desde tu celular en un solo clic durante la sesión.</p>
          </div>
          <div className="card" style={{ background: 'white', textAlign: 'left', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤖</div>
            <h3 className="font-semibold text-lg mb-2">Asistente IA</h3>
            <p className="text-muted text-sm">Transcribe audios y redacta conclusiones pedagógicas precisas para cada niño.</p>
          </div>
          <div className="card" style={{ background: 'white', textAlign: 'left', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
            <h3 className="font-semibold text-lg mb-2">Lectura de Plantillas</h3>
            <p className="text-muted text-sm">Sube tu cuaderno de campo en Word (.doc) y la plataforma extraerá los criterios automáticamente.</p>
          </div>
        </div>
      </main>

      <footer style={{
        textAlign: 'center',
        padding: 'var(--space-6)',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
        fontSize: '0.875rem'
      }}>
        © {new Date().getFullYear()} KindiHub. Todos los derechos reservados.
      </footer>
    </div>
    </>
  );
}
